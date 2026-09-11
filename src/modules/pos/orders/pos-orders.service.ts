import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { OutboxService } from '#app/infrastructure/rabbitmq/outbox.service';
import { calculateAvailableStock } from '#app/modules/inventory/inventory-calculation';
import { InventoryService } from '#app/modules/inventory/inventory.service';
import { OrderService } from '#app/modules/order/order.service';
import {
  CartPricingService,
  PricedCartItem,
} from '#app/modules/pricing/cart-pricing.service';
import { PosDevicesService } from '../devices/devices.service';
import { PosShiftsService } from '../shifts/shifts.service';
import {
  CancelPosOrderDto,
  CreatePosOrderDto,
  PosOrderQueryDto,
  UpdatePosOrderDto,
} from './dto/pos-order-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

/**
 * POS orders stay open (unpaid, editable, sendable to kitchen) far longer
 * than a storefront checkout session ever does, so the underlying
 * CheckoutSession/InventoryReservation hold uses a generous window instead
 * of the 15-minute default used for a one-shot storefront/legacy POS sale.
 */
const POS_ORDER_HOLD_MS = 6 * 60 * 60 * 1000;

const orderItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  sku: true,
  name: true,
  quantity: true,
  sentToKitchenQuantity: true,
  preparedQuantity: true,
  cancelledQuantity: true,
  unitPrice: true,
  totalPrice: true,
} as const;

@Injectable()
export class PosOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: CartPricingService,
    private readonly inventory: InventoryService,
    private readonly orders: OrderService,
    private readonly devices: PosDevicesService,
    private readonly shifts: PosShiftsService,
    private readonly outbox: OutboxService,
  ) {}

  async create(
    merchantId: string,
    userId: string,
    dto: CreatePosOrderDto,
    metadata: AuditMetadata,
  ) {
    const device = await this.devices.requireActiveDevice(
      merchantId,
      dto.deviceId,
    );
    const shift = await this.shifts.current(merchantId, dto.deviceId);
    if (dto.tableId) {
      await this.requireTable(merchantId, device.branchId, dto.tableId);
    }

    const {
      items: pricedItems,
      currency,
      subtotal,
    } = await this.pricing.buildPricedItems(
      merchantId,
      SalesChannel.POS,
      dto.items,
    );
    const discountAmount = new Prisma.Decimal(dto.discountAmount ?? 0);
    const totalAmount = this.maxZero(subtotal.sub(discountAmount));

    const checkoutSessionId = randomUUID();
    const expiresAt = new Date(Date.now() + POS_ORDER_HOLD_MS);
    await this.prisma.$transaction(async (tx) => {
      await tx.checkoutSession.create({
        data: {
          id: checkoutSessionId,
          merchantId,
          branchId: device.branchId,
          posDeviceId: device.id,
          customerId: dto.customerId,
          customerName: dto.customerName?.trim() || 'Walk-in customer',
          sourceChannel: SalesChannel.POS,
          accessTokenHash: this.hashToken(
            randomBytes(32).toString('base64url'),
          ),
          subtotalAmount: subtotal,
          discountAmount,
          feeAmount: new Prisma.Decimal(0),
          totalAmount,
          currency,
          expiresAt,
          items: { create: pricedItems },
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'pos.checkout.created',
          entityType: 'checkout_session',
          entityId: checkoutSessionId,
          after: {
            branchId: device.branchId,
            deviceId: device.deviceId,
            itemCount: pricedItems.length,
            totalAmount: totalAmount.toString(),
          },
          ...metadata,
        },
      });
    });

    try {
      await this.inventory.reserveCheckout(
        merchantId,
        userId,
        checkoutSessionId,
        SalesChannel.POS,
        pricedItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        expiresAt,
        metadata,
      );
    } catch (error) {
      await this.prisma.checkoutSession.delete({
        where: { id: checkoutSessionId },
      });
      throw error;
    }

    const order = await this.orders.confirmCheckout(
      checkoutSessionId,
      metadata,
      {
        branchId: device.branchId,
        posDeviceId: device.id,
        posShiftId: shift.id,
        tableId: dto.tableId,
        localId: dto.localId,
      },
    );
    if (!order) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        'Unable to create POS order',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        after: { orderNumber: order.orderNumber, branchId: device.branchId },
        ...metadata,
      },
    });
    await this.outbox.write(this.prisma, {
      aggregateType: 'order',
      aggregateId: order.id,
      eventType: 'order.updated',
      merchantId,
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: device.branchId,
        status: order.status,
      },
    });

    return this.findOne(merchantId, order.id);
  }

  async findAll(merchantId: string, query: PosOrderQueryDto) {
    const where: Prisma.OrderWhereInput = {
      merchantId,
      posDeviceId: { not: null },
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...((query.dateFrom ?? query.dateTo)
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: this.endOfDay(query.dateTo) } : {}),
            },
          }
        : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: { select: orderItemSelect } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return new PaginatedResult(
      orders.map((order) => this.toOrderView(order)),
      query.take,
      query.page ?? 1,
      total,
    );
  }

  async findOne(merchantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
      include: {
        items: { select: orderItemSelect },
        payments: true,
        kitchenOrders: { include: { items: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.toOrderView(order);
  }

  async update(
    merchantId: string,
    userId: string,
    orderId: string,
    dto: UpdatePosOrderDto,
    metadata: AuditMetadata,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['PENDING_PAYMENT', 'PAID'].includes(order.status)) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        `Cannot modify a ${order.status} order`,
        HttpStatus.CONFLICT,
      );
    }

    const { items: pricedItems } = await this.pricing.buildPricedItems(
      merchantId,
      SalesChannel.POS,
      dto.items,
    );

    const targetKey = (p: { productId: string; variantId?: string | null }) =>
      p.variantId ? `variant:${p.variantId}` : `product:${p.productId}`;
    const newByTarget = new Map(
      pricedItems.map((item) => [targetKey(item), item]),
    );
    const existingByTarget = new Map(
      order.items.map((item) => [targetKey(item), item]),
    );

    const increases: {
      item: (typeof order.items)[number];
      priced: PricedCartItem;
    }[] = [];
    const decreases: {
      item: (typeof order.items)[number];
      newQuantity: number;
    }[] = [];
    const additions: PricedCartItem[] = [];

    for (const [key, priced] of newByTarget) {
      const existing = existingByTarget.get(key);
      if (!existing) {
        additions.push(priced);
        continue;
      }
      if (priced.quantity > existing.quantity) {
        increases.push({ item: existing, priced });
      } else if (priced.quantity < existing.quantity) {
        decreases.push({ item: existing, newQuantity: priced.quantity });
      }
    }
    for (const [key, existing] of existingByTarget) {
      if (!newByTarget.has(key))
        decreases.push({ item: existing, newQuantity: 0 });
    }

    for (const { item, newQuantity } of decreases) {
      if (newQuantity < item.sentToKitchenQuantity) {
        throw new PosDomainException(
          'INVALID_ORDER_STATE',
          `Cannot reduce ${item.name} below the quantity already sent to kitchen (${item.sentToKitchenQuantity.toString()})`,
          HttpStatus.CONFLICT,
          { orderItemId: item.id },
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { item, priced } of increases) {
        await this.adjustReservedQuantity(
          tx,
          merchantId,
          userId,
          order.id,
          item,
          priced.quantity - item.quantity,
          metadata,
        );
      }
      for (const { item, newQuantity } of decreases) {
        await this.adjustReservedQuantity(
          tx,
          merchantId,
          userId,
          order.id,
          item,
          newQuantity - item.quantity,
          metadata,
        );
      }
    });

    if (additions.length) {
      await this.inventory.reserveCheckout(
        merchantId,
        userId,
        order.checkoutSessionId,
        SalesChannel.POS,
        additions.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        new Date(Date.now() + POS_ORDER_HOLD_MS),
        metadata,
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.inventoryReservation.updateMany({
          where: {
            checkoutSessionId: order.checkoutSessionId,
            orderId: null,
            status: 'ACTIVE',
          },
          data: { orderId: order.id },
        });
        await tx.orderItem.createMany({
          data: additions.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        });
      });
    }

    await this.recomputeOrderTotals(merchantId, order.id);
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'ORDER_UPDATED',
        entityType: 'order',
        entityId: order.id,
        after: {
          additions: additions.length,
          increases: increases.length,
          decreases: decreases.length,
        },
        ...metadata,
      },
    });
    await this.outbox.write(this.prisma, {
      aggregateType: 'order',
      aggregateId: order.id,
      eventType: 'order.updated',
      merchantId,
      payload: { orderId: order.id },
    });

    return this.findOne(merchantId, order.id);
  }

  async cancel(
    merchantId: string,
    userId: string,
    orderId: string,
    dto: CancelPosOrderDto,
    metadata: AuditMetadata,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') return this.findOne(merchantId, orderId);
    if (order.paymentStatus === 'PAID' || order.status === 'PAID') {
      throw new PosDomainException(
        'INVALID_PAYMENT_STATE',
        'A paid order must be refunded, not cancelled',
        HttpStatus.CONFLICT,
      );
    }
    if (['REFUNDED', 'COMPLETED', 'FULFILLED'].includes(order.status)) {
      throw new PosDomainException(
        'ORDER_ALREADY_CANCELLED',
        `Cannot cancel a ${order.status} order`,
        HttpStatus.CONFLICT,
      );
    }

    await this.orders.cancel(merchantId, orderId, userId, metadata);
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'ORDER_CANCELLED',
        entityType: 'order',
        entityId: orderId,
        after: { reason: dto.reason },
        ...metadata,
      },
    });
    await this.outbox.write(this.prisma, {
      aggregateType: 'order',
      aggregateId: orderId,
      eventType: 'order.updated',
      merchantId,
      payload: { orderId, status: 'CANCELLED' },
    });

    return this.findOne(merchantId, orderId);
  }

  async assignTable(
    merchantId: string,
    userId: string,
    orderId: string,
    tableId: string,
    metadata: AuditMetadata,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.branchId) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        'Order has no branch context',
        HttpStatus.CONFLICT,
      );
    }
    await this.requireTable(merchantId, order.branchId, tableId);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { tableId },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'pos.order.table_assigned',
        entityType: 'order',
        entityId: orderId,
        after: { tableId },
        ...metadata,
      },
    });
    return this.findOne(merchantId, orderId);
  }

  /**
   * Adjusts an existing ACTIVE inventory reservation's quantity by `delta`
   * (positive to hold more stock, negative to release some) for an order
   * that hasn't been paid/confirmed yet. Mirrors the lock-then-adjust idiom
   * used throughout `OrderService`/`InventoryService`, but operates on a
   * single already-linked reservation rather than the reserve/confirm/
   * release two-phase flow, since a POS order in progress is neither.
   */
  private async adjustReservedQuantity(
    tx: Prisma.TransactionClient,
    merchantId: string,
    userId: string,
    orderId: string,
    item: {
      id: string;
      productId: string;
      variantId: string | null;
      unitPrice: Prisma.Decimal;
    },
    delta: number,
    metadata: AuditMetadata,
  ) {
    if (delta === 0) return;

    const reservation = await tx.inventoryReservation.findFirst({
      where: {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        status: 'ACTIVE',
      },
    });
    if (!reservation) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        'No active stock reservation found for this order item',
        HttpStatus.CONFLICT,
        { orderItemId: item.id },
      );
    }

    const stockRows = await tx.$queryRaw<
      Array<{
        id: string;
        productId: string;
        variantId: string | null;
        totalStock: number;
        reservedStock: number;
        soldStock: number;
      }>
    >(Prisma.sql`
      SELECT "id", "productId", "variantId", "totalStock", "reservedStock", "soldStock"
      FROM "inventory_stocks"
      WHERE "id" = CAST(${reservation.inventoryStockId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    const stock = stockRows[0];
    if (!stock) throw new NotFoundException('Inventory stock not found');

    if (delta > 0) {
      const available = calculateAvailableStock(stock);
      if (delta > available) {
        throw new PosDomainException(
          'INSUFFICIENT_STOCK',
          `Not enough stock for ${item.productId}`,
          HttpStatus.CONFLICT,
          { productId: item.productId, available, requested: delta },
        );
      }
    }

    const newReservedQuantity = reservation.quantity + delta;
    if (newReservedQuantity <= 0) {
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' },
      });
      await tx.orderItem.delete({ where: { id: item.id } });
    } else {
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { quantity: newReservedQuantity },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: newReservedQuantity,
          totalPrice: item.unitPrice.mul(newReservedQuantity),
        },
      });
    }

    await tx.inventoryStock.update({
      where: { id: stock.id },
      data: { reservedStock: { increment: delta } },
    });
    await tx.inventoryMovement.create({
      data: {
        merchantId,
        inventoryStockId: stock.id,
        productId: stock.productId,
        variantId: stock.variantId,
        type: delta > 0 ? 'RESERVED' : 'RESERVATION_RELEASED',
        quantity: delta,
        referenceId: orderId,
        referenceType: 'pos_order_update',
        createdById: userId,
      },
    });
    await tx.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'inventory.adjusted',
        entityType: 'inventory_reservation',
        entityId: reservation.id,
        after: { delta, newQuantity: Math.max(0, newReservedQuantity) },
        ...metadata,
      },
    });
  }

  private async recomputeOrderTotals(merchantId: string, orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const totalAmount = this.maxZero(
      subtotal.sub(order.discountAmount).add(order.feeAmount),
    );
    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotalAmount: subtotal, totalAmount },
    });
  }

  private async requireTable(
    merchantId: string,
    branchId: string,
    tableId: string,
  ) {
    const table = await this.prisma.posTable.findFirst({
      where: { id: tableId, merchantId, branchId, deletedAt: null },
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  private toOrderView<
    T extends {
      id: string;
      localId: string | null;
      orderNumber: string;
      status: string;
      fulfillmentStatus: string;
      paymentStatus: string;
      tableId: string | null;
      subtotalAmount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      feeAmount: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
      items: Array<{
        id: string;
        productId: string;
        variantId: string | null;
        sku: string;
        name: string;
        quantity: number;
        sentToKitchenQuantity: number;
        preparedQuantity: number;
        cancelledQuantity: number;
        unitPrice: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
      }>;
      payments?: Array<{ amount: Prisma.Decimal; status: string }>;
    },
  >(order: T) {
    const paid = (order.payments ?? [])
      .filter((payment) => payment.status === 'CONFIRMED')
      .reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
    const remaining = this.maxZero(order.totalAmount.sub(paid));

    return {
      id: order.id,
      localId: order.localId,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      tableId: order.tableId,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        name: item.name,
        orderedQuantity: item.quantity,
        sentToKitchenQuantity: item.sentToKitchenQuantity,
        preparedQuantity: item.preparedQuantity,
        cancelledQuantity: item.cancelledQuantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      totals: {
        subtotal: order.subtotalAmount.toString(),
        discount: order.discountAmount.toString(),
        tax: order.feeAmount.toString(),
        total: order.totalAmount.toString(),
        paid: paid.toString(),
        remaining: remaining.toString(),
      },
    };
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private maxZero(value: Prisma.Decimal) {
    return value.lt(0) ? new Prisma.Decimal(0) : value;
  }
}
