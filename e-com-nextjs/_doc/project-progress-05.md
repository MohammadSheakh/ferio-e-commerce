# Ferio Project Progress 05

**Checkpoint date:** August 6, 2026  
**Milestone:** Release 1 — Checkout preview foundation  
**Status:** Customer, delivery, and recoverable server-priced checkout preview completed

## Delivered

### Backend

- Added commerce `Customer` and reusable `CustomerAddress` models separate from staff `User` authentication.
- Indexed normalized phone values for matching without treating phone equality as verified identity.
- Added active/inactive delivery zones, unique district assignment, integer-paisa fees, ordering, and optional free-delivery thresholds.
- Added a cart-linked, 24-hour `CheckoutDraft` that preserves customer, address, consent, attribution, payment, and calculated-price data.
- Added Bangladesh mobile normalization for local, `880`, and `+880` formats while preserving original input.
- Added public delivery-option and checkout-preview APIs.
- Revalidated cart publication, price, stock, quantity, and COD eligibility before pricing checkout.
- Added protected admin delivery-zone list, create, and update APIs using existing JWT and admin-role guards.
- Added provisional seeded delivery zones for Dhaka, major cities, and nationwide coverage.
- Kept order creation and inventory reservation out of this slice.

### Admin Web

- Added `/dashboard/delivery` and sidebar navigation.
- Added protected BFF routes for listing, creating, and editing delivery zones.
- Added district editing, active state, sort order, delivery fee, and free-delivery threshold controls.
- Kept display values in taka while sending integer paisa to the backend.

### Customer Web

- Replaced the disabled checkout scaffold with a complete contact and Bangladesh delivery-address form.
- Added optional email and landmark fields plus required district and area selection.
- Added separate optional marketing consent and required checkout-detail confirmation.
- Preserved entered form data in session storage across recoverable page errors.
- Added server-only checkout BFF routes so the opaque cart token remains in its HTTP-only cookie.
- Added server-calculated subtotal, delivery fee, final total, and cash-on-delivery display.
- Persisted successful previews in PostgreSQL while clearly keeping order placement disabled.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 29 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 4 suites and 17 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; delivery page and 2 delivery BFF routes generated |
| Customer Web | Production build | Passed; checkout page and 2 checkout BFF routes generated |

## Still Open

- Migrations have not been applied to a disposable or live PostgreSQL database.
- Live browser testing with backend, PostgreSQL, and seeded delivery zones remains.
- Delivery fees are provisional defaults and still require business approval.
- Deterministic coupon rules remain unimplemented.
- Reusable addresses exist, but immutable order-address snapshots await the order model.
- Checkout drafts do not yet create customers or merge verified identities.
- Inventory reservation, idempotent order placement, COD confirmation, and order status transitions remain.
- Checkout database integration and browse-to-COD end-to-end tests remain.

## Recommended Next Work

1. Add immutable order, order-line, pricing, address, and status-history snapshots.
2. Add idempotency keys and transactional checkout-to-order conversion.
3. Reserve inventory atomically and release it safely on cancellation or expiry.
4. Implement COD confirmation and guarded order-state transitions.
5. Add database integration tests for duplicate requests and concurrent stock contention.
