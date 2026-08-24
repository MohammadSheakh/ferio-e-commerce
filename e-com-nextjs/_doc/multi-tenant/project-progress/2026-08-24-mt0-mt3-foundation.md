# Project Progress — Multi-Tenant Foundation (MT-0 → MT-3)

**Date:** August 24, 2026
**Scope:** Releases MT-0, MT-1, MT-2, and the core of MT-3 from `implementation-checklist-and-schedule-multitenant.md`

---

## What landed

### MT-0 — Architecture freeze and safety baseline

- Seven Architecture Decision Records written under `_doc/multi-tenant/adr/` with a README register:
  - ADR-0001 Database-per-tenant (accepted; owner confirmation pending)
  - ADR-0002 Host-based trusted tenant resolution (fail-closed, no legacy fallback)
  - ADR-0003 Bounded tenant connection management (LRU, eviction, breaker)
  - ADR-0004 Platform identity vs tenant membership (separate realms)
  - ADR-0005 Migration orchestration (canary → batch → fleet)
  - ADR-0006 Centralized subscription/entitlement enforcement
  - ADR-0007 Closure/export/retention (proposed; policy owner-blocked)
- `data-classification.md`: every existing Prisma model classified CONTROL_PLANE / TENANT / REMOVE-LEGACY; singleton inventory; tenant-local uniqueness notes.
- Security baseline verified against the August 2026 remediation (no JWT fallbacks, fail-closed revocation, OTP hardening active).
- Stable machine error codes introduced for all tenant-plane failure modes (`src/tenancy/tenant-errors.ts`).
- Fail-closed rules encoded and unit-tested: no lookup failure falls back to the legacy database; no request input selects a database.

### MT-1 — Control plane

- New separate datasource `prisma/platform.prisma` (`PLATFORM_DATABASE_URL`) with its own generated Prisma client (`src/platform/generated/platform-client`) — structurally isolated from tenant commerce models.
- All §4.1 models shipped: Organization (+ append-only lifecycle events), TenantDomain (subdomain reservation + custom-domain verification lifecycle), TenantDatabase registry (AES-256-GCM credential encryption at rest), Plan/PlanEntitlement, Subscription + SubscriptionEvent history, SaasInvoice/SaasPaymentAttempt (financially separate from commerce money), UsageCounter, PlatformUser/PlatformRole/OrganizationMember, SupportAccessGrant, PlatformFeatureFlag, PlatformAuditLog, ProvisioningRun/Step, TenantMigrationRun/Result.
- Services with real state machines: organizations (guarded transitions), subscriptions (trialing→active→past-due→suspended/cancelled/reactivation + event history), entitlement evaluator (feature flags + limits + subscription state, stable denial codes), usage metering (atomic upsert increments, period-keyed), domains (reserved-subdomain list, verification-token activation), support access (reason-bound TTL grants, revoke, assert-active), append-only platform audit.
- Provisioning orchestrator: 8 recorded steps, idempotency-key replay safety, resume-from-first-incomplete-step, pluggable physical-database executor.
- Independent authorization realm: `PlatformAuthGuard` verifies `realm=platform` tokens signed with `PLATFORM_JWT_SECRET` (distinct secret), role→permission map, realm-mismatch rejection. Tenant tokens are worthless here and vice versa.
- Minimal Platform Admin API (`/platform/*`) so lifecycle flows are drivable before any console UI (console itself remains MT-9).

### MT-2 — Trusted tenant resolution and request context

- Pure, heavily unit-tested `normalizeTenantHost`: lowercases, strips ports/trailing dots, rejects malformed hosts, IP literals, oversized labels.
- `TenantResolverService`: exact match against ACTIVE `TenantDomain`; suspended/closed organizations rejected `TENANT_SUSPENDED` (503); registry status gating (`MIGRATION_REQUIRED`, `UNHEALTHY`); positive cache 60s keyed by trusted hostname; negative cache 15s to blunt enumeration; Redis-down degrades to direct control-plane lookups.
- Immutable frozen `TenantContext` propagated via AsyncLocalStorage; `getTenantContext()` fails loud outside resolved requests.
- `TenantContextMiddleware` wired for all routes except platform/health/socket paths.

### MT-3 — Connection management core

- `TenantDatabaseManager`: LRU-bounded Prisma clients keyed **only** by control-plane registry ID; idle-TTL sweep with unref'd timer; acquire timeout via pool config; per-database circuit breaker (3 failures → 30s cooldown, fail-fast `TENANT_DATABASE_UNHEALTHY`); graceful shutdown disconnect-all; metrics snapshot.

## Verification

- Backend production build clean (all four libs + main app).
- **67 suites / 264 unit tests passing**, including 50 new multi-tenant tests: lifecycle transition matrices (organization + subscription), entitlement matrix incl. concurrent-limit semantics, host security boundary cases, fail-closed resolution negative tests (unknown/inactive/suspended/migration-required), reserved subdomains, custom-domain verification mismatch, connection-manager bounds/breaker/credential round-trip.
- CI updated: `pnpm prisma:generate` now builds both tenant and platform clients.

## Deliberate decisions made

| Decision | Rationale |
|---|---|
| Physical DB creation ships as a pluggable executor (default: `CREATE DATABASE` on the platform PostgreSQL server) | Hosting model is owner-blocked; orchestrator semantics don't change when managed hosting arrives |
| Migration fleet runner deferred to MT-11 | Run/result models + version stamping landed now; BullMQ fleet scheduling is a distinct concern |
| Platform Admin console UI deferred (MT-9) | API-first lets gates be integration-tested before pixels |
| Customer identity stays tenant-local | Owner-blocked decision recorded in ADR-0004 |

## Not yet done (next)

- `TENANCY_ENABLED` staged-rollout flag so existing single-host deployments keep working until cutover.
- Canonical tenant-schema application (real migration SQL into fresh tenant DBs) — MT-4 completion.
- Repository migration of commerce modules behind tenant clients — MT-7.
- Fleet migration scheduler, backup/restore, Platform Admin UI — MT-9/11/12.
