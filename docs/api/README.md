# API surfaces, specs and Postman test suites

The API is split into five independent surfaces. Each one has its own Swagger UI,
its own exported OpenAPI document, and its own Postman collection with runnable
test cases.

| Surface | Swagger UI | OpenAPI | Postman | Auth |
|---|---|---|---|---|
| **Merchant** — dashboard, catalog, inventory, orders, logistics, payments | `/docs/merchant` | [merchant.openapi.json](openapi/merchant.openapi.json) | [merchant.postman_collection.json](postman/merchant.postman_collection.json) | `Authorization: Bearer` + optional `X-Merchant-ID` |
| **Storefront** — public browsing, carts, addresses, delivery, checkout, payments | `/docs/storefront` | [storefront.openapi.json](openapi/storefront.openapi.json) | [storefront.postman_collection.json](postman/storefront.postman_collection.json) | `X-Cart-Token` / `X-Checkout-Token` (no account) |
| **User** — registration, login, sessions, social login | `/docs/user` | [user.openapi.json](openapi/user.openapi.json) | [user.postman_collection.json](postman/user.postman_collection.json) | `Authorization: Bearer` |
| **POS** — in-store selling, shifts, tables, kitchen, devices | `/docs/pos` | [pos.openapi.json](openapi/pos.openapi.json) | [pos.postman_collection.json](postman/pos.postman_collection.json) | `Authorization: Bearer` + `X-Merchant-ID` |
| **Admin** — internal platform administration | `/docs/admin` | [admin.openapi.json](openapi/admin.openapi.json) | [admin.postman_collection.json](postman/admin.postman_collection.json) | `Authorization: Bearer` (platform role) |

Which surfaces are served is controlled by `SWAGGER_ENABLED` and the per-surface
`SWAGGER_*_ENABLED` flags. The surface list itself lives in one place —
[`src/docs/api-surfaces.ts`](../../src/docs/api-surfaces.ts) — so Swagger UI, the
exported specs and the collections cannot drift apart. Adding a module to a
surface there is the only change needed to expose it everywhere.

There is no global route prefix: requests go to `{{baseUrl}}/products`, not
`{{baseUrl}}/api/products`.

## Merchant and storefront are separate on purpose

They do not share authentication. The merchant surface is bearer-token and
tenant-scoped: `MerchantScopeGuard` rejects a request whose `X-Merchant-ID`
header disagrees with the merchant claim in the token. The storefront surface
has no accounts at all — whoever holds the cart token holds the cart, and
whoever holds the checkout token can confirm the order. That makes token
handling the whole storefront security model, which is why it gets its own
edge-case folder.

## Running the test suites

Import the collections and an environment into Postman, or run them headlessly
with [Newman](https://github.com/postmanlabs/newman):

```bash
pnpm test:api                                    # the whole suite, in order
pnpm test:api:fresh                              # same, with a brand-new merchant
node scripts/run-api-tests.js --base-url http://localhost:3100

# one folder at a time
npx newman run docs/api/postman/merchant.postman_collection.json \
  -e docs/api/postman/ecomm-local.postman_environment.json \
  --folder "00 · Setup — sign in"
```

`pnpm test:api` runs the flows and contract folders of both suites in dependency
order, carrying captured state through a temporary environment file so nothing
in `docs/` is written to. It does **not** run the `Endpoints` folders — those are
a per-operation reference whose requests address records that may not exist in
any given database; run them by hand against a request you care about.

Use `--fresh` when a run fails with 403 on a resource you expect to have access
to: a merchant's role permissions are provisioned when the merchant is created,
so an account created before a permission existed will never gain it.

`ecomm-local.postman_environment.json` points at `http://localhost:3000`;
`ecomm-staging.postman_environment.json` is a copy to repoint. Newman is run
through `npx` and is not a project dependency.

### Order of play

1. **Merchant → `00 · Setup — sign in`** registers (or reuses) an owner account
   and stores `accessToken`, `merchantId` and `merchantSlug`.
2. **Merchant → `01 · E2E`** builds something sellable: a category, a
   stock-tracked product published to the website channel, +50 units of stock,
   and a delivery method with a priced zone.
3. **Storefront → `01 · E2E`** buys it: browse → cart → contact → address →
   delivery → checkout session → confirmed order → payment intent → tracking.
4. **Merchant → `02 · E2E`** fulfils the resulting order and ships it.

Steps 2–4 share state through environment variables, so run them against the
same environment file. Any step whose input was never captured skips itself
rather than failing noisily.

Captured values are written to whichever scope already declares the key —
environment first, collection second — because Postman resolves environment
variables ahead of collection variables, and an empty environment entry would
otherwise shadow a freshly captured token.

## What is covered

| Collection | Requests | Assertions | In `pnpm test:api` |
|---|---|---|---|
| Merchant | 106 | 338 | 40 requests / 97 assertions |
| Storefront | 63 | 195 | 29 requests / 75 assertions |
| POS | 87 | 289 | — |
| User | 21 | 74 | — |
| Admin | 6 | 20 | — |

The suite `pnpm test:api` runs — 69 requests, 172 assertions — passes green
against a current build with a freshly registered merchant.

Every collection has the same four kinds of folder:

- **`00`–`03` flows** — hand-written, ordered journeys and the edge cases that
  matter (see below).
- **`Endpoints`** — one request per documented operation, grouped by tag. Each
  asserts a documented success code, the standard response envelope
  (`statusCode`/`data`/`timestamp`/`path`), a sub-2s response, and captures any
  returned id for the next call. This is the reference half: bodies are built
  from the DTO schemas, so a request is ready to send once its ids point at real
  records. It is not part of the automated run.
- **`Contract · Authentication`** — every protected resource must answer 401,
  not data, when the `Authorization` header is absent.
- **`Contract · Validation`** — every resource that requires fields must refuse
  an empty body (400, or 401/403 where a guard rejects it even earlier) instead
  of accepting it.

### Edge cases covered by hand

Merchant (`03 · Edge cases`):

| Case | Expected |
|---|---|
| Merchant profile with no token | 401 |
| `X-Merchant-ID` that disagrees with the token | 403 |
| Unknown product id | 404 |
| Malformed (non-UUID) product id | 400 |
| Product missing `sku` and `price` | 400 naming both fields |
| Forged `merchantId` in a create body | stripped by the `whitelist` pipe, never honoured |
| Release of an unknown stock reservation | 400/404/409, never a silent success |

Storefront (`02 · Edge cases`):

| Case | Expected |
|---|---|
| Read a cart with no token | 401 |
| Read a cart with the wrong token | 401 |
| Unknown merchant slug | 404 |
| Add a line with `quantity: 0` | 400 mentioning quantity |
| Add a product belonging to another merchant | 404/409 |
| Check out an empty cart | 409 |
| Payment webhook with no signature | 400/401/403 |

## Regenerating

Both artefacts are generated — edit the generators, never the JSON.

```bash
pnpm docs:api        # build, export OpenAPI, then rebuild the collections
pnpm docs:openapi    # OpenAPI only
pnpm docs:postman    # collections only, from the specs already exported
```

| File | Role |
|---|---|
| [`src/docs/api-surfaces.ts`](../../src/docs/api-surfaces.ts) | the surface registry: title, modules, auth, docs path |
| [`scripts/generate-openapi.js`](../../scripts/generate-openapi.js) | boots the app and writes `openapi/*.json` |
| [`scripts/postman/openapi-to-postman.js`](../../scripts/postman/openapi-to-postman.js) | spec → collection, assertions, id capture, contract folders |
| [`scripts/postman/flows.js`](../../scripts/postman/flows.js) | the hand-written flows and edge cases |
| [`scripts/generate-postman.js`](../../scripts/generate-postman.js) | writes the collections and environments |
| [`scripts/postman/validate.js`](../../scripts/postman/validate.js) | structural checks; `docs:postman` fails if a collection is malformed |
| [`scripts/run-api-tests.js`](../../scripts/run-api-tests.js) | runs the suites in dependency order for `pnpm test:api` |

`@Public()` records `security: []` on the operation, so routes that need no
credentials say so in the specs and in Swagger UI. Anything derived from the
documents — including the auth probes above — depends on that being accurate.

`generate-openapi.js` runs against `dist/`, not the TypeScript sources: Nest's
DI needs the decorator metadata `tsc` emits, and esbuild-based loaders such as
`tsx` drop it. `pnpm docs:openapi` runs `nest build` first for that reason. It
connects to nothing — Redis and RabbitMQ connection errors during the export are
noise and do not affect the output.
