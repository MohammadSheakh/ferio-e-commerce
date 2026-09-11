# API Integration Verification — Tenant Admin Shipping Scorecard (Shot 49)

**Date:** 2026-09-11  
**Scope:** Tenant-admin shipping provider, shipment, callback, polling, and scorecard callers  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

Provider, shipment, callback, retry, polling, and queue-health callers matched
the NestJS admin-shipping controller and DTOs. The controller also exposed
`GET /admin/shipping/scorecard`, and OpenAPI contained the operation, but the
tenant-admin BFF and dashboard did not call or render it.

## Fix

- Added `/api/shipping/scorecard` through the shared admin session BFF.
- Added typed courier scorecard rows and tenant-admin rendering for parcel,
  delivery-rate, RTO-rate, and pickup-SLA metrics.
- Included scorecard failure in the dashboard's visible aggregate load error.
- Documented the scorecard integration and kept courier recommendation inputs
  as a separate follow-up rather than sending guessed values.

## Verification

- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live provider credentials, webhook signatures, queue availability, polling
behavior, tenant authorization, browser forwarding, and cross-tenant isolation
remain runtime gates. Redis was not changed.

