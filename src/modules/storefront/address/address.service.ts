import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { AddressType } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CartService } from '#app/modules/storefront/cart/cart.service';
import {
  AssignCartAddressDto,
  CreateStorefrontAddressDto,
  UpdateStorefrontAddressDto,
} from './dto/address-input.dto';

const addressSelect = {
  id: true,
  customerId: true,
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

/**
 * The shopper's address book, reached through their cart.
 *
 * Storefront shoppers have no login, so an address cannot hang off a user
 * account. It hangs off the merchant's `Customer` directory instead — the same
 * table POS walk-in customers live in — and the cart's contact details are
 * what identify which customer that is. A cart therefore has to carry a name
 * plus an email or phone before an address can be saved; that requirement is
 * the whole reason `PATCH /cart/:id/contact` exists.
 */
@Injectable()
export class StorefrontAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
  ) {}

  async findAll(merchantSlug: string, cartId: string, token?: string) {
    const cart = await this.carts.authenticate(merchantSlug, cartId, token);
    if (!cart.customerId) return [];
    return this.prisma.customerAddress.findMany({
      where: {
        merchantId: cart.merchantId,
        customerId: cart.customerId,
        deletedAt: null,
      },
      orderBy: [
        { isDefaultShipping: 'desc' },
        { isDefaultBilling: 'desc' },
        { createdAt: 'desc' },
      ],
      select: addressSelect,
    });
  }

  async create(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: CreateStorefrontAddressDto,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
    );
    const customerId = await this.resolveCustomer(cart);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await this.clearDefault(tx, customerId, 'isDefaultShipping');
      }
      if (dto.isDefaultBilling) {
        await this.clearDefault(tx, customerId, 'isDefaultBilling');
      }
      const existing = await tx.customerAddress.count({
        where: { customerId, deletedAt: null },
      });
      return tx.customerAddress.create({
        data: {
          merchantId: cart.merchantId,
          customerId,
          ...this.input(dto),
          recipientName: dto.recipientName.trim(),
          line1: dto.line1.trim(),
          country: dto.country.trim().toUpperCase(),
          // The shopper's first address becomes their default for both, so a
          // single-address shopper never has to pick one explicitly.
          isDefaultShipping: dto.isDefaultShipping ?? existing === 0,
          isDefaultBilling: dto.isDefaultBilling ?? existing === 0,
        },
        select: addressSelect,
      });
    });
  }

  async update(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    addressId: string,
    dto: UpdateStorefrontAddressDto,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
    );
    const address = await this.load(cart, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultShipping) {
        await this.clearDefault(tx, address.customerId, 'isDefaultShipping');
      }
      if (dto.isDefaultBilling) {
        await this.clearDefault(tx, address.customerId, 'isDefaultBilling');
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...this.input(dto),
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
   * Orders keep their own JSON snapshot, so deleting here never changes where
   * a past order says it was delivered.
   */
  async remove(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    addressId: string,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
    );
    await this.load(cart, addressId);

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
   * Points the cart's shipping or billing slot at a saved address. Changing
   * the shipping address clears the delivery selection, because the chosen
   * method may not serve the new destination — the shopper re-picks from
   * freshly quoted options.
   */
  async assignToCart(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    addressId: string,
    dto: AssignCartAddressDto,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
    );
    await this.load(cart, addressId);

    await this.prisma.cart.update({
      where: { id: cartId },
      data:
        dto.type === AddressType.SHIPPING
          ? {
              shippingAddressId: addressId,
              deliveryMethodId: null,
              deliveryZoneId: null,
            }
          : { billingAddressId: addressId },
    });
    return this.carts.findOne(merchantSlug, cartId, token);
  }

  private async load(
    cart: { merchantId: string; customerId: string | null },
    addressId: string,
  ) {
    if (!cart.customerId) throw new NotFoundException('Address not found');
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        merchantId: cart.merchantId,
        customerId: cart.customerId,
        deletedAt: null,
      },
      select: { id: true, customerId: true },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  /**
   * Finds or creates the `Customer` this cart belongs to, matching on email
   * first and then phone within the merchant, and attaches it to the cart so
   * later addresses land in the same book.
   */
  private async resolveCustomer(cart: {
    id: string;
    merchantId: string;
    customerId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
  }) {
    if (cart.customerId) return cart.customerId;

    const email = cart.customerEmail?.trim().toLowerCase();
    const phone = cart.customerPhone?.trim();
    const name = cart.customerName?.trim();
    if (!name || (!email && !phone)) {
      throw new BadRequestException(
        'Set the cart contact name and an email or phone before saving an address',
      );
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        merchantId: cart.merchantId,
        deletedAt: null,
        OR: [
          ...(email
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const customerId =
      existing?.id ??
      (
        await this.prisma.customer.create({
          data: {
            merchantId: cart.merchantId,
            fullName: name,
            email: email ?? null,
            phone: phone ?? null,
          },
          select: { id: true },
        })
      ).id;

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { customerId },
    });
    return customerId;
  }

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

  private input(dto: Partial<CreateStorefrontAddressDto>) {
    return {
      ...(dto.label !== undefined ? { label: this.optional(dto.label) } : {}),
      ...(dto.recipientName !== undefined
        ? { recipientName: dto.recipientName.trim() }
        : {}),
      ...(dto.phone !== undefined ? { phone: this.optional(dto.phone) } : {}),
      ...(dto.email !== undefined
        ? { email: dto.email?.trim().toLowerCase() ?? null }
        : {}),
      ...(dto.line1 !== undefined ? { line1: dto.line1.trim() } : {}),
      ...(dto.line2 !== undefined ? { line2: this.optional(dto.line2) } : {}),
      ...(dto.city !== undefined ? { city: this.optional(dto.city) } : {}),
      ...(dto.province !== undefined
        ? { province: this.optional(dto.province) }
        : {}),
      ...(dto.postalCode !== undefined
        ? { postalCode: this.optional(dto.postalCode) }
        : {}),
      ...(dto.country !== undefined
        ? { country: dto.country.trim().toUpperCase() }
        : {}),
      ...(dto.latitude !== undefined
        ? { latitude: this.decimal(dto.latitude) }
        : {}),
      ...(dto.longitude !== undefined
        ? { longitude: this.decimal(dto.longitude) }
        : {}),
      ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
    };
  }

  private decimal(value: number | undefined) {
    return value === undefined ? null : new Prisma.Decimal(value);
  }

  private optional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
