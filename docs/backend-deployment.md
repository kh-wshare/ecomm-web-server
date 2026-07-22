# Backend Deployment

This runbook covers the backend API and infrastructure only. Frontend deployment lives in `client/docs/deployment.md`.

## Scope

```txt
PostgreSQL
Redis
NestJS API
Prisma migrations
Swagger/API docs
Background infrastructure used by the API
```

## Local Backend Setup

Start only local infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Install dependencies and prepare the database:

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
```

Run the API:

```bash
pnpm start:dev
```

The local API should listen on:

```txt
http://localhost:9001
```

## Backend Docker Build

```bash
docker compose build app
```

## Backend Production Start

Until the compose files are fully split, the root `docker-compose.yml` can still start the complete stack. For backend-only deployment, run only backend-owned services:

```bash
docker compose up -d postgres redis app
```

## Backend Environment

Backend-owned values:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30
DASHBOARD_FRONTEND_URL=http://localhost/merchant
PUBLIC_STOREFRONT_URL=http://localhost
```

## Verify

```bash
docker compose ps postgres redis app
curl -I http://localhost:3000
curl -I http://localhost:3000/docs/user
curl -I http://localhost:3000/docs/merchant
curl -I http://localhost:3000/docs/pos
curl -I http://localhost:3000/docs/storefront
```

## Backend Ownership Rules

- Backend deploys must not require rebuilding frontend apps.
- Prisma migrations run with the API release.
- API response format stays backend-owned.
- CORS, auth cookies, and public frontend URLs must be configured per environment.
