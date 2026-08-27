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



===============================


# Ferio Project Progress 06

**Checkpoint date:** August 7, 2026  
**Milestone:** Release 1 — Order and COD operations foundation  
**Status:** Idempotent COD placement and guarded confirmation/cancellation implemented

## Delivered

### Backend

- Added human-readable unique order references and hashed globally unique idempotency keys.
- Added immutable order-address and order-item snapshots for customer, product, variant, SKU, attributes, price, discount, tax, quantity, and totals.
- Added independent order, payment, fulfillment, shipment, return, refund, and COD-verification states.
- Added status history with old/new status, source, actor, timestamp, and note.
- Added configurable `ALWAYS`, `ABOVE_AMOUNT`, and `NEVER` COD verification modes.
- Added checkout-draft conversion that creates or conservatively links a commerce customer without treating phone equality as infallible identity.
- Added confirmation-time inventory reservations and immutable reserve movements.
- Added serializable confirmation transactions so racing confirmations cannot normally oversell shared stock.
- Added cancellation reasons, transactional reservation release, and immutable release movements.
- Added protected order list, detail, COD policy, confirmation, and cancellation APIs.
- Added unit tests for COD policy and explicit transition rules.

### Admin Web

- Replaced mock order data with a protected live order queue.
- Added reference/customer/phone search and status filters.
- Added configurable COD verification controls.
- Replaced the fake clickable status stepper with server-authorized actions.
- Added immutable customer/address and item snapshots, independent lifecycle states, pricing, reservations, and status history.
- Added phone-confirm action that reserves stock and cancellation action requiring a reason.

### Customer Web

- Enabled COD order placement only after a successful server checkout preview.
- Retained one browser idempotency key across recoverable retries.
- Added a server-only order BFF that forwards the key and opaque cart token.
- Cleared the converted cart cookie after successful placement.
- Added a restrained order-confirmation screen with human-readable reference and verification state.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 30 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 5 suites and 19 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; live order pages and 5 order BFF routes generated |
| Customer Web | Production build | Passed; order placement BFF and confirmation page generated |

## Still Open

- Migrations have not been applied to a disposable or live PostgreSQL database.
- Duplicate request, lock contention, and reservation release require PostgreSQL integration tests.
- Customer order tracking still requires secure verification rather than reference-only confirmation display.
- Admin payment/date filters and delivered-order customer context remain.
- Notification queuing after order commit remains.
- Fulfillment, courier, shipment, delivery, return, and refund operations remain future slices.
- Coupon calculation remains unimplemented.

## Recommended Next Work

1. Apply all migrations to disposable PostgreSQL and add order integration tests.
2. Add fulfillment state/actions backed by active reservation checks.
3. Add provider-neutral shipment and courier-event models.
4. Add secure public order tracking using phone or signed verification.
5. Queue non-blocking transactional order notifications after commits.

=========================


# Ferio Project Progress 07

**Checkpoint date:** August 7, 2026  
**Milestone:** Release 1 — Courier provider and shipment foundation  
**Status:** Pathao and Steadfast adapter architecture implemented; production verification pending

## Diagram Analysis

The three delivery-flow diagrams correctly separate commerce orders from courier execution. Their recommended MVP is now reflected in Ferio:

- `Order` remains the commerce record and does not accumulate provider-specific tracking columns.
- `ShipmentProvider` stores provider identity, base URL, and activation state without credentials.
- `Shipment` stores one order's provider request/result, consignment, tracking, COD, charge, weight, and current normalized state.
- `ShipmentEvent` stores the append-only customer/operations timeline and provider payload.
- `ShipmentWebhookLog` retains authenticated or rejected callback attempts for replay investigation.
- Pickup batches, dedicated labels, and COD settlements remain later phases exactly as the diagrams recommend.

## Delivered

### Backend

- Added provider-neutral courier adapter interfaces.
- Added configuration-gated Steadfast parcel creation using API-key and secret-key headers.
- Added configuration-gated Pathao OAuth and parcel creation with merchant store and location IDs.
- Added provider status mapping for delivered, failed, in-transit, picked, return, hold, and unknown outcomes.
- Added explicit shipment transition rules that prevent terminal and out-of-order regression while allowing a failed delivery to be retried.
- Added authenticated, deduplicated webhook intake with redacted authentication headers and retained raw bodies.
- Added unknown-status operational exceptions instead of silently discarding provider changes.
- Added delivered-stock consumption and return-to-origin reservation release with immutable inventory movements.
- Added provider readiness, activation, shipment list, shipment detail, and parcel creation APIs.
- Added immutable order-item weight snapshots for provider requests.
- Added environment examples without storing courier secrets in PostgreSQL.

### Admin Web

- Added `/dashboard/shipping` and sidebar navigation.
- Added provider configured/active/inactive states and guarded activation controls.
- Added a live shipment queue showing order, customer, provider, tracking, COD, and normalized status.
- Added parcel creation to confirmed order detail after an explicit packed-parcel acknowledgement.
- Added conditional Pathao city/zone/area inputs without leaking those provider fields into Steadfast.
- Added shipment status, tracking, exception, and event timeline to order detail.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 31 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 6 suites and 21 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; shipping page and 4 shipping BFF routes generated |
| Customer Web | Production build | Passed; checkout and order confirmation remain healthy |

## Still Open

- Migrations have not been applied to disposable or live PostgreSQL.
- No real Pathao or Steadfast merchant credentials are available in the workspace.
- Pathao city/zone/area synchronization and user-friendly mapping remain.
- Pathao's exact production webhook handshake/header must be confirmed with merchant documentation before activation.
- Provider sandbox tests for creation, replay, failure, delivery, cancellation, and RTO remain.
- Polling fallback, retry queues, pickup batches, printable labels, and COD settlement remain.
- Fulfillment pick, pack, quality-check, handover actions still need dedicated state history.
- Secure customer tracking and transactional notifications remain.

## Recommended Next Work

1. Obtain one approved merchant sandbox and confirm credentials/webhook contract.
2. Apply migrations and execute real parcel creation in sandbox.
3. Add provider location synchronization and cached Pathao location selection.
4. Add fulfillment action history and handover controls before parcel pickup.
5. Add callback replay tests, polling fallback, secure tracking, and notifications.
