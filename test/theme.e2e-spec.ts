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
    version: 1,
    brand: {
      storeName: 'Theme Store',
      logoUrl: 'https://cdn.example.com/theme/logo.png',
      faviconUrl: 'https://cdn.example.com/theme/favicon.png',
    },
    colors: {
      preset: 'rose',
      accent,
      scheme: 'light',
      light: {
        background: '#ffffff',
        surface: '#f8fafc',
        foreground: '#0f172a',
      },
      dark: {
        background: '#09090b',
        surface: '#18181b',
        foreground: '#fafafa',
      },
    },
    typography: {
      heading: 'plus-jakarta',
      body: 'manrope',
      baseSize: 16,
    },
    shape: {
      radius: 16,
      buttonStyle: 'solid',
    },
    layout: {
      template: 'classic',
      headerAlign: 'left',
      stickyHeader: true,
      productColumns: 3,
      cardStyle: 'bordered',
    },
    announcement: {
      enabled: true,
      text: 'Free delivery over $30',
    },
    hero: {
      imageUrl: 'https://cdn.example.com/theme/hero.jpg',
      heading: 'Fresh arrivals',
      subheading: 'Built for everyday use.',
      ctaLabel: 'Shop now',
      align: 'left',
      overlay: 35,
      height: 'medium',
    },
    sections: [
      { id: 'hero', enabled: true },
      { id: 'featured', enabled: true },
      { id: 'newsletter', enabled: true },
    ],
    productCard: {
      imageRatio: 'portrait',
      quickAdd: true,
      secondImageOnHover: false,
      showRiel: false,
    },
    productPage: {
      gallery: 'thumbnails',
      stickyBuyBar: true,
      showDeliveryEstimate: true,
    },
    promises: {
      items: [{ icon: 'truck', text: 'Same-day delivery' }],
    },
    footer: {
      about: 'Small-batch goods.',
      showPaymentBadges: true,
      social: {
        facebook: '',
        instagram: '',
        tiktok: '',
        telegram: '',
      },
    },
    mobile: {
      bottomBar: true,
      floatingCart: true,
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
      .get('/storefront/theme')
      .set('X-Merchant-Slug', merchant.slug)
      .expect(200);
    expect(cachedDefault.body.data.config.colors.accent).toBe('#059669');

    const current = await request(app.getHttpServer())
      .get('/themes/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(current.body.data).toMatchObject({
      merchantId: merchant.id,
      liveConfig: { colors: { accent: '#059669' } },
      draftConfig: { colors: { accent: '#059669' } },
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
        layout: { productColumns: 3, cardStyle: 'bordered' },
        sections: expect.arrayContaining([
          expect.objectContaining({ id: 'hero' }),
          expect.objectContaining({ id: 'featured' }),
        ]),
        brand: { storeName: 'Theme Store' },
      },
      liveConfig: { colors: { accent: '#059669' } },
      customDomain,
    });

    const publicBeforePublish = await request(app.getHttpServer())
      .get('/storefront/theme')
      .set('X-Merchant-Slug', merchant.slug)
      .expect(200);
    expect(publicBeforePublish.body.data.config.colors.accent).toBe('#059669');
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
      .get('/storefront/theme')
      .set('X-Merchant-Slug', merchant.slug)
      .expect(200);
    expect(publicAfterPublish.body.data.config.colors.accent).toBe('#dc2626');

    const reset = await request(app.getHttpServer())
      .post('/themes/reset')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(reset.body.data).toMatchObject({
      draftConfig: { colors: { accent: '#059669' } },
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
          layout: {
            headerAlign: 'left',
            stickyHeader: true,
            productColumns: 7,
            cardStyle: 'bordered',
          },
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
