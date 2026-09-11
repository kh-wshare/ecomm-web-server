import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';

export interface CartItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface PricedCartItem {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
}

export interface PricedCart {
  items: PricedCartItem[];
  currency: string;
  subtotal: Prisma.Decimal;
}

/**
 * Prices a cart of product/variant lines for a given sales channel: loads
 * products + variants, validates channel visibility/purchasability and
 * variant status, rejects duplicate stock targets and mixed currencies, and
 * computes unit/total prices + subtotal.
 *
 * Extracted from what used to be near-identical copies in
 * `CheckoutService.create` and `PosService.buildCheckoutItems` — both now
 * call this instead of maintaining their own pricing logic, so kitchen/split
 * checkout work builds on one validated implementation.
 */
@Injectable()
export class CartPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async buildPricedItems(
    merchantId: string,
    channel: SalesChannel,
    items: CartItemInput[],
  ): Promise<PricedCart> {
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
        channelVisibility: { where: { channel } },
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

    const pricedItems = items.map((item): PricedCartItem => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new ConflictException('One or more products are unavailable');
      }
      const visibility = product.channelVisibility[0];
      if (!visibility?.isVisible || !visibility.isPurchasable) {
        throw new ConflictException(
          'Product is not purchasable on the selected channel',
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
        throw new ConflictException('Duplicate checkout stock item');
      }
      targetKeys.add(targetKey);
      if (currency && currency !== product.currency) {
        throw new ConflictException(
          'All checkout items must use the same currency',
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
        name: variant ? `${product.name} — ${variant.name}` : product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    return { items: pricedItems, currency: currency ?? 'USD', subtotal };
  }
}
