import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { EventBusService } from '#app/infrastructure/events/event-bus.service';
import { NotificationService } from '#app/modules/notification/notification.service';
import {
  OrderQueryDto,
  RefundOrderDto,
  UpdateOrderStatusDto,
} from './dto/order-input.dto';
import { isOrderStatusTransitionAllowed } from './order-status';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type LockedStock = {
  id: string;
  merchantId: string;
  productId: string;
  variantId: string | null;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly events: EventBusService,
  ) {}

  async findAll(merchantId: string, query: OrderQueryDto) {
    const where: Prisma.OrderWhereInput = {
      merchantId,
      status: query.status,
      paymentStatus: query.paymentStatus,
      fulfillmentStatus: query.fulfillmentStatus,
      sourceChannel: query.sourceChannel,
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && {
            lte: this.endOfDay(query.dateTo),
          }),
        },
      }),
      ...(query.search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                customerEmail: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return new PaginatedResult(orders, query.take, query.page ?? 1, total);
  }

  async findOne(merchantId: string, orderId: string) {
    const [order, timeline] = await this.prisma.$transaction([
      this.prisma.order.findFirst({
        where: { id: orderId, merchantId },
        include: { items: true, payment: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          merchantId,
          entityType: 'order',
          entityId: orderId,
        },
        select: {
          id: true,
          action: true,
          after: true,
          createdAt: true,
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!order) throw new NotFoundException('Order not found');
    return { ...order, timeline };
  }

  private endOfDay(value: string) {
    const date = new Date(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(23, 59, 59, 999);
    }

    return date;
  }

  async confirmCheckout(checkoutSessionId: string, metadata: AuditMetadata) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lockCheckout(tx, checkoutSessionId);
      const checkout = await tx.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { items: true, order: { include: { items: true } } },
      });
      if (!checkout) throw new NotFoundException('Checkout session not found');
      if (checkout.status === 'CONFIRMED' && checkout.order) {
        return {
          order: checkout.order,
          expired: false,
          created: false,
          merchantId: checkout.merchantId,
          stockIds: [] as string[],
        };
      }
      if (checkout.status !== 'ACTIVE') {
        throw new ConflictException(
          `Checkout session is ${checkout.status.toLowerCase()}`,
        );
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { checkoutSessionId },
        orderBy: { inventoryStockId: 'asc' },
      });
      const isExpired =
        checkout.expiresAt.getTime() <= Date.now() ||
        reservations.length !== checkout.items.length ||
        reservations.some(
          (reservation) =>
            reservation.status !== 'ACTIVE' ||
            reservation.expiresAt.getTime() <= Date.now(),
        );
      if (isExpired) {
        await this.releaseReservations(
          tx,
          checkout.merchantId,
          reservations,
          'EXPIRED',
          null,
          metadata,
        );
        await tx.checkoutSession.update({
          where: { id: checkout.id },
          data: { status: 'EXPIRED' },
        });
        return {
          order: null,
          expired: true,
          created: false,
          merchantId: checkout.merchantId,
          stockIds: reservations.map(
            ({ inventoryStockId }) => inventoryStockId,
          ),
        };
      }

      const order = await tx.order.create({
        data: {
          merchantId: checkout.merchantId,
          checkoutSessionId: checkout.id,
          customerId: checkout.customerId,
          customerName: checkout.customerName,
          customerEmail: checkout.customerEmail,
          customerPhone: checkout.customerPhone,
          sourceChannel: checkout.sourceChannel,
          orderNumber: this.orderNumber(),
          status: 'PENDING_PAYMENT',
          subtotalAmount: checkout.subtotalAmount,
          discountAmount: checkout.discountAmount,
          feeAmount: checkout.feeAmount,
          totalAmount: checkout.totalAmount,
          currency: checkout.currency,
          items: {
            create: checkout.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true },
      });
      await tx.inventoryReservation.updateMany({
        where: { checkoutSessionId, status: 'ACTIVE' },
        data: { orderId: order.id },
      });
      await tx.checkoutSession.update({
        where: { id: checkout.id },
        data: { status: 'CONFIRMED' },
      });
      await tx.auditLog.create({
        data: {
          merchantId: checkout.merchantId,
          action: 'order.created',
          entityType: 'order',
          entityId: order.id,
          after: {
            orderNumber: order.orderNumber,
            status: order.status,
            checkoutSessionId,
            totalAmount: order.totalAmount.toString(),
          },
          ...metadata,
        },
      });
      await this.notifications.createInTransaction(tx, {
        merchantId: checkout.merchantId,
        dedupeKey: `order:${order.id}:created`,
        type: 'ORDER_CREATED',
        title: 'New order received',
        message: `Order ${order.orderNumber} is awaiting payment.`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount.toString(),
          currency: order.currency,
          sourceChannel: order.sourceChannel,
        },
      });
      return {
        order,
        expired: false,
        created: true,
        merchantId: checkout.merchantId,
        stockIds: [] as string[],
      };
    });
    await Promise.all(
      outcome.stockIds.map((stockId) =>
        this.notifications.syncStockAlert(outcome.merchantId, stockId),
      ),
    );
    if (outcome.expired) {
      throw new ConflictException('Checkout session has expired');
    }
    if (outcome.created && outcome.order) {
      this.events.publish('order.created', {
        merchantId: outcome.merchantId,
        orderId: outcome.order.id,
        orderNumber: outcome.order.orderNumber,
      });
    }
    return outcome.order;
  }

  async cancelCheckout(checkoutSessionId: string, metadata: AuditMetadata) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockCheckout(tx, checkoutSessionId);
      const checkout = await tx.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { order: { include: { items: true } } },
      });
      if (!checkout) throw new NotFoundException('Checkout session not found');
      if (checkout.status === 'CANCELLED') return checkout;
      if (checkout.status === 'EXPIRED') return checkout;
      if (checkout.order) {
        await this.lockOrder(tx, checkout.merchantId, checkout.order.id);
      }
      if (checkout.order?.paymentStatus === 'PAID') {
        throw new ConflictException('Paid order must use the refund flow');
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { checkoutSessionId },
        orderBy: { inventoryStockId: 'asc' },
      });
      await this.releaseReservations(
        tx,
        checkout.merchantId,
        reservations,
        'RELEASED',
        null,
        metadata,
      );
      if (checkout.order) {
        await tx.order.update({
          where: { id: checkout.order.id },
          data: {
            status: 'CANCELLED',
            fulfillmentStatus: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });
      }
      const updated = await tx.checkoutSession.update({
        where: { id: checkout.id },
        data: { status: 'CANCELLED' },
        include: { items: true, order: { include: { items: true } } },
      });
      await tx.auditLog.create({
        data: {
          merchantId: checkout.merchantId,
          action: 'checkout.cancelled',
          entityType: 'checkout_session',
          entityId: checkout.id,
          before: { status: checkout.status },
          after: { status: 'CANCELLED' },
          ...metadata,
        },
      });
      return updated;
    });
    await this.notifications.syncCheckoutStockAlerts(
      result.merchantId,
      result.id,
    );
    return result;
  }

  async expireCheckout(
    checkoutSessionId: string,
    metadata: AuditMetadata = {},
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockCheckout(tx, checkoutSessionId);
      const checkout = await tx.checkoutSession.findUniqueOrThrow({
        where: { id: checkoutSessionId },
      });
      if (
        checkout.status !== 'ACTIVE' ||
        checkout.expiresAt.getTime() > Date.now()
      ) {
        return checkout;
      }
      const reservations = await tx.inventoryReservation.findMany({
        where: { checkoutSessionId },
        orderBy: { inventoryStockId: 'asc' },
      });
      await this.releaseReservations(
        tx,
        checkout.merchantId,
        reservations,
        'EXPIRED',
        null,
        metadata,
      );
      await tx.order.updateMany({
        where: {
          checkoutSessionId,
          paymentStatus: 'PENDING',
          status: { in: ['PENDING_PAYMENT', 'RESERVED'] },
        },
        data: { status: 'EXPIRED' },
      });
      return tx.checkoutSession.update({
        where: { id: checkout.id },
        data: { status: 'EXPIRED' },
      });
    });
    await this.notifications.syncCheckoutStockAlerts(
      result.merchantId,
      result.id,
    );
    return result;
  }

  async updateStatus(
    merchantId: string,
    orderId: string,
    userId: string,
    dto: UpdateOrderStatusDto,
    metadata: AuditMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, merchantId, orderId);
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === dto.status) return this.findOne(merchantId, orderId);
      if (!isOrderStatusTransitionAllowed(order.status, dto.status)) {
        throw new ConflictException(
          `Cannot transition order from ${order.status} to ${dto.status}`,
        );
      }
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: dto.status,
          fulfillmentStatus:
            dto.status === 'PROCESSING'
              ? 'PROCESSING'
              : dto.status === 'FULFILLED' || dto.status === 'COMPLETED'
                ? 'FULFILLED'
                : order.fulfillmentStatus,
          ...(dto.status === 'FULFILLED' || dto.status === 'COMPLETED'
            ? { fulfilledAt: order.fulfilledAt ?? new Date() }
            : {}),
        },
        include: { items: true },
      });
      await this.writeOrderAudit(
        tx,
        merchantId,
        userId,
        order.id,
        'order.status_updated',
        { status: order.status },
        {
          status: updated.status,
          fulfillmentStatus: updated.fulfillmentStatus,
        },
        metadata,
      );
      return updated;
    });
    return result;
  }

  async cancel(
    merchantId: string,
    orderId: string,
    userId: string,
    metadata: AuditMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        select: { checkoutSessionId: true },
      });
      if (!candidate) throw new NotFoundException('Order not found');
      await this.lockCheckout(tx, candidate.checkoutSessionId);
      await this.lockOrder(tx, merchantId, orderId);
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'CANCELLED') return order;
      if (order.paymentStatus === 'PAID' || order.status === 'PAID') {
        throw new ConflictException('Paid order must use the refund flow');
      }
      if (['REFUNDED', 'COMPLETED', 'FULFILLED'].includes(order.status)) {
        throw new ConflictException(`Cannot cancel a ${order.status} order`);
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: order.id },
        orderBy: { inventoryStockId: 'asc' },
      });
      await this.releaseReservations(
        tx,
        merchantId,
        reservations,
        'RELEASED',
        userId,
        metadata,
      );
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          fulfillmentStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: { items: true },
      });
      await tx.checkoutSession.update({
        where: { id: order.checkoutSessionId },
        data: { status: 'CANCELLED' },
      });
      await this.writeOrderAudit(
        tx,
        merchantId,
        userId,
        order.id,
        'order.cancelled',
        { status: order.status },
        { status: updated.status },
        metadata,
      );
      return updated;
    });
    await this.notifications.syncOrderStockAlerts(merchantId, orderId);
    return result;
  }

  async refund(
    merchantId: string,
    orderId: string,
    userId: string,
    dto: RefundOrderDto,
    metadata: AuditMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, merchantId, orderId);
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        include: { items: true, merchant: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'REFUNDED') return order;
      if (order.paymentStatus !== 'PAID') {
        throw new ConflictException('Only a paid order can be refunded');
      }

      const returnStock = dto.returnStock ?? order.merchant.returnStockOnRefund;
      if (returnStock) {
        const reservations = await tx.inventoryReservation.findMany({
          where: { orderId: order.id, status: 'CONFIRMED' },
          orderBy: { inventoryStockId: 'asc' },
        });
        for (const reservation of reservations) {
          const stock = await this.lockStock(
            tx,
            merchantId,
            reservation.inventoryStockId,
          );
          if (stock.soldStock < reservation.quantity) {
            throw new ConflictException('Inventory sold balance is invalid');
          }
          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: { soldStock: { decrement: reservation.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              merchantId,
              inventoryStockId: stock.id,
              productId: stock.productId,
              variantId: stock.variantId,
              type: 'REFUND_RETURN',
              quantity: reservation.quantity,
              referenceId: order.id,
              referenceType: 'order_refund',
              createdById: userId,
            },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          refundedAt: new Date(),
        },
        include: { items: true },
      });
      await this.writeOrderAudit(
        tx,
        merchantId,
        userId,
        order.id,
        'order.refunded',
        { status: order.status, paymentStatus: order.paymentStatus },
        {
          status: updated.status,
          paymentStatus: updated.paymentStatus,
          returnStock,
        },
        metadata,
      );
      return updated;
    });
    await this.notifications.syncOrderStockAlerts(merchantId, orderId);
    return result;
  }

  private async releaseReservations(
    tx: Prisma.TransactionClient,
    merchantId: string,
    reservations: Array<{
      id: string;
      inventoryStockId: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      status: string;
    }>,
    nextStatus: 'RELEASED' | 'EXPIRED',
    userId: string | null,
    metadata: AuditMetadata,
  ) {
    for (const reservation of reservations) {
      if (reservation.status !== 'ACTIVE') continue;
      const stock = await this.lockStock(
        tx,
        merchantId,
        reservation.inventoryStockId,
      );
      if (stock.reservedStock < reservation.quantity) {
        throw new ConflictException('Inventory reservation balance is invalid');
      }
      const changed = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: 'ACTIVE' },
        data: { status: nextStatus },
      });
      if (!changed.count) continue;
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { reservedStock: { decrement: reservation.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          merchantId,
          inventoryStockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          type: 'RESERVATION_RELEASED',
          quantity: -reservation.quantity,
          referenceId: reservation.id,
          referenceType:
            nextStatus === 'EXPIRED'
              ? 'expired_inventory_reservation'
              : 'inventory_reservation',
          createdById: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action:
            nextStatus === 'EXPIRED'
              ? 'inventory.expired'
              : 'inventory.released',
          entityType: 'inventory_reservation',
          entityId: reservation.id,
          before: { status: reservation.status },
          after: { status: nextStatus },
          ...metadata,
        },
      });
    }
  }

  private async writeOrderAudit(
    tx: Prisma.TransactionClient,
    merchantId: string,
    userId: string,
    orderId: string,
    action: string,
    before: Prisma.InputJsonValue,
    after: Prisma.InputJsonValue,
    metadata: AuditMetadata,
  ) {
    await tx.auditLog.create({
      data: {
        merchantId,
        userId,
        action,
        entityType: 'order',
        entityId: orderId,
        before,
        after,
        ...metadata,
      },
    });
  }

  private async lockCheckout(
    tx: Prisma.TransactionClient,
    checkoutSessionId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "checkout_sessions"
      WHERE "id" = CAST(${checkoutSessionId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Checkout session not found');
  }

  private async lockOrder(
    tx: Prisma.TransactionClient,
    merchantId: string,
    orderId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "orders"
      WHERE "id" = CAST(${orderId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Order not found');
  }

  private async lockStock(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockId: string,
  ) {
    const rows = await tx.$queryRaw<LockedStock[]>(Prisma.sql`
      SELECT *
      FROM "inventory_stocks"
      WHERE "id" = CAST(${stockId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Inventory stock not found');
    return rows[0];
  }

  private orderNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `ORD-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }
}
