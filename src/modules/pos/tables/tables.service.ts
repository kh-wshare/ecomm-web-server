import { Injectable, NotFoundException } from '@nestjs/common';
import { PosTableStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import {
  CreatePosTableDto,
  PosTableQueryDto,
  UpdatePosTableDto,
} from './dto/table-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

@Injectable()
export class PosTablesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(merchantId: string, query: PosTableQueryDto) {
    return this.prisma.posTable.findMany({
      where: {
        merchantId,
        deletedAt: null,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    merchantId: string,
    userId: string,
    dto: CreatePosTableDto,
    metadata: AuditMetadata,
  ) {
    const branch = await this.prisma.merchantBranch.findFirst({
      where: {
        id: dto.branchId,
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const table = await this.prisma.posTable.create({
      data: {
        merchantId,
        branchId: dto.branchId,
        name: dto.name.trim(),
        code: dto.code,
        seats: dto.seats,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'pos.table.created',
        entityType: 'pos_table',
        entityId: table.id,
        after: { name: table.name, branchId: table.branchId },
        ...metadata,
      },
    });
    return table;
  }

  async update(
    merchantId: string,
    userId: string,
    tableId: string,
    dto: UpdatePosTableDto,
    metadata: AuditMetadata,
  ) {
    const table = await this.prisma.posTable.findFirst({
      where: { id: tableId, merchantId, deletedAt: null },
    });
    if (!table) throw new NotFoundException('Table not found');

    const updated = await this.prisma.posTable.update({
      where: { id: tableId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'pos.table.updated',
        entityType: 'pos_table',
        entityId: tableId,
        before: { status: table.status },
        after: { status: updated.status },
        ...metadata,
      },
    });
    return updated;
  }

  async setStatus(merchantId: string, tableId: string, status: PosTableStatus) {
    await this.prisma.posTable.updateMany({
      where: { id: tableId, merchantId },
      data: { status },
    });
  }
}
