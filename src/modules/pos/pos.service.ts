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
  ) {}

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

    const { checkoutItems, currency, subtotal } = await this.buildCheckoutItems(
      merchantId,
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

  private async buildCheckoutItems(merchantId: string, items: PosSaleItem[]) {
    const productIds = [...new Set(items.map(({ productId }) => productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        merchantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        variants: true,
        channelVisibility: { where: { channel: SalesChannel.POS } },
      },
    });
    if (products.length !== productIds.length) {
      throw new ConflictException('One or more products are unavailable');
    }

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const targetKeys = new Set<string>();
    let currency: string | undefined;
    let subtotal = new Prisma.Decimal(0);
    const checkoutItems = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new ConflictException('One or more products are unavailable');
      }
      const visibility = product.channelVisibility[0];
      if (!visibility?.isVisible || !visibility.isPurchasable) {
        throw new ConflictException(
          'Product is not purchasable on the POS channel',
        );
      }
      const variantId = item.variantId ?? undefined;
      const variant = variantId
        ? product.variants.find(({ id }) => id === variantId)
        : undefined;
      if (variantId && (!variant || variant.status !== 'ACTIVE')) {
        throw new ConflictException('Product variant is unavailable');
      }
      const targetKey = variantId
        ? `variant:${variantId}`
        : `product:${item.productId}`;
      if (targetKeys.has(targetKey)) {
        throw new ConflictException('Duplicate POS sale stock item');
      }
      targetKeys.add(targetKey);
      if (currency && currency !== product.currency) {
        throw new ConflictException(
          'All POS sale items must use the same currency',
        );
      }

      currency = product.currency;
      const unitPrice = variant?.price ?? product.price;
      const totalPrice = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(totalPrice);
      return {
        productId: product.id,
        variantId,
        sku: variant?.sku ?? product.sku,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    return { checkoutItems, currency: currency ?? 'USD', subtotal };
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
