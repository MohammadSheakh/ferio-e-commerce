# Project Progress — MT-7 Slice 4: Checkout, Orders, Messaging Outbox, and In-App Notifications

**Date:** August 24, 2026 (seventh increment)
**Scope:** The financial heart of the platform — checkout drafts/previews, order placement/confirmation/COD/cancellation, the transactional-message outbox, and the private customer notification inbox — now resolves through the tenant database inside storefront requests.

---

## What landed

### 1. Four services migrated (36 method conversions)

| Service | Methods | Why it must move together with orders |
|---|---:|---|
| `OrderService` | 15 | Placement, idempotent replay, confirmation, COD policy, cancellation, fulfillment exceptions, tracking — all serializable transactions now bind to the tenant client |
| `CheckoutService` | 6 | Drafts, preview, delivery options/zones — drafts can never land in a different database than the orders they become |
| `TransactionalMessagingService` | 8 | Outbox/templates/attempts — messages reference tenant orders; splitting would orphan evidence |
| `CustomerNotificationsService` | 7 | Private inbox rows stay beside the orders that generate them |

Cross-service transaction integrity is preserved structurally: collaborators invoked **inside** placement's serializable transaction (wallet debit, inventory movements, audit) receive the tenant transaction as a parameter — they never open their own database. Post-commit messaging/notification writes resolve through the same request context.

### 2. Tooling lesson institutionalized

The first sweep attempt corrupted one file via in-place index mutation and another by inserting `await this.db()` into four **synchronous** methods (`getDeliveryOptions`, `getDeliveryZones`, `updateCodPolicy`, `eligibleMessages`, `unreadCount`). Both failure classes are now structurally impossible:

- The sweep became a pure single-pass transform (output buffer built from original indices; per-method paren-depth signature-close detection).
- A post-sweep verifier checks every converted method for (a) resolution before first `db.` use, (b) no stray legacy references, (c) insertion only into `async` methods.
- Constructor injection moved to **last-parameter** position after positional-arg specs exposed a param-shift bug (`this.tenantDb?.tryGet is not a function`).
- `TenantDbService` now imports its manager **type-only**, so consuming services don't drag `pg`/adapter runtime dependencies into test bundles.

### 3. Sequencing constraint made explicit

BullMQ dispatch workers read outbox rows outside any request context — they cannot resolve tenants until MT-8's worker-side resolution lands. Therefore `TENANCY_ENABLED=false` remains mandatory until MT-7 + MT-8 complete; the checklist now records this constraint inline (§10.4A).

## Verification

- Build clean (incremental-cache blind spot found and cleared: `nest build` had masked a broken state; strict `tsc --noEmit` over non-spec sources now passes and is the reference check).
- **70 suites / 282 tests passing** — including order/reservation/wallet/payment-callback suites that exercise the migrated placement path against mocked clients.
- Structural verifier output: all four services OK (resolution-before-use, async-only insertions, zero legacy strays outside helpers).

## Honest notes

- Strict tsc surfaced several **pre-existing** latent type errors inside spec files untouched today (auth controller/service specs, permissions guard spec). They never failed jest because ts-jest runs transpile-only. Recorded here rather than silently ignored; worth a dedicated cleanup pass.
- The incremental-build masking incident reinforces the earlier CI decision: CI runs clean-checkout builds, so this class of local staleness cannot reach the repository.

## Checklist movement

§10.5 orders items marked done; new §10.4A records outbox tenancy + the flag sequencing constraint; §10.4 notification inbox marked done.

## Next

1. **MT-7 slice 5** — commerce payments tenancy: provider credentials per tenant (integration vault), callback tenant resolution without browser-trusted input.
2. **MT-8** begins immediately after: Redis key namespaces, BullMQ job envelopes + worker-side tenant DB resolution (unblocks the flag), socket room namespacing.
