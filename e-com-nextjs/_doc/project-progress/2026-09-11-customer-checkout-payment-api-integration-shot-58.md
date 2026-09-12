# Customer Checkout and Payment API Integration - Shot 58

**Date:** 2026-09-11
**Scope:** Customer checkout preview, order placement, prepaid initiation,
payment retry, and wallet checkout

## Findings

- `POST /checkout/preview` is called through the customer cart BFF, which
  forwards the httpOnly `ferio_cart` cookie as `X-Cart-Token` and preserves the
  tenant host context.
- Checkout form changes clear the existing preview before a new placement can
  occur. The backend also rejects expired drafts, changed payment methods,
  changed cart pricing, changed coupon pricing, and changed delivery totals.
- `POST /checkout/orders` receives the browser-generated idempotency key through
  the BFF `Idempotency-Key` header. The backend validates the cart and performs
  order creation in a serializable transaction before confirmation messaging.
- Prepaid flow is correctly two-step: the BFF places the order, then calls
  `POST /payments/initiate` with order ID, reference, placement phone, and
  provider. The payment service verifies ownership proof and reuses a live
  attempt where safe.
- Failed or cancelled prepaid sessions have a dedicated retry page calling
  `POST /payments/retry` with reference, phone, and provider. The backend
  verifies the phone before preparing a fresh attempt.
- Wallet placement uses the authenticated session BFF, forwards the cart token
  and idempotency key, and clears the cart cookie only after a successful
  response.

## Correction

The checkout documentation previously said prepaid order placement returned the
provider redirect payload. It now documents the actual order-then-initiate BFF
sequence and the retry boundary.

## Validation

This shot was a source and contract audit. No application code change was
required.

- Customer checkout/payment BFF routes and NestJS controllers compared.
- Checkout, payment retry, and order confirmation callers compared.
- Cart cookie, host forwarding, idempotency, draft invalidation, and payment
  ownership paths inspected.
- Redis was not changed.

## Remaining runtime evidence

Live duplicate-submit behavior, payment-provider callback verification,
provider credentials, stock/payment races, browser cookie behavior, live tenant
host forwarding, and cross-tenant isolation still require runtime evidence.
