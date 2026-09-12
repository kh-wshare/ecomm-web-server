import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { InventoryService } from '#app/modules/inventory/inventory.service';
import { OrderService } from '#app/modules/order/order.service';
import { CartPricingService } from '#app/modules/pricing/cart-pricing.service';
import { CreatePosSaleDto } from './dto/pos-sale-input.dto';

type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type PosSaleItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  category?: string;
  note?: string;
};

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly orders: OrderService,
    private readonly pricing: CartPricingService,
  ) {}

  /**
   * Single aggregate payload for the Flutter POS app's initial local-SQLite
   * seed, so it doesn't have to make a dozen separate calls on first launch.
   * `deviceId` (client-generated id) resolves which branch/tables to scope
   * to; without it, the merchant's default branch is used.
   */
  async bootstrap(
    merchantId: string,
    user: {
      id: string;
      fullName: string;
      role: string | null;
      permissions: string[];
    },
    deviceId?: string,
  ) {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
    });
    const branch = deviceId
      ? (
          await this.prisma.posDevice.findFirst({
            where: { merchantId, deviceId, status: 'ACTIVE', deletedAt: null },
            include: { branch: true },
          })
        )?.branch
      : await this.prisma.merchantBranch.findFirst({
          where: { merchantId, isDefault: true, deletedAt: null },
        });

    const [categories, products, tables, paymentProviders] = await Promise.all([
      this.prisma.productCategory.findMany({
        where: { merchantId, deletedAt: null, status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          merchantId,
          deletedAt: null,
          status: 'ACTIVE',
          channelVisibility: {
            some: {
              channel: SalesChannel.POS,
              isVisible: true,
              isPurchasable: true,
            },
          },
        },
        include: {
          variants: true,
          inventoryStocks: true,
        },
      }),
      branch
        ? this.prisma.posTable.findMany({
            where: { merchantId, branchId: branch.id, deletedAt: null },
          })
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof this.prisma.posTable.findMany>>,
          ),
      this.prisma.paymentProvider.findMany({
        where: { merchantId, status: 'ACTIVE' },
      }),
    ]);

    return {
      serverTime: new Date().toISOString(),
      tenant: { id: merchant.id, name: merchant.name, slug: merchant.slug },
      branch: branch
        ? { id: branch.id, name: branch.name, code: branch.code }
        : null,
      user: { id: user.id, name: user.fullName, role: user.role },
      permissions: user.permissions,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
      })),
      products: products.map((product) => {
        const stock = product.inventoryStocks.reduce(
          (totals, row) => ({
            totalStock: totals.totalStock + row.totalStock,
            reservedStock: totals.reservedStock + row.reservedStock,
            safetyBuffer: totals.safetyBuffer + row.safetyBuffer,
          }),
          { totalStock: 0, reservedStock: 0, safetyBuffer: 0 },
        );
        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price.toString(),
          currency: product.currency,
          stock: stock.totalStock,
          reservedStock: stock.reservedStock,
          safetyBuffer: stock.safetyBuffer,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            price: variant.price.toString(),
            attributes: variant.attributes,
          })),
          updatedAt: product.updatedAt.toISOString(),
        };
      }),
      productVariants: products.flatMap((product) =>
        product.variants.map((variant) => ({
          id: variant.id,
          productId: product.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price.toString(),
        })),
      ),
      modifiers: [],
      tables: tables.map((table) => ({
        id: table.id,
        name: table.name,
        status: table.status,
      })),
      paymentMethods: paymentProviders.map((provider) => provider.provider),
      settings: { returnStockOnRefund: merchant.returnStockOnRefund },
      syncCursor: this.encodeCursor(new Date(0)),
    };
  }

  private encodeCursor(value: Date) {
    return Buffer.from(value.toISOString()).toString('base64url');
  }

  /**
   * @deprecated Kept for existing callers; new integrations should use
   * `pos/devices` + `pos/shifts` + `pos/orders` + `pos/payments` instead,
   * which create real Payment records and support split tenders — this
   * path marks the order paid directly with no Payment row.
   */
  async createSale(
    merchantId: string,
    userId: string,
    cashierName: string,
    dto: CreatePosSaleDto,
    metadata: AuditMetadata,
  ) {
    const branch = await this.prisma.merchantBranch.findFirst({
      where: {
        id: dto.branchId,
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!branch) throw new NotFoundException('POS branch not found');

    const {
      items: checkoutItems,
      currency,
      subtotal,
    } = await this.pricing.buildPricedItems(
      merchantId,
      SalesChannel.POS,
      dto.items,
    );
    const discountAmount = this.money(dto.discountAmount);
    const serviceChargeAmount = this.money(dto.serviceChargeAmount);
    const taxAmount = this.money(dto.taxAmount);
    const feeAmount = serviceChargeAmount.add(taxAmount);
    const totalAmount = this.maxZero(
      subtotal.sub(discountAmount).add(feeAmount),
    );
    const cashReceived = this.money(dto.cashReceived);

    if (dto.paymentMethod === 'CASH' && cashReceived.lt(totalAmount)) {
      throw new ConflictException('Cash received is below the sale total');
    }

    const checkoutSessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.checkoutSession.create({
        data: {
          id: checkoutSessionId,
          merchantId,
          customerName: dto.customerName?.trim() || 'Walk-in customer',
          sourceChannel: SalesChannel.POS,
          accessTokenHash: this.hashToken(
            randomBytes(32).toString('base64url'),
          ),
          subtotalAmount: subtotal,
          discountAmount,
          feeAmount,
          totalAmount,
          currency,
          expiresAt,
          items: { create: checkoutItems },
        },
      });
      await tx.auditLog.create({
        data: {
          merchantId,
          userId,
          action: 'pos.checkout.created',
          entityType: 'checkout_session',
          entityId: checkoutSessionId,
          after: {
            branchId: branch.id,
            sourceChannel: SalesChannel.POS,
            itemCount: checkoutItems.length,
            subtotalAmount: subtotal.toString(),
            discountAmount: discountAmount.toString(),
            feeAmount: feeAmount.toString(),
            totalAmount: totalAmount.toString(),
          },
          ...metadata,
        },
      });
    });

    try {
      await this.inventory.reserveCheckout(
        merchantId,
        userId,
        checkoutSessionId,
        SalesChannel.POS,
        checkoutItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
        expiresAt,
        metadata,
      );
    } catch (error) {
      await this.prisma.checkoutSession.delete({
        where: { id: checkoutSessionId },
      });
      throw error;
    }

    const order = await this.orders.confirmCheckout(
      checkoutSessionId,
      metadata,
    );
    if (!order) throw new ConflictException('Unable to create POS order');

    const reservations = await this.prisma.inventoryReservation.findMany({
      where: { checkoutSessionId, status: 'ACTIVE' },
      orderBy: { inventoryStockId: 'asc' },
    });
    for (const reservation of reservations) {
      await this.inventory.confirm(
        merchantId,
        userId,
        { reservationId: reservation.id, orderId: order.id },
        metadata,
      );
    }

    const paidOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentStatus: 'PAID',
        paidAt: new Date(),
      },
      include: { items: true },
    });
    await this.prisma.auditLog.create({
      data: {
        merchantId,
        userId,
        action: 'pos.sale.completed',
        entityType: 'order',
        entityId: paidOrder.id,
        after: {
          orderNumber: paidOrder.orderNumber,
          branchId: branch.id,
          paymentMethod: dto.paymentMethod,
          cashReceived: cashReceived.toString(),
          changeDue: this.changeDue(
            dto.paymentMethod,
            cashReceived,
            totalAmount,
          ).toString(),
        },
        ...metadata,
      },
    });

    return {
      order: paidOrder,
      receipt: this.toReceipt({
        branchName: branch.name,
        cashierName,
        cashReceived,
        discountAmount,
        items: dto.items,
        order: paidOrder,
        paymentMethod: dto.paymentMethod,
        serviceChargeAmount,
        taxAmount,
        totalAmount,
      }),
    };
  }

  private toReceipt({
    branchName,
    cashierName,
    cashReceived,
    discountAmount,
    items,
    order,
    paymentMethod,
    serviceChargeAmount,
    taxAmount,
    totalAmount,
  }: {
    branchName: string;
    cashierName: string;
    cashReceived: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    items: PosSaleItem[];
    order: {
      id: string;
      orderNumber: string;
      customerName: string | null;
      createdAt: Date;
      subtotalAmount: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
      items: Array<{
        id: string;
        productId: string;
        variantId: string | null;
        sku: string;
        name: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }>;
    };
    paymentMethod: CreatePosSaleDto['paymentMethod'];
    serviceChargeAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
  }) {
    const requestedItemByTarget = new Map(
      items.map((item) => [
        this.targetKey(item.productId, item.variantId),
        item,
      ]),
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      branchName,
      cashierName,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName ?? 'Walk-in customer',
      items: order.items.map((item) => {
        const requested = requestedItemByTarget.get(
          this.targetKey(item.productId, item.variantId),
        );
        return {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          category: requested?.category ?? 'POS',
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          note: requested?.note ?? '',
        };
      }),
      subtotal: Number(order.subtotalAmount),
      discount: Number(discountAmount),
      serviceCharge: Number(serviceChargeAmount),
      tax: Number(taxAmount),
      total: Number(order.totalAmount),
      paymentMethod,
      cashReceived: Number(cashReceived),
      changeDue: Number(
        this.changeDue(paymentMethod, cashReceived, totalAmount),
      ),
    };
  }

  private changeDue(
    paymentMethod: CreatePosSaleDto['paymentMethod'],
    cashReceived: Prisma.Decimal,
    totalAmount: Prisma.Decimal,
  ) {
    return paymentMethod === 'CASH'
      ? this.maxZero(cashReceived.sub(totalAmount))
      : new Prisma.Decimal(0);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private maxZero(value: Prisma.Decimal) {
    return value.lt(0) ? new Prisma.Decimal(0) : value;
  }

  private money(value: number | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private targetKey(productId: string, variantId?: string | null) {
    return variantId ? `variant:${variantId}` : `product:${productId}`;
  }
}
