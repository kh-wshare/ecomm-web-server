import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import {
  ChannelVisibilityInputDto,
  CreateProductDto,
  ProductMediaInputDto,
  ProductVariantInputDto,
  UpdateChannelVisibilityDto,
  UpdateProductDto,
} from './dto/product-input.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const productSelect = {
  id: true,
  merchantId: true,
  name: true,
  slug: true,
  description: true,
  sku: true,
  price: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

const productDetailInclude = {
  variants: { orderBy: { createdAt: 'asc' as const } },
  media: { orderBy: { sortOrder: 'asc' as const } },
  channelVisibility: { orderBy: { channel: 'asc' as const } },
} as const;

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CommerceCacheService,
  ) {}

  async create(
    merchantId: string,
    userId: string,
    dto: CreateProductDto,
    metadata: AuditMetadata,
  ) {
    this.validateChannels(dto.channelVisibility);
    this.validateVariants(dto.variants);
    const baseSlug = this.toSlug(dto.slug ?? dto.name);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${randomBytes(3).toString('hex')}`;
      try {
        const product = await this.prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              merchant: { connect: { id: merchantId } },
              name: dto.name.trim(),
              slug,
              description: dto.description?.trim(),
              sku: this.normalizeSku(dto.sku),
              price: new Prisma.Decimal(dto.price),
              currency: (dto.currency ?? 'USD').toUpperCase(),
              status: dto.status,
              variants: dto.variants?.length
                ? { create: this.variantData(dto.variants) }
                : undefined,
              media: dto.media?.length
                ? { create: this.mediaData(dto.media) }
                : undefined,
              channelVisibility: dto.channelVisibility?.length
                ? { create: this.channelData(dto.channelVisibility) }
                : undefined,
            },
            include: productDetailInclude,
          });
          await tx.auditLog.create({
            data: {
              merchantId,
              userId,
              action: 'product.created',
              entityType: 'product',
              entityId: product.id,
              after: this.productSnapshot(product),
              ...metadata,
            },
          });
          return product;
        });
        await this.cache.invalidateCatalog(merchantId);
        return product;
      } catch (error) {
        if (!dto.slug && this.isUniqueConflict(error, 'slug') && attempt < 4) {
          continue;
        }
        throw this.mapConflict(error);
      }
    }

    throw new ConflictException('Unable to allocate a unique product slug');
  }

  async findAll(merchantId: string, query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      merchantId,
      deletedAt: null,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return new PaginatedResult(products, query.take, query.page ?? 1, total);
  }

  async findOne(merchantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, merchantId, deletedAt: null },
      include: productDetailInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    merchantId: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
    metadata: AuditMetadata,
  ) {
    this.validateChannels(dto.channelVisibility);
    this.validateVariants(dto.variants);
    const before = await this.findOne(merchantId, productId);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        if (dto.variants !== undefined) {
          await this.syncVariants(tx, merchantId, productId, dto.variants);
        }
        if (dto.media !== undefined) {
          await tx.productMedia.deleteMany({ where: { productId } });
          if (dto.media.length) {
            await tx.productMedia.createMany({
              data: this.mediaData(dto.media).map((media) => ({
                productId,
                ...media,
              })),
            });
          }
        }
        if (dto.channelVisibility !== undefined) {
          await tx.productChannelVisibility.deleteMany({
            where: { productId },
          });
          if (dto.channelVisibility.length) {
            await tx.productChannelVisibility.createMany({
              data: this.channelData(dto.channelVisibility).map((channel) => ({
                productId,
                ...channel,
              })),
            });
          }
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.slug !== undefined ? { slug: this.toSlug(dto.slug) } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description.trim() }
              : {}),
            ...(dto.sku !== undefined
              ? { sku: this.normalizeSku(dto.sku) }
              : {}),
            ...(dto.price !== undefined
              ? { price: new Prisma.Decimal(dto.price) }
              : {}),
            ...(dto.currency !== undefined
              ? { currency: dto.currency.toUpperCase() }
              : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
          },
        });
        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: productDetailInclude,
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'product.updated',
            entityType: 'product',
            entityId: productId,
            before: this.productSnapshot(before),
            after: this.productSnapshot(product),
            ...metadata,
          },
        });
        return product;
      });
      await this.cache.invalidateCatalog(merchantId);
      return product;
    } catch (error) {
      throw this.mapConflict(error);
    }
  }

  async remove(
    merchantId: string,
    productId: string,
    userId: string,
    metadata: AuditMetadata,
  ) {
    const before = await this.findOne(merchantId, productId);
    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
        select: productSelect,
      });
      await tx.productVariant.updateMany({
        where: { productId },
        data: { status: 'INACTIVE' },
      });
      await tx.productChannelVisibility.updateMany({
        where: { productId },
        data: { isVisible: false, isPurchasable: false },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'product.deleted',
          entityType: 'product',
          entityId: productId,
          before: this.productSnapshot(before),
          after: this.productSnapshot(product),
          ...metadata,
        },
      });
      return product;
    });
    await this.cache.invalidateCatalog(merchantId);
    return product;
  }

  async updateChannelVisibility(
    merchantId: string,
    productId: string,
    userId: string,
    dto: UpdateChannelVisibilityDto,
    metadata: AuditMetadata,
  ) {
    this.validateChannels(dto.channels);
    const product = await this.findOne(merchantId, productId);
    const channels = await this.prisma.$transaction(async (tx) => {
      const values = await Promise.all(
        this.channelData(dto.channels).map((channel) =>
          tx.productChannelVisibility.upsert({
            where: {
              productId_channel: {
                productId,
                channel: channel.channel,
              },
            },
            update: {
              isVisible: channel.isVisible,
              isPurchasable: channel.isPurchasable,
            },
            create: { productId, ...channel },
          }),
        ),
      );
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'product.channel_visibility_updated',
          entityType: 'product',
          entityId: productId,
          before: {
            channels: product.channelVisibility.map((channel) => ({
              channel: channel.channel,
              isVisible: channel.isVisible,
              isPurchasable: channel.isPurchasable,
            })),
          },
          after: {
            channels: values.map((channel) => ({
              channel: channel.channel,
              isVisible: channel.isVisible,
              isPurchasable: channel.isPurchasable,
            })),
          },
          ...metadata,
        },
      });
      return values;
    });
    await this.cache.invalidateCatalog(merchantId);
    return channels;
  }

  private variantData(variants: ProductVariantInputDto[]) {
    return variants.map((variant) => ({
      sku: this.normalizeSku(variant.sku),
      name: variant.name.trim(),
      price: new Prisma.Decimal(variant.price),
      attributes: variant.attributes as Prisma.InputJsonObject,
      status: variant.status,
    }));
  }

  private async syncVariants(
    tx: Prisma.TransactionClient,
    merchantId: string,
    productId: string,
    variants: ProductVariantInputDto[],
  ) {
    const nextVariants = this.variantData(variants);
    const nextSkus = nextVariants.map((variant) => variant.sku);

    await tx.productVariant.updateMany({
      where: {
        productId,
        ...(nextSkus.length ? { sku: { notIn: nextSkus } } : {}),
      },
      data: { status: 'INACTIVE' },
    });
    if (!nextVariants.length) return;

    const existingVariants = await tx.productVariant.findMany({
      where: { merchantId, sku: { in: nextSkus } },
      select: { id: true, productId: true, sku: true },
    });
    const existingBySku = new Map(
      existingVariants.map((variant) => [variant.sku, variant]),
    );
    const conflictingVariant = existingVariants.find(
      (variant) => variant.productId !== productId,
    );
    if (conflictingVariant) {
      throw new ConflictException(
        `Variant SKU ${conflictingVariant.sku} is already in use for this merchant`,
      );
    }

    for (const variant of nextVariants) {
      const existingVariant = existingBySku.get(variant.sku);
      if (existingVariant) {
        await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: variant,
        });
        continue;
      }

      await tx.productVariant.create({
        data: {
          productId,
          merchantId,
          ...variant,
        },
      });
    }
  }

  private mediaData(media: ProductMediaInputDto[]) {
    return media.map((item) => ({
      url: item.url.trim(),
      type: item.type,
      sortOrder: item.sortOrder ?? 0,
    }));
  }

  private channelData(channels: ChannelVisibilityInputDto[]) {
    return channels.map((channel) => ({
      channel: channel.channel,
      isVisible: channel.isVisible,
      isPurchasable: channel.isPurchasable,
    }));
  }

  private validateChannels(channels?: ChannelVisibilityInputDto[]) {
    if (!channels) return;
    const uniqueChannels = new Set(channels.map(({ channel }) => channel));
    if (uniqueChannels.size !== channels.length) {
      throw new BadRequestException('Each sales channel may appear only once');
    }
    if (channels.some((item) => item.isPurchasable && !item.isVisible)) {
      throw new BadRequestException(
        'A purchasable channel must also be visible',
      );
    }
  }

  private validateVariants(variants?: ProductVariantInputDto[]) {
    if (!variants) return;
    const uniqueSkus = new Set(
      variants.map((variant) => this.normalizeSku(variant.sku)),
    );
    if (uniqueSkus.size !== variants.length) {
      throw new BadRequestException('Each variant SKU may appear only once');
    }
  }

  private normalizeSku(sku: string) {
    return sku.trim().toUpperCase();
  }

  private toSlug(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'product'
    );
  }

  private productSnapshot(product: {
    name: string;
    slug: string;
    sku: string;
    price: { toString(): string };
    currency: string;
    status: string;
  }): Prisma.InputJsonObject {
    return {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price.toString(),
      currency: product.currency,
      status: product.status,
    };
  }

  private mapConflict(error: unknown): unknown {
    if (this.isUniqueConflict(error, 'sku')) {
      return new ConflictException('SKU is already in use for this merchant');
    }
    if (this.isUniqueConflict(error, 'slug')) {
      return new ConflictException('Product slug is already in use');
    }
    if (this.isUniqueViolation(error)) {
      return new ConflictException(
        'Product SKU, variant SKU, or slug is already in use',
      );
    }
    return error;
  }

  private isUniqueConflict(error: unknown, field: string) {
    if (!this.isUniqueViolation(error)) return false;
    const prismaError = error as { meta?: unknown };
    return JSON.stringify(prismaError.meta ?? {}).includes(field);
  }

  private isUniqueViolation(error: unknown) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }
    return error.code === 'P2002';
  }
}
