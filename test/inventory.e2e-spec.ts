import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';

describe('Inventory (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Inventory Store ${suffix}`,
        fullName: 'Inventory Owner',
        email: `inventory-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };
  const createProduct = async (token: string) => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Inventory Product ${suffix}`,
        sku: `inventory-${suffix}`,
        price: '19.99',
        status: 'ACTIVE',
        channelVisibility: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
          { channel: 'POS', isVisible: true, isPurchasable: true },
        ],
      })
      .expect(201);
    return response.body.data;
  };

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

  it('adjusts, reserves, releases, and confirms stock with movement history', async () => {
    const account = await register();
    const token = account.accessToken;
    const product = await createProduct(token);

    const adjusted = await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantityDelta: 10,
        safetyBuffer: 2,
        referenceId: 'initial-stock',
      })
      .expect(201);
    expect(adjusted.body.data).toMatchObject({
      totalStock: 10,
      reservedStock: 0,
      soldStock: 0,
      availableStock: 10,
      onlineSellableStock: 8,
    });

    const websiteReservation = await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 8,
        checkoutSessionId: randomUUID(),
        channel: 'WEBSITE',
      })
      .expect(201);
    expect(websiteReservation.body.data.stock).toMatchObject({
      reservedStock: 8,
      availableStock: 2,
      onlineSellableStock: 0,
    });

    await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 1,
        checkoutSessionId: randomUUID(),
        channel: 'WEBSITE',
      })
      .expect(409);

    const posReservation = await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 2,
        checkoutSessionId: randomUUID(),
        channel: 'POS',
      })
      .expect(201);

    const confirmed = await request(app.getHttpServer())
      .post('/inventory/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reservationId: posReservation.body.data.reservation.id,
        orderId: randomUUID(),
      })
      .expect(201);
    expect(confirmed.body.data.stock).toMatchObject({
      reservedStock: 8,
      soldStock: 2,
      availableStock: 0,
    });

    await request(app.getHttpServer())
      .post('/inventory/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ reservationId: posReservation.body.data.reservation.id })
      .expect(201);

    const released = await request(app.getHttpServer())
      .post('/inventory/release')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reservationId: websiteReservation.body.data.reservation.id,
      })
      .expect(201);
    expect(released.body.data.stock).toMatchObject({
      reservedStock: 0,
      soldStock: 2,
      availableStock: 8,
      onlineSellableStock: 6,
    });

    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: -9 })
      .expect(409);

    const detail = await request(app.getHttpServer())
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.data.activeReservations).toHaveLength(0);
    expect(detail.body.data.recentMovements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'MANUAL_ADJUSTMENT', quantity: 10 }),
        expect.objectContaining({ type: 'RESERVED', quantity: 8 }),
        expect.objectContaining({ type: 'SOLD', quantity: 2 }),
        expect.objectContaining({
          type: 'RESERVATION_RELEASED',
          quantity: -8,
        }),
      ]),
    );
  });

  it('serializes concurrent reservations to prevent overselling', async () => {
    const account = await register();
    const token = account.accessToken;
    const product = await createProduct(token);
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: 5 })
      .expect(201);

    const reserve = () =>
      request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 4,
          checkoutSessionId: randomUUID(),
          channel: 'WEBSITE',
        });
    const responses = await Promise.all([reserve(), reserve()]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);

    const detail = await request(app.getHttpServer())
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.data.stocks[0]).toMatchObject({
      totalStock: 5,
      reservedStock: 4,
      availableStock: 1,
    });
  });

  it('expires reservations and enforces tenant and viewer boundaries', async () => {
    const owner = await register();
    const product = await createProduct(owner.accessToken);
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: 3 })
      .expect(201);
    const reserved = await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        productId: product.id,
        quantity: 1,
        checkoutSessionId: randomUUID(),
        channel: 'WEBSITE',
      })
      .expect(201);

    const prisma = app.get(PrismaService);
    await prisma.inventoryReservation.update({
      where: { id: reserved.body.data.reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await app.get(InventoryService).expireReservations();
    expect(expired).toBeGreaterThanOrEqual(1);

    const afterExpiry = await request(app.getHttpServer())
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(afterExpiry.body.data.stocks[0].reservedStock).toBe(0);
    expect(afterExpiry.body.data.activeReservations).toHaveLength(0);

    const viewer = await register();
    await request(app.getHttpServer())
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(404);

    const merchantId = owner.activeMerchant.merchant.id;
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
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ productId: product.id, quantityDelta: 1 })
      .expect(403);
  });
});
