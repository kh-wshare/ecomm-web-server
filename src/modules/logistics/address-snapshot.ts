/**
 * The canonical stored form of an address.
 *
 * An address reaches the system in two shapes — a validated `AddressInputDto`
 * off the wire, and a `CustomerAddress` row out of the shopper's address book
 * (whose coordinates are Prisma `Decimal`s and whose empty fields are `null`,
 * not `undefined`). Both normalize through `toAddressSnapshot` so that what is
 * written onto a checkout session, an order and a shipment is always the same
 * JSON shape, whichever door the address came in through.
 */
export interface AddressSnapshot {
  // Every value is a string or null, which is also what lets a snapshot be
  // handed straight to Prisma as a JSON column value.
  [key: string]: string | null;
  label: string | null;
  recipientName: string;
  phone: string | null;
  email: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  latitude: string | null;
  longitude: string | null;
  note: string | null;
}

/** Anything address-shaped: the wire DTO, a DB row, or a stored snapshot. */
export interface AddressLike {
  label?: string | null;
  recipientName: string;
  phone?: string | null;
  email?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  latitude?: { toString(): string } | number | string | null;
  longitude?: { toString(): string } | number | string | null;
  note?: string | null;
}

export function toAddressSnapshot(address: AddressLike): AddressSnapshot {
  return {
    label: nullable(address.label),
    recipientName: address.recipientName.trim(),
    phone: nullable(address.phone),
    email: nullable(address.email)?.toLowerCase() ?? null,
    line1: address.line1.trim(),
    line2: nullable(address.line2),
    city: nullable(address.city),
    province: nullable(address.province),
    postalCode: nullable(address.postalCode),
    country: address.country.trim().toUpperCase(),
    latitude: coordinate(address.latitude),
    longitude: coordinate(address.longitude),
    note: nullable(address.note),
  };
}

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function coordinate(
  value: { toString(): string } | number | string | null | undefined,
) {
  if (value === null || value === undefined) return null;
  return value.toString();
}
