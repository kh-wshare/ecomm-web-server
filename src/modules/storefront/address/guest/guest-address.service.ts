import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { AddressType, SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { AddressService } from '#app/modules/address/address.service';
import {
  AssignCartAddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '#app/modules/address/dto/address-input.dto';
import {
  CartOwner,
  CartService,
} from '#app/modules/storefront/cart/cart.service';

/** Just enough of a cart to decide what it may see. */
type CartIdentity = {
  id: string;
  merchantId: string;
  customerId: string | null;
  ownerId: string | null;
  createdById: string | null;
  sourceChannel: SalesChannel;
};

/**
 * The shopper's address book reached *through their cart* — the only address
 * surface available without an account.
 *
 * A guest has no account, so the cart token is the whole identity: the address
 * hangs off the merchant's `Customer` directory — the same table POS walk-in
 * customers live in — and the cart's contact details decide which customer
 * that is. A cart therefore needs a name plus an email or phone before an
 * address can be saved, which is the whole reason `PATCH /cart/:id/contact`
 * exists.
 *
 * Signed-in shoppers can use `StorefrontAddressService` instead, which is keyed
 * on the authenticated user and needs no cart at all.
 */
@Injectable()
export class GuestAddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addresses: AddressService,
    private readonly carts: CartService,
  ) {}

  async findAll(
    merchantSlug: string,
    cartId: string,
    token?: string,
    user?: CartOwner,
  ) {
    const cart = await this.carts.authenticate(
      merchantSlug,
      cartId,
      token,
      user,
    );
    if (!cart.customerId) return [];
    return this.addresses.findMany({
      merchantId: cart.merchantId,
      customerId: cart.customerId,
      ...this.visibility(cart),
    });
  }

  async create(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: CreateAddressDto,
    user?: CartOwner,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    const customerId = await this.resolveCustomer(cart);
    return this.addresses.create(
      {
        merchantId: cart.merchantId,
        customerId,
        // Saved through this cart, which is what later grants the cart sight
        // of it without exposing the customer's whole book.
        cartId: cart.id,
        ownerId: cart.ownerId,
      },
      dto,
    );
  }

  async update(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    addressId: string,
    dto: UpdateAddressDto,
    user?: CartOwner,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    const address = await this.load(cart, addressId);
    return this.addresses.update(addressId, address.customerId, dto);
  }

  async remove(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    addressId: string,
    user?: CartOwner,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    await this.load(cart, addressId);
    return this.addresses.softDelete(addressId);
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
    user?: CartOwner,
  ) {
    const cart = await this.carts.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
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
    return this.carts.findOne(merchantSlug, cartId, token, user);
  }

  private async load(cart: CartIdentity, addressId: string) {
    // No customer yet means nothing has been saved through this cart, and an
    // unscoped lookup would match another customer's address.
    if (!cart.customerId) throw new NotFoundException('Address not found');
    return this.addresses.requireOne({
      id: addressId,
      merchantId: cart.merchantId,
      customerId: cart.customerId,
      ...this.visibility(cart),
    });
  }

  /**
   * Which of a customer's addresses this cart may see.
   *
   * A cart staff created (`createdById` set) is a deliberate link to a known
   * customer, so it sees their whole address book. A guest cart is linked only
   * by a matching email or phone — which anyone could type — so it sees only
   * the addresses saved through that same cart. Without this, knowing a
   * shopper's email would be enough to read back their saved recipient names,
   * phone numbers and street addresses.
   */
  private visibility(cart: CartIdentity): Prisma.CustomerAddressWhereInput {
    // Staff built this cart for a customer they identified in person, so the
    // whole book is theirs to work with.
    if (cart.createdById && cart.sourceChannel === SalesChannel.POS) return {};

    // A signed-in shopper: their own saved addresses, plus anything saved
    // through this cart. Never the customer's whole book — the cart's customer
    // link can come from typed contact details, so granting more here would
    // turn a guessed email back into an address-book leak.
    if (cart.ownerId) {
      return { OR: [{ ownerId: cart.ownerId }, { cartId: cart.id }] };
    }

    // A guest proves nothing beyond holding this cart's token.
    return { cartId: cart.id };
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
}
