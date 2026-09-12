import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { PosAuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class PosAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(merchantId: string, query: PosAuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      merchantId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          before: true,
          after: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return new PaginatedResult(logs, query.take, query.page ?? 1, total);
  }
}
