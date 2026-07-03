import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Checkout (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Checkout Store ${suffix}`,
        fullName: 'Checkout Owner',
        email: `checkout-${suffix}@example.com`,
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
        name: `Checkout Product ${suffix}`,
        sku: `checkout-${suffix}`,
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

  it('uses authoritative prices and protects the session', async () => {
    const owner = await register();
    const product = await createStockedProduct(owner);

    await request(app.getHttpServer())
      .post('/checkout/session')
      .send({
        merchantSlug: owner.activeMerchant.merchant.slug,
        sourceChannel: 'POS',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(400);

    const checkout = await createCheckout(owner, product.id);

    expect(checkout).toMatchObject({
      sourceChannel: 'WEBSITE',
      status: 'ACTIVE',
      subtotalAmount: '39.98',
      totalAmount: '39.98',
      currency: 'USD',
    });
    expect(checkout.checkoutToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get(`/checkout/session/${checkout.id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/checkout/session/${checkout.id}`)
      .set('X-Checkout-Token', 'wrong-token')
      .expect(401);

    const detail = await request(app.getHttpServer())
      .get(`/checkout/session/${checkout.id}`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    expect(detail.body.data.items[0]).toMatchObject({
      productId: product.id,
      quantity: 2,
      unitPrice: '19.99',
      totalPrice: '39.98',
    });
  });

  it('expires a session, releases all stock, and prevents confirmation', async () => {
    const owner = await register();
    const product = await createStockedProduct(owner, 3);
    const checkout = await createCheckout(owner, product.id, 1);
    const expiredAt = new Date(Date.now() - 1_000);

    await prisma.$transaction([
      prisma.checkoutSession.update({
        where: { id: checkout.id },
        data: { expiresAt: expiredAt },
      }),
      prisma.inventoryReservation.updateMany({
        where: { checkoutSessionId: checkout.id },
        data: { expiresAt: expiredAt },
      }),
    ]);

    const detail = await request(app.getHttpServer())
      .get(`/checkout/session/${checkout.id}`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(200);
    expect(detail.body.data.status).toBe('EXPIRED');

    await request(app.getHttpServer())
      .post(`/checkout/session/${checkout.id}/confirm`)
      .set('X-Checkout-Token', checkout.checkoutToken)
      .expect(409);

    const stock = await prisma.inventoryStock.findFirstOrThrow({
      where: { productId: product.id },
    });
    expect(stock.reservedStock).toBe(0);
  });
});
