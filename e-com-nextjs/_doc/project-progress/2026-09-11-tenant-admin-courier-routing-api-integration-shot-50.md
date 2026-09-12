# API Integration Verification — Tenant Admin Courier Routing (Shot 50)

**Date:** 2026-09-11  
**Scope:** Tenant-admin courier recommendation API and shipping dashboard  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

NestJS/OpenAPI exposed `POST /admin/shipping/router/recommend` with explicit
district, optional upazila, weight, COD amount, and urgency inputs. No admin
BFF route or browser caller existed, so the documented routing capability could
not be used from the tenant-admin application.

## Fix

- Added `/api/shipping/router/recommend` through the shared admin session BFF.
- Added typed recommendation and provider-score models.
- Added an explicit shipping-dashboard form with client validation for district,
  whole-gram weight, non-negative whole-unit COD amount, and urgency.
- Rendered the selected provider, score, reason, and all provider readiness
  scores without mutating shipment or provider state.
- Updated API documentation, verification status, and fix tracking.

## Verification

- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live provider credentials, tenant authorization, routing-policy accuracy,
browser forwarding, shipment creation, and cross-tenant isolation remain
runtime gates. Redis was not changed.

