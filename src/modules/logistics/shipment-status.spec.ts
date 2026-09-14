import { ShipmentStatus } from '#app/generated/prisma/enums';
import {
  isShipmentStatusTransitionAllowed,
  isTerminalShipmentStatus,
} from './shipment-status';

describe('shipment status transitions', () => {
  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.PENDING, ShipmentStatus.READY_FOR_PICKUP],
    [ShipmentStatus.READY_FOR_PICKUP, ShipmentStatus.DELIVERED],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
    [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
    [ShipmentStatus.FAILED, ShipmentStatus.IN_TRANSIT],
  ])('allows %s to advance to %s', (current, next) => {
    expect(isShipmentStatusTransitionAllowed(current, next)).toBe(true);
  });

  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.DELIVERED],
    [ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.CANCELLED, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.RETURNED, ShipmentStatus.DELIVERED],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
  ])('rejects %s to %s', (current, next) => {
    expect(isShipmentStatusTransitionAllowed(current, next)).toBe(false);
  });

  it('treats a repeated status as a no-op rather than an error', () => {
    expect(
      isShipmentStatusTransitionAllowed(
        ShipmentStatus.DELIVERED,
        ShipmentStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it.each([
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RETURNED,
    ShipmentStatus.CANCELLED,
  ])('reports %s as terminal', (status) => {
    expect(isTerminalShipmentStatus(status)).toBe(true);
  });

  it.each([
    ShipmentStatus.PENDING,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.FAILED,
  ])('reports %s as still open', (status) => {
    expect(isTerminalShipmentStatus(status)).toBe(false);
  });
});
