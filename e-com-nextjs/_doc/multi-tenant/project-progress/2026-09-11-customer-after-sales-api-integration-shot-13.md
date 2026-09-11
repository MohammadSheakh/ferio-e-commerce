# Customer After-sales API Integration Shot 13

**Date:** 2026-09-11
**Scope:** Customer warranty, public purchase activity, and returns API coverage.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Findings

- Warranty source integration is aligned. The customer screen calls
  `GET /warranty/claims/mine`, `POST /warranty/order-items`, multipart
  `POST /warranty/evidence/upload`, and `POST /warranty/claims` through the
  authenticated catch-all BFF. The BFF preserves the session and tenant host
  context.
- Warranty documentation was stale and advertised nonexistent
  `/warranty/verify-order`, `/warranty/eligible`, and `/warranty` paths. It now
  matches the controller and DTO contracts.
- Public purchase activity is integrated by the server-rendered history page,
  product surfaces, and toast BFF. Its supported query is `surface`, `page`,
  and `limit`; no `productId` filter exists, so documentation was corrected.
- The current NestJS returns controller is tenant-admin-only. No customer
  returns API is exposed for the frontend to integrate in this shot.

## Validation boundary

This is source/documentation evidence. Multipart malware/content validation,
warranty ownership, upload provider behavior, purchase-activity consent and
settings, live tenant isolation, and browser E2E still require runtime proof.
