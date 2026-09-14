import { ShipmentStatus } from '#app/generated/prisma/enums';

/**
 * Allowed shipment status transitions, mirroring how `order-status.ts` guards
 * the order lifecycle. A shipment moves forward through handling, or sideways
 * into a terminal failure — it never reopens once DELIVERED, RETURNED or
 * CANCELLED, so a late webhook or double-click cannot resurrect it.
 */
const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: [
    ShipmentStatus.READY_FOR_PICKUP,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CANCELLED,
  ],
  READY_FOR_PICKUP: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
  ],
  IN_TRANSIT: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.RETURNED,
  ],
  OUT_FOR_DELIVERY: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.RETURNED,
  ],
  FAILED: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.RETURNED,
    ShipmentStatus.CANCELLED,
  ],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export function isShipmentStatusTransitionAllowed(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
