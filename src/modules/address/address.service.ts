import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address-input.dto';

/** The columns every address surface returns. */
export const addressSelect = {
  id: true,
  customerId: true,
  ownerId: true,
  createdById: true,
  label: true,
  recipientName: true,
  phone: true,
  email: true,
  line1: true,
  line2: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  latitude: true,
  longitude: true,
  note: true,
  isDefaultShipping: true,
  isDefaultBilling: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.CustomerAddressSelect;

/** As `addressSelect`, plus who the address belongs to — the POS listing. */
export const addressWithCustomerSelect = {
  ...addressSelect,
  customer: { select: { id: true, fullName: true, phone: true, email: true } },
} as const satisfies Prisma.CustomerAddressSelect;

export const addressOrder = [
  { isDefaultShipping: 'desc' as const },
  { isDefaultBilling: 'desc' as const },
  { createdAt: 'desc' as const },
];

/**
 * Who an address belongs to, and who put it there.
 *
 * These three columns mean genuinely different things and conflating any two
 * of them has already caused one production-shaped bug, so they are named
 * once, here, rather than spelled out at each call site:
 *
 * - `ownerId` — the signed-in shopper whose account this address is. Proof of
 *   an account link; `StorefrontContextService` reads it as exactly that.
 * - `createdById` — the staff member who typed it for someone else. Never an
 *   account link: a walk-in customer has no account.
 * - `cartId` — the cart it was saved through, which is what lets a guest cart
 *   read back its own addresses without seeing the customer's whole book.
 */
export type AddressOwnership = {
  merchantId: string;
  customerId: string;
  ownerId?: string | null;
  createdById?: string | null;
  cartId?: string | null;
};

/**
 * The address book itself: one place that knows how a `CustomerAddress` is
 * shaped, normalised, defaulted and retired.
 *
 *
 * Deliberately *not* an access-control layer. Who may read or write a given
 * address differs completely per surface — a guest proves only that they hold
 * a cart token, a shopper proves an account, staff prove a merchant permission
 * — so each surface keeps its own policy and calls in here for the mechanics.
 * Before this existed the mechanics were copied three times and had already
 * drifted apart.
 */
@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    where: Prisma.CustomerAddressWhereInput,
    options: { withCustomer?: boolean; skip?: number; take?: number } = {},
  ) {
    return this.prisma.customerAddress.findMany({
      where: { ...where, deletedAt: null },
      orderBy: options.withCustomer ? { createdAt: 'desc' } : addressOrder,
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
      select: options.withCustomer ? addressWithCustomerSelect : addressSelect,
    });
  }

  count(where: Prisma.CustomerAddressWhereInput) {
    return this.prisma.customerAddress.count({
      where: { ...where, deletedAt: null },
    });
  }

  /** Loads an address a surface has decided the caller may see. */
  async requireOne(where: Prisma.CustomerAddressWhereInput) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { ...where, deletedAt: null },
      select: { id: true, customerId: true },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  /**
   * Saves a new address for a customer.
   *
   * The first address a customer has becomes their default for both, so a
   * single-address customer never has to pick one explicitly. "First" is
   * counted per customer, matching the scope `clearDefault` works on — count
   * and clear disagreeing is what previously let one customer end up holding
   * two default shipping addresses at once.
   */
  create(ownership: AddressOwnership, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const isFirst = (await this.countIn(tx, ownership.customerId)) === 0;
      const isDefaultShipping = dto.isDefaultShipping ?? isFirst;
      const isDefaultBilling = dto.isDefaultBilling ?? isFirst;

      if (isDefaultShipping) {
        await this.clearDefault(tx, ownership.customerId, 'isDefaultShipping');
      }
      if (isDefaultBilling) {
        await this.clearDefault(tx, ownership.customerId, 'isDefaultBilling');
      }
      return tx.customerAddress.create({
        data: {
          merchantId: ownership.merchantId,
          customerId: ownership.customerId,
          ownerId: ownership.ownerId ?? null,
          createdById: ownership.createdById ?? null,
          cartId: ownership.cartId ?? null,
          ...this.normalize(dto),
          recipientName: dto.recipientName.trim(),
          line1: dto.line1.trim(),
          country: dto.country.trim().toUpperCase(),
          isDefaultShipping,
          isDefaultBilling,
        },
        select: addressSelect,
      });
    });
  }

  /** Edits an address, keeping the one-default-per-customer invariant. */
  update(addressId: string, customerId: string, dto: UpdateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await this.clearDefault(tx, customerId, 'isDefaultShipping');
      }
      if (dto.isDefaultBilling) {
        await this.clearDefault(tx, customerId, 'isDefaultBilling');
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...this.normalize(dto),
          ...(dto.isDefaultShipping !== undefined
            ? { isDefaultShipping: dto.isDefaultShipping }
            : {}),
          ...(dto.isDefaultBilling !== undefined
            ? { isDefaultBilling: dto.isDefaultBilling }
            : {}),
        },
        select: addressSelect,
      });
    });
  }

  /**
   * Soft-deletes and detaches the address from any cart still pointing at it.
   * Clearing a cart's shipping address also clears its delivery selection,
   * because the chosen method may not serve wherever the shopper picks next.
   *
   * Orders keep their own JSON snapshot, so deleting here never changes where
   * a past order says it was delivered.
   */
  async softDelete(addressId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.cart.updateMany({
        where: { shippingAddressId: addressId },
        data: {
          shippingAddressId: null,
          deliveryMethodId: null,
          deliveryZoneId: null,
        },
      });
      await tx.cart.updateMany({
        where: { billingAddressId: addressId },
        data: { billingAddressId: null },
      });
      await tx.customerAddress.update({
        where: { id: addressId },
        data: {
          deletedAt: new Date(),
          isDefaultShipping: false,
          isDefaultBilling: false,
        },
      });
    });
    return { id: addressId, deleted: true };
  }

  /**
   * Normalises only the fields the caller actually supplied, so a PATCH never
   * blanks a column the shopper left out.
   */
  private normalize(dto: Partial<CreateAddressDto>) {
    return {
      ...(dto.label !== undefined ? { label: optional(dto.label) } : {}),
      ...(dto.recipientName !== undefined
        ? { recipientName: dto.recipientName.trim() }
        : {}),
      ...(dto.phone !== undefined ? { phone: optional(dto.phone) } : {}),
      ...(dto.email !== undefined
        ? { email: dto.email?.trim().toLowerCase() ?? null }
        : {}),
      ...(dto.line1 !== undefined ? { line1: dto.line1.trim() } : {}),
      ...(dto.line2 !== undefined ? { line2: optional(dto.line2) } : {}),
      ...(dto.city !== undefined ? { city: optional(dto.city) } : {}),
      ...(dto.province !== undefined
        ? { province: optional(dto.province) }
        : {}),
      ...(dto.postalCode !== undefined
        ? { postalCode: optional(dto.postalCode) }
        : {}),
      ...(dto.country !== undefined
        ? { country: dto.country.trim().toUpperCase() }
        : {}),
      ...(dto.latitude !== undefined
        ? { latitude: decimal(dto.latitude) }
        : {}),
      ...(dto.longitude !== undefined
        ? { longitude: decimal(dto.longitude) }
        : {}),
      ...(dto.note !== undefined ? { note: optional(dto.note) } : {}),
    };
  }

  private countIn(tx: Prisma.TransactionClient, customerId: string) {
    return tx.customerAddress.count({ where: { customerId, deletedAt: null } });
  }

  /** Only one address per customer may hold each default. */
  private clearDefault(
    tx: Prisma.TransactionClient,
    customerId: string,
    field: 'isDefaultShipping' | 'isDefaultBilling',
  ) {
    return tx.customerAddress.updateMany({
      where: { customerId, deletedAt: null, [field]: true },
      data: { [field]: false },
    });
  }
}

const optional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const decimal = (value: number | undefined) =>
  value === undefined ? null : new Prisma.Decimal(value);
