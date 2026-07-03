import { OrderStatus } from '#app/generated/prisma/enums';

const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: OrderStatus.PROCESSING,
  PROCESSING: OrderStatus.FULFILLED,
  FULFILLED: OrderStatus.COMPLETED,
};

export function isOrderStatusTransitionAllowed(
  current: OrderStatus,
  next: OrderStatus,
) {
  return current === next || ORDER_STATUS_TRANSITIONS[current] === next;
}
