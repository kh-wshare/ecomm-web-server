import { ConflictException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CartPricingService } from './cart-pricing.service';

describe('CartPricingService', () => {
  const baseProduct = {
    id: 'product-1',
    merchantId: 'merchant-1',
    sku: 'SKU-1',
    name: 'Burger',
    price: new Prisma.Decimal(5),
    currency: 'USD',
    variants: [] as {
      id: string;
      sku: string;
      name: string;
      price: Prisma.Decimal;
      status: string;
    }[],
    channelVisibility: [
      { channel: SalesChannel.POS, isVisible: true, isPurchasable: true },
    ],
  };

  const createHarness = (products: (typeof baseProduct)[] = [baseProduct]) => {
    const findMany = jest.fn().mockResolvedValue(products);
    const prisma = { product: { findMany } } as unknown as PrismaService;
    return { service: new CartPricingService(prisma), findMany };
  };

  it('prices a simple single-item cart', async () => {
    const { service } = createHarness();

    const result = await service.buildPricedItems(
      'merchant-1',
      SalesChannel.POS,
      [{ productId: 'product-1', quantity: 2 }],
    );

    expect(result.currency).toBe('USD');
    expect(result.subtotal.toString()).toBe('10');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      productId: 'product-1',
      quantity: 2,
    });
    expect(result.items[0].unitPrice.toString()).toBe('5');
    expect(result.items[0].totalPrice.toString()).toBe('10');
  });

  it('rejects a product that is not purchasable on the channel', async () => {
    const { service } = createHarness([
      {
        ...baseProduct,
        channelVisibility: [
          { channel: SalesChannel.POS, isVisible: true, isPurchasable: false },
        ],
      },
    ]);

    await expect(
      service.buildPricedItems('merchant-1', SalesChannel.POS, [
        { productId: 'product-1', quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate stock targets in the same cart', async () => {
    const { service } = createHarness();

    await expect(
      service.buildPricedItems('merchant-1', SalesChannel.POS, [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-1', quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an inactive variant', async () => {
    const { service } = createHarness([
      {
        ...baseProduct,
        variants: [
          {
            id: 'variant-1',
            sku: 'SKU-1-V',
            name: 'Large',
            price: new Prisma.Decimal(6),
            status: 'INACTIVE',
          },
        ],
      },
    ]);

    await expect(
      service.buildPricedItems('merchant-1', SalesChannel.POS, [
        { productId: 'product-1', variantId: 'variant-1', quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when a requested product is missing from the catalog', async () => {
    const { service } = createHarness([]);

    await expect(
      service.buildPricedItems('merchant-1', SalesChannel.POS, [
        { productId: 'missing-product', quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
