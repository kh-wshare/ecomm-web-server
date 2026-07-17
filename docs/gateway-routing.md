# Gateway Routing

Phase 6 uses nginx as a route-based gateway for the three frontend apps.

## Local Ports

```txt
merchant app   http://localhost:3000/merchant
pos app        http://localhost:3001/pos
storefront app http://localhost:3002
gateway        http://localhost
```

## Start Locally

Start the apps in separate terminals:

```bash
cd client
pnpm merchant:dev
pnpm pos:dev
pnpm storefront:dev
```

Start the gateway:

```bash
docker compose -f client/docker-compose.gateway.yml up
```

Then open:

```txt
http://localhost/merchant
http://localhost/pos
http://localhost
```

## Routing Rules

```txt
/merchant/* -> merchant app on 3000
/pos/*      -> POS app on 3001
/*          -> storefront app on 3002
```

The gateway preserves the Next.js base paths for merchant and POS. Static assets
are cached through the matching app path:

```txt
/merchant/_next/static/* -> merchant app
/pos/_next/static/*      -> POS app
/_next/static/*          -> storefront app
```

## Gateway Behavior

- Sets `X-Forwarded-*`, `X-Real-IP`, and original `Host` headers.
- Supports WebSocket and HMR upgrade headers.
- Allows uploads up to `50m`.
- Adds immutable cache headers for Next.js static assets.

## Verify

```bash
docker run --rm -v "$PWD/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t
curl -I http://localhost/merchant
curl -I http://localhost/pos
curl -I http://localhost
```
