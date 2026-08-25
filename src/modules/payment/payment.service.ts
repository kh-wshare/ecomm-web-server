import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Prisma } from '#app/generated/prisma/client';
import { PaymentProviderCode } from '#app/generated/prisma/enums';
import { PaginatedResult } from '#app/common/responses/pagination.response';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { EventBusService } from '#app/infrastructure/events/event-bus.service';
import { NotificationService } from '#app/modules/notification/notification.service';
import {
  ConnectPaymentProviderDto,
  CreatePaymentIntentDto,
  PaymentQueryDto,
} from './dto/payment-input.dto';
import {
  EncryptedSecret,
  PaymentSecurityService,
} from './payment-security.service';
import {
  isPaymentConfirmationApplied,
  shouldRetryWebhookEvent,
} from './payment-webhook-policy';
import { KhqrAdapter, KhqrConfig } from './adapters/khqr.adapter';
import { PayWayAdapter, PayWayConfig } from './adapters/payway.adapter';
import { PaymentWebhookDto } from '../storefront/payment-webhook/dto/payment-webhook-resp.dto';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type LockedStock = {
  id: string;
  merchantId: string;
  productId: string;
  variantId: string | null;
  reservedStock: number;
  soldStock: number;
};

type StoredProviderConfig = {
  settings: Record<string, unknown>;
  webhookSecret?: EncryptedSecret;
  secrets: Record<string, EncryptedSecret>;
};

const PAYWAY_BASE_URLS = {
  SANDBOX: 'https://checkout-sandbox.payway.com.kh',
  PRODUCTION: 'https://checkout.payway.com.kh',
} as const;

const PAYWAY_PAYMENT_OPTIONS = [
  'abapay_khqr',
  'cards',
  'abapay',
  'khqr',
] as const;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly security: PaymentSecurityService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationService,
    private readonly payway: PayWayAdapter,
    private readonly khqr: KhqrAdapter,
  ) { }

  async connectProvider(
    merchantId: string,
    userId: string,
    dto: ConnectPaymentProviderDto,
    metadata: RequestMetadata,
  ) {
    const config = this.buildProviderConfig(dto);
    const provider = await this.prisma.$transaction(async (tx) => {
      const before = await tx.paymentProvider.findUnique({
        where: {
          merchantId_provider: { merchantId, provider: dto.provider },
        },
      });
      const updated = await tx.paymentProvider.upsert({
        where: {
          merchantId_provider: { merchantId, provider: dto.provider },
        },
        create: {
          merchantId,
          provider: dto.provider,
          config,
          status: dto.status,
        },
        update: { config, status: dto.status },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: before
            ? 'payment_provider.updated'
            : 'payment_provider.connected',
          entityType: 'payment_provider',
          entityId: updated.id,
          before: before
            ? { provider: before.provider, status: before.status }
            : undefined,
          after: { provider: updated.provider, status: updated.status },
          ...metadata,
        },
      });
      return updated;
    });
    return this.providerView(provider);
  }

  async listProviders(merchantId: string) {
    const providers = await this.prisma.paymentProvider.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((provider) => this.providerView(provider));
  }

  async disconnectProvider(
    merchantId: string,
    userId: string,
    providerCode: PaymentProviderCode,
    metadata: RequestMetadata,
  ) {
    const provider = await this.prisma.$transaction(async (tx) => {
      const current = await tx.paymentProvider.findUnique({
        where: {
          merchantId_provider: { merchantId, provider: providerCode },
        },
      });
      if (!current) throw new NotFoundException('Payment provider not found');
      const updated = await tx.paymentProvider.update({
        where: { id: current.id },
        data: { status: 'INACTIVE' },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'payment_provider.disconnected',
          entityType: 'payment_provider',
          entityId: current.id,
          before: { provider: current.provider, status: current.status },
          after: { provider: updated.provider, status: updated.status },
          ...metadata,
        },
      });
      return updated;
    });

    return this.providerView(provider);
  }

  async findAll(merchantId: string, query: PaymentQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      merchantId,
      provider: query.provider,
      status: query.status,
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: this.endOfDay(query.dateTo) }),
        },
      }),
      ...(query.search && {
        OR: [
          {
            providerTransactionId: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            order: {
              orderNumber: {
                contains: query.search.trim(),
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };
    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return new PaginatedResult(
      payments.map((payment) => ({
        ...this.paymentView(payment),
        order: payment.order,
      })),
      query.take,
      query.page ?? 1,
      total,
    );
  }

  async createIntent(dto: CreatePaymentIntentDto, metadata: RequestMetadata) {
    const candidate = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { checkoutSession: true },
    });
    if (!candidate) throw new NotFoundException('Order not found');
    this.verifyCheckoutToken(
      candidate.checkoutSession.accessTokenHash,
      dto.checkoutToken,
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      await this.lockCheckout(tx, candidate.checkoutSessionId);
      await this.lockOrder(tx, candidate.merchantId, candidate.id);
      const order = await tx.order.findUnique({
        where: { id: candidate.id },
        include: { payment: true, checkoutSession: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      this.verifyCheckoutToken(
        order.checkoutSession.accessTokenHash,
        dto.checkoutToken,
      );
      if (
        order.status !== 'PENDING_PAYMENT' ||
        order.paymentStatus !== 'PENDING' ||
        order.checkoutSession.status !== 'CONFIRMED'
      ) {
        throw new ConflictException('Order is not awaiting payment');
      }
      if (order.totalAmount.lte(0)) {
        throw new ConflictException(
          'Order total does not require a payment intent',
        );
      }
      if (order.payment) {
        if (order.payment.provider !== dto.provider) {
          throw new ConflictException(
            'Order already has an intent with another provider',
          );
        }
        return order.payment;
      }
      const provider = await tx.paymentProvider.findUnique({
        where: {
          merchantId_provider: {
            merchantId: order.merchantId,
            provider: dto.provider,
          },
        },
      });
      if (!provider || provider.status !== 'ACTIVE') {
        throw new ConflictException('Payment provider is not active');
      }
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: order.id },
      });
      if (
        !reservations.length ||
        reservations.some(
          (reservation) =>
            reservation.status !== 'ACTIVE' ||
            reservation.expiresAt.getTime() <= Date.now(),
        )
      ) {
        throw new ConflictException('Order inventory reservation has expired');
      }
      const payment = await tx.payment.create({
        data: {
          merchantId: order.merchantId,
          orderId: order.id,
          paymentProviderId: provider.id,
          provider: provider.provider,
          providerTransactionId: this.transactionId(provider.provider),
          amount: order.totalAmount,
          currency: order.currency,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId: order.merchantId,
          action: 'payment.intent_created',
          entityType: 'payment',
          entityId: payment.id,
          after: {
            orderId: order.id,
            provider: payment.provider,
            providerTransactionId: payment.providerTransactionId,
            amount: payment.amount.toString(),
            currency: payment.currency,
          },
          ...metadata,
        },
      });
      return payment;
    });
    const view = this.paymentView(payment);
    if (payment.provider === PaymentProviderCode.KHQR) {
      const provider = await this.prisma.paymentProvider.findUniqueOrThrow({
        where: { id: payment.paymentProviderId },
      });
      const config = this.providerConfig(provider.config);
      const year = new Date().getFullYear();
      const billNumber = `INV-${year}-${"00001".toString().padStart(3, '0')}`
      const action = this.khqr.createQr({
        config: config.settings as unknown as KhqrConfig,
        amount: payment.amount.toString(),
        currency: payment.currency,
        billNumber,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: action.reference },
      });
      return {
        ...this.paymentView(updated),
        action: { type: action.type, qrPayload: action.qrPayload },
      };
    }
    if (payment.provider !== PaymentProviderCode.ABA_PAYWAY) return view;
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: payment.orderId },
      include: { items: true },
    });
    const provider = await this.prisma.paymentProvider.findUniqueOrThrow({
      where: { id: payment.paymentProviderId },
    });
    const config = this.providerConfig(provider.config);
    const action = await this.payway.createQr({
      config: config.settings as unknown as PayWayConfig,
      apiKey: config.secrets.apiKey,
      paymentReference: payment.providerTransactionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      customer: this.paywayCustomer(order),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice.toString(),
      })),
      returnParams: Buffer.from(
        JSON.stringify({ paymentId: payment.id }),
      ).toString('base64'),
    });
    return { ...view, action };
  }

  async findOne(merchantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, merchantId },
      include: {
        paymentProvider: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
          },
        },
        webhookEvents: {
          select: {
            id: true,
            eventId: true,
            status: true,
            error: true,
            processedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      ...this.paymentView(payment),
      order: payment.order,
      webhookEvents: payment.webhookEvents,
    };
  }

  async findByToken(paymentId: string, checkoutToken?: string) {
    if (!checkoutToken) {
      throw new UnauthorizedException('Checkout token is required');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentProvider: true,
        order: {
          include: {
            checkoutSession: { select: { accessTokenHash: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    this.verifyCheckoutToken(
      payment.order.checkoutSession.accessTokenHash,
      checkoutToken,
    );
    if (payment.provider === PaymentProviderCode.KHQR && payment.status === 'PENDING') {
      const config = this.providerConfig(payment.paymentProvider.config);
      const verified = await this.khqr.checkPayment({
        config: config.settings as unknown as KhqrConfig,
        token: config.secrets.bakongToken,
        md5: payment.providerTransactionId,
      });
      if (verified.responseCode === 0) {
        const dto: PaymentWebhookDto = {
          eventId: `khqr:${payment.providerTransactionId}`,
          paymentId: payment.id,
          providerTransactionId: payment.providerTransactionId,
          status: 'CONFIRMED',
          amount: payment.amount.toString(),
          currency: payment.currency,
        };
        const event = await this.createWebhookEvent(payment, dto);
        if (event.shouldProcess)
          await this.confirmPayment(payment.id, event.record.id, dto, {});
        const refreshed = await this.prisma.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        return this.paymentView(refreshed);
      }
    }
    return this.paymentView(payment);
  }

  private endOfDay(value: string) {
    const date = new Date(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(23, 59, 59, 999);
    }

    return date;
  }

  async handleWebhook(
    providerCode: PaymentProviderCode,
    dto: PaymentWebhookDto,
    rawPayload: Buffer,
    signature: string | undefined,
    metadata: RequestMetadata,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { paymentProvider: true },
    });
    if (!payment || payment.provider !== providerCode) {
      throw new NotFoundException('Payment not found');
    }
    const providerConfig = this.providerConfig(payment.paymentProvider.config);
    if (
      !signature ||
      !providerConfig.webhookSecret ||
      !this.security.verifySignature(
        rawPayload,
        signature,
        providerConfig.webhookSecret,
      )
    ) {
      await this.logRejectedWebhook(
        payment,
        dto,
        rawPayload,
        'Invalid webhook signature',
        metadata,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = await this.createWebhookEvent(payment, dto);
    if (!event.shouldProcess) {
      return {
        duplicate: true,
        eventId: dto.eventId,
        eventStatus: event.record.status,
        payment: this.paymentView(payment),
      };
    }

    try {
      const result =
        dto.status === 'CONFIRMED'
          ? await this.confirmPayment(
            payment.id,
            event.record.id,
            dto,
            metadata,
          )
          : await this.failPayment(payment.id, event.record.id, dto, metadata);
      await this.notifications.syncOrderStockAlerts(
        result.payment.merchantId,
        result.payment.orderId,
      );
      this.events.publish(
        dto.status === 'CONFIRMED' ? 'payment.confirmed' : 'payment.failed',
        {
          merchantId: result.payment.merchantId,
          paymentId: result.payment.id,
          orderId: result.payment.orderId,
        },
      );
      return {
        duplicate: result.duplicate,
        eventId: dto.eventId,
        eventStatus: 'PROCESSED',
        payment: this.paymentView(result.payment),
      };
    } catch (error) {
      await this.logProcessingFailure(
        payment,
        event.record.id,
        error,
        metadata,
      );
      throw error;
    }
  }

  async handlePayWayCallback(
    payload: Record<string, unknown>,
    rawPayload: Buffer,
    signature: string | undefined,
    metadata: RequestMetadata,
  ) {
    const paymentId = this.paywayCallbackPaymentId(payload);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { paymentProvider: true },
    });
    if (!payment || payment.provider !== PaymentProviderCode.ABA_PAYWAY) {
      throw new NotFoundException('Payment not found');
    }
    const config = this.providerConfig(payment.paymentProvider.config);
    if (
      config.webhookSecret &&
      (!signature ||
        !this.security.verifySignature(
          rawPayload,
          signature,
          config.webhookSecret,
        ))
    ) {
      await this.logRejectedWebhook(
        payment,
        this.paywayWebhookDto(payment, payload, 'FAILED'),
        rawPayload,
        'Invalid PayWay callback signature',
        metadata,
      );
      throw new UnauthorizedException('Invalid PayWay callback signature');
    }
    const paywayTransactionId = this.requiredPaywayString(payload, 'tran_id');
    const verified = await this.payway.verifyTransaction({
      config: config.settings as unknown as PayWayConfig,
      apiKey: config.secrets.apiKey,
      transactionId: paywayTransactionId,
    });
    const approved =
      this.paywayScalar(verified.description)?.toLowerCase() === 'approved';
    const dto = this.paywayWebhookDto(
      payment,
      payload,
      approved ? 'CONFIRMED' : 'FAILED',
      verified,
    );
    const event = await this.createWebhookEvent(payment, dto);
    if (!event.shouldProcess)
      return {
        duplicate: true,
        eventId: dto.eventId,
        eventStatus: event.record.status,
        payment: this.paymentView(payment),
      };
    try {
      const result = approved
        ? await this.confirmPayment(payment.id, event.record.id, dto, metadata)
        : await this.failPayment(payment.id, event.record.id, dto, metadata);
      return {
        duplicate: result.duplicate,
        eventId: dto.eventId,
        eventStatus: 'PROCESSED',
        payment: this.paymentView(result.payment),
      };
    } catch (error) {
      await this.logProcessingFailure(
        payment,
        event.record.id,
        error,
        metadata,
      );
      throw error;
    }
  }

  private async confirmPayment(
    paymentId: string,
    eventRecordId: string,
    dto: PaymentWebhookDto,
    metadata: RequestMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: true },
      });
      await this.lockCheckout(tx, candidate.order.checkoutSessionId);
      await this.lockOrder(tx, candidate.merchantId, candidate.orderId);
      await this.lockPayment(tx, paymentId);
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: true },
      });
      this.assertWebhookMatches(payment, dto);
      if (isPaymentConfirmationApplied(payment.status)) {
        await tx.paymentWebhookEvent.update({
          where: { id: eventRecordId },
          data: { status: 'PROCESSED', processedAt: new Date(), error: null },
        });
        return { payment, duplicate: true };
      }
      if (payment.status !== 'PENDING') {
        throw new ConflictException(
          `Payment is already ${payment.status.toLowerCase()}`,
        );
      }
      if (
        payment.order.status !== 'PENDING_PAYMENT' ||
        payment.order.paymentStatus !== 'PENDING'
      ) {
        throw new ConflictException('Order is not awaiting payment');
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: payment.orderId },
        orderBy: { inventoryStockId: 'asc' },
      });
      if (!reservations.length) {
        throw new ConflictException('Order has no inventory reservation');
      }
      for (const candidateReservation of reservations) {
        const stock = await this.lockStock(
          tx,
          payment.merchantId,
          candidateReservation.inventoryStockId,
        );
        const reservation = await tx.inventoryReservation.findUniqueOrThrow({
          where: { id: candidateReservation.id },
        });
        if (
          reservation.status !== 'ACTIVE' ||
          reservation.expiresAt.getTime() <= Date.now()
        ) {
          throw new ConflictException('Inventory reservation has expired');
        }
        if (stock.reservedStock < reservation.quantity) {
          throw new ConflictException(
            'Inventory reservation balance is invalid',
          );
        }
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: 'CONFIRMED', orderId: payment.orderId },
        });
        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            reservedStock: { decrement: reservation.quantity },
            soldStock: { increment: reservation.quantity },
          },
        });
        await tx.inventoryMovement.create({
          data: {
            merchantId: payment.merchantId,
            inventoryStockId: stock.id,
            productId: stock.productId,
            variantId: stock.variantId,
            type: 'SOLD',
            quantity: reservation.quantity,
            referenceId: payment.id,
            referenceType: 'payment',
          },
        });
      }

      const paidAt = new Date();
      const confirmedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'CONFIRMED', paidAt },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paymentStatus: 'PAID', paidAt },
      });
      await tx.paymentWebhookEvent.update({
        where: { id: eventRecordId },
        data: { status: 'PROCESSED', processedAt: paidAt, error: null },
      });
      await this.notifications.createInTransaction(tx, {
        merchantId: payment.merchantId,
        dedupeKey: `payment:${payment.id}:confirmed`,
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment confirmed',
        message: `Payment for order ${payment.order.orderNumber} was confirmed.`,
        data: this.json({
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount.toString(),
          currency: payment.currency,
        }),
      });
      await tx.auditLog.create({
        data: {
          merchantId: payment.merchantId,
          action: 'payment.confirmed',
          entityType: 'payment',
          entityId: payment.id,
          before: { status: payment.status },
          after: {
            status: 'CONFIRMED',
            orderId: payment.orderId,
            providerTransactionId: payment.providerTransactionId,
          },
          ...metadata,
        },
      });
      return { payment: confirmedPayment, duplicate: false };
    });
  }

  private async failPayment(
    paymentId: string,
    eventRecordId: string,
    dto: PaymentWebhookDto,
    metadata: RequestMetadata,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: true },
      });
      await this.lockCheckout(tx, candidate.order.checkoutSessionId);
      await this.lockOrder(tx, candidate.merchantId, candidate.orderId);
      await this.lockPayment(tx, paymentId);
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: true },
      });
      this.assertWebhookMatches(payment, dto);
      if (payment.status === 'FAILED') {
        await tx.paymentWebhookEvent.update({
          where: { id: eventRecordId },
          data: { status: 'PROCESSED', processedAt: new Date(), error: null },
        });
        return { payment, duplicate: true };
      }
      if (payment.status !== 'PENDING') {
        throw new ConflictException(
          `Payment is already ${payment.status.toLowerCase()}`,
        );
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: payment.orderId, status: 'ACTIVE' },
        orderBy: { inventoryStockId: 'asc' },
      });
      for (const reservation of reservations) {
        const stock = await this.lockStock(
          tx,
          payment.merchantId,
          reservation.inventoryStockId,
        );
        if (stock.reservedStock < reservation.quantity) {
          throw new ConflictException(
            'Inventory reservation balance is invalid',
          );
        }
        const changed = await tx.inventoryReservation.updateMany({
          where: { id: reservation.id, status: 'ACTIVE' },
          data: { status: 'RELEASED' },
        });
        if (!changed.count) continue;
        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: { reservedStock: { decrement: reservation.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            merchantId: payment.merchantId,
            inventoryStockId: stock.id,
            productId: stock.productId,
            variantId: stock.variantId,
            type: 'RESERVATION_RELEASED',
            quantity: -reservation.quantity,
            referenceId: payment.id,
            referenceType: 'failed_payment',
          },
        });
      }

      const failedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' },
      });
      await tx.checkoutSession.update({
        where: { id: payment.order.checkoutSessionId },
        data: { status: 'CANCELLED' },
      });
      await tx.paymentWebhookEvent.update({
        where: { id: eventRecordId },
        data: { status: 'PROCESSED', processedAt: new Date(), error: null },
      });
      await this.notifications.createInTransaction(tx, {
        merchantId: payment.merchantId,
        dedupeKey: `payment:${payment.id}:failed`,
        type: 'PAYMENT_FAILED',
        title: 'Payment failed',
        message: `Payment for order ${payment.order.orderNumber} failed.`,
        data: this.json({
          paymentId: payment.id,
          orderId: payment.orderId,
        }),
      });
      await tx.auditLog.create({
        data: {
          merchantId: payment.merchantId,
          action: 'payment.failed',
          entityType: 'payment',
          entityId: payment.id,
          before: { status: payment.status },
          after: { status: 'FAILED', orderId: payment.orderId },
          ...metadata,
        },
      });
      return { payment: failedPayment, duplicate: false };
    });
  }

  private async createWebhookEvent(
    payment: {
      id: string;
      merchantId: string;
      paymentProviderId: string;
      provider: PaymentProviderCode;
    },
    dto: PaymentWebhookDto,
  ) {
    try {
      const record = await this.prisma.paymentWebhookEvent.create({
        data: {
          merchantId: payment.merchantId,
          paymentProviderId: payment.paymentProviderId,
          paymentId: payment.id,
          provider: payment.provider,
          eventId: dto.eventId,
          payload: this.json(dto),
        },
      });
      return { record, shouldProcess: true };
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const existing = await this.prisma.paymentWebhookEvent.findUniqueOrThrow({
        where: {
          paymentProviderId_eventId: {
            paymentProviderId: payment.paymentProviderId,
            eventId: dto.eventId,
          },
        },
      });
      if (!shouldRetryWebhookEvent(existing.status)) {
        return { record: existing, shouldProcess: false };
      }
      const record = await this.prisma.paymentWebhookEvent.update({
        where: { id: existing.id },
        data: {
          status: 'RECEIVED',
          error: null,
          processedAt: null,
          payload: this.json(dto),
        },
      });
      return { record, shouldProcess: true };
    }
  }

  private async logRejectedWebhook(
    payment: {
      id: string;
      merchantId: string;
      paymentProviderId: string;
      provider: PaymentProviderCode;
    },
    dto: PaymentWebhookDto,
    rawPayload: Buffer,
    error: string,
    metadata: RequestMetadata,
  ) {
    const eventId = `rejected:${this.security
      .fingerprint(rawPayload)
      .slice(0, 48)}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.upsert({
        where: {
          paymentProviderId_eventId: {
            paymentProviderId: payment.paymentProviderId,
            eventId,
          },
        },
        create: {
          merchantId: payment.merchantId,
          paymentProviderId: payment.paymentProviderId,
          paymentId: payment.id,
          provider: payment.provider,
          eventId,
          payload: this.json(dto),
          status: 'FAILED',
          error,
          processedAt: new Date(),
        },
        update: { error, processedAt: new Date() },
      });
      await this.writeWebhookFailureNotification(
        tx,
        payment.merchantId,
        payment.id,
        error,
        metadata,
      );
    });
  }

  private async logProcessingFailure(
    payment: { id: string; merchantId: string },
    eventRecordId: string,
    caught: unknown,
    metadata: RequestMetadata,
  ) {
    const error =
      caught instanceof Error
        ? caught.message.slice(0, 1_000)
        : 'Unknown error';
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.update({
        where: { id: eventRecordId },
        data: { status: 'FAILED', error, processedAt: new Date() },
      });
      await this.writeWebhookFailureNotification(
        tx,
        payment.merchantId,
        payment.id,
        error,
        metadata,
      );
    });
    this.events.publish('payment.webhook_failed', {
      merchantId: payment.merchantId,
      paymentId: payment.id,
      error,
    });
  }

  private async writeWebhookFailureNotification(
    tx: Prisma.TransactionClient,
    merchantId: string,
    paymentId: string,
    error: string,
    metadata: RequestMetadata,
  ) {
    await this.notifications.createInTransaction(tx, {
      merchantId,
      dedupeKey: `payment:${paymentId}:webhook-failed`,
      type: 'PAYMENT_WEBHOOK_FAILED',
      title: 'Payment webhook failed',
      message: error,
      data: this.json({ paymentId }),
    });
    await tx.auditLog.create({
      data: {
        merchantId,
        action: 'payment.webhook_failed',
        entityType: 'payment',
        entityId: paymentId,
        after: { error },
        ...metadata,
      },
    });
  }

  private assertWebhookMatches(
    payment: {
      providerTransactionId: string;
      amount: { equals(value: string): boolean };
      currency: string;
    },
    dto: PaymentWebhookDto,
  ) {
    if (payment.providerTransactionId !== dto.providerTransactionId) {
      throw new ConflictException('Provider transaction does not match');
    }
    if (
      !payment.amount.equals(dto.amount) ||
      payment.currency !== dto.currency
    ) {
      throw new ConflictException('Payment amount or currency does not match');
    }
  }

  private verifyCheckoutToken(expectedHash: string, token: string) {
    const expected = Buffer.from(expectedHash, 'hex');
    const supplied = Buffer.from(this.security.fingerprint(token), 'hex');
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new UnauthorizedException('Invalid checkout token');
    }
  }

  private safeSettings(config?: Record<string, unknown>) {
    const settings = config ?? {};
    const sensitiveKey = this.findSensitiveKey(settings);
    if (sensitiveKey) {
      throw new BadRequestException(
        `Secret config key "${sensitiveKey}" is not allowed`,
      );
    }
    return settings;
  }

  private buildProviderConfig(dto: ConnectPaymentProviderDto) {
    const settings = this.safeSettings(dto.config);

    switch (dto.provider) {
      case PaymentProviderCode.HMAC:
        if (!dto.webhookSecret) {
          throw new BadRequestException(
            'Webhook signing secret is required for HMAC',
          );
        }
        return this.json({
          settings,
          webhookSecret: this.security.encrypt(dto.webhookSecret),
          secrets: {},
        });

      case PaymentProviderCode.KHQR:
        return this.json({
          settings: this.khqrSettings(settings),
          secrets: {
            bakongToken: this.security.encrypt(
              this.requireSecret(dto.providerSecret, 'Bakong token'),
            ),
          },
        });

      case PaymentProviderCode.ABA_PAYWAY:
        return this.json({
          settings: this.paywaySettings(settings),
          secrets: {
            apiKey: this.security.encrypt(
              this.requireSecret(dto.providerSecret, 'PayWay API key'),
            ),
          },
          ...(dto.webhookSecret
            ? { webhookSecret: this.security.encrypt(dto.webhookSecret) }
            : {}),
        });

      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }

  private khqrSettings(settings: Record<string, unknown>) {
    return {
      accountId: this.requiredString(settings, 'accountId', 120),
      merchantName: this.requiredString(settings, 'merchantName', 120),
      merchantCity:
        this.optionalString(settings, 'merchantCity', 80) ?? 'Phnom Penh',
      baseUrl:
        this.optionalUrl(settings, 'baseUrl') ??
        'https://api-bakong.nbc.gov.kh',
      sourceAppName: this.optionalString(settings, 'sourceAppName', 80),
      sourceAppIconUrl: this.optionalUrl(settings, 'sourceAppIconUrl'),
      sourceAppCallbackUrl: this.optionalUrl(settings, 'sourceAppCallbackUrl'),
    };
  }

  private paywaySettings(settings: Record<string, unknown>) {
    const environment =
      this.optionalEnumSetting(settings, 'environment', [
        'SANDBOX',
        'PRODUCTION',
      ]) ?? 'SANDBOX';
    return {
      merchantId: this.requiredString(settings, 'merchantId', 120),
      environment,
      baseUrl:
        this.optionalUrl(settings, 'baseUrl') ?? PAYWAY_BASE_URLS[environment],
      paymentOption:
        this.optionalEnumSetting(
          settings,
          'paymentOption',
          PAYWAY_PAYMENT_OPTIONS,
        ) ?? 'abapay_khqr',
      returnUrl: this.optionalUrl(settings, 'returnUrl'),
      cancelUrl: this.optionalUrl(settings, 'cancelUrl'),
      callbackUrl: this.requiredUrl(settings, 'callbackUrl'),
      qrImageTemplate:
        this.optionalString(settings, 'qrImageTemplate', 80) ??
        'template3_color',
    };
  }

  private requireSecret(value: string | undefined, label: string) {
    if (!value) throw new BadRequestException(`${label} is required`);
    return value;
  }

  private requiredString(
    settings: Record<string, unknown>,
    key: string,
    maxLength: number,
  ) {
    const value = this.optionalString(settings, key, maxLength);
    if (!value) throw new BadRequestException(`${key} is required`);
    return value;
  }

  private optionalString(
    settings: Record<string, unknown>,
    key: string,
    maxLength: number,
  ) {
    const value = settings[key];
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${key} must be a string`);
    }
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${key} is too long`);
    }
    return trimmed;
  }

  private optionalUrl(settings: Record<string, unknown>, key: string) {
    const value = this.optionalString(settings, key, 500);
    if (!value) return undefined;

    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new BadRequestException(`${key} must be a valid URL`);
    }
  }

  private requiredUrl(settings: Record<string, unknown>, key: string) {
    const value = this.optionalUrl(settings, key);
    if (!value) throw new BadRequestException(`${key} is required`);
    return value;
  }

  private optionalEnumSetting<const Values extends readonly string[]>(
    settings: Record<string, unknown>,
    key: string,
    values: Values,
  ): Values[number] | undefined {
    const value = this.optionalString(settings, key, 80);
    if (!value) return undefined;
    if (!values.includes(value)) {
      throw new BadRequestException(
        `${key} must be one of ${values.join(', ')}`,
      );
    }
    return value;
  }

  private findSensitiveKey(
    value: unknown,
    path = 'config',
  ): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    for (const [key, nested] of Object.entries(value)) {
      const currentPath = `${path}.${key}`;
      if (/(secret|token|password|private.?key|api.?key)/i.test(key)) {
        return currentPath;
      }
      const nestedMatch = this.findSensitiveKey(nested, currentPath);
      if (nestedMatch) return nestedMatch;
    }
    return undefined;
  }

  private providerConfig(value: Prisma.JsonValue): StoredProviderConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ConflictException('Payment provider config is invalid');
    }
    const config = value as Record<string, unknown>;
    const secret = config.webhookSecret;
    if (secret && (typeof secret !== 'object' || Array.isArray(secret))) {
      throw new ConflictException('Payment provider secret is missing');
    }
    return {
      settings:
        config.settings &&
          typeof config.settings === 'object' &&
          !Array.isArray(config.settings)
          ? (config.settings as Record<string, unknown>)
          : {},
      webhookSecret: secret as EncryptedSecret | undefined,
      secrets:
        config.secrets &&
          typeof config.secrets === 'object' &&
          !Array.isArray(config.secrets)
          ? (config.secrets as Record<string, EncryptedSecret>)
          : {},
    };
  }

  private providerView<
    T extends {
      id: string;
      provider: PaymentProviderCode;
      status: string;
      config: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    },
  >(provider: T) {
    const config = this.providerConfig(provider.config);
    return {
      id: provider.id,
      provider: provider.provider,
      status: provider.status,
      config: config.settings,
      hasWebhookSecret: Boolean(config.webhookSecret),
      hasProviderSecret: Object.keys(config.secrets).length > 0,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  private paywayCallbackPaymentId(payload: Record<string, unknown>) {
    const value = payload.return_params ?? payload.return_param;
    if (typeof value !== 'string')
      throw new BadRequestException('PayWay callback is missing return_params');
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64').toString('utf8'),
      ) as { paymentId?: unknown };
      if (typeof parsed.paymentId !== 'string')
        throw new Error('missing payment ID');
      return parsed.paymentId;
    } catch {
      throw new BadRequestException('PayWay callback return_params is invalid');
    }
  }

  private requiredPaywayString(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`PayWay callback is missing ${key}`);
    }
    return value;
  }

  private paywayWebhookDto(
    payment: {
      id: string;
      providerTransactionId: string;
      amount: { toString(): string };
      currency: string;
    },
    payload: Record<string, unknown>,
    status: 'CONFIRMED' | 'FAILED',
    verified?: Record<string, unknown>,
  ): PaymentWebhookDto {
    const providerTransactionId = this.requiredPaywayString(payload, 'tran_id');
    const amount =
      verified?.payment_amount ??
      verified?.original_amount ??
      payment.amount.toString();
    const currency = verified?.original_currency ?? payment.currency;
    return {
      eventId: `payway:${providerTransactionId}`,
      paymentId: payment.id,
      providerTransactionId: payment.providerTransactionId,
      status,
      amount: this.paywayScalar(amount) ?? payment.amount.toString(),
      currency: (this.paywayScalar(currency) ?? payment.currency).toUpperCase(),
    };
  }

  private paywayScalar(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : undefined;
  }

  private paymentView<
    T extends {
      id: string;
      orderId: string;
      provider: PaymentProviderCode;
      providerTransactionId: string;
      amount: { toString(): string };
      currency: string;
      status: string;
      paidAt: Date | null;
      createdAt: Date;
    },
  >(payment: T) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  private paywayCustomer(order: {
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
  }) {
    const [firstName = 'Customer', ...rest] = (order.customerName ?? 'Customer')
      .trim()
      .split(/\s+/);
    return {
      firstName,
      lastName: rest.join(' ') || 'Customer',
      email: order.customerEmail ?? undefined,
      phone: order.customerPhone ?? undefined,
    };
  }

  private transactionId(provider: PaymentProviderCode) {
    return `${provider.toLowerCase()}_${randomBytes(18).toString('hex')}`;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private isUniqueConflict(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private async lockCheckout(
    tx: Prisma.TransactionClient,
    checkoutSessionId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "checkout_sessions"
      WHERE "id" = CAST(${checkoutSessionId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Checkout session not found');
  }

  private async lockOrder(
    tx: Prisma.TransactionClient,
    merchantId: string,
    orderId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "orders"
      WHERE "id" = CAST(${orderId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Order not found');
  }

  private async lockPayment(tx: Prisma.TransactionClient, paymentId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "payments"
      WHERE "id" = CAST(${paymentId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Payment not found');
  }

  private async lockStock(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockId: string,
  ) {
    const rows = await tx.$queryRaw<LockedStock[]>(Prisma.sql`
      SELECT *
      FROM "inventory_stocks"
      WHERE "id" = CAST(${stockId} AS uuid)
        AND "merchantId" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Inventory stock not found');
    return rows[0];
  }
}
