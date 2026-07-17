# Commerce Client Workspace

This folder contains the frontend micro-apps for the commerce platform. Each app is a separate Next.js package and can be developed, built, and deployed independently while sharing UI, query, type, and API client packages.

## Requirements

- Node.js `26.5.0` or newer
- pnpm `10.30.1`
- Backend API on `http://localhost:9001` for local API integration

```bash
cd client
pnpm install
```

## Apps

| App | Package | Local URL | Purpose |
| --- | --- | --- | --- |
| Marketing | `@repo/marketing` | `http://localhost:3003` | Public landing page for the platform |
| Merchant | `@repo/merchant` | `http://localhost:3000/merchant` | Merchant admin workspace |
| POS | `@repo/pos` | `http://localhost:3001/pos` | Staff point-of-sale workspace |
| Storefront | `@repo/storefront` | `http://localhost:3002` | Public shopping storefront |

## Scripts

```bash
pnpm marketing:dev
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
pnpm type-check
pnpm lint
pnpm build
```

## Local Gateway

The local nginx gateway lives in this folder as `docker-compose.gateway.yml`.

Start the apps in separate terminals:

```bash
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

Then start the gateway:

```bash
docker compose -f docker-compose.yml up
```

Open:

```txt
http://localhost/merchant
http://localhost/pos
http://localhost
```

Marketing currently runs directly at `http://localhost:3003`.

## Docs

- [Architecture](./docs/architecture.md)
- [Development](./docs/development.md)
- [Gateway Routing](./docs/gateway-routing.md)
- [Marketing App](./docs/marketing.md)
