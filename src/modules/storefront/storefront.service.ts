import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import { ThemeService } from '#app/modules/theme/theme.service';
import { StorefrontProductQueryDto } from './dto/storefront-query.dto';

type ProductIdRow = { id: string };
type CountRow = { count: bigint | number };

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly themes: ThemeService,
    private readonly cache: CommerceCacheService,
  ) {}

  async getStorefront(merchantSlug: string) {
    const merchant = await this.getMerchant(merchantSlug);
    const query = Object.assign(new StorefrontProductQueryDto(), {
      page: 1,
      limit: 8,
      channel: SalesChannel.WEBSITE,
    });
    const [theme, products] = await Promise.all([
      this.getThemeForMerchant(merchant.id),
      this.listProductsForMerchant(merchant.id, query),
    ]);
    return {
      merchant,
      theme,
      featuredProducts: products.data,
    };
  }

  async listProducts(merchantSlug: string, query: StorefrontProductQueryDto) {
    const merchant = await this.getMerchant(merchantSlug);
    return this.listProductsForMerchant(merchant.id, query);
  }

  async getProduct(
    merchantSlug: string,
    productSlug: string,
    channel: SalesChannel = SalesChannel.WEBSITE,
  ) {
    const merchant = await this.getMerchant(merchantSlug);
    const normalizedSlug = productSlug.trim().toLowerCase();
    return this.cache.rememberHash(
      this.cache.publicProductsKey(merchant.id),
      `detail:${channel}:${normalizedSlug}`,
      async () => {
        const product = await this.prisma.product.findFirst({
          where: {
            merchantId: merchant.id,
            slug: normalizedSlug,
            status: 'ACTIVE',
            deletedAt: null,
            channelVisibility: {
              some: { channel, isVisible: true, isPurchasable: true },
            },
          },
          include: this.publicProductInclude(merchant.id, channel),
        });
        if (!product) throw new NotFoundException('Product not found');

        const publicProduct = this.toPublicProduct(product, channel);
        if (!publicProduct.isAvailable) {
          throw new NotFoundException('Product not found');
        }
        return publicProduct;
      },
      60,
    );
  }

  async getTheme(merchantSlug: string) {
    const merchant = await this.getMerchant(merchantSlug);
    return this.getThemeForMerchant(merchant.id);
  }

  private async getMerchant(slug: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
      },
    });
    if (!merchant) throw new NotFoundException('Storefront not found');
    return merchant;
  }

  private async listProductsForMerchant(
    merchantId: string,
    query: StorefrontProductQueryDto,
  ) {
    const channel = query.channel ?? SalesChannel.WEBSITE;
    const signature = JSON.stringify({
      channel,
      page: query.page ?? 1,
      limit: query.take,
      search: query.search?.trim().toLowerCase() ?? '',
    });
    const field = `list:${createHash('sha256')
      .update(signature)
      .digest('hex')
      .slice(0, 24)}`;
    return this.cache.rememberHash(
      this.cache.publicProductsKey(merchantId),
      field,
      () => this.loadProductsForMerchant(merchantId, query),
      60,
    );
  }

  private async loadProductsForMerchant(
    merchantId: string,
    query: StorefrontProductQueryDto,
  ) {
    const channel = query.channel ?? SalesChannel.WEBSITE;
    const search = query.search?.trim();
    const searchClause = search
      ? Prisma.sql`AND (
          p."name" ILIKE ${`%${search}%`}
          OR p."sku" ILIKE ${`%${search}%`}
          OR p."slug" ILIKE ${`%${search}%`}
        )`
      : Prisma.empty;
    const availabilityClause =
      channel === SalesChannel.POS
        ? Prisma.sql`(
            s."totalStock" - s."reservedStock" - s."soldStock"
          ) > 0`
        : Prisma.sql`(
            s."totalStock" - s."reservedStock" - s."soldStock" - s."safetyBuffer"
          ) > 0`;
    const baseWhere = Prisma.sql`
      p."merchantId" = CAST(${merchantId} AS uuid)
      AND p."status" = 'ACTIVE'::"ProductStatus"
      AND p."deletedAt" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "product_channel_visibility" pcv
        WHERE pcv."productId" = p."id"
          AND pcv."channel" = CAST(${channel} AS "SalesChannel")
          AND pcv."isVisible" = true
          AND pcv."isPurchasable" = true
      )
      AND EXISTS (
        SELECT 1
        FROM "inventory_stocks" s
        WHERE s."productId" = p."id"
          AND s."merchantId" = p."merchantId"
          AND ${availabilityClause}
          AND (
            (
              s."variantId" IS NULL
              AND NOT EXISTS (
                SELECT 1
                FROM "product_variants" pv
                WHERE pv."productId" = p."id"
                  AND pv."status" = 'ACTIVE'::"ProductVariantStatus"
              )
            )
            OR EXISTS (
              SELECT 1
              FROM "product_variants" pv
              WHERE pv."id" = s."variantId"
                AND pv."productId" = p."id"
                AND pv."status" = 'ACTIVE'::"ProductVariantStatus"
            )
          )
      )
      ${searchClause}
    `;
    const [idRows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<ProductIdRow[]>(Prisma.sql`
        SELECT p."id"
        FROM "products" p
        WHERE ${baseWhere}
        ORDER BY p."createdAt" DESC
        LIMIT ${query.take}
        OFFSET ${query.skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "products" p
        WHERE ${baseWhere}
      `),
    ]);
    const ids = idRows.map(({ id }) => id);
    const products = ids.length
      ? await this.prisma.product.findMany({
          where: { id: { in: ids } },
          include: this.publicProductInclude(merchantId, channel),
        })
      : [];
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const ordered = ids
      .map((id) => productById.get(id))
      .filter((product) => product !== undefined)
      .map((product) => this.toPublicProduct(product, channel));

    return new PaginatedResult(
      ordered,
      query.take,
      query.page ?? 1,
      Number(countRows[0]?.count ?? 0),
    );
  }

  private publicProductInclude(merchantId: string, channel: SalesChannel) {
    return {
      media: { orderBy: { sortOrder: 'asc' as const } },
      channelVisibility: { where: { channel } },
      inventoryStocks: { where: { merchantId } },
      variants: {
        where: { status: 'ACTIVE' as const },
        orderBy: { createdAt: 'asc' as const },
        include: { inventoryStocks: { where: { merchantId } } },
      },
    };
  }

  private toPublicProduct<
    T extends {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      sku: string;
      price: { toString(): string };
      currency: string;
      media: Array<{ url: string; type: string; sortOrder: number }>;
      inventoryStocks: Array<{
        variantId: string | null;
        totalStock: number;
        reservedStock: number;
        soldStock: number;
        safetyBuffer: number;
      }>;
      variants: Array<{
        id: string;
        name: string;
        sku: string;
        price: { toString(): string };
        attributes: unknown;
        inventoryStocks: Array<{
          totalStock: number;
          reservedStock: number;
          soldStock: number;
          safetyBuffer: number;
        }>;
      }>;
    },
  >(product: T, channel: SalesChannel) {
    const variants = product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price.toString(),
      attributes: variant.attributes,
      isAvailable: variant.inventoryStocks.some((stock) =>
        this.isStockAvailable(stock, channel),
      ),
    }));
    const isAvailable = variants.length
      ? variants.some((variant) => variant.isAvailable)
      : product.inventoryStocks
          .filter(({ variantId }) => variantId === null)
          .some((stock) => this.isStockAvailable(stock, channel));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      price: product.price.toString(),
      currency: product.currency,
      channel,
      isAvailable,
      isPurchasable: isAvailable,
      media: product.media,
      variants,
    };
  }

  private isStockAvailable(
    stock: {
      totalStock: number;
      reservedStock: number;
      soldStock: number;
      safetyBuffer: number;
    },
    channel: SalesChannel,
  ) {
    const available = stock.totalStock - stock.reservedStock - stock.soldStock;
    return channel === SalesChannel.POS
      ? available > 0
      : available - stock.safetyBuffer > 0;
  }

  private getThemeForMerchant(merchantId: string) {
    return this.themes.getLiveTheme(merchantId);
  }
}
