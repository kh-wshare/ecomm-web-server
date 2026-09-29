import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { calculateAvailableStock } from '#app/modules/inventory/inventory-calculation';
import {
  DashboardRangeQueryDto,
  DashboardTopProductsQueryDto,
} from './dto/dashboard-query.dto';
import {
  bucketRevenue,
  computeChange,
  previousRangeLabel,
  rangeLabel,
  resolveDashboardRange,
} from './dashboard.util';
import type { Kpi, Money } from './dashboard.util';

const PAYOUT_CLEARING_DAYS = 2;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getRevenue(merchantId: string, query: DashboardRangeQueryDto) {
    const {
      resolved,
      orders,
      revenue,
      ordersCount,
      changePct,
      trend,
      currency,
    } = await this.loadRevenueTotals(merchantId, query);

    const points = bucketRevenue(orders, resolved);

    return {
      range: resolved.range,
      interval: resolved.interval,
      currency,
      totals: {
        revenue: revenue.toFixed(2),
        orders: ordersCount,
        changePct,
        trend,
      },
      points: points.map((point) => ({
        bucket: point.bucket,
        label: point.label,
        revenue: point.revenue.toFixed(2),
        orders: point.orders,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadRevenueTotals(
    merchantId: string,
    query: DashboardRangeQueryDto,
  ) {
    const resolved = resolveDashboardRange(
      query.range,
      query.from,
      query.to,
      query.interval,
    );
    const branchFilter = query.branchId ? { branchId: query.branchId } : {};

    const [orders, previous, previousCustomerGroups, currencySample] =
      await Promise.all([
        this.prisma.order.findMany({
          where: {
            merchantId,
            paymentStatus: 'PAID',
            paidAt: { gte: resolved.start, lte: resolved.end },
            ...branchFilter,
          },
          select: {
            paidAt: true,
            totalAmount: true,
            currency: true,
            customerId: true,
          },
        }),
        this.prisma.order.aggregate({
          where: {
            merchantId,
            paymentStatus: 'PAID',
            paidAt: { gte: resolved.previousStart, lt: resolved.previousEnd },
            ...branchFilter,
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId,
            paymentStatus: 'PAID',
            paidAt: { gte: resolved.previousStart, lt: resolved.previousEnd },
            customerId: { not: null },
            ...branchFilter,
          },
        }),
        this.resolveCurrency(merchantId),
      ]);

    const revenue = orders.reduce(
      (sum, order) => sum.add(order.totalAmount),
      new Prisma.Decimal(0),
    );
    const previousRevenue = previous._sum.totalAmount ?? new Prisma.Decimal(0);
    const { changePct, trend } = computeChange(revenue, previousRevenue);

    const ordersCount = orders.length;
    const previousOrdersCount = previous._count;
    const { changePct: ordersChangePct, trend: ordersTrend } = computeChange(
      new Prisma.Decimal(ordersCount),
      new Prisma.Decimal(previousOrdersCount),
    );

    const averageOrderValue =
      ordersCount > 0 ? revenue.div(ordersCount) : new Prisma.Decimal(0);
    const previousAverageOrderValue =
      previousOrdersCount > 0
        ? previousRevenue.div(previousOrdersCount)
        : new Prisma.Decimal(0);
    const { changePct: aovChangePct, trend: aovTrend } = computeChange(
      averageOrderValue,
      previousAverageOrderValue,
    );

    const activeCustomers = new Set(
      orders
        .map((order) => order.customerId)
        .filter((id): id is string => Boolean(id)),
    ).size;
    const previousActiveCustomers = previousCustomerGroups.length;
    const { changePct: activeCustomersChangePct, trend: activeCustomersTrend } =
      computeChange(
        new Prisma.Decimal(activeCustomers),
        new Prisma.Decimal(previousActiveCustomers),
      );

    return {
      resolved,
      orders,
      revenue,
      ordersCount,
      changePct,
      trend,
      ordersChangePct,
      ordersTrend,
      averageOrderValue,
      aovChangePct,
      aovTrend,
      activeCustomers,
      activeCustomersChangePct,
      activeCustomersTrend,
      currency: orders[0]?.currency ?? currencySample,
    };
  }

  async getTopProducts(
    merchantId: string,
    query: DashboardTopProductsQueryDto,
  ) {
    const resolved = resolveDashboardRange(query.range, query.from, query.to);
    const branchFilter = query.branchId ? { branchId: query.branchId } : {};

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId', 'variantId'],
      where: {
        order: {
          merchantId,
          paymentStatus: 'PAID',
          paidAt: { gte: resolved.start, lte: resolved.end },
          ...branchFilter,
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: query.limit,
    });

    if (grouped.length === 0) {
      return {
        range: resolved.range,
        currency: await this.resolveCurrency(merchantId),
        items: [],
      };
    }

    const productIds = Array.from(new Set(grouped.map((row) => row.productId)));
    const variantIds = grouped
      .map((row) => row.variantId)
      .filter((id): id is string => Boolean(id));

    const [products, variants, stocks, currency] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, merchantId },
        select: {
          id: true,
          name: true,
          sku: true,
          trackStock: true,
          media: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
        },
      }),
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds }, merchantId },
        select: { id: true, name: true, sku: true },
      }),
      this.prisma.inventoryStock.findMany({
        where: { merchantId, productId: { in: productIds } },
        select: {
          productId: true,
          variantId: true,
          totalStock: true,
          reservedStock: true,
          soldStock: true,
          safetyBuffer: true,
        },
      }),
      this.resolveCurrency(merchantId),
    ]);

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const variantById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );
    const stockByKey = new Map(
      stocks.map((stock) => [
        stockMapKey(stock.productId, stock.variantId),
        stock,
      ]),
    );

    const maxRevenue = grouped[0]._sum.totalPrice ?? new Prisma.Decimal(0);

    const items = grouped.map((row, index) => {
      const product = productById.get(row.productId);
      const variant = row.variantId
        ? variantById.get(row.variantId)
        : undefined;
      const revenue = row._sum.totalPrice ?? new Prisma.Decimal(0);
      const stock = stockByKey.get(stockMapKey(row.productId, row.variantId));
      const tracked = product?.trackStock ?? false;
      const available = stock ? calculateAvailableStock(stock) : 0;

      return {
        rank: index + 1,
        productId: row.productId,
        variantId: row.variantId,
        name: variant
          ? `${product?.name ?? ''} — ${variant.name}`.trim()
          : (product?.name ?? 'Unknown product'),
        sku: variant?.sku ?? product?.sku ?? '',
        imageUrl: product?.media[0]?.url ?? null,
        unitsSold: row._sum.quantity ?? 0,
        revenue: revenue.toFixed(2),
        sharePct: maxRevenue.gt(0)
          ? Math.round(revenue.div(maxRevenue).mul(1000).toNumber()) / 10
          : 0,
        stock: {
          onHand: stock?.totalStock ?? 0,
          available,
          lowStock:
            tracked &&
            !!stock &&
            stock.safetyBuffer > 0 &&
            available <= stock.safetyBuffer,
          tracked,
        },
      };
    });

    return { range: resolved.range, currency, items };
  }

  async getSetup(merchantId: string) {
    const [
      merchant,
      theme,
      productCount,
      deliveryMethodCount,
      activeProviderCount,
    ] = await Promise.all([
      this.prisma.merchant.findUniqueOrThrow({
        where: { id: merchantId },
        select: {
          status: true,
          createdAt: true,
          slug: true,
          setupDismissedAt: true,
        },
      }),
      this.prisma.merchantTheme.findUnique({
        where: { merchantId },
        select: { customDomain: true, publishedAt: true },
      }),
      this.prisma.product.count({ where: { merchantId, deletedAt: null } }),
      this.prisma.deliveryMethod.count({
        where: { merchantId, deletedAt: null },
      }),
      this.prisma.paymentProvider.count({
        where: { merchantId, status: 'ACTIVE' },
      }),
    ]);

    const tasks = [
      {
        key: 'verify_business',
        title: 'Verify your business',
        done: merchant.status === 'ACTIVE',
        completedAt:
          merchant.status === 'ACTIVE'
            ? merchant.createdAt.toISOString()
            : null,
        href: '/settings/verification',
      },
      {
        key: 'add_product',
        title: 'Add your first product',
        done: productCount > 0,
        completedAt: null,
        href: '/products/new',
      },
      {
        key: 'delivery_method',
        title: 'Set up delivery',
        done: deliveryMethodCount > 0,
        completedAt: null,
        href: '/delivery-methods',
      },
      {
        key: 'payment_methods',
        title: 'Turn on payments',
        done: activeProviderCount > 0,
        completedAt: null,
        href: '/payments',
      },
      {
        key: 'publish_theme',
        title: 'Publish your storefront',
        done: theme?.publishedAt != null,
        completedAt: theme?.publishedAt?.toISOString() ?? null,
        href: '/theme',
      },
    ];

    const firstIncomplete = tasks.find((task) => !task.done);
    const tasksWithRecommendation = tasks.map((task) => ({
      ...task,
      ...(task === firstIncomplete ? { recommended: true } : {}),
    }));

    const storefrontUrl = this.storefrontUrl(
      merchant.slug,
      theme?.customDomain ?? null,
    );

    return {
      completed: tasks.filter((task) => task.done).length,
      total: tasks.length,
      dismissedAt: merchant.setupDismissedAt?.toISOString() ?? null,
      tasks: tasksWithRecommendation,
      storefront: {
        url: storefrontUrl,
        qrCodeUrl: '/dashboard/setup/qr.svg',
        published: theme?.publishedAt != null,
      },
    };
  }

  async dismissSetup(merchantId: string) {
    const dismissedAt = new Date();
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { setupDismissedAt: dismissedAt },
    });
    return { dismissedAt: dismissedAt.toISOString() };
  }

  async restoreSetup(merchantId: string) {
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { setupDismissedAt: null },
    });
    return { dismissedAt: null };
  }

  async getStorefrontQrTarget(merchantId: string) {
    const [merchant, theme] = await Promise.all([
      this.prisma.merchant.findUniqueOrThrow({
        where: { id: merchantId },
        select: { slug: true },
      }),
      this.prisma.merchantTheme.findUnique({
        where: { merchantId },
        select: { customDomain: true },
      }),
    ]);
    return this.storefrontUrl(merchant.slug, theme?.customDomain ?? null);
  }

  private storefrontUrl(slug: string, customDomain: string | null) {
    return customDomain
      ? `https://${customDomain}`
      : `${this.config.get<string>('app.storefrontUrl') ?? ''}/${slug}`;
  }

  async getBalance(merchantId: string) {
    const { currency, available, pending } =
      await this.computeBalance(merchantId);
    return {
      currency,
      available: available.toFixed(2),
      pending: pending.toFixed(2),
    };
  }

  async getPayouts(merchantId: string) {
    const { currency, available, pending, settlementAccount } =
      await this.computeBalance(merchantId);
    const nextPayout = this.nextPayoutDate();

    const payoutBlockedReason = !settlementAccount
      ? 'NO_SETTLEMENT_ACCOUNT'
      : available.lte(0)
        ? 'NO_AVAILABLE_BALANCE'
        : null;

    return {
      currency,
      available: available.toFixed(2),
      pending: pending.toFixed(2),
      nextPayout: {
        scheduledFor: nextPayout.toISOString().slice(0, 10),
        label: `Next payout ${WEEKDAY_LABELS[nextPayout.getUTCDay()]}`,
        estimatedAmount: available.toFixed(2),
      },
      settlementAccount: settlementAccount
        ? {
            id: settlementAccount.id,
            bankName: settlementAccount.bankName,
            last4: settlementAccount.accountNumber.slice(-4),
            holderName: settlementAccount.holderName,
          }
        : null,
      canRequestPayout: payoutBlockedReason === null,
      payoutBlockedReason,
    };
  }

  async getSummary(merchantId: string, query: DashboardRangeQueryDto) {
    const {
      resolved,
      revenue,
      ordersCount,
      changePct,
      trend,
      ordersChangePct,
      ordersTrend,
      averageOrderValue,
      aovChangePct,
      aovTrend,
      activeCustomers,
      activeCustomersChangePct,
      activeCustomersTrend,
      currency,
    } = await this.loadRevenueTotals(merchantId, query);

    return {
      currency,
      period: {
        from: resolved.start.toISOString(),
        to: resolved.end.toISOString(),
        label: rangeLabel(resolved.range),
      },
      comparison: {
        from: resolved.previousStart.toISOString(),
        to: resolved.previousEnd.toISOString(),
        label: previousRangeLabel(resolved.range),
      },
      kpis: {
        totalRevenue: {
          value: revenue.toFixed(2),
          changePct,
          trend,
        } satisfies Kpi<Money>,
        totalOrders: {
          value: ordersCount,
          changePct: ordersChangePct,
          trend: ordersTrend,
        } satisfies Kpi<number>,
        averageOrderValue: {
          value: averageOrderValue.toFixed(2),
          changePct: aovChangePct,
          trend: aovTrend,
        } satisfies Kpi<Money>,
        activeCustomers: {
          value: activeCustomers,
          changePct: activeCustomersChangePct,
          trend: activeCustomersTrend,
        } satisfies Kpi<number>,
      },
      hasData: ordersCount > 0,
      generatedAt: new Date().toISOString(),
    };
  }

  private async computeBalance(merchantId: string) {
    const cutoff = new Date(
      Date.now() - PAYOUT_CLEARING_DAYS * 24 * 60 * 60 * 1000,
    );

    const [
      settlementAccount,
      clearedPaid,
      recentPaid,
      clearedRefunds,
      recentRefunds,
    ] = await Promise.all([
      this.prisma.settlementAccount.findUnique({ where: { merchantId } }),
      this.prisma.payment.aggregate({
        where: { merchantId, status: 'CONFIRMED', paidAt: { lte: cutoff } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { merchantId, status: 'CONFIRMED', paidAt: { gt: cutoff } },
        _sum: { amount: true },
      }),
      this.prisma.paymentRefund.aggregate({
        where: {
          merchantId,
          status: 'SUCCESS',
          payment: { paidAt: { lte: cutoff } },
        },
        _sum: { amount: true },
      }),
      this.prisma.paymentRefund.aggregate({
        where: {
          merchantId,
          status: 'SUCCESS',
          payment: { paidAt: { gt: cutoff } },
        },
        _sum: { amount: true },
      }),
    ]);

    const available = clampNonNegative(
      (clearedPaid._sum.amount ?? new Prisma.Decimal(0)).sub(
        clearedRefunds._sum.amount ?? new Prisma.Decimal(0),
      ),
    );
    const pending = clampNonNegative(
      (recentPaid._sum.amount ?? new Prisma.Decimal(0)).sub(
        recentRefunds._sum.amount ?? new Prisma.Decimal(0),
      ),
    );

    const currency =
      settlementAccount?.currency ?? (await this.resolveCurrency(merchantId));

    return { currency, available, pending, settlementAccount };
  }

  private nextPayoutDate() {
    const now = new Date();
    const daysUntilMonday = (1 - now.getUTCDay() + 7) % 7 || 7;
    const next = new Date(now);
    next.setUTCDate(now.getUTCDate() + daysUntilMonday);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }

  private async resolveCurrency(merchantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      select: { currency: true },
    });
    return order?.currency ?? 'USD';
  }
}

function stockMapKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? ''}`;
}

function clampNonNegative(value: Prisma.Decimal) {
  return value.isNegative() ? new Prisma.Decimal(0) : value;
}
