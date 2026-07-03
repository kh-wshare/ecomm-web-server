import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { NotificationService } from '#app/modules/notification/notification.service';
import {
  AdjustInventoryDto,
  ConfirmInventoryDto,
  ReleaseInventoryDto,
  ReserveInventoryDto,
} from './dto/inventory-input.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  calculateAvailableStock,
  calculateOnlineSellableStock,
} from './inventory-calculation';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

export type CheckoutReservationInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

type LockedStock = {
  id: string;
  merchantId: string;
  productId: string;
  variantId: string | null;
  stockKey: string;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  safetyBuffer: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async findAll(merchantId: string, query: InventoryQueryDto) {
    const where: Prisma.InventoryStockWhereInput = {
      merchantId,
      productId: query.productId,
      ...(query.search
        ? {
            OR: [
              {
                product: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                product: {
                  sku: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                variant: {
                  sku: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [stocks, total] = await this.prisma.$transaction([
      this.prisma.inventoryStock.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true, status: true } },
          variant: { select: { name: true, sku: true, status: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.inventoryStock.count({ where }),
    ]);
    return new PaginatedResult(
      stocks.map((stock) => this.toStockView(stock)),
      query.take,
      query.page ?? 1,
      total,
    );
  }

  async findProduct(merchantId: string, productId: string) {
    await this.assertTarget(merchantId, productId);
    const [stocks, activeReservations, recentMovements] = await Promise.all([
      this.prisma.inventoryStock.findMany({
        where: { merchantId, productId },
        include: {
          product: { select: { name: true, sku: true, status: true } },
          variant: { select: { name: true, sku: true, status: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.inventoryReservation.findMany({
        where: { merchantId, productId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { merchantId, productId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return {
      productId,
      stocks: stocks.map((stock) => this.toStockView(stock)),
      activeReservations,
      recentMovements,
    };
  }

  async adjust(
    merchantId: string,
    userId: string,
    dto: AdjustInventoryDto,
    metadata: AuditMetadata,
  ) {
    await this.assertTarget(merchantId, dto.productId, dto.variantId);
    const stockKey = this.stockKey(dto.productId, dto.variantId);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryStock.upsert({
        where: { merchantId_stockKey: { merchantId, stockKey } },
        update: {},
        create: {
          merchantId,
          productId: dto.productId,
          variantId: dto.variantId,
          stockKey,
        },
      });
      const stock = await this.lockStock(tx, merchantId, stockKey);
      const totalStock = stock.totalStock + dto.quantityDelta;
      if (
        totalStock < 0 ||
        totalStock < stock.reservedStock + stock.soldStock
      ) {
        throw new ConflictException(
          'Adjustment would reduce stock below committed quantity',
        );
      }
      const updated = await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          totalStock,
          ...(dto.safetyBuffer !== undefined
            ? { safetyBuffer: dto.safetyBuffer }
            : {}),
        },
      });
      await tx.inventoryMovement.create({
        data: {
          merchantId,
          inventoryStockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          type: 'MANUAL_ADJUSTMENT',
          quantity: dto.quantityDelta,
          referenceId: dto.referenceId,
          referenceType: dto.referenceType ?? 'manual_adjustment',
          createdById: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'inventory.adjusted',
          entityType: 'inventory_stock',
          entityId: stock.id,
          before: this.stockSnapshot(stock),
          after: this.stockSnapshot(updated),
          ...metadata,
        },
      });
      return this.toStockView(updated);
    });
    await this.notifications.syncStockAlert(merchantId, result.id);
    return result;
  }

  async reserve(
    merchantId: string,
    userId: string,
    dto: ReserveInventoryDto,
    metadata: AuditMetadata,
  ) {
    const [result] = await this.reserveCheckout(
      merchantId,
      userId,
      dto.checkoutSessionId,
      dto.channel,
      [
        {
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
      ],
      new Date(Date.now() + (dto.expiresInMinutes ?? 15) * 60 * 1000),
      metadata,
    );
    return result;
  }

  async reserveCheckout(
    merchantId: string,
    userId: string | null,
    checkoutSessionId: string,
    channel: SalesChannel,
    items: CheckoutReservationInput[],
    expiresAt: Date,
    metadata: AuditMetadata,
  ) {
    const targets = await Promise.all(
      items.map(async (item) => {
        const target = await this.assertTarget(
          merchantId,
          item.productId,
          item.variantId,
        );
        if (
          target.product.status !== 'ACTIVE' ||
          (target.variant && target.variant.status !== 'ACTIVE')
        ) {
          throw new ConflictException('Product is not active');
        }
        const visibility = target.product.channelVisibility.find(
          ({ channel: targetChannel }) => targetChannel === channel,
        );
        if (!visibility?.isVisible || !visibility.isPurchasable) {
          throw new ConflictException(
            'Product is not purchasable on the selected channel',
          );
        }
        return {
          ...item,
          stockKey: this.stockKey(item.productId, item.variantId),
        };
      }),
    );
    const stockKeys = new Set(targets.map(({ stockKey }) => stockKey));
    if (stockKeys.size !== targets.length) {
      throw new ConflictException('Duplicate checkout stock item');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const results: Array<{
        reservation: {
          id: string;
          merchantId: string;
          inventoryStockId: string;
          productId: string;
          variantId: string | null;
          orderId: string | null;
          checkoutSessionId: string;
          quantity: number;
          status: string;
          expiresAt: Date;
          createdAt: Date;
          updatedAt: Date;
        };
        stock: object;
      }> = [];
      for (const target of targets.sort((a, b) =>
        a.stockKey.localeCompare(b.stockKey),
      )) {
        let stock = await this.lockStock(tx, merchantId, target.stockKey);
        stock = await this.expireLockedStock(tx, stock);

        const existing = await tx.inventoryReservation.findUnique({
          where: {
            checkoutSessionId_inventoryStockId: {
              checkoutSessionId,
              inventoryStockId: stock.id,
            },
          },
        });
        if (existing) {
          if (
            existing.status === 'ACTIVE' &&
            existing.quantity === target.quantity
          ) {
            results.push({
              reservation: existing,
              stock: this.toStockView(stock),
            });
            continue;
          }
          throw new ConflictException(
            'Checkout session already has a reservation for this stock item',
          );
        }

        const availableStock = this.availableStock(stock);
        const sellableStock =
          channel === SalesChannel.POS
            ? availableStock
            : Math.max(0, availableStock - stock.safetyBuffer);
        if (target.quantity > sellableStock) {
          throw new ConflictException('Insufficient sellable stock');
        }

        const reservation = await tx.inventoryReservation.create({
          data: {
            merchantId,
            inventoryStockId: stock.id,
            productId: stock.productId,
            variantId: stock.variantId,
            checkoutSessionId,
            quantity: target.quantity,
            expiresAt,
          },
        });
        const updated = await tx.inventoryStock.update({
          where: { id: stock.id },
          data: { reservedStock: { increment: target.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            merchantId,
            inventoryStockId: stock.id,
            productId: stock.productId,
            variantId: stock.variantId,
            type: 'RESERVED',
            quantity: target.quantity,
            referenceId: reservation.id,
            referenceType: 'inventory_reservation',
            createdById: userId,
          },
        });
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'inventory.reserved',
            entityType: 'inventory_reservation',
            entityId: reservation.id,
            after: {
              quantity: reservation.quantity,
              checkoutSessionId: reservation.checkoutSessionId,
              expiresAt: reservation.expiresAt.toISOString(),
            },
            ...metadata,
          },
        });
        results.push({
          reservation,
          stock: this.toStockView(updated),
        });
      }
      return results;
    });
    await Promise.all(
      results.map(({ reservation }) =>
        this.notifications.syncStockAlert(
          merchantId,
          reservation.inventoryStockId,
        ),
      ),
    );
    return results;
  }

  async release(
    merchantId: string,
    userId: string,
    dto: ReleaseInventoryDto,
    metadata: AuditMetadata,
  ) {
    return this.completeReservation(
      merchantId,
      userId,
      dto.reservationId,
      'RELEASED',
      undefined,
      metadata,
    );
  }

  async confirm(
    merchantId: string,
    userId: string,
    dto: ConfirmInventoryDto,
    metadata: AuditMetadata,
  ) {
    return this.completeReservation(
      merchantId,
      userId,
      dto.reservationId,
      'CONFIRMED',
      dto.orderId,
      metadata,
    );
  }

  async expireReservations(limit = 100) {
    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      select: {
        id: true,
        merchantId: true,
        checkoutSessionId: true,
        inventoryStockId: true,
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });
    let expired = 0;
    const expiredCheckoutIds = new Set<string>();
    for (const reservation of reservations) {
      const changed = await this.expireReservation(
        reservation.merchantId,
        reservation.id,
      );
      expired += changed;
      if (changed) expiredCheckoutIds.add(reservation.checkoutSessionId);
    }
    if (expiredCheckoutIds.size) {
      await this.expireCheckoutStates([...expiredCheckoutIds]);
    }
    await Promise.all(
      [
        ...new Map(
          reservations.map((reservation) => [
            reservation.inventoryStockId,
            reservation,
          ]),
        ).values(),
      ].map((reservation) =>
        this.notifications.syncStockAlert(
          reservation.merchantId,
          reservation.inventoryStockId,
        ),
      ),
    );
    return expired;
  }

  private async completeReservation(
    merchantId: string,
    userId: string,
    reservationId: string,
    nextStatus: 'RELEASED' | 'CONFIRMED',
    orderId: string | undefined,
    metadata: AuditMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      let reservation = await tx.inventoryReservation.findFirst({
        where: { id: reservationId, merchantId },
      });
      if (!reservation) {
        throw new NotFoundException('Inventory reservation not found');
      }
      let stock = await this.lockStockById(
        tx,
        merchantId,
        reservation.inventoryStockId,
      );
      reservation = await tx.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      if (reservation.status === nextStatus) {
        return { reservation, stock: this.toStockView(stock), expired: false };
      }
      if (reservation.status !== 'ACTIVE') {
        throw new ConflictException(
          `Reservation is already ${reservation.status.toLowerCase()}`,
        );
      }
      if (
        nextStatus === 'CONFIRMED' &&
        reservation.expiresAt.getTime() <= Date.now()
      ) {
        stock = await this.expireLockedReservation(tx, stock, reservation);
        return {
          reservation: {
            ...reservation,
            status: 'EXPIRED' as const,
          },
          stock: this.toStockView(stock),
          expired: true,
        };
      }

      const updatedReservation = await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: nextStatus,
          ...(orderId ? { orderId } : {}),
        },
      });
      const updatedStock = await tx.inventoryStock.update({
        where: { id: stock.id },
        data:
          nextStatus === 'CONFIRMED'
            ? {
                reservedStock: { decrement: reservation.quantity },
                soldStock: { increment: reservation.quantity },
              }
            : { reservedStock: { decrement: reservation.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          merchantId,
          inventoryStockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          type: nextStatus === 'CONFIRMED' ? 'SOLD' : 'RESERVATION_RELEASED',
          quantity:
            nextStatus === 'CONFIRMED'
              ? reservation.quantity
              : -reservation.quantity,
          referenceId: reservation.id,
          referenceType: 'inventory_reservation',
          createdById: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action:
            nextStatus === 'CONFIRMED'
              ? 'inventory.confirmed'
              : 'inventory.released',
          entityType: 'inventory_reservation',
          entityId: reservation.id,
          before: { status: reservation.status },
          after: { status: nextStatus, orderId: orderId ?? null },
          ...metadata,
        },
      });
      return {
        reservation: updatedReservation,
        stock: this.toStockView(updatedStock),
        expired: false,
      };
    });
    if (result.expired) {
      await this.expireCheckoutStates([result.reservation.checkoutSessionId]);
      await this.notifications.syncStockAlert(
        merchantId,
        result.reservation.inventoryStockId,
      );
      throw new ConflictException('Reservation has expired');
    }
    await this.notifications.syncStockAlert(
      merchantId,
      result.reservation.inventoryStockId,
    );
    return { reservation: result.reservation, stock: result.stock };
  }

  private async expireCheckoutStates(checkoutSessionIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.checkoutSession.updateMany({
        where: { id: { in: checkoutSessionIds }, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      }),
      this.prisma.order.updateMany({
        where: {
          checkoutSessionId: { in: checkoutSessionIds },
          paymentStatus: 'PENDING',
          status: { in: ['PENDING_PAYMENT', 'RESERVED'] },
        },
        data: { status: 'EXPIRED' },
      }),
    ]);
  }

  private async expireReservation(merchantId: string, reservationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findFirst({
        where: {
          id: reservationId,
          merchantId,
          status: 'ACTIVE',
          expiresAt: { lte: new Date() },
        },
      });
      if (!reservation) return 0;
      const stock = await this.lockStockById(
        tx,
        merchantId,
        reservation.inventoryStockId,
      );
      await this.expireLockedReservation(tx, stock, reservation);
      return 1;
    });
  }

  private async expireLockedStock(
    tx: Prisma.TransactionClient,
    stock: LockedStock,
  ) {
    const expired = await tx.inventoryReservation.findMany({
      where: {
        inventoryStockId: stock.id,
        status: 'ACTIVE',
        expiresAt: { lte: new Date() },
      },
    });
    for (const reservation of expired) {
      stock = await this.expireLockedReservation(tx, stock, reservation);
    }
    return stock;
  }

  private async expireLockedReservation(
    tx: Prisma.TransactionClient,
    stock: LockedStock,
    reservation: {
      id: string;
      merchantId: string;
      checkoutSessionId: string;
      quantity: number;
      status: string;
    },
  ) {
    const changed = await tx.inventoryReservation.updateMany({
      where: { id: reservation.id, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
    if (changed.count === 0) return stock;
    if (stock.reservedStock < reservation.quantity) {
      throw new ConflictException('Inventory reservation balance is invalid');
    }

    const updated = await tx.inventoryStock.update({
      where: { id: stock.id },
      data: { reservedStock: { decrement: reservation.quantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        merchantId: reservation.merchantId,
        inventoryStockId: stock.id,
        productId: stock.productId,
        variantId: stock.variantId,
        type: 'RESERVATION_RELEASED',
        quantity: -reservation.quantity,
        referenceId: reservation.id,
        referenceType: 'expired_inventory_reservation',
      },
    });
    await tx.auditLog.create({
      data: {
        merchantId: reservation.merchantId,
        action: 'inventory.expired',
        entityType: 'inventory_reservation',
        entityId: reservation.id,
        before: { status: reservation.status },
        after: { status: 'EXPIRED' },
      },
    });
    return updated;
  }

  private async assertTarget(
    merchantId: string,
    productId: string,
    variantId?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, merchantId, deletedAt: null },
      select: {
        id: true,
        status: true,
        channelVisibility: true,
        variants: {
          where: variantId ? { id: variantId } : { id: { in: [] } },
          select: { id: true, status: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const variant = variantId ? product.variants[0] : null;
    if (variantId && !variant) {
      throw new NotFoundException('Product variant not found');
    }
    return { product, variant };
  }

  private async lockStock(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockKey: string,
  ) {
    const rows = await tx.$queryRaw<LockedStock[]>(Prisma.sql`
      SELECT *
      FROM "inventory_stocks"
      WHERE "merchantId" = CAST(${merchantId} AS uuid)
        AND "stockKey" = ${stockKey}
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Inventory stock not found');
    return rows[0];
  }

  private async lockStockById(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockId: string,
  ) {
    const rows = await tx.$queryRaw<LockedStock[]>(Prisma.sql`
      SELECT *
      FROM "inventory_stocks"
      WHERE "merchantId" = CAST(${merchantId} AS uuid)
        AND "id" = CAST(${stockId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Inventory stock not found');
    return rows[0];
  }

  private stockKey(productId: string, variantId?: string) {
    return variantId ? `variant:${variantId}` : `product:${productId}`;
  }

  private availableStock(stock: {
    totalStock: number;
    reservedStock: number;
    soldStock: number;
  }) {
    return calculateAvailableStock(stock);
  }

  private toStockView<
    T extends {
      totalStock: number;
      reservedStock: number;
      soldStock: number;
      safetyBuffer: number;
    },
  >(stock: T) {
    const availableStock = this.availableStock(stock);
    return {
      ...stock,
      availableStock,
      onlineSellableStock: calculateOnlineSellableStock(stock),
    };
  }

  private stockSnapshot(stock: {
    totalStock: number;
    reservedStock: number;
    soldStock: number;
    safetyBuffer: number;
  }): Prisma.InputJsonObject {
    return {
      totalStock: stock.totalStock,
      reservedStock: stock.reservedStock,
      soldStock: stock.soldStock,
      safetyBuffer: stock.safetyBuffer,
    };
  }
}
