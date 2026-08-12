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
