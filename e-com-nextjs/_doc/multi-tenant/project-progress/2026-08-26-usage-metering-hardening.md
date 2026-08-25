# Project Progress — MT-9 §9.4 Usage Metering Hardened End-to-End

**Date:** August 26, 2026
**Scope:** The entire usage-metering section — authoritative counter registry, threshold warnings, fact reconciliation, and both admin/owner usage views.

---

## What landed

### 1. Authoritative metric registry (`usage-metrics.registry.ts`)

Single source of truth for every metered SaaS metric, keyed exactly to plan entitlement featureKeys:

| Metric | Aggregation | Reset | Warning at |
|---|---|---|---|
| `orders_per_month` | real-time (incremented post-commit) | billing period (`YYYY-MM` UTC) | 80% of limit |
| `products_max` | derived (recounted from tenant catalog) | continuous | 90% |
| `staff_seats` | derived (recounted from control-plane memberships) | continuous | 100% |

Also exports `periodKeyStart()` (UTC month boundary; malformed keys fall back to the current month so a bad key can never widen a counted window).

### 2. Threshold warnings in `UsageService.increment`

Boundary arithmetic on the post-upsert value means each crossing fires **exactly once per period**: structured `usage_warning_threshold_crossed` warn + `usage_threshold_crossed` counter. Failures inside the warning path can never fail the business write that triggered it.

New authoritative correction primitive: `setValue()` (reconciliation writes facts, not deltas).

### 3. Counter-vs-fact reconciliation (`UsageReconciliationService`, tenancy module)

- Recounts `orders_per_month` + `products_max` from the tenant database, `staff_seats` from control-plane active memberships.
- Corrects drifted counters to facts, emits `usage_reconciliation_drift` warnings/counters, returns a per-metric drift report.
- `reconcileAllReady()` sweeps every READY tenant with per-org failure isolation; refuses non-READY databases.

### 4. Platform Admin usage surface

- `GET /platform/organizations/:id/usage` — recorded counters vs current plan limits with computed ratios and warning flags (pure control-plane read).
- `POST /platform/organizations/:id/usage/reconcile` — audited correction pass returning the drift report.

Tenant Owner view already existed (`GET /tenancy/my-plan` → PlanUsageCard); now formally credited in the checklist.

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ 0 errors |
| Unit suite | ✅ 80 suites / 339 tests (+8): registry shape/thresholds, period-start derivation incl. malformed-key fallback, exact-once threshold crossing (79→80 warns, stays above silent), no warnings without definition/limit, setValue clamping, drift detection/correction reporting, control-plane seat sourcing, non-READY refusal |
| Integration suite (real PostgreSQL) | ✅ 8 suites / 34 tests |
| Production build | ✅ clean |

## Checklist updates

§9.4: all nine lines flipped `[x]`.

## Remaining MT-6 gate work

The one-test-tenant E2E (subscribe → hit limit → upgrade → unlock) still needs an integration scenario wiring provisioning + entitlements + usage together — candidate for MT-14 alpha prep alongside the socket harness.
