# Tenant Admin Operations API Integration Shot 09

**Date:** 2026-09-11
**Scope:** Tenant-admin shipping/courier operations and delivery-personnel administration.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Corrections

The shipping documentation described routes that do not exist in the NestJS
controller. It now matches the implementation:

- Shipment creation: `POST /admin/shipping/orders/:orderId`.
- Shipment polling: `POST /admin/shipping/shipments/:id/poll`.
- Callback retry: `POST /admin/shipping/webhooks/:id/retry`.
- Provider credentials: `PUT` and `DELETE /admin/shipping/providers/:code/config`.

The tenant-admin frontend calls the matching shipment/provider/poll/callback
routes through server-side `adminApi`, and delivery-personnel list/create/edit,
approval, map, and location-history actions match their controller contracts.

## Open integration item

`PATCH /delivery-personnel/admin/assign-order` has a BFF route but no current
browser caller. It is intentionally not marked verified. The next shot should
add or explicitly defer the order/rider assignment workflow, then validate its
DTO, authorization, tenant isolation, and concurrent assignment behavior.

## Validation boundary

This is source-level contract evidence. It does not prove live provider
credentials, courier callback delivery, queue fairness, browser E2E, live
two-host isolation, or production operational readiness.
