import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';

class MemoryRedis {
  private readonly values = new Map<string, string>();
  private readonly hashes = new Map<string, Map<string, string>>();

  get(key: string) {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  set(key: string, value: string) {
    this.values.set(key, value);
    return Promise.resolve();
  }

  hget(key: string, field: string) {
    return Promise.resolve(this.hashes.get(key)?.get(field) ?? null);
  }

  hset(key: string, field: string, value: string) {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    hash.set(field, value);
    this.hashes.set(key, hash);
    return Promise.resolve();
  }

  hdel(key: string, field: string) {
    this.hashes.get(key)?.delete(field);
    return Promise.resolve();
  }

  del(key: string) {
    this.values.delete(key);
    this.hashes.delete(key);
    return Promise.resolve();
  }

  exists(key: string) {
    return Promise.resolve(this.values.has(key) || this.hashes.has(key));
  }

  hashSize(key: string) {
    return this.hashes.get(key)?.size ?? 0;
  }
}

describe('Redis commerce caching (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: MemoryRedis;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Cache Store ${suffix}`,
        fullName: 'Cache Owner',
        email: `cache-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };

  beforeAll(async () => {
    redis = new MemoryRedis();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redis)
      .compile();
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

  it('caches public product variants and invalidates on catalog, visibility, and stock changes', async () => {
    const account = await register();
    const token = account.accessToken;
    const merchant = account.activeMerchant.merchant;
    const suffix = unique();
    const created = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Cached Product ${suffix}`,
        sku: `cache-${suffix}`,
        price: '24.99',
        status: 'ACTIVE',
        channelVisibility: [
          {
            channel: 'WEBSITE',
            isVisible: true,
            isPurchasable: true,
          },
        ],
      })
      .expect(201);
    const product = created.body.data;
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: 5 })
      .expect(201);

    const cacheKey = `merchant:${merchant.id}:products:public`;
    const first = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(first.body.data[0]).toMatchObject({
      id: product.id,
      price: '24.99',
    });
    expect(redis.hashSize(cacheKey)).toBe(1);

    await prisma.product.update({
      where: { id: product.id },
      data: { price: '88.88' },
    });
    const cached = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(cached.body.data[0].price).toBe('24.99');

    await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: '29.99' })
      .expect(200);
    await expect(redis.exists(cacheKey)).resolves.toBe(false);
    const refreshed = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(refreshed.body.data[0].price).toBe('29.99');

    await request(app.getHttpServer())
      .patch(`/products/${product.id}/channel-visibility`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        channels: [
          {
            channel: 'WEBSITE',
            isVisible: false,
            isPurchasable: false,
          },
        ],
      })
      .expect(200);
    await expect(redis.exists(cacheKey)).resolves.toBe(false);
    const hidden = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(hidden.body.data).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/products/${product.id}/channel-visibility`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        channels: [
          {
            channel: 'WEBSITE',
            isVisible: true,
            isPurchasable: true,
          },
        ],
      })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(redis.hashSize(cacheKey)).toBe(1);

    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: -5 })
      .expect(201);
    await expect(redis.exists(cacheKey)).resolves.toBe(false);
    const outOfStock = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/products`)
      .expect(200);
    expect(outOfStock.body.data).toHaveLength(0);
  });

  it('caches and invalidates the merchant dashboard summary', async () => {
    const account = await register();
    const token = account.accessToken;
    const merchant = account.activeMerchant.merchant;
    const cacheKey = `merchant:${merchant.id}:dashboard`;

    const first = await request(app.getHttpServer())
      .get('/merchant/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(first.body.data.merchant.name).toBe(merchant.name);
    await expect(redis.exists(cacheKey)).resolves.toBe(true);

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { name: 'Database Bypass Name' },
    });
    const cached = await request(app.getHttpServer())
      .get('/merchant/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cached.body.data.merchant.name).toBe(merchant.name);

    await request(app.getHttpServer())
      .patch('/merchant')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fresh Dashboard Name' })
      .expect(200);
    await expect(redis.exists(cacheKey)).resolves.toBe(false);
    const refreshed = await request(app.getHttpServer())
      .get('/merchant/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(refreshed.body.data.merchant.name).toBe('Fresh Dashboard Name');
  });
});
