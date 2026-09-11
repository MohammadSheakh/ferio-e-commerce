# Customer Cart and Checkout API Integration Shot 06

**Date:** 2026-09-11
**Scope:** Customer cart, checkout, payment initiation/retry, wallet order, and public tracking integration.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Verification

The customer browser calls and BFF routes were compared with the cart,
checkout, order, payment, and tracking controllers. The implementation uses
the correct server-side boundaries: cart tokens stay in host-only httpOnly
cookies, checkout placement forwards `x-cart-token` and an idempotency key,
wallet placement requires the customer session, prepaid initiation is chained
server-side after order creation, and public tracking forwards only the
tenant host context.

Two documentation mismatches were corrected:

- `/cart/validate` is `POST`, matching the NestJS controller and BFF route.
- `/payments/initiate` is `POST` with `{ orderId, reference, phone, provider }`.
  It is not a query-based `GET`; the customer BFF invokes it after prepaid
  order placement.

No frontend browser-call route or method mismatch was found in this shot.

## Validation boundary

This is source-level contract evidence. It does not prove duplicate-submit
behavior in a browser, payment-provider callbacks, stock/price race handling,
tenant-host isolation under live ingress, or production gateway credentials.
