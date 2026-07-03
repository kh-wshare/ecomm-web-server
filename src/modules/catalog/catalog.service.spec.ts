import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '#app/generated/prisma/client';
import { ProductStatus, SalesChannel } from '#app/generated/prisma/enums';
import { PrismaService } from '#app/infrastructure/database/prisma.service';
import { CommerceCacheService } from '#app/infrastructure/redis/commerce-cache.service';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/product-input.dto';

describe('CatalogService', () => {
  const product = {
    id: 'product-1',
    merchantId: 'merchant-1',
    name: 'Classic Shirt',
    slug: 'classic-shirt',
    description: null,
    sku: 'SHIRT-001',
    price: new Prisma.Decimal('29.99'),
    currency: 'USD',
    status: ProductStatus.ACTIVE,
    variants: [],
    media: [],
    channelVisibility: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const createHarness = () => {
    const productCreate = jest.fn().mockResolvedValue(product);
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const tx = {
      product: { create: productCreate },
      auditLog: { create: auditCreate },
    };
    const transaction = jest
      .fn()
      .mockImplementation(
        (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
      );
    const prisma = {
      $transaction: transaction,
      product: { findFirst: jest.fn() },
    } as unknown as PrismaService;
    const invalidateCatalog = jest.fn().mockResolvedValue(undefined);
    const cache = {
      invalidateCatalog,
    } as unknown as CommerceCacheService;

    return {
      service: new CatalogService(prisma, cache),
      productCreate,
      auditCreate,
      invalidateCatalog,
    };
  };

  const createDto = (): CreateProductDto => ({
    name: '  Classic Shirt  ',
    sku: ' shirt-001 ',
    price: '29.99',
    currency: 'usd',
    status: ProductStatus.ACTIVE,
    channelVisibility: [
      {
        channel: SalesChannel.WEBSITE,
        isVisible: true,
        isPurchasable: true,
      },
    ],
  });

  it('normalizes product input, audits creation, and invalidates caches', async () => {
    const harness = createHarness();

    await expect(
      harness.service.create('merchant-1', 'user-1', createDto(), {
        ipAddress: '127.0.0.1',
      }),
    ).resolves.toBe(product);

    const productCreateCalls = harness.productCreate.mock
      .calls as unknown as Array<
      [
        {
          data: {
            name: string;
            slug: string;
            sku: string;
            currency: string;
            status: string;
          };
        },
      ]
    >;
    expect(productCreateCalls[0][0].data).toMatchObject({
      name: 'Classic Shirt',
      slug: 'classic-shirt',
      sku: 'SHIRT-001',
      currency: 'USD',
      status: ProductStatus.ACTIVE,
    });
    const auditCreateCalls = harness.auditCreate.mock.calls as unknown as Array<
      [
        {
          data: {
            merchantId: string;
            userId: string;
            action: string;
            entityId: string;
          };
        },
      ]
    >;
    expect(auditCreateCalls[0][0].data).toMatchObject({
      merchantId: 'merchant-1',
      userId: 'user-1',
      action: 'product.created',
      entityId: product.id,
    });
    expect(harness.invalidateCatalog.mock.calls).toEqual([['merchant-1']]);
  });

  it('rejects invalid or duplicate channel visibility before persistence', async () => {
    const harness = createHarness();
    const purchasableButHidden = createDto();
    purchasableButHidden.channelVisibility = [
      {
        channel: SalesChannel.WEBSITE,
        isVisible: false,
        isPurchasable: true,
      },
    ];

    await expect(
      harness.service.create('merchant-1', 'user-1', purchasableButHidden, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    const duplicateChannels = createDto();
    duplicateChannels.channelVisibility = [
      {
        channel: SalesChannel.POS,
        isVisible: true,
        isPurchasable: true,
      },
      {
        channel: SalesChannel.POS,
        isVisible: true,
        isPurchasable: true,
      },
    ];
    await expect(
      harness.service.create('merchant-1', 'user-1', duplicateChannels, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.productCreate.mock.calls).toHaveLength(0);
  });

  it('maps merchant SKU uniqueness failures to a domain conflict', async () => {
    const harness = createHarness();
    harness.productCreate.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['merchantId', 'sku'] },
    });

    await expect(
      harness.service.create('merchant-1', 'user-1', createDto(), {}),
    ).rejects.toThrow(
      new ConflictException('SKU is already in use for this merchant'),
    );
    expect(harness.invalidateCatalog.mock.calls).toHaveLength(0);
  });
});
