# Module Ownership

Which `src/modules/*` folder belongs to which frontend surface, and which
ones are intentionally shared. The real source of truth is
[`src/docs/swagger.ts`](../src/docs/swagger.ts)'s per-audience `include: [...]`
arrays — this doc is a narrative map of that; if the two ever disagree,
`swagger.ts` wins (and this file should be updated to match).

## POS-only — `src/modules/pos/*`

Everything specific to the POS register app lives nested under `pos/`:

```txt
pos/                 bootstrap payload + the deprecated legacy POST /pos/sales
pos/devices          device registration
pos/shifts           cashier shift open/close + cash reconciliation
pos/orders           order create/modify/cancel/table-assign
pos/kitchen          send-to-kitchen + kitchen ticket status workflow
pos/payments         split cash/KHQR payments + refunds
pos/tables           dine-in tables
pos/customers        POS walk-in customer directory
pos/sync             offline bootstrap/incremental sync + batch upload
pos/audit            audit log query endpoint
pos/realtime         /ws/pos WebSocket gateway
```

See [`pos-backend-api.md`](./pos-backend-api.md) for the full endpoint
reference.

## Merchant dashboard-only — `src/modules/merchant/*`

Mirroring `pos/*`, every module used only by the merchant dashboard is
nested under `merchant/`:

```txt
merchant                     merchant profile/settings, dashboard summary
merchant/theme               storefront theme config (draft/publish)
merchant/social-post         social post authoring, hotspots, publish logs
merchant/notification        in-app notifications + /notifications WebSocket gateway
merchant/file-storage        upload/serve merchant files (local/S3/Cloudinary)
```

`merchant.module.ts`/`merchant.controller.ts`/`merchant.service.ts` stay at
the root of `merchant/` (they were already there); the other four moved in
from top-level `src/modules/*` folders. This is a pure file-organization
move — no DI wiring changed, `app.module.ts` still imports all five
independently (`MerchantModule` does not import the other four as
children), and `swagger.ts`'s `include[]` arrays still list each by name.

## Shared between Merchant dashboard and POS

**Not duplicated** — one implementation, exposed to both `/docs/merchant`
and `/docs/pos`:

```txt
branch          MerchantBranch CRUD
catalog         products, product variants, channel visibility
catalog/categories   product categories
inventory       stock levels, reserve/confirm/release
order           Order/OrderItem CRUD, checkout confirmation, cancel/refund
payment         payment providers, KHQR/PayWay adapters, webhook confirmation
```

This is the part most likely to look confusing from folder names alone:
`order/` and `payment/` aren't nested under `pos/`, but POS orders and
payments genuinely go through them. `pos/orders` and `pos/payments` are
POS-specific orchestration layers built *on top of* these shared modules —
`PosOrdersService.create` calls `OrderService.confirmCheckout`, and
`PosPaymentsService` reuses `PaymentModule`'s `KhqrAdapter`. They are not
replacements or forks of the shared modules; don't move them under `pos/`.

`pricing/` (top-level, not nested under either) is the same pattern at a
smaller scale: `CartPricingService` prices a cart of items, and both
`checkout/` (storefront) and `pos/orders` call it instead of each
maintaining their own copy. `storefront/context` is the newest member of that
family: one slug-to-merchant lookup shared by every public surface.

## Shared between Merchant dashboard and Storefront

```txt
logistics       delivery methods + priced zones, shipments, tracking events
```

`logistics/` is top-level for the same reason `order/` and `payment/` are, but
its two audiences are the merchant dashboard and the storefront rather than
the dashboard and POS — it appears in `/docs/merchant`, and the storefront
reaches the *same* services through `storefront/delivery` and
`storefront/cart`. `DeliveryQuoteService` prices a delivery option exactly
once, so a shopper and a merchant can never be looking at two different fees;
`ShipmentsService.findForOrder` is likewise the one read behind both the
dashboard's shipment list and the public tracking page. Do not fork a
storefront copy of either.

POS does not use it: a POS sale is handed over at the counter, so it has no
delivery method and no shipment.

## Storefront-only (public, no JWT)

```txt
storefront                    public catalog browsing by merchant slug
storefront/cart               anonymous cart: lines, contact, delivery choice, convert to checkout
storefront/address            shopper address book, reached through the cart
storefront/delivery           delivery quoting for a destination + order tracking
storefront/context            slug -> merchant lookup shared by all of the above
checkout                      public checkout session creation/confirm/cancel
storefront/payment            public payment-intent creation + status polling
storefront/payment-webhook    provider webhook callbacks (KHQR push, PayWay callback)
storefront/social-post        public social post / shoppable-hotspot pages
```

Authenticated by opaque bearer tokens, not a user JWT: `X-Cart-Token` for a
cart and `X-Checkout-Token` for a checkout session. Both store only a SHA-256
hash and compare in constant time — see `cart.service.ts`'s `authenticate` and
`checkout.service.ts`'s token-hash verification.

Shoppers have no account, so the address book hangs off the merchant's
`Customer` directory (the same table POS walk-in customers use) rather than a
user. The cart's contact details identify which customer that is, which is why
a cart needs a name plus an email or phone before an address can be saved.

## Platform admin-only

```txt
users           platform user administration (separate from merchant roles)
```
Exposed only via `/docs/admin`, disabled by default in production
(`SWAGGER_ADMIN_ENABLED`).

## Shared core infrastructure

No Swagger document of their own — consumed by every surface above rather
than exposed as a distinct product surface:

```txt
authenticated (auth)   login, refresh, session issuance, JWT strategy/guards
authorization          permissions/roles constants, merchant-role seeding, guards
sessions               refresh-token session storage/rotation (not POS shifts — see below)
roles / permissions    thin CRUD over the Role/Permission tables
audit-log              AuditLogService (mostly superseded by inline tx.auditLog.create
                        calls in each module + pos/audit's query endpoint)
social-auth            Firebase/Telegram profile resolution; its own SocialAuthController
                        is mounted inside AuthModule's controllers, so its routes surface
                        under /docs/user, not a doc of its own
pricing                CartPricingService (see above)
metrics                Prometheus /metrics scrape endpoint (intentionally excluded
                        from every Swagger doc — not a consumer-facing API)
```

One naming gotcha: `sessions/` is JWT refresh-token session management
(login sessions), completely unrelated to `pos/shifts/` (cashier
shift/till/cash-drawer sessions). They used to risk a naming collision,
which is why the POS concept is called a "shift," not a "session."

## Quick reference table

| Module | Merchant | POS | Storefront | Admin | Notes |
| --- | :-: | :-: | :-: | :-: | --- |
| `authenticated` | ✅ | ✅ | | ✅ | Shared login/JWT, own `/docs/user` doc |
| `authorization` | ✅ | ✅ | | | Guards + permission constants, no controller |
| `sessions` | ✅ | ✅ | | ✅ | Refresh tokens, not POS shifts |
| `merchant` | ✅ | | | | |
| `branch` | ✅ | ✅ | | | Shared |
| `catalog` (+`categories`) | ✅ | ✅ | | | Shared |
| `inventory` | ✅ | ✅ | | | Shared |
| `order` | ✅ | ✅ | | | Shared; POS layers on top via `pos/orders` |
| `payment` | ✅ | ✅ | | | Shared; POS layers on top via `pos/payments` |
| `logistics` | ✅ | | ✅ (via `storefront/*`) | | Shared; delivery methods/zones + shipments |
| `pricing` | | | ✅ (via `checkout`) | | Shared with POS too, no doc of its own |
| `merchant/theme` | ✅ | | | | |
| `merchant/social-post` | ✅ | | | | |
| `merchant/notification` | ✅ | | | | Own `/notifications` WS gateway |
| `merchant/file-storage` | ✅ | | | | |
| `pos/*` | | ✅ | | | POS-only, see above |
| `storefront` | | | ✅ | | |
| `storefront/cart` | | | ✅ | | `X-Cart-Token`, no shopper account |
| `storefront/address` | | | ✅ | | Address book under the cart |
| `storefront/delivery` | | | ✅ | | Quoting + order tracking |
| `storefront/context` | — | — | — | — | No controller; slug lookup, like `pricing` |
| `checkout` | | | ✅ | | |
| `storefront/payment` | | | ✅ | | |
| `storefront/payment-webhook` | | | ✅ | | |
| `storefront/social-post` | | | ✅ | | |
| `users` | | | | ✅ | |
| `roles` / `permissions` | — | — | — | — | No controller; CRUD used internally |
| `audit-log` | — | — | — | — | No controller; `pos/audit` is the query surface |
| `social-auth` | — | — | — | — | Controller mounted inside `AuthModule`, surfaces under `/docs/user` |
| `metrics` | — | — | — | — | `/metrics`, excluded from all Swagger docs |
