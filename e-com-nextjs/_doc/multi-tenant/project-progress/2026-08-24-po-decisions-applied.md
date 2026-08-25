# Project Progress — Product-Owner Decisions Applied (PO-001..PO-020)

**Date:** August 25, 2026 (nineteenth increment)
**Scope:** The owner's decision set was provided (`20-product-owner-decision-checklist.md`). This increment records every decision as approved, updates ADR statuses, and implements the code those decisions unblock: plan catalog, grace period, PO-005 suspension behavior, the 90-day closure rule, internal-plan assignment, and tenant object-key namespacing.

---

## Decision log

`_doc/multi-tenant/product-owner-decisions-log.md` records **PO-001..PO-020 as APPROVED**, each with its engineering consequence. The source document remains untouched. ADR statuses updated to cite the deciding POs (ADR-0001/0002/0003/0004/0006/0007 — no longer "owner-blocked").

## Code implemented from the decisions

| Decision | Implementation |
|---|---|
| PO-001 plan catalog | `PlatformPlanSeedService`: idempotent seed of Starter/Business/Pro (limits 2/10/30 staff; 500/5000/25000 products; warehouses 1/3/10; feature flags per tier) + `enterprise` seeded inactive until negotiated + **`internal`** plan per PO-002 (all features, no limits, ৳0). Operator adjustments survive re-seeds. |
| PO-002 trial/internal | `startTrial` default 14 days; new `startInternal(organizationId)` assigns the internal plan ACTIVE with audit trail. |
| PO-003 monthly | MONTHLY default everywhere; YEARLY supported in schema. |
| PO-004 grace | `PAST_DUE → SUSPENDED` refused within 7 days of the latest PAST_DUE event (`SUBSCRIPTION_GRACE_PERIOD_ACTIVE`); operator override flag exists and is visible in the event note. Unit-tested both ways. |
| PO-005 suspension | Resolver now **resolves suspended organizations** (storefront browsable); `placeOrder` denies with `CHECKOUT_DISABLED_SUSPENDED`; closure-pending/closed stores still fail fully offline. Resolver spec rewritten to encode this policy. |
| PO-013 closure | `finalizeClosure` enforces a **90-day recoverable window** from the CLOSURE_PENDING event; inside the window requires explicit `overrideRetentionPeriod` (audited). Four unit cases: initiate revokes only active domains · refusal inside window · post-window retirement skipping already-retired registries · explicit override path. |
| PO-017 object keys | New `tenantObjectKey()` util (`tenants/{orgId}/…`, legacy fallback shape preserved) wired into the S3 attachment strategy key builder. |

## Verification

- Cacheless strict tsc non-spec errors: 0.
- Build clean; **74 suites / 304 tests passing** (+7: grace block/override ×2, suspension resolution policy, closure-offline, closure four-case suite).

## Checklist movement

§20 decision checklist: architecture-approval gate closed; twelve BLOCKED items converted to RESOLVED citing their PO IDs. §9.1 plans/entitlements/limits ✔ · §9.2 full lifecycle ✔ (trial/past-due/grace/suspended/cancel/reactivate) · §9.5 matrix items covered by existing suites ✔ · §15.3 retention semantics recorded.

## Still open after these decisions

1. PO-006 implementation: platform-billing SSLCOMMERZ adapter (provider abstraction already in models).
2. §11.5 credential vault production storage (KMS/Secret Manager per PO-010 — deployment work).
3. Wildcard DNS record creation on the production domain (ops task; decision made).
4. MT-14 alpha: pilot businesses through sales-assisted onboarding (PO-018).
