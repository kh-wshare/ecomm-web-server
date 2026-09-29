import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { LoyaltyEntryType } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

/**
 * A deliberately small loyalty scheme: points accrue on the paid subtotal of
 * an order placed from a signed-in account, and reverse if that order is
 * refunded.
 *
 * Two rules do most of the work here, and both exist for a reason:
 *
 * - **Earning is gated on `order.ownerId`, not `order.customerId`.** A guest
 *   order links to a `Customer` as soon as someone types a matching email into
 *   the contact form, which proves nothing. Granting on `customerId` alone
 *   would let anyone who guesses a shopper's email top up that shopper's
 *   balance — the same trust problem `GuestAddressService.visibility` solves
 *   for addresses.
 * - **Every movement is a ledger row, uniquely keyed on `(orderId, type)`.**
 *   The paid transition is reachable from a webhook, a poll and a POS
 *   payment. Each entry point checks for its row before writing, under the
 *   caller's lock on the order, so repeats are no-ops. The unique index is
 *   only the backstop: inside a PostgreSQL transaction a caught conflict
 *   still aborts everything after it, so it must never be the normal path.
 *
 * Both entry points take the caller's transaction: points move in the same
 * commit as the payment that earned them, or not at all.
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grants points for an order that has just been paid in full. Safe to call
   * more than once for the same order; the second call is a no-op.
   */
  async grantForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        merchantId: true,
        customerId: true,
        ownerId: true,
        subtotalAmount: true,
        discountAmount: true,
        orderNumber: true,
      },
    });
    if (!order?.customerId || !order.ownerId) return;

    const merchant = await tx.merchant.findUnique({
      where: { id: order.merchantId },
      select: { loyaltyEnabled: true, loyaltyPointsPerUnit: true },
    });
    if (!merchant?.loyaltyEnabled) return;

    const points = this.pointsFor(
      order.subtotalAmount.sub(order.discountAmount),
      merchant.loyaltyPointsPerUnit,
    );
    if (points <= 0) return;

    if (await this.hasEntry(tx, order.id, LoyaltyEntryType.EARNED)) {
      this.logger.debug(`Loyalty already granted for order ${order.id}`);
      return;
    }
    await this.apply(tx, {
      merchantId: order.merchantId,
      customerId: order.customerId,
      orderId: order.id,
      type: LoyaltyEntryType.EARNED,
      points,
      note: `Order ${order.orderNumber}`,
    });
  }

  /**
   * Reverses a previous grant when an order is refunded. Reverses exactly what
   * was granted rather than recomputing it, so a merchant changing
   * `loyaltyPointsPerUnit` afterwards cannot leave a balance stranded.
   */
  async reverseForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const earned = await tx.loyaltyLedgerEntry.findUnique({
      where: { orderId_type: { orderId, type: LoyaltyEntryType.EARNED } },
      select: { merchantId: true, customerId: true, points: true },
    });
    if (!earned) return;
    if (await this.hasEntry(tx, orderId, LoyaltyEntryType.REVERSED)) return;

    await this.apply(tx, {
      merchantId: earned.merchantId,
      customerId: earned.customerId,
      orderId,
      type: LoyaltyEntryType.REVERSED,
      points: -earned.points,
      note: 'Refunded',
    });
  }

  /** The shopper's current balance and recent movements at one merchant. */
  async balanceFor(merchantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, merchantId, deletedAt: null },
      select: { id: true, loyaltyPoints: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const entries = await this.prisma.loyaltyLedgerEntry.findMany({
      where: { merchantId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        points: true,
        balanceAfter: true,
        note: true,
        orderId: true,
        createdAt: true,
      },
    });
    return {
      customerId: customer.id,
      balance: customer.loyaltyPoints,
      entries,
    };
  }

  /**
   * Writes one ledger row and moves the denormalised balance with it. The
   * increment and the insert share a transaction, so the balance can never
   * drift from the ledger that explains it.
   */
  private async apply(
    tx: Prisma.TransactionClient,
    entry: {
      merchantId: string;
      customerId: string;
      orderId: string | null;
      type: LoyaltyEntryType;
      points: number;
      note?: string;
    },
  ) {
    const customer = await tx.customer.update({
      where: { id: entry.customerId },
      data: { loyaltyPoints: { increment: entry.points } },
      select: { loyaltyPoints: true },
    });
    await tx.loyaltyLedgerEntry.create({
      data: {
        merchantId: entry.merchantId,
        customerId: entry.customerId,
        orderId: entry.orderId,
        type: entry.type,
        points: entry.points,
        balanceAfter: customer.loyaltyPoints,
        note: entry.note ?? null,
      },
    });
  }

  /** Whole points per whole currency unit; fractions of a unit earn nothing. */
  private pointsFor(amount: Prisma.Decimal, perUnit: number) {
    if (amount.lte(0) || perUnit <= 0) return 0;
    return amount.floor().mul(perUnit).toNumber();
  }

  private async hasEntry(
    tx: Prisma.TransactionClient,
    orderId: string,
    type: LoyaltyEntryType,
  ) {
    const entry = await tx.loyaltyLedgerEntry.findUnique({
      where: { orderId_type: { orderId, type } },
      select: { id: true },
    });
    return entry !== null;
  }
}
