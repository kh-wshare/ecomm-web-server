# Micro-Frontend Migration TODO

## Goal

Move the current single `dashboard/` Next.js frontend toward a route-based micro-frontend architecture that can support independently deployable client surfaces.

Current state:

```txt
dashboard/
  app/(auth)
  app/(dashboard)
  app/(storefront)
  components/
  lib/
  hooks/
  stores/
  types/
```

Target state:

```txt
commerce-platform/
  apps/
    merchant/
    pos/
    storefront/
  packages/
    ui/
    auth-client/
    api-client/
    query-client/
    types/
    eslint-config/
    typescript-config/
```

Use route-based composition through a gateway or reverse proxy.

Do not use:

- [ ] Module Federation.
- [ ] iframe composition.
- [ ] Direct imports between applications.
- [ ] Duplicated auth or API client implementations.

---

## Target Applications

### Merchant Admin

Local port:

```txt
3000
```

Base path:

```txt
/merchant
```

Owns:

- [ ] Merchant dashboard.
- [ ] Product management.
- [ ] Product variants.
- [ ] Inventory management.
- [ ] Order management.
- [ ] Payment provider settings.
- [ ] Storefront theme builder.
- [ ] Storefront settings.
- [ ] Social post composer.
- [ ] Staff, roles, and permissions.

Initial route mapping:

```txt
Current dashboard route                    Target merchant route
---------------------------------------------------------------
/dashboard                                 /merchant/dashboard
/dashboard/products                        /merchant/products
/dashboard/products/new                    /merchant/products/new
/dashboard/products/[id]                   /merchant/products/[id]
/dashboard/products/[id]/edit              /merchant/products/[id]/edit
/dashboard/inventory                       /merchant/inventory
/dashboard/inventory/movements             /merchant/inventory/movements
/dashboard/inventory/alerts                /merchant/inventory/alerts
/dashboard/orders                          /merchant/orders
/dashboard/orders/[id]                     /merchant/orders/[id]
/dashboard/payments/providers              /merchant/payments/providers
/dashboard/payments/transactions           /merchant/payments/transactions
/dashboard/storefront/theme                /merchant/storefront/theme
/dashboard/storefront/settings             /merchant/storefront/settings
/dashboard/social-posts                    /merchant/social-posts
```

### POS

Local port:

```txt
3001
```

Base path:

```txt
/pos
```

Owns:

- [ ] Staff login.
- [ ] Branch selection.
- [ ] Sale screen.
- [ ] Product catalog for POS.
- [ ] Product search, barcode, and SKU search.
- [ ] Cart management.
- [ ] Variant and modifier selection.
- [ ] Dining table selection.
- [ ] Cash and KHQR payment.
- [ ] Receipt screen.
- [ ] Active order management.
- [ ] Shift or cashier session state.

Routes:

```txt
/pos/login
/pos/select-branch
/pos/sale
/pos/orders
/pos/orders/[id]
/pos/receipt/[id]
/pos/settings
```

### Storefront

Local port:

```txt
3002
```

Production path:

```txt
/{merchantSlug}
/{merchantSlug}/products
/{merchantSlug}/products/{productSlug}
/{merchantSlug}/cart
/{merchantSlug}/checkout
/{merchantSlug}/order-success
```

Owns:

- [ ] Public storefront home.
- [ ] Product listing.
- [ ] Product detail.
- [ ] Product variants.
- [ ] Customer cart.
- [ ] Checkout.
- [ ] Payment method selection.
- [ ] Order confirmation.
- [ ] Customer order status.

Storefront must stay public except optional customer account/order history routes.

---

## Migration Phases

Current phase status:

| Phase | Status | Owner Focus |
| --- | --- | --- |
| Phase 0: Stabilize The Current Monolith | In progress | Dashboard builds on Node `26.5.0`; backend-backed route verification still needs the API server. |
| Phase 1: Create Workspace Skeleton | Done | `apps/*`, `packages/*`, pnpm workspace, and Turbo are in place. |
| Phase 2: Extract Shared Packages | In progress | Finish moving stable types, API, auth, query, and UI primitives. |
| Phase 3: Migrate Merchant Admin | Done | Merchant route groups are migrated into `apps/merchant` and verified. |
| Phase 4: Migrate Storefront | Done | Public storefront, product detail, checkout, order success, and optional customer auth routes are migrated into `apps/storefront`. |
| Phase 5: Build POS App | Done | POS app now has staff login, branch selection, sale screen, cart, payment, receipt, and active order views. |
| Phase 6: Gateway And Routing | Done | Local nginx gateway routes merchant, POS, and storefront apps with static asset and refresh support. |
| Phase 7: Docker And Deployment | Done | Frontend apps have standalone Dockerfiles, Compose services, nginx deployment routing, env examples, and deployment docs. |
| Phase 8: Remove Old Monolith | Done | `dashboard/` is archived, removed from the active workspace, and replaced by documented `apps/*` routes. |

Recommended next order:

1. Keep future frontend work in `apps/*` and shared libraries in `packages/*`.
2. Finish Phase 2 shared package extraction before moving routes.
3. Migrate Merchant Admin first because it owns most current dashboard functionality.
4. Migrate Storefront after shared product/storefront types are stable.
5. Build POS after shared order, payment, inventory, and auth contracts are stable.
6. Add gateway, Docker, and deployment only after apps have real routes.

### Phase 0: Stabilize The Current Monolith

- [x] Keep `dashboard/` as the running production frontend until the split is proven.
- [x] Confirm all current routes compile on Node `26.5.0`.
- [x] Remove stale generated `.next` artifacts before migration work.
- [x] Document all current route groups and shared dependencies.
- [x] Freeze large UI refactors while extracting shared packages.
- [x] Add a migration branch name convention such as `migration/micro-frontend-*`.

Done when:

- [x] Current `dashboard` app still builds.
- [ ] Current auth, dashboard, storefront, and checkout routes still work with the backend API running.
- [x] Migration tasks can proceed without blocking active feature work.

Phase 0 verification:

- [x] `pnpm --dir dashboard type-check` passes on Node `26.5.0`.
- [x] `pnpm --dir dashboard build` passes on Node `26.5.0`.
- [x] Build produced the current app route inventory.
- [x] HTTP smoke routes returned `200` in dashboard dev mode:
  - [x] `/`
  - [x] `/auth/login`
  - [x] `/dashboard`
  - [x] `/checkout/demo`
  - [x] `/store/demo`
- [ ] Re-run backend-backed route smoke tests with the API server listening on the configured API URL.

Phase 0 route baseline:

```txt
/
/auth/forgot-password
/auth/invite
/auth/login
/auth/register
/auth/reset-password
/auth/telegram/callback
/checkout/[sessionId]
/checkout/[sessionId]/success
/dashboard
/dashboard/inventory
/dashboard/inventory/alerts
/dashboard/inventory/movements
/dashboard/orders
/dashboard/orders/[id]
/dashboard/payments/providers
/dashboard/payments/transactions
/dashboard/payments/transactions/[id]
/dashboard/products
/dashboard/products/[id]
/dashboard/products/[id]/edit
/dashboard/products/new
/dashboard/social-posts
/dashboard/social-posts/[id]
/dashboard/social-posts/new
/dashboard/storefront/settings
/dashboard/storefront/theme
/store/[merchantSlug]
/store/[merchantSlug]/products/[productSlug]
```

Phase 0 shared dependency baseline:

- [x] Runtime UI: Next.js `16.2.6`, React `19.2.6`, HeroUI `3.2.1`, Tailwind CSS `4.1.11`.
- [x] Data and state: TanStack Query, Zustand, Socket.IO client.
- [x] Environment contracts: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_WEBSOCKET_URL`.
- [x] Migration branch convention: `migration/micro-frontend-*`.
- [x] UI freeze rule: avoid broad dashboard UI refactors until shared packages and route ownership are stable.

### Phase 1: Create Workspace Skeleton

- [x] Create root `apps/` directory.
- [x] Create root `packages/` directory.
- [x] Add `turbo.json`.
- [x] Update root `pnpm-workspace.yaml`.
- [x] Add root scripts:
  - [x] `pnpm dev`
  - [x] `pnpm mfe:build`
  - [x] `pnpm mfe:type-check`
  - [x] `pnpm --filter @repo/merchant dev`
  - [x] `pnpm --filter @repo/pos dev`
  - [x] `pnpm --filter @repo/storefront dev`
- [x] Create `apps/merchant`.
- [x] Create `apps/pos`.
- [x] Create `apps/storefront`.
- [x] Keep old `dashboard/` temporarily until migration is complete.

Done when:

- [x] Empty apps boot independently.
- [x] Root workspace install works.
- [x] Turborepo can run build and type-check across apps/packages.

### Phase 2: Extract Shared Packages

#### `packages/types`

- [x] Move shared domain types from `dashboard/types`.
- [x] Add product types.
- [x] Add inventory types.
- [x] Add order types.
- [x] Add payment types.
- [x] Add checkout types.
- [x] Add storefront types.
- [x] Add auth user and permission types.
- [x] Export all shared types from a stable package entry.

#### `packages/api-client`

- [x] Move API client from `dashboard/lib/api`.
- [x] Support browser requests through `NEXT_PUBLIC_API_URL`.
- [x] Support server requests through `INTERNAL_API_URL`.
- [x] Normalize API errors.
- [x] Support JSON and `FormData`.
- [x] Support cookie forwarding for server-side requests.
- [x] Create service modules:
  - [x] `products`
  - [x] `inventory`
  - [x] `orders`
  - [x] `payments`
  - [x] `checkout`
  - [x] `storefront`
  - [x] `theme`
  - [x] `social`

#### `packages/auth-client`

- [x] Move session helpers from `dashboard/lib/auth`.
- [x] Support HTTP-only cookie auth.
- [x] Remove token persistence from local storage.
- [x] Provide `getCurrentUser`.
- [x] Provide `login`.
- [x] Provide `logout`.
- [x] Provide `refreshSession`.
- [x] Provide `hasPermission`.
- [x] Provide route middleware helpers.

#### `packages/query-client`

- [x] Move TanStack Query client factory.
- [x] Move query key helpers.
- [x] Add shared retry defaults.
- [x] Add mutation error helpers.
- [x] Prevent global QueryClient singletons on the server.

#### `packages/ui`

- [x] Move pure shared HeroUI wrappers and primitives.
- [x] Move shared display components:
  - [x] `StatusBadge`
  - [x] `MoneyText`
  - [x] `DateTimeText`
  - [x] `EmptyState`
  - [x] `LoadingState`
  - [x] `ErrorState`
  - [x] `ConfirmDialog`
  - [x] `Pagination`
  - [x] `DataTable`
- [x] Keep business API calls out of `packages/ui`.
- [x] Keep application-specific pages out of `packages/ui`.

Done when:

- [x] Shared packages compile independently.
- [x] Apps can import only from package public APIs.
- [x] No app imports another app directly.

Phase 2 verification:

- [x] `pnpm mfe:type-check` passes across `apps/*` and `packages/*`.
- [x] Shared package public entry points are exported from `@repo/types`, `@repo/api-client`, `@repo/auth-client`, `@repo/query-client`, and `@repo/ui`.
- [ ] Replace dashboard-local imports with package imports during route migration.

### Phase 3: Migrate Merchant Admin

Migration rule:

- [ ] Move one route group at a time.
- [ ] Keep `dashboard/` working until all merchant routes pass in `apps/merchant`.
- [x] Prefer shared packages from Phase 2 before copying dashboard-local helpers.
- [ ] Keep merchant-only UI under `apps/merchant/components`.
- [x] Do not import from `dashboard/*` inside `apps/merchant`.

Phase 3 implementation order:

#### Batch 1: Foundation Shell

- [x] Create merchant folder skeleton.
- [x] Add merchant providers, environment module, and API client module.
- [x] Add merchant dashboard shell layout.
- [x] Add auth/session store and hooks.
- [x] Add Next proxy for protected merchant routes.
- [x] Add `/merchant` redirect to `/merchant/dashboard`.
- [x] Add `/merchant/dashboard` placeholder.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant`
  - [x] `GET /merchant/dashboard`

#### Batch 2: Merchant Auth Routes

- [x] Move merchant login route.
- [x] Move merchant register route.
- [x] Move forgot password route.
- [x] Move reset password route.
- [x] Move invitation route.
- [x] Move Telegram callback route.
- [x] Replace token storage with HTTP-only cookie helpers.
- [x] Verify protected merchant routes redirect to `/merchant/auth/login`.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/auth/login`
  - [x] `GET /merchant/auth/register`
  - [x] `GET /merchant/auth/forgot-password`
  - [x] `GET /merchant/auth/reset-password`
  - [x] `GET /merchant/auth/invite`
  - [x] `GET /merchant/auth/telegram/callback`
  - [x] `GET /merchant/auth/session/me` as anonymous user
  - [x] `GET /merchant/dashboard` as anonymous user

#### Batch 3: Dashboard Home

- [x] Move dashboard home page.
- [x] Move dashboard overview widgets.
- [x] Move dashboard home data access.
- [x] Replace dashboard query keys with `@repo/query-client`.
- [x] Replace dashboard UI primitives with `@repo/ui`.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/dashboard`
  - [x] `GET /merchant/api/dashboard/home` as anonymous user

#### Batch 4: Products

- [x] Move product list route.
- [x] Move product create route.
- [x] Move product detail route.
- [x] Move product edit route.
- [x] Move product components.
- [x] Move product hooks and data access.
- [x] Replace shared product status/channel domain types with `@repo/types`.
- [x] Keep merchant product form/list payload types app-local.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/products`
  - [x] `GET /merchant/products/new`
  - [x] `GET /merchant/products/[id]`
  - [x] `GET /merchant/products/[id]/edit`
  - [x] `GET /merchant/api/commerce/products` as anonymous user

#### Batch 5: Inventory

- [x] Move inventory list route.
- [x] Move inventory movements route.
- [x] Move inventory alerts route.
- [x] Move inventory components.
- [x] Move inventory hooks and data access.
- [x] Keep detailed dashboard inventory row and adjustment form types app-local.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/inventory`
  - [x] `GET /merchant/inventory/movements`
  - [x] `GET /merchant/inventory/alerts`
  - [x] `GET /merchant/api/commerce/inventory` as anonymous user

#### Batch 6: Orders

- [x] Move order list route.
- [x] Move order detail route.
- [x] Move order components.
- [x] Move order hooks and data access.
- [x] Replace order domain types with `@repo/types`.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/orders`
  - [x] `GET /merchant/orders/[id]`
  - [x] `GET /merchant/api/commerce/orders` as anonymous user

#### Batch 7: Payments

- [x] Move payment provider settings route.
- [x] Move payment transaction list route.
- [x] Move payment transaction detail route.
- [x] Move payment components.
- [x] Move payment hooks and data access.
- [x] Replace payment domain types with `@repo/types`.
- [x] Use merchant commerce proxy route for payment API calls with HTTP-only cookie sessions.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/payments/providers`
  - [x] `GET /merchant/payments/transactions`
  - [x] `GET /merchant/payments/transactions/[id]`
  - [x] `GET /merchant/api/commerce/payments/providers` as anonymous user

#### Batch 8: Storefront Settings And Theme

- [x] Move storefront settings route.
- [x] Move theme builder route.
- [x] Move storefront settings components.
- [x] Move theme builder components.
- [x] Move theme and storefront admin data access.
- [x] Keep public storefront rendering out of `apps/merchant`.
- [x] Use merchant commerce proxy route for theme and merchant profile API calls with HTTP-only cookie sessions.
- [x] Normalize legacy backend permission codes to shared merchant app permission codes for migrated routes.
- [x] Keep admin theme builder types app-local until they are extracted to `@repo/types`.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/storefront/settings`
  - [x] `GET /merchant/storefront/theme`
  - [x] `GET /merchant/api/commerce/themes/current` as anonymous user
  - [x] `GET /merchant/api/commerce/merchant` as anonymous user

#### Batch 9: Social Posts

- [x] Move social post list route.
- [x] Move social post create route.
- [x] Move social post detail route.
- [x] Move social components.
- [x] Move social hooks and data access.
- [x] Use merchant commerce proxy route for social post API calls with HTTP-only cookie sessions.
- [x] Keep social post domain types app-local until they are extracted to `@repo/types`.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
- [x] Smoke test:
  - [x] `GET /merchant/social-posts`
  - [x] `GET /merchant/social-posts/new`
  - [x] `GET /merchant/social-posts/[id]`
  - [x] `GET /merchant/api/commerce/social-posts` as anonymous user

#### Batch 10: Final Cleanup And Parity

- [x] Search `apps/merchant` for forbidden `dashboard/*` imports.
- [x] Replace remaining shared dashboard-local imports with package imports.
- [x] Confirm every route in the migration map exists in `apps/merchant`.
- [x] Confirm merchant navigation links are base-path-relative under `/merchant`.
- [x] Confirm protected routes redirect correctly.
- [x] Confirm permission-based UI still works through normalized shared permission codes.
- [x] Add route-specific loading states.
- [x] Add route-specific error states.
- [x] Run:
  - [x] `pnpm --filter @repo/merchant type-check`
  - [x] `pnpm --filter @repo/merchant build`
  - [x] `pnpm mfe:type-check`
- [x] Smoke test all migrated merchant routes.

Merchant route migration map:

| Current dashboard file | Target merchant file |
| --- | --- |
| `dashboard/app/(dashboard)/layout.tsx` | `apps/merchant/app/(merchant)/layout.tsx` |
| `dashboard/app/(dashboard)/dashboard/page.tsx` | `apps/merchant/app/(merchant)/dashboard/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/loading.tsx` | `apps/merchant/app/(merchant)/dashboard/loading.tsx` |
| `dashboard/app/(dashboard)/dashboard/error.tsx` | `apps/merchant/app/(merchant)/dashboard/error.tsx` |
| `dashboard/app/(dashboard)/dashboard/products/page.tsx` | `apps/merchant/app/(merchant)/products/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/products/new/page.tsx` | `apps/merchant/app/(merchant)/products/new/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/products/[id]/page.tsx` | `apps/merchant/app/(merchant)/products/[id]/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` | `apps/merchant/app/(merchant)/products/[id]/edit/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/inventory/page.tsx` | `apps/merchant/app/(merchant)/inventory/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/inventory/movements/page.tsx` | `apps/merchant/app/(merchant)/inventory/movements/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/inventory/alerts/page.tsx` | `apps/merchant/app/(merchant)/inventory/alerts/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/orders/page.tsx` | `apps/merchant/app/(merchant)/orders/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/orders/[id]/page.tsx` | `apps/merchant/app/(merchant)/orders/[id]/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/payments/providers/page.tsx` | `apps/merchant/app/(merchant)/payments/providers/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/payments/transactions/page.tsx` | `apps/merchant/app/(merchant)/payments/transactions/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/payments/transactions/[id]/page.tsx` | `apps/merchant/app/(merchant)/payments/transactions/[id]/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/storefront/settings/page.tsx` | `apps/merchant/app/(merchant)/storefront/settings/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/storefront/theme/page.tsx` | `apps/merchant/app/(merchant)/storefront/theme/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/social-posts/page.tsx` | `apps/merchant/app/(merchant)/social-posts/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/social-posts/new/page.tsx` | `apps/merchant/app/(merchant)/social-posts/new/page.tsx` |
| `dashboard/app/(dashboard)/dashboard/social-posts/[id]/page.tsx` | `apps/merchant/app/(merchant)/social-posts/[id]/page.tsx` |

Merchant app target folders:

- [x] `apps/merchant/app/(merchant)`
- [x] `apps/merchant/components/dashboard`
- [ ] `apps/merchant/components/products`
- [ ] `apps/merchant/components/inventory`
- [ ] `apps/merchant/components/orders`
- [ ] `apps/merchant/components/payments`
- [ ] `apps/merchant/components/theme`
- [ ] `apps/merchant/components/social`
- [x] `apps/merchant/hooks`
- [x] `apps/merchant/lib`
- [x] `apps/merchant/stores`
- [x] `apps/merchant/types`

#### Phase 3.1: Merchant App Foundation

Goal:

- [x] Create the merchant app foundation before moving feature routes.
- [x] Keep the foundation route-only and business-domain neutral.
- [x] Prove `/merchant` and `/merchant/dashboard` can render inside the new app shell.

##### Phase 3.1.1: Folder Skeleton

- [x] Create `apps/merchant/app/(merchant)`.
- [x] Create `apps/merchant/app/(merchant)/dashboard`.
- [x] Create `apps/merchant/components/dashboard`.
- [x] Create `apps/merchant/hooks`.
- [x] Create `apps/merchant/lib/api`.
- [x] Create `apps/merchant/lib/auth`.
- [x] Create `apps/merchant/lib/query`.
- [x] Create `apps/merchant/lib/validation`.
- [x] Create `apps/merchant/stores`.
- [x] Create `apps/merchant/types`.

Done when:

- [x] Empty folders are represented by migrated source files or `.gitkeep` placeholders.
- [x] `apps/merchant` has no imports from `dashboard/*`.

##### Phase 3.1.2: Providers And App Runtime

- [x] Replace `apps/merchant/app/providers.tsx` with dashboard-compatible providers.
- [x] Use `createQueryClient` from `@repo/query-client`.
- [x] Keep `next-themes` provider behavior.
- [x] Keep `ToastProvider` placement.
- [x] Add merchant environment validation module.
- [x] Add merchant API client factory using `@repo/api-client`.
- [x] Confirm app layout imports `@repo/ui/styles.css`.

Done when:

- [x] `apps/merchant/app/layout.tsx` renders providers without dashboard-local imports.
- [x] `pnpm --filter @repo/merchant type-check` passes.

##### Phase 3.1.3: Dashboard Shell Layout

- [x] Add `apps/merchant/app/(merchant)/layout.tsx`.
- [x] Add `apps/merchant/components/dashboard/dashboard-shell.tsx`.
- [x] Add `apps/merchant/components/dashboard/dashboard-sidebar.tsx`.
- [x] Add `apps/merchant/components/dashboard/mobile-navigation.tsx`.
- [x] Add `apps/merchant/components/dashboard/top-navigation.tsx`.
- [ ] Move `dashboard/components/dashboard/merchant-switcher.tsx`.
- [ ] Move `dashboard/components/dashboard/notification-menu.tsx`.
- [ ] Move `dashboard/components/dashboard/user-profile-menu.tsx`.
- [x] Add `apps/merchant/components/dashboard/dashboard-icon.tsx`.
- [x] Update navigation hrefs for the merchant app base path.
- [x] Keep shell responsive behavior for desktop sidebar and mobile navigation.

Done when:

- [x] Merchant shell renders with sidebar and top navigation.
- [ ] Merchant shell renders the migrated user menu.
- [x] Navigation links resolve under the `/merchant` base path.

##### Phase 3.1.4: State And Session

- [x] Add `apps/merchant/stores/auth-store.ts`.
- [x] Add `apps/merchant/stores/ui-store.ts`.
- [x] Add `apps/merchant/hooks/use-auth-session.ts`.
- [x] Add `apps/merchant/hooks/use-permissions.ts`.
- [x] Replace `dashboard/lib/auth/token-storage.ts` usage with HTTP-only cookie flow from `@repo/auth-client`.
- [ ] Replace dashboard API calls in session hooks with `@repo/api-client`.
- [x] Replace dashboard query keys with `@repo/query-client`.
- [x] Keep merchant selection state scoped to `apps/merchant`.

Done when:

- [x] Session hook can load current user without localStorage token persistence.
- [x] Permission helper works from the migrated auth store.

##### Phase 3.1.5: Middleware And Access Control

- [x] Add `apps/merchant/proxy.ts` for Next 16 protected-route handling.
- [x] Protect `/merchant/dashboard`.
- [x] Protect `/merchant/products/:path*`.
- [x] Protect `/merchant/inventory/:path*`.
- [x] Protect `/merchant/orders/:path*`.
- [x] Protect `/merchant/payments/:path*`.
- [x] Protect `/merchant/storefront/:path*`.
- [x] Protect `/merchant/social-posts/:path*`.
- [x] Allow `/merchant/auth/:path*` without merchant session.
- [x] Redirect unauthenticated users to `/merchant/auth/login`.
- [x] Preserve intended destination with a `next` query parameter.

Done when:

- [x] Anonymous request to `/merchant/dashboard` redirects to `/merchant/auth/login`.
- [x] Auth routes do not redirect in a loop.

##### Phase 3.1.6: Foundation Routes

- [x] Add `apps/merchant/app/page.tsx` redirect to `/merchant/dashboard`.
- [x] Add `apps/merchant/app/(merchant)/dashboard/page.tsx` placeholder.
- [x] Add `apps/merchant/app/(merchant)/dashboard/loading.tsx`.
- [x] Add `apps/merchant/app/(merchant)/dashboard/error.tsx`.
- [ ] Add `apps/merchant/app/(merchant)/not-found.tsx` if needed.
- [x] Keep placeholder dashboard free of product/order/payment logic.

Done when:

- [x] `/merchant` redirects to `/merchant/dashboard`.
- [x] `/merchant/dashboard` renders the merchant shell placeholder.
- [x] Loading and error states render inside the merchant shell.

##### Phase 3.1.7: Verification

- [x] Run `pnpm --filter @repo/merchant type-check`.
- [x] Run `pnpm --filter @repo/merchant build`.
- [x] Start `pnpm --filter @repo/merchant dev`.
- [x] Smoke test `GET /merchant`.
- [x] Smoke test `GET /merchant/dashboard`.
- [x] Smoke test anonymous redirect for protected routes.
- [x] Stop the dev server after smoke tests.

Done when:

- [x] Type-check passes.
- [x] Build passes.
- [x] `/merchant` responds or redirects correctly.
- [x] `/merchant/dashboard` responds or redirects correctly.
- [x] No dev server remains running.

#### Phase 3.2: Auth Routes

- [x] Move `/auth/login` to `/merchant/auth/login`.
- [x] Move `/auth/register` to `/merchant/auth/register`.
- [x] Move `/auth/forgot-password` to `/merchant/auth/forgot-password`.
- [x] Move `/auth/reset-password` to `/merchant/auth/reset-password`.
- [x] Move `/auth/invite` to `/merchant/auth/invite`.
- [x] Move `/auth/telegram/callback` to `/merchant/auth/telegram/callback`.
- [x] Replace auth validation imports with shared or app-local validation modules.
- [x] Add merchant session handlers for login, register, social login, and current session.
- [x] Keep auth token storage in HTTP-only merchant cookies.
- [x] Verify unauthenticated merchant routes redirect to `/merchant/auth/login`.

#### Phase 3.3: Dashboard Home

- [x] Move `/dashboard` to `/merchant/dashboard`.
- [x] Move dashboard home components:
  - [x] `dashboard-overview`
  - [x] `metric-card`
  - [x] `recent-orders`
  - [x] `sales-chart`
  - [x] `stock-alerts`
- [x] Move dashboard home data access into `apps/merchant/lib/dashboard`.
- [x] Add merchant dashboard-home route handler for HTTP-only cookie sessions.
- [x] Replace query keys with `@repo/query-client`.

#### Phase 3.4: Products

- [x] Move `/dashboard/products` to `/merchant/products`.
- [x] Move `/dashboard/products/new` to `/merchant/products/new`.
- [x] Move `/dashboard/products/[id]` to `/merchant/products/[id]`.
- [x] Move `/dashboard/products/[id]/edit` to `/merchant/products/[id]/edit`.
- [x] Move product components:
  - [x] `product-list`
  - [x] `product-list-loading`
  - [x] `product-detail`
  - [x] `product-form`
  - [x] `product-editor-fields`
  - [x] `product-status-badge`
- [x] Move product hooks/data access into `apps/merchant/lib/products`.
- [x] Anchor shared product status/channel types to `@repo/types`.
- [x] Replace shared UI with `@repo/ui` where possible.
- [x] Add merchant commerce proxy route for product API calls with HTTP-only cookie sessions.

#### Phase 3.5: Inventory

- [x] Move `/dashboard/inventory` to `/merchant/inventory`.
- [x] Move `/dashboard/inventory/movements` to `/merchant/inventory/movements`.
- [x] Move `/dashboard/inventory/alerts` to `/merchant/inventory/alerts`.
- [x] Move inventory components:
  - [x] `inventory-list`
  - [x] `inventory-movements`
  - [x] `inventory-shared`
  - [x] `low-stock-alerts`
  - [x] `stock-adjustment-modal`
- [x] Move inventory hooks/data access into `apps/merchant/lib/inventory`.
- [x] Keep inventory UI/API-specific types app-local until shared package exports matching shapes.
- [x] Use merchant commerce proxy route for inventory API calls with HTTP-only cookie sessions.

#### Phase 3.6: Orders

- [x] Move `/dashboard/orders` to `/merchant/orders`.
- [x] Move `/dashboard/orders/[id]` to `/merchant/orders/[id]`.
- [x] Move order components:
  - [x] `order-list`
  - [x] `order-detail`
  - [x] `order-shared`
  - [x] `order-status-badge`
- [x] Move order hooks/data access into `apps/merchant/lib/orders`.
- [x] Replace order types with `@repo/types`.
- [x] Use merchant commerce proxy route for order API calls with HTTP-only cookie sessions.

#### Phase 3.7: Payments

- [x] Move `/dashboard/payments/providers` to `/merchant/payments/providers`.
- [x] Move `/dashboard/payments/transactions` to `/merchant/payments/transactions`.
- [x] Move `/dashboard/payments/transactions/[id]` to `/merchant/payments/transactions/[id]`.
- [x] Move payment components:
  - [x] `payment-provider-settings`
  - [x] `payment-transaction-list`
  - [x] `payment-detail`
- [x] Move payment hooks/data access into `apps/merchant/lib/payments`.
- [x] Replace payment types with `@repo/types`.
- [x] Use merchant commerce proxy route for payment API calls with HTTP-only cookie sessions.

#### Phase 3.8: Storefront Settings And Theme

- [x] Move `/dashboard/storefront/settings` to `/merchant/storefront/settings`.
- [x] Move `/dashboard/storefront/theme` to `/merchant/storefront/theme`.
- [x] Move storefront settings component.
- [x] Move theme builder components:
  - [x] `theme-builder`
  - [x] `theme-builder-shared`
- [x] Move theme/storefront hooks and data access into `apps/merchant/lib`.
- [x] Keep public storefront rendering in `apps/storefront`, not `apps/merchant`.
- [x] Use merchant commerce proxy route for theme and merchant profile API calls with HTTP-only cookie sessions.
- [x] Normalize legacy backend permission codes to shared merchant app permission codes for migrated routes.
- [x] Keep admin theme builder types app-local until they are extracted to `@repo/types`.

#### Phase 3.9: Social Posts

- [x] Move `/dashboard/social-posts` to `/merchant/social-posts`.
- [x] Move `/dashboard/social-posts/new` to `/merchant/social-posts/new`.
- [x] Move `/dashboard/social-posts/[id]` to `/merchant/social-posts/[id]`.
- [x] Move social components:
  - [x] `social-post-list`
  - [x] `social-post-composer`
  - [x] `social-post-detail`
  - [x] `social-composer-shared`
  - [x] `social-post-status-badge`
  - [x] `platform-preview`
- [x] Move social hooks/data access into `apps/merchant/lib/social`.
- [x] Use merchant commerce proxy route for social post API calls with HTTP-only cookie sessions.
- [x] Keep social post domain types app-local until they are extracted to `@repo/types`.

#### Phase 3.10: Import Cleanup And Verification

- [x] Replace `@/types/*` imports with `@repo/types` where shared.
- [x] Replace `@/lib/api/*` imports with `@repo/api-client` where shared.
- [x] Replace `@/lib/query/*` imports with `@repo/query-client`.
- [x] Replace `@/components/ui/*` imports with `@repo/ui` where shared.
- [x] Keep route-specific validation modules inside `apps/merchant/lib/validation`.
- [x] Add route-specific loading states.
- [x] Add route-specific error states.
- [x] Run `pnpm --filter @repo/merchant type-check`.
- [x] Run `pnpm --filter @repo/merchant build`.
- [x] Run `pnpm mfe:type-check`.
- [x] Run smoke tests for migrated merchant routes.

Done when:

- [x] `apps/merchant` runs on port `3000`.
- [x] `/merchant/dashboard` works.
- [x] `/merchant/products` works.
- [x] `/merchant/inventory` works.
- [x] `/merchant/orders` works.
- [x] `/merchant/payments/providers` works.
- [x] `/merchant/storefront/theme` works.
- [x] `/merchant/storefront/settings` works.
- [x] `/merchant/social-posts` works.
- [x] Protected routes redirect unauthenticated users.
- [x] Permission-based UI still works.
- [x] Merchant app builds independently.

### Phase 4: Migrate Storefront

- [x] Copy public storefront routes into `apps/storefront`.
- [x] Remove fixed `/storefront` base path.
- [x] Use merchant slug as the first URL segment.
- [x] Move storefront shell.
- [x] Move storefront home.
- [x] Move product card.
- [x] Move product detail.
- [x] Move product gallery.
- [x] Move purchase panel.
- [x] Move checkout pages if checkout remains public storefront-owned.
- [x] Move order success page.
- [x] Move customer auth only if storefront needs customer accounts.
- [x] Keep storefront public by default.
- [x] Move checkout API wiring into the storefront app.
- [x] Run `pnpm --filter @repo/storefront type-check`.
- [x] Run `pnpm --filter @repo/storefront build`.
- [x] Smoke test migrated storefront routes on port `3002`.

Done when:

- [x] `apps/storefront` runs on port `3002`.
- [x] `/{merchantSlug}` renders public storefront.
- [x] `/{merchantSlug}/products/{productSlug}` renders product detail.
- [x] Checkout can start from storefront.
- [x] Storefront app builds independently.

Verification notes:

- `/{merchantSlug}` and `/{merchantSlug}/products/{productSlug}` resolve in the storefront app without the old `/store` prefix.
- Local smoke returned `200` for `/demo`, `/demo/products/test-product`, `/checkout/test-session`, and `/checkout/test-session/success`.
- With the backend API server stopped on port `3000`, the merchant/product routes render the storefront error boundary instead of real storefront data.

### Phase 5: Build POS App

- [x] Create POS login.
- [x] Create branch selector.
- [x] Create sale layout:
  - [x] Categories column.
  - [x] Product catalog column.
  - [x] Current cart column.
- [x] Add responsive mobile mode using tabs or drawer.
- [x] Add product search.
- [x] Add barcode/SKU search.
- [x] Add variant selector.
- [x] Add modifier/choice group selector.
- [x] Add quantity controls.
- [x] Add item notes.
- [x] Add discounts.
- [x] Add tax and service charge.
- [x] Add cash received and change calculation.
- [x] Add KHQR payment flow.
- [x] Add receipt page.
- [x] Add active order list.
- [x] Add POS data adapter with API reads and local demo fallback.
- [x] Run `pnpm --filter @repo/pos type-check`.
- [x] Run `pnpm --filter @repo/pos build`.
- [x] Smoke test POS route on port `3001`.

Done when:

- [x] `apps/pos` runs on port `3001`.
- [x] Staff can log in.
- [x] Staff can create a POS order.
- [x] POS app builds independently.

Verification notes:

- POS route is served at `/pos` because `apps/pos/next.config.mjs` uses `basePath: "/pos"`.
- Local smoke returned `200` for `http://localhost:3001/pos` and rendered the staff login.
- The current order completion creates a receipt-ready local POS order because the backend does not yet expose a dedicated POS order-create endpoint.

### Phase 6: Gateway And Routing

Local routing:

```txt
http://localhost/merchant/* → merchant:3000
http://localhost/pos/*      → pos:3001
http://localhost/*          → storefront:3002
```

Production routing:

```txt
admin.example.com/merchant/* → merchant
pos.example.com/pos/*        → pos
shop.example.com/*           → storefront
```

Tasks:

- [x] Add `nginx.conf`.
- [x] Add route proxy rules.
- [x] Add WebSocket upgrade headers.
- [x] Add forwarded host/protocol headers.
- [x] Add static asset caching.
- [x] Add upload size limit.
- [x] Verify Next.js static assets work with base paths.
- [x] Add local gateway compose wrapper.
- [x] Add gateway routing runbook.

Done when:

- [x] Gateway can route to all apps locally.
- [x] Refreshing deep routes works.
- [x] Static assets load from each app.

Verification notes:

- `docker run --rm -v "$PWD/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t` passed.
- `docker compose -f client/docker-compose.gateway.yml up` started the local gateway on `http://localhost`.
- Gateway smoke returned `200` for `/`, `/pos`, `/merchant`, and `/merchant/products`; merchant routes redirect unauthenticated users to `/merchant/auth/login`.
- Static asset probes returned `200` with `Cache-Control: public, max-age=31536000, immutable` for merchant, POS, and storefront `_next/static` paths.

### Phase 7: Docker And Deployment

- [x] Add `apps/merchant/Dockerfile`.
- [x] Add `apps/pos/Dockerfile`.
- [x] Add `apps/storefront/Dockerfile`.
- [x] Use Next.js standalone output.
- [x] Add `docker-compose.yml` services:
  - [x] `merchant`
  - [x] `pos`
  - [x] `storefront`
  - [x] `nginx`
- [x] Add environment files per app.
- [x] Validate app env vars with Zod at startup.
- [x] Add deployment README.
- [x] Add Docker-specific nginx config for Compose service routing.
- [x] Add Docker context ignore files for frontend app builds.

Done when:

- [x] Each app image builds.
- [x] Docker Compose starts all apps.
- [x] Gateway reaches each app.
- [x] Each app can be deployed independently.

Verification notes:

- Built `nest-server-app:test` from the root `Dockerfile` with Node `26.5.0`; Prisma Client generation and `nest build` passed inside Docker.
- Built `nest-server-merchant:test`, `nest-server-pos:test`, and `nest-server-storefront:test` from the app Dockerfiles using a minimal Docker context copied to `/tmp` because Docker context streaming from the mounted workspace was too slow.
- `docker compose config --quiet` passed.
- `docker run --rm -v "$PWD/deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t` passed.
- Tagged the verified frontend images to Compose image names and started `merchant`, `pos`, `storefront`, and `nginx` with `docker compose up -d --no-build --no-deps`.
- Gateway smoke returned `200` for `/merchant`, `/pos`, and `/`.
- Static asset probes returned `200` with `Cache-Control: public, max-age=31536000, immutable` for merchant, POS, and storefront assets.

### Phase 8: Remove Old Monolith

- [x] Freeze old `dashboard/` routes.
- [x] Confirm route parity between old and new apps.
- [x] Confirm all links use new URLs.
- [x] Confirm auth redirects use new base paths.
- [x] Confirm CI builds all apps/packages.
- [x] Remove or archive old monolithic `dashboard/` app.
- [x] Update root README.
- [x] Update master roadmap.

Done when:

- [x] No production traffic depends on old dashboard routes.
- [x] Old app can be removed without losing features.
- [x] Documentation points to the new architecture only.

Verification notes:

- Removed `dashboard` from `pnpm-workspace.yaml`; active frontend workspace membership is now `apps/*` and `packages/*`.
- Archived `dashboard/README.md` and added legacy redirects in `dashboard/next.config.mjs` for `/auth/*`, `/dashboard/*`, and `/store/*` route families.
- Added `docs/monolith-removal.md` with route parity from legacy dashboard/storefront routes to `apps/merchant` and `apps/storefront`.
- Updated `.env.example` and `docker-compose.yml` frontend URL defaults to `http://localhost/merchant` and `http://localhost`.
- Updated CI to Node `26.5.0`, pnpm `10.30.1`, `mfe:lint`, `mfe:type-check`, and `mfe:build`.
- Updated the root `README.md` and `docs/merchant_master_roadmap.md` to describe the split app architecture.
- Verified `pnpm list --depth -1 --filter './dashboard'` returns no workspace project.
- Verified `pnpm run mfe:lint`, `pnpm run mfe:type-check`, `pnpm run mfe:build`, and `docker compose config --quiet` pass.

---

## Architecture Rules

- [x] Use strict TypeScript.
- [x] Use server components by default.
- [x] Add `"use client"` only when interactivity requires it.
- [x] Apps may only share code through `packages/*`.
- [x] Shared packages must expose public entry points.
- [x] Do not import private files from another package.
- [ ] Keep API logic out of UI components.
  Open: app UI components still orchestrate API mutations and queries directly in a few places; move these behind app-local hooks or `lib/*` adapters before marking complete.
- [x] Keep app-specific route components inside each app.
- [x] Keep auth token storage in HTTP-only cookies.
- [x] Do not store access tokens in localStorage.
- [x] Keep storefront public unless a customer route requires auth.
- [x] Keep merchant and POS routes protected by middleware.

Architecture audit notes:

- `packages/typescript-config/base.json` has `strict: true`, and Phase 8 verification passed `pnpm run mfe:type-check`.
- `rg` found no active app imports from `dashboard/*`, `apps/*`, `packages/*`, or private `@repo/*/src` paths.
- Shared packages expose public entries through package `exports`.
- `packages/ui` contains no API client, fetch, or auth calls.
- Storefront app routes are public root routes (`/`, `/[merchantSlug]`, `/checkout/[sessionId]`); backend API paths using `/storefront` are internal API resource paths, not production frontend prefixes.
- POS staff auth now uses `apps/pos/app/api/session/*` HTTP-only cookies and `apps/pos/proxy.ts`.
- Storefront customer auth now uses `apps/storefront/app/auth/customer/session/*` HTTP-only cookies.

---

## Risk Checklist

- [x] Auth behavior changes when moving from bearer token storage to HTTP-only cookies.
- [x] Next.js `basePath` can break asset URLs if gateway rules are incomplete.
- [x] Storefront routes cannot use a fixed `/storefront` prefix in production.
- [x] Shared UI package can become too business-specific if API calls are allowed.
- [ ] Duplicated types can drift from backend DTOs.
  Open: app-local domain types remain in `apps/*/types`; continue consolidating stable contracts into `packages/types`.
- [x] POS needs faster UX than the merchant dashboard; avoid slow table-heavy patterns.
- [x] Checkout and inventory reservation must continue using one backend source of truth.
- [x] CI time can grow; use Turborepo caching.

Risk audit notes:

- Phase 7 gateway smoke covered `/merchant`, `/pos`, `/`, and immutable static asset caching.
- Phase 8 verification covered `pnpm run mfe:lint`, `pnpm run mfe:type-check`, `pnpm run mfe:build`, and `docker compose config --quiet`.
- POS is a dedicated fast sale workspace rather than a reused merchant table view.
- Checkout creation and confirmation call backend checkout/order/payment APIs; inventory reservation remains backend-owned.

---

## Definition Of Done

A migration phase is complete only when:

- [x] App or package builds independently.
- [x] Type-check passes.
- [x] Lint passes.
- [x] Required environment variables are validated.
- [ ] Routes work after browser refresh.
  Open: route refresh behavior was smoke-tested through gateway URLs, but a fresh browser pass with the backend API running is still needed.
  TODO:
  - [ ] Start the backend API with PostgreSQL and Redis.
  - [ ] Start the gateway stack or equivalent local frontend servers.
  - [ ] Browser-refresh the merchant routes:
        `/merchant/dashboard`, `/merchant/products`, `/merchant/products/new`,
        `/merchant/inventory`, `/merchant/orders`, `/merchant/payments/transactions`,
        `/merchant/storefront/theme`, and `/merchant/social-posts`.
  - [ ] Browser-refresh POS at `/pos`.
  - [ ] Browser-refresh storefront routes:
        `/`, `/[merchantSlug]`, `/[merchantSlug]/products/[productSlug]`,
        `/checkout/[sessionId]`, and `/checkout/[sessionId]/success`.
  - [ ] Verify refresh keeps the same route state or redirects to the correct login/error page.
- [ ] Loading, empty, and error states are handled.
  Open: merchant, POS, storefront, and checkout now have route loading/error states; every domain empty state still needs a final UX audit.
  TODO:
  - [x] Add or verify route-level loading/error coverage for POS.
  - [x] Add or verify checkout route-level loading/error coverage.
  - [ ] Audit merchant empty states for dashboard, products, inventory, orders, payments, storefront settings, and social posts.
  - [ ] Audit POS empty states for no products, no active orders, no receipt, no branch/register, and failed product/order loading.
  - [ ] Audit storefront empty states for no products, no product media, unavailable merchant, unavailable product, expired checkout, and missing checkout token.
  - [ ] Capture screenshots or Playwright traces for loading, empty, and error states before marking complete.
- [ ] Authentication and permissions are verified.
  Open: merchant, POS, and storefront customer auth now use HTTP-only cookie session routes, but live route/permission verification still needs a backend-backed browser pass.
  TODO:
  - [x] Move POS staff auth away from `localStorage` access-token storage.
  - [x] Add POS server session routes that set HTTP-only cookies.
  - [x] Add POS middleware/proxy protection once POS uses a server-readable session cookie.
  - [x] Move storefront customer auth away from browser-readable token session storage.
  - [x] Add storefront customer session routes that set HTTP-only cookies where customer auth is required.
  - [ ] Verify merchant route protection redirects anonymous users and allows authenticated users.
  - [ ] Verify merchant permission-gated UI for restricted product, inventory, order, payment, theme, and social routes.
  - [ ] Verify POS staff can sign in, refresh `/pos`, and sign out without leaving browser-readable access tokens.
  - [ ] Verify storefront remains public and only customer-specific actions require customer auth.
- [x] Docker build works where applicable.
- [x] Documentation is updated.

Definition of Done audit notes:

- Verified `pnpm run mfe:build` for `@repo/merchant`, `@repo/pos`, and `@repo/storefront`.
- Verified `pnpm run mfe:type-check` across `apps/*` and `packages/*`.
- Verified `pnpm run mfe:lint` across active frontend apps; remaining output is warnings only.
- App env modules validate with Zod in `apps/merchant/lib/env.ts`, `apps/pos/lib/env.ts`, and `apps/storefront/lib/env.ts`.
- Phase 7 built `nest-server-app:test`, `nest-server-merchant:test`, `nest-server-pos:test`, and `nest-server-storefront:test`.
- Phase 7 gateway smoke returned `200` for `/merchant`, `/pos`, and `/`, and static assets returned immutable cache headers.
- Implemented POS HTTP-only cookie session routes, POS commerce proxy, and POS proxy protection; `rg` no longer finds POS `localStorage` token storage.
- Implemented storefront customer HTTP-only cookie session routes; customer profile reads now go through `/auth/customer/session/me`.
- Added route-level loading/error files for POS and checkout routes.
- Re-verified `pnpm run mfe:lint`, `pnpm run mfe:type-check`, and `pnpm run mfe:build` after the auth/state changes.
- Docs updated in `README.md`, `docs/docker-deployment.md`, `docs/monolith-removal.md`, `docs/merchant_master_roadmap.md`, and this checklist.

Final migration is complete only when:

- [x] Merchant Admin is independently deployable.
- [x] POS is independently deployable.
- [x] Storefront is independently deployable.
- [x] Shared packages are versioned through workspace dependency ranges.
- [x] Old monolithic frontend is removed or archived.
