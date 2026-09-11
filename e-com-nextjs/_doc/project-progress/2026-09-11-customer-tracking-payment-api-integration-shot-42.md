# Customer tracking payment API integration shot 42

Date: 2026-09-11

## Scope

Audited the public customer order-tracking BFF, tracking page, shared response
type, NestJS tracking controller/DTO/service, generated OpenAPI contract, and
checkout API documentation.

## Findings and changes

- Found a real response-model mismatch: NestJS returns `COD`, `PREPAID`, or
  `PAY_AT_STORE`, while the customer `OrderTracking` type allowed only `COD`.
- Found a presentation defect caused by the same mismatch: the tracking page
  always displayed "Cash on delivery" even for prepaid or pay-at-store orders.
- Expanded the shared type and rendered the payment method returned by the
  server.
- Corrected the API documentation: `phone` is required and verified against
  the order address; no signed-token tracking contract is currently exposed.

## Verification

- Customer OpenAPI drift check passed.
- Customer TypeScript check passed.
- Customer lint passed with existing image warnings and the existing Node
  engine warning.

## Remaining runtime proof

Live public tracking, tenant-host forwarding, rate limiting, phone privacy,
order-reference enumeration resistance, payment-method display in a browser,
and cross-tenant tracking isolation remain open until the local PostgreSQL and
application stack is running. No mobile or Redis code was changed.
