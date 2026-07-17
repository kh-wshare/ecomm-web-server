# Development

## Install

```bash
cd client
pnpm install
```

The workspace uses Node `26.5.0` from `client/.nvmrc`.

## Run One App

```bash
pnpm marketing:dev
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

## Check One App

```bash
pnpm --filter @repo/marketing type-check
pnpm --filter @repo/marketing lint
pnpm --filter @repo/marketing build
```

Replace `@repo/marketing` with `@repo/merchant`, `@repo/pos`, or `@repo/storefront`.

## Check Workspace

```bash
pnpm type-check
pnpm lint
pnpm build
```

## Environment

Local API integration expects the backend at:

```env
INTERNAL_API_URL=http://localhost:9001
NEXT_PUBLIC_API_URL=http://localhost:9001
```

Each app owns its own `.env.example` when it needs runtime configuration.

## Deployment

Frontend deployment is documented separately in [Deployment](./deployment.md).
Backend deployment is documented from the repository root in `docs/backend-deployment.md`.
