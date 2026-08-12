# Ferio Customer Web

Next.js 14 App Router storefront for the Ferio Release 1 commerce flow.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Start the Ferio NestJS API, PostgreSQL, and Redis.
3. Install dependencies and start the storefront:

```bash
pnpm install
pnpm dev
```

Default URL: `http://localhost:3000`

## Current routes

- `/` — public categories and published products
- `/products` — search, category, price, stock, attribute, and sort controls
- `/products/[slug]` — product media, variants, availability, delivery, and returns
- `/cart` — persistent guest cart with server-side price and stock validation
- `/checkout` — recoverable Bangladesh address form and server-calculated COD preview
- `/order-confirmation` — immediate COD order reference and verification state
- `/sitemap.xml` — published category and product sitemap

## Backend boundaries

- Public catalog reads use `NEXT_PUBLIC_FERIO_API_URL`.
- Cart mutations use Customer Web API routes and private `FERIO_API_URL`.
- The opaque cart token is stored in an HTTP-only `ferio_cart` cookie.
- Browser JavaScript receives cart lines and safe validation issues, never the cart token.
- Cart-page totals remain estimates; checkout previews add the configured delivery fee and return a server-calculated final COD total.

The checkout screen validates Bangladesh mobile numbers, collects a covered
delivery address, separates optional marketing consent, and persists a checkout
draft. A retained browser idempotency key safely converts that draft into one COD
order. The backend clears the converted cart and returns a human-readable order
reference without exposing the opaque cart token.

## Design

All customer screens follow `_doc/design-language.md`: one sans-serif hierarchy,
restrained black/white/gray structure, small consistent radii, pill actions,
product-first imagery, semantic color only for meaningful state, and direct UI
copy. Do not restore the older serif, decorative route motif, gradients, or
template-style visual direction.

## Validation

```bash
pnpm exec tsc --noEmit
pnpm build
```
