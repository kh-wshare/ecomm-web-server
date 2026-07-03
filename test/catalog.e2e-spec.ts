import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Product catalog (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const registration = (suffix = unique()) => ({
    merchantName: `Catalog Store ${suffix}`,
    fullName: 'Catalog Owner',
    email: `catalog-${suffix}@example.com`,
    password: 'StrongPassword123!',
  });
  const register = async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(registration())
      .expect(201);
    return response.body.data;
  };
  const productPayload = (suffix = unique()) => ({
    name: `Classic Shirt ${suffix}`,
    sku: `shirt-${suffix}`,
    price: '29.99',
    currency: 'usd',
    status: 'ACTIVE',
    description: 'A dependable everyday shirt.',
    variants: [
      {
        sku: `shirt-${suffix}-black-m`,
        name: 'Black / Medium',
        price: '31.99',
        attributes: { color: 'black', size: 'M' },
      },
    ],
    media: [
      {
        url: 'https://cdn.example.com/products/classic-shirt.jpg',
        type: 'IMAGE',
        sortOrder: 0,
      },
    ],
    channelVisibility: [
      { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
      { channel: 'POS', isVisible: true, isPurchasable: false },
    ],
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

  it('creates, lists, updates, configures, and soft-deletes a product', async () => {
    const account = await register();
    const token = account.accessToken;
    const payload = productPayload();

    const created = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const productId = created.body.data.id;
    expect(created.body.data).toMatchObject({
      merchantId: account.activeMerchant.merchant.id,
      sku: payload.sku.toUpperCase(),
      currency: 'USD',
      status: 'ACTIVE',
      variants: [
        expect.objectContaining({
          sku: payload.variants[0].sku.toUpperCase(),
        }),
      ],
      media: [expect.objectContaining({ type: 'IMAGE' })],
    });

    const list = await request(app.getHttpServer())
      .get('/products')
      .query({ search: payload.sku, page: 1, limit: 5 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 5, total: 1 });

    const detail = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.data.channelVisibility).toHaveLength(2);

    const updated = await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Classic Shirt', price: '34.50' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      name: 'Updated Classic Shirt',
      price: '34.5',
    });

    const channels = await request(app.getHttpServer())
      .patch(`/products/${productId}/channel-visibility`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        channels: [
          { channel: 'WEBSITE', isVisible: false, isPurchasable: false },
          { channel: 'FACEBOOK', isVisible: true, isPurchasable: false },
        ],
      })
      .expect(200);
    expect(channels.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'WEBSITE',
          isVisible: false,
          isPurchasable: false,
        }),
        expect.objectContaining({
          channel: 'FACEBOOK',
          isVisible: true,
          isPurchasable: false,
        }),
      ]),
    );

    await request(app.getHttpServer())
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    const afterDelete = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterDelete.body.data).toHaveLength(0);
  });

  it('enforces per-merchant product and variant SKU uniqueness', async () => {
    const firstAccount = await register();
    const payload = productPayload();
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${firstAccount.accessToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${firstAccount.accessToken}`)
      .send({
        ...productPayload(),
        sku: payload.sku.toLowerCase(),
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${firstAccount.accessToken}`)
      .send({
        ...productPayload(),
        variants: [
          {
            ...productPayload().variants[0],
            sku: payload.variants[0].sku.toLowerCase(),
          },
        ],
      })
      .expect(409);

    const secondAccount = await register();
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${secondAccount.accessToken}`)
      .send({ ...productPayload(), sku: payload.sku })
      .expect(201);
  });

  it('prevents cross-merchant reads and viewer mutations', async () => {
    const owner = await register();
    const created = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(productPayload())
      .expect(201);
    const productId = created.body.data.id;
    const merchantId = owner.activeMerchant.merchant.id;

    const viewer = await register();
    await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(404);

    const prisma = app.get(PrismaService);
    const viewerRole = await prisma.role.findUniqueOrThrow({
      where: { merchantId_code: { merchantId, code: 'viewer' } },
    });
    await prisma.merchantUser.create({
      data: {
        merchantId,
        userId: viewer.user.id,
        roleId: viewerRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
    const switched = await request(app.getHttpServer())
      .post('/auth/switch-merchant')
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ merchantId })
      .expect(200);
    const viewerToken = switched.body.data.accessToken;

    await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Forbidden Update' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });
});
