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
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { InventoryService } from '#app/modules/inventory/inventory.service';
import { OrderService } from '#app/modules/order/order.service';
import { CartPricingService } from '#app/modules/pricing/cart-pricing.service';
import { CreateCheckoutSessionDto } from './dto/checkout-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly orders: OrderService,
    private readonly pricing: CartPricingService,
  ) {}

  async create(dto: CreateCheckoutSessionDto, metadata: AuditMetadata) {
    if (dto.sourceChannel === 'POS') {
      throw new BadRequestException(
        'POS checkout requires an authenticated merchant flow',
      );
    }
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        slug: dto.merchantSlug.trim().toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!merchant) throw new NotFoundException('Storefront not found');

    const {
      items: checkoutItems,
      currency,
      subtotal,
    } = await this.pricing.buildPricedItems(
      merchant.id,
      dto.sourceChannel,
      dto.items,
    );

    const sessionId = randomUUID();
    const checkoutToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + dto.expiresInMinutes * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.checkoutSession.create({
        data: {
          id: sessionId,
          merchantId: merchant.id,
          customerId: dto.customerId,
          customerName: dto.customerName?.trim(),
          customerEmail: dto.customerEmail?.trim().toLowerCase(),
          customerPhone: dto.customerPhone?.trim(),
          sourceChannel: dto.sourceChannel,
          accessTokenHash: this.hashToken(checkoutToken),
          subtotalAmount: subtotal,
          totalAmount: subtotal,
          currency,
          expiresAt,
          items: { create: checkoutItems },
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId: merchant.id,
          action: 'checkout.created',
          entityType: 'checkout_session',
          entityId: sessionId,
          after: {
            sourceChannel: dto.sourceChannel,
            itemCount: checkoutItems.length,
            totalAmount: subtotal.toString(),
            expiresAt: expiresAt.toISOString(),
          },
          ...metadata,
        },
      });
    });

    try {
      await this.inventory.reserveCheckout(
        merchant.id,
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
      totalAmount: { toString(): string };
      currency: string;
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
      totalAmount: session.totalAmount.toString(),
      currency: session.currency,
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
