import { Injectable } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { DeliveryMethodType } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export interface QuoteAddress {
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  province?: string | null;
}

export interface QuoteCart {
  itemCount: number;
  subtotal: Prisma.Decimal;
}

export interface DeliveryQuote {
  methodId: string;
  code: string;
  name: string;
  description: string | null;
  type: DeliveryMethodType;
  branchId: string | null;
  isDefault: boolean;
  zoneId: string | null;
  zoneName: string | null;
  fee: Prisma.Decimal;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
}

type ZoneRow = {
  id: string;
  name: string;
  countries: string[];
  provinces: string[];
  cities: string[];
  postalCodes: string[];
  baseFee: Prisma.Decimal;
  perItemFee: Prisma.Decimal;
  freeOverSubtotal: Prisma.Decimal | null;
  minSubtotal: Prisma.Decimal | null;
  maxSubtotal: Prisma.Decimal | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
  isFallback: boolean;
};

/**
 * Turns a merchant's delivery methods plus a destination address into the list
 * of options a shopper may pick, each with its resolved fee.
 *
 * Both sides of the app quote through here: the storefront shows the options
 * on a cart, and `CheckoutService` re-quotes the chosen one at confirm time
 * rather than trusting a fee the client sent — the same reason
 * `CartPricingService` re-prices items instead of storing prices on the cart.
 */
@Injectable()
export class DeliveryQuoteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every method the shopper may choose for this cart. PICKUP methods are
   * always offered at zero fee; DELIVERY methods appear only when a zone
   * matches the address, so a merchant that does not ship to a destination
   * simply returns no delivery option for it.
   */
  async quote(
    merchantId: string,
    address: QuoteAddress | null,
    cart: QuoteCart,
  ): Promise<DeliveryQuote[]> {
    const methods = await this.prisma.deliveryMethod.findMany({
      where: { merchantId, status: 'ACTIVE', deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        zones: {
          where: { deletedAt: null },
          orderBy: [{ isFallback: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });

    const quotes: DeliveryQuote[] = [];
    for (const method of methods) {
      if (method.type === DeliveryMethodType.PICKUP) {
        quotes.push(this.toQuote(method, null, new Prisma.Decimal(0)));
        continue;
      }
      if (!address) continue;

      const zone = this.matchZone(method.zones, address, cart.subtotal);
      if (!zone) continue;
      quotes.push(this.toQuote(method, zone, this.fee(zone, cart)));
    }
    return quotes;
  }

  /**
   * Resolve one specific method for a cart, used when the shopper has already
   * chosen. Returns null when that method is no longer offered for the
   * address — an expired choice must fail the checkout, not silently ship free.
   */
  async quoteMethod(
    merchantId: string,
    deliveryMethodId: string,
    address: QuoteAddress | null,
    cart: QuoteCart,
  ): Promise<DeliveryQuote | null> {
    const quotes = await this.quote(merchantId, address, cart);
    return quotes.find((quote) => quote.methodId === deliveryMethodId) ?? null;
  }

  /**
   * Specific zones win over fallback zones; `zones` arrives ordered
   * `isFallback asc, sortOrder asc`, so the first match is already the most
   * specific one the merchant ranked highest.
   */
  private matchZone(
    zones: ZoneRow[],
    address: QuoteAddress,
    subtotal: Prisma.Decimal,
  ): ZoneRow | null {
    for (const zone of zones) {
      if (zone.minSubtotal && subtotal.lessThan(zone.minSubtotal)) continue;
      if (zone.maxSubtotal && subtotal.greaterThan(zone.maxSubtotal)) continue;
      if (zone.isFallback) return zone;
      if (!this.matches(zone.countries, address.country)) continue;
      if (!this.matches(zone.provinces, address.province)) continue;
      if (!this.matches(zone.cities, address.city)) continue;
      if (!this.matches(zone.postalCodes, address.postalCode)) continue;
      return zone;
    }
    return null;
  }

  /** An empty list is a wildcard: the merchant did not constrain that field. */
  private matches(allowed: string[], value: string | null | undefined) {
    if (allowed.length === 0) return true;
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return allowed.some((entry) => entry.trim().toLowerCase() === normalized);
  }

  private fee(zone: ZoneRow, cart: QuoteCart) {
    if (
      zone.freeOverSubtotal &&
      cart.subtotal.greaterThanOrEqualTo(zone.freeOverSubtotal)
    ) {
      return new Prisma.Decimal(0);
    }
    return zone.baseFee.plus(zone.perItemFee.times(cart.itemCount));
  }

  private toQuote(
    method: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      type: DeliveryMethodType;
      branchId: string | null;
      isDefault: boolean;
    },
    zone: ZoneRow | null,
    fee: Prisma.Decimal,
  ): DeliveryQuote {
    return {
      methodId: method.id,
      code: method.code,
      name: method.name,
      description: method.description,
      type: method.type,
      branchId: method.branchId,
      isDefault: method.isDefault,
      zoneId: zone?.id ?? null,
      zoneName: zone?.name ?? null,
      fee,
      estimatedMinDays: zone?.estimatedMinDays ?? null,
      estimatedMaxDays: zone?.estimatedMaxDays ?? null,
    };
  }
}
