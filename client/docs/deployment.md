# Frontend Deployment

This runbook covers frontend apps only. Backend deployment lives in `docs/backend-deployment.md` from the repository root.

## Scope

```txt
apps/marketing
apps/merchant
apps/pos
apps/storefront
packages/*
nginx gateway for frontend routing
```

Marketing is included in the frontend workspace. It still needs a production Dockerfile and gateway route decision before it is part of the production compose stack.

## Local Frontend Setup

```bash
cd client
pnpm install
```

Run apps individually:

```bash
pnpm marketing:dev
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

## Local Gateway

Run merchant, POS, and storefront first:

```bash
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

Start the gateway from `client/`:

```bash
docker compose -f docker-compose.gateway.yml up
```

Routes:

```txt
/merchant -> merchant app
/pos      -> POS app
/         -> storefront app
```

Marketing currently runs directly:

```txt
http://localhost:3003
```

## Build One Frontend App

```bash
pnpm --filter @repo/marketing build
pnpm --filter @repo/merchant build
pnpm --filter @repo/pos build
pnpm --filter @repo/storefront build
```

## Build Frontend Workspace

```bash
pnpm type-check
pnpm lint
pnpm build
```

## Frontend Environment

Frontend apps use app-local `.env.example` files.

Common local values:

```env
INTERNAL_API_URL=http://localhost:9001
NEXT_PUBLIC_API_URL=http://localhost:9001
```

Docker/internal values should point server-side requests to the backend service:

```env
INTERNAL_API_URL=http://app:3000
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Frontend Ownership Rules

- Frontend deploys must not run Prisma migrations.
- Frontend deploys must not require rebuilding the backend API.
- App route handlers may proxy to backend APIs, but domain state remains backend-owned.
- Shared client code belongs in `client/packages/*`.
- Real `.env` files, `.next`, `node_modules`, `.turbo`, and build info stay out of Git.
