import { ConflictException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import {
  OrderStatus,
  PaymentStatus,
  PaymentTransactionStatus,
  ShipmentStatus,
} from '#app/generated/prisma/enums';

/**
 * Status rules shared by every service that moves an order: storefront
 * checkout, online payments, POS payments, the reservation sweeper and
 * shipments. Each used to carry its own copy of these rules, and the copies had
 * drifted — see docs/order-payment-fulfillment-review.md.
 */

/** An order in one of these states has taken no money and can be cancelled. */
const CANCELLABLE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.DRAFT,
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.RESERVED,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.EXPIRED,
]);
const CANCELLABLE_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.PENDING,
  PaymentStatus.FAILED,
]);

/** Payment attempts that may still turn into money. */
export const OPEN_PAYMENT_STATUSES = [
  PaymentTransactionStatus.PENDING,
  PaymentTransactionStatus.PROCESSING,
];

/**
 * Payments whose money was received. A refunded payment still counts: the
 * refund is recorded separately, so "was the order paid for" and "was the
 * money given back" stay two different questions.
 */
export const RECEIVED_PAYMENT_STATUSES = [
  PaymentTransactionStatus.CONFIRMED,
  PaymentTransactionStatus.REFUNDED,
];

/** Shipment states that no longer hold any of the order's units. */
export const RELEASED_SHIPMENT_STATUSES = [
  ShipmentStatus.CANCELLED,
  ShipmentStatus.RETURNED,
];

/** Shipments that can still be called off without a return. */
const UNSHIPPED_SHIPMENT_STATUSES = [
  ShipmentStatus.PENDING,
  ShipmentStatus.READY_FOR_PICKUP,
];

export function assertOrderCancellable(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  if (
    CANCELLABLE_STATUSES.has(order.status) &&
    CANCELLABLE_PAYMENT_STATUSES.has(order.paymentStatus)
  ) {
    return;
  }
  if (
    order.paymentStatus === PaymentStatus.PAID ||
    order.paymentStatus === PaymentStatus.PARTIAL ||
    order.status === OrderStatus.PAID
  ) {
    throw new ConflictException('Paid order must use the refund flow');
  }
  throw new ConflictException(`Cannot cancel a ${order.status} order`);
}

/**
 * Where the money on an order stands, from what was received and what was
 * given back. `received` never shrinks on a refund, so a partly refunded
 * order is still PAID rather than "owing" the refunded amount again.
 */
export function paymentStatusFor(input: {
  total: Prisma.Decimal;
  received: Prisma.Decimal;
  refunded: Prisma.Decimal;
}): PaymentStatus {
  const { total, received, refunded } = input;
  if (received.gt(0) && refunded.gte(received)) return PaymentStatus.REFUNDED;
  if (received.gte(total) && received.gt(0)) return PaymentStatus.PAID;
  if (received.gt(0)) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

/**
 * Open payment attempts die with their order, so a payment that still lands
 * afterwards is recognised as late instead of being applied to a closed order.
 */
export async function cancelOpenPayments(
  tx: Prisma.TransactionClient,
  orderIds: string[],
) {
  if (!orderIds.length) return 0;
  const { count } = await tx.payment.updateMany({
    where: { orderId: { in: orderIds }, status: { in: OPEN_PAYMENT_STATUSES } },
    data: { status: PaymentTransactionStatus.CANCELLED },
  });
  return count;
}

/**
 * Calls off shipments that have not left the merchant. Shipments already in
 * transit are left alone: stopping those is a return, not a status change.
 */
export async function cancelUnshippedShipments(
  tx: Prisma.TransactionClient,
  orderId: string,
  userId: string | null,
  message: string,
) {
  const shipments = await tx.shipment.findMany({
    where: { orderId, status: { in: UNSHIPPED_SHIPMENT_STATUSES } },
    select: { id: true },
  });
  const now = new Date();
  for (const shipment of shipments) {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: ShipmentStatus.CANCELLED,
        cancelledAt: now,
        events: {
          create: {
            status: ShipmentStatus.CANCELLED,
            message,
            occurredAt: now,
            createdById: userId,
          },
        },
      },
    });
  }
  return shipments.length;
}

/**
 * Expires the unpaid orders behind these checkouts. The one place that decides
 * what "expired" means, used by the reservation sweeper, the inline expiry in
 * `reserveCheckout`, the stale-order sweep and an explicit checkout expiry.
 * Returns the ids of the orders it expired.
 */
export async function expireUnpaidOrders(
  tx: Prisma.TransactionClient,
  checkoutSessionIds: string[],
) {
  if (!checkoutSessionIds.length) return [];
  await tx.checkoutSession.updateMany({
    where: { id: { in: checkoutSessionIds }, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });
  const orders = await tx.order.findMany({
    where: {
      checkoutSessionId: { in: checkoutSessionIds },
      paymentStatus: PaymentStatus.PENDING,
      status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.RESERVED] },
    },
    select: { id: true },
  });
  const orderIds = orders.map(({ id }) => id);
  if (!orderIds.length) return [];
  await tx.order.updateMany({
    where: { id: { in: orderIds } },
    data: { status: OrderStatus.EXPIRED },
  });
  await cancelOpenPayments(tx, orderIds);
  return orderIds;
}
