# Ferio — Admin Dashboard

Next.js 14 App Router dashboard for protected Ferio commerce operations.

## Run locally

```bash
pnpm install
pnpm dev
```

The dashboard runs on `http://localhost:3001` and connects to the NestJS API
through server-only BFF routes. Admin access and refresh tokens remain in
HTTP-only cookies.

## Connected workflows

- `/` — real admin authentication
- `/dashboard/categories` — category creation, hierarchy, activation, and ordering
- `/dashboard/products` — product and variant management
- `/dashboard/inventory` — stock visibility, adjustments, and movement history
- `/dashboard/delivery` — district coverage, fees, free-delivery thresholds, and activation
- `/dashboard/orders` — live order queue, search, status filters, and COD policy
- `/dashboard/orders/[id]` — immutable snapshots, histories, reservations, confirmation, and cancellation
- `/dashboard/shipping` — provider readiness, activation, shipment queue, tracking, and exceptions

Confirmed order details can create a courier parcel after packing. Pathao asks
for its provider-specific city, zone, and area IDs; Steadfast uses the order
address directly. Both flows remain disabled until credentials are configured.

Overview and customer screens remain scaffolds until their backend domains are
implemented.
