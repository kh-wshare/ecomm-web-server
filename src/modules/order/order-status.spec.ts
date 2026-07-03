import { OrderStatus } from '#app/generated/prisma/enums';
import { isOrderStatusTransitionAllowed } from './order-status';

describe('order status transitions', () => {
  it.each([
    [OrderStatus.PAID, OrderStatus.PROCESSING],
    [OrderStatus.PROCESSING, OrderStatus.FULFILLED],
    [OrderStatus.FULFILLED, OrderStatus.COMPLETED],
  ])('allows %s to advance to %s', (current, next) => {
    expect(isOrderStatusTransitionAllowed(current, next)).toBe(true);
  });

  it.each([
    [OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING],
    [OrderStatus.PAID, OrderStatus.FULFILLED],
    [OrderStatus.COMPLETED, OrderStatus.PROCESSING],
    [OrderStatus.CANCELLED, OrderStatus.PAID],
  ])('rejects %s to %s', (current, next) => {
    expect(isOrderStatusTransitionAllowed(current, next)).toBe(false);
  });
});
