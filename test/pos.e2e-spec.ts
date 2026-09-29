import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';

describe('POS order, payment and refund flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  type Counter = {
    token: string;
    merchantId: string;
    branchId: string;
    deviceId: string;
    stocked: { id: string };
    unstocked: { id: string };
  };

  // POS writes are idempotent by key; each call here is a distinct action.
  const auth = (counter: Counter) => ({
    Authorization: `Bearer ${counter.token}`,
    'Idempotency-Key': unique(),
  });

  /** A merchant with a branch, a registered till, an open shift and two products. */
  const openCounter = async (): Promise<Counter> => {
    const suffix = unique();
    const registered = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `POS Store ${suffix}`,
        fullName: 'POS Owner',
        email: `pos-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    const token = registered.body.data.accessToken as string;
    const merchantId = registered.body.data.activeMerchant.merchant
      .id as string;
    const headers = { Authorization: `Bearer ${token}` };

    const branch = await request(app.getHttpServer())
      .post('/branches')
      .set(headers)
      .send({ name: 'Main counter', code: `B${suffix.slice(-6)}` })
      .expect(201);
    const branchId = branch.body.data.id as string;
    const deviceId = `till-${suffix}`;
    await request(app.getHttpServer())
      .post('/pos/devices')
      .set(headers)
      .send({ deviceId, deviceName: 'Till 1', branchId })
      .expect(201);
    await request(app.getHttpServer())
      .post('/pos/shifts')
      .set({ ...headers, 'Idempotency-Key': unique() })
      .send({ deviceId, openingCash: 0 })
      .expect(201);

    const product = async (trackStock: boolean) => {
      const created = await request(app.getHttpServer())
        .post('/products')
        .set(headers)
        .send({
          name: `${trackStock ? 'Beans' : 'Latte'} ${unique()}`,
          sku: `pos-${unique()}`,
          price: '10.00',
          currency: 'USD',
          status: 'ACTIVE',
          trackStock,
          channelVisibility: [
            { channel: 'POS', isVisible: true, isPurchasable: true },
          ],
        })
        .expect(201);
      if (trackStock) {
        await request(app.getHttpServer())
          .post('/inventory/adjust')
          .set(headers)
          .send({ productId: created.body.data.id, quantityDelta: 10 })
          .expect(201);
      }
      return { id: created.body.data.id as string };
    };

    return {
      token,
      merchantId,
      branchId,
      deviceId,
      stocked: await product(true),
      unstocked: await product(false),
    };
  };

  const createOrder = async (
    counter: Counter,
    items: Array<{ productId: string; quantity: number }>,
  ) => {
    const response = await request(app.getHttpServer())
      .post('/pos/orders')
      .set(auth(counter))
      .send({ deviceId: counter.deviceId, items })
      .expect(201);
    return response.body.data as { id: string };
  };

  const pay = (
    counter: Counter,
    orderId: string,
    body: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/payments`)
      .set(auth(counter))
      .send(body);

  const stockOf = (productId: string) =>
    prisma.inventoryStock.findFirstOrThrow({ where: { productId } });

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

  it('never takes more than the order total, even from two tills at once', async () => {
    const counter = await openCounter();
    const order = await createOrder(counter, [
      { productId: counter.unstocked.id, quantity: 2 },
    ]);

    const results = await Promise.all([
      pay(counter, order.id, { paymentMethod: 'CASH', amount: 20 }),
      pay(counter, order.id, { paymentMethod: 'CASH', amount: 20 }),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
    const received = await prisma.payment.aggregate({
      where: { orderId: order.id, status: 'CONFIRMED' },
      _sum: { amount: true },
    });
    expect(received._sum.amount?.toString()).toBe('20');
  });

  it('counts a pending KHQR against the balance', async () => {
    const counter = await openCounter();
    await request(app.getHttpServer())
      .post('/payments/providers')
      .set(auth(counter))
      .send({
        provider: 'KHQR',
        providerSecret: 'bakong-test-token',
        config: { accountId: 'pos_store@bkrt', merchantName: 'POS Store' },
      })
      .expect(201);
    const order = await createOrder(counter, [
      { productId: counter.unstocked.id, quantity: 1 },
    ]);

    // KHQR bill numbers are capped at 25 characters; this used to fail.
    const khqr = await pay(counter, order.id, {
      paymentMethod: 'KHQR',
      amount: 10,
    }).expect(201);
    expect(khqr.body.data.qr).toEqual(expect.any(String));

    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 10 }).expect(
      409,
    );
  });

  it('edits a tab with non-stocked lines and refuses to edit a paid order', async () => {
    const counter = await openCounter();
    const order = await createOrder(counter, [
      { productId: counter.unstocked.id, quantity: 1 },
    ]);

    const edited = await request(app.getHttpServer())
      .patch(`/pos/orders/${order.id}`)
      .set(auth(counter))
      .send({ items: [{ productId: counter.unstocked.id, quantity: 3 }] })
      .expect(200);
    expect(edited.body.data.totals.total).toBe('30');

    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 30 }).expect(
      201,
    );
    await request(app.getHttpServer())
      .patch(`/pos/orders/${order.id}`)
      .set(auth(counter))
      .send({ items: [{ productId: counter.unstocked.id, quantity: 4 }] })
      .expect(409);
  });

  it('keeps a part-paid order paid after a part refund, and refunds it fully with stock back', async () => {
    const counter = await openCounter();
    const order = await createOrder(counter, [
      { productId: counter.stocked.id, quantity: 2 },
    ]);
    const first = await pay(counter, order.id, {
      paymentMethod: 'CASH',
      amount: 5,
    }).expect(201);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'PENDING_PAYMENT', paymentStatus: 'PARTIAL' });
    const second = await pay(counter, order.id, {
      paymentMethod: 'CASH',
      amount: 15,
    }).expect(201);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'PAID', paymentStatus: 'PAID' });
    expect(await stockOf(counter.stocked.id)).toMatchObject({
      reservedStock: 0,
      soldStock: 2,
    });

    // Part refund: the customer no longer owes it, so the order stays paid
    // and cannot be charged again.
    await request(app.getHttpServer())
      .post(`/pos/payments/${second.body.data.paymentId}/refund`)
      .set(auth(counter))
      .send({ amount: 4 })
      .expect(200);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'PAID', paymentStatus: 'PAID' });
    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 4 }).expect(
      409,
    );

    // Refunding everything that is left, with stock back.
    await request(app.getHttpServer())
      .post(`/pos/payments/${second.body.data.paymentId}/refund`)
      .set(auth(counter))
      .send({ amount: 11 })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/pos/payments/${first.body.data.paymentId}/refund`)
      .set(auth(counter))
      .send({ amount: 5, returnStock: true })
      .expect(200);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
    expect(await stockOf(counter.stocked.id)).toMatchObject({ soldStock: 0 });
  });

  it('holds stock for a part-paid order past its reservation deadline', async () => {
    const counter = await openCounter();
    const order = await createOrder(counter, [
      { productId: counter.stocked.id, quantity: 2 },
    ]);
    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 5 }).expect(
      201,
    );
    await prisma.inventoryReservation.updateMany({
      where: { orderId: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await app.get(InventoryService).expireReservations();
    expect(
      await prisma.inventoryReservation.findFirstOrThrow({
        where: { orderId: order.id },
      }),
    ).toMatchObject({ status: 'ACTIVE' });

    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 15 }).expect(
      201,
    );
    expect(await stockOf(counter.stocked.id)).toMatchObject({
      reservedStock: 0,
      soldStock: 2,
    });
  });

  it('refuses to cancel a part-paid order', async () => {
    const counter = await openCounter();
    const order = await createOrder(counter, [
      { productId: counter.unstocked.id, quantity: 1 },
    ]);
    await pay(counter, order.id, { paymentMethod: 'CASH', amount: 5 }).expect(
      201,
    );
    await request(app.getHttpServer())
      .post(`/pos/orders/${order.id}/cancel`)
      .set(auth(counter))
      .send({ reason: 'changed mind' })
      .expect(409);
  });

  it('records a quick sale as a real, refundable payment on the open shift', async () => {
    const counter = await openCounter();
    const sale = await request(app.getHttpServer())
      .post('/pos/sales')
      .set(auth(counter))
      .send({
        branchId: counter.branchId,
        paymentMethod: 'CASH',
        cashReceived: 50,
        items: [{ productId: counter.stocked.id, quantity: 2 }],
      })
      .expect(201);
    const orderId = sale.body.data.order.id as string;

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true },
    });
    expect(order).toMatchObject({
      status: 'PAID',
      paymentStatus: 'PAID',
      branchId: counter.branchId,
    });
    expect(order.posShiftId).not.toBeNull();
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0]).toMatchObject({
      provider: 'CASH',
      status: 'CONFIRMED',
      posShiftId: order.posShiftId,
    });
    expect(await stockOf(counter.stocked.id)).toMatchObject({ soldStock: 2 });

    await request(app.getHttpServer())
      .post(`/pos/payments/${order.payments[0].id}/refund`)
      .set(auth(counter))
      .send({ amount: 20, returnStock: true })
      .expect(200);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
    ).toMatchObject({ status: 'REFUNDED' });
  });
});
