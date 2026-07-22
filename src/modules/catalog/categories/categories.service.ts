import {
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
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/category-input.dto';
import { ProductCategoryQueryDto } from './dto/category-query.dto';

export const productCategorySelect = {
  id: true,
  merchantId: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CommerceCacheService,
  ) {}

  async findAll(merchantId: string, query: ProductCategoryQueryDto) {
    const where: Prisma.ProductCategoryWhereInput = {
      merchantId,
      deletedAt: null,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [categories, total] = await this.prisma.$transaction([
      this.prisma.productCategory.findMany({
        where,
        select: productCategorySelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.productCategory.count({ where }),
    ]);
    return new PaginatedResult(categories, query.take, query.page ?? 1, total);
  }

  async create(
    merchantId: string,
    userId: string,
    dto: CreateProductCategoryDto,
    metadata: AuditMetadata,
  ) {
    const baseSlug = this.toSlug(dto.slug ?? dto.name);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${randomBytes(3).toString('hex')}`;
      try {
        const category = await this.prisma.$transaction(async (tx) => {
          const created = await tx.productCategory.create({
            data: {
              merchantId,
              name: dto.name.trim(),
              slug,
              description: dto.description?.trim(),
              logoUrl: this.optionalUrl(dto.logoUrl),
              sortOrder: dto.sortOrder ?? 0,
              status: dto.status ?? 'ACTIVE',
            },
            select: productCategorySelect,
          });
          await tx.auditLog.create({
            data: {
              merchantId,
              userId,
              action: 'product_category.created',
              entityType: 'product_category',
              entityId: created.id,
              after: this.snapshot(created),
              ...metadata,
            },
          });
          return created;
        });
        await this.cache.invalidateCatalog(merchantId);
        return category;
      } catch (error) {
        if (!dto.slug && this.isUniqueConflict(error, 'slug') && attempt < 4) {
          continue;
        }
        throw this.mapConflict(error);
      }
    }

    throw new ConflictException('Unable to allocate a unique category slug');
  }

  async update(
    merchantId: string,
    categoryId: string,
    userId: string,
    dto: UpdateProductCategoryDto,
    metadata: AuditMetadata,
  ) {
    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const before = await tx.productCategory.findFirst({
          where: { id: categoryId, merchantId, deletedAt: null },
          select: productCategorySelect,
        });
        if (!before) throw new NotFoundException('Product category not found');

        const updated = await tx.productCategory.update({
          where: { id: categoryId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.slug !== undefined ? { slug: this.toSlug(dto.slug) } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description.trim() }
              : {}),
            ...(dto.logoUrl !== undefined
              ? { logoUrl: this.optionalUrl(dto.logoUrl) }
              : {}),
            ...(dto.sortOrder !== undefined
              ? { sortOrder: dto.sortOrder }
              : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
          },
          select: productCategorySelect,
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'product_category.updated',
            entityType: 'product_category',
            entityId: categoryId,
            before: this.snapshot(before),
            after: this.snapshot(updated),
            ...metadata,
          },
        });
        return updated;
      });
      await this.cache.invalidateCatalog(merchantId);
      return category;
    } catch (error) {
      throw this.mapConflict(error);
    }
  }

  async archive(
    merchantId: string,
    categoryId: string,
    userId: string,
    metadata: AuditMetadata,
  ) {
    const category = await this.prisma.$transaction(async (tx) => {
      const before = await tx.productCategory.findFirst({
        where: { id: categoryId, merchantId, deletedAt: null },
        select: productCategorySelect,
      });
      if (!before) throw new NotFoundException('Product category not found');

      const archived = await tx.productCategory.update({
        where: { id: categoryId },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
        select: productCategorySelect,
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'product_category.archived',
          entityType: 'product_category',
          entityId: categoryId,
          before: this.snapshot(before),
          after: this.snapshot(archived),
          ...metadata,
        },
      });
      return archived;
    });
    await this.cache.invalidateCatalog(merchantId);
    return category;
  }

  async assertActive(
    tx: Prisma.TransactionClient,
    merchantId: string,
    categoryId: string,
  ) {
    const category = await tx.productCategory.findFirst({
      where: {
        id: categoryId,
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Product category not found');
  }

  private snapshot(category: {
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    sortOrder: number;
    status: string;
  }): Prisma.InputJsonObject {
    return {
      name: category.name,
      slug: category.slug,
      description: category.description,
      logoUrl: category.logoUrl,
      sortOrder: category.sortOrder,
      status: category.status,
    };
  }

  private optionalUrl(value: null | string | undefined) {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  private toSlug(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'category'
    );
  }

  private mapConflict(error: unknown): unknown {
    if (this.isUniqueConflict(error, 'slug')) {
      return new ConflictException('Category slug is already in use');
    }
    if (this.isUniqueViolation(error)) {
      return new ConflictException('Category slug is already in use');
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
