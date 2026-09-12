# API Integration Verification — Tenant Admin Courier Provider Boundary (Shot 51)

**Date:** 2026-09-11  
**Scope:** Tenant-admin courier provider listing, activation, and credential boundary  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

The documented provider surface has five routes. `GET /admin/shipping/providers`
and `PATCH /admin/shipping/providers/:code` are integrated through the shared
admin BFF and shipping dashboard. `PUT /admin/shipping/providers/:code/config`
and `DELETE /admin/shipping/providers/:code/config` accept or revoke secrets and
are intentionally not exposed as browser forms; the operator-controlled path is
the correct boundary for those operations.

The audit found two accuracy defects: the API document referenced the old
`app/shipping/*` path, and the dashboard described credentials as environment
secrets even though the backend supports tenant-scoped encrypted credential
configuration.

## Fix

- Corrected the documented frontend paths to the actual dashboard and order
  pages.
- Reworded the dashboard to describe operator-controlled secret provisioning
  without exposing credential fields or values to browser JavaScript.
- Recorded the provider configuration classification in API verification status
  and this fix tracker.

## Verification

- Confirmed BFF GET/PATCH routes forward through `adminApi`, preserving the
  authenticated server-side session boundary.
- Confirmed the browser has no PUT/DELETE credential route or credential form.
- Confirmed the NestJS PUT/DELETE routes require `SHIPPING_PROVIDER_MANAGE` and
  audit changes without returning credential material.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live role authorization, operator secret rotation, credential encryption,
browser behavior, and cross-tenant isolation remain runtime gates. Redis was
not changed.
