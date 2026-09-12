# Tenant Admin Rider Assignment Integration Shot 10

**Date:** 2026-09-11
**Scope:** Order-detail rider assignment.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Change

The NestJS API already exposed the tenant-scoped
`PATCH /delivery-personnel/admin/assign-order` contract and the tenant-admin
BFF already forwarded it, but no browser screen called that route. The order
detail screen now:

1. Loads approved riders through `GET /api/delivery-personnel?status=APPROVED`.
2. Presents a tenant-admin assignment form for home-delivery orders.
3. Sends `{ orderId, deliveryPersonnelId }` with PATCH to the BFF.
4. Reloads the order after a successful assignment and reports a clear result.

The server remains the authority for tenant membership, permissions, rider
approval, and order assignment validity.

## Validation boundary

Tenant-admin TypeScript, lint, and generated OpenAPI `api:check` passed. This
source-level change does not prove current-assignment rendering, live
authorization denial, cross-tenant denial, concurrent assignment behavior,
or browser E2E through real tenant host ingress.
