import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Theme Builder (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const register = async () => {
    const suffix = unique();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Theme Store ${suffix}`,
        fullName: 'Theme Owner',
        email: `theme-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return response.body.data;
  };
  const config = (accent = '#dc2626') => ({
    preset: 'bold',
    colors: {
      primary: '#111827',
      accent,
      background: '#ffffff',
      text: '#0f172a',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
    },
    layout: {
      productGridColumns: 3,
      showHero: true,
      borderRadius: 'large',
      spacing: 'spacious',
    },
    hero: {
      title: 'Fresh arrivals',
      subtitle: 'Built for everyday use.',
      imageUrl: 'https://cdn.example.com/theme/hero.jpg',
    },
    sections: [
      { id: 'hero', type: 'hero', enabled: true },
      { id: 'product-grid', type: 'productGrid', enabled: true },
      { id: 'social-feed', type: 'socialFeed', enabled: true },
      { id: 'footer', type: 'footer', enabled: true },
    ],
    featuredCollection: { title: 'New favorites' },
    socialFeed: { title: 'Follow our story' },
    contactForm: { title: 'Get in touch' },
    footer: { text: 'Thanks for visiting.' },
    storefront: {
      seoTitle: 'Theme Store',
      seoDescription: 'A storefront theme used by the end-to-end suite.',
      logoUrl: 'https://cdn.example.com/theme/logo.png',
      faviconUrl: 'https://cdn.example.com/theme/favicon.png',
    },
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

  it('keeps drafts private, previews, publishes, invalidates cache, and resets', async () => {
    const account = await register();
    const token = account.accessToken;
    const merchant = account.activeMerchant.merchant;
    const draft = config();
    const customDomain = `shop-${unique()}.theme-example.com`;

    const cachedDefault = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/theme`)
      .expect(200);
    expect(cachedDefault.body.data.config.colors.accent).toBe('#2563eb');

    const current = await request(app.getHttpServer())
      .get('/themes/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(current.body.data).toMatchObject({
      merchantId: merchant.id,
      liveConfig: { colors: { accent: '#2563eb' } },
      draftConfig: { colors: { accent: '#2563eb' } },
      publishedAt: null,
    });

    const updated = await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ config: draft, customDomain })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      draftConfig: {
        colors: { accent: '#dc2626' },
        layout: { borderRadius: 'large', spacing: 'spacious' },
        sections: expect.arrayContaining([
          expect.objectContaining({ type: 'hero' }),
          expect.objectContaining({ type: 'productGrid' }),
        ]),
        storefront: { seoTitle: 'Theme Store' },
      },
      liveConfig: { colors: { accent: '#2563eb' } },
      customDomain,
    });

    const publicBeforePublish = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/theme`)
      .expect(200);
    expect(publicBeforePublish.body.data.config.colors.accent).toBe('#2563eb');
    expect(publicBeforePublish.body.data).not.toHaveProperty('draftConfig');

    const preview = await request(app.getHttpServer())
      .post('/themes/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);
    expect(preview.body.data).toMatchObject({
      preview: true,
      source: 'draft',
      config: { colors: { accent: '#dc2626' } },
    });

    const published = await request(app.getHttpServer())
      .post('/themes/publish')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(published.body.data).toMatchObject({
      version: 1,
      config: { colors: { accent: '#dc2626' } },
      publishedAt: expect.any(String),
    });

    const publicAfterPublish = await request(app.getHttpServer())
      .get(`/storefront/${merchant.slug}/theme`)
      .expect(200);
    expect(publicAfterPublish.body.data.config.colors.accent).toBe('#dc2626');

    const reset = await request(app.getHttpServer())
      .post('/themes/reset')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(reset.body.data).toMatchObject({
      draftConfig: { colors: { accent: '#2563eb' } },
      liveConfig: { colors: { accent: '#dc2626' } },
    });

    const audit = await app.get(PrismaService).auditLog.findFirst({
      where: {
        merchantId: merchant.id,
        action: 'theme.published',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects invalid JSON-schema configs and duplicate custom domains', async () => {
    const first = await register();
    const sharedDomain = `shared-${unique()}.example.com`;
    await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({
        config: {
          ...config(),
          colors: { ...config().colors, accent: 'red' },
          unexpected: true,
        },
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/themes/preview')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({
        config: {
          ...config(),
          layout: { productGridColumns: 7, showHero: true },
        },
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ customDomain: 'not a domain' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ customDomain: sharedDomain })
      .expect(200);
    const second = await register();
    await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${second.accessToken}`)
      .send({ customDomain: sharedDomain.toUpperCase() })
      .expect(409);
  });

  it('allows managers to edit drafts but not publish them', async () => {
    const owner = await register();
    const manager = await register();
    const merchantId = owner.activeMerchant.merchant.id;
    const prisma = app.get(PrismaService);
    const managerRole = await prisma.role.findUniqueOrThrow({
      where: { merchantId_code: { merchantId, code: 'manager' } },
    });
    await prisma.merchantUser.create({
      data: {
        merchantId,
        userId: manager.user.id,
        roleId: managerRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
    const switched = await request(app.getHttpServer())
      .post('/auth/switch-merchant')
      .set('Authorization', `Bearer ${manager.accessToken}`)
      .send({ merchantId })
      .expect(200);
    const managerToken = switched.body.data.accessToken;

    await request(app.getHttpServer())
      .get('/themes/current')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch('/themes/draft')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ config: config('#16a34a') })
      .expect(200);
    await request(app.getHttpServer())
      .post('/themes/preview')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .post('/themes/publish')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });
});
