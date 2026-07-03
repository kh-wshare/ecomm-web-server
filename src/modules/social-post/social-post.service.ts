import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import {
  SalesChannel,
  SocialPlatform,
  SocialPublishStatus,
} from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { EventBusService } from '#app/infrastructure/events/event-bus.service';
import { NotificationService } from '#app/modules/notification/notification.service';
import {
  AddHotspotDto,
  CreateSocialPostDto,
  PublishSocialPostDto,
  SocialPostQueryDto,
  UpdateSocialPostDto,
} from './dto/social-post-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type PublishResult = {
  id: string;
  socialPostId: string;
  platform: SocialPlatform;
  status: SocialPublishStatus;
  externalPostId: string | null;
  externalUrl: string | null;
  error: string | null;
  createdAt: Date;
  skipped: boolean;
};

const detailInclude = {
  hotspots: {
    include: {
      product: { select: { id: true, name: true, slug: true, status: true } },
      variant: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  publishLogs: { orderBy: { createdAt: 'desc' as const } },
  websiteArticle: true,
} as const;

@Injectable()
export class SocialPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationService,
  ) {}

  async create(
    merchantId: string,
    userId: string,
    dto: CreateSocialPostDto,
    metadata: AuditMetadata,
  ) {
    const baseSlug = this.toSlug(dto.slug ?? dto.title);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug =
        attempt === 0
          ? baseSlug
          : `${baseSlug}-${randomBytes(3).toString('hex')}`;
      try {
        return await this.prisma.$transaction(async (tx) => {
          const post = await tx.socialPost.create({
            data: {
              merchantId,
              title: dto.title.trim(),
              slug,
              content: dto.content.trim(),
              mediaUrls: dto.mediaUrls ?? [],
              targetPlatforms: [],
            },
            include: detailInclude,
          });
          await tx.auditLog.create({
            data: {
              merchantId,
              userId,
              action: 'social_post.created',
              entityType: 'social_post',
              entityId: post.id,
              after: this.postSnapshot(post),
              ...metadata,
            },
          });
          return post;
        });
      } catch (error) {
        if (this.isUniqueConflict(error) && attempt < 4) continue;
        throw error;
      }
    }
    throw new ConflictException('Unable to allocate a social post slug');
  }

  async findAll(merchantId: string, query: SocialPostQueryDto) {
    const where: Prisma.SocialPostWhereInput = {
      merchantId,
      status: query.status,
      ...(query.platform ? { targetPlatforms: { has: query.platform } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                content: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const [posts, total] = await this.prisma.$transaction([
      this.prisma.socialPost.findMany({
        where,
        include: detailInclude,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.socialPost.count({ where }),
    ]);
    return new PaginatedResult(posts, query.take, query.page ?? 1, total);
  }

  async findOne(merchantId: string, postId: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, merchantId },
      include: detailInclude,
    });
    if (!post) throw new NotFoundException('Social post not found');
    return post;
  }

  async update(
    merchantId: string,
    postId: string,
    userId: string,
    dto: UpdateSocialPostDto,
    metadata: AuditMetadata,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockPost(tx, merchantId, postId);
        const before = await tx.socialPost.findFirst({
          where: { id: postId, merchantId },
          include: detailInclude,
        });
        if (!before) throw new NotFoundException('Social post not found');
        if (!['DRAFT', 'FAILED'].includes(before.status)) {
          throw new ConflictException('Published social posts are immutable');
        }
        const updated = await tx.socialPost.update({
          where: { id: postId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
            ...(dto.slug !== undefined ? { slug: this.toSlug(dto.slug) } : {}),
            ...(dto.content !== undefined
              ? { content: dto.content.trim() }
              : {}),
            ...(dto.mediaUrls !== undefined
              ? { mediaUrls: dto.mediaUrls }
              : {}),
            ...(before.status === 'FAILED'
              ? { status: 'DRAFT', targetPlatforms: [] }
              : {}),
          },
          include: detailInclude,
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'social_post.updated',
            entityType: 'social_post',
            entityId: postId,
            before: this.postSnapshot(before),
            after: this.postSnapshot(updated),
            ...metadata,
          },
        });
        return updated;
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('Social post slug is already in use');
      }
      throw error;
    }
  }

  async addHotspot(
    merchantId: string,
    postId: string,
    userId: string,
    dto: AddHotspotDto,
    metadata: AuditMetadata,
  ) {
    const post = await this.findOne(merchantId, postId);
    if (!['DRAFT', 'FAILED'].includes(post.status)) {
      throw new ConflictException('Published social posts are immutable');
    }
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        variants: dto.variantId
          ? { where: { id: dto.variantId, status: 'ACTIVE' } }
          : false,
      },
    });
    if (!product) throw new ConflictException('Product is not active');
    if (dto.variantId && (!product.variants || !product.variants.length)) {
      throw new ConflictException('Product variant is not active');
    }
    const duplicate = await this.prisma.shoppableHotspot.findFirst({
      where: {
        socialPostId: postId,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
      },
    });
    if (duplicate) {
      throw new ConflictException('Product hotspot already exists');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockPost(tx, merchantId, postId);
        const lockedPost = await tx.socialPost.findUniqueOrThrow({
          where: { id: postId },
          select: { status: true },
        });
        if (!['DRAFT', 'FAILED'].includes(lockedPost.status)) {
          throw new ConflictException('Published social posts are immutable');
        }
        const hotspot = await tx.shoppableHotspot.create({
          data: {
            socialPostId: postId,
            productId: dto.productId,
            variantId: dto.variantId,
            xPercent: new Prisma.Decimal(dto.xPercent),
            yPercent: new Prisma.Decimal(dto.yPercent),
            label: dto.label?.trim(),
          },
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, name: true } },
          },
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'social_post.hotspot_added',
            entityType: 'shoppable_hotspot',
            entityId: hotspot.id,
            after: {
              socialPostId: postId,
              productId: dto.productId,
              variantId: dto.variantId ?? null,
            },
            ...metadata,
          },
        });
        return hotspot;
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        throw new ConflictException('Product hotspot already exists');
      }
      throw error;
    }
  }

  async publish(
    merchantId: string,
    postId: string,
    userId: string,
    dto: PublishSocialPostDto,
    metadata: AuditMetadata,
  ) {
    await this.findOne(merchantId, postId);
    const results: PublishResult[] = [];
    for (const platform of dto.platforms) {
      results.push(await this.publishPlatform(merchantId, postId, platform));
    }

    const post = await this.prisma.$transaction(async (tx) => {
      await this.lockPost(tx, merchantId, postId);
      const current = await tx.socialPost.findUniqueOrThrow({
        where: { id: postId },
      });
      const targetPlatforms = [
        ...new Set([...current.targetPlatforms, ...dto.platforms]),
      ];
      const successfulLogs = await tx.socialPostPublishLog.findMany({
        where: { socialPostId: postId, status: 'PUBLISHED' },
        select: { platform: true },
      });
      const successfulPlatforms = new Set(
        successfulLogs.map(({ platform }) => platform),
      );
      const successfulCount = targetPlatforms.filter((platform) =>
        successfulPlatforms.has(platform),
      ).length;
      const status =
        successfulCount === targetPlatforms.length
          ? 'PUBLISHED'
          : successfulCount > 0
            ? 'PARTIALLY_PUBLISHED'
            : 'FAILED';
      const updated = await tx.socialPost.update({
        where: { id: postId },
        data: {
          targetPlatforms,
          status,
          ...(successfulCount > 0
            ? { publishedAt: current.publishedAt ?? new Date() }
            : {}),
        },
        include: detailInclude,
      });
      const newlyPublished = results.filter(
        (result) => result.status === 'PUBLISHED' && !result.skipped,
      );
      if (newlyPublished.length) {
        await this.notifications.createInTransaction(tx, {
          merchantId,
          dedupeKey: `social-post:${postId}:published`,
          type: 'SOCIAL_POST_PUBLISHED',
          title: 'Social post published',
          message: `"${updated.title}" was published to ${newlyPublished
            .map(({ platform }) => platform.toLowerCase())
            .join(', ')}.`,
          data: {
            socialPostId: postId,
            platforms: newlyPublished.map(({ platform }) => platform),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'social_post.publish_attempted',
          entityType: 'social_post',
          entityId: postId,
          before: { status: current.status },
          after: {
            status: updated.status,
            results: results.map((result) => ({
              platform: result.platform,
              status: result.status,
              skipped: result.skipped,
            })),
          },
          ...metadata,
        },
      });
      return updated;
    });

    const newlyPublished = results.filter(
      (result) => result.status === 'PUBLISHED' && !result.skipped,
    );
    if (newlyPublished.length) {
      this.events.publish('social.post_published', {
        merchantId,
        socialPostId: postId,
        platforms: newlyPublished.map(({ platform }) => platform),
      });
    }
    return { post, results };
  }

  async logs(merchantId: string, postId: string) {
    await this.findOne(merchantId, postId);
    return this.prisma.socialPostPublishLog.findMany({
      where: { socialPostId: postId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveSocialLink(hotspotId: string, platform: SocialPlatform) {
    const hotspot = await this.prisma.shoppableHotspot.findUnique({
      where: { id: hotspotId },
      include: {
        socialPost: {
          include: {
            merchant: true,
            publishLogs: {
              where: { platform, status: 'PUBLISHED' },
              take: 1,
            },
          },
        },
        product: {
          include: {
            channelVisibility: true,
            inventoryStocks: true,
            variants: { include: { inventoryStocks: true } },
          },
        },
        variant: { include: { inventoryStocks: true } },
      },
    });
    if (
      !hotspot ||
      !hotspot.socialPost.publishLogs.length ||
      hotspot.socialPost.merchant.status !== 'ACTIVE' ||
      hotspot.socialPost.merchant.deletedAt
    ) {
      throw new NotFoundException('Social link not found');
    }
    const channel = this.salesChannel(platform);
    const visibility = hotspot.product.channelVisibility.find(
      ({ channel: itemChannel }) => itemChannel === channel,
    );
    const stock = hotspot.variant
      ? hotspot.variant.inventoryStocks
      : hotspot.product.variants.some(({ status }) => status === 'ACTIVE')
        ? hotspot.product.variants
            .filter(({ status }) => status === 'ACTIVE')
            .flatMap(({ inventoryStocks }) => inventoryStocks)
        : hotspot.product.inventoryStocks.filter(
            ({ variantId }) => variantId === null,
          );
    const isAvailable =
      hotspot.product.status === 'ACTIVE' &&
      hotspot.product.deletedAt === null &&
      (!hotspot.variant || hotspot.variant.status === 'ACTIVE') &&
      Boolean(visibility?.isVisible && visibility.isPurchasable) &&
      stock.some((item) => this.isStockAvailable(item, channel));
    return {
      hotspotId: hotspot.id,
      platform,
      isAvailable,
      product: {
        id: hotspot.product.id,
        name: hotspot.product.name,
        slug: hotspot.product.slug,
        sku: hotspot.variant?.sku ?? hotspot.product.sku,
        price: (hotspot.variant?.price ?? hotspot.product.price).toString(),
        currency: hotspot.product.currency,
        variantId: hotspot.variant?.id ?? null,
      },
      storefrontPath: `/storefront/${hotspot.socialPost.merchant.slug}/products/${hotspot.product.slug}`,
    };
  }

  async listWebsiteArticles(merchantSlug: string) {
    const merchant = await this.publicMerchant(merchantSlug);
    const articles = await this.prisma.websiteArticle.findMany({
      where: { merchantId: merchant.id },
      include: {
        socialPost: {
          include: { hotspots: { orderBy: { createdAt: 'asc' } } },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    return articles.map((article) => this.articleView(article));
  }

  async getWebsiteArticle(merchantSlug: string, slug: string) {
    const merchant = await this.publicMerchant(merchantSlug);
    const article = await this.prisma.websiteArticle.findFirst({
      where: { merchantId: merchant.id, slug: slug.trim().toLowerCase() },
      include: {
        socialPost: {
          include: { hotspots: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return this.articleView(article);
  }

  private async publishPlatform(
    merchantId: string,
    postId: string,
    platform: SocialPlatform,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockPost(tx, merchantId, postId);
      const post = await tx.socialPost.findFirst({
        where: { id: postId, merchantId },
        include: { merchant: { select: { slug: true } } },
      });
      if (!post) throw new NotFoundException('Social post not found');
      const existing = await tx.socialPostPublishLog.findFirst({
        where: { socialPostId: postId, platform, status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return { ...existing, skipped: true };

      if (platform === SocialPlatform.WEBSITE) {
        const article = await tx.websiteArticle.upsert({
          where: { socialPostId: postId },
          create: {
            merchantId,
            socialPostId: postId,
            slug: post.slug,
          },
          update: {},
        });
        const log = await tx.socialPostPublishLog.create({
          data: {
            socialPostId: postId,
            platform,
            status: 'PUBLISHED',
            externalPostId: article.id,
            externalUrl: `/storefront/${post.merchant.slug}/posts/${article.slug}`,
          },
        });
        return { ...log, skipped: false };
      }

      const log = await tx.socialPostPublishLog.create({
        data: {
          socialPostId: postId,
          platform,
          status: 'FAILED',
          error: `No credentialed ${platform.toLowerCase()} publisher is configured`,
        },
      });
      return { ...log, skipped: false };
    });
  }

  private articleView<
    T extends {
      id: string;
      slug: string;
      publishedAt: Date;
      socialPost: {
        id: string;
        title: string;
        content: string;
        mediaUrls: string[];
        hotspots: Array<{
          id: string;
          xPercent: { toString(): string };
          yPercent: { toString(): string };
          label: string | null;
        }>;
      };
    },
  >(article: T) {
    return {
      id: article.id,
      slug: article.slug,
      title: article.socialPost.title,
      content: article.socialPost.content,
      mediaUrls: article.socialPost.mediaUrls,
      publishedAt: article.publishedAt,
      hotspots: article.socialPost.hotspots.map((hotspot) => ({
        id: hotspot.id,
        xPercent: hotspot.xPercent.toString(),
        yPercent: hotspot.yPercent.toString(),
        label: hotspot.label,
        socialLink: `/social-links/${hotspot.id}?platform=WEBSITE`,
      })),
    };
  }

  private async publicMerchant(slug: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!merchant) throw new NotFoundException('Storefront not found');
    return merchant;
  }

  private salesChannel(platform: SocialPlatform) {
    return platform === SocialPlatform.WEBSITE
      ? SalesChannel.WEBSITE
      : SalesChannel[platform];
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

  private postSnapshot(post: {
    title: string;
    slug: string;
    status: string;
    mediaUrls: string[];
    targetPlatforms: string[];
  }): Prisma.InputJsonObject {
    return {
      title: post.title,
      slug: post.slug,
      status: post.status,
      mediaUrls: post.mediaUrls,
      targetPlatforms: post.targetPlatforms,
    };
  }

  private toSlug(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'post'
    );
  }

  private isUniqueConflict(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private async lockPost(
    tx: Prisma.TransactionClient,
    merchantId: string,
    postId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "social_posts"
      WHERE "id" = CAST(${postId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Social post not found');
  }
}
