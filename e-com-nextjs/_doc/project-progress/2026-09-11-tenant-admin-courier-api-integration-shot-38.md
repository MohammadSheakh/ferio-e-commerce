# Tenant-admin courier and delivery API integration shot 38

Date: 2026-09-11

## Scope

Audited tenant-admin delivery personnel CRUD/approval/map/history, delivery
zones, shipment providers, shipment polling, courier webhook retries, and
queue-health callers against the NestJS controllers, DTOs, BFF routes, and API
documentation.

## Findings and changes

- Delivery personnel list/create/update/approval/map/history routes and
  response envelopes match the frontend callers and DTOs.
- Fixed a backend route-order hazard by declaring static
  `PATCH /delivery-personnel/admin/assign-order` before parameterized
  `PATCH /delivery-personnel/admin/:id`; the documented assignment call can no
  longer be captured as a rider-id update by Express-style registration.
- Delivery zones, provider activation, shipments, webhook retries, polling,
  and queue-health callers matched their BFF/controller contracts.
- Clarified that provider credential PUT/DELETE routes are intentionally
  operator-controlled secret paths, not browser forms; the tenant-admin UI
  only reads configuration status and toggles activation.

## Verification

- NestJS `pnpm typecheck:application` passed.
- NestJS `pnpm lint` passed with 0 errors; 111 existing formatting warnings
  remain outside this change.
- Tenant-admin `pnpm api:check` passed.
- Tenant-admin `pnpm exec tsc --noEmit` passed.
- Tenant-admin `pnpm lint` passed with existing unrelated warnings.

## Remaining runtime proof

Live tenant-host forwarding, permission denial, cross-tenant assignment
authorization, concurrent assignment behavior, courier callbacks, provider
credentials, queue fairness, and browser E2E evidence remain open. No mobile or
Redis code was changed.
