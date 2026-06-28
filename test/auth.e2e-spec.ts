import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Merchant auth and authorization (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const registration = (suffix = unique()) => ({
    merchantName: `Test Store ${suffix}`,
    fullName: 'Test Owner',
    email: `owner-${suffix}@example.com`,
    password: 'StrongPassword123!',
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

  it('registers an owner, merchant, session, and merchant permissions', async () => {
    const payload = registration();
    const response = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(payload)
      .expect(201);

    expect(response.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        email: payload.email,
        fullName: payload.fullName,
      },
      activeMerchant: {
        role: 'owner',
        permissions: expect.arrayContaining([
          'merchant.read',
          'user.invite',
          'payment.provider_manage',
        ]),
      },
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const payload = registration();
    await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({ ...payload, merchantName: 'Another Merchant' })
      .expect(409);
  });

  it('validates registration input', async () => {
    await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send({ email: 'invalid', password: 'short' })
      .expect(400);
  });

  it('logs in, reads the profile, and accesses the active merchant', async () => {
    const payload = registration();
    await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(payload)
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);
    const token = login.body.data.accessToken;
    const merchantId = login.body.data.activeMerchant.merchant.id;

    const profile = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body.data.user.email).toBe(payload.email);
    expect(profile.body.data.user.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .get('/merchant')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-ID', merchantId)
      .expect(200);

    await request(app.getHttpServer())
      .get('/merchant')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Merchant-ID', '00000000-0000-4000-8000-000000000000')
      .expect(403);
  });

  it('rejects incorrect credentials and missing access tokens', async () => {
    const payload = registration();
    await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: 'WrongPassword123!' })
      .expect(401);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rotates refresh tokens and revokes the session on logout', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register-merchant')
      .send(registration())
      .expect(201);

    const firstRefreshToken = registered.body.data.refreshToken;
    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);
    expect(rotated.body.data.refreshToken).not.toBe(firstRefreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${rotated.body.data.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${rotated.body.data.accessToken}`)
      .expect(401);
  });
});
