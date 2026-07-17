# Archived Merchant Commerce Hub Dashboard

This directory is the legacy monolithic dashboard and storefront app. It is
kept only as an implementation archive while the product runs from the
independent apps in `apps/merchant`, `apps/pos`, and `apps/storefront`.

Do not add new production routes or features here.

## Replacements

| Legacy surface | Active app |
|----------------|------------|
| `/auth/*` | `apps/merchant` at `/merchant/auth/*` |
| `/dashboard/*` | `apps/merchant` at `/merchant/*` |
| `/store/[merchantSlug]` | `apps/storefront` at `/[merchantSlug]` |
| `/checkout/*` | `apps/storefront` at `/checkout/*` |
| POS workflows | `apps/pos` at `/pos` |

## Historical Foundation

- Next.js App Router and strict TypeScript
- Tailwind CSS 4 and HeroUI 3
- TanStack Query for server state
- Zustand for client UI state
- Zod for environment and form validation
- ESLint and Prettier

## Archive Access

```bash
cd dashboard
pnpm install
pnpm dev
```

The root workspace no longer includes this package, and CI no longer builds it.

## Historical Commands

```bash
pnpm dev
pnpm type-check
pnpm lint
pnpm format:check
pnpm build
```

## Structure

```text
app/
  (auth)/
  (dashboard)/
  (storefront)/
config/       validated public environment and site configuration
lib/          API, auth, errors, formatting, query, toast, validation
stores/       Zustand client state
```
