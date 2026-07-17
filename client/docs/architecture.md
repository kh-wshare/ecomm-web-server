# Client Architecture

The client workspace is organized as a micro-frontend monorepo.

## Apps

```txt
apps/marketing   Public product and business landing page
apps/merchant    Merchant admin app mounted at /merchant
apps/pos         POS app mounted at /pos
apps/storefront  Public storefront app mounted at /
```

## Shared Packages

```txt
packages/api-client       Fetch helpers and API response helpers
packages/auth-client      Auth-related client helpers
packages/query-client     TanStack Query defaults
packages/types            Shared API and domain types
packages/ui               HeroUI exports, shared components, and design tokens
```

## Rules

- Apps must not import source directly from another app.
- Shared code belongs in `client/packages/*`.
- Backend integration should go through app-local route handlers or shared API clients.
- UI should use `@repo/ui` and HeroUI components before adding custom controls.
- Merchant and POS keep their base paths: `/merchant` and `/pos`.
- Storefront owns root storefront routing.
- Marketing is a separate public landing app and currently runs on port `3003`.

## Ports

```txt
3000 merchant
3001 pos
3002 storefront
3003 marketing
```
