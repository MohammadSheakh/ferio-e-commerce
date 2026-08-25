# Project Progress — MT-4 Core: Rollout Flag, Schema Bootstrap, Tenant Data-Access Primitive

**Date:** August 24, 2026 (second increment of the day)
**Scope:** Completes the engineering core of Release MT-4 and unblocks MT-7; adds the staged-rollout switch from MT-2.

---

## What landed

### 1. `TENANCY_ENABLED` staged-rollout flag (MT-2 amendment)

The tenant middleware previously made every route require resolution — which would break the still-running single-host deployment the moment the code shipped. Now:

- `TENANCY_ENABLED=false` (default): middleware passes through without context; commerce keeps using its current database. Zero behavior change for existing deployments.
- `TENANCY_ENABLED=true`: resolution is strict — unknown/suspended/unhealthy hosts fail closed with stable codes; no legacy fallback exists on this path.

This converts the cutover into a deliberate, reversible operations decision instead of a deploy-time cliff.

### 2. Tenant connection material rides the request context

`TenantContext` now carries the registry row's non-secret fields plus the **encrypted** credential envelope (`TenantDatabaseMaterial`). Consequences:

- Request-scoped data access needs zero additional control-plane round-trips per operation.
- Plaintext credentials still never exist outside pool-creation/bootstrap moments (decryption stays inside the manager/bootstrapper).
- Context remains frozen, server-side-only, and free of anything API-shaped.

### 3. `TenantDbService` — the MT-3 §6.2 migration primitive

```ts
const db = await this.tenantDb.get();      // strict: throws outside tenant requests
const db = await this.tenantDb.tryGet();   // explicit dual-mode escape hatch
```

Resolution accepts no arguments — callers cannot influence which database they reach, closing the "nested service re-resolves a different client" hazard by construction. Commerce modules begin migrating behind this in MT-7.

### 4. `TenantSchemaBootstrapper` — canonical schema application (MT-4)

- Applies the ordered canonical artifact set (`prisma/migrations/<name>/migration.sql`) to a freshly created tenant database.
- Tracks applied artifacts in `_ferio_tenant_migrations`; **re-runs apply nothing** — provisioning retries cannot double-apply.
- Each migration executes inside its own transaction; failures abort that migration only and name the artifact (`TENANT_MIGRATION_FAILED:<name>:…`).
- Resulting version stamps the registry row (`schemaVersion`), feeding the MT-11 compatibility gate later.
- Baseline seed is idempotent and safe-by-default: store identity only, COD verification at `ALWAYS`, support channels empty — **no fake customers/orders/payments** (PRD rule).
- Wired into provisioning: `APPLY_MIGRATIONS` runs bootstrap against the decrypted connection; `SEED_TENANT` seeds baseline; `HEALTH_CHECK` stamps READY.

## Verification

- Backend production build clean.
- **67 suites / 264 unit tests passing**, including updated resolver assertions proving ciphertext-only material in the context.
- New gated integration suite `test/tenant-bootstrap.integration-spec.ts` (runs when `TEST_DATABASE_URL` points at a disposable PostgreSQL with CREATE DATABASE rights — same pattern as existing suites). It proves against real PostgreSQL:
  1. the full canonical chain applies to a fresh database;
  2. bootstrap idempotency (second run applies zero migrations);
  3. baseline seed inserts exactly-once defaults;
  4. **two independently bootstrapped databases are fully isolated**: identical brand IDs coexist, tenant B cannot read tenant A's row, and an A-side transaction rollback leaves B untouched (MT-3 gate evidence).
- Local execution note: this workstation's PostgreSQL requires interactive credentials, so the suite self-skipped locally; it must run in CI/ops environment where `TEST_DATABASE_URL` is provisioned.

## Checklist movement

Marked done/partial in the tracker: §6.2 primitive, §7.1 registry/credential/migrations/health/retry/idempotency items, §7.2 seed items, TENANCY_ENABLED dev-mapping partial.

## Next

1. **MT-4 gate proof end-to-end**: drive `/platform/organizations` → provision → verify storefront/admin readiness against disposable infrastructure in CI (needs `TEST_DATABASE_URL` runner).
2. **MT-5**: wildcard host strategy + tenant frontend states (unknown-store / provisioning / suspended pages per design language).
3. Begin **MT-7** module migration starting with catalog public reads behind `TenantDbService`.

## Owner-blocked dependencies touched

- PostgreSQL hosting model for tenant databases (executor swap-in point ready).
- Wildcard DNS/TLS (MT-5).
- `TEST_DATABASE_URL` runner with CREATE DATABASE rights for isolation gates in CI.
