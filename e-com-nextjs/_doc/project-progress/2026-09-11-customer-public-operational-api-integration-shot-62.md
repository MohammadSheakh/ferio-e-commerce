# Customer Public Operational API Integration Shot 62

**Date:** 2026-09-11
**Scope:** Public order tracking, pickup outlet listing/availability, and storefront analytics

## Findings

- The tracking BFF calls `POST /orders/track` with `{ reference, phone }`, preserves the forwarded tenant host, normalizes the backend envelope, and surfaces backend errors. The controller exposes the same route and the service verifies the phone against the order before returning the public timeline.
- Checkout calls `GET /store-locations` for active pickup outlets and `POST /store-locations/check-availability` with the selected `storeId` and cart `variantIds`. The public controller and DTO contract match the browser callers; the final checkout transaction remains authoritative for stock and reservation races.
- Storefront analytics callers generate UUID `eventId` and `anonymousId`, then submit the documented event fields. The backend DTO validates event type, bounded identifiers, quantity/result limits, filter object, and path format; the controller accepts the event through its rate-limited public route and returns `202`.
- No source-level API path, method, payload, or response-envelope mismatch was verified in this shot, so no application code change was made.

## Validation

- `pnpm api:check` in `ferio-customer-web`
- `pnpm exec tsc --noEmit` in `ferio-customer-web`
- `pnpm lint` in `ferio-customer-web`
- `git diff --check`

Lint retains the repository's existing image optimization warnings. Live proof remains required for tracking phone privacy/rate limiting, tenant host forwarding, pickup stock races, analytics retention/rate limiting, browser behavior, and cross-tenant isolation.

Redis was not changed.
