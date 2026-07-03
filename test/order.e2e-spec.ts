/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Orders Store ${suffix}`,
        fullName: 'Orders Owner',
        email: `orders-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };

  const createStockedProduct = async (
    account: Awaited<ReturnType<typeof register>>,
    totalStock = 10,
  ) => {
    const suffix = unique();
    const productResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({
        name: `Order Product ${suffix}`,
        sku: `order-${suffix}`,
        price: '19.99',
        currency: 'USD',
        status: 'ACTIVE',
        channelVisibility: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
        ],
      })
      .expect(201);
    const product = productResponse.body.data;
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({ productId: product.id, quantityDelta: totalStock })
      .expect(201);
    return product;
  };

  const createCheckout = async (
    account: Awaited<ReturnType<typeof register>>,
    productId: string,
    quantity = 2,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/checkout/session')
      .send({
        merchantSlug: account.activeMerchant.merchant.slug,
        customerName: 'Ada Customer',
        customerEmail: 'ada@example.com',
        sourceChannel: 'WEBSITE',
        items: [{ productId, quantity, unitPrice: '0.01' }],
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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an order and scopes it to the merchant', async () => {
    const owner = await register();
    const product = await createStockedProduct(owner);
    const checkout = await createCheckout(owner, product.id);

    const firstConfirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    expect(firstConfirmation.body.data).toMatchObject({
      status: 'CONFIRMED',
      order: {
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        totalAmount: '39.98',
      },
    });
    const orderId = firstConfirmation.body.data.order.id;

    const secondConfirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    expect(secondConfirmation.body.data.order.id).toBe(orderId);

    const orders = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(orders.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: orderId })]),
    );

    const otherMerchant = await register();
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherMerchant.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ status: 'PROCESSING' })
      .expect(409);

    const cancelled = await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(cancelled.body.data).toMatchObject({
      status: 'CANCELLED',
      fulfillmentStatus: 'CANCELLED',
    });

    const inventory = await request(app.getHttpServer())
      .get(`/inventory/${product.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(inventory.body.data.stocks[0]).toMatchObject({
      reservedStock: 0,
      soldStock: 0,
      availableStock: 10,
    });
  });

  it('enforces paid fulfillment transitions and audits refund stock return', async () => {
    const owner = await register();
    const product = await createStockedProduct(owner, 4);
    const checkout = await createCheckout(owner, product.id, 2);
    const confirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    const orderId = confirmation.body.data.order.id;
    const reservation = await prisma.inventoryReservation.findFirstOrThrow({
      where: { orderId },
    });

    await prisma.$transaction([
      prisma.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' },
      }),
      prisma.inventoryStock.update({
        where: { id: reservation.inventoryStockId },
        data: {
          reservedStock: { decrement: reservation.quantity },
          soldStock: { increment: reservation.quantity },
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          paidAt: new Date(),
        },
      }),
    ]);

    await request(app.getHttpServer())
      .post(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(409);

    for (const status of ['PROCESSING', 'FULFILLED', 'COMPLETED']) {
      const transitioned = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status })
        .expect(200);
      expect(transitioned.body.data.status).toBe(status);
    }

    const refunded = await request(app.getHttpServer())
      .post(`/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(200);
    expect(refunded.body.data).toMatchObject({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
    });

    const stock = await prisma.inventoryStock.findUniqueOrThrow({
      where: { id: reservation.inventoryStockId },
    });
    expect(stock).toMatchObject({ reservedStock: 0, soldStock: 0 });
    expect(
      await prisma.auditLog.count({
        where: {
          merchantId: owner.activeMerchant.merchant.id,
          entityId: orderId,
          action: 'order.refunded',
        },
      }),
    ).toBe(1);
  });
});
