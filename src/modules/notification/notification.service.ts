import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { EventBusService } from '#app/infrastructure/events/event-bus.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

export type CreateNotificationInput = {
  merchantId: string;
  dedupeKey?: string;
  type: string;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
    private readonly cache: CommerceCacheService,
  ) {}

  async findAll(merchantId: string, query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      merchantId,
      type: query.type,
      ...(query.unread ? { readAt: null } : {}),
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
                message: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResult(
      notifications,
      query.take,
      query.page ?? 1,
      total,
    );
  }

  async unreadCount(merchantId: string) {
    return {
      count: await this.prisma.notification.count({
        where: { merchantId, readAt: null },
      }),
    };
  }

  async markRead(merchantId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, merchantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.readAt) return notification;
    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(merchantId: string) {
    const readAt = new Date();
    const result = await this.prisma.notification.updateMany({
      where: { merchantId, readAt: null },
      data: { readAt },
    });
    return { updated: result.count, readAt };
  }

  createInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateNotificationInput,
  ) {
    if (!input.dedupeKey) {
      return tx.notification.create({ data: input });
    }
    return tx.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: input,
      update: {
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
        readAt: null,
        createdAt: new Date(),
      },
    });
  }

  async syncStockAlert(merchantId: string, stockId: string) {
    await this.cache.invalidateCatalog(merchantId);
    const stock = await this.prisma.inventoryStock.findFirst({
      where: { id: stockId, merchantId },
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
      },
    });
    if (!stock) return null;
    const available = stock.totalStock - stock.reservedStock - stock.soldStock;
    const type =
      available <= 0
        ? 'INVENTORY_OUT_OF_STOCK'
        : stock.safetyBuffer > 0 && available <= stock.safetyBuffer
          ? 'INVENTORY_LOW_STOCK'
          : null;
    const dedupeKey = `inventory-stock:${stock.id}`;
    const existing = await this.prisma.notification.findUnique({
      where: { dedupeKey },
    });

    if (!type) {
      if (existing && this.isActiveAlert(existing.data)) {
        await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            readAt: new Date(),
            data: this.stockData(stock, available, false),
          },
        });
      }
      return null;
    }
    if (existing?.type === type && this.isActiveAlert(existing.data)) {
      return existing;
    }

    const label = stock.variant
      ? `${stock.product.name} — ${stock.variant.name}`
      : stock.product.name;
    const notification = await this.prisma.notification.upsert({
      where: { dedupeKey },
      create: {
        merchantId,
        dedupeKey,
        type,
        title:
          type === 'INVENTORY_OUT_OF_STOCK'
            ? 'Product is out of stock'
            : 'Product stock is low',
        message:
          type === 'INVENTORY_OUT_OF_STOCK'
            ? `${label} has no available stock.`
            : `${label} has ${available} units available.`,
        data: this.stockData(stock, available, true),
      },
      update: {
        type,
        title:
          type === 'INVENTORY_OUT_OF_STOCK'
            ? 'Product is out of stock'
            : 'Product stock is low',
        message:
          type === 'INVENTORY_OUT_OF_STOCK'
            ? `${label} has no available stock.`
            : `${label} has ${available} units available.`,
        data: this.stockData(stock, available, true),
        readAt: null,
        createdAt: new Date(),
      },
    });
    const eventType =
      type === 'INVENTORY_OUT_OF_STOCK'
        ? 'inventory.out_of_stock'
        : 'inventory.low_stock';
    this.events.publish(eventType, {
      merchantId,
      notificationId: notification.id,
      inventoryStockId: stock.id,
      productId: stock.productId,
      variantId: stock.variantId,
      availableStock: available,
    });
    return notification;
  }

  async syncOrderStockAlerts(merchantId: string, orderId: string) {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { merchantId, orderId },
      select: { inventoryStockId: true },
      distinct: ['inventoryStockId'],
    });
    return Promise.all(
      reservations.map(({ inventoryStockId }) =>
        this.syncStockAlert(merchantId, inventoryStockId),
      ),
    );
  }

  async syncCheckoutStockAlerts(merchantId: string, checkoutSessionId: string) {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { merchantId, checkoutSessionId },
      select: { inventoryStockId: true },
      distinct: ['inventoryStockId'],
    });
    return Promise.all(
      reservations.map(({ inventoryStockId }) =>
        this.syncStockAlert(merchantId, inventoryStockId),
      ),
    );
  }

  private isActiveAlert(data: Prisma.JsonValue | null) {
    return (
      data !== null &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      data.active === true
    );
  }

  private stockData(
    stock: {
      id: string;
      productId: string;
      variantId: string | null;
      totalStock: number;
      reservedStock: number;
      soldStock: number;
      safetyBuffer: number;
    },
    availableStock: number,
    active: boolean,
  ): Prisma.InputJsonObject {
    return {
      active,
      inventoryStockId: stock.id,
      productId: stock.productId,
      variantId: stock.variantId,
      totalStock: stock.totalStock,
      reservedStock: stock.reservedStock,
      soldStock: stock.soldStock,
      safetyBuffer: stock.safetyBuffer,
      availableStock,
    };
  }
}
