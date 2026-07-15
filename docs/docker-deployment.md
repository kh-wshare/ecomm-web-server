# Docker Deployment

Phase 7 packages the three frontend apps as independent standalone Next.js
containers and exposes them through nginx.

## Services

```txt
postgres   PostgreSQL database
redis      Redis cache/session infrastructure
app        NestJS API on the internal Docker network at app:3000
merchant   Next.js merchant app on the internal Docker network at merchant:3000
pos        Next.js POS app on the internal Docker network at pos:3001
storefront Next.js storefront app on the internal Docker network at storefront:3002
nginx      Public gateway on http://localhost
```

The public gateway routes:

```txt
/merchant/* -> merchant
/pos/*      -> pos
/*          -> storefront
```

## Environment

Each app has a checked-in example file:

```txt
apps/merchant/.env.example
apps/pos/.env.example
apps/storefront/.env.example
```

The frontend containers validate environment variables with Zod at startup.
For Docker Compose, the defaults in `docker-compose.yml` are enough for local
verification. Production deployments should override these values in `.env`.

Important public values:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_URL=http://localhost/merchant
NEXT_PUBLIC_STOREFRONT_URL=http://localhost
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3000
GATEWAY_PORT=80
```

## Build Images

Build the API:

```bash
docker compose build app
```

Build each frontend independently:

```bash
docker compose build merchant
docker compose build pos
docker compose build storefront
```

Build the complete stack:

```bash
docker compose build
```

## Start

```bash
docker compose up -d
```

Open:

```txt
http://localhost/merchant
http://localhost/pos
http://localhost
```

## Verify

```bash
docker compose ps
curl -I http://localhost/merchant
curl -I http://localhost/pos
curl -I http://localhost
```

Static assets should be served through nginx with immutable cache headers:

```bash
curl -I http://localhost/_next/static/<asset>
```

## Stop

```bash
docker compose down
```

To remove database/cache volumes:

```bash
docker compose down -v
```
