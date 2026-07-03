import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import { AuthorizationService } from '#app/modules/authorization/authorization.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { MembershipCounts } from './dto/merchant-response.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

const merchantSelect = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  status: true,
  returnStockOnRefund: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class MerchantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly cache: CommerceCacheService,
  ) {}

  async create(
    userId: string,
    dto: CreateMerchantDto,
    metadata: AuditMetadata,
  ) {
    const baseSlug = this.toSlug(dto.name);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${randomBytes(3).toString('hex')}`;
      try {
        return await this.prisma.$transaction(async (tx) => {
          const merchant = await tx.merchant.create({
            data: {
              name: dto.name.trim(),
              slug,
              email: dto.email?.trim().toLowerCase(),
              phone: dto.phone?.trim(),
            },
            select: merchantSelect,
          });
          const roles = await this.authorization.createMerchantRoles(
            tx,
            merchant.id,
          );
          await tx.merchantUser.create({
            data: {
              merchantId: merchant.id,
              userId,
              roleId: roles.owner.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
          });
          await tx.auditLog.create({
            data: {
              merchantId: merchant.id,
              userId,
              action: 'merchant.created',
              entityType: 'merchant',
              entityId: merchant.id,
              after: this.profileSnapshot(merchant),
              ...metadata,
            },
          });
          return merchant;
        });
      } catch (error) {
        if (!this.isSlugConflict(error)) throw error;
        if (attempt === 4) {
          throw new ConflictException(
            'Unable to allocate a unique merchant slug',
          );
        }
      }
    }

    throw new ConflictException('Unable to allocate a unique merchant slug');
  }

  async findCurrent(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId, deletedAt: null },
      select: merchantSelect,
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async updateCurrent(
    merchantId: string,
    userId: string,
    dto: UpdateMerchantDto,
    metadata: AuditMetadata,
  ) {
    const data = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      ...(dto.returnStockOnRefund !== undefined
        ? { returnStockOnRefund: dto.returnStockOnRefund }
        : {}),
    };

    if (Object.keys(data).length === 0) return this.findCurrent(merchantId);

    try {
      const merchant = await this.prisma.$transaction(async (tx) => {
        const before = await tx.merchant.findUnique({
          where: { id: merchantId, deletedAt: null },
          select: merchantSelect,
        });
        if (!before) throw new NotFoundException('Merchant not found');

        const merchant = await tx.merchant.update({
          where: { id: merchantId },
          data,
          select: merchantSelect,
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'merchant.updated',
            entityType: 'merchant',
            entityId: merchantId,
            before: this.profileSnapshot(before),
            after: this.profileSnapshot(merchant),
            ...metadata,
          },
        });
        return merchant;
      });
      await this.cache.invalidateDashboard(merchantId);
      return merchant;
    } catch (error) {
      if (this.isSlugConflict(error)) {
        throw new ConflictException('Merchant slug is already in use');
      }
      throw error;
    }
  }

  async dashboard(merchantId: string) {
    return this.cache.remember(
      this.cache.dashboardKey(merchantId),
      () => this.loadDashboard(merchantId),
      30,
    );
  }

  private async loadDashboard(merchantId: string) {
    const merchant = await this.findCurrent(merchantId);
    const [membershipGroups, pendingInvitations, recentActivity] =
      await Promise.all([
        this.prisma.merchantUser.groupBy({
          by: ['status'],
          where: { merchantId },
          _count: { _all: true },
        }),
        this.prisma.merchantInvitation.count({
          where: {
            merchantId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { merchantId },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);
    const counts: MembershipCounts = Object.fromEntries(
      membershipGroups.map(({ status, _count }) => [status, _count._all]),
    );

    return {
      merchant,
      memberships: {
        total: membershipGroups.reduce(
          (total, group) => total + group._count._all,
          0,
        ),
        active: counts.ACTIVE ?? 0,
        invited: counts.INVITED ?? 0,
        disabled: counts.DISABLED ?? 0,
      },
      pendingInvitations,
      recentActivity,
    };
  }

  private toSlug(name: string) {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'merchant'
    );
  }

  private profileSnapshot(merchant: {
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    status: string;
    returnStockOnRefund: boolean;
  }): Prisma.InputJsonObject {
    return {
      name: merchant.name,
      slug: merchant.slug,
      email: merchant.email,
      phone: merchant.phone,
      status: merchant.status,
      returnStockOnRefund: merchant.returnStockOnRefund,
    };
  }

  private isSlugConflict(error: unknown) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }
    const prismaError = error as {
      code: unknown;
      meta?: { target?: unknown };
    };
    return (
      prismaError.code === 'P2002' &&
      (prismaError.meta?.target === undefined ||
        JSON.stringify(prismaError.meta.target).includes('slug'))
    );
  }
}
