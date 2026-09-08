import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const BOT_TOKEN = 'e2e-test-telegram-bot-token';

function buildInitData(
  telegramUserId: number,
  authDate: number = Math.floor(Date.now() / 1000),
) {
  const user = JSON.stringify({
    id: telegramUserId,
    first_name: 'Mini',
    last_name: 'App',
    username: `miniapp${telegramUserId}`,
  });
  const fields: Record<string, string> = {
    query_id: 'AAH_e2e',
    user,
    auth_date: String(authDate),
  };
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const uniqueTelegramId = () =>
  Math.floor(Date.now() % 1_000_000_000) + Math.floor(Math.random() * 1000);

const uniqueSuffix = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

describe('Telegram Mini App login (e2e)', () => {
  let app: INestApplication<App>;

  async function registerAndGetToken() {
    const suffix = uniqueSuffix();
    const registered = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({
        merchantName: `Link Test Store ${suffix}`,
        fullName: 'Link Tester',
        email: `link-${suffix}@example.com`,
        password: 'StrongPassword123!',
      })
      .expect(201);
    return registered.body.data.accessToken as string;
  }

  beforeAll(async () => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;

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

  it('logs in a new customer via a validly signed initData payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app')
      .send({ initData: buildInitData(uniqueTelegramId()) })
      .expect(200);

    expect(response.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { id: expect.any(String) },
    });
  });

  it('rejects a tampered initData payload', async () => {
    const tampered = buildInitData(uniqueTelegramId()).replace(
      'AAH_e2e',
      'TAMPERED',
    );
    await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app')
      .send({ initData: tampered })
      .expect(401);
  });

  it('rejects expired auth_date', async () => {
    const oldAuthDate = Math.floor(Date.now() / 1000) - 100_000;
    await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app')
      .send({ initData: buildInitData(uniqueTelegramId(), oldAuthDate) })
      .expect(401);
  });

  it('logs the same Telegram user into the same backend user on repeat login', async () => {
    const telegramUserId = uniqueTelegramId();
    const first = await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app')
      .send({ initData: buildInitData(telegramUserId) })
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app')
      .send({ initData: buildInitData(telegramUserId) })
      .expect(200);

    expect(second.body.data.user.id).toBe(first.body.data.user.id);
  });

  it('exposes the link route at both the merchant and customer path aliases', async () => {
    const tokenA = await registerAndGetToken();
    const linkedViaMerchantPath = await request(app.getHttpServer())
      .post('/auth/telegram/mini-app/link')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ initData: buildInitData(uniqueTelegramId()) })
      .expect(200);
    expect(linkedViaMerchantPath.body.data).toEqual({
      linked: true,
      provider: 'telegram',
    });

    const tokenB = await registerAndGetToken();
    const linkedViaCustomerPath = await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app/link')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ initData: buildInitData(uniqueTelegramId()) })
      .expect(200);
    expect(linkedViaCustomerPath.body.data).toEqual({
      linked: true,
      provider: 'telegram',
    });
  });

  it('rejects linking a Telegram identity already linked to another user', async () => {
    const telegramUserId = uniqueTelegramId();
    const tokenA = await registerAndGetToken();
    await request(app.getHttpServer())
      .post('/auth/telegram/mini-app/link')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ initData: buildInitData(telegramUserId) })
      .expect(200);

    const tokenB = await registerAndGetToken();
    await request(app.getHttpServer())
      .post('/auth/customer/telegram/mini-app/link')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ initData: buildInitData(telegramUserId) })
      .expect(409);
  });
});
