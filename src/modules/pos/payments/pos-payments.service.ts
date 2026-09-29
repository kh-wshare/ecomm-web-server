import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PosDomainException } from '#app/common/exceptions/pos-domain.exception';
import { Prisma } from '#app/generated/prisma/client';
import {
  PaymentProviderCode,
  PaymentTransactionStatus,
} from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { LoyaltyService } from '#app/modules/loyalty/loyalty.service';
import { OutboxService } from '#app/infrastructure/rabbitmq/outbox.service';
import {
  KhqrAdapter,
  KhqrConfig,
} from '#app/modules/payment/adapters/khqr.adapter';
import { EncryptedSecret } from '#app/modules/payment/payment-security.service';
import {
  OPEN_PAYMENT_STATUSES,
  paymentStatusFor,
  RECEIVED_PAYMENT_STATUSES,
} from '#app/modules/order/order-lifecycle';
import { OrderService } from '#app/modules/order/order.service';
import {
  CreatePosPaymentDto,
  CreatePosRefundDto,
} from './dto/pos-payment-input.dto';

type AuditMetadata = { ipAddress?: string; userAgent?: string };

type PayableOrder = {
  id: string;
  merchantId: string;
  posShiftId: string | null;
  orderNumber: string;
  branchId: string | null;
};

type LockedStockRow = {
  id: string;
  productId: string;
  variantId: string | null;
  reservedStock: number;
};

const LOCKED_STOCK_COLUMNS = Prisma.sql`
  "id",
  "product_id" AS "productId",
  "variant_id" AS "variantId",
  "reserved_stock" AS "reservedStock"
`;

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
    private readonly loyalty: LoyaltyService,
  ) {}

  async create(
    merchantId: string,
    userId: string,
    orderId: string,
    dto: CreatePosPaymentDto,
    metadata: AuditMetadata,
  ) {
    const amount = new Prisma.Decimal(dto.amount);
    const isCash = dto.paymentMethod === 'CASH';
    const cashReceived = new Prisma.Decimal(dto.cashReceived ?? dto.amount);
    if (isCash && cashReceived.lt(amount)) {
      throw new PosDomainException(
        'INVALID_PAYMENT_STATE',
        'Cash received is below the payment amount',
        HttpStatus.CONFLICT,
      );
    }
    const provider = await this.requireProvider(
      merchantId,
      isCash ? PaymentProviderCode.CASH : PaymentProviderCode.KHQR,
    );

    // The balance check and the payment it allows happen under one lock on
    // the order, so two terminals (or a double tap) cannot both take the
    // same remaining balance.
    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, merchantId, orderId);
      const order = await tx.order.findFirst({
        where: { id: orderId, merchantId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.paymentStatus === 'PAID') {
        throw new PosDomainException(
          'PAYMENT_ALREADY_PAID',
          'Order is already fully paid',
          HttpStatus.CONFLICT,
        );
      }
      if (order.status !== 'PENDING_PAYMENT') {
        throw new PosDomainException(
          'INVALID_ORDER_STATE',
          `Cannot take payment on a ${order.status} order`,
          HttpStatus.CONFLICT,
        );
      }
      await this.cancelLapsedKhqr(tx, order.id);
      const remaining = await this.outstanding(tx, order);
      if (amount.gt(remaining)) {
        throw new PosDomainException(
          'INVALID_PAYMENT_STATE',
          'Payment amount exceeds the order’s remaining balance',
          HttpStatus.CONFLICT,
          { remaining: remaining.toString(), requested: amount.toString() },
        );
      }
      const currency = dto.currency ?? order.currency;
      return isCash
        ? this.createCashPayment(tx, userId, order, provider.id, {
            amount,
            currency,
            cashReceived,
            dto,
            metadata,
          })
        : this.createKhqrPayment(tx, userId, order, provider, {
            amount,
            currency,
            dto,
            metadata,
          });
    });
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
          await this.settleKhqr(merchantId, payment.id);
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
    const candidate = await this.prisma.payment.findFirst({
      where: { id: paymentId, merchantId },
      select: { orderId: true },
    });
    if (!candidate) throw new NotFoundException('Confirmed payment not found');
    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, merchantId, candidate.orderId);
      await this.lockPayment(tx, paymentId);
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      if (!RECEIVED_PAYMENT_STATUSES.some((s) => s === payment.status)) {
        throw new NotFoundException('Confirmed payment not found');
      }
      const alreadyRefunded = await tx.paymentRefund.aggregate({
        where: { paymentId, status: 'SUCCESS' },
        _sum: { amount: true },
      });
      const refundedSoFar =
        alreadyRefunded._sum.amount ?? new Prisma.Decimal(0);
      const refundable = payment.amount.sub(refundedSoFar);
      if (amount.gt(refundable)) {
        throw new PosDomainException(
          'INVALID_PAYMENT_STATE',
          'Refund amount exceeds the refundable balance for this payment',
          HttpStatus.CONFLICT,
          { refundable: refundable.toString() },
        );
      }

      const refund = await tx.paymentRefund.create({
        data: {
          merchantId,
          paymentId,
          orderId: payment.orderId,
          amount,
          reason: dto.reason,
          status: 'SUCCESS',
          returnedStock: false,
          requestedById: userId,
        },
      });
      if (amount.gte(refundable)) {
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: PaymentTransactionStatus.REFUNDED },
        });
      }
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'PAYMENT_REFUNDED',
          entityType: 'payment',
          entityId: paymentId,
          after: { refundId: refund.id, amount: amount.toString() },
          ...metadata,
        },
      });

      // A part refund leaves the order paid — the customer no longer owes
      // the refunded amount. Only when everything received has gone back is
      // the order refunded, and only then can stock go back on the shelf.
      const { received, refunded } = await this.ledger(tx, payment.orderId);
      let result = refund;
      if (received.gt(0) && refunded.gte(received)) {
        const returnStock = Boolean(dto.returnStock);
        await this.orders.markRefundedInTx(tx, {
          merchantId,
          orderId: payment.orderId,
          userId,
          returnStock,
          metadata,
        });
        if (returnStock) {
          result = await tx.paymentRefund.update({
            where: { id: refund.id },
            data: { returnedStock: true },
          });
        }
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        select: { branchId: true },
      });
      await this.outbox.write(tx, {
        aggregateType: 'payment',
        aggregateId: paymentId,
        eventType: 'payment.refunded',
        merchantId,
        payload: {
          paymentId,
          orderId: payment.orderId,
          branchId: order.branchId,
          amount: amount.toString(),
        },
      });
      return result;
    });
  }

  private async createCashPayment(
    tx: Prisma.TransactionClient,
    userId: string,
    order: PayableOrder,
    providerId: string,
    input: {
      amount: Prisma.Decimal;
      currency: string;
      cashReceived: Prisma.Decimal;
      dto: CreatePosPaymentDto;
      metadata: AuditMetadata;
    },
  ) {
    const { amount, currency, cashReceived, dto, metadata } = input;
    const payment = await tx.payment.create({
      data: {
        merchantId: order.merchantId,
        orderId: order.id,
        posShiftId: order.posShiftId,
        paymentProviderId: providerId,
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
        merchantId: order.merchantId,
        userId,
        action: 'PAYMENT_CREATED',
        entityType: 'payment',
        entityId: payment.id,
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
        merchantId: order.merchantId,
        userId,
        action: 'PAYMENT_SUCCESS',
        entityType: 'payment',
        entityId: payment.id,
        after: { provider: 'CASH', amount: amount.toString() },
        ...metadata,
      },
    });
    await this.applyLedger(tx, order.id, userId);
    await this.outbox.write(tx, {
      aggregateType: 'payment',
      aggregateId: payment.id,
      eventType: 'payment.confirmed',
      merchantId: order.merchantId,
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
    tx: Prisma.TransactionClient,
    userId: string,
    order: PayableOrder,
    provider: { id: string; config: Prisma.JsonValue },
    input: {
      amount: Prisma.Decimal;
      currency: string;
      dto: CreatePosPaymentDto;
      metadata: AuditMetadata;
    },
  ) {
    const { amount, currency, dto, metadata } = input;
    const config = this.providerConfig(provider.config);
    // KHQR bill numbers are capped at 25 characters; the order number
    // (23) fits, a "POS-" prefix on it does not.
    const qr = this.khqr.createQr({
      config: config.settings as unknown as KhqrConfig,
      amount: amount.toString(),
      currency,
      billNumber: order.orderNumber,
    });

    const payment = await tx.payment.create({
      data: {
        merchantId: order.merchantId,
        orderId: order.id,
        posShiftId: order.posShiftId,
        paymentProviderId: provider.id,
        provider: PaymentProviderCode.KHQR,
        providerTransactionId: qr.reference,
        amount,
        currency,
        status: PaymentTransactionStatus.PENDING,
        metadata: {
          orderItemIds: dto.orderItemIds ?? [],
          khqr: {
            qrPayload: qr.qrPayload,
            expiresAt: qr.expiresAt.toISOString(),
            billNumber: order.orderNumber,
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        merchantId: order.merchantId,
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

  /** Records a KHQR that Bakong reports as paid, once. */
  private async settleKhqr(merchantId: string, paymentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { orderId: true },
      });
      await this.lockOrder(tx, merchantId, candidate.orderId);
      const changed = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentTransactionStatus.PENDING },
        data: {
          status: PaymentTransactionStatus.CONFIRMED,
          paidAt: new Date(),
        },
      });
      if (!changed.count) return;
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: { select: { branchId: true } } },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          action: 'PAYMENT_SUCCESS',
          entityType: 'payment',
          entityId: paymentId,
          after: { provider: 'KHQR', status: 'CONFIRMED' },
        },
      });
      await this.applyLedger(tx, payment.orderId, undefined);
      await this.outbox.write(tx, {
        aggregateType: 'payment',
        aggregateId: paymentId,
        eventType: 'payment.confirmed',
        merchantId,
        payload: {
          orderId: payment.orderId,
          paymentId,
          branchId: payment.order.branchId,
          amount: payment.amount.toString(),
        },
      });
    });
  }

  /**
   * Brings the order's payment status in line with the money on it, using
   * the same rule as the rest of the system (`paymentStatusFor`). Reaching
   * PAID sells the reserved stock and grants loyalty points. Call with the
   * order locked. Refunds are handled by `refund`, not here.
   */
  async applyLedger(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId: string | undefined,
  ) {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const { received, refunded } = await this.ledger(tx, orderId);
    const next = paymentStatusFor({
      total: order.totalAmount,
      received,
      refunded,
    });
    if (next === order.paymentStatus || next === 'REFUNDED') return;

    if (next === 'PAID') {
      await this.sellOrderStock(tx, order.merchantId, orderId, userId);
      await tx.order.update({
        where: { id: orderId },
        data: {
          ...(order.status === 'PENDING_PAYMENT' ? { status: 'PAID' } : {}),
          paymentStatus: 'PAID',
          paidAt: order.paidAt ?? new Date(),
        },
      });
      // A POS sale earns too, but only when it was rung up against a known
      // customer who holds an account — `grantForOrder` enforces that.
      await this.loyalty.grantForOrder(tx, orderId);
      return;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: next },
    });
  }

  /**
   * Moves the order's stock from reserved to sold. A stocked line whose
   * reservation is gone — released by an earlier sweep, say — is sold
   * straight from stock rather than skipped: the customer has paid for it,
   * and skipping would leave the goods on sale a second time.
   */
  private async sellOrderStock(
    tx: Prisma.TransactionClient,
    merchantId: string,
    orderId: string,
    userId: string | undefined,
  ) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: { in: ['ACTIVE', 'CONFIRMED'] } },
      orderBy: { inventoryStockId: 'asc' },
    });
    const covered = new Map<string, number>();
    for (const reservation of reservations) {
      covered.set(
        reservation.inventoryStockId,
        (covered.get(reservation.inventoryStockId) ?? 0) + reservation.quantity,
      );
      if (reservation.status !== 'ACTIVE') continue;
      const stock = await this.lockStockById(
        tx,
        merchantId,
        reservation.inventoryStockId,
      );
      if (!stock) continue;
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' },
      });
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          reservedStock: {
            decrement: Math.min(stock.reservedStock, reservation.quantity),
          },
          soldStock: { increment: reservation.quantity },
        },
      });
      await this.recordSold(tx, merchantId, stock, reservation.quantity, {
        orderId,
        userId,
        referenceType: 'pos_order_payment',
      });
    }

    const items = await tx.orderItem.findMany({
      where: { orderId, product: { trackStock: true } },
      select: { productId: true, variantId: true, quantity: true },
    });
    for (const item of items) {
      const stock = await this.lockStockByKey(
        tx,
        merchantId,
        item.variantId
          ? `variant:${item.variantId}`
          : `product:${item.productId}`,
      );
      if (!stock) continue;
      const missing = item.quantity - (covered.get(stock.id) ?? 0);
      if (missing <= 0) continue;
      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { soldStock: { increment: missing } },
      });
      await this.recordSold(tx, merchantId, stock, missing, {
        orderId,
        userId,
        referenceType: 'pos_order_payment_unreserved',
      });
    }
  }

  private async recordSold(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stock: LockedStockRow,
    quantity: number,
    reference: {
      orderId: string;
      userId: string | undefined;
      referenceType: string;
    },
  ) {
    await tx.inventoryMovement.create({
      data: {
        merchantId,
        inventoryStockId: stock.id,
        productId: stock.productId,
        variantId: stock.variantId,
        type: 'SOLD',
        quantity,
        referenceId: reference.orderId,
        referenceType: reference.referenceType,
        createdById: reference.userId ?? null,
      },
    });
  }

  /**
   * What is still left to pay: the total, less money received, less
   * attempts still in flight — a pending KHQR for the whole balance leaves
   * nothing for a second tender to take.
   */
  private async outstanding(
    tx: Prisma.TransactionClient,
    order: { id: string; totalAmount: Prisma.Decimal },
  ) {
    const [{ received }, open] = await Promise.all([
      this.ledger(tx, order.id),
      tx.payment.aggregate({
        where: { orderId: order.id, status: { in: OPEN_PAYMENT_STATUSES } },
        _sum: { amount: true },
      }),
    ]);
    return this.maxZero(
      order.totalAmount
        .sub(received)
        .sub(open._sum.amount ?? new Prisma.Decimal(0)),
    );
  }

  /** A KHQR whose QR can no longer be paid stops holding the balance. */
  private async cancelLapsedKhqr(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const open = await tx.payment.findMany({
      where: {
        orderId,
        provider: PaymentProviderCode.KHQR,
        status: { in: OPEN_PAYMENT_STATUSES },
      },
      select: { id: true, metadata: true, createdAt: true },
    });
    const now = Date.now();
    for (const payment of open) {
      const meta =
        payment.metadata &&
        typeof payment.metadata === 'object' &&
        !Array.isArray(payment.metadata)
          ? (payment.metadata as Record<string, unknown>)
          : {};
      const khqr = meta.khqr as { expiresAt?: unknown } | undefined;
      // QRs created before expiry was stored were valid for 15 minutes.
      const expiresAt =
        typeof khqr?.expiresAt === 'string'
          ? new Date(khqr.expiresAt).getTime()
          : payment.createdAt.getTime() + 15 * 60 * 1000;
      if (expiresAt > now) continue;
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentTransactionStatus.CANCELLED },
      });
    }
  }

  /** Money received on the order, and how much of it has gone back. */
  private async ledger(tx: Prisma.TransactionClient, orderId: string) {
    const [paid, refunds] = await Promise.all([
      tx.payment.aggregate({
        where: { orderId, status: { in: RECEIVED_PAYMENT_STATUSES } },
        _sum: { amount: true },
      }),
      tx.paymentRefund.aggregate({
        where: { orderId, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);
    return {
      received: paid._sum.amount ?? new Prisma.Decimal(0),
      refunded: refunds._sum.amount ?? new Prisma.Decimal(0),
    };
  }

  private async lockOrder(
    tx: Prisma.TransactionClient,
    merchantId: string,
    orderId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "orders"
      WHERE "id" = CAST(${orderId} AS uuid)
        AND "merchant_id" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    if (!rows[0]) throw new NotFoundException('Order not found');
  }

  private async lockPayment(tx: Prisma.TransactionClient, paymentId: string) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "payments"
      WHERE "id" = CAST(${paymentId} AS uuid)
      FOR UPDATE
    `);
  }

  private async lockStockById(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockId: string,
  ) {
    const rows = await tx.$queryRaw<LockedStockRow[]>(Prisma.sql`
      SELECT ${LOCKED_STOCK_COLUMNS}
      FROM "inventory_stocks"
      WHERE "id" = CAST(${stockId} AS uuid)
        AND "merchant_id" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    return rows[0];
  }

  private async lockStockByKey(
    tx: Prisma.TransactionClient,
    merchantId: string,
    stockKey: string,
  ) {
    const rows = await tx.$queryRaw<LockedStockRow[]>(Prisma.sql`
      SELECT ${LOCKED_STOCK_COLUMNS}
      FROM "inventory_stocks"
      WHERE "stock_key" = ${stockKey}
        AND "merchant_id" = CAST(${merchantId} AS uuid)
      FOR UPDATE
    `);
    return rows[0];
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
