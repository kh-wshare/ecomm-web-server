import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import {
  DeliveryMethodStatus,
  DeliveryMethodType,
} from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import {
  CreateDeliveryMethodDto,
  CreateDeliveryZoneDto,
  DeliveryMethodQueryDto,
  UpdateDeliveryMethodDto,
  UpdateDeliveryZoneDto,
} from './dto/delivery-method-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

const zoneSelect = {
  id: true,
  name: true,
  countries: true,
  provinces: true,
  cities: true,
  postalCodes: true,
  baseFee: true,
  perItemFee: true,
  freeOverSubtotal: true,
  minSubtotal: true,
  maxSubtotal: true,
  estimatedMinDays: true,
  estimatedMaxDays: true,
  isFallback: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

const methodSelect = {
  id: true,
  merchantId: true,
  branchId: true,
  name: true,
  code: true,
  description: true,
  type: true,
  status: true,
  isDefault: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  zones: {
    where: { deletedAt: null },
    orderBy: [{ isFallback: 'asc' }, { sortOrder: 'asc' }],
    select: zoneSelect,
  },
} as const satisfies Prisma.DeliveryMethodSelect;

@Injectable()
export class DeliveryMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(merchantId: string, query: DeliveryMethodQueryDto) {
    return this.prisma.deliveryMethod.findMany({
      where: {
        merchantId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: methodSelect,
    });
  }

  async findOne(merchantId: string, methodId: string) {
    const method = await this.prisma.deliveryMethod.findFirst({
      where: { id: methodId, merchantId, deletedAt: null },
      select: methodSelect,
    });
    if (!method) throw new NotFoundException('Delivery method not found');
    return method;
  }

  async create(
    merchantId: string,
    userId: string,
    dto: CreateDeliveryMethodDto,
    metadata: AuditMetadata,
  ) {
    const type = dto.type ?? DeliveryMethodType.DELIVERY;
    await this.assertBranch(merchantId, type, dto.branchId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) await this.clearDefault(tx, merchantId);
        const created = await tx.deliveryMethod.create({
          data: {
            merchantId,
            name: dto.name.trim(),
            code: dto.code.trim().toUpperCase(),
            description: this.optional(dto.description),
            type,
            branchId: type === DeliveryMethodType.PICKUP ? dto.branchId : null,
            status: dto.status ?? DeliveryMethodStatus.ACTIVE,
            isDefault: dto.isDefault ?? false,
            sortOrder: dto.sortOrder ?? 0,
          },
          select: methodSelect,
        });
        await this.audit(tx, {
          action: 'delivery_method.created',
          after: this.snapshot(created),
          entityId: created.id,
          merchantId,
          metadata,
          userId,
        });
        return created;
      });
    } catch (error) {
      throw this.rethrow(error);
    }
  }

  async update(
    merchantId: string,
    userId: string,
    methodId: string,
    dto: UpdateDeliveryMethodDto,
    metadata: AuditMetadata,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.deliveryMethod.findFirst({
          where: { id: methodId, merchantId, deletedAt: null },
          select: methodSelect,
        });
        if (!before) throw new NotFoundException('Delivery method not found');

        const type = dto.type ?? before.type;
        await this.assertBranch(merchantId, type, dto.branchId, tx);
        if (dto.isDefault) await this.clearDefault(tx, merchantId);

        const updated = await tx.deliveryMethod.update({
          where: { id: methodId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.code !== undefined
              ? { code: dto.code.trim().toUpperCase() }
              : {}),
            ...(dto.description !== undefined
              ? { description: this.optional(dto.description) }
              : {}),
            ...(dto.type !== undefined ? { type: dto.type } : {}),
            ...(dto.branchId !== undefined || dto.type !== undefined
              ? {
                  branchId:
                    type === DeliveryMethodType.PICKUP
                      ? (dto.branchId ?? before.branchId)
                      : null,
                }
              : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.isDefault !== undefined
              ? { isDefault: dto.isDefault }
              : {}),
            ...(dto.sortOrder !== undefined
              ? { sortOrder: dto.sortOrder }
              : {}),
          },
          select: methodSelect,
        });
        await this.audit(tx, {
          action: 'delivery_method.updated',
          after: this.snapshot(updated),
          before: this.snapshot(before),
          entityId: methodId,
          merchantId,
          metadata,
          userId,
        });
        return updated;
      });
    } catch (error) {
      throw this.rethrow(error);
    }
  }

  /**
   * Soft-deletes. Orders and checkout sessions keep pointing at the row (they
   * also carry `deliveryMethodName`), so archiving a method never rewrites how
   * a past order says it was delivered.
   */
  async archive(
    merchantId: string,
    userId: string,
    methodId: string,
    metadata: AuditMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.deliveryMethod.findFirst({
        where: { id: methodId, merchantId, deletedAt: null },
        select: methodSelect,
      });
      if (!before) throw new NotFoundException('Delivery method not found');

      const archived = await tx.deliveryMethod.update({
        where: { id: methodId },
        data: {
          deletedAt: new Date(),
          isDefault: false,
          status: DeliveryMethodStatus.INACTIVE,
        },
        select: methodSelect,
      });
      await tx.deliveryZone.updateMany({
        where: { deliveryMethodId: methodId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await this.audit(tx, {
        action: 'delivery_method.archived',
        before: this.snapshot(before),
        entityId: methodId,
        merchantId,
        metadata,
        userId,
      });
      return archived;
    });
  }

  async createZone(
    merchantId: string,
    userId: string,
    methodId: string,
    dto: CreateDeliveryZoneDto,
    metadata: AuditMetadata,
  ) {
    this.assertZoneRange(dto);
    return this.prisma.$transaction(async (tx) => {
      const method = await tx.deliveryMethod.findFirst({
        where: { id: methodId, merchantId, deletedAt: null },
        select: { id: true, type: true },
      });
      if (!method) throw new NotFoundException('Delivery method not found');
      if (method.type === DeliveryMethodType.PICKUP) {
        throw new BadRequestException(
          'Pickup methods are always free and cannot have zones',
        );
      }

      const zone = await tx.deliveryZone.create({
        data: {
          merchantId,
          deliveryMethodId: methodId,
          name: dto.name.trim(),
          ...this.zoneRates(dto),
          countries: this.geo(dto.countries, true),
          provinces: this.geo(dto.provinces),
          cities: this.geo(dto.cities),
          postalCodes: this.geo(dto.postalCodes),
          isFallback: dto.isFallback ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
        select: zoneSelect,
      });
      await this.audit(tx, {
        action: 'delivery_zone.created',
        after: { deliveryMethodId: methodId, name: zone.name },
        entityId: zone.id,
        entityType: 'delivery_zone',
        merchantId,
        metadata,
        userId,
      });
      return zone;
    });
  }

  async updateZone(
    merchantId: string,
    userId: string,
    methodId: string,
    zoneId: string,
    dto: UpdateDeliveryZoneDto,
    metadata: AuditMetadata,
  ) {
    this.assertZoneRange(dto);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.deliveryZone.findFirst({
        where: {
          id: zoneId,
          merchantId,
          deliveryMethodId: methodId,
          deletedAt: null,
        },
        select: zoneSelect,
      });
      if (!before) throw new NotFoundException('Delivery zone not found');

      const zone = await tx.deliveryZone.update({
        where: { id: zoneId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...this.zoneRates(dto),
          ...(dto.countries !== undefined
            ? { countries: this.geo(dto.countries, true) }
            : {}),
          ...(dto.provinces !== undefined
            ? { provinces: this.geo(dto.provinces) }
            : {}),
          ...(dto.cities !== undefined ? { cities: this.geo(dto.cities) } : {}),
          ...(dto.postalCodes !== undefined
            ? { postalCodes: this.geo(dto.postalCodes) }
            : {}),
          ...(dto.isFallback !== undefined
            ? { isFallback: dto.isFallback }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        select: zoneSelect,
      });
      await this.audit(tx, {
        action: 'delivery_zone.updated',
        after: { name: zone.name, baseFee: zone.baseFee.toString() },
        before: { name: before.name, baseFee: before.baseFee.toString() },
        entityId: zoneId,
        entityType: 'delivery_zone',
        merchantId,
        metadata,
        userId,
      });
      return zone;
    });
  }

  async archiveZone(
    merchantId: string,
    userId: string,
    methodId: string,
    zoneId: string,
    metadata: AuditMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.deliveryZone.findFirst({
        where: {
          id: zoneId,
          merchantId,
          deliveryMethodId: methodId,
          deletedAt: null,
        },
        select: zoneSelect,
      });
      if (!before) throw new NotFoundException('Delivery zone not found');

      const zone = await tx.deliveryZone.update({
        where: { id: zoneId },
        data: { deletedAt: new Date() },
        select: zoneSelect,
      });
      await this.audit(tx, {
        action: 'delivery_zone.archived',
        before: { name: before.name },
        entityId: zoneId,
        entityType: 'delivery_zone',
        merchantId,
        metadata,
        userId,
      });
      return zone;
    });
  }

  private zoneRates(dto: Partial<CreateDeliveryZoneDto>) {
    return {
      ...(dto.baseFee !== undefined
        ? { baseFee: new Prisma.Decimal(dto.baseFee) }
        : {}),
      ...(dto.perItemFee !== undefined
        ? { perItemFee: new Prisma.Decimal(dto.perItemFee) }
        : {}),
      ...(dto.freeOverSubtotal !== undefined
        ? { freeOverSubtotal: this.decimal(dto.freeOverSubtotal) }
        : {}),
      ...(dto.minSubtotal !== undefined
        ? { minSubtotal: this.decimal(dto.minSubtotal) }
        : {}),
      ...(dto.maxSubtotal !== undefined
        ? { maxSubtotal: this.decimal(dto.maxSubtotal) }
        : {}),
      ...(dto.estimatedMinDays !== undefined
        ? { estimatedMinDays: dto.estimatedMinDays }
        : {}),
      ...(dto.estimatedMaxDays !== undefined
        ? { estimatedMaxDays: dto.estimatedMaxDays }
        : {}),
    };
  }

  private assertZoneRange(dto: Partial<CreateDeliveryZoneDto>) {
    if (
      dto.minSubtotal !== undefined &&
      dto.maxSubtotal !== undefined &&
      new Prisma.Decimal(dto.minSubtotal).greaterThan(
        new Prisma.Decimal(dto.maxSubtotal),
      )
    ) {
      throw new BadRequestException('minSubtotal cannot exceed maxSubtotal');
    }
    if (
      dto.estimatedMinDays !== undefined &&
      dto.estimatedMaxDays !== undefined &&
      dto.estimatedMinDays > dto.estimatedMaxDays
    ) {
      throw new BadRequestException(
        'estimatedMinDays cannot exceed estimatedMaxDays',
      );
    }
  }

  private async assertBranch(
    merchantId: string,
    type: DeliveryMethodType,
    branchId: string | undefined,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (type !== DeliveryMethodType.PICKUP || !branchId) return;
    const branch = await tx.merchantBranch.findFirst({
      where: { id: branchId, merchantId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
  }

  private clearDefault(tx: Prisma.TransactionClient, merchantId: string) {
    return tx.deliveryMethod.updateMany({
      where: { merchantId, deletedAt: null, isDefault: true },
      data: { isDefault: false },
    });
  }

  private geo(values: string[] | undefined, uppercase = false) {
    if (!values) return [];
    const normalized = values
      .map((value) => (uppercase ? value.trim().toUpperCase() : value.trim()))
      .filter(Boolean);
    return [...new Set(normalized)];
  }

  private decimal(value: string | undefined) {
    return value === undefined || value === ''
      ? null
      : new Prisma.Decimal(value);
  }

  private optional(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private audit(
    tx: Prisma.TransactionClient,
    input: {
      action: string;
      after?: Prisma.InputJsonValue;
      before?: Prisma.InputJsonValue;
      entityId: string;
      entityType?: string;
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
        entityId: input.entityId,
        entityType: input.entityType ?? 'delivery_method',
        merchantId: input.merchantId,
        userId: input.userId,
        ...input.metadata,
      },
    });
  }

  private snapshot(method: {
    code: string;
    name: string;
    type: string;
    status: string;
    isDefault: boolean;
  }): Prisma.InputJsonObject {
    return {
      code: method.code,
      name: method.name,
      type: method.type,
      status: method.status,
      isDefault: method.isDefault,
    };
  }

  private rethrow(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Delivery method code is already in use');
    }
    return error;
  }
}
