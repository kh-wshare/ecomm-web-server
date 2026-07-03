/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const webhookSecret = 'payment-webhook-secret-123456789';
  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const sign = (payload: object) =>
    createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Payment Store ${suffix}`,
        fullName: 'Payment Owner',
        email: `payment-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };

  const createOrder = async (
    account: Awaited<ReturnType<typeof register>>,
    quantity = 2,
  ) => {
    const suffix = unique();
    const productResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({
        name: `Payment Product ${suffix}`,
        sku: `payment-${suffix}`,
        price: '24.50',
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
      .send({ productId: product.id, quantityDelta: 10 })
      .expect(201);
    const checkoutResponse = await request(app.getHttpServer())
      .post('/checkout/session')
      .send({
        merchantSlug: account.activeMerchant.merchant.slug,
        sourceChannel: 'WEBSITE',
        items: [{ productId: product.id, quantity }],
      })
      .expect(201);
    const checkout = checkoutResponse.body.data;
    const confirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    return {
      product,
      checkout,
      order: confirmation.body.data.order,
    };
  };

  const connectProvider = async (
    account: Awaited<ReturnType<typeof register>>,
  ) =>
    request(app.getHttpServer())
      .post('/payments/providers')
      .set('Authorization', `Bearer ${account.accessToken}`)
      .send({
        provider: 'HMAC',
        webhookSecret,
        config: { accountId: `acct-${unique()}` },
      })
      .expect(201);

  const createIntent = async (orderId: string, checkoutToken: string) => {
    const response = await request(app.getHttpServer())
      .post('/payments/create-intent')
      .send({ orderId, checkoutToken, provider: 'HMAC' })
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

  it('secures provider config and atomically confirms payment exactly once', async () => {
    const owner = await register();
    const connected = await connectProvider(owner);
    expect(connected.body.data).toMatchObject({
      provider: 'HMAC',
      status: 'ACTIVE',
      hasWebhookSecret: true,
    });
    expect(JSON.stringify(connected.body)).not.toContain(webhookSecret);

    const storedProvider = await prisma.paymentProvider.findUniqueOrThrow({
      where: {
        merchantId_provider: {
          merchantId: owner.activeMerchant.merchant.id,
          provider: 'HMAC',
        },
      },
    });
    expect(JSON.stringify(storedProvider.config)).not.toContain(webhookSecret);

    const { product, checkout, order } = await createOrder(owner);
    await request(app.getHttpServer())
      .post('/payments/create-intent')
      .send({
        orderId: order.id,
        checkoutToken: 'x'.repeat(32),
        provider: 'HMAC',
      })
      .expect(401);

    const payment = await createIntent(order.id, checkout.checkoutToken);
    expect(payment).toMatchObject({
      orderId: order.id,
      provider: 'HMAC',
      amount: '49',
      currency: 'USD',
      status: 'PENDING',
    });
    const repeatedIntent = await createIntent(order.id, checkout.checkoutToken);
    expect(repeatedIntent.id).toBe(payment.id);

    const otherMerchant = await register();
    await request(app.getHttpServer())
      .get(`/payments/${payment.id}`)
      .set('Authorization', `Bearer ${otherMerchant.accessToken}`)
      .expect(404);

    const basePayload = {
      eventId: `event-${unique()}`,
      paymentId: payment.id,
      providerTransactionId: payment.providerTransactionId,
      status: 'CONFIRMED',
      amount: '49.00',
      currency: 'USD',
    };
    await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', '0'.repeat(64))
      .send(basePayload)
      .expect(401);
    expect(
      await prisma.paymentWebhookEvent.count({
        where: {
          paymentId: payment.id,
          status: 'FAILED',
          eventId: { startsWith: 'rejected:' },
        },
      }),
    ).toBe(1);

    const mismatched = {
      ...basePayload,
      eventId: `retry-${unique()}`,
      amount: '1.00',
    };
    await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', sign(mismatched))
      .send(mismatched)
      .expect(409);
    expect(
      await prisma.paymentWebhookEvent.findUniqueOrThrow({
        where: {
          paymentProviderId_eventId: {
            paymentProviderId: storedProvider.id,
            eventId: mismatched.eventId,
          },
        },
      }),
    ).toMatchObject({ status: 'FAILED' });

    const confirmedPayload = {
      ...basePayload,
      eventId: mismatched.eventId,
    };
    const confirmation = await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', sign(confirmedPayload))
      .send(confirmedPayload)
      .expect(200);
    expect(confirmation.body.data).toMatchObject({
      duplicate: false,
      eventId: confirmedPayload.eventId,
      eventStatus: 'PROCESSED',
      payment: { id: payment.id, status: 'CONFIRMED' },
    });

    const duplicate = await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', sign(confirmedPayload))
      .send(confirmedPayload)
      .expect(200);
    expect(duplicate.body.data.duplicate).toBe(true);

    const [storedPayment, storedOrder, reservation, stock, soldMovements] =
      await Promise.all([
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
        prisma.inventoryReservation.findFirstOrThrow({
          where: { orderId: order.id },
        }),
        prisma.inventoryStock.findFirstOrThrow({
          where: { productId: product.id },
        }),
        prisma.inventoryMovement.count({
          where: {
            merchantId: owner.activeMerchant.merchant.id,
            referenceId: payment.id,
            type: 'SOLD',
          },
        }),
      ]);
    expect(storedPayment.status).toBe('CONFIRMED');
    expect(storedOrder).toMatchObject({
      status: 'PAID',
      paymentStatus: 'PAID',
    });
    expect(reservation.status).toBe('CONFIRMED');
    expect(stock).toMatchObject({ reservedStock: 0, soldStock: 2 });
    expect(soldMovements).toBe(1);
    expect(
      await prisma.notification.count({
        where: {
          merchantId: owner.activeMerchant.merchant.id,
          type: 'PAYMENT_CONFIRMED',
        },
      }),
    ).toBe(1);
  });

  it('releases reservations when a signed payment failure arrives', async () => {
    const owner = await register();
    await connectProvider(owner);
    const { product, checkout, order } = await createOrder(owner, 3);
    const payment = await createIntent(order.id, checkout.checkoutToken);
    const payload = {
      eventId: `failed-${unique()}`,
      paymentId: payment.id,
      providerTransactionId: payment.providerTransactionId,
      status: 'FAILED',
      amount: '73.50',
      currency: 'USD',
    };

    await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', sign(payload))
      .send(payload)
      .expect(200);

    const [storedOrder, reservation, stock] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.inventoryReservation.findFirstOrThrow({
        where: { orderId: order.id },
      }),
      prisma.inventoryStock.findFirstOrThrow({
        where: { productId: product.id },
      }),
    ]);
    expect(storedOrder).toMatchObject({
      status: 'PAYMENT_FAILED',
      paymentStatus: 'FAILED',
    });
    expect(reservation.status).toBe('RELEASED');
    expect(stock).toMatchObject({ reservedStock: 0, soldStock: 0 });
  });
});
