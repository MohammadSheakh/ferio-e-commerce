# API Integration Verification — Tenant Admin Product Content, Requests, and Stores (Shot 54)

**Date:** 2026-09-11  
**Scope:** Review moderation, product requests, and store outlet CRUD  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

Review moderation uses the wildcard product-content BFF for review listing,
approve/reject/feature, delete, and banner creation. Store outlet listing,
create, update, delete, and activation updates use dedicated authenticated BFF
routes. Requested-products initial server rendering used `adminApi`, but the
client refresh path called `/api/admin/product-requests` without a GET route;
filters and pagination could therefore fail after hydration.

Review-banner GET/PATCH/DELETE backend routes exist and are reachable through
the wildcard BFF, but the current review screen only exposes banner creation.
This remains an honest UI coverage gap for a follow-up shot.

## Fix

- Added GET `/api/admin/product-requests` and forwarded query parameters to the
  backend `/product-requests` admin controller.
- Preserved the backend's non-`/admin` product-request path because that is the
  actual guarded NestJS controller contract.
- Recorded the remaining review-banner management gap instead of marking all
  product-content operations as browser-integrated.

## Verification

- Confirmed review list/moderation/delete and banner-create callers use the
  product-content BFF.
- Confirmed store GET/POST/PATCH/DELETE callers use authenticated admin BFF
  routes.
- Confirmed requested-products client refresh now has a matching GET BFF route.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live permissions, tenant forwarding, moderation correctness, outlet/pickup
availability, browser behavior, and cross-tenant isolation remain runtime
gates. Review-banner management UI remains open. Redis was not changed.
