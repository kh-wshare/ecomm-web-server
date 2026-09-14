import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
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
import { StorefrontContextService } from '#app/modules/storefront/context/storefront-context.service';
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

const CART_TTL_DAYS = 30;

const cartInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  shippingAddress: true,
  billingAddress: true,
  deliveryMethod: { select: { id: true, name: true, code: true, type: true } },
} as const satisfies Prisma.CartInclude;

type LoadedCart = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

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

  async create(merchantSlug: string, dto: CreateCartDto) {
    const sourceChannel = dto.sourceChannel ?? SalesChannel.WEBSITE;
    if (sourceChannel === SalesChannel.POS) {
      throw new BadRequestException(
        'POS sells through its own flow, not a storefront cart',
      );
    }
    const merchantId = await this.context.resolveMerchantId(merchantSlug);
    const cartToken = randomBytes(32).toString('base64url');

    const cart = await this.prisma.cart.create({
      data: {
        merchantId,
        sourceChannel,
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

  async findOne(merchantSlug: string, cartId: string, token?: string) {
    const cart = await this.authenticate(merchantSlug, cartId, token);
    return this.present(cart);
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
  ) {
    const cart = await this.authenticateActive(merchantSlug, cartId, token);
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
      where: { cartId_lineKey: { cartId, lineKey } },
      create: { cartId, ...this.toItemData(dto) },
      update: {
        quantity,
        ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
      },
    });
    return this.reload(cartId);
  }

  async updateItem(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cart = await this.authenticateActive(merchantSlug, cartId, token);
    const item = cart.items.find((line) => line.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return this.reload(cartId);
    }
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        ...(dto.note !== undefined ? { note: this.optional(dto.note) } : {}),
      },
    });
    return this.reload(cartId);
  }

  async removeItem(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    itemId: string,
  ) {
    const cart = await this.authenticateActive(merchantSlug, cartId, token);
    if (!cart.items.some((line) => line.id === itemId)) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.reload(cartId);
  }

  async clear(merchantSlug: string, cartId: string, token?: string) {
    await this.authenticateActive(merchantSlug, cartId, token);
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    return this.reload(cartId);
  }

  async updateContact(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
    dto: UpdateCartContactDto,
  ) {
    await this.authenticateActive(merchantSlug, cartId, token);
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
  async deliveryOptions(merchantSlug: string, cartId: string, token?: string) {
    const cart = await this.authenticate(merchantSlug, cartId, token);
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
  ) {
    const cart = await this.authenticateActive(merchantSlug, cartId, token);
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
  ) {
    const cart = await this.authenticateActive(merchantSlug, cartId, token);
    if (cart.items.length === 0) {
      throw new ConflictException('Cart is empty');
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
   * Shared with `StorefrontAddressService`: verifies the cart token in
   * constant time and confirms the cart belongs to the storefront in the URL,
   * so a token for merchant A cannot read a cart under merchant B's slug.
   */
  async authenticate(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
  ): Promise<LoadedCart> {
    if (!token) throw new UnauthorizedException('Cart token is required');
    const merchantId = await this.context.resolveMerchantId(merchantSlug);
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, merchantId },
      include: cartInclude,
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const actual = Buffer.from(cart.accessTokenHash, 'hex');
    const supplied = Buffer.from(this.hashToken(token), 'hex');
    if (
      actual.length !== supplied.length ||
      !timingSafeEqual(actual, supplied)
    ) {
      throw new UnauthorizedException('Invalid cart token');
    }
    return cart;
  }

  /** As `authenticate`, but also rejects a converted or expired cart. */
  async authenticateActive(
    merchantSlug: string,
    cartId: string,
    token: string | undefined,
  ): Promise<LoadedCart> {
    const cart = await this.authenticate(merchantSlug, cartId, token);
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
