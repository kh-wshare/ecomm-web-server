# Merchant Commerce Platform

NestJS API plus independently deployable merchant, POS, and storefront
frontends.

## Stack

| Area | Technology |
|------|------------|
| API | NestJS 11, Prisma 7, PostgreSQL, Redis |
| Frontends | Next.js 16, React 19, HeroUI 3, Tailwind CSS 4 |
| Workspace | pnpm 10.30.1, Turborepo |
| Runtime | Node.js >= 26.5.0 |
| Deployment | Docker Compose, nginx gateway |

## Apps

| App | Package | Local route | Purpose |
|-----|---------|-------------|---------|
| API | root package | `http://localhost:3000` | Commerce API, auth, checkout, payments, realtime events |
| Merchant | `@repo/merchant` | `http://localhost/merchant` | Merchant admin dashboard |
| POS | `@repo/pos` | `http://localhost/pos` | Staff point-of-sale |
| Storefront | `@repo/storefront` | `http://localhost` | Public storefront and checkout |

The legacy monolithic `dashboard/` app is archived and removed from the active
workspace. New frontend work should live in `apps/*` and shared code should move
through `packages/*`.

## Local Setup

```bash
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
pnpm prisma:migrate
pnpm prisma:generate
```

Run the API:

```bash
pnpm start:dev
```

Run the frontends:

```bash
pnpm mfe:dev
```

Or run one frontend:

```bash
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the NestJS API |
| `pnpm start:dev` | Run the API in watch mode |
| `pnpm test` | Run API unit tests |
| `pnpm test:e2e` | Run API end-to-end tests |
| `pnpm mfe:build` | Build all active frontend apps and shared packages |
| `pnpm mfe:lint` | Lint active frontend apps |
| `pnpm mfe:type-check` | Type-check active frontend apps and shared packages |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Run development migrations |
| `pnpm prisma:migrate:prod` | Run production migrations |

## Docker

Build and run the full stack:

```bash
docker compose up -d --build
```

Gateway routes:

```txt
/merchant/* -> merchant app
/pos/*      -> POS app
/*          -> storefront app
```

See [docs/docker-deployment.md](docs/docker-deployment.md) for build,
verification, and shutdown commands.

## Documentation

- [Docker deployment](docs/docker-deployment.md)
- [Gateway routing](docs/gateway-routing.md)
- [Monolith removal](docs/monolith-removal.md)
- [Migration checklist](dashboard/docs/improvment.md)
- [Merchant roadmap](docs/merchant_master_roadmap.md)

## Structure

```txt
apps/
  merchant/       Merchant admin app
  pos/            POS app
  storefront/     Public storefront app
packages/
  api-client/     Shared API helpers
  auth-client/    Shared auth/session helpers
  query-client/   Shared query keys/client helpers
  types/          Shared domain types
  ui/             Shared HeroUI-based primitives
src/              NestJS API
prisma/           Prisma schema, migrations, seed
deploy/nginx/     Docker gateway config
dashboard/        Archived legacy monolith
```
