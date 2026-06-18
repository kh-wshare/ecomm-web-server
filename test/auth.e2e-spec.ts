import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E simulation tests.
 *
 * Requires live PostgreSQL and Redis (use docker-compose.dev.yml to start them).
 * Each test run registers a unique user so tests are idempotent.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const unique = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

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

  // ─── Register ───────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('registers a new user and returns a JWT', async () => {
      const email = `test-${unique()}@example.com`;

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'password123', name: 'Test User' })
        .expect(201);

      expect(res.body).toMatchObject({
        access_token: expect.any(String),
        user: {
          email,
          name: 'Test User',
          role: 'USER',
        },
      });
      expect(res.body.user.password).toBeUndefined();
    });

    it('returns 409 when email is already registered', async () => {
      const email = `dup-${unique()}@example.com`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'password123', name: 'First' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'password123', name: 'Second' })
        .expect(409);

      expect(res.body.message).toMatch(/email already in use/i);
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('returns 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `missing-pw-${unique()}@example.com` })
        .expect(400);
    });
  });

  // ─── Login ──────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    let registeredEmail: string;
    const password = 'StrongPass!99';

    beforeAll(async () => {
      registeredEmail = `login-${unique()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: registeredEmail, password, name: 'Login User' })
        .expect(201);
    });

    it('returns a JWT for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registeredEmail, password })
        .expect(200);

      expect(res.body).toMatchObject({
        access_token: expect.any(String),
        user: { email: registeredEmail },
      });
    });

    it('returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registeredEmail, password: 'wrong-password' })
        .expect(401);
    });

    it('returns 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `ghost-${unique()}@example.com`, password })
        .expect(401);
    });
  });

  // ─── Protected route: GET /auth/me ──────────────────────────────────────────

  describe('GET /auth/me', () => {
    let accessToken: string;
    let registeredEmail: string;

    beforeAll(async () => {
      registeredEmail = `me-${unique()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: registeredEmail,
          password: 'mypassword1',
          name: 'Me User',
        })
        .expect(201);

      accessToken = res.body.access_token;
    });

    it('returns the current user for a valid JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: registeredEmail,
        role: 'USER',
      });
      expect(res.body.password).toBeUndefined();
    });

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns 401 for a malformed token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer this.is.not.valid')
        .expect(401);
    });

    it('returns 401 for an expired / tampered token', async () => {
      const tampered = accessToken.slice(0, -5) + 'XXXXX';
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tampered}`)
        .expect(401);
    });
  });

  // ─── Full round-trip simulation ──────────────────────────────────────────────

  describe('Full auth flow simulation', () => {
    it('register → login → access protected route', async () => {
      const email = `flow-${unique()}@example.com`;
      const password = 'FlowTest@123';

      // 1. Register
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, name: 'Flow User' })
        .expect(201);

      expect(registerRes.body.access_token).toBeDefined();

      // 2. Login with the same credentials
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      const token = loginRes.body.access_token;
      expect(token).toBeDefined();

      // 3. Hit a protected endpoint
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.email).toBe(email);
    });
  });
});
