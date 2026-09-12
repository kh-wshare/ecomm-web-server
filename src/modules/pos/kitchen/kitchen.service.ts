import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { KitchenOrderStatus } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { OutboxService } from '#app/infrastructure/rabbitmq/outbox.service';
import { KitchenOrderQueryDto } from './dto/kitchen-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

const NEXT_STATUSES: Record<KitchenOrderStatus, KitchenOrderStatus[]> = {
  PENDING: [KitchenOrderStatus.ACCEPTED, KitchenOrderStatus.CANCELLED],
  ACCEPTED: [KitchenOrderStatus.PREPARING, KitchenOrderStatus.CANCELLED],
  PREPARING: [KitchenOrderStatus.READY, KitchenOrderStatus.CANCELLED],
  READY: [KitchenOrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async sendToKitchen(
    merchantId: string,
    userId: string,
    orderId: string,
    metadata: AuditMetadata,
  ) {
    const kitchenOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (!['PENDING_PAYMENT', 'PAID'].includes(order.status)) {
        throw new PosDomainException(
          'INVALID_ORDER_STATE',
          `Cannot send a ${order.status} order to the kitchen`,
          HttpStatus.CONFLICT,
        );
      }
      if (!order.branchId) {
        throw new PosDomainException(
          'INVALID_ORDER_STATE',
          'Order has no branch context and cannot be sent to the kitchen',
          HttpStatus.CONFLICT,
        );
      }

      const pending = order.items
        .map((item) => ({
          item,
          delta: item.quantity - item.sentToKitchenQuantity,
        }))
        .filter(({ delta }) => delta > 0);
      if (!pending.length) return null;

      const created = await tx.kitchenOrder.create({
        data: {
          merchantId,
          branchId: order.branchId,
          orderId: order.id,
          posShiftId: order.posShiftId,
          tableId: order.tableId,
          sentById: userId,
          status: KitchenOrderStatus.PENDING,
          items: {
            create: pending.map(({ item, delta }) => ({
              orderItemId: item.id,
              quantity: delta,
              status: KitchenOrderStatus.PENDING,
            })),
          },
        },
        include: { items: true },
      });

      for (const { item, delta } of pending) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { sentToKitchenQuantity: { increment: delta } },
        });
      }

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'ORDER_SENT_TO_KITCHEN',
          entityType: 'kitchen_order',
          entityId: created.id,
          after: { orderId: order.id, itemCount: pending.length },
          ...metadata,
        },
      });
      await this.outbox.write(tx, {
        aggregateType: 'kitchen_order',
        aggregateId: created.id,
        eventType: 'order.kitchen.created',
        merchantId,
        payload: {
          orderId: order.id,
          kitchenOrderId: created.id,
          branchId: order.branchId,
          items: created.items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      });

      return created;
    });

    if (!kitchenOrder) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        'No new items to send to the kitchen',
        HttpStatus.CONFLICT,
      );
    }
    return this.findOne(merchantId, kitchenOrder.id);
  }

  async findAll(merchantId: string, query: KitchenOrderQueryDto) {
    const where: Prisma.KitchenOrderWhereInput = {
      merchantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.kitchenOrder.findMany({
        where,
        include: { items: true, order: { select: { orderNumber: true } } },
        orderBy: { sentAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.kitchenOrder.count({ where }),
    ]);
    return new PaginatedResult(rows, query.take, query.page ?? 1, total);
  }

  async findOne(merchantId: string, kitchenOrderId: string) {
    const kitchenOrder = await this.prisma.kitchenOrder.findFirst({
      where: { id: kitchenOrderId, merchantId },
      include: { items: true, order: { select: { orderNumber: true } } },
    });
    if (!kitchenOrder) throw new NotFoundException('Kitchen order not found');
    return kitchenOrder;
  }

  async updateStatus(
    merchantId: string,
    userId: string,
    kitchenOrderId: string,
    status: KitchenOrderStatus,
    metadata: AuditMetadata,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const kitchenOrder = await tx.kitchenOrder.findFirst({
        where: { id: kitchenOrderId, merchantId },
        include: { items: true },
      });
      if (!kitchenOrder) throw new NotFoundException('Kitchen order not found');
      if (kitchenOrder.status === status) return kitchenOrder;
      if (!NEXT_STATUSES[kitchenOrder.status].includes(status)) {
        throw new PosDomainException(
          'INVALID_ORDER_STATE',
          `Cannot transition kitchen order from ${kitchenOrder.status} to ${status}`,
          HttpStatus.CONFLICT,
        );
      }

      const timestampField =
        status === KitchenOrderStatus.ACCEPTED
          ? { acceptedAt: new Date() }
          : status === KitchenOrderStatus.READY
            ? { readyAt: new Date() }
            : status === KitchenOrderStatus.COMPLETED
              ? { completedAt: new Date() }
              : {};

      const updated = await tx.kitchenOrder.update({
        where: { id: kitchenOrder.id },
        data: { status, ...timestampField },
        include: { items: true },
      });
      await tx.kitchenOrderItem.updateMany({
        where: { kitchenOrderId: kitchenOrder.id },
        data: { status },
      });

      if (status === KitchenOrderStatus.READY) {
        for (const item of kitchenOrder.items) {
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: { preparedQuantity: { increment: item.quantity } },
          });
        }
      } else if (status === KitchenOrderStatus.CANCELLED) {
        for (const item of kitchenOrder.items) {
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: { cancelledQuantity: { increment: item.quantity } },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'pos.kitchen.status_updated',
          entityType: 'kitchen_order',
          entityId: kitchenOrder.id,
          before: { status: kitchenOrder.status },
          after: { status },
          ...metadata,
        },
      });
      await this.outbox.write(tx, {
        aggregateType: 'kitchen_order',
        aggregateId: kitchenOrder.id,
        eventType: 'kitchen.updated',
        merchantId,
        payload: {
          kitchenOrderId: kitchenOrder.id,
          orderId: kitchenOrder.orderId,
          branchId: kitchenOrder.branchId,
          status,
        },
      });

      return updated;
    });
    return result;
  }
}
