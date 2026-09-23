import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CheckoutService } from '#app/modules/checkout/checkout.service';
import { toAddressSnapshot } from '#app/modules/logistics/address-snapshot';
import {
  DeliveryQuote,
  DeliveryQuoteService,
} from '#app/modules/logistics/delivery-quote.service';
import {
  CartPricingService,
  PricedCart,
} from '#app/modules/pricing/cart-pricing.service';
import {
  ShopperAccount,
  StorefrontContextService,
} from '#app/modules/storefront/context/storefront-context.service';
import {
  CartItemInputDto,
  CheckoutCartDto,
  CreateCartDto,
  SelectCartDeliveryDto,
  UpdateCartContactDto,
  UpdateCartItemDto,
} from './dto/cart-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

/**
 * The signed-in shopper a cart can belong to, when there is one. Identical to
 * `ShopperAccount` by design — a cart owner and an address-book owner are the
 * same person, and `StorefrontContextService` maps either to a `Customer`.
 */
export type CartOwner = ShopperAccount;

const CART_TTL_DAYS = 30;

const cartInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  shippingAddress: true,
  billingAddress: true,
  deliveryMethod: { select: { id: true, name: true, code: true, type: true } },
} as const satisfies Prisma.CartInclude;

/** A cart loaded with everything the service needs to price and present it. */
export type LoadedCart = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

/**
 * Everything a cart listing may expose. Deliberately enumerated rather than
 * spread from `cartInclude`, because the row also carries `accessTokenHash` —
 * the verifier for the cart's credential, which must never leave the server.
 */
const cartListSelect = {
  id: true,
  merchantId: true,
  customerId: true,
  ownerId: true,
  createdById: true,
  status: true,
  sourceChannel: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  note: true,
  checkoutSessionId: true,
  mergedIntoCartId: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  items: { orderBy: { createdAt: 'asc' } },
  shippingAddress: true,
  billingAddress: true,
  deliveryMethod: { select: { id: true, name: true, code: true, type: true } },
} as const satisfies Prisma.CartSelect;

/**
 * The storefront shopping cart.
 *
 * Authenticated by an opaque bearer token whose SHA-256 hash is the only thing
 * stored, exactly as `CheckoutService` authenticates a checkout session — so a
 * shopper gets a durable, shareable cart with no account and no cookie.
 *
 * The cart stores product/variant/quantity only. Prices and delivery fees are
 * recomputed on every read through `CartPricingService` and
 * `DeliveryQuoteService`, so a cart left open for a week cannot check out at
 * last week's price or quote a delivery fee the merchant has since changed.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: StorefrontContextService,
    private readonly pricing: CartPricingService,
    private readonly delivery: DeliveryQuoteService,
    private readonly checkout: CheckoutService,
  ) {}

  async create(merchantSlug: string, dto: CreateCartDto, user?: CartOwner) {
    const sourceChannel = dto.sourceChannel ?? SalesChannel.WEBSITE;
    if (sourceChannel === SalesChannel.POS) {
      throw new BadRequestException(
        'POS sells through its own flow, not a storefront cart',
      );
    }
    const merchantId = await this.context.resolveMerchantId(merchantSlug);
    const cartToken = randomBytes(32).toString('base64url');
    // Created while signed in, so it belongs to them from the first request
    // and their saved addresses are available straight away.
    const customerId = user
      ? await this.context.resolveCustomerForUser(merchantId, user)
      : null;

    const cart = await this.prisma.cart.create({
      data: {
        merchantId,
        sourceChannel,
        ownerId: user?.id ?? null,
        customerId,
        accessTokenHash: this.hashToken(cartToken),
        expiresAt: this.expiry(),
        items: dto.items?.length
          ? { create: dto.items.map((item) => this.toItemData(item)) }
          : undefined,
      },
      include: cartInclude,
    });
    return { ...(await this.present(cart)), cartToken };
  }

  async findOne(
    merchantSlug: string,
    cartId: string,
    token?: string,
    user?: CartOwner,
  ) {
    const cart = await this.authenticate(merchantSlug, cartId, token, user);
    return this.present(cart);
  }

  /**
   * Staff builds a cart on a customer's behalf (a phone/walk-in order),
   * tagged `sourceChannel: POS` and linked to the customer plus the staff
   * member who built it. Distinct from `create()`, which rejects `POS` for
   * the anonymous, public storefront entry point — this is a separate,
   * permission-gated path, so that guard is untouched.
   *
   * The staff member goes in `createdById`, never `ownerId`: `ownerId` means
   * "the shopper whose account this is", and `StorefrontContextService` reads
   * it that way. Putting staff there made a cashier resolve to whichever
   * customer they last served.
   */
  async createForStaff(
    merchantId: string,
    customerId: string,
    createdById: string,
    items?: CartItemInputDto[],
  ) {
    const cartToken = randomBytes(32).toString('base64url');
    const cart = await this.prisma.cart.create({
      data: {
        merchantId,
        customerId,
        createdById,
        sourceChannel: SalesChannel.POS,
        accessTokenHash: this.hashToken(cartToken),
        expiresAt: this.expiry(),
        items: items?.length
          ? { create: items.map((item) => this.toItemData(item)) }
          : undefined,
      },
      include: cartInclude,
    });
    return { ...(await this.present(cart)), cartToken };
  }

  /**
   * A lighter-weight listing for "carts I built" — rows with items and
   * addresses included, not run through `present()`'s re-pricing/delivery
   * quoting, which is reserved for viewing one live cart at a time.
   *
   * Uses an explicit select rather than the bare include: the row carries
   * `accessTokenHash`, and a list endpoint must not hand that back.
   */
  async findManyByCreator(
    merchantId: string,
    createdById: string,
    pagination: { skip: number; take: number; page: number },
  ) {
    const where: Prisma.CartWhereInput = { merchantId, createdById };
    const [carts, total] = await this.prisma.$transaction([
      this.prisma.cart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        select: cartListSelect,
      }),
      this.prisma.cart.count({ where }),
    ]);
    return new PaginatedResult(carts, pagination.take, pagination.page, total);
  }

  /**
   * Adds a line, or increases an existing one. Repeat adds of the same
   * product/variant collapse onto one line via the `lineKey` unique index
   * rather than stacking duplicate rows.
   */
  async addItem(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: CartItemInputDto,
    user?: CartOwner,
  ) {
    const cart = await this.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    return this.addItemTo(cart, dto);
  }

  /**
   * The add-a-line operation itself, on a cart the caller has already
   * authorized. POS reaches a staff-built cart through a merchant-scoped
   * permission check rather than the cart token, and must not have to
   * reimplement line merging or the purchasability check to do it.
   */
  async addItemTo(cart: LoadedCart, dto: CartItemInputDto) {
    const lineKey = this.lineKey(dto.productId, dto.variantId);

    // Prices the line on its own first so an unknown or unpurchasable product
    // is rejected before it ever reaches the cart.
    await this.pricing.buildPricedItems(cart.merchantId, cart.sourceChannel, [
      {
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
    ]);

    const existing = cart.items.find((item) => item.lineKey === lineKey);
    const quantity = Math.min((existing?.quantity ?? 0) + dto.quantity, 100);
    await this.prisma.cartItem.upsert({
      where: { cartId_lineKey: { cartId: cart.id, lineKey } },
      create: { cartId: cart.id, ...this.toItemData(dto) },
      update: {
        quantity,
        ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
      },
    });
    return this.reload(cart.id);
  }

  async updateItem(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    itemId: string,
    dto: UpdateCartItemDto,
    user?: CartOwner,
  ) {
    const cart = await this.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    return this.updateItemOn(cart, itemId, dto);
  }

  /** As `updateItem`, on a cart the caller has already authorized. */
  async updateItemOn(cart: LoadedCart, itemId: string, dto: UpdateCartItemDto) {
    const item = cart.items.find((line) => line.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.reload(cart.id);
    }
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
      },
    });
    return this.reload(cart.id);
  }

  async removeItem(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    itemId: string,
    user?: CartOwner,
  ) {
    const cart = await this.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    return this.removeItemFrom(cart, itemId);
  }

  /** As `removeItem`, on a cart the caller has already authorized. */
  async removeItemFrom(cart: LoadedCart, itemId: string) {
    if (!cart.items.some((line) => line.id === itemId)) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.reload(cart.id);
  }

  async clear(
    merchantSlug: string,
    cartId: string,
    token?: string,
    user?: CartOwner,
  ) {
    await this.authenticateActive(merchantSlug, cartId, token, user);
    return this.clearCart(cartId);
  }

  /** As `clear`, on a cart the caller has already authorized. */
  async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    return this.reload(cartId);
  }

  async updateContact(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: UpdateCartContactDto,
    user?: CartOwner,
  ) {
    await this.authenticateActive(merchantSlug, cartId, token, user);
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        ...(dto.customerName !== undefined
          ? { customerName: this.optional(dto.customerName) }
          : {}),
        ...(dto.customerEmail !== undefined
          ? { customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null }
          : {}),
        ...(dto.customerPhone !== undefined
          ? { customerPhone: this.optional(dto.customerPhone) }
          : {}),
        ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
      },
    });
    return this.reload(cartId);
  }

  /** The delivery options available for this cart's current address. */
  async deliveryOptions(
    merchantSlug: string,
    cartId: string,
    token?: string,
    user?: CartOwner,
  ) {
    const cart = await this.authenticate(merchantSlug, cartId, token, user);
    const priced = await this.price(cart);
    const quotes = await this.delivery.quote(
      cart.merchantId,
      cart.shippingAddress,
      { itemCount: this.itemCount(priced), subtotal: priced.subtotal },
    );
    return quotes.map((quote) => this.toOption(quote));
  }

  async selectDelivery(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: SelectCartDeliveryDto,
    user?: CartOwner,
  ) {
    const cart = await this.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    const priced = await this.price(cart);
    const quote = await this.delivery.quoteMethod(
      cart.merchantId,
      dto.deliveryMethodId,
      cart.shippingAddress,
      { itemCount: this.itemCount(priced), subtotal: priced.subtotal },
    );
    if (!quote) {
      throw new ConflictException(
        'That delivery method is not available for this cart',
      );
    }
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        deliveryMethodId: quote.methodId,
        deliveryZoneId: quote.zoneId,
      },
    });
    return this.reload(cartId);
  }

  /**
   * Turns the cart into a checkout session: re-prices the lines, re-quotes the
   * chosen delivery method, then hands everything to `CheckoutService`, which
   * is what actually reserves stock. The cart is marked CONVERTED and keeps a
   * link to the session so a shopper who reloads the cart page lands on their
   * in-flight checkout instead of a second one.
   */
  async checkoutCart(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: CheckoutCartDto,
    metadata: AuditMetadata,
    user?: CartOwner,
  ) {
    const cart = await this.authenticateActive(
      merchantSlug,
      cartId,
      token,
      user,
    );
    if (cart.items.length === 0) {
      throw new ConflictException('Cart is empty');
    }
    // An order nobody can be contacted about is not a useful order. A
    // signed-in shopper never trips this: `bindOwner` fills both from their
    // account. A guest has to have filled the contact form.
    if (!cart.customerName || !(cart.customerEmail || cart.customerPhone)) {
      throw new ConflictException(
        'Set the cart contact name and an email or phone before checking out',
      );
    }

    const priced = await this.price(cart);
    const quote = cart.deliveryMethodId
      ? await this.delivery.quoteMethod(
          cart.merchantId,
          cart.deliveryMethodId,
          cart.shippingAddress,
          { itemCount: this.itemCount(priced), subtotal: priced.subtotal },
        )
      : null;
    if (cart.deliveryMethodId && !quote) {
      throw new ConflictException(
        'The selected delivery method is no longer available; choose another',
      );
    }
    if (quote && quote.type === 'DELIVERY' && !cart.shippingAddress) {
      throw new ConflictException(
        'A shipping address is required for this delivery method',
      );
    }

    const session = await this.checkout.create(
      {
        merchantSlug,
        customerId: cart.customerId ?? undefined,
        ownerId: cart.ownerId ?? undefined,
        customerName: cart.customerName ?? undefined,
        customerEmail: cart.customerEmail ?? undefined,
        customerPhone: cart.customerPhone ?? undefined,
        sourceChannel: cart.sourceChannel,
        expiresInMinutes: dto.expiresInMinutes ?? 15,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
        deliveryMethodId: cart.deliveryMethodId ?? undefined,
        shippingAddress: cart.shippingAddress,
        billingAddress: cart.billingAddress,
      },
      metadata,
    );

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'CONVERTED', checkoutSessionId: session.id },
    });
    return session;
  }

  // ---------------------------------------------------------------- internals

  /**
   * Shared with `GuestAddressService`. A cart accepts **either** of two
   * independent credentials, and needs only one:
   *
   * - the opaque `X-Cart-Token`, verified in constant time — what a guest has;
   * - a bearer JWT whose user is the cart's `ownerId` — what a signed-in
   *   shopper has on a device that never held the token.
   *
   * Either way the cart must belong to the storefront named in the URL, so a
   * credential for merchant A cannot reach a cart under merchant B's slug.
   */
  async authenticate(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    user?: CartOwner,
  ): Promise<LoadedCart> {
    if (!token && !user) {
      throw new UnauthorizedException('Cart token is required');
    }
    const merchantId = await this.context.resolveMerchantId(merchantSlug);
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, merchantId },
      include: cartInclude,
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const holdsToken = token ? this.tokenMatches(cart, token) : false;
    const isOwner = !!user && cart.ownerId === user.id;
    if (!holdsToken && !isOwner) {
      throw new UnauthorizedException(
        token ? 'Invalid cart token' : 'Cart does not belong to this account',
      );
    }
    // Once a cart belongs to an account it stops being transferable: a shared
    // cart link opened by a *different* signed-in shopper would otherwise let
    // them read that account's saved addresses through the cart. An anonymous
    // holder of the token is still fine — that is the owner's own browser
    // before it signed in.
    if (user && cart.ownerId && !isOwner) {
      throw new UnauthorizedException('Cart belongs to another account');
    }

    // A shopper who started as a guest and signed in partway through: the
    // first authenticated request claims the cart they already hold, and folds
    // in anything still sitting in a cart from an earlier session.
    //
    // Only an ACTIVE cart is claimed. A CONVERTED or EXPIRED one is finished
    // business, and re-pointing its `customerId` would rewrite history.
    if (user && !cart.ownerId && holdsToken && cart.status === 'ACTIVE') {
      return this.bindOwner(cart, user);
    }
    return cart;
  }

  /**
   * The signed-in shopper's current cart, reachable without the cart token —
   * the one cart lookup that works on a device that never held it.
   */
  async findMine(merchantSlug: string, user: CartOwner) {
    const merchantId = await this.context.resolveMerchantId(merchantSlug);
    const cart = await this.prisma.cart.findFirst({
      where: {
        merchantId,
        ownerId: user.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: cartInclude,
    });
    if (!cart) throw new NotFoundException('No active cart for this account');
    return this.present(cart);
  }

  /**
   * Loads a staff-built cart by merchant, with no cart token involved.
   *
   * This is the POS counterpart to `authenticate`: the caller has already been
   * through `RequireMerchant` plus a POS permission, which is a stronger claim
   * than holding a cart token. Scoped to the merchant rather than to the staff
   * member who created it, so a colleague can pick up a phone order mid-call.
   */
  async loadStaffCart(merchantId: string, cartId: string): Promise<LoadedCart> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, merchantId, sourceChannel: SalesChannel.POS },
      include: cartInclude,
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  /** As `loadStaffCart`, but rejects a cart that is no longer workable. */
  async loadActiveStaffCart(
    merchantId: string,
    cartId: string,
  ): Promise<LoadedCart> {
    const cart = await this.loadStaffCart(merchantId, cartId);
    if (cart.status !== 'ACTIVE') {
      throw new ConflictException(`Cart is ${cart.status.toLowerCase()}`);
    }
    if (cart.expiresAt.getTime() <= Date.now()) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { status: 'EXPIRED' },
      });
      throw new ConflictException('Cart is expired');
    }
    return cart;
  }

  /** Marks a staff cart converted once POS has turned it into an order. */
  async markConverted(cartId: string, checkoutSessionId?: string | null) {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: 'CONVERTED',
        ...(checkoutSessionId ? { checkoutSessionId } : {}),
      },
    });
  }

  private tokenMatches(cart: { accessTokenHash: string }, token: string) {
    const actual = Buffer.from(cart.accessTokenHash, 'hex');
    const supplied = Buffer.from(this.hashToken(token), 'hex');
    return (
      actual.length === supplied.length && timingSafeEqual(actual, supplied)
    );
  }

  /**
   * Claims a guest cart for the shopper who just proved who they are, and
   * folds any cart they left behind in an earlier session into it.
   *
   * `customerId` is overwritten rather than preserved on purpose: a guest cart
   * may have been linked to some `Customer` purely because someone typed that
   * email into the contact form, and a signed-in shopper must end up on their
   * own customer record, not whoever that was. Addresses saved through this
   * cart come with them, so nothing typed as a guest is lost.
   *
   * The cart the shopper is *holding* survives the merge, and the older ones
   * are marked `MERGED`. It has to be that way round: only the held cart's
   * token is in the client's hands, and the older cart's token was never
   * stored in a form anyone can recover.
   */
  private async bindOwner(
    cart: LoadedCart,
    user: CartOwner,
  ): Promise<LoadedCart> {
    const customerId = await this.context.resolveCustomerForUser(
      cart.merchantId,
      user,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { cartId: cart.id, ownerId: null },
        data: { ownerId: user.id, customerId },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          ownerId: user.id,
          customerId,
          // A guest who never filled the contact form still needs a name and
          // a contact channel to check out; their account already has both.
          customerName: cart.customerName ?? user.fullName,
          customerEmail: cart.customerEmail ?? user.email,
        },
      });
      await this.mergeAbandonedCarts(tx, cart, user.id, customerId);
      return tx.cart.findFirstOrThrow({
        where: { id: cart.id },
        include: cartInclude,
      });
    });
  }

  /**
   * Folds every other live cart this shopper owns into `survivor`, summing
   * quantities on matching lines rather than stacking duplicates, exactly as
   * `addItem` does. POS carts are excluded: a cart staff built for someone is
   * not the shopper's own to absorb.
   */
  private async mergeAbandonedCarts(
    tx: Prisma.TransactionClient,
    survivor: LoadedCart,
    ownerId: string,
    customerId: string | null,
  ) {
    const stale = await tx.cart.findMany({
      where: {
        merchantId: survivor.merchantId,
        ownerId,
        status: 'ACTIVE',
        id: { not: survivor.id },
        sourceChannel: { not: SalesChannel.POS },
      },
      include: { items: true },
    });
    if (stale.length === 0) return;

    const quantities = new Map(
      survivor.items.map((item) => [item.lineKey, item.quantity]),
    );
    for (const old of stale) {
      for (const item of old.items) {
        const merged = Math.min(
          (quantities.get(item.lineKey) ?? 0) + item.quantity,
          100,
        );
        quantities.set(item.lineKey, merged);
        await tx.cartItem.upsert({
          where: {
            cartId_lineKey: { cartId: survivor.id, lineKey: item.lineKey },
          },
          create: {
            cartId: survivor.id,
            productId: item.productId,
            variantId: item.variantId,
            lineKey: item.lineKey,
            quantity: merged,
            note: item.note,
          },
          update: { quantity: merged },
        });
      }
      await tx.cart.update({
        where: { id: old.id },
        data: {
          status: 'MERGED',
          mergedIntoCartId: survivor.id,
          customerId: customerId ?? old.customerId,
        },
      });
    }
  }

  /** As `authenticate`, but also rejects a converted or expired cart. */
  async authenticateActive(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    user?: CartOwner,
  ): Promise<LoadedCart> {
    const cart = await this.authenticate(merchantSlug, cartId, token, user);
    if (cart.status !== 'ACTIVE') {
      throw new ConflictException(`Cart is ${cart.status.toLowerCase()}`);
    }
    if (cart.expiresAt.getTime() <= Date.now()) {
      await this.prisma.cart.update({
        where: { id: cartId },
        data: { status: 'EXPIRED' },
      });
      throw new ConflictException('Cart is expired');
    }
    return cart;
  }

  /** Re-reads and re-prices after a mutation, extending the cart's life. */
  private async reload(cartId: string) {
    const cart = await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: this.expiry() },
      include: cartInclude,
    });
    return this.present(cart);
  }

  /**
   * An empty cart has no currency of its own, so it prices to a zero subtotal
   * rather than failing — the shopper has to be able to look at it.
   */
  private async price(cart: LoadedCart): Promise<PricedCart> {
    if (cart.items.length === 0) {
      return { items: [], currency: 'USD', subtotal: new Prisma.Decimal(0) };
    }
    return this.pricing.buildPricedItems(
      cart.merchantId,
      cart.sourceChannel,
      cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );
  }

  /** Presents a cart the caller has already authorized (the POS path). */
  presentCart(cart: LoadedCart) {
    return this.present(cart);
  }

  private async present(cart: LoadedCart) {
    const priced = await this.price(cart);
    const quote = cart.deliveryMethodId
      ? await this.delivery.quoteMethod(
          cart.merchantId,
          cart.deliveryMethodId,
          cart.shippingAddress,
          { itemCount: this.itemCount(priced), subtotal: priced.subtotal },
        )
      : null;
    const shipping = quote?.fee ?? new Prisma.Decimal(0);

    const notesByLineKey = new Map(
      cart.items.map((item) => [item.lineKey, item.note]),
    );
    const idsByLineKey = new Map(
      cart.items.map((item) => [item.lineKey, item.id]),
    );

    return {
      id: cart.id,
      status: cart.status,
      sourceChannel: cart.sourceChannel,
      customerId: cart.customerId,
      ownerId: cart.ownerId,
      customerName: cart.customerName,
      customerEmail: cart.customerEmail,
      customerPhone: cart.customerPhone,
      note: cart.note,
      currency: priced.currency,
      subtotalAmount: priced.subtotal.toString(),
      shippingAmount: shipping.toString(),
      totalAmount: priced.subtotal.plus(shipping).toString(),
      itemCount: this.itemCount(priced),
      items: priced.items.map((item) => {
        const lineKey = this.lineKey(item.productId, item.variantId);
        return {
          id: idsByLineKey.get(lineKey) ?? null,
          productId: item.productId,
          variantId: item.variantId ?? null,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          note: notesByLineKey.get(lineKey) ?? null,
        };
      }),
      shippingAddress: cart.shippingAddress
        ? toAddressSnapshot(cart.shippingAddress)
        : null,
      billingAddress: cart.billingAddress
        ? toAddressSnapshot(cart.billingAddress)
        : null,
      delivery: quote ? this.toOption(quote) : null,
      checkoutSessionId: cart.checkoutSessionId,
      expiresAt: cart.expiresAt,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private toOption(quote: DeliveryQuote) {
    return {
      methodId: quote.methodId,
      code: quote.code,
      name: quote.name,
      description: quote.description,
      type: quote.type,
      branchId: quote.branchId,
      isDefault: quote.isDefault,
      zoneId: quote.zoneId,
      zoneName: quote.zoneName,
      fee: quote.fee.toString(),
      estimatedMinDays: quote.estimatedMinDays,
      estimatedMaxDays: quote.estimatedMaxDays,
    };
  }

  private itemCount(priced: PricedCart) {
    return priced.items.reduce((total, item) => total + item.quantity, 0);
  }

  private toItemData(dto: CartItemInputDto) {
    return {
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      lineKey: this.lineKey(dto.productId, dto.variantId),
      quantity: dto.quantity,
      note: this.optional(dto.note),
    };
  }

  /** Same shape as `InventoryStock.stockKey`, for the same NULL-unique reason. */
  private lineKey(productId: string, variantId?: string | null) {
    return variantId ? `variant:${variantId}` : `product:${productId}`;
  }

  private expiry() {
    return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private optional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
