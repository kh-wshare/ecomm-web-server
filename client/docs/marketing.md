# Marketing App

The marketing app is the public landing page for the commerce platform.

## Package

```txt
apps/marketing
@repo/marketing
```

## Run

```bash
cd client
pnpm marketing:dev
```

Open:

```txt
http://localhost:3003
```

## Purpose

- Present the platform clearly to prospects and clients.
- Explain the business value of merchant admin, storefront, POS, inventory, payments, branches, and social selling.
- Provide a clean first impression separate from the operational apps.

## Design Notes

- Uses shared `@repo/ui` and HeroUI components.
- Uses shared design tokens from `@repo/ui/styles.css`.
- Uses an image-backed hero, restrained motion, and product-oriented sections.
- Does not import from merchant, POS, or storefront app source.
