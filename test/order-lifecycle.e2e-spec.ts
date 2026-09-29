import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';

/**
 * How order, payment and fulfillment status move together when someone acts
 * on an online order. See docs/order-payment-fulfillment-review.md.
 */
describe('Order lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const webhookSecret = 'lifecycle-webhook-secret-123456789';
  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const sign = (payload: object) =>
    createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

  type Store = { token: string; slug: string };

  const openStore = async (): Promise<Store> => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Lifecycle Store ${suffix}`,
        fullName: 'Lifecycle Owner',
        email: `lifecycle-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    const store = {
      token: response.body.data.accessToken as string,
      slug: response.body.data.activeMerchant.merchant.slug as string,
    };
    await request(app.getHttpServer())
      .post('/payments/providers')
      .set('Authorization', `Bearer ${store.token}`)
      .send({
        provider: 'HMAC',
        webhookSecret,
        config: { accountId: `acct-${unique()}` },
      })
      .expect(201);
    return store;
  };

  const createProduct = async (
    store: Store,
    { trackStock, stock = 10 }: { trackStock: boolean; stock?: number },
  ) => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${store.token}`)
      .send({
        name: `Lifecycle Product ${unique()}`,
        sku: `lifecycle-${unique()}`,
        price: '10.00',
        currency: 'USD',
        status: 'ACTIVE',
        trackStock,
        channelVisibility: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
        ],
      })
      .expect(201);
    const product = response.body.data as { id: string };
    if (trackStock) {
      await request(app.getHttpServer())
        .post('/inventory/adjust')
        .set('Authorization', `Bearer ${store.token}`)
        .send({ productId: product.id, quantityDelta: stock })
        .expect(201);
    }
    return product;
  };

  const placeOrder = async (store: Store, productId: string, quantity = 1) => {
    const checkout = await request(app.getHttpServer())
      .post('/checkout/session')
      .send({
        merchantSlug: store.slug,
        sourceChannel: 'WEBSITE',
        items: [{ productId, quantity }],
      })
      .expect(201);
    const confirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.body.data.id}/confirm`)
      .set('X-Checkout-Token', checkout.body.data.checkoutToken)
      .expect(200);
    return {
      checkout: checkout.body.data as { id: string; checkoutToken: string },
      order: confirmation.body.data.order as {
        id: string;
        totalAmount: string;
      },
    };
  };

  const payOrder = async (placed: Awaited<ReturnType<typeof placeOrder>>) => {
    const intent = await request(app.getHttpServer())
      .post('/payments/create-intent')
      .send({
        orderId: placed.order.id,
        checkoutToken: placed.checkout.checkoutToken,
        provider: 'HMAC',
      })
      .expect(201);
    const payload = {
      eventId: `paid-${unique()}`,
      paymentId: intent.body.data.id,
      providerTransactionId: intent.body.data.providerTransactionId,
      status: 'CONFIRMED',
      amount: intent.body.data.amount,
      currency: intent.body.data.currency,
    };
    await request(app.getHttpServer())
      .post('/payments/webhook/HMAC')
      .set('X-Payment-Signature', sign(payload))
      .send(payload)
      .expect(200);
  };

  const orderOf = (id: string) =>
    prisma.order.findUniqueOrThrow({ where: { id } });

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

  it('does not ship an unpaid order', async () => {
    const store = await openStore();
    const product = await createProduct(store, { trackStock: true });
    const placed = await placeOrder(store, product.id);

    await request(app.getHttpServer())
      .post(`/orders/${placed.order.id}/shipments`)
      .set('Authorization', `Bearer ${store.token}`)
      .send({})
      .expect(409);
  });

  it('moves the order along with its shipments', async () => {
    const store = await openStore();
    const product = await createProduct(store, { trackStock: true });
    const placed = await placeOrder(store, product.id, 2);
    await payOrder(placed);

    const shipment = await request(app.getHttpServer())
      .post(`/orders/${placed.order.id}/shipments`)
      .set('Authorization', `Bearer ${store.token}`)
      .send({})
      .expect(201);
    expect(await orderOf(placed.order.id)).toMatchObject({
      status: 'PROCESSING',
      fulfillmentStatus: 'PROCESSING',
    });

    // Marking it fulfilled by hand before the parcel arrives is refused.
    await request(app.getHttpServer())
      .patch(`/orders/${placed.order.id}/status`)
      .set('Authorization', `Bearer ${store.token}`)
      .send({ status: 'FULFILLED' })
      .expect(409);

    for (const status of ['IN_TRANSIT', 'DELIVERED']) {
      await request(app.getHttpServer())
        .patch(`/shipments/${shipment.body.data.id}/status`)
        .set('Authorization', `Bearer ${store.token}`)
        .send({ status })
        .expect(200);
    }
    const delivered = await orderOf(placed.order.id);
    expect(delivered).toMatchObject({
      status: 'FULFILLED',
      fulfillmentStatus: 'FULFILLED',
    });
    expect(delivered.fulfilledAt).not.toBeNull();
  });

  it('refunds with a payment record, and the shopper cannot cancel it afterwards', async () => {
    const store = await openStore();
    const product = await createProduct(store, { trackStock: true });
    const placed = await placeOrder(store, product.id);
    await payOrder(placed);

    await request(app.getHttpServer())
      .post(`/orders/${placed.order.id}/refund`)
      .set('Authorization', `Bearer ${store.token}`)
      .send({ returnStock: true })
      .expect(200);
    expect(await orderOf(placed.order.id)).toMatchObject({
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      fulfillmentStatus: 'CANCELLED',
    });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: placed.order.id },
      include: { refunds: true },
    });
    expect(payment.status).toBe('REFUNDED');
    expect(payment.refunds).toHaveLength(1);
    expect(payment.refunds[0].amount.toString()).toBe(
      payment.amount.toString(),
    );

    await request(app.getHttpServer())
      .post(`/checkout/session/${placed.checkout.id}/cancel`)
      .set('X-Checkout-Token', placed.checkout.checkoutToken)
      .expect(409);
    expect(await orderOf(placed.order.id)).toMatchObject({
      status: 'REFUNDED',
    });
  });

  it('expires an order whose reservation lapsed when another checkout takes the stock', async () => {
    const store = await openStore();
    const product = await createProduct(store, { trackStock: true, stock: 1 });
    const first = await placeOrder(store, product.id);
    await prisma.inventoryReservation.updateMany({
      where: { orderId: first.order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // The second checkout reclaims the stock inline, before any sweep.
    await placeOrder(store, product.id);
    expect(await orderOf(first.order.id)).toMatchObject({ status: 'EXPIRED' });
  });

  it('expires an unpaid order of non-stocked products at its checkout deadline', async () => {
    const store = await openStore();
    const product = await createProduct(store, { trackStock: false });
    const placed = await placeOrder(store, product.id);
    await prisma.checkoutSession.update({
      where: { id: placed.checkout.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await app.get(InventoryService).expireStaleOrders();
    expect(await orderOf(placed.order.id)).toMatchObject({ status: 'EXPIRED' });
  });
});
