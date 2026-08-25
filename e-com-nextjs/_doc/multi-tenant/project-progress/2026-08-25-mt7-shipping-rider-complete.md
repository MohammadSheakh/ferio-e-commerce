# Project Progress — MT-7 Completion + Two-Tenant End-to-End Vertical Proof

**Date:** August 25, 2026 (twenty-second/twenty-third increments consolidated)
**Scope:** Closes Release MT-7 — shipping and rider workforce services swept, and the capstone two-tenant end-to-end integration spec delivered for CI execution.

---

## What landed

### 1. `ShippingService` swept (10 methods)
Fulfillment queue queries, shipment lifecycle, webhook-log listing, scorecard. Combined with the HMAC callback binding from slice 5, a shipment now lives entirely inside its tenant database: creation → webhook evidence → poll attempts → COD-collection expectation.

### 2. `DeliveryPersonnelService` swept (14 methods)
Rider application review, approval provisioning, assignments, duty state, GPS history, location-history clearing, live-map feed. A rider session can only reach orders in its own organization's database.

### 3. Capstone two-tenant vertical spec (`two-tenant-vertical.integration-spec.ts`)

The single test the whole architecture exists to pass. Against real PostgreSQL:

**Setup per tenant (identical inputs):**
- canonical bootstrap of a scratch database
- category + published product with stock 5 under identical names/slugs
- guest cart with 2 units (independent tokens)
- checkout draft from identical customer/address input

**Proofs asserted:**
1. Placing COD orders with the **same idempotency key** succeeds independently in both tenants (distinct order IDs).
2. A's order reference matches **zero rows** in B's database, and vice versa.
3. Staff confirmation in A consumes only A's reservation; B's reservation state is bit-for-bit unchanged.
4. A's guest-cart token resolves to an empty cart inside B.
5. A rider session bound to B cannot act on A's order (`NotFoundException`).

### 4. Hygiene fixes caught by gates during this increment
- customers.service constructor mangled by scripted insert → repaired; caught by tsc syntax error.
- message.service wrong relative import depth → caught by module-resolution failure.
- platform-billing logger arity mismatch → caught by tsc.

All three were surfaced by the strict-tsc reference check adopted in MT-13, never by runtime discovery.

## Verification

- Build clean; strict tsc non-spec errors: 0.
- **75 suites / 311 tests passing.**
- The capstone spec compiles and gates correctly on `TEST_DATABASE_URL`; it executes against the CI postgres service container on every push.

## Checklist movement

§10.8 backend items closed (fulfillment queues, callbacks/polls, rider lifecycle, cross-rider prevention). §10.4 identity policy decided (PO-015), abandoned-cart swept. §10.5 order-reference proof PARTIAL pending CI execution of this spec.

## Flag-on readiness after MT-7 completion

Remaining blockers:
1. Wildcard DNS record + TLS certificate on the production domain (ops).
2. Credential vault production storage per PO-010 (deployment work).
3. First green CI run of this spec + the alpha flow itself (MT-14).

Everything else — resolver, router, membership gate, entitlements, all commerce sweeps, fan-out workers, socket scoping, Platform Admin — is implemented and tested.
