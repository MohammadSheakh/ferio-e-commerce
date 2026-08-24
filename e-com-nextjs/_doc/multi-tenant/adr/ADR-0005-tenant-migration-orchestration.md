# ADR-0005 — Tenant Migration Orchestration (Canary → Batch → Fleet)

**Status:** ACCEPTED · **Date:** 2026-08-24

## Context

With database-per-tenant, every schema change is a fleet operation: N databases must reach schema version X before the application code that requires X can serve them. Running `prisma migrate deploy` from application startup against every tenant is uncontrolled and dangerous — a bad migration replicates to the whole fleet at boot, and startup order becomes load-bearing.

## Decision

1. **Canonical artifact:** one tenant Prisma schema + its ordered migration set is the single versioned migration artifact. The expected `schemaVersion` is recorded in the control plane alongside each release.
2. **Control-plane and tenant-plane migrations are separate pipelines** with separate directories, commands, and CI jobs. The platform DB never receives tenant migrations.
3. **Orchestrator service** (BullMQ-driven, not boot-time):
   - discovers eligible tenant databases from the registry;
   - preflights connectivity and current version;
   - applies migrations to designated **canary** tenants; runs post-migration health checks;
   - rolls forward in bounded batches with concurrency limits;
   - records per-tenant results (append-only run/step history);
   - pauses on failure threshold; isolates failing tenants without blocking healthy ones;
   - supports pause, resume, retry-after-repair.
4. **Compatibility rule:** the application must refuse to serve a tenant whose schema version is outside the supported range — fail closed with `TENANT_MIGRATION_REQUIRED`, never silently serve old/new mismatches for writes.
5. **Safety:** backup-before-migrate flag for high-risk releases; expand/migrate/contract discipline for breaking changes; timeouts and lock strategies per run; rollback = restore point + forward fix, never reverse migration scripts.

## Consequences

**Positive:** migration risk is bounded and observable; one broken tenant database cannot brick the fleet; deploys decouple from schema state.
**Negative/obligations:** release process gains a migration step operators must actually use; CI must validate migration artifacts; the orchestrator itself becomes critical infrastructure needing tests (≥10 disposable tenant DBs, one injected failure).

## Alternatives rejected

- Boot-time auto-migrate of all tenants: rejected — uncontrolled blast radius, startup coupling.
- Manual per-tenant psql runs: rejected — does not scale past ~3 tenants and has no evidence trail.
