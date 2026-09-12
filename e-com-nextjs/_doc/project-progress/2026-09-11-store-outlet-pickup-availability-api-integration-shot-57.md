# Store Outlet and Pickup Availability API Integration - Shot 57

**Date:** 2026-09-11
**Scope:** Customer checkout and tenant-admin store outlet management

## Changes

- Fixed the tenant-admin store-locations BFF so it forwards the browser query
  string to `GET /admin/store-locations`. The stores screen's page, limit, and
  search controls now reach the NestJS `StoreQueryDto` instead of being
  silently discarded.
- Integrated customer checkout with `POST /store-locations/check-availability`
  when store pickup is selected. The request is scoped to the selected outlet
  and the cart's variant IDs, and the response renders the backend's
  ready-for-pickup or transfer-required status.
- Added abort handling so an outlet/cart change cannot allow a stale
  availability response to overwrite the current selection.
- Kept the customer BFF responsible for tenant-host forwarding and kept the
  final checkout transaction authoritative for stock, reservation, and race
  handling. The displayed availability result is advisory and does not create
  a reservation.
- Clarified the customer and tenant-admin API documentation with exact
  payloads, query forwarding, and the final-transaction boundary.

## Contract verification

Backend contracts inspected:

- `GET /store-locations`
- `POST /store-locations/check-availability` with `{ storeId, variantIds[] }`
- `GET /admin/store-locations?page=&limit=&search=`
- `POST /admin/store-locations`
- `PATCH /admin/store-locations/:id`
- `DELETE /admin/store-locations/:id`

Frontend callers inspected:

- `ferio-customer-web/app/checkout/page.tsx`
- `ferio-customer-web/app/api/store-locations/route.ts`
- `ferio-customer-web/app/api/store-locations/check-availability/route.ts`
- `ferio-admin-dashboard/ferio-admin/app/dashboard/stores/page.tsx`
- `ferio-admin-dashboard/ferio-admin/app/api/admin/store-locations/route.ts`
- `ferio-admin-dashboard/ferio-admin/app/api/admin/store-locations/[id]/route.ts`

## Validation

- Customer web `pnpm api:check`: passed.
- Customer web `pnpm exec tsc --noEmit`: passed.
- Customer web `pnpm lint`: passed with existing warnings only.
- Tenant-admin `pnpm api:check`: passed.
- Tenant-admin `pnpm exec tsc --noEmit`: passed.
- Tenant-admin `pnpm lint`: passed with existing warnings only.
- `git diff --check`: passed.

## Remaining runtime evidence

This is source-level integration evidence, not live proof. Still required are
browser verification, trusted tenant-host forwarding, cross-tenant isolation,
stock/reservation race tests, and production infrastructure evidence. Redis
was not changed.
