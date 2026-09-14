import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { FulfillmentStatus, ShipmentStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AddressSnapshot, toAddressSnapshot } from './address-snapshot';
import {
  CreateShipmentDto,
  ShipmentQueryDto,
  UpdateShipmentDto,
  UpdateShipmentStatusDto,
} from './dto/shipment-input.dto';
import {
  isShipmentStatusTransitionAllowed,
  isTerminalShipmentStatus,
} from './shipment-status';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

const shipmentInclude = {
  items: {
    select: {
      id: true,
      orderItemId: true,
      quantity: true,
      orderItem: { select: { sku: true, name: true, quantity: true } },
    },
  },
  events: {
    orderBy: { occurredAt: 'asc' },
    select: {
      id: true,
      status: true,
      message: true,
      location: true,
      occurredAt: true,
    },
  },
} as const satisfies Prisma.ShipmentInclude;

/** Statuses that mean the goods are no longer with the merchant. */
const SHIPPED_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
];

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(merchantId: string, query: ShipmentQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ShipmentWhereInput = {
      merchantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(search
        ? {
            OR: [
              { shipmentNumber: { contains: search, mode: 'insensitive' } },
              { trackingNumber: { contains: search, mode: 'insensitive' } },
              {
                order: {
                  orderNumber: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [shipments, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        include: shipmentInclude,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return new PaginatedResult(shipments, query.take, query.page ?? 1, total);
  }

  async findOne(merchantId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, merchantId },
      include: shipmentInclude,
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  /**
   * Creates a shipment against an order. Quantities are capped at what is
   * still unshipped (order quantity minus already-shipped units on
   * non-cancelled shipments), so splitting an order across several parcels can
   * never ship more than was ordered.
   */
  async create(
    merchantId: string,
    userId: string,
    orderId: string,
    dto: CreateShipmentDto,
    metadata: AuditMetadata,
  ) {
    const shipment = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'CANCELLED' || order.status === 'EXPIRED') {
        throw new ConflictException(
          `Cannot ship an order that is ${order.status.toLowerCase()}`,
        );
      }

      const remaining = await this.remainingByOrderItem(tx, order.id);
      const requested =
        dto.items ??
        order.items
          .map((item) => ({
            orderItemId: item.id,
            quantity: remaining.get(item.id) ?? 0,
          }))
          .filter((item) => item.quantity > 0);
      if (requested.length === 0) {
        throw new ConflictException(
          'Every item on this order is already shipped',
        );
      }

      const orderItemIds = new Set(order.items.map((item) => item.id));
      for (const item of requested) {
        if (!orderItemIds.has(item.orderItemId)) {
          throw new BadRequestException(
            `Order item ${item.orderItemId} does not belong to this order`,
          );
        }
        const left = remaining.get(item.orderItemId) ?? 0;
        if (item.quantity > left) {
          throw new ConflictException(
            `Only ${left} unit(s) of order item ${item.orderItemId} remain unshipped`,
          );
        }
      }

      // Normalized through the same helper the order snapshot went through, so
      // a shipment address the merchant typed by hand and one inherited from
      // the order are stored identically.
      const address = dto.address
        ? toAddressSnapshot(dto.address)
        : ((order.shippingAddress as AddressSnapshot | null) ?? null);
      const created = await tx.shipment.create({
        data: {
          merchantId,
          orderId: order.id,
          deliveryMethodId: dto.deliveryMethodId ?? order.deliveryMethodId,
          shipmentNumber: this.shipmentNumber(),
          status: ShipmentStatus.PENDING,
          carrierName: this.optional(dto.carrierName),
          trackingNumber: this.optional(dto.trackingNumber),
          trackingUrl: this.optional(dto.trackingUrl),
          recipientName: address?.recipientName ?? order.customerName,
          phone: address?.phone ?? order.customerPhone,
          address: address ?? Prisma.DbNull,
          shippingCost: order.shippingAmount,
          note: this.optional(dto.note),
          items: {
            create: requested.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
            })),
          },
          events: {
            create: {
              status: ShipmentStatus.PENDING,
              message: 'Shipment created',
              createdById: userId,
            },
          },
        },
        include: shipmentInclude,
      });

      await this.syncOrderFulfillment(tx, order.id);
      await this.audit(tx, {
        action: 'shipment.created',
        after: {
          orderId: order.id,
          shipmentNumber: created.shipmentNumber,
          itemCount: requested.length,
        },
        entityId: created.id,
        merchantId,
        metadata,
        userId,
      });
      return created;
    });
    return shipment;
  }

  async update(
    merchantId: string,
    userId: string,
    shipmentId: string,
    dto: UpdateShipmentDto,
    metadata: AuditMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.shipment.findFirst({
        where: { id: shipmentId, merchantId },
        select: { id: true, status: true, trackingNumber: true },
      });
      if (!before) throw new NotFoundException('Shipment not found');
      if (isTerminalShipmentStatus(before.status)) {
        throw new ConflictException(
          `Shipment is ${before.status.toLowerCase()} and can no longer be edited`,
        );
      }

      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          ...(dto.carrierName !== undefined
            ? { carrierName: this.optional(dto.carrierName) }
            : {}),
          ...(dto.trackingNumber !== undefined
            ? { trackingNumber: this.optional(dto.trackingNumber) }
            : {}),
          ...(dto.trackingUrl !== undefined
            ? { trackingUrl: this.optional(dto.trackingUrl) }
            : {}),
          ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
          ...(dto.address
            ? this.addressFields(toAddressSnapshot(dto.address))
            : {}),
        },
        include: shipmentInclude,
      });
      await this.audit(tx, {
        action: 'shipment.updated',
        after: { trackingNumber: updated.trackingNumber },
        before: { trackingNumber: before.trackingNumber },
        entityId: shipmentId,
        merchantId,
        metadata,
        userId,
      });
      return updated;
    });
  }

  /**
   * Moves a shipment along its lifecycle, appends a tracking event, and rolls
   * the parent order's `fulfillmentStatus` up from all of its shipments — the
   * order is only FULFILLED once every ordered unit has been delivered.
   */
  async updateStatus(
    merchantId: string,
    userId: string,
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
    metadata: AuditMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.shipment.findFirst({
        where: { id: shipmentId, merchantId },
        select: { id: true, orderId: true, status: true },
      });
      if (!before) throw new NotFoundException('Shipment not found');
      if (!isShipmentStatusTransitionAllowed(before.status, dto.status)) {
        throw new ConflictException(
          `Cannot move a shipment from ${before.status} to ${dto.status}`,
        );
      }

      const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: dto.status,
          ...(SHIPPED_STATUSES.includes(dto.status)
            ? { shippedAt: occurredAt }
            : {}),
          ...(dto.status === ShipmentStatus.DELIVERED
            ? { deliveredAt: occurredAt }
            : {}),
          ...(dto.status === ShipmentStatus.CANCELLED
            ? { cancelledAt: occurredAt }
            : {}),
          events: {
            create: {
              status: dto.status,
              message: this.optional(dto.message),
              location: this.optional(dto.location),
              occurredAt,
              createdById: userId,
            },
          },
        },
        include: shipmentInclude,
      });

      await this.syncOrderFulfillment(tx, before.orderId);
      await this.audit(tx, {
        action: 'shipment.status_changed',
        after: { status: dto.status },
        before: { status: before.status },
        entityId: shipmentId,
        merchantId,
        metadata,
        userId,
      });
      return updated;
    });
  }

  /** Public tracking view: no merchant scope, read-only, no internal notes. */
  async findForOrder(merchantId: string, orderId: string) {
    return this.prisma.shipment.findMany({
      where: { merchantId, orderId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        shipmentNumber: true,
        status: true,
        carrierName: true,
        trackingNumber: true,
        trackingUrl: true,
        shippedAt: true,
        deliveredAt: true,
        createdAt: true,
        deliveryMethod: { select: { name: true, type: true } },
        items: {
          select: {
            quantity: true,
            orderItem: { select: { sku: true, name: true } },
          },
        },
        events: {
          orderBy: { occurredAt: 'asc' },
          select: {
            status: true,
            message: true,
            location: true,
            occurredAt: true,
          },
        },
      },
    });
  }

  /**
   * How many units of each order item are not yet covered by a live shipment.
   * Cancelled shipments release their units back so a failed parcel can be
   * re-shipped.
   */
  private async remainingByOrderItem(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { id: true, quantity: true, cancelledQuantity: true },
    });
    const shipped = await tx.shipmentItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItem: { orderId },
        shipment: { status: { not: ShipmentStatus.CANCELLED } },
      },
      _sum: { quantity: true },
    });
    const shippedById = new Map(
      shipped.map((row) => [row.orderItemId, row._sum.quantity ?? 0]),
    );
    return new Map(
      items.map((item) => [
        item.id,
        Math.max(
          0,
          item.quantity -
            item.cancelledQuantity -
            (shippedById.get(item.id) ?? 0),
        ),
      ]),
    );
  }

  /**
   * Derives the order's fulfillment status from its shipments rather than
   * letting each status change set it directly — with split shipments, only
   * the aggregate can tell PROCESSING from FULFILLED.
   */
  private async syncOrderFulfillment(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const [items, shipments] = await Promise.all([
      tx.orderItem.findMany({
        where: { orderId },
        select: { id: true, quantity: true, cancelledQuantity: true },
      }),
      tx.shipment.findMany({
        where: { orderId },
        select: {
          status: true,
          items: { select: { orderItemId: true, quantity: true } },
        },
      }),
    ]);

    const live = shipments.filter(
      (shipment) => shipment.status !== ShipmentStatus.CANCELLED,
    );
    if (live.length === 0) {
      await tx.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: FulfillmentStatus.UNFULFILLED },
      });
      return;
    }

    const orderedUnits = items.reduce(
      (total, item) => total + item.quantity - item.cancelledQuantity,
      0,
    );
    const deliveredUnits = live
      .filter((shipment) => shipment.status === ShipmentStatus.DELIVERED)
      .reduce(
        (total, shipment) =>
          total + shipment.items.reduce((sum, item) => sum + item.quantity, 0),
        0,
      );

    const fulfilled = orderedUnits > 0 && deliveredUnits >= orderedUnits;
    await tx.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: fulfilled
          ? FulfillmentStatus.FULFILLED
          : FulfillmentStatus.PROCESSING,
        ...(fulfilled ? { fulfilledAt: new Date() } : { fulfilledAt: null }),
      },
    });
  }

  private addressFields(address: AddressSnapshot) {
    return {
      address,
      recipientName: address.recipientName,
      phone: address.phone,
    };
  }

  /** Same shape as `OrderService.orderNumber()` so the two read alike. */
  private shipmentNumber() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `SHP-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private optional(value?: string | null) {
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
        entityType: 'shipment',
        merchantId: input.merchantId,
        userId: input.userId,
        ...input.metadata,
      },
    });
  }
}
