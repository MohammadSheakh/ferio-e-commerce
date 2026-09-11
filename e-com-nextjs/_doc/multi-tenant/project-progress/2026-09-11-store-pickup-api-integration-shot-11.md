# Store Pickup API Integration Shot 11

**Date:** 2026-09-11
**Scope:** Tenant-admin store locations, delivery zones, admin pickup operations, and customer pickup scheduling.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Verified admin flows

- Store locations use tenant-admin BFF GET/POST/PATCH/DELETE routes backed by
  `AdminStoreLocationsController`.
- Delivery zones use tenant-admin BFF GET/POST/PATCH routes backed by
  `AdminDeliveryController`.
- Order-detail pickup actions use admin BFF PATCH status and POST OTP handover
  routes backed by `AdminOrderController`.

## Documentation correction and open item

Pickup scheduling is not an admin endpoint. NestJS exposes it as the
authenticated customer route `PATCH /orders/:id/store-pickup/schedule`, with
`pickupScheduledAt` and `customerPickupNotes` in the request DTO. The current
customer-web source audit found no browser caller for that contract. The
storefront documentation and verification status now mark pickup scheduling
partial instead of claiming all pickup APIs are integrated.

## Validation boundary

This is source-level route/method evidence. It does not prove live pickup
availability, ownership checks, schedule conflict handling, OTP abuse limits,
cross-tenant denial, or browser E2E through real tenant host ingress.
