import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Prisma } from '#app/generated/prisma/client';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { InventoryService } from '#app/modules/inventory/inventory.service';
import {
  AddressLike,
  AddressSnapshot,
  toAddressSnapshot,
} from '#app/modules/logistics/address-snapshot';
import { DeliveryQuoteService } from '#app/modules/logistics/delivery-quote.service';
import { OrderService } from '#app/modules/order/order.service';
import { CartPricingService } from '#app/modules/pricing/cart-pricing.service';
import { StorefrontContextService } from '#app/modules/storefront/context/storefront-context.service';
import { CreateCheckoutSessionDto } from './dto/checkout-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

/**
 * What the service accepts, as opposed to what the public endpoint validates.
 * Identical to `CreateCheckoutSessionDto` except that addresses may arrive in
 * any address-shaped form — `CartService` hands over `CustomerAddress` rows
 * straight from the shopper's address book rather than re-serialising them
 * into wire DTOs.
 */
export type CreateCheckoutSessionInput = Omit<
  CreateCheckoutSessionDto,
  'shippingAddress' | 'billingAddress'
> & {
  shippingAddress?: AddressLike | null;
  billingAddress?: AddressLike | null;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly orders: OrderService,
    private readonly pricing: CartPricingService,
    private readonly context: StorefrontContextService,
    private readonly delivery: DeliveryQuoteService,
  ) {}

  async create(dto: CreateCheckoutSessionInput, metadata: AuditMetadata) {
    if (dto.sourceChannel === 'POS') {
      throw new BadRequestException(
        'POS checkout requires an authenticated merchant flow',
      );
    }
    const merchantId = await this.context.resolveMerchantId(dto.merchantSlug);

    const {
      items: checkoutItems,
      currency,
      subtotal,
    } = await this.pricing.buildPricedItems(
      merchantId,
      dto.sourceChannel,
      dto.items,
    );
    const shippingAddress = dto.shippingAddress
      ? toAddressSnapshot(dto.shippingAddress)
      : null;
    const billingAddress = dto.billingAddress
      ? toAddressSnapshot(dto.billingAddress)
      : null;
    const delivery = await this.resolveDelivery(
      merchantId,
      dto.deliveryMethodId,
      shippingAddress,
      {
        itemCount: checkoutItems.reduce(
          (total, item) => total + item.quantity,
          0,
        ),
        subtotal,
      },
    );
    const shippingAmount = delivery?.fee ?? new Prisma.Decimal(0);
    const totalAmount = subtotal.plus(shippingAmount);

    const sessionId = randomUUID();
    const checkoutToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.checkoutSession.create({
        data: {
          id: sessionId,
          merchantId,
          customerId: dto.customerId,
          customerName: dto.customerName?.trim(),
          customerEmail: dto.customerEmail?.trim().toLowerCase(),
          customerPhone: dto.customerPhone?.trim(),
          sourceChannel: dto.sourceChannel,
          accessTokenHash: this.hashToken(checkoutToken),
          subtotalAmount: subtotal,
          shippingAmount,
          totalAmount,
          currency,
          deliveryMethodId: delivery?.methodId ?? null,
          deliveryMethodName: delivery?.name ?? null,
          shippingAddress: shippingAddress ?? Prisma.DbNull,
          billingAddress: billingAddress ?? Prisma.DbNull,
          expiresAt,
          items: { create: checkoutItems },
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          action: 'checkout.created',
          entityType: 'checkout_session',
          entityId: sessionId,
          after: {
            sourceChannel: dto.sourceChannel,
            itemCount: checkoutItems.length,
            shippingAmount: shippingAmount.toString(),
            totalAmount: totalAmount.toString(),
            expiresAt: expiresAt.toISOString(),
          },
          ...metadata,
        },
      });
    });

    try {
      await this.inventory.reserveCheckout(
        merchantId,
        null,
        sessionId,
        dto.sourceChannel,
        checkoutItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        expiresAt,
        metadata,
      );
    } catch (error) {
      await this.prisma.checkoutSession.delete({ where: { id: sessionId } });
      throw error;
    }

    const session = await this.loadSession(sessionId);
    return { ...this.toPublicSession(session), checkoutToken };
  }

  async findOne(sessionId: string, checkoutToken: string | undefined) {
    let session = await this.authenticate(sessionId, checkoutToken);
    if (
      session.status === 'ACTIVE' &&
      session.expiresAt.getTime() <= Date.now()
    ) {
      await this.orders.expireCheckout(sessionId);
      session = await this.authenticate(sessionId, checkoutToken);
    }
    return this.toPublicSession(session);
  }

  async confirm(
    sessionId: string,
    checkoutToken: string | undefined,
    metadata: AuditMetadata,
  ) {
    await this.authenticate(sessionId, checkoutToken);
    const order = await this.orders.confirmCheckout(sessionId, metadata);
    const session = await this.loadSession(sessionId);
    return { ...this.toPublicSession(session), order };
  }

  async cancel(
    sessionId: string,
    checkoutToken: string | undefined,
    metadata: AuditMetadata,
  ) {
    await this.authenticate(sessionId, checkoutToken);
    await this.orders.cancelCheckout(sessionId, metadata);
    const session = await this.loadSession(sessionId);
    return this.toPublicSession(session);
  }

  /**
   * Re-quotes the requested delivery method against the merchant's current
   * rates and this cart's address. The client sends only a method id — never a
   * fee — so a tampered or simply stale fee cannot reach an order.
   */
  private async resolveDelivery(
    merchantId: string,
    deliveryMethodId: string | undefined,
    shippingAddress: AddressSnapshot | null,
    cart: { itemCount: number; subtotal: Prisma.Decimal },
  ) {
    if (!deliveryMethodId) return null;
    const quote = await this.delivery.quoteMethod(
      merchantId,
      deliveryMethodId,
      shippingAddress,
      cart,
    );
    if (!quote) {
      throw new BadRequestException(
        'That delivery method is not available for this address',
      );
    }
    if (quote.type === 'DELIVERY' && !shippingAddress) {
      throw new BadRequestException(
        'A shipping address is required for this delivery method',
      );
    }
    return quote;
  }

  private async authenticate(sessionId: string, token: string | undefined) {
    if (!token) throw new UnauthorizedException('Checkout token is required');
    const session = await this.loadSession(sessionId);
    const actual = Buffer.from(session.accessTokenHash, 'hex');
    const supplied = Buffer.from(this.hashToken(token), 'hex');
    if (
      actual.length !== supplied.length ||
      !timingSafeEqual(actual, supplied)
    ) {
      throw new UnauthorizedException('Invalid checkout token');
    }
    return session;
  }

  private async loadSession(sessionId: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        items: true,
        order: { include: { items: true } },
        merchant: {
          select: {
            paymentProviders: {
              where: { status: 'ACTIVE' },
              select: { provider: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Checkout session not found');
    return session;
  }

  private toPublicSession<
    T extends {
      id: string;
      customerId: string | null;
      customerName: string | null;
      customerEmail: string | null;
      customerPhone: string | null;
      sourceChannel: string;
      status: string;
      subtotalAmount: { toString(): string };
      discountAmount: { toString(): string };
      feeAmount: { toString(): string };
      shippingAmount: { toString(): string };
      totalAmount: { toString(): string };
      currency: string;
      deliveryMethodId: string | null;
      deliveryMethodName: string | null;
      shippingAddress: unknown;
      billingAddress: unknown;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
      items: unknown[];
      order: { id: string; orderNumber: string; status: string } | null;
      merchant: {
        paymentProviders: Array<{ provider: string }>;
      };
    },
  >(session: T) {
    return {
      id: session.id,
      customerId: session.customerId,
      customerName: session.customerName,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      sourceChannel: session.sourceChannel,
      status: session.status,
      subtotalAmount: session.subtotalAmount.toString(),
      discountAmount: session.discountAmount.toString(),
      feeAmount: session.feeAmount.toString(),
      shippingAmount: session.shippingAmount.toString(),
      totalAmount: session.totalAmount.toString(),
      currency: session.currency,
      deliveryMethodId: session.deliveryMethodId,
      deliveryMethodName: session.deliveryMethodName,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      items: session.items,
      order: session.order
        ? {
            id: session.order.id,
            orderNumber: session.order.orderNumber,
            status: session.order.status,
          }
        : null,
      paymentProviders: session.merchant.paymentProviders.map((provider) => ({
        provider: provider.provider,
      })),
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
