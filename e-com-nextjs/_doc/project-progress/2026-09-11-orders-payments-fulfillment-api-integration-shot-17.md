# Orders, Payments, and Fulfillment API Integration Shot 17

Date: 2026-09-11

## Scope

Audited the tenant-admin orders queue/detail/fulfillment screens, COD policy,
payment-attempt operations, and shipping handoff callers against the NestJS
order, checkout, commerce-payment, and shipping controllers and DTOs.

## Findings

- Order queue/detail, COD policy, confirm, cancel, fulfillment, fulfillment
  exception, pickup status, and pickup handover callers match their BFFs and
  guarded `/admin/orders` controller routes.
- Fulfillment uses the DTO's `status` field; exception creation uses
  `orderItemId`, `quantity`, and `description`; exception resolution is POST.
- Payment-attempt detail is read-only. Provider configuration is exposed as
  admin PUT/DELETE operations, while the current dashboard only reads provider
  readiness and recovery health.
- Customer payment initiation matches POST `{ orderId, reference, phone,
  provider }`; retry proves the order with `{ reference, phone, provider }`.
- Shipping order creation/polling and provider callbacks remain covered by
  the existing shipping integration shot; no new caller mismatch was found.

## Changes

- Corrected order filter, fulfillment, exception, payment-attempt, provider,
  recovery, and customer payment-retry documentation to match source DTOs and
  controller methods.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E,
idempotency/race proof, payment-provider callback verification, shipment
delivery, tenant-host isolation, or production operational acceptance.
