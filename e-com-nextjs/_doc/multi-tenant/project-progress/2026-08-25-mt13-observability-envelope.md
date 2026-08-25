# Project Progress — MT-13 Observability Envelope Landed

**Date:** August 25, 2026
**Scope:** Tenant identity in structured logs + labeled counters for every isolation-critical failure path (§16.1), without requiring a metrics-stack decision.

---

## What landed

### 1. Tenant identity on every structured log entry

`StructuredLogger` JSON entries now carry `organizationId` and `hostname` whenever the log point runs inside a resolved tenant request. Dependency direction is preserved via a bootstrap hook: `registerTenantLogContextAccessor()` is registered by the new `TenancyObservabilityService` at module init — `libs/common` never imports the tenancy layer. Registry IDs and hostname only; credentials remain redacted by the existing sanitizer.

### 2. Isolation-critical counters (`TenantMetrics` in libs/common)

Bounded, labeled, static counter registry following the established `RequestMetrics` conventions:

| Counter | Emitted at |
|---|---|
| `resolver_unknown_domain{hostname}` | negative-cache hit + missing/inactive domain (fail-closed branches) |
| `resolver_suspended{hostname}` | CLOSURE_PENDING/CLOSED/ARCHIVED/PROVISIONING_FAILED orgs |
| `resolver_tenant_unavailable{hostname}` | missing/RETIRED/non-READY registry rows |
| `resolver_migration_required{hostname}` | MIGRATION_REQUIRED registry rows |
| `entitlement_denied{code,featureKey}` | all five server-side denial paths in `EntitlementsService.evaluate` |
| `db_acquire_failure{tenantDatabaseId}` | connection-manager breaker failures |
| `db_breaker_opened{tenantDatabaseId}` | circuit-breaker opens |
| `queue_tenant_failure{label,organizationId}` | per-org isolated fan-out failures |

Cardinality is capped (500 series, 4 labels, 128-char values) so hostile/host-varied label values cannot grow memory unbounded.

### 3. Snapshot emission

`TenancyObservabilityService` emits a structured `tenant_metrics_snapshot` log event every 60s (`TENANT_METRICS_LOG_INTERVAL_MS` tunable) only when activity exists. Any log pipeline (CloudWatch, Loki, Datadog) can alert on isolation regressions today; a real metrics backend remains an owner-gated infrastructure decision and can consume the identical snapshot shape.

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ 0 errors |
| Unit suite | ✅ 78 suites / 324 tests — new `tenancy-observability.spec.ts` covers counter aggregation/deterministic snapshots/cardinality caps, envelope stamping inside resolved contexts, absence outside them, accessor-throw safety, and snapshot-only-on-activity emission |
| Integration suite (real PostgreSQL) | ✅ 7 suites / 33 tests |
| Production build | ✅ clean |

## Checklist updates

§16.1 flipped: organization/tenant ID in logs · resolved domain · tenant DB connection metrics · entitlement-denial metrics · unknown-domain metrics · per-tenant queue failure visibility. Alerting annotated PARTIAL (log-based alerts available now; routing awaits stack decision). Provisioning/fleet/billing/backup/support-access metrics intentionally still open.

## Remaining MT-13 hardening candidates

1. Multi-client two-tenant socket E2E (§11.3 gate / MT-14 prep)
2. Cross-tenant negative-test matrix expansion (wallet/settlement/saved-cart E2E cases)
3. Dependency-audit triage (clear advisory noise)
4. Load simulations for resolver/connection manager (§16.3)
