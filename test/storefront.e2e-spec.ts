import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Public storefront (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Public Store ${suffix}`,
        fullName: 'Storefront Owner',
        email: `storefront-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };
  const createProduct = async (
    token: string,
    options: {
      status?: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
      websiteVisible?: boolean;
      withVariant?: boolean;
    } = {},
  ) => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Storefront Product ${suffix}`,
        sku: `public-${suffix}`,
        price: '24.99',
        status: options.status ?? 'ACTIVE',
        media: [
          {
            url: 'https://cdn.example.com/products/public-product.jpg',
            type: 'IMAGE',
          },
        ],
        variants: options.withVariant
          ? [
              {
                sku: `public-${suffix}-blue`,
                name: 'Blue',
                price: '26.99',
                attributes: { color: 'blue' },
              },
            ]
          : undefined,
        channelVisibility: [
          {
            channel: 'WEBSITE',
            isVisible: options.websiteVisible ?? true,
            isPurchasable: options.websiteVisible ?? true,
          },
          { channel: 'POS', isVisible: true, isPurchasable: true },
        ],
      })
      .expect(201);
    return response.body.data;
  };
  const adjust = (
    token: string,
    productId: string,
    quantityDelta: number,
    safetyBuffer = 0,
    variantId?: string,
  ) =>
    request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        variantId,
        quantityDelta,
        safetyBuffer,
      });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves public storefront, product, variant, and live-theme data', async () => {
    const account = await register();
    const product = await createProduct(account.accessToken, {
      withVariant: true,
    });
    await adjust(
      account.accessToken,
      product.id,
      5,
      1,
      product.variants[0].id,
    ).expect(201);
    const merchantSlug = account.activeMerchant.merchant.slug;

    const storefront = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}`)
      .expect(200);
    expect(storefront.body.data).toMatchObject({
      merchant: { id: account.activeMerchant.merchant.id, slug: merchantSlug },
      theme: { version: 1 },
    });
    expect(storefront.body.data.featuredProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: product.id, isPurchasable: true }),
      ]),
    );

    const list = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products`)
      .query({ search: product.sku, page: 1, limit: 5 })
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toMatchObject({ total: 1, page: 1, limit: 5 });

    const detail = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products/${product.slug}`)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      id: product.id,
      isAvailable: true,
      isPurchasable: true,
      variants: [
        expect.objectContaining({
          id: product.variants[0].id,
          isAvailable: true,
        }),
      ],
    });
    expect(detail.body.data).not.toHaveProperty('merchantId');
    expect(detail.body.data).not.toHaveProperty('deletedAt');

    const theme = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/theme`)
      .expect(200);
    expect(theme.body.data).toMatchObject({
      version: 1,
      config: expect.any(Object),
      publishedAt: null,
    });
    expect(theme.body.data).not.toHaveProperty('draftConfig');
  });

  it('filters products by lifecycle, channel visibility, and channel stock rules', async () => {
    const account = await register();
    const token = account.accessToken;
    const merchantSlug = account.activeMerchant.merchant.slug;
    const buffered = await createProduct(token);
    await adjust(token, buffered.id, 2, 2).expect(201);

    const hidden = await createProduct(token, { websiteVisible: false });
    await adjust(token, hidden.id, 5).expect(201);

    const draft = await createProduct(token, { status: 'DRAFT' });
    await adjust(token, draft.id, 5).expect(201);

    await createProduct(token);

    const website = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products`)
      .expect(200);
    expect(website.body.data).toHaveLength(0);

    const pos = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products`)
      .query({ channel: 'POS' })
      .expect(200);
    expect(pos.body.data.map(({ id }: { id: string }) => id)).toEqual(
      expect.arrayContaining([buffered.id, hidden.id]),
    );
    expect(pos.body.data.map(({ id }: { id: string }) => id)).not.toContain(
      draft.id,
    );

    await adjust(token, buffered.id, 1, 2).expect(201);
    const available = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products`)
      .expect(200);
    expect(available.body.data.map(({ id }: { id: string }) => id)).toContain(
      buffered.id,
    );

    await request(app.getHttpServer())
      .delete(`/products/${buffered.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products/${buffered.slug}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/products`)
      .query({ channel: 'not-a-channel' })
      .expect(400);
  });

  it('does not expose inactive or suspended merchant storefronts', async () => {
    const account = await register();
    const merchant = account.activeMerchant.merchant;
    await app.get(PrismaService).merchant.update({
      where: { id: merchant.id },
      data: { status: 'SUSPENDED' },
    });

    await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/theme`)
      .expect(404);
  });
});
