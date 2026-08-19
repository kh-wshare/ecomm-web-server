# Frontend Integration Guide

This guide documents how the active frontend apps integrate with the NestJS
commerce API.

## API Origins

Local development defaults:

```txt
Backend API   http://localhost:9001
Merchant app  http://localhost:3000/merchant
POS app       http://localhost:3001/pos
Storefront    http://localhost:3002
```

Frontend apps should call their own Next.js route handlers when a request needs
HTTP-only cookies or server-side token forwarding. Browser-only public flows may
call the backend API directly when no private token is needed.

## Swagger Documents

Swagger is split by frontend surface and API audience:

| Surface        | UI                 | JSON                            | Owner                                         |
| -------------- | ------------------ | ------------------------------- | --------------------------------------------- |
| User/Auth      | `/docs/user`       | `/docs/user/openapi.json`       | Merchant auth, POS auth, shared account flows |
| Merchant       | `/docs/merchant`   | `/docs/merchant/openapi.json`   | Merchant dashboard                            |
| POS            | `/docs/pos`        | `/docs/pos/openapi.json`        | POS register                                  |
| Storefront     | `/docs/storefront` | `/docs/storefront/openapi.json` | Public storefront and checkout                |
| Platform Admin | `/docs/admin`      | `/docs/admin/openapi.json`      | Internal platform admin                       |

Use `.env` flags to enable or disable documents:

```env
SWAGGER_ENABLED=true
SWAGGER_USER_ENABLED=true
SWAGGER_MERCHANT_ENABLED=true
SWAGGER_POS_ENABLED=true
SWAGGER_STOREFRONT_ENABLED=true
SWAGGER_ADMIN_ENABLED=false
```

## Response Format

The backend wraps successful responses:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-07-19T00:00:00.000Z",
  "path": "/products",
  "correlationId": "..."
}
```

Paginated responses include `meta` next to `data`:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 15,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

Frontend code should unwrap `data` with `unwrapApiResponseData` from
`@repo/api-client` when it receives backend-shaped responses.

## Authentication

Shared auth endpoints live in the User/Auth Swagger document:

```txt
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/switch-merchant
```

Private API requests require:

```txt
Authorization: Bearer <accessToken>
X-Merchant-ID: <merchantId>    # optional when the JWT session already carries merchant context
```

The backend still enforces JWT, active session, merchant membership, and
permission guards. Hiding UI actions is not a security boundary.

## Merchant App Integration

The merchant app should call its local route handlers under:

```txt
/merchant/auth/session/*
/merchant/api/commerce/*
/merchant/api/dashboard/*
/merchant/api/files/*
```

Those route handlers own HTTP-only cookies, token forwarding, and expired-token
cleanup. Browser components should not read or store backend access tokens.

Important merchant proxy routes:

| Frontend route                        | Backend target                                                    |
| ------------------------------------- | ----------------------------------------------------------------- |
| `POST /merchant/auth/session/login`   | `POST /auth/login`                                                |
| `GET /merchant/auth/session/me`       | `GET /auth/me`, refreshes with `POST /auth/refresh` when possible |
| `POST /merchant/auth/session/logout`  | `POST /auth/logout`                                               |
| `/merchant/api/commerce/categories/*` | `/categories/*`                                                   |
| `/merchant/api/commerce/products/*`   | `/products/*`                                                     |
| `/merchant/api/commerce/inventory/*`  | `/inventory/*`                                                    |
| `/merchant/api/commerce/orders/*`     | `/orders/*`                                                       |
| `/merchant/api/commerce/payments/*`   | `/payments/*`                                                     |

## POS App Integration

The POS app should call its local route handlers under `/pos/api/*`. The POS
server routes convert backend auth into POS-scoped HTTP-only cookies:

```txt
pos_access_token
pos_refresh_token
pos_session
```

Current POS proxy routes:

| Frontend route                                                   | Backend target      | Purpose                                                                                   |
| ---------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `POST /pos/api/session/login`                                    | `POST /auth/login`  | Sign in staff and verify `pos.access`                                                     |
| `GET /pos/api/session/me`                                        | local cookie decode | Restore POS session                                                                       |
| `POST /pos/api/session/logout`                                   | local cookie clear  | End POS session                                                                           |
| `POST /pos/api/session/branch`                                   | local cookie update | Select active branch/register                                                             |
| `GET /pos/api/commerce/branches?status=ACTIVE`                   | `GET /branches`     | Branch selector                                                                           |
| `GET /pos/api/commerce/categories?status=ACTIVE`                 | `GET /categories`   | POS category selector                                                                     |
| `GET /pos/api/commerce/products?page=1&limit=100&status=ACTIVE`  | `GET /products`     | POS catalog with product category metadata                                                |
| `POST /pos/api/commerce/pos/sales`                               | `POST /pos/sales`   | Complete a POS sale, reserve and confirm stock, mark the order paid, and return a receipt |
| `GET /pos/api/commerce/orders?page=1&limit=10&sourceChannel=POS` | `GET /orders`       | POS order list                                                                            |

The POS Swagger document covers the backend resources used by these proxy
routes. Login and refresh remain documented in the User/Auth document to avoid
duplicating unrelated account operations in the POS document.

Recommended POS permissions:

```txt
pos.access
pos.sale.create
products.read
inventory.read
orders.read
orders.update
payments.manage
```

## Storefront Integration

Storefront public browsing and checkout use the Storefront Swagger document.
Public product list endpoints accept category filters:

```txt
GET /storefront/:merchantSlug/products?categorySlug=coffee
GET /storefront/:merchantSlug/products?categoryId=<categoryId>
```

Checkout session routes use `X-Checkout-Token` after session creation:

```txt
POST /checkout/session
GET  /checkout/session/:id
POST /checkout/session/:id/confirm
POST /checkout/session/:id/cancel
```

The storefront confirms the checkout before initiating payment. It then selects
one of the `paymentProviders` returned by the checkout session and calls:

```txt
POST /payments/create-intent
GET  /payments/:paymentId/status
```

Both routes are public but require the checkout token: send it in the request
body as `checkoutToken` when creating an intent and in `X-Checkout-Token` when
polling payment status. Poll every 2–5 seconds while the status is `PENDING`;
stop when it becomes `CONFIRMED` or `FAILED`.

```ts
const intent = unwrapApiResponseData(
  await api.post('/payments/create-intent', {
    orderId: checkout.order.id,
    checkoutToken: checkout.checkoutToken,
    provider: 'KHQR', // or 'ABA_PAYWAY' when enabled for this merchant
  }),
);

const payment = unwrapApiResponseData(
  await api.get(`/payments/${intent.id}/status`, {
    headers: { 'X-Checkout-Token': checkout.checkoutToken },
  }),
);
```

For `ABA_PAYWAY`, `create-intent` returns `action.type = "QR"` with the QR
payload, QR image, and (when supplied by PayWay) ABA Mobile deep link. Render
the image or generate a QR from `qrPayload`; never mark the order paid from the
browser. PayWay posts the result to the merchant's configured `callbackUrl` at
`POST /payments/webhook/ABA_PAYWAY/callback`. The backend checks the PayWay
transaction before applying the normalized, atomic confirmation.

`KHQR` returns a dynamic Bakong-compliant QR payload and a verification
reference. Render `qrPayload` with the storefront QR component. The existing
status-polling endpoint verifies the reference with Bakong before it confirms
the order; there is no client-side confirmation path.

When connecting `ABA_PAYWAY`, configure `callbackUrl` as the publicly reachable
backend URL ending in `/payments/webhook/ABA_PAYWAY/callback`. If ABA has
provisioned a callback signing secret, store it as `webhookSecret`; the adapter
validates that HMAC before calling PayWay's transaction-verification API.

Public frontend code must never hold Bakong, ABA, provider, or webhook secrets.

## Error Handling

Private frontend proxy routes should preserve backend `401` responses and clear
their scoped cookies when a refresh token cannot recover the session. Avoid
turning expired sessions into `502`; that causes frontend retry loops and hides
the real auth state.

Client pages should handle:

```txt
401 -> clear local auth state and redirect to login
403 -> show permission/access denied
404 -> show not found
409 -> show conflict message, usually duplicate slug/SKU/code
5xx -> show retryable server error
```

## Backend Review Notes

- Swagger separation is audience-based, not a security boundary.
- POS uses merchant-scoped backend resources through a POS Next.js proxy. The
  backend-native POS module currently exposes sale creation and receipts; future
  work can add register shifts and cash drawer events.
- Merchant and POS proxies should keep token refresh and cookie cleanup logic
  server-side.
- New frontend API calls should be added to the relevant Swagger document and
  this guide at the same time.
