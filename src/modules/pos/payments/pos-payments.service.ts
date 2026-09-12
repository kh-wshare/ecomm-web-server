import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { Prisma } from '#app/generated/prisma/client';
import {
  PaymentProviderCode,
  PaymentTransactionStatus,
} from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { OutboxService } from '#app/infrastructure/rabbitmq/outbox.service';
import {
  KhqrAdapter,
  KhqrConfig,
} from '#app/modules/payment/adapters/khqr.adapter';
import { EncryptedSecret } from '#app/modules/payment/payment-security.service';
import { OrderService } from '#app/modules/order/order.service';
import {
  CreatePosPaymentDto,
  CreatePosRefundDto,
} from './dto/pos-payment-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

type StoredProviderConfig = {
  settings: Record<string, unknown>;
  secrets: Record<string, EncryptedSecret>;
};

/**
 * POS-specific payment handling. Deliberately self-contained rather than
 * reusing `PaymentService.createIntent`/`confirmPayment`: those are built
 * around a single payment per order authenticated by a storefront checkout
 * token, and hardcode "one payment settles the whole order". POS needs
 * split/multi-tender payments authenticated by staff JWT instead, so this
 * service creates its own Payment rows (reusing the same adapters/schema)
 * and applies its own split-aware confirm/refund bookkeeping.
 */
@Injectable()
export class PosPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly khqr: KhqrAdapter,
    private readonly outbox: OutboxService,
    private readonly orders: OrderService,
  ) {}

  async create(
    merchantId: string,
    userId: string,
    orderId: string,
    dto: CreatePosPaymentDto,
    metadata: AuditMetadata,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['PENDING_PAYMENT', 'PAID'].includes(order.status)) {
      throw new PosDomainException(
        'INVALID_ORDER_STATE',
        `Cannot take payment on a ${order.status} order`,
        HttpStatus.CONFLICT,
      );
    }
    if (order.paymentStatus === 'PAID') {
      throw new PosDomainException(
        'PAYMENT_ALREADY_PAID',
        'Order is already fully paid',
        HttpStatus.CONFLICT,
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    const remaining = await this.remainingBalance(order.id, order.totalAmount);
    if (amount.gt(remaining)) {
      throw new PosDomainException(
        'INVALID_PAYMENT_STATE',
        'Payment amount exceeds the order’s remaining balance',
        HttpStatus.CONFLICT,
        { remaining: remaining.toString(), requested: amount.toString() },
      );
    }
    const currency = dto.currency ?? order.currency;

    if (dto.paymentMethod === 'CASH') {
      return this.createCashPayment(
        merchantId,
        userId,
        order,
        amount,
        currency,
        dto,
        metadata,
      );
    }
    return this.createKhqrPayment(
      merchantId,
      userId,
      order,
      amount,
      currency,
      dto,
      metadata,
    );
  }

  async findOne(merchantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, merchantId },
      include: { paymentProvider: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (
      payment.status === PaymentTransactionStatus.PENDING &&
      payment.provider === PaymentProviderCode.KHQR
    ) {
      const config = this.providerConfig(payment.paymentProvider.config);
      const bakongToken = config.secrets.bakongToken;
      if (bakongToken) {
        const verified = await this.khqr.checkPayment({
          config: config.settings as unknown as KhqrConfig,
          token: bakongToken,
          md5: payment.providerTransactionId,
        });
        if ((verified as { responseCode?: number }).responseCode === 0) {
          await this.applyConfirmedPayment(
            merchantId,
            undefined,
            payment.id,
            {},
          );
          return this.view(
            await this.prisma.payment.findUniqueOrThrow({
              where: { id: payment.id },
            }),
          );
        }
      }
    }
    return this.view(payment);
  }

  async refund(
    merchantId: string,
    userId: string,
    paymentId: string,
    dto: CreatePosRefundDto,
    metadata: AuditMetadata,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        merchantId,
        status: PaymentTransactionStatus.CONFIRMED,
      },
    });
    if (!payment) throw new NotFoundException('Confirmed payment not found');

    const alreadyRefunded = await this.prisma.paymentRefund.aggregate({
      where: { paymentId, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const refundedSoFar = alreadyRefunded._sum.amount ?? new Prisma.Decimal(0);
    const refundable = payment.amount.sub(refundedSoFar);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.gt(refundable)) {
      throw new PosDomainException(
        'INVALID_PAYMENT_STATE',
        'Refund amount exceeds the refundable balance for this payment',
        HttpStatus.CONFLICT,
        { refundable: refundable.toString() },
      );
    }

    const netPaidAfter = await this.netPaid(payment.orderId, {
      extraRefund: amount,
    });
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: payment.orderId },
    });
    const isFullOrderRefund = netPaidAfter.lte(0) && Boolean(dto.returnStock);

    let refund: { id: string; status: string };
    if (isFullOrderRefund) {
      await this.orders.refund(
        merchantId,
        order.id,
        userId,
        { returnStock: true },
        metadata,
      );
      refund = await this.prisma.paymentRefund.create({
        data: {
          merchantId,
          paymentId,
          orderId: order.id,
          amount,
          reason: dto.reason,
          status: 'SUCCESS',
          returnedStock: true,
          requestedById: userId,
        },
      });
    } else {
      refund = await this.prisma.$transaction(async (tx) => {
        const created = await tx.paymentRefund.create({
          data: {
            merchantId,
            paymentId,
            orderId: order.id,
            amount,
            reason: dto.reason,
            status: 'SUCCESS',
            returnedStock: false,
            requestedById: userId,
          },
        });
        await this.applyPaymentStatusFromLedger(tx, order.id);
        await tx.auditLog.create({
          data: {
            merchantId,
            userId,
            action: 'PAYMENT_REFUNDED',
            entityType: 'payment',
            entityId: paymentId,
            after: { refundId: created.id, amount: amount.toString() },
            ...metadata,
          },
        });
        return created;
      });
    }

    await this.outbox.write(this.prisma, {
      aggregateType: 'payment',
      aggregateId: paymentId,
      eventType: 'payment.refunded',
      merchantId,
      payload: {
        paymentId,
        orderId: order.id,
        branchId: order.branchId,
        amount: amount.toString(),
      },
    });

    return refund;
  }

  private async createCashPayment(
    merchantId: string,
    userId: string,
    order: {
      id: string;
      posShiftId: string | null;
      orderNumber: string;
      branchId: string | null;
    },
    amount: Prisma.Decimal,
    currency: string,
    dto: CreatePosPaymentDto,
    metadata: AuditMetadata,
  ) {
    const cashReceived = new Prisma.Decimal(dto.cashReceived ?? dto.amount);
    if (cashReceived.lt(amount)) {
      throw new PosDomainException(
        'INVALID_PAYMENT_STATE',
        'Cash received is below the payment amount',
        HttpStatus.CONFLICT,
      );
    }
    const provider = await this.requireProvider(
      merchantId,
      PaymentProviderCode.CASH,
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          merchantId,
          orderId: order.id,
          posShiftId: order.posShiftId,
          paymentProviderId: provider.id,
          provider: PaymentProviderCode.CASH,
          providerTransactionId: `cash:${randomUUID()}`,
          amount,
          currency,
          status: PaymentTransactionStatus.CONFIRMED,
          paidAt: new Date(),
          metadata: {
            orderItemIds: dto.orderItemIds ?? [],
            cashReceived: cashReceived.toString(),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'PAYMENT_CREATED',
          entityType: 'payment',
          entityId: created.id,
          after: {
            provider: 'CASH',
            amount: amount.toString(),
            orderId: order.id,
          },
          ...metadata,
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'PAYMENT_SUCCESS',
          entityType: 'payment',
          entityId: created.id,
          after: { provider: 'CASH', amount: amount.toString() },
          ...metadata,
        },
      });
      return created;
    });

    await this.applyConfirmedPayment(merchantId, userId, payment.id, metadata);
    await this.outbox.write(this.prisma, {
      aggregateType: 'payment',
      aggregateId: payment.id,
      eventType: 'payment.confirmed',
      merchantId,
      payload: {
        orderId: order.id,
        paymentId: payment.id,
        branchId: order.branchId,
        amount: amount.toString(),
      },
    });

    const change = this.maxZero(cashReceived.sub(amount));
    return {
      paymentId: payment.id,
      status: PaymentTransactionStatus.CONFIRMED,
      amount: amount.toString(),
      change: change.toString(),
    };
  }

  private async createKhqrPayment(
    merchantId: string,
    userId: string,
    order: {
      id: string;
      posShiftId: string | null;
      orderNumber: string;
      branchId: string | null;
    },
    amount: Prisma.Decimal,
    currency: string,
    dto: CreatePosPaymentDto,
    metadata: AuditMetadata,
  ) {
    const provider = await this.requireProvider(
      merchantId,
      PaymentProviderCode.KHQR,
    );
    const config = this.providerConfig(provider.config);
    const qr = this.khqr.createQr({
      config: config.settings as unknown as KhqrConfig,
      amount: amount.toString(),
      currency,
      billNumber: `POS-${order.orderNumber}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        orderId: order.id,
        posShiftId: order.posShiftId,
        paymentProviderId: provider.id,
        provider: PaymentProviderCode.KHQR,
        providerTransactionId: qr.reference,
        amount,
        currency,
        status: PaymentTransactionStatus.PENDING,
        metadata: { orderItemIds: dto.orderItemIds ?? [] },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'PAYMENT_CREATED',
        entityType: 'payment',
        entityId: payment.id,
        after: {
          provider: 'KHQR',
          amount: amount.toString(),
          orderId: order.id,
        },
        ...metadata,
      },
    });

    return {
      paymentId: payment.id,
      status: PaymentTransactionStatus.PENDING,
      qr: qr.qrPayload,
      expiresAt: qr.expiresAt,
    };
  }

  /**
   * Applies a just-confirmed payment's effect on the parent order: recomputes
   * paymentStatus from the sum of all CONFIRMED payments vs the order total,
   * and only once that sum fully covers the order does it transition the
   * order's ACTIVE inventory reservations to CONFIRMED (reserved -> sold).
   */
  private async applyConfirmedPayment(
    merchantId: string,
    userId: string | undefined,
    paymentId: string,
    metadata: AuditMetadata,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      if (payment.status !== PaymentTransactionStatus.PENDING) {
        // KHQR poll path calls this after already fetching a fresh row; CASH
        // path passes an already-CONFIRMED payment. Only PENDING needs a flip.
        if (payment.status === PaymentTransactionStatus.CONFIRMED) {
          await this.applyPaymentStatusFromLedger(tx, payment.orderId);
        }
        return;
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentTransactionStatus.CONFIRMED,
          paidAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'PAYMENT_SUCCESS',
          entityType: 'payment',
          entityId: paymentId,
          after: { status: 'CONFIRMED' },
          ...metadata,
        },
      });
      await this.applyPaymentStatusFromLedger(tx, payment.orderId);
    });
  }

  private async applyPaymentStatusFromLedger(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const net = await this.netPaid(orderId, {}, tx);

    if (net.gte(order.totalAmount) && order.paymentStatus !== 'PAID') {
      await this.confirmOrderReservations(tx, order.merchantId, orderId);
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paymentStatus: 'PAID', paidAt: new Date() },
      });
    } else if (net.gt(0) && net.lt(order.totalAmount)) {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PARTIAL' },
      });
    } else if (net.lte(0) && order.paymentStatus !== 'PENDING') {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PENDING' },
      });
    }
  }

  private async confirmOrderReservations(
    tx: Prisma.TransactionClient,
    merchantId: string,
    orderId: string,
  ) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: 'ACTIVE' },
      orderBy: { inventoryStockId: 'asc' },
    });
    for (const reservation of reservations) {
      const stockRows = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          variantId: string | null;
          reservedStock: number;
        }>
      >(Prisma.sql`
        SELECT "id", "productId", "variantId", "reservedStock"
        FROM "inventory_stocks"
        WHERE "id" = CAST(${reservation.inventoryStockId} AS uuid)
          AND "merchantId" = CAST(${merchantId} AS uuid)
        FOR UPDATE
      `);
      const stock = stockRows[0];
      if (!stock || stock.reservedStock < reservation.quantity) continue;

      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' },
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
          merchantId,
          inventoryStockId: stock.id,
          productId: stock.productId,
          variantId: stock.variantId,
          type: 'SOLD',
          quantity: reservation.quantity,
          referenceId: orderId,
          referenceType: 'pos_order_payment',
        },
      });
    }
  }

  private async netPaid(
    orderId: string,
    extra: { extraRefund?: Prisma.Decimal },
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const [paid, refunded] = await Promise.all([
      client.payment.aggregate({
        where: { orderId, status: PaymentTransactionStatus.CONFIRMED },
        _sum: { amount: true },
      }),
      client.paymentRefund.aggregate({
        where: { orderId, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);
    const paidTotal = paid._sum.amount ?? new Prisma.Decimal(0);
    const refundedTotal = (refunded._sum.amount ?? new Prisma.Decimal(0)).add(
      extra.extraRefund ?? new Prisma.Decimal(0),
    );
    return paidTotal.sub(refundedTotal);
  }

  private async remainingBalance(orderId: string, totalAmount: Prisma.Decimal) {
    const net = await this.netPaid(orderId, {});
    return this.maxZero(totalAmount.sub(net));
  }

  private async requireProvider(
    merchantId: string,
    provider: PaymentProviderCode,
  ) {
    const existing = await this.prisma.paymentProvider.findUnique({
      where: { merchantId_provider: { merchantId, provider } },
    });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        throw new PosDomainException(
          'INVALID_PAYMENT_STATE',
          `${provider} payment provider is not active`,
          HttpStatus.CONFLICT,
        );
      }
      return existing;
    }
    if (provider === PaymentProviderCode.CASH) {
      return this.prisma.paymentProvider.create({
        data: {
          merchantId,
          provider: PaymentProviderCode.CASH,
          config: { settings: {} },
          status: 'ACTIVE',
        },
      });
    }
    throw new PosDomainException(
      'INVALID_PAYMENT_STATE',
      `${provider} payment provider is not configured for this merchant`,
      HttpStatus.CONFLICT,
    );
  }

  private providerConfig(value: Prisma.JsonValue): StoredProviderConfig {
    const config = (value ?? {}) as Record<string, unknown>;
    return {
      settings:
        config.settings &&
        typeof config.settings === 'object' &&
        !Array.isArray(config.settings)
          ? (config.settings as Record<string, unknown>)
          : {},
      secrets:
        config.secrets &&
        typeof config.secrets === 'object' &&
        !Array.isArray(config.secrets)
          ? (config.secrets as Record<string, EncryptedSecret>)
          : {},
    };
  }

  private view(payment: {
    id: string;
    orderId: string;
    provider: PaymentProviderCode;
    providerTransactionId: string;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentTransactionStatus;
    paidAt: Date | null;
  }) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
    };
  }

  private maxZero(value: Prisma.Decimal) {
    return value.lt(0) ? new Prisma.Decimal(0) : value;
  }
}
