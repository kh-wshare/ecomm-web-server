/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Social Commerce (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Social Store ${suffix}`,
        fullName: 'Social Owner',
        email: `social-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };

  const createProduct = async (
    token: string,
    status: 'ACTIVE' | 'DRAFT' = 'ACTIVE',
  ) => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Social Product ${suffix}`,
        sku: `social-${suffix}`,
        price: '29.99',
        status,
        channelVisibility: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
          { channel: 'FACEBOOK', isVisible: true, isPurchasable: true },
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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('publishes a website article, logs platform failure, and resolves live stock', async () => {
    const owner = await register();
    const token = owner.accessToken;
    const product = await createProduct(token);
    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: 5, safetyBuffer: 1 })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/social-posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Summer social launch',
        content: 'Discover the live collection.',
        mediaUrls: ['https://cdn.example.com/social/summer.jpg'],
      })
      .expect(201);
    const post = created.body.data;
    expect(post).toMatchObject({
      status: 'DRAFT',
      title: 'Summer social launch',
    });

    const updated = await request(app.getHttpServer())
      .patch(`/social-posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Discover the live collection today.' })
      .expect(200);
    expect(updated.body.data.content).toContain('today');

    const inactiveProduct = await createProduct(token, 'DRAFT');
    await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/hotspots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: inactiveProduct.id,
        xPercent: 10,
        yPercent: 20,
      })
      .expect(409);

    const hotspotResponse = await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/hotspots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        xPercent: 42.25,
        yPercent: 61.5,
        label: 'Shop this product',
      })
      .expect(201);
    const hotspot = hotspotResponse.body.data;

    await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/hotspots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        xPercent: 50,
        yPercent: 50,
      })
      .expect(409);

    const publication = await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .send({ platforms: ['WEBSITE', 'FACEBOOK'] })
      .expect(201);
    expect(publication.body.data.post).toMatchObject({
      status: 'PARTIALLY_PUBLISHED',
      targetPlatforms: expect.arrayContaining(['WEBSITE', 'FACEBOOK']),
    });
    expect(publication.body.data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: 'WEBSITE',
          status: 'PUBLISHED',
        }),
        expect.objectContaining({
          platform: 'FACEBOOK',
          status: 'FAILED',
        }),
      ]),
    );

    const logs = await request(app.getHttpServer())
      .get(`/social-posts/${post.id}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(logs.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ platform: 'WEBSITE', status: 'PUBLISHED' }),
        expect.objectContaining({ platform: 'FACEBOOK', status: 'FAILED' }),
      ]),
    );

    const merchantSlug = owner.activeMerchant.merchant.slug;
    const articles = await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/posts`)
      .expect(200);
    expect(articles.body.data).toHaveLength(1);
    expect(articles.body.data[0]).toMatchObject({
      title: 'Summer social launch',
      hotspots: [
        expect.objectContaining({
          id: hotspot.id,
          socialLink: `/social-links/${hotspot.id}?platform=WEBSITE`,
        }),
      ],
    });
    await request(app.getHttpServer())
      .get(`/storefront/${merchantSlug}/posts/${post.slug}`)
      .expect(200);

    const liveLink = await request(app.getHttpServer())
      .get(`/social-links/${hotspot.id}?platform=WEBSITE`)
      .expect(200);
    expect(liveLink.body.data).toMatchObject({
      isAvailable: true,
      product: { id: product.id, price: '29.99' },
    });

    await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: '34.50' })
      .expect(200);
    const repricedLink = await request(app.getHttpServer())
      .get(`/social-links/${hotspot.id}?platform=WEBSITE`)
      .expect(200);
    expect(repricedLink.body.data.product.price).toBe('34.5');

    await request(app.getHttpServer())
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantityDelta: -5 })
      .expect(201);
    const soldOutLink = await request(app.getHttpServer())
      .get(`/social-links/${hotspot.id}?platform=WEBSITE`)
      .expect(200);
    expect(soldOutLink.body.data.isAvailable).toBe(false);

    await request(app.getHttpServer())
      .patch(`/social-posts/${post.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cannot mutate published post' })
      .expect(409);

    const repeated = await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .send({ platforms: ['WEBSITE'] })
      .expect(201);
    expect(repeated.body.data.results[0]).toMatchObject({
      platform: 'WEBSITE',
      status: 'PUBLISHED',
      skipped: true,
    });
    expect(
      await prisma.websiteArticle.count({
        where: { socialPostId: post.id },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: {
          merchantId: owner.activeMerchant.merchant.id,
          type: 'SOCIAL_POST_PUBLISHED',
        },
      }),
    ).toBe(1);
  });

  it('enforces merchant isolation and social-post permissions', async () => {
    const owner = await register();
    const created = await request(app.getHttpServer())
      .post('/social-posts')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Private draft', content: 'Merchant scoped content' })
      .expect(201);
    const post = created.body.data;

    const outsider = await register();
    await request(app.getHttpServer())
      .get(`/social-posts/${post.id}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(404);

    const merchantId = owner.activeMerchant.merchant.id;
    const viewerRole = await prisma.role.findUniqueOrThrow({
      where: { merchantId_code: { merchantId, code: 'viewer' } },
    });
    await prisma.merchantUser.create({
      data: {
        merchantId,
        userId: outsider.user.id,
        roleId: viewerRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
    const switched = await request(app.getHttpServer())
      .post('/auth/switch-merchant')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ merchantId })
      .expect(200);
    const viewerToken = switched.body.data.accessToken;

    await request(app.getHttpServer())
      .get(`/social-posts/${post.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/social-posts')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Forbidden', content: 'No create permission' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/social-posts/${post.id}/publish`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ platforms: ['WEBSITE'] })
      .expect(403);
  });
});
