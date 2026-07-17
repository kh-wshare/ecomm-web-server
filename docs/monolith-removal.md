# Monolith Removal

Phase 8 removes the legacy `client/dashboard/` app from active production
ownership. The directory remains in the frontend workspace as an archive only.

## Active Frontend Owners

| Surface | Active owner |
|---------|--------------|
| Merchant auth | `client/apps/merchant` |
| Merchant dashboard | `client/apps/merchant` |
| POS | `client/apps/pos` |
| Public storefront | `client/apps/storefront` |
| Checkout | `client/apps/storefront` |

## Route Parity

| Legacy route | New route |
|--------------|-----------|
| `/auth/login` | `/merchant/auth/login` |
| `/auth/register` | `/merchant/auth/register` |
| `/auth/invite` | `/merchant/auth/invite` |
| `/auth/forgot-password` | `/merchant/auth/forgot-password` |
| `/auth/reset-password` | `/merchant/auth/reset-password` |
| `/auth/telegram/callback` | `/merchant/auth/telegram/callback` |
| `/dashboard` | `/merchant/dashboard` |
| `/dashboard/products` | `/merchant/products` |
| `/dashboard/products/new` | `/merchant/products/new` |
| `/dashboard/products/[id]` | `/merchant/products/[id]` |
| `/dashboard/products/[id]/edit` | `/merchant/products/[id]/edit` |
| `/dashboard/inventory` | `/merchant/inventory` |
| `/dashboard/inventory/movements` | `/merchant/inventory/movements` |
| `/dashboard/inventory/alerts` | `/merchant/inventory/alerts` |
| `/dashboard/orders` | `/merchant/orders` |
| `/dashboard/orders/[id]` | `/merchant/orders/[id]` |
| `/dashboard/payments/providers` | `/merchant/payments/providers` |
| `/dashboard/payments/transactions` | `/merchant/payments/transactions` |
| `/dashboard/payments/transactions/[id]` | `/merchant/payments/transactions/[id]` |
| `/dashboard/storefront/theme` | `/merchant/storefront/theme` |
| `/dashboard/storefront/settings` | `/merchant/storefront/settings` |
| `/dashboard/social-posts` | `/merchant/social-posts` |
| `/dashboard/social-posts/new` | `/merchant/social-posts/new` |
| `/dashboard/social-posts/[id]` | `/merchant/social-posts/[id]` |
| `/store/[merchantSlug]` | `/[merchantSlug]` |
| `/store/[merchantSlug]/products/[productSlug]` | `/[merchantSlug]/products/[productSlug]` |
| `/checkout/[sessionId]` | `/checkout/[sessionId]` |
| `/checkout/[sessionId]/success` | `/checkout/[sessionId]/success` |

## Build Ownership

- `client/pnpm-workspace.yaml` includes only `apps/*` and `packages/*`.
- CI uses Node `26.5.0` and pnpm `10.30.1`.
- CI validates the API from the repo root and frontend `lint`, `type-check`,
  and `build` from `client/`.
- Docker Compose routes public traffic through nginx to the active apps.

## Archive Rules

- Do not add new production functionality under `client/dashboard/`.
- Do not import from `client/dashboard/*` in `client/apps/*` or
  `client/packages/*`.
- Move reusable frontend code through `client/packages/*`.
- Remove the archived directory in a later cleanup once no historical reference is needed.
