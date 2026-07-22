# Merchant Commerce Platform

NestJS commerce API with independently deployable merchant, POS, storefront,
and marketing frontends.

## Overview

This repository contains the backend API at the root and a separate frontend
workspace in `client/`.

The platform covers merchant onboarding, authentication, role and permission
checks, catalog management, inventory, checkout, orders, payments, file storage,
theme settings, social posts, notifications, storefront browsing, and audit
logging.

## Stack

| Area             | Technology                                        |
| ---------------- | ------------------------------------------------- |
| API              | NestJS 11, Prisma 7, PostgreSQL, Redis, Socket.IO |
| Frontends        | Next.js 16, React 19, HeroUI 3, Tailwind CSS 4    |
| Backend package  | Root package, pnpm 10.30.1                        |
| Client workspace | `client/`, pnpm 10.30.1, Turborepo                |
| Runtime          | Node.js >= 26.5.0                                 |
| Deployment       | Docker Compose, nginx gateway                     |

## Applications

| App        | Package            | Local URL                        | Purpose                                                 |
| ---------- | ------------------ | -------------------------------- | ------------------------------------------------------- |
| API        | root package       | `http://localhost:9001`          | Commerce API, auth, checkout, payments, realtime events |
| Merchant   | `@repo/merchant`   | `http://localhost:3000/merchant` | Merchant admin dashboard                                |
| POS        | `@repo/pos`        | `http://localhost:3001/pos`      | Staff point-of-sale                                     |
| Storefront | `@repo/storefront` | `http://localhost:3002`          | Public storefront and checkout                          |
| Marketing  | `@repo/marketing`  | `http://localhost:3003`          | Public marketing site                                   |

In the production Docker gateway, nginx routes `/merchant/*` to the merchant
app, `/pos/*` to the POS app, and `/` to the storefront app.

## Local Setup

Install backend dependencies:

```bash
pnpm install
```

Install frontend workspace dependencies:

```bash
cd client
pnpm install
cd ..
```

Create the backend environment file:

```bash
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Prepare the database:

```bash
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
```

Run the API:

```bash
pnpm start:dev
```

Run all active frontend apps:

```bash
cd client
pnpm dev
```

Run one frontend app:

```bash
cd client
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
pnpm marketing:dev
```

## Environment

The backend environment is documented in `.env.example`. The most important
local settings are:

| Variable                 | Default                        | Description                   |
| ------------------------ | ------------------------------ | ----------------------------- |
| `PORT`                   | `9001`                         | Local API port                |
| `DATABASE_URL`           | PostgreSQL on `localhost:5448` | Prisma database connection    |
| `REDIS_URL`              | `redis://localhost:6388`       | Redis connection              |
| `JWT_ACCESS_SECRET`      | placeholder                    | Access token signing secret   |
| `JWT_REFRESH_SECRET`     | placeholder                    | Refresh token signing secret  |
| `STORAGE_PROVIDER`       | `local`                        | File storage driver           |
| `DASHBOARD_FRONTEND_URL` | `http://localhost:3000`        | CORS origin for merchant UI   |
| `PUBLIC_STOREFRONT_URL`  | `http://localhost:3002`        | CORS origin for storefront UI |

Frontend apps also include `.env.example` files in their app directories.

## API Documentation

Swagger is enabled by default in development:

| Docs               | URL                                     | Scope                                                                 |
| ------------------ | --------------------------------------- | --------------------------------------------------------------------- |
| User API           | `http://localhost:9001/docs/user`       | Authentication, sessions, profiles, merchant access                   |
| Merchant API       | `http://localhost:9001/docs/merchant`   | Tenant-scoped merchant operations                                     |
| POS API            | `http://localhost:9001/docs/pos`        | POS branch, catalog, inventory, sale completion, and order operations |
| Storefront API     | `http://localhost:9001/docs/storefront` | Public storefront, checkout, reservations                             |
| Platform Admin API | `http://localhost:9001/docs/admin`      | Platform administration, disabled by default in `.env.example`        |

Use `SWAGGER_ENABLED` and the `SWAGGER_*_ENABLED` flags in `.env` to control
which documents are exposed.

## Backend Scripts

| Command                    | Description                  |
| -------------------------- | ---------------------------- |
| `pnpm build`               | Build the NestJS API         |
| `pnpm start:dev`           | Run the API in watch mode    |
| `pnpm lint:check`          | Check backend linting        |
| `pnpm type-check`          | Type-check the backend       |
| `pnpm test`                | Run backend unit tests       |
| `pnpm test:e2e`            | Run backend end-to-end tests |
| `pnpm prisma:generate`     | Generate Prisma Client       |
| `pnpm prisma:migrate`      | Run development migrations   |
| `pnpm prisma:migrate:prod` | Run production migrations    |
| `pnpm prisma:seed`         | Seed the database            |
| `pnpm prisma:studio`       | Open Prisma Studio           |

## Frontend Scripts

Run these from `client/`:

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `pnpm dev`            | Run all active frontend apps                   |
| `pnpm build`          | Build active frontend apps and shared packages |
| `pnpm lint`           | Lint active frontend apps                      |
| `pnpm type-check`     | Type-check frontend apps and shared packages   |
| `pnpm merchant:dev`   | Run only the merchant app                      |
| `pnpm pos:dev`        | Run only the POS app                           |
| `pnpm storefront:dev` | Run only the storefront app                    |
| `pnpm marketing:dev`  | Run only the marketing app                     |

## Docker

For local development infrastructure only:

```bash
docker compose -f docker-compose.dev.yml up -d
```

For the full production-like stack:

```bash
docker compose up -d --build
```

Gateway routes:

```txt
/merchant/* -> merchant app
/pos/*      -> POS app
/*          -> storefront app
```

See [docs/docker-deployment.md](docs/docker-deployment.md) and
[docs/gateway-routing.md](docs/gateway-routing.md) for deployment and routing
details.

## Project Structure

```txt
client/
  apps/
    marketing/    Public marketing app
    merchant/     Merchant admin app
    pos/          POS app
    storefront/   Public storefront app
  packages/
    api-client/   Shared API helpers
    auth-client/  Shared auth/session helpers
    query-client/ Shared query keys/client helpers
    types/        Shared domain types
    ui/           Shared HeroUI-based primitives
  dashboard/      Archived legacy dashboard
deploy/nginx/     Docker gateway config
docs/             Deployment notes, roadmaps, and migration docs
prisma/           Prisma schema, migrations, and seed data
src/              NestJS API modules and shared infrastructure
test/             Backend end-to-end tests
```

## Documentation

- [Backend deployment](docs/backend-deployment.md)
- [Docker deployment](docs/docker-deployment.md)
- [Frontend integration](docs/frontend-integration.md)
- [Gateway routing](docs/gateway-routing.md)
- [Improvement notes](docs/improvement.md)
- [Merchant roadmap](docs/merchant_master_roadmap.md)
- [Monolith removal](docs/monolith-removal.md)
