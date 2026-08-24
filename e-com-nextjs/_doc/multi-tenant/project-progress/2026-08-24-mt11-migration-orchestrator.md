# Project Progress — MT-11: Tenant Migration Orchestrator

**Date:** August 24, 2026 (twelfth increment)
**Scope:** Release MT-11 — canary → batch → fleet schema migrations with per-tenant evidence, failure thresholds, operator pause/resume, and a console control surface.

---

## What landed

### 1. `MigrationOrchestratorService` (ADR-0005 realized)

Lifecycle: `PENDING → CANARY → BATCHING → COMPLETED | PAUSED | FAILED`.

- **Canary phase**: the first READY tenant migrates alone. A canary failure fails the run immediately — the fleet is untouched (unit-proven: org-1 SQL error ⇒ org-2 never attempted).
- **Batching phase**: remaining tenants walk in bounded batches (`concurrencyLimit`, clamped 1–10). Healthy members of a batch complete before a pause takes effect.
- **Failure threshold**: consecutive failures pause the rollout; the pause is recorded and audited with the last affected organization.
- **Resume**: re-enqueues the run and **skips tenants with existing successful results** — retries never double-apply migrations because application goes through the idempotent `TenantSchemaBootstrapper` (`_ferio_tenant_migrations` ledger).
- Every attempt upserts a `TenantMigrationResult` (from/to versions + detail); registry rows get stamped schemaVersion and health state.

### 2. Queue + API + console

- New `TENANT_MIGRATION` BullMQ queue; runs execute off the HTTP path via a dedicated processor (ADR-0005 §14.3's "never at startup" rule enforced structurally — only an operator action enqueues a run).
- Platform API: `POST /migrations` (canary/batch/threshold options), list + detail, `/:runId/pause`, `/:runId/resume` — all gated by `migration:run` permission.
- Console `/migrations`: start form (optional canary ID, batch size, failure threshold) plus fleet tables showing every attempt's result and version target; pause/resume controls on live runs.

### 3. Tests

Four orchestrator cases: invalid canary rejection · exactly-one enqueue per start · canary-failure fleet protection · threshold pause after two consecutive batch failures with healthy-batch completion and zero attempts against paused tenants.

## Verification

- Backend build clean; **73 suites / 297 tests passing**.
- Console strict tsc clean; production build passes.

## Checklist movement

§14.2 orchestrator items marked complete (fleet dashboard included). §14.3 safety items partially covered here (idempotent artifact application, bounded batches, no-startup-migrations); backup-before-high-risk and expand/contract runbooks remain operational policy work tied to hosting decisions.

## Next

1. **MT-12**: backup/restore evidence plumbing into the console once PostgreSQL backup strategy is chosen (owner-blocked), plus tenant closure/export workflow implementation of ADR-0007.
2. **MT-13 hardening**: cross-tenant negative-test suite expansion into CI, load simulation for resolver/connection manager.
3. MT-10 tenant-owner onboarding wizard remains the last major UX surface.
