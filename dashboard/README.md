# Merchant Commerce Hub Dashboard

Next.js dashboard and storefront frontend for the Merchant Commerce Hub.

## Foundation

- Next.js App Router and strict TypeScript
- Tailwind CSS 4 and HeroUI 3
- TanStack Query for server state
- Zustand for client UI state
- Zod for environment and form validation
- ESLint and Prettier

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

The dashboard defaults to `http://localhost:3001`; the API defaults to
`http://localhost:3000`.

## Commands

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
