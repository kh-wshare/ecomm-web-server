import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { MerchantBranchStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import {
  BranchQueryDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch-input.dto';

const branchSelect = {
  id: true,
  merchantId: true,
  name: true,
  code: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  registerName: true,
  isDefault: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CommerceCacheService,
  ) {}

  findAll(merchantId: string, query: BranchQueryDto) {
    return this.prisma.merchantBranch.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: branchSelect,
      where: {
        merchantId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
    });
  }

  async create(
    merchantId: string,
    userId: string,
    dto: CreateBranchDto,
    metadata: AuditMetadata,
  ) {
    try {
      const branch = await this.prisma.$transaction(async (tx) => {
        const branchCount = await tx.merchantBranch.count({
          where: { merchantId, deletedAt: null },
        });
        const isDefault = dto.isDefault ?? branchCount === 0;
        if (isDefault) await this.clearDefault(tx, merchantId);

        const created = await tx.merchantBranch.create({
          data: {
            ...this.input(dto),
            code: dto.code.trim().toUpperCase(),
            isDefault,
            merchantId,
            name: dto.name.trim(),
            status: dto.status ?? MerchantBranchStatus.ACTIVE,
          },
          select: branchSelect,
        });
        await this.audit(tx, {
          action: 'branch.created',
          after: this.snapshot(created),
          branchId: created.id,
          merchantId,
          metadata,
          userId,
        });

        return created;
      });

      await this.cache.invalidateDashboard(merchantId);
      return branch;
    } catch (error) {
      if (this.isCodeConflict(error)) {
        throw new ConflictException('Branch code is already in use');
      }
      throw error;
    }
  }

  async update(
    merchantId: string,
    userId: string,
    branchId: string,
    dto: UpdateBranchDto,
    metadata: AuditMetadata,
  ) {
    try {
      const branch = await this.prisma.$transaction(async (tx) => {
        const before = await tx.merchantBranch.findFirst({
          select: branchSelect,
          where: { id: branchId, merchantId, deletedAt: null },
        });
        if (!before) throw new NotFoundException('Branch not found');

        if (dto.isDefault) await this.clearDefault(tx, merchantId);
        const updated = await tx.merchantBranch.update({
          data: {
            ...this.input(dto),
            ...(dto.isDefault !== undefined
              ? { isDefault: dto.isDefault }
              : {}),
            ...(dto.status ? { status: dto.status } : {}),
          },
          select: branchSelect,
          where: { id: branchId },
        });

        if (before.isDefault && !updated.isDefault) {
          await this.ensureDefault(tx, merchantId, updated.id);
        }
        await this.audit(tx, {
          action: 'branch.updated',
          after: this.snapshot(updated),
          before: this.snapshot(before),
          branchId,
          merchantId,
          metadata,
          userId,
        });

        return updated;
      });

      await this.cache.invalidateDashboard(merchantId);
      return branch;
    } catch (error) {
      if (this.isCodeConflict(error)) {
        throw new ConflictException('Branch code is already in use');
      }
      throw error;
    }
  }

  async archive(
    merchantId: string,
    userId: string,
    branchId: string,
    metadata: AuditMetadata,
  ) {
    const branch = await this.prisma.$transaction(async (tx) => {
      const before = await tx.merchantBranch.findFirst({
        select: branchSelect,
        where: { id: branchId, merchantId, deletedAt: null },
      });
      if (!before) throw new NotFoundException('Branch not found');

      const archived = await tx.merchantBranch.update({
        data: {
          deletedAt: new Date(),
          isDefault: false,
          status: MerchantBranchStatus.INACTIVE,
        },
        select: branchSelect,
        where: { id: branchId },
      });
      if (before.isDefault) await this.ensureDefault(tx, merchantId, branchId);
      await this.audit(tx, {
        action: 'branch.archived',
        before: this.snapshot(before),
        branchId,
        merchantId,
        metadata,
        userId,
      });

      return archived;
    });

    await this.cache.invalidateDashboard(merchantId);
    return branch;
  }

  private input(dto: Partial<CreateBranchDto>) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined
        ? { code: dto.code.trim().toUpperCase() }
        : {}),
      ...(dto.phone !== undefined ? { phone: this.optional(dto.phone) } : {}),
      ...(dto.addressLine1 !== undefined
        ? { addressLine1: this.optional(dto.addressLine1) }
        : {}),
      ...(dto.addressLine2 !== undefined
        ? { addressLine2: this.optional(dto.addressLine2) }
        : {}),
      ...(dto.city !== undefined ? { city: this.optional(dto.city) } : {}),
      ...(dto.province !== undefined
        ? { province: this.optional(dto.province) }
        : {}),
      ...(dto.postalCode !== undefined
        ? { postalCode: this.optional(dto.postalCode) }
        : {}),
      ...(dto.country !== undefined
        ? { country: this.optional(dto.country) }
        : {}),
      ...(dto.registerName !== undefined
        ? { registerName: this.optional(dto.registerName) }
        : {}),
    };
  }

  private optional(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private clearDefault(tx: Prisma.TransactionClient, merchantId: string) {
    return tx.merchantBranch.updateMany({
      data: { isDefault: false },
      where: { merchantId, deletedAt: null, isDefault: true },
    });
  }

  private async ensureDefault(
    tx: Prisma.TransactionClient,
    merchantId: string,
    excludeBranchId: string,
  ) {
    const fallback = await tx.merchantBranch.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      where: {
        id: { not: excludeBranchId },
        merchantId,
        deletedAt: null,
        status: MerchantBranchStatus.ACTIVE,
      },
    });
    if (!fallback) return;

    await this.clearDefault(tx, merchantId);
    await tx.merchantBranch.update({
      data: { isDefault: true },
      where: { id: fallback.id },
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    input: {
      action: string;
      after?: Prisma.InputJsonValue;
      before?: Prisma.InputJsonValue;
      branchId: string;
      merchantId: string;
      metadata: AuditMetadata;
      userId: string;
    },
  ) {
    return tx.auditLog.create({
      data: {
        action: input.action,
        after: input.after,
        before: input.before,
        entityId: input.branchId,
        entityType: 'branch',
        merchantId: input.merchantId,
        userId: input.userId,
        ...input.metadata,
      },
    });
  }

  private snapshot(branch: Record<string, unknown>): Prisma.InputJsonObject {
    return {
      code: branch.code as string,
      isDefault: branch.isDefault as boolean,
      name: branch.name as string,
      phone: branch.phone as string | null,
      status: branch.status as string,
    };
  }

  private isCodeConflict(error: unknown) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return error.code === 'P2002';
  }
}
