import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  const sockets: Socket[] = [];

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Notification Store ${suffix}`,
        fullName: 'Notification Owner',
        email: `notification-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };

  const createProduct = async (
    token: string,
    totalStock: number,
    safetyBuffer: number,
  ) => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Notification Product ${suffix}`,
        sku: `notification-${suffix}`,
        price: '15.00',
        status: 'ACTIVE',
        channelVisibility: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
        ],
      })
      .expect(201);
    const product = response.body.data;
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantityDelta: totalStock,
        safetyBuffer,
      })
      .expect(201);
    return product;
  };

  const connect = async (token: string) => {
    const socket = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      autoConnect: false,
    });
    sockets.push(socket);
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('WebSocket connection timed out')),
        5_000,
      );
      socket.once('notifications.ready', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('notifications.error', ({ message }) => {
        clearTimeout(timer);
        reject(new Error(String(message)));
      });
    });
    socket.connect();
    await ready;
    return socket;
  };

  const waitForEvent = (socket: Socket, type: string) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${type}`)),
        5_000,
      );
      const listener = (event: {
        type: string;
        payload: Record<string, unknown>;
      }) => {
        if (event.type !== type) return;
        clearTimeout(timer);
        socket.off('notification', listener);
        resolve(event.payload);
      };
      socket.on('notification', listener);
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterEach(() => {
    while (sockets.length) sockets.pop()?.close();
  });

  afterAll(async () => {
    await app.close();
  });

  it('persists and broadcasts a new-order notification exactly once', async () => {
    const owner = await register();
    const socket = await connect(owner.accessToken);
    const product = await createProduct(owner.accessToken, 10, 1);
    const checkoutResponse = await request(app.getHttpServer())
      .post('/checkout/session')
      .send({
        merchantSlug: owner.activeMerchant.merchant.slug,
        sourceChannel: 'WEBSITE',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);
    const checkout = checkoutResponse.body.data;

    const orderEvent = waitForEvent(socket, 'order.created');
    const confirmation = await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    const eventPayload = await orderEvent;
    expect(eventPayload.orderId).toBe(confirmation.body.data.order.id);

    await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);

    const notifications = await request(app.getHttpServer())
      .get('/notifications?unread=true')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(notifications.body.data).toEqual([
      expect.objectContaining({
        type: 'ORDER_CREATED',
        readAt: null,
      }),
    ]);
    const notificationId = notifications.body.data[0].id;

    const unread = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(unread.body.data.count).toBe(1);

    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const afterRead = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(afterRead.body.data.count).toBe(0);

    const outsider = await register();
    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(404);
  });

  it('deduplicates low/out-of-stock alerts and emits state transitions', async () => {
    const owner = await register();
    const socket = await connect(owner.accessToken);
    const product = await createProduct(owner.accessToken, 5, 2);

    const lowEvent = waitForEvent(socket, 'inventory.low_stock');
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: -3 })
      .expect(201);
    expect((await lowEvent).productId).toBe(product.id);

    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: 1 })
      .expect(201);

    const reopenedLowEvent = waitForEvent(socket, 'inventory.low_stock');
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: -1 })
      .expect(201);
    await reopenedLowEvent;

    const outEvent = waitForEvent(socket, 'inventory.out_of_stock');
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: -2 })
      .expect(201);
    await outEvent;

    const alerts = await request(app.getHttpServer())
      .get('/notifications?unread=true')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const inventoryAlerts = alerts.body.data.filter((notification) =>
      String(notification.type).startsWith('INVENTORY_'),
    );
    expect(inventoryAlerts).toHaveLength(1);
    expect(inventoryAlerts[0]).toMatchObject({
      type: 'INVENTORY_OUT_OF_STOCK',
      data: {
        productId: product.id,
        availableStock: 0,
        active: true,
      },
    });

    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ productId: product.id, quantityDelta: 5 })
      .expect(201);
    const afterRecovery = await request(app.getHttpServer())
      .get('/notifications?unread=true')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(
      afterRecovery.body.data.some((notification) =>
        String(notification.type).startsWith('INVENTORY_'),
      ),
    ).toBe(false);
  });

  it('rejects unauthenticated WebSocket clients', async () => {
    const socket = io(`${baseUrl}/notifications`, {
      auth: { token: 'invalid-token' },
      transports: ['websocket'],
      forceNew: true,
      autoConnect: false,
    });
    sockets.push(socket);
    const error = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Expected WebSocket rejection')),
        5_000,
      );
      socket.once('notifications.error', ({ message }) => {
        clearTimeout(timer);
        resolve(String(message));
      });
    });
    socket.connect();
    await expect(error).resolves.toBe('Unauthorized');
  });
});
