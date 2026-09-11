# API Integration Verification — Tenant Admin Payments and Wallet (Shot 53)

**Date:** 2026-09-11  
**Scope:** Tenant-admin payment attempts/recovery and wallet top-up review  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

Payment attempts, attempt detail, provider readiness, recovery sweep, and
recovery queue health are already called by the payments dashboard through
authenticated admin BFF routes. Wallet top-up listing and review are already
called by the wallet dashboard through authenticated BFF routes.

The API documentation had two accuracy problems: stale frontend paths and a
wallet review endpoint documented as `POST /admin/wallet/top-ups/:id/review`,
while NestJS and the BFF use `PATCH /admin/wallet/top-ups/:id`. Payment
provider credential PUT/DELETE are secret-bearing operations and are correctly
not exposed as browser forms.

## Fix

- Corrected the frontend paths to the actual dashboard pages/components.
- Corrected the wallet review method and endpoint.
- Documented the payment credential secret boundary without adding a browser
  credential form.
- Recorded the audit in API verification status and the BHO fix tracker.

## Verification

- Confirmed payment attempts GET/list/detail, providers GET, recovery sweep POST,
  and recovery queue-health GET have BFF routes and dashboard callers.
- Confirmed wallet top-up GET and PATCH review have BFF routes and dashboard
  callers matching the NestJS controller.
- Confirmed payment credential PUT/DELETE require management permission and are
  not called from browser code.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live payment permissions, provider credentials, recovery queue availability,
financial correctness, idempotency, and cross-tenant isolation remain runtime
gates. Redis was not changed.
