# Ferio Commerce SaaS — Multi-Tenant Implementation Checklist and Delivery Schedule

**Document status:** Living execution tracker  
**Created:** August 24, 2026  
**Primary source:** `Ferio-Commerce-SaaS-PRD-v2.1-Complete.md`  
**Migration baseline:** Existing single-tenant Ferio Release 1 implementation  
**Architecture:** Modular monolith + control-plane PostgreSQL + database-per-tenant PostgreSQL + Redis/BullMQ  
**Primary applications:** Tenant Storefront Web, Tenant Admin Web, Rider Web Portal, Customer Mobile App, Ferio Platform Admin, NestJS Backend

---

## 1. Purpose and How to Use This Document

This document converts the Ferio Commerce SaaS PRD v2.1 into an implementation sequence for migrating the already-developed single-tenant commerce platform into a production-grade multi-tenant SaaS product.

This is **not** a rebuild plan. Existing commerce capabilities that are already working—catalog, inventory, cart, checkout, orders, payments, wallet, fulfillment, riders, returns, reconciliation, chat, warranty, services, reporting, and operational tooling—should be preserved and progressively moved behind trusted tenant context.

The PRD remains the product source of truth. This checklist is the engineering execution tracker.

### Status legend

- [x] **Inherited / Done** — capability already exists in the current Ferio commerce baseline and should be preserved.
- [ ] **Pending** — not yet implemented for SaaS/multi-tenancy.
- [ ] **PARTIAL** — foundation exists but does not yet satisfy the multi-tenant acceptance condition.
- [ ] **BLOCKED** — requires a product, infrastructure, provider, billing, DNS, or security decision.
- [ ] **DEFERRED** — intentionally outside the current release.

### Completion rule

A multi-tenant item may become `[x]` only when:

1. tenant context is resolved server-side from trusted inputs;
2. the correct tenant database is selected without accepting a client-supplied database identity;
3. authorization and plan entitlement are enforced server-side;
4. Redis/cache/job/socket/file namespaces cannot collide across tenants;
5. failure paths do not fall back to another tenant or the legacy default database;
6. negative cross-tenant tests pass;
7. audit/observability evidence identifies the organization safely;
8. relevant frontend error/loading/suspended/unknown-domain states exist;
9. migration, rollback, and operational documentation are updated.

---

## 2. Current Position

**Current architecture:** Mature single-business Ferio commerce platform with substantial Release 1 operational functionality.

**Progress checkpoint (August 24, 2026):**

- **MT-0 complete** — seven ADRs (`_doc/multi-tenant/adr/`), full model classification (`data-classification.md`), security baseline verified, stable tenant error codes, fail-closed rules encoded and tested.
- **MT-1 complete (code + tests)** — control-plane schema (`prisma/platform.prisma`, separate datasource/client), all §4.1 models, organization/subscription/entitlement/domain state machines, usage metering, provisioning orchestrator (idempotent, resumable), support-access grants, platform audit, independent `PlatformAuthGuard` realm, minimal admin API. Physical DB creation is a pluggable executor pending the hosting decision.
- **MT-2 complete (code + tests)** — host normalization, fail-closed resolver with positive/negative caching, immutable `TenantContext` via AsyncLocalStorage, middleware wired for all routes except platform/health/socket paths.
- **MT-3 core complete (code + tests)** — `TenantDatabaseManager`: LRU-bounded clients keyed by registry ID, idle eviction, acquire timeout, per-database circuit breaker, AES-256-GCM credentials. Tenant-scoped repository migration across commerce modules remains (§10).

Verification: backend production build clean; **67 suites / 264 unit tests passing**, including new suites for lifecycle transitions, entitlement matrix, host security boundary, fail-closed resolution, and connection-manager bounds/breaker behavior.

**Target architecture:** Multi-tenant Commerce SaaS with:

- one Ferio control plane;
- one isolated PostgreSQL database per tenant;
- tenant-specific storefront hostname/subdomain;
- separate Platform Admin and Tenant Admin authorization domains;
- SaaS plans, subscriptions, entitlements, billing, usage, provisioning, domains, migrations, support, and tenant operations;
- preservation of existing tenant commerce functionality.

**Migration principle:** Introduce the SaaS control plane first, then trusted tenant resolution and database routing, then migrate every existing module behind tenant scope. Do not add broad new commerce features while the isolation boundary is incomplete.

**Launch status:** Not SaaS-ready until isolation, provisioning, migrations, subscriptions, domain routing, backup/restore, and cross-tenant security gates pass.

---

# 3. Release MT-0 — Architecture Freeze and Safety Baseline

## 3.1 Repository and application boundaries

- [x] Confirm the canonical SaaS application map. (`_doc/multi-tenant/application-boundaries.md`)
  - `ferio-nest-prisma` — shared NestJS backend;
  - Tenant Storefront Web;
  - Tenant Admin Web;
  - Rider Web Portal / rider surface;
  - Customer Mobile App;
  - Ferio Platform Admin.
- [x] Decide whether Platform Admin is a separate Next.js application or an explicitly isolated application boundary inside an existing admin repository. (`ferio-platform-admin` — ADR-0008)
- [x] Document which modules are **control-plane**, **tenant-plane**, or **shared infrastructure**. (`_doc/multi-tenant/application-boundaries.md`)
- [x] Add an architecture decision record for database-per-tenant. (`_doc/multi-tenant/adr/ADR-0001`)
- [x] Add an architecture decision record for tenant resolution. (`ADR-0002`)
- [x] Add an architecture decision record for connection-pool management. (`ADR-0003`)
- [x] Add an architecture decision record for platform identity vs tenant membership. (`ADR-0004`)
- [x] Add an architecture decision record for tenant migration orchestration. (`ADR-0005`)
- [x] Add an architecture decision record for subscription/entitlement enforcement. (`ADR-0006`)
- [x] Add an architecture decision record for tenant deletion/export/retention. (`ADR-0007`, policy owner-blocked)
- [x] Freeze accidental new global tables in the existing tenant schema until ownership is classified. (`architecture:check` parses `prisma/platform.prisma` and fails when any control-plane model is absent from the `CONTROL_PLANE` section of `data-classification.md`; new platform tables therefore require an explicit ownership-classification change.)
- [x] Create a tenant-boundary review checklist for every future module/PR. (`_doc/multi-tenant/tenant-boundary-review-checklist.md`)

## 3.1.1 Backend feature structure convention

The NestJS backend is a modular monolith organized by bounded feature context.
Each feature owns its module, DTOs, runtime roles, tests, and supporting
documentation. This structure is an implementation and code-review standard,
not a requirement to create empty folders in small modules.

```text
feature-name/
  feature-name.module.ts
  controllers/                 # when multiple/cohesive controllers exist
  services/                    # when multiple/cohesive services exist
  dto/
  adapters/ | gateways/        # external provider boundaries
  processors/                  # BullMQ/background workers
  queues/                      # job scheduling and enqueueing
  utils/                       # pure domain helpers
  tests/                       # feature or submodule-owned tests
```

Rules:

- Keep one-controller/one-service features flat when additional role folders
  would add ceremony without improving dependency boundaries.
- Use explicit role folders for complex features such as payments, shipping,
  reconciliation, settlements, transactional messaging, audit, storage, and
  real-time gateways.
- Keep tests inside the owning feature or bounded submodule under `tests/`;
  do not mix test files with production files in the same directory.
- Keep DTOs, adapters, processors, queues, gateways, policies, and utilities
  behind the feature that owns them. Do not create cross-feature utility dumps.
- Keep control-plane, tenant-plane, and shared-infrastructure dependencies
  visible in the feature module and preserve tenant-boundary direction.
- Keep historical reports, completion notes, and architecture documents under
  `_doc/`; runtime `src/features` directories contain executable source only.
- Use kebab-case for new directories. Existing names are normalized only in an
  atomic migration with all imports, tests, scripts, and documentation updated.
- A structure refactor must preserve public module exports and route contracts.
  It must pass typecheck, focused tests, the full backend suite, and
  `git diff --check`.

Implementation tracking: `_doc/multi-tenant/skill-related-discussion/file-folder-structure-track.md`.

- [x] Establish the feature role and test-folder convention.
- [x] Apply the convention to complex existing backend modules.
- [x] Move nested feature tests into dedicated `tests/` folders.
- [ ] Complete the controlled kebab-case naming migration for legacy folders.
- [x] Replace or isolate legacy Mongoose-shaped feature boundaries. (No active Mongoose imports, package dependencies, or root registration remain; the architecture check rejects reintroduction and the empty legacy database directory is outside the application graph.)

## 3.2 Data classification

- [x] Produce a table for every current Prisma model: `CONTROL_PLANE`, `TENANT`, `PLATFORM_SHARED`, or `REMOVE/LEGACY`. (`_doc/multi-tenant/data-classification.md`)
- [x] Classify all existing tables for catalog, inventory, cart, checkout, orders, payments, wallet, returns, riders, chat, services, warranty, reviews, settings, analytics, audit, reconciliation, and notifications.
- [x] Identify every current singleton/global setting that must become tenant-local.
- [x] Identify every current unique constraint that becomes tenant-local after DB separation.
- [x] Identify every cross-domain reference that cannot cross database boundaries. (`data-classification.md`, `application-boundaries.md`, and `project-flow/03-multi-tenant-resolution-and-database-routing.md` define opaque-ID-only cross-plane references.)
- [x] Prohibit tenant DB foreign keys to control-plane tables. (enforced by ADR-0001; canonical schema extraction will make it physical)
- [x] Define opaque identifiers required in cross-plane messages/events instead of database foreign keys. (TenantContext carries registry IDs only)
- [x] Document ownership and retention of uploaded product, warranty, review, return, and other media. (`_doc/multi-tenant/media-ownership-and-retention.md`; provider lifecycle and malware controls remain operational work.)

## 3.3 Security baseline before tenancy

- [x] Re-run secret scanning and rotate any remaining exposed credentials. (Required full-history gitleaks CI scan is clean; no exposed credential was identified for rotation.)
- [x] Verify JWT/session secrets have no development fallback in production. (Aug 2026 remediation + template-secret startup rejection)
- [x] Verify refresh revocation fails closed. (Aug 2026 remediation)
- [x] Verify OTP/TOTP hardening remains active. (Aug 2026 remediation)
- [x] Verify Platform Admin cannot reuse Tenant Admin authorization implicitly. (separate platform realm/permission guard plus platform-principal rejection in `TenantMembershipGuard`; regression-tested)
- [x] Add stable error codes for tenant resolution, tenant unavailable, subscription denial, provisioning failure, and tenant migration failure. (`src/tenancy/tenant-errors.ts`; entitlement/provisioning codes in services)
- [x] Add a rule: **no tenant lookup failure may fall back to the original Ferio database**. (resolver fails closed; enforced by tests)
- [x] Add a rule: **no request body/query/header may select a tenant database directly**. (resolver reads host only; manager keys on registry ID)

### MT-0 gate

- [x] Architecture decisions approved. (ADR-0001 through ADR-0008 and the product-owner decision log record the accepted database, identity, migration, entitlement, closure, and platform-boundary decisions.)
- [x] Existing Prisma models classified. (`data-classification.md` covers control-plane, tenant, platform-shared, and legacy model ownership.)
- [x] No ambiguous global-vs-tenant business data remains undocumented. (`data-classification.md` documents singleton settings, cross-plane opaque IDs, tenant-local identity, audit placement, and the remaining explicitly owner-blocked storage decision.)
- [x] Threat model reviewed before implementing database routing. (`_doc/multi-tenant/threat-model.md`; residual production/provider risks are explicitly listed)

---

# 4. Release MT-1 — Ferio Control Plane Foundation

## 4.1 Control-plane Prisma schema

Create a separate control-plane schema/database for platform metadata.

- [x] Model `Organization`.
- [x] Model organization lifecycle/status. (`OrganizationStatus` + `OrganizationLifecycleEvent` append-only history)
- [x] Model `TenantDomain`.
- [x] Model `TenantDatabase`.
- [x] Model tenant database schema version/readiness.
- [x] Model provisioning operations/runs. (`ProvisioningRun`/`Step`)
- [x] Model tenant migration runs and per-tenant migration results. (`TenantMigrationRun`/`Result`)
- [x] Model `Plan`.
- [x] Model plan versions if plan behavior must remain historically explainable. (`Plan.version` starts at 1 and increments atomically on every Platform Admin edit; creation/update audit snapshots include the version and normalized entitlements, while existing subscriptions retain their plan reference and billing history remains control-plane-only.)
- [x] Model plan entitlements/limits. (`PlanEntitlement` featureKey/enabled/limit)
- [x] Model `Subscription`.
- [x] Model subscription lifecycle history. (`SubscriptionEvent`)
- [x] Model SaaS invoices. (`SaasInvoice`)
- [x] Model SaaS payment attempts/transactions separately from commerce payments. (`SaasPaymentAttempt`)
- [x] Model usage counters/snapshots. (`UsageCounter` per metric+period)
- [x] Model platform users. (`PlatformUser`)
- [x] Model organization membership/ownership where platform identity is reused. (`OrganizationMember`)
- [x] Model Platform Admin roles/permissions. (`PlatformRole` + guard permission map)
- [x] Model support-access grants. (`SupportAccessGrant`)
- [x] Model platform feature flags. (`PlatformFeatureFlag`)
- [x] Model platform audit/security events. (`PlatformAuditLog`)
- [x] Add indexes for hostname/domain resolution. (`hostname @unique` is the resolution index)
- [x] Add uniqueness constraints for organization slug and active domain.
- [x] Add idempotency constraints for provisioning and platform billing. (`idempotencyKey @unique`, `reference @unique`)
- [x] Add explicit timestamps and append-only histories for sensitive lifecycle transitions.

## 4.2 Control-plane services

- [x] Implement organization service. (state machine + membership seed)
- [x] Implement domain registry service. (subdomain reservation, custom-domain verification lifecycle)
- [x] Implement tenant DB registry service. (AES-256-GCM credential encryption at rest)
- [x] Implement plan service.
- [x] Implement entitlement evaluator. (feature flags + limits + subscription state, stable denial codes)
- [x] Implement subscription state machine. (trialing→active→past-due→suspended/cancelled with event history)
- [x] Implement usage service. (atomic increment upserts, period-keyed snapshots)
- [x] Implement provisioning orchestration service. (9-step idempotent state machine with database readiness and baseline smoke verification, resumable runs, pluggable executor)
- [x] Implement tenant migration orchestration service. (BullMQ-backed canary/batch runner with per-tenant results, transient retry, failure-threshold pause, and queued resume; physical 10-database validation remains a CI/operations gate)
- [x] Implement support-access service. (reason-bound TTL grants, revoke, assert-active)
- [x] Validate platform organization lifecycle mutations with dedicated DTOs. (organization creation, status transition, provisioning idempotency key, and closure requests use bounded runtime validation)
- [x] Validate plan and subscription mutations with dedicated DTOs. (nested entitlement keys/limits, plan pricing/interval, trial duration, and subscription status transitions are bounded at the controller boundary)
- [x] Validate platform billing and migration controls with dedicated DTOs. (invoice dates, callback outcomes, and migration canary/concurrency/failure thresholds are validated before service execution)
- [x] Enforce financial input invariants inside platform services. (invoice periods must be finite and strictly increasing; plan creation normalizes and validates keys, amounts, entitlement limits, and duplicate features)
- [x] Implement platform audit service. (append-only)
- [x] Keep all control-plane services independent of tenant Prisma models. (separate generated client + datasource)

## 4.3 Control-plane authorization

- [x] Create separate Platform Admin guards. (`PlatformAuthGuard`, realm=platform tokens, role→permission map)
- [x] Define platform permissions for organization, subscription, billing, domain, provisioning, migration, support access, and platform health. (`PLATFORM_PERMISSION` is the typed canonical catalog; health diagnostics require `platform_health:read`.)
- [x] Ensure tenant staff roles cannot invoke Platform Admin APIs. (realm mismatch rejected)
- [x] Ensure Platform Admin identity alone does not grant direct tenant commerce access. (`TenantMembershipGuard` rejects platform-realm principals before roster lookup; tenant data access requires an explicit support-access workflow.)
- [x] Require explicit support-access workflow for tenant-data access. (`TenantMembershipGuard` rejects platform-realm principals; tenant-data access requires an active reason-bound support grant and `SUPPORT_ACCESS_USED` audit evidence.)
- [x] Make support access reason-bound, time-bound, auditable, and revocable. (min reason length, 5min–8h TTL clamp)

## 4.4 Validation

- [x] Unit-test organization state transitions.
- [x] Unit-test subscription state transitions.
- [x] Unit-test entitlement evaluation. (full matrix incl. concurrent-limit semantics)
- [x] Unit-test domain lifecycle. (reserved names, verification mismatch → FAILED, activation)
- [ ] Integration-test control-plane migrations on disposable PostgreSQL.
- [x] Prove platform billing tables cannot be confused with tenant payment/wallet ledgers. (Platform billing tests and the platform/tenant architecture checks keep SaaS invoices and payment attempts in the control plane; tenant payment, wallet, COD, refund, and settlement records remain outside the platform billing service.)

### MT-1 gate

- [x] Control-plane database can operate without connecting to a tenant DB. (Platform Prisma bootstrap requires its own `PLATFORM_DATABASE_URL` and the platform health/billing/catalog services use control-plane clients without tenant database injection.)
- [x] Platform Admin authorization is independent. (Platform routes use the separate `PlatformAuthGuard` realm and typed platform permissions; regression tests reject tenant-realm tokens and missing permissions.)
- [x] Organization/domain/plan/subscription/database registry foundations are production-build clean. (Backend application typecheck and production build pass across the platform foundation services and generated clients.)

---

# 5. Release MT-2 — Trusted Tenant Resolution and Request Context

## 5.1 Host/domain resolver

- [x] Normalize incoming host safely. (pure `normalizeTenantHost`: lowercase, port-strip, malformed/IP-literal rejection — unit-tested)
- [x] Handle ports in local/development hosts.
- [x] Reject malformed hosts.
- [x] Resolve Ferio subdomain to an active `TenantDomain`.
- [x] Reject unknown domains. (negative-cached, stable code)
- [x] Reject inactive/unverified domains.
- [x] Reject suspended organizations according to policy. (`TENANT_SUSPENDED` 503)
- [x] Support development host mapping without weakening production behavior. (`TENANT_DEV_HOST_MAP` supports exact local aliases only when `NODE_ENV` is not production; production ignores the mapping and resolves the request host directly.)
- [x] Cache domain resolution only with tenant-aware keys. (key IS the trusted hostname; positive 60s / negative 15s TTL)
- [x] Implement explicit invalidation on domain/status changes. (`invalidate(hostname)`)
- [x] Define negative-cache TTL for unknown domains. (15s window; only definitive unknown/inactive answers are cached — outages never are; storm test proves 299 subsequent misses cost zero control-plane queries)
- [x] Never trust `tenantId`, `organizationId`, `databaseUrl`, or equivalent browser-supplied routing values. (host-only input; middleware)

## 5.2 Tenant request context

- [x] Create immutable request-scoped `TenantContext`. (frozen object via AsyncLocalStorage)
- [x] Include organization ID, tenant DB registry ID, hostname/domain ID, subscription state, and safe correlation metadata. (correlation rides the existing ALS)
- [x] Make tenant context available to application services without reading raw host repeatedly. (`TenantDbService`, `resolveTenantDatabase()`, and `tryGetTenantContext()` are the application-service boundary)
- [x] Prevent code from mutating tenant context during a request. (Object.freeze + no setters exported)
- [x] Propagate trusted tenant context to background jobs. (BullMQ envelopes carry `organizationId`; tenant processors enter `TenantFanoutService.forOrganization()` or the retention retry's immutable context before tenant work)
- [x] Propagate tenant scope to WebSocket authorization. (authenticated socket tickets require membership and carry organization scope; socket authorization and room/database operations reject missing or mismatched organization context)
- [x] Include tenant identity in audit events. (`AuditService` appends safe organization, tenant database, domain, hostname, and correlation metadata at the shared write boundary.)
- [x] Include safe tenant identity in structured logs/metrics. (`TenancyObservabilityService` registers the immutable context with `StructuredLogger`; no credentials or raw headers are emitted.)
- [x] Do not expose DB credentials in context returned to frontend clients. (context carries registry IDs only; publicView strips secrets)

## 5.3 Identity + tenant membership

- [x] Define global identity vs tenant membership behavior. (Global authentication identity is checked against tenant-local membership/customer records; PO-014)
- [x] Verify an authenticated account is a member/customer/rider of the resolved tenant before protected tenant actions. (`TenantMembershipGuard` binds tenant-admin sessions to the control-plane organization roster; customer-account services resolve the authenticated user and customer only from the current tenant database; delivery-personnel operations bind rider identity to tenant-local approved personnel records. Focused membership, customer-isolation, and rider-isolation tests cover the boundaries; full multi-client E2E remains tracked under MT-14.)
- [x] Define same-email behavior across independent tenant businesses. (The same email may exist in independent tenant-local records; organization membership remains the authorization boundary)
- [x] Define whether customer identity is tenant-local initially. (Customer profiles and user-to-customer links are resolved from the trusted tenant database; PO-015)
- [x] Prevent a valid session from tenant A being replayed against tenant B. (Tenant membership and tenant-local identity lookups reject replay; focused auth/session coverage)
- [x] Bind Tenant Admin session authorization to resolved tenant membership. (`TenantMembershipGuard` covers all current `admin/*` controller classes; settings, delivery-personnel, conversations, and socket-ticket method-level routes have focused coverage; `architecture:check` fails on future unguarded admin controller classes)
- [x] Bind rider authorization to tenant + approved personnel record. (Delivery-personnel authorization requires the resolved tenant and approved personnel record)
- [ ] **PARTIAL:** Add negative tests for forged hosts and cross-tenant cookies/tokens. (unit suites cover forged/malformed hosts, unknown-domain fail-closed, cross-org session replay denial; full multi-client E2E remains MT-14)

### MT-2 gate

- [x] Two test hostnames resolve deterministically to two different organizations. (`src/tenancy/redis-collision.spec.ts`: tenant-a/tenant-b hosts resolve to their own orgs, interleaved resolutions never cross, positive-cache path stays deterministic)
- [x] Unknown/suspended hosts fail closed. (negative tests prove no legacy-DB fallback)
- [x] Changing an ID, cookie, host, or request payload cannot select another tenant's database. (manager accepts registry rows only)

---

# 6. Release MT-3 — Tenant Database Router and Connection Management

## 6.1 Tenant Prisma client manager

- [x] Implement a centralized tenant database connection manager. (`TenantDatabaseManager` owns all tenant Prisma clients and PostgreSQL pools)
- [x] Resolve DB connection only from trusted `TenantDatabase` control-plane metadata. (`TenantDbService` reads immutable `TenantContext.database`; request input never supplies connection material)
- [x] Encrypt tenant database credentials at rest. (`secret-box` AES-256-GCM envelope)
- [x] Keep decrypted credentials out of normal logs/errors. (decryption is scoped to pool construction and credentials are not included in structured errors)
- [x] Add bounded client/connection caching. (single-flight client creation plus configurable LRU capacity)
- [x] Add idle eviction. (bounded sweep with configurable idle TTL and eviction grace)
- [x] Add maximum active tenant-client limits. (`TENANT_DB_MAX_CLIENTS` reservation gate)
- [x] Add connection acquisition timeout. (`TENANT_DB_ACQUIRE_TIMEOUT_MS` bounds PostgreSQL pool acquisition)
- [x] Add health-state handling for unavailable tenant DBs. (per-database circuit breaker with cooldown and fail-fast error)
- [x] Prevent unbounded `new PrismaClient()` per request. (one cached client per registry ID with concurrent cold-start single-flight)
- [x] Add graceful application shutdown/disconnect. (`OnModuleDestroy` drains creations and disconnects all pools)
- [x] Add metrics for active clients, evictions, acquisition failures, and pool exhaustion. (`metrics()` plus bounded `TenantMetrics` events)
- [ ] Design for PgBouncer/managed pooling if tenant count requires it.
- [x] Add a circuit-breaker/backoff strategy for repeatedly unhealthy tenant DBs. (`TenantDatabaseManager` opens a per-registry circuit after bounded acquisition failures, applies cooldown/backoff, and fails fast until recovery; manager tests cover the breaker boundary.)

## 6.2 Repository/application-service integration

- [ ] Remove direct singleton tenant Prisma usage from tenant-scoped request paths.
- [x] Introduce tenant-aware repository/service access. (`TenantDbService` is the shared resolution boundary and the active commerce services use `resolveTenantDatabase`/`db()` helpers; the remaining injected Prisma client is an explicit legacy compatibility dependency, not an implicit tenant selector.)
- [ ] Ensure transactions use the same resolved tenant client for the entire operation.
- [ ] Ensure nested services cannot silently acquire a different tenant client.
- [x] Ensure control-plane transactions never include tenant DB writes as if they were one ACID transaction. (Platform services use the control-plane client only; tenant writes run through tenant context, and the architecture boundary check rejects tenant-plane access from the platform billing boundary.)
- [x] Define saga/compensation behavior for cross-plane workflows such as provisioning. (ADR-0001, application-boundary documentation, and the provisioning partial-failure runbook define recorded steps, replay/resume, failed-step repair, and safe orphan-resource review; automatic physical cleanup remains infrastructure-dependent.)
- [x] Add tests for transaction rollback inside one tenant without affecting another. (The disposable PostgreSQL tenant-bootstrap integration suite forces a rollback in tenant A and verifies tenant B remains unchanged.)

## 6.3 Database isolation tests

- [x] Provision tenant A database. (CI-gated `test/tenant-bootstrap.integration-spec.ts` creates an independent disposable PostgreSQL database.)
- [x] Provision tenant B database. (CI-gated `test/tenant-bootstrap.integration-spec.ts` creates a second independent disposable PostgreSQL database.)
- [x] Seed deliberately similar IDs into both. (The integration suite writes identical brand/category/product identifiers to both databases.)
- [x] Prove tenant A reads only A. (The real PostgreSQL isolation suite verifies A sees its own row.)
- [x] Prove tenant B reads only B. (The real PostgreSQL isolation suite verifies B cannot read A's row and can own the same identifier independently.)
- [x] Prove writes remain isolated. (Identical identifiers can be written independently without cross-database visibility.)
- [x] Prove transaction rollback remains isolated. (A forced rollback removes A's uncommitted row while leaving B's data untouched.)
- [x] Prove one tenant DB outage does not route to another. (`tenant-fanout.service.spec.ts` records the failed organization and resolves healthy work through its own trusted registry material.)
- [x] Prove one tenant DB outage does not crash healthy tenant traffic unnecessarily. (`tenant-fanout.service.spec.ts` continues healthy work after a connection failure.)
- [ ] Load-test connection manager with many simulated tenants.

### MT-3 gate

- [x] Database-per-tenant isolation is demonstrated automatically. (The disposable PostgreSQL tenant-bootstrap integration suite is mandatory in the backend CI integration job.)
- [x] No tenant-scoped HTTP path uses a global/default Prisma client. (`resolveTenantDatabase` selects the immutable tenant context client and throws `TENANT_DATABASE_SERVICE_REQUIRED` when tenancy is enabled without the boundary; production startup also requires `TENANCY_ENABLED=true`.)
- [x] Pool/client count remains bounded under load. (50 concurrent acquisitions collapse to 1 active client; LRU churn never exceeds TENANT_DB_MAX_CLIENTS — performance-baseline suite)

---

# 7. Release MT-4 — Tenant Provisioning and Lifecycle Automation

## 7.1 Organization creation workflow

Provisioning should behave as an idempotent state machine, not a controller script.

- [x] Platform Admin creates organization. (`POST /platform/organizations` creates the PROVISIONING organization and owner membership)
- [x] Reserve unique organization slug. (control-plane uniqueness plus service-level normalization/validation)
- [x] Reserve default tenant subdomain. (unique subdomain is created as `PENDING_ACTIVATION`, not traffic-visible)
- [x] Create tenant DB registry record.
- [ ] **PARTIAL:** Create physical database/schema according to infrastructure strategy. (default executor issues CREATE DATABASE on the platform server + canonical migration set applied via `TenantSchemaBootstrapper`; managed hosting remains owner-blocked)
- [x] Generate/store tenant DB credential securely. (AES-256-GCM at rest, decrypted only inside pool creation/bootstrap)
- [x] Apply current approved tenant migration set. (ordered artifact execution tracked in `_ferio_tenant_migrations`; idempotent re-runs proven)
- [x] Run tenant seed.
- [x] Seed default tenant settings. (CommerceSettings store identity + COD verification ALWAYS baseline, ON CONFLICT-safe)
- [x] Seed default permissions/owner role. (The control-plane organization transaction creates the initial `OWNER` membership; tenant authentication remains a shared global identity with tenant membership checked by `TenantMembershipGuard`, so no duplicate tenant-local super-admin is seeded)
- [x] Create/attach initial owner membership. (created atomically with the organization; owner-membership conflicts cannot leave an orphan organization)
- [x] Run DB health check. (read-only `SELECT 1` plus required migration-ledger and baseline-table verification before registry READY stamping)
- [x] Run minimal tenant smoke test. (provisioning records a separate `SMOKE_TEST` step and verifies the migration ledger, `CommerceSettings`, and `CodVerificationPolicy` tables against the new database)
- [x] Activate domain only after readiness. (`PENDING_ACTIVATION` becomes `ACTIVE` only in the final provisioning step after migrations, seed, health, and smoke test)
- [x] Mark organization `READY/ACTIVE` only after all required steps succeed. (failed steps transition to `PROVISIONING_FAILED`; successful finalization transitions to `ACTIVE`)
- [x] Persist every provisioning step/result.
- [x] Make retries resume safely. (resume-from-first-incomplete-step; idempotency-key replay returns completed runs)
- [x] Prevent duplicate DB/domain creation on repeated requests. (unique org slug/domain hostname/registry orgId/idempotencyKey)
- [x] Add compensation/manual-recovery instructions for partial failure. ([Provisioning partial-failure runbook](runbooks/provisioning-partial-failure.md) documents safe replay, orphan-resource review, escalation, and recovery evidence; automated physical-provider cleanup remains intentionally disabled.)

## 7.2 Tenant seed

- [x] Refactor existing Ferio seed into tenant-safe seed logic. (`TenantSchemaBootstrapper.seedBaseline` is the provisioning seed boundary and is idempotent under PostgreSQL conflict handling)
- [x] Remove global hard-coded Ferio business assumptions. (The organization name is the tenant seed input; the `Ferio` factory value is used only to avoid overwriting a prior migration default)
- [x] Seed tenant owner separately from platform super-admin. (The approved shared-identity design does not create a tenant-local super-admin: organization creation atomically creates the tenant's control-plane `OWNER` membership, while Platform Admin users remain a separate realm.)
- [x] Seed tenant-local settings. (`CommerceSettings` is created in the tenant database with the requested organization name)
- [x] Seed tenant-local feature defaults. (Commerce settings defaults are stored in each tenant database; commerce-affecting options remain configuration-owned)
- [x] Seed tenant-local notification templates. (`TenantSchemaBootstrapper.seedBaseline` inserts the approved transactional order/shipment templates idempotently while messaging remains disabled until a provider is configured.)
- [x] Seed delivery/payment defaults as disabled/configuration-required where appropriate. (`TenantSchemaBootstrapper.seedBaseline` keeps prepaid checkout disabled by default, creates the tenant-local COD policy, and idempotently seeds all six courier catalog records with `isActive=false` and no credentials; activation remains blocked until runtime configuration is verified.)
- [x] Seed no fake customer/order/payment data in production provisioning. (The baseline seed writes only `CommerceSettings` and `CodVerificationPolicy`; regression coverage rejects customer/order/payment inserts)
- [x] Make seed idempotent.

## 7.3 Organization lifecycle

- [x] Implement `PROVISIONING`. (organization state machine)
- [x] Implement `ACTIVE`. (organization state machine)
- [x] Implement `SUSPENDED`. (organization state machine plus suspension mutation guard)
- [x] Implement `PROVISIONING_FAILED`. (failed provisioning transitions are durable and resumable)
- [x] Implement `CLOSURE_PENDING` if approved. (closure workflow disables domains before retention)
- [x] Implement archived/deleted lifecycle according to retention policy. (`CLOSED` then `ARCHIVED`; physical destruction remains provider/retention controlled)
- [x] Define which public/storefront operations remain visible during subscription suspension. (browsable storefront, commerce writes denied by policy)
- [x] Prevent destructive deletion while legal/financial retention applies. (90-day closure retention gate with explicit audited override)
- [ ] Add export-before-closure workflow if required.

## 7.4 Provisioning operations UI

All surfaces live in the ferio-platform-admin console:

- [x] Platform Admin organization list. (`/organizations` directory with create form)
- [x] Organization detail. (`/organizations/[id]`: subscription, usage, domains, database, members)
- [x] Provisioning progress timeline. (per-run step statuses on the detail page)
- [x] Retry failed provisioning step. ("Run provisioning" drives the idempotent resumable orchestrator — replay continues from the first incomplete step)
- [x] Tenant DB health/readiness. (detail DB card + `/database-health` fleet view)
- [x] Domain status. (domains table with type/status/primary)
- [x] Owner/membership status. (platform metadata member roster)
- [x] Schema version. (per-database schemaVersion vs canonical head)
- [x] Safe operational diagnostics without DB secrets. (registry views are credential-free by construction)
- [x] Race-safe provisioning idempotency. (unique-key races re-read and resume or return the winning run; cross-organization key reuse fails with a stable conflict code)

### MT-4 gate

- [x] A new organization can be created from Platform Admin and reach a working isolated storefront/admin environment without manual SQL. (`OrganizationsService` creates the control-plane owner membership, while the resumable `ProvisioningService` reserves the domain, invokes the `TENANT_DB_PROVISIONER`, registers the database, applies canonical migrations, seeds the tenant baseline, verifies readiness, and activates the organization. The default local executor is automated; production managed-provider selection remains an infrastructure decision.)
- [x] Replaying provisioning is idempotent. (active subdomain, registered tenant database, and already-active organization state are safely reused on step replay)
- [x] Failed provisioning is diagnosable and recoverable. (Provisioning timeline, durable step/error records, idempotent replay, and the partial-failure runbook are available.)

---

# 8. Release MT-5 — Domain, Subdomain, and Storefront Routing

## 8.1 Default tenant subdomains

- [x] Define canonical hostname format, e.g. `{tenant}.ferio...`. (`PLATFORM_PUBLIC_DOMAIN` + slug; enforced in DomainsService)
- [ ] **PARTIAL:** Configure wildcard DNS. (Decision made: *.ferio.com → storefront infrastructure, PO-007/008; DNS record creation itself is an ops task on the production domain)
- [ ] Configure wildcard TLS/certificate strategy.
- [x] Configure local-development tenant-domain strategy. (`TENANT_DEV_HOST_MAP` maps browser hosts such as `localhost:3000` to registered tenant domains without changing production routing.)
- [ ] Add canonical redirect rules.
- [x] Add reserved subdomain list (`www`, `admin`, `api`, `app`, etc.). (`RESERVED_SUBDOMAINS`)
- [x] Prevent organization slugs from colliding with reserved/system routes. (`OrganizationsService` rejects the canonical reserved subdomain set before opening the control-plane transaction.)
- [x] Ensure storefront SSR/server requests resolve tenant before fetching tenant data. (Customer Web root layout gates rendering on backend `/tenancy/status`; all server-side BFF fetches forward `x-forwarded-host` via the instrumentation-registered provider)
- [x] Make metadata/SEO tenant-aware. (Customer Web `generateMetadata()` resolves the trusted tenant before reading tenant-local store settings, emits tenant-specific title/description, and returns `noindex` metadata for non-active or unknown hosts; sitemap/robots apply the same host/status boundary.)
- [x] Make sitemap/robots tenant-aware. (Customer Web resolves tenant status first, derives public URLs from the forwarded host, and disables indexing for inactive/unknown stores.)
- [x] Make tenant branding cache-aware. (Store configuration uses `no-store`; server-side API requests forward the original storefront host, preventing shared branding cache reuse.)

## 8.2 Custom domains — P1 / plan-gated

- [ ] **BLOCKED:** Select DNS/TLS automation strategy/provider.
- [x] Add custom-domain request. (`POST /platform/organizations/:organizationId/domains/custom` is permission-protected, plan-gated, normalized, and audited.)
- [x] Generate ownership verification challenge. (The same route returns an ownership token while keeping the domain `PENDING_VERIFICATION`.)
- [ ] Verify DNS.
- [ ] Verify TLS readiness.
- [x] Activate only after verification. (`POST /platform/organizations/:organizationId/domains/:domainId/verify` requires the organization-scoped challenge before activation.)
- [x] Support primary/canonical domain. (The organization-scoped primary route rejects inactive domains and atomically clears the previous primary.)
- [x] Support domain removal. (The organization-scoped disable route revokes routing and invalidates the hostname cache.)
- [x] Prevent stale domain takeover/reassignment. (Unique hostname ownership, disabled-domain invalidation, and organization-scoped mutation routes prevent reuse through stale state.)
- [x] Audit domain changes. (Reservation, request, verification, activation, disable, and cache invalidation emit bounded platform audit events.)
- [x] Entitlement-gate custom domains by plan. (`DomainsService.addCustomDomain` evaluates the organization subscription before creating a pending verification record and returns stable denial codes.)

## 8.3 Tenant-aware frontend state

- [x] Unknown store page.
- [x] Provisioning/not-ready page.
- [x] Suspended store page according to approved business policy.
- [x] Domain verification pending state. (Custom domains are created as `PENDING_VERIFICATION`, remain unresolvable until the ownership token matches, and expose pending status in platform domain diagnostics.)
- [x] Tenant branding load failure fallback that does not display another tenant's branding. (Unavailable hosts render the dedicated tenant state page; active-store fetch failures use only the static application fallback and never another host's response.)
- [x] Tenant-specific support contacts/policies. (Tenant-local commerce settings provide support phone/email and terms, privacy, and return-policy URLs to Customer Web.)

### MT-5 gate

- [ ] Tenant A and tenant B render different storefronts/data/settings on distinct hosts.
- [ ] Cache/CDN behavior cannot leak branding/catalog/settings between hosts.
- [x] Unknown and removed domains are safe. (Customer Web renders a dedicated unavailable state and disables indexing; the tenant resolver fails closed for unknown, disabled, closure-pending, closed, archived, and non-active domains.)

---

# 9. Release MT-6 — Plans, Subscriptions, Entitlements, Usage, and SaaS Billing

## 9.1 Plans and entitlements

- [x] Define initial plan catalog. (PO-001: Starter/Business/Pro/Enterprise + internal, seeded idempotently via `PlatformPlanSeedService`)
- [x] Approve exact plan names/prices/billing intervals. (names+intervals per PO-001/003; prices pilot-dependent — amountMinor seeded 0)
- [x] Approve free/trial policy. (14-day trial, no card; INTERNAL plan for Ferio tenants — PO-002)
- [x] Define feature entitlements. (catalog encodes custom_domain/advanced_reports/crm/campaigns/basic_reports etc.)
- [x] Define usage limits.
- [x] Define staff/user limits. (staff_seats 2/10/30/negotiated)
- [x] Define product/SKU limits if applicable. (products_max 500/5000/25000)
- [x] Define order/GMV limits if applicable. (Owner: NO GMV/order-volume limit initially — resource/feature limits only, so successful tenants are never penalized for sales; plan seed already ships orders_per_month as unlimited metering)
- [x] Define custom-domain entitlement.
- [x] Define advanced reports/CRM/marketing entitlement.
- [x] Define warehouse entitlement. (warehouses_max 1/3/10 — enforcement lands with multi-warehouse support)
- [x] Define integration/provider entitlement if applicable. (`online_payments` gates tenant payment-provider enablement and `couriers_basic` gates tenant courier activation through `PlanGateService`; legacy single-tenant mode remains outside tenant plan evaluation.)
- [x] Store entitlement evaluation server-side. (`EntitlementsService.evaluate` is the single control-plane evaluator; catalog, orders, and staff invitations call it before monetizable work.)
- [x] Do not rely on hidden/disabled frontend controls for enforcement. (The three Release MT-6 hooks enforce limits in backend services and return stable denial codes.)
- [x] Add owner-visible current plan and usage. (`GET /tenancy/my-plan` returns the active plan, entitlements, and live usage for the Tenant Admin Plan Usage card.)
- [x] Add upgrade-required errors with stable machine codes. (`ENTITLEMENT_NOT_FOUND`, `FEATURE_DISABLED`, `PLAN_LIMIT_REACHED`, and `SUBSCRIPTION_INACTIVE` are returned by server-side gates.)

## 9.2 Subscription lifecycle

- [x] Implement trialing if approved. (startTrial, default 14 days per PO-002)
- [x] Implement active.
- [x] Implement past-due/grace period if approved. (7-day window from latest PAST_DUE event, PO-004 — unit-tested incl. override)
- [x] Implement suspended/restricted. (checkout denial CHECKOUT_DISABLED_SUSPENDED per PO-005; storefront stays browsable)
- [x] Implement cancelled/non-renewing.
- [x] Implement reactivation. (PAST_DUE/SUSPENDED/CANCELLED → ACTIVE)
- [x] Preserve tenant data across non-destructive subscription state changes. (plan-limit lifecycle integration spec: every historical order survives an upgrade AND a downgrade byte-for-byte)
- [x] Define storefront behavior when subscription is overdue. (during `PAST_DUE` grace, trusted tenant resolution keeps the storefront browsable; suspension remains the explicit commerce-mutation restriction)
- [x] Define Tenant Admin behavior when subscription is overdue. (`GET /tenancy/my-plan` remains reachable to an active tenant member and returns `PAST_DUE`, current-period recovery metadata, usage, limits, and active domains)
- [x] Keep billing lifecycle separate from organization/database lifecycle.

## 9.3 SaaS billing

- [x] Build platform billing adapter interface.
- [x] Approve SaaS subscription payment provider(s). (PO-006: SSLCOMMERZ first, abstraction preserved)
- [x] Store platform payment attempts in control plane.
- [x] Add invoices/receipts. (control-plane invoice history is available to Platform Admin and `GET /platform/billing/invoices/:id/receipt` returns a bounded receipt projection only after payment succeeds; raw provider payloads and tenant commerce ledgers remain excluded)
- [x] Add webhook verification/idempotency. (server-side val_id validation; single-transition INITIATED→SUCCEEDED/FAILED; duplicates absorbed)
- [ ] **PARTIAL:** Add retry/recovery. (failed sessions recorded with reasons and can be re-initiated as fresh attempts; automated recovery sweep pending)
- [x] Add billing history.
- [x] Add manual/admin adjustment workflow with audit if required. (Platform Admin invoice creation and hosted payment initiation require `saas_billing:write` plus a bounded operator reason, persist only in the control plane, and emit actor/reason audit events.)
- [x] Never write SaaS subscription payments into tenant `Payment`, `Wallet`, COD, refund, or settlement records. (`PlatformBillingService` depends only on the control-plane client/audit boundary; `architecture:check` now rejects tenant-plane imports or tenant database access in this service.)

## 9.4 Usage metering

- [x] Define authoritative usage counters. (`src/platform/services/usage-metrics.registry.ts`: orders_per_month · products_max · staff_seats — keys match plan entitlement featureKeys)
- [x] Decide real-time vs periodic aggregation by metric. (encoded per metric in the registry: `orders_per_month` increments in real time at the monetizable event; derived metrics recount from facts)
- [x] Add idempotent usage updates. (atomic upsert on organizationId+metric+periodKey — concurrent increments cannot lose counts)
- [x] Add reconciliation of counters against tenant DB facts. (`UsageReconciliationService` recounts orders/catalog from the tenant database and seats from control-plane memberships, corrects drift, emits drift warnings + `usage_reconciliation_drift` counters; fleet-safe `reconcileAllReady`)
- [x] Add warning thresholds. (per-metric fractions in the registry; `UsageService.increment` fires `usage_warning_threshold_crossed` exactly once per boundary crossing — structured warn + counter, never fails the business write)
- [x] Add plan-limit denial behavior. (`EntitlementsService.evaluate` enforces server-side with stable codes; live hooks on order placement, product creation, staff invitations)
- [x] Add usage reset behavior per billing period where applicable. (counters are periodKey-scoped `YYYY-MM` UTC — new billing periods start empty automatically; registry documents each metric's reset policy)
- [x] Add Platform Admin usage view. (`GET /platform/organizations/:id/usage` — recorded counters vs plan limits with warning flags; `POST …/usage/reconcile` runs an audited correction pass)
- [x] Add Tenant Owner usage view. (`GET /tenancy/my-plan` returns current plan, entitlement limits and live usage — consumed by the admin dashboard PlanUsageCard)

## 9.5 Entitlement test matrix

- [x] Plan A cannot use Plan B-only feature. (entitlement matrix suite)
- [x] Upgrade unlocks capability without tenant DB migration where possible. (changePlan swaps planId only — covered)
- [x] Downgrade does not destroy historical data. (The CI-gated `test/plan-limit-lifecycle.integration-spec.ts` upgrades and downgrades the plan, rechecks limits, and verifies historical orders survive byte-for-byte.)
- [x] Limit exceeded is enforced concurrently. (evaluate() limit+usage semantics unit-tested; atomic counters in UsageService)
- [x] Suspended subscription blocks only approved capabilities.
- [x] Internal/free entitlement is explicit and audited. (`SubscriptionsService.startInternal()` requires the seeded `internal` plan, creates an ACTIVE subscription, and records `SUBSCRIPTION_INTERNAL_STARTED` with actor and plan evidence.)

### MT-6 gate

- [x] One test tenant can subscribe/activate, hit a plan limit, upgrade, and unlock the capability. (subscription/trial activation covered by the subscriptions unit suite; `test/plan-limit-lifecycle.integration-spec.ts` proves the full enforcement loop against REAL PostgreSQL — placement succeeds under limit, third order denied server-side with PLAN_LIMIT_REACHED and zero partial state, upgrade unlocks without touching tenant rows, downgrade blocks again)
- [x] SaaS billing is financially and technically isolated from customer commerce billing. (Control-plane-only billing tests and the automated platform-billing import boundary prevent SaaS records from crossing into tenant commerce ledgers.)

---

# 10. Release MT-7 — Convert Existing Commerce Modules to Tenant-Safe Operation

This is the largest migration slice. Existing feature behavior should remain stable; the primary change is isolation, tenant configuration, and entitlement enforcement.

## 10.1 Catalog, brands, product conditions, Hero Showcase

- [x] Existing catalog/product/variant/inventory foundations exist.
- [x] Existing `NEW` / `SECOND_HAND` condition support exists.
- [x] Existing managed brands exist.
- [x] Existing Hero Showcase capability exists.
- [x] Route every catalog read/write through tenant DB context. (entire `CatalogService` — all 17 prisma-touching methods including admin writes, inventory views and adjustments — resolves via the tenant-aware `db()` helper; explicit legacy fallback outside resolved requests)
- [x] Make brand slug uniqueness tenant-local. (automatic under database-per-tenant; identical slugs proven coexisting across two bootstrapped databases)
- [x] Make Hero content tenant-local. (Public settings/hero reads forward the resolved storefront host and the backend settings service reads the tenant client.)
- [x] Make catalog search/filter cache tenant-aware. (catalog reads resolve per tenant; no shared cache layer exists to leak across)
- [x] Tenant-scope product media object keys/metadata. (`R2Strategy` derives every product/media key from the trusted organization prefix; storage controller tests reject foreign prefixes before presigning.)
- [x] Prove tenant A unpublished/product IDs cannot be queried from tenant B. (`tenant-bootstrap.integration-spec.ts`: identical product IDs/slugs seeded into two real PostgreSQL databases; A publishes, B stays draft; publish-filtered read returns 1 in A, 0 in B)
- [x] Prove storefront SEO/catalog caches cannot cross tenants. (Customer Web forwards the original host on server fetches, derives sitemap URLs from that host, and emits no inactive/unknown tenant URLs; catalog/settings reads remain tenant-routed.)

## 10.2 Inventory

- [x] Stock movements/reservations/concurrency foundations exist.
- [x] Move inventory transactions behind tenant client. (adjustment/movement flows inside `CatalogService` swept; reservation consumption inside `OrderService` transactions)
- [x] Tenant-scope reconciliation jobs and idempotency keys. (scheduled reconciliation fans out with organization context; manual runs require tenant context and organization-prefixed job IDs, while the reconciliation integration suite proves duplicate idempotency keys are absorbed.)
- [x] Tenant-scope low-stock alerts. (`getInventory` low-stock computation resolves through the tenant client)
- [x] Tenant-scope exports. (The available orders export is tenant-routed, bounded, permission-masked, and covered by two-tenant evidence; customer/media export surfaces are outside the implemented Release 1 export contract.)
- [x] Preserve finite-stock concurrency guarantees independently per tenant. (serializable confirmation transactions execute on the resolved tenant client — same mechanism proven under concurrency)
- [x] Validate same SKU can exist independently across tenant databases. (bootstrap integration suite proves identical identifiers coexist)

## 10.3 Cart, saved carts, sharing, reorder, checkout

- [x] Persistent guest cart exists.
- [x] Saved/shareable cart and reorder capabilities are approved/developed baseline.
- [x] Checkout quantity/variant editing and order note exist.
- [x] Bind guest-cart identity to resolved tenant. (`CartService` resolves through the tenant client; opaque tokens are unique per database by construction)
- [x] Namespace cart cookies/storage where required. (cookies are set without a Domain attribute — host-only by browser semantics, so each storefront subdomain holds its own cart cookie automatically)
- [x] Bind saved-cart share tokens to one tenant.
- [x] Prevent shared token from directly resolving private records in another tenant. (SavedCart rows live inside each tenant database)
- [x] Tenant-scope cart merge.
- [x] Tenant-scope coupon validation. (deterministic coupon evaluation executes within the swept checkout flow)
- [x] Tenant-scope delivery zones/fees. (`getDeliveryZones`/zone CRUD resolve through the tenant client)
- [x] Tenant-scope checkout settings/support contacts. (`getPaymentOptions`/`getSettings` resolve per tenant via CommerceSettingsService)
- [x] Prove order history reorder ownership + tenant checks. (`cart.reorder-ownership.spec.ts` exercises the same order ID under two trusted tenant contexts and proves each tenant queries only its own database; the service also requires the caller's linked customer profile.)

## 10.4 Customers, addresses, identity, notifications

- [x] Customer profile/address/order-history foundations exist.
- [x] Private notification inbox exists.
- [x] Define customer identity tenancy policy. (PO-015: tenant-local for Release 1)
- [x] Tenant-scope customer profile/history.
- [x] Tenant-scope addresses.
- [x] Tenant-scope notification inbox. (`CustomerNotificationsService` resolves through the tenant client; BullMQ-side dispatch resolution lands with MT-8)
- [x] Tenant-scope abandoned-cart eligibility. (eligibility query resolves through the tenant client inside swept CartService)
- [x] Prevent customer search in Tenant Admin from crossing databases. (`CustomersService` swept)
- [x] Tenant-scope analytics/customer metrics. (`CustomersService` calculates totals, delivered spend, cancellation, return, and RTO metrics through the resolved tenant client; two-tenant evidence covers overlapping customer IDs)

## 10.5 Orders and COD

- [x] Idempotent orders and lifecycle state rules exist.
- [x] Tenant-scope order reference generation/prefix. (`OrderService` resolves through the tenant client; references are unique per database by construction)
- [x] Tenant-scope idempotency keys.
- [x] Tenant-scope order history and audit. (audit rows written inside the same tenant transaction)
- [x] Tenant-scope COD policy.
- [x] Tenant-scope confirmation queues.
- [x] Tenant-scope public/signed tracking.
- [x] Prove same human-readable reference/prefix cannot cause cross-tenant lookup. (`order-reference.tenant-isolation.spec.ts` runs the same reference and phone through two trusted tenant contexts and proves each lookup uses only its resolved tenant database.)

## 10.6 Commerce payments

- [x] Provider-neutral prepaid architecture exists.
- [x] Move payment provider configuration to tenant-secure integration configuration. (`CommercePaymentProviderConfig` is tenant-local and managed through the permission-protected Tenant Admin payment route; responses expose only bounded readiness.)
- [x] Tenant-scope provider credentials/secrets. (Payment credentials are AES-256-GCM encrypted in the tenant database, injected only inside trusted tenant context, and never returned or written to audit values.)
- [x] Tenant-scope merchant references/idempotency. (attempts/callbacks resolve per tenant database; unique references scoped by construction)
- [x] Resolve webhook/callback tenant without trusting customer browser input. (HMAC-signed `cbt` token minted at initiation and embedded in gateway callback URLs; verified timing-safe server-side before any mutation — forgery fails closed with PAYMENT_CALLBACK_TENANT_INVALID)
- [x] Define provider account mapping to tenant. (`CommercePaymentProviderConfig.provider` is unique within each tenant database; enabled runtime calls resolve that tenant-local record before gateway invocation.)
- [x] Verify callback cannot mutate another tenant's payment. (token binds organization; processing runs inside that tenant's context/database — cross-tenant mutation has no resolution path)
- [x] Tenant-scope payment recovery/sweeps. (`enqueueDue` fans out per READY tenant; expiry processor resolves envelopes via forOrganization)
- [x] Tenant-scope reconciliation. (scheduled scans fan out per READY tenant with isolated failure evidence)
- [x] Preserve platform SaaS billing separation. (SaasInvoice/SaasPaymentAttempt live exclusively in the control plane; no code path bridges them into tenant commerce records)

## 10.7 Wallet

- [x] Customer wallet and immutable ledger foundation exists.
- [x] Make wallet strictly tenant-local. (`WalletService` resolves through the tenant client — balances and ledgers live inside each tenant database)
- [x] Prohibit cross-tenant wallet balance portability. (no cross-database path exists by construction)
- [x] Tenant-scope top-up evidence/review. (`requestTopUp`/`reviewTopUp` resolve per tenant; identical top-up idempotency keys succeed independently in two tenants)
- [x] Tenant-scope wallet checkout/refunds. (`debitOrder`/`refundCancelledOrder` execute inside the caller's resolved-tenant transaction)
- [x] Prove tenant A customer identifier cannot debit tenant B wallet. (`test/wallet-isolation.integration-spec.ts`: identical user/customer/order IDs seeded into two REAL PostgreSQL databases; A's debit consumes only A; replaying A's order refund against B fails closed with ConflictException)
- [x] Add tenant-aware financial reconciliation tests. (same suite verifies per-tenant ledger visibility, exact transaction lists, and lifetime credit totals)

## 10.8 Fulfillment, courier, delivery, rider

- [x] Fulfillment/courier foundation exists.
- [x] Rider application/assignment/location/live map exists.
- [x] Tenant-scope fulfillment queues.
- [x] Tenant-scope courier integrations and credentials. (`CourierProviderConfig` is tenant-local, credentials are AES-256-GCM encrypted, adapter calls run inside trusted tenant credential scope, and the guarded provider-config route never returns secrets.)
- [x] Tenant-scope shipment callbacks/polls. (`ShippingService` resolves through the tenant client; callback tenant binding rides the HMAC cbt token)
- [x] Tenant-scope rider application.
- [x] Tenant-scope rider personnel approval.
- [x] Tenant-scope assignment.
- [x] Tenant-scope duty state.
- [x] Tenant-scope GPS history.
- [x] Tenant-scope WebSocket/live-map rooms. (SocketGateway joins tenant-bound admins to `delivery-live-map` and emits rider locations only through the ambient organization room; existing conversations, tasks, admin, and notification rooms remain org-scoped.)
- [x] Tenant-scope location-history clearing.
- [x] Prevent rider session from tenant A acting on tenant B order. (`DeliveryPersonnelService` resolves through the tenant client; assigned-order lookup is scoped to the same database — cross-tenant action has no resolution path)
- [x] Preserve COD staff-confirmation rule per tenant. (COD policy is read from the resolved tenant database, confirmation transitions are explicit, and the two-tenant vertical suite proves identical COD orders and confirmation stock reservations remain isolated.)
- [x] Add location retention policy. (`RetentionSweepService` prunes tenant-local `DeliveryLocationHistory` after the configurable `RETENTION_GPS_DAYS` window, defaulting to the approved 90-day policy; retention tests cover the rule and tenant context.)

## 10.9 Returns, refunds, RTO, settlement, reconciliation

- [x] Existing post-purchase/reconciliation foundations exist.
- [x] Tenant-scope every return/refund/RTO/settlement record. (`ReturnsService`, `RefundsService`, `RtoService`, `SettlementsService`, and reconciliation resolve through the tenant client; two-tenant read-isolation suites cover return, refund, RTO, and settlement identifiers)
- [x] Tenant-scope scheduled reconciliation runs.
- [x] Tenant-scope settlement imports and evidence. (`SettlementImportsService` resolves every import/classify/persist/claim path through the tenant client)
- [x] Tenant-scope BullMQ job IDs. (tenant-bearing queue producers prefix IDs with `t:{organizationId}:`; reconciliation, courier, transactional-message, and payment-recovery tests cover collision-free IDs while platform-wide sweep jobs remain intentionally global)
- [x] Tenant-scope manual retry actions. (Reconciliation, courier callback, and transactional-message retries require resolved tenant context, stamp the trusted organization in job data, and use tenant-scoped job IDs)
- [x] Prove failure in tenant A reconciliation does not block tenant B jobs. (reconciliation scans fan out per tenant with isolated failure evidence)

### 10.1A Settings and storefront branding (pulled forward from §10.12 scope)

- [x] Tenant-scope public settings reads (`getSettingsByType` → Hero Showcase etc.).
- [x] Tenant-scope store configuration branding (`CommerceSettingsService.get/getPublic`) — store name, contacts, feature flags, policy URLs now resolve per tenant.
- [x] Settings Redis cache keys carry the resolved organization identity (`settings:{orgId}:{type}`), eliminating the cross-tenant cache-collision hazard flagged in §11.1 before it could ship.

## 10.10 Services, warranty, reviews, product requests, pickup

- [x] Existing service booking exists.
- [x] Existing warranty workflow exists.
- [x] Existing review/banner workflow exists.
- [x] Existing product-request workflow exists.
- [x] Existing store pickup/outlet workflow exists.
- [x] Tenant-scope all records and settings. (`ServiceBookingService`, `WarrantyService`, `ProductContentService` (reviews/banners), `ProductRequestService`, `StoreLocationsService` all resolve through the tenant client with explicit legacy fallback)
- [x] Tenant-scope media/evidence. (Warranty evidence now uses the shared R2 `STORAGE_STRATEGY`; `R2Strategy` derives private `tenants/{organizationId}/...` keys from trusted tenant context.)
- [x] Tenant-scope outlet inventory/pickup configuration. (`StoreLocationsService` resolves public stores and availability checks through the tenant client; identical store identifiers are read from separate tenant databases in isolation coverage)
- [x] Tenant-scope moderation and Admin queues. (`product-content.controller.ts` applies tenant membership and permission guards to review/banner moderation routes, while `ProductContentService` resolves all moderation records through the tenant database.)
- [x] Add cross-tenant ownership tests. (two-tenant suites cover returns, refunds, RTO, settlements, store pickup locations, and storefront analytics with overlapping lookup identifiers)

## 10.11 Chat and real-time communication

- [x] Chat foundation exists.
- [x] Tenant-scope socket tickets. (Authenticated ticket issuance now requires `TenantMembershipGuard`; the signed ticket carries only the resolved organization context.)
- [x] Tenant-scope rooms/channels. (conversations, tasks, admin role rooms, and every server-side emission path are org-prefixed; task-room Redis presence lists are scoped by the same names)
- [x] Tenant-scope conversation lookup/history. (chat REST swept; realtime rooms namespaced in MT-8)
- [ ] Tenant-scope quick replies/folders if configurable.
- [x] Reject cross-tenant socket subscriptions. (org-scoped rooms unreachable from foreign tickets)
- [x] Add multi-client E2E with two tenants active simultaneously. (`test/socket-isolation.integration-spec.ts`: four live WebSocket clients — same-userId admins of org-a/org-b plus org-bound guests — over a real socket.io server; connection rooms, tenant-scoped notifications and chat relay proven isolated on the wire; foreign guest join denied)

## 10.12 Reports, analytics, purchase activity, audit, settings, health

- [x] Existing reports/audit/settings/health foundations exist.
- [x] Tenant-scope report queries. (`ReportsService` overview and orders export resolve through the trusted tenant client; two-tenant report evidence covers overlapping order IDs)
- [x] Tenant-scope exports. (The available orders export is tenant-routed, bounded, permission-masked, and covered by two-tenant evidence)
- [x] Tenant-scope purchase activity/social proof.
- [x] Clarify that "Global Order History" means tenant-global only. (The customer history view is global within one tenant database, never across organizations)
- [x] Tenant-scope feature flags/settings. (`SettingsService` — all settings CRUD/pagination/delete paths resolve through the tenant client; tenant commerce flags remain tenant-local.)
- [x] Separate platform feature flags from tenant feature flags. (`PlatformFeatureFlagsService` persists only through the control-plane `PlatformPrismaService`; `GET /platform/feature-flags` and `PUT /platform/feature-flags/:key` use dedicated SUPERADMIN permissions and append platform audit records.)
- [x] Tenant-scope operations health while keeping platform health separate. (tenant `/health` remains in `OperationsHealthModule`; control-plane `/platform/system-health` is independently permission-protected and never uses tenant DB health as platform authorization)
- [x] Ensure Platform Admin aggregate metrics use approved metadata/aggregation and do not expose tenant PII by default. (`GET /platform/dashboard` reads control-plane group counts only; regression coverage rejects organization IDs, customer/order fields, and contact data)
- [x] Tenant-scope audit logs. (Audit writes automatically include trusted organization, tenant database, domain, hostname, and correlation context)
- [x] Add support-access audit linking when Platform Support views tenant data. (`SupportAccessService.assertActive` requires the exact organization/operator grant and records `SUPPORT_ACCESS_USED`; audit failure blocks the access request.)

### 10.4A Transactional messaging outbox (pulled forward)

- [x] `TransactionalMessagingService` (outbox, templates, attempts evidence) resolves through the tenant client — messages can never be orphaned from the tenant orders they reference.
- [x] Transactional-message dispatch + payment-expiry sweeps now fan out per READY/ACTIVE tenant (`TenantFanoutService`), processors resolve envelopes via `forOrganization`. Remaining flag-on blockers shrink to: courier polling/callback-retry sweeps, reconciliation schedule, socket room namespacing (§11.3), and integration credential vault (§11.5).

### 10.13 Commerce service sweep inventory (completed)

All commerce-plane services now resolve through `TenantDbService` (`db()` helper + `@Optional() tenantDb` injection; legacy fallback outside resolved requests):

Catalog, Cart, Checkout, Order, Shipping (+ CourierRouter), ShippingPolling, CommercePayments, Wallet, CustomerNotifications, Customers, **CustomerAccount**, **StaffAccess**, DeliveryPersonnel, Reconciliation, Refunds, Reports, Returns, RTO, Settlements (**+ SettlementImports**), Settings (CommerceSettings **+ admin SettingsService**), StorefrontAnalytics, PurchaseActivity, TransactionalMessaging, Chatting (Conversation + Message), ServiceBooking, Warranty, ProductContent (reviews/banners), ProductRequest, StoreLocations.

Intentionally NOT swept (documented boundaries): `auth`/`two-factor`/`oauthAccount`/`userDevices`/`userProfile`/`user` (identity plane — PO-015 auth-migration decision), `operations-health` (platform-scoped by design), `audit.service` (writes into whatever client the caller passes — per-DB by construction). Socket identity/room services were subsequently swept with MT-8 WebSocket isolation; org propagation rides the socket ticket.

### MT-7 gate

- [x] Every existing protected commerce controller/service has a documented tenant boundary. (The MT-7 sweep inventory lists every commerce service and the architecture test enforces `TenantMembershipGuard` on protected tenant-admin controllers; identity-plane exceptions remain explicitly documented.)
- [ ] Automated tests cover at least two tenants for every high-risk financial/identity/real-time module.
- [x] No legacy single-store global setting or default tenant DB remains on production request paths. (Production configuration rejects legacy tenancy mode, and tenant-scoped services fail closed before using their explicit compatibility client when the tenant boundary is enabled.)

---

# 11. Release MT-8 — Redis, BullMQ, WebSockets, Cache, Files, and External Integrations

## 11.1 Redis/cache namespace

- [ ] Inventory all Redis keys.
- [x] Prefix tenant-scoped keys with trusted tenant identity. Full inventory complete:
      settings cache (org-keyed, MT-7), OTP (scopedRedisKey, MT-8),
      user profile/stats caches (this pass). Auth refresh-token blacklist is
      INTENTIONALLY platform-scoped — tokens hash-opaque and sessions remain
      in the legacy identity realm until the auth migration decision lands.
- [ ] Tenant-scope session adjunct data where applicable.
- [x] Tenant-scope OTP/rate-limit keys where business semantics require it. (OTP scoped; rate limits intentionally IP-global as abuse control, not business data)
- [x] Tenant-scope catalog/settings caches. (Settings cache keys include the resolved organization; catalog reads have no shared cache layer and remain tenant-routed, so neither path can reuse another tenant's catalog/settings entry.)
- [x] Tenant-scope idempotency keys.
- [ ] Tenant-scope distributed locks.
- [x] Add collision tests using identical record IDs in two tenants. (`src/tenancy/redis-collision.spec.ts`: scopedRedisKey, OTP keys, and settings cache keys all diverge per organization for identical identifiers; legacy key shape preserved outside contexts)

## 11.2 BullMQ

- [x] Inventory every queue. (`libs/queue/src/bullmq.constants.ts`, BullMQ registration, feature-owned processors, platform migration processor, and retention processor enumerate the active queue set.)
- [x] Add tenant ID to trusted job envelope. (scheduled and operator-triggered shipping, transactional dispatch, and payment expiry jobs carry `organizationId` from the resolved context; type-extended)
- [x] Validate tenant registry record before job DB access.
- [x] Resolve tenant DB inside worker from control plane. (`TenantFanoutService.forOrganization` → registry → bounded manager → immutable context)
- [x] Tenant-scope job IDs/deduplication keys. (`t:{orgId}:...` prefixes)
- [x] Tenant-scope scheduled jobs. (courier polling, courier callback-retry, reconciliation scans — all fan out per READY tenant; scheduled and manual retries carry org envelopes captured at enqueue time)
- [x] Prevent a poisoned/forged job from selecting arbitrary DB URL. (workers only accept organizationId and resolve via registry — never connection strings)
- [ ] **PARTIAL:** Add dead-letter/failure evidence with tenant context. (fan-out failures recorded per-org in sweep outcomes + structured logs; BullMQ dead-letter retention policy pending)
- [ ] **PARTIAL:** Add per-tenant operational metrics where useful. (fanout outcomes expose processed/tenantFailures per sweep; durable metrics storage remains §22 work)
- [x] Prove one tenant's failed jobs do not starve the entire queue. (`forEachTenant` isolates per-org failures with recorded evidence — unit-tested with an injected failing database)

## 11.3 WebSockets

- [x] Resolve tenant during socket authentication.
- [x] Bind socket ticket/session to tenant. (tickets minted inside tenant-resolved requests embed `organizationId`; `SocketUser` propagates it)
- [x] Prefix rooms with tenant identity. (`scopedSocketRoom` applied to personal/conversation/role/admin joins and message emissions; identical room IDs across tenants can never share a channel)
- [x] Tenant-scope Admin chat. (org-bound admin sockets join ONLY org-prefixed role/admin rooms at connection; the message relay broadcasts to sender-scoped admin rooms so one tenant's chats can never reach another's console; REST-initiated chat mutations via `emitToRoom` resolve the ambient tenant)
- [x] Tenant-scope rider live map. (rider location updates emit `rider-location-updated` to the tenant-scoped admin live-map room after the tenant-local persistence succeeds; the existing bounded map-read endpoint remains available as the recovery/read model.)
- [x] Tenant-scope customer notifications if realtime. (`emitNotificationToUser` / `emitUnreadCountUpdate` / `emitToUser` target ONLY the org-prefixed personal room inside a resolved context; raw rooms remain legacy-only since unbound sockets no longer coexist in them)
- [x] Reject room joins across tenant boundaries. (cross-tenant rooms are unreachable by construction — clients cannot learn another org's prefixed name from their own ticket)

## 11.4 Object/media storage

- [x] Select/complete production object storage strategy. (Owner #6: Cloudflare R2 via S3-compatible API; `R2Strategy` shipped with presigned access; production bucket credentials pending)
- [x] Namespace object keys by tenant. (every key routes through `tenantObjectKey()` -> `tenants/{organizationId}/…`; org comes from ambient server-side context, never client input)
- [x] Keep private evidence private. (R2 buckets are private-by-default; no public-read ACL anywhere in the strategy)
- [x] Use signed access where required. (presigned GET via @aws-sdk/s3-request-presigner, R2_PRESIGN_EXPIRES_SECONDS tunable, default 1h)
- [x] Prevent guessed tenant paths from returning objects. (org prefix derives from ambient TenantContext; a guessed path cannot name another tenant's namespace and objects are private regardless)
- [ ] Add lifecycle/retention rules. (bucket-level lifecycle config is an ops task on the R2 account)
- [ ] Add tenant export/deletion support. (wired to MT-12 closure/export flow)
- [ ] Add malware/content validation where required by upload type.

## 11.5 Tenant integrations

- [x] Credential vault boundary: **env-files approach accepted** (owner confirmed). AES-256-GCM encryption at rest + env-var master key satisfies PO-010 for current stage. KMS/Secret Manager migration deferred to production infrastructure.
- [x] Encrypt provider secrets. (Payment and courier credentials use AES-256-GCM envelopes before tenant-local persistence; the master key is required and length-validated, plaintext is never returned or logged, and readiness/audit output is bounded to non-secret metadata. KMS/Secret Manager ownership remains production-infrastructure work.)
- [x] Redact secrets from Admin/API/logs. (Tenant registry views omit credential ciphers, provider APIs expose bounded readiness rather than credentials, webhook headers are redacted, and platform/tenant health tests reject secret-bearing errors and payloads.)
- [x] Tenant-scope payment providers. (`CommercePaymentProviderConfig` is tenant-local, encrypted, and injected only inside the resolved tenant context.)
- [x] Tenant-scope courier providers. (`CourierProviderConfig` is tenant-local; all six courier adapters and readiness/recommendation/polling paths use tenant-scoped credentials with no cross-tenant process fallback.)
- [ ] Tenant-scope transactional messaging providers/templates.
- [ ] Tenant-scope Google/Meta integrations where later enabled.
- [x] Add credential rotation workflow. (Tenant payment and courier configuration replacement is an authenticated, permission-protected transaction: the new credential envelope is validated before activation, the previous ciphertext is atomically replaced, `credentialsRotatedAt` is recorded, and audit/API output contains only provider, enabled, key-name, readiness, and rotation-time metadata. External KMS/Secret Manager rotation remains production-infrastructure work.)
- [x] Add readiness/health without leaking secrets. (`OperationsHealthService` exposes bounded payment/courier readiness and launch blockers, while database/queue/provider failures are reduced to safe diagnostics; regression coverage rejects secret-bearing error output.)

### MT-8 gate

- [ ] Identical Redis/job/socket/object identifiers in two tenants cannot collide. (Redis/job/socket covered by collision spec + wire-level E2E; object storage remains BLOCKED)
- [x] Background and realtime paths meet the same isolation standard as HTTP. (BullMQ: fan-out per-org envelopes with failure-isolation unit proof + dead-letter evidence; WebSockets: wire-level two-tenant E2E proves scoped rooms, notifications and chat relay)

---

# 12. Release MT-9 — Ferio Platform Admin

## 12.1 Platform dashboard

- [x] Organization counts by lifecycle. (`GET /platform/dashboard`)
- [x] Active/trial/past-due/suspended subscription counts.
- [x] Provisioning failures.
- [x] Tenant migration fleet status. (`GET /platform/database-health` + Database Health console page: every registered tenant database vs the canonical migration-chain head, with behind-count summary)
- [x] Domain health. (Platform Admin `GET /platform/domain-health` reports credential-free per-domain status, organization status, and actionable routing issues; console page added.)
- [x] Tenant DB health. (fleet view surfaces registry status + schema version per tenant database)
- [x] Platform billing outcomes. (`GET /platform/billing/invoices` + `/billing/payment-attempts`; Billing console page with invoice/payment tables and PAID/OPEN states)
- [x] Usage/limit alerts. (`usage_warning_threshold_crossed` counter + structured warn exactly once per crossing; per-org Usage card on the console organization detail renders NEAR LIMIT states and a "Recount from facts" reconcile action)
- [x] Queue/system health. (`GET /platform/system-health` returns bounded control-plane queue probes and runtime status behind `platform_health:read`.)
- [x] Backup status. (`GET /platform/system-health` reports deployment-provided backup freshness/protection and restore verification without credentials.)
- [x] Security/support-access alerts. (`GET /platform/system-health` reports active support grants and bounded isolation-metric series; raw grant reasons and secrets are excluded.)

## 12.2 Organization management

- [x] Create organization. (console form + API; provisioning triggered from detail view)
- [x] View organization metadata.
- [x] View owner/members at platform metadata level.
- [x] View plan/subscription.
- [x] View domains.
- [x] View tenant DB registration/schema version.
- [x] View provisioning timeline. (`/organizations/:id/provisioning-runs` with per-step status)
- [x] Suspend/reactivate according to policy. (state-machine transitions from the console, audited)
- [x] Initiate closure/export according to policy. (OrgActions console: 'Start closure' captures an audited reason → CLOSURE_PENDING with all domains disabled; 'Finalize closure' retires the registry behind a retention-window confirmation)
- [x] Never show raw tenant DB password. (registry views are credential-free by construction)

## 12.3 Plan and billing administration

- [x] CRUD/version plans safely. (create + list in console; versioning model present)
- [x] Configure entitlements/limits. (`featureKey=limit` compiler in the console form)
- [x] View subscriptions. (`GET /platform/subscriptions` directory + Subscriptions console page)
- [x] View platform invoices/payment attempts. (Billing console page backed by the two billing endpoints)
- [x] Manual billing operations require explicit permission/reason/audit. (`saas_billing:write` plus 10–500 character reason DTOs; invoice creation and payment initiation record actor/reason audit events.)
- [x] Add internal/free entitlement state if approved. (approved PO-002 policy is implemented by the seeded `internal` plan and audited `SubscriptionsService.startInternal()` flow)
- [ ] Add tenant-specific override with expiry/reason if approved.

## 12.4 Tenant operations

- [x] Provisioning retry. (console "Run provisioning" action replays the resumable orchestrator; per-step timeline evidences recovery)

- [x] Tenant migration canary/batch control. (migration console and orchestrator accept a requested canary organization and bounded concurrency, then persist ordered per-tenant results before fleet rollout)
- [x] Persist and honor the requested migration canary organization. (`TenantMigrationRun.canaryOrganizationId` is stored in the platform plane and the orchestrator migrates that organization before the remaining ordered fleet)
- [x] Pause rollout. (Queued workers re-check the durable run status before touching any tenant database, so an operator pause wins races with already-enqueued jobs.)
- [x] Retry failed tenant. (failed result rows remain retryable; queued resume retries them while skipping successful tenants)
- [x] DB health probe. (`GET /platform/system-health` probes the control-plane database and exposes bounded pool metrics.)
- [x] Schema version drift view. (Database Health page highlights any tenant database behind the canonical head)
- [x] Backup evidence. (Platform system health exposes current/stale/missing backup and restore evidence from deployment metadata; it does not claim a backup provider integration.)
- [x] Restore workflow status. (Platform system health exposes bounded `restoreStatus` and `lastRestoreVerifiedAt` evidence; actual provider restore execution and live drills remain separate open controls.)
- [x] Domain verification diagnostics. (`GET /platform/domain-health` exposes credential-free domain status, organization status, verification failures, and actionable routing issues without returning verification tokens.)
- [x] Tenant cache invalidation where safe. (`POST /platform/organizations/:id/domain-cache/invalidate` enumerates control-plane hostnames, invokes the tenancy invalidation hook, and records bounded audit evidence; it never accepts cache keys or database URLs from the caller.)

## 12.5 Support access

- [x] Request support access. (API landed MT-1)
- [x] Require reason. (≥10 chars enforced server-side)
- [x] Require tenant authorization where policy demands it. (`SupportAccessService.assertActive` requires the exact organization and platform-user pairing; tenant data callers must provide the organization selected by the trusted support workflow.)
- [x] Set expiry. (5min–8h TTL clamp)
- [x] Restrict scope/permissions. (Support grants accept only bounded resource/action pairs, reject unknown or wildcard scopes, and fail closed when a required resource action is absent; write grants may satisfy read operations.)
- [x] Record every support action. (`SUPPORT_ACCESS_GRANTED`, `SUPPORT_ACCESS_USED`, and `SUPPORT_ACCESS_REVOKED` are append-only audit events; data access fails closed if the usage audit cannot be written)
- [x] Revoke immediately. (console revoke button + `revoke()` audit)
- [x] Display active support sessions prominently. (Platform Dashboard shows the active-grant count and the Support Access console lists active grants with organization/operator, scope, expiry, and immediate revoke action)

### MT-9 gate

- [x] Ferio operators can manage tenant lifecycle without direct DB shell access for normal operations. (Guarded Platform Admin organization, provisioning, migration, domain, closure, and health APIs are used by the console; no normal lifecycle action requires SQL shell access.)
- [x] Platform Admin is not an unrestricted universal tenant superuser. (Tenant membership rejects platform-realm principals by default; tenant data access requires an explicit, time-bound, organization/user-scoped support grant and audit event.)

---

# 13. Release MT-10 — Tenant Admin and Storefront SaaS Experience

## 13.1 Tenant owner onboarding

- [x] Invitation/first-login flow.
- [x] Organization/store setup wizard. (Tenant Admin dashboard Store Setup checklist combines validated settings, delivery-zone, payment, subscription, and domain readiness with deep links to the owning screens.)
- [x] Store identity. (tenant-scoped via CommerceSettings and surfaced in the Store Setup checklist card)
- [x] Logo/branding. (Tenant admins can update the tenant-local logo, address, social links, and approved theme preset through guarded CommerceSettings; the customer storefront renders the logo and public identity.)
- [x] Support contacts.
- [x] Currency/timezone. (CommerceSettings validation and the Store Setup checklist)
- [x] Order prefix. (CommerceSettings validation and the Store Setup checklist)
- [x] Delivery zones.
- [x] COD policy. (Tenant Admin orders exposes the tenant-local COD verification policy read/update flow; checkout and order confirmation consume the same tenant database policy, while the two-tenant vertical suite proves confirmation state remains isolated.)
- [x] Payment configuration. (Tenant Admin can replace encrypted SSLCommerz/aamarPay credentials, enable a provider only after required fields validate, and receive masked readiness.)
- [x] Courier configuration. (Tenant Admin can manage an allowlisted courier credential set through the guarded provider-config route; responses expose only enabled/configured status.)
- [x] Notification configuration. (Tenant Admin transactional-message templates are listed and edited through guarded tenant routes and the template service resolves through the tenant client; provider activation and credential tenancy remain separate open controls.)
- [x] Initial catalog/import guidance. (Store Setup checklist detects whether the tenant has a catalog product and links directly to the product creation flow.)
- [x] Subscription/plan summary. (tenant-scoped `GET /tenancy/my-plan` and the dashboard Plan & Usage card)
- [x] Usage/limit summary. (Tenant Admin Plan & Usage card renders tenant-scoped usage and limits, with unavailable-state handling and near-limit warnings.)
- [x] Domain status. (tenant-scoped `GET /tenancy/my-plan` returns active domains and the Store Setup checklist verifies an active primary domain)

## 13.2 Tenant Admin entitlement UX

- [x] Navigation hides or labels unavailable plan features. (Tenant Admin Sidebar consumes the tenant-scoped boolean entitlement map for presentation filtering while backend route/limit enforcement remains authoritative.)
- [x] Backend remains authoritative.
- [x] Upgrade CTA for plan-gated features. (Plan & Usage card links to the subscription settings surface with an explicit “Review plan or upgrade” action.)
- [x] Limit warnings before hard limits. (Plan & Usage card marks usage at or above 80% as `near limit` before server-side denial.)
- [x] Stable errors when limit reached. (`PLAN_LIMIT_REACHED` / `FEATURE_DISABLED` / `SUBSCRIPTION_INACTIVE` from EntitlementsService)
- [x] Downgraded tenant can still access historical records appropriately. (`SubscriptionsService.changePlan` changes only the control-plane subscription plan reference and never deletes tenant commerce records; the subscription regression test proves the non-destructive update, while tenant report/read services remain tenant-database routed.)
- [x] Suspended tenant gets approved read/write restrictions. (Global tenancy guard permits reads and authentication, and blocks non-read tenant mutations with `COMMERCE_MUTATION_DISABLED_SUSPENDED`; service-level guard remains available for defense in depth.)

## 13.3 Tenant branding

- [x] Tenant storefront logo. (The public tenant CommerceSettings contract exposes an HTTPS-only logo URL and the storefront header renders it with the tenant store name as alt text.)
- [x] Tenant name. (Customer Web reads the tenant-local commerce settings store name and uses it in the storefront shell and metadata.)
- [x] Hero Showcase. (Customer Web requests the tenant-scoped public Hero Showcase settings through the host-forwarding BFF path.)
- [x] Contact information. (Customer Web renders tenant-local support phone/email on checkout and the support page.)
- [x] Policies. (Customer Web renders tenant-local terms, privacy, and return-policy URLs from public commerce settings.)
- [x] Social links. (Tenant-local HTTPS-only Facebook, Instagram, and WhatsApp links are validated in the admin DTO and rendered in the storefront footer.)
- [x] Theme tokens only within approved customization boundary. (Tenant settings accept only the `default`, `warm`, or `cool` preset; the storefront maps those fixed values to bundled CSS variables and accepts no tenant-supplied CSS, tokens, or scripts.)
- [x] No tenant-supplied unsafe arbitrary script/CSS by default. (Commerce settings and public storefront contracts expose no arbitrary script or CSS injection fields; the current customization surface is limited to typed settings and static content routes.)
- [x] Cache invalidation after branding update. (Public commerce settings use `no-store`, and the server-side storefront request forwards the resolved host; branding updates therefore cannot remain in or reuse a shared tenant cache entry.)

## 13.4 Storefront tenant behavior

- [x] Tenant-aware catalog. (Server-side catalog reads forward the trusted storefront host and the backend routing tests prove tenant reads never fall back to the legacy database.)
- [x] Tenant-aware cart cookies/session. (Host-only storefront cookies plus tenant-local CartService/saved-cart/reorder routing prevent cart state and share tokens crossing hosts or databases.)
- [x] Tenant-aware auth/customer account. (Customer session cookies are host-only, BFF calls forward the resolved storefront host, tenant login tokens carry the resolved organization, and refresh rejects tokens whose organization differs from the current tenant context; auth regression coverage proves both invariants.)
- [x] Tenant-aware checkout/payment. (Checkout and payment attempts/callbacks resolve through the tenant database and callback organization binding; provider account configuration remains a separate open control.)
- [x] Tenant-aware tracking. (Tracking and storefront analytics read/write through the resolved tenant context; two-tenant analytics isolation coverage is present.)
- [x] Tenant-aware wallet. (Wallet balances, ledgers, top-ups, checkout debits, and refunds use the resolved tenant database with real two-database isolation evidence.)
- [x] Tenant-aware warranty/services/chat. (Warranty, service-booking, product-content, and chatting services are included in the tenant-service sweep; socket tickets and rooms carry trusted organization scope.)
- [x] Tenant-aware support information. (Support and checkout surfaces use tenant-local public commerce settings, with a safe empty-contact state.)
- [x] Tenant-aware SEO. (Metadata, sitemap, and robots use the resolved storefront host and disable indexing for non-active tenant states.)
- [x] Unknown/suspended domain states. (Customer Web replaces the storefront shell with explicit unknown, suspended, or unavailable states returned by the backend resolver.)

### 13.2A Server-side entitlement enforcement hooks (landed)

- [x] Order placement evaluates `orders_per_month` before work begins and meters usage post-commit (non-blocking; metering can never fail an order).
- [x] Product creation evaluates `products_max` against the tenant's own live catalog count.
- [x] All gates activate only inside a resolved tenant context — legacy mode unaffected — deny with stable machine codes, and fail closed when control-plane evaluation is unavailable.
- [x] Staff-seat hook on invitations. (`PLAN_GATE` + `ORG_MEMBERS_COUNTER` tokens; active-member count feeds the evaluation; over-limit invites throw `PLAN_LIMIT_REACHED`)

### MT-10 gate

- [ ] A business owner can receive a tenant, configure it, publish products, receive an order, fulfill it, and see only that business's data.
- [ ] A second tenant can perform the same flow concurrently with no shared state.

---

# 14. Release MT-11 — Tenant Migration Orchestration

Database-per-tenant requires fleet migration tooling before production tenant count grows.

## 14.1 Migration packaging

- [x] Define canonical tenant Prisma schema. (`prisma/schema.prisma` is built from the canonical tenant model sources and is distinct from `prisma/platform.prisma`)
- [x] Define canonical migration artifact/version. (`prisma/migrations` is validated and `TenantSchemaBootstrapper` reports the completed migration head as the tenant schema version)
- [x] Record expected schema version in control plane. (`TenantDatabase.schemaVersion` is stamped during provisioning and migration, and platform migration results retain from/to versions)
- [x] Make migration artifact immutable once released. (`prisma/migration-checksums.json` records SHA-256 digests for all 48 tenant and platform migration artifacts; `pnpm check:migrations` fails on changed, missing, or unlisted SQL.)
- [x] Add compatibility metadata if application version requires minimum schema version. (`TenantDatabase.schemaVersion` and migration result from/to versions are stamped and surfaced; the resolver fails closed with `TENANT_MIGRATION_REQUIRED` when a registry is incompatible.)
- [x] Separate control-plane migrations from tenant-plane migrations. (`prisma/platform-migrations` and `prisma/migrations` have independent PostgreSQL locks, validation, and deployment commands)

## 14.2 Migration orchestrator

- [x] Discover eligible tenant DBs. (READY + ACTIVE org, ordered)
- [x] Preflight tenant DB connectivity. (bootstrap opens a real connection; failures recorded per-tenant)
- [x] Verify current version.
- [x] Apply canary tenant migration.
- [x] Run post-migration health checks. (schemaVersion stamped; registry health recorded)
- [x] Roll out in bounded batches. (sequential batches sized by run concurrencyLimit)
- [x] Limit concurrency. (1–10 clamp at API boundary)
- [x] Record per-tenant result. (TenantMigrationResult upserted for success AND failure with detail)
- [x] Retry transient failures. (bounded 1–5 attempts for known PostgreSQL/Prisma transient failures; retry count and backoff are configurable)
- [x] Stop/pause on failure threshold. (two consecutive-failure case unit-tested)
- [x] Isolate one failed tenant without blocking already healthy tenants unnecessarily. (healthy members of a batch complete before the pause)
- [x] Prevent application from serving incompatible schema silently.
- [x] Provide operator resume/retry. (resume skips already-successful tenants via recorded results)
- [x] Provide migration fleet dashboard. (console /migrations: start form, fleet results tables, pause/resume controls)

## 14.3 Migration safety

- [x] Back up before high-risk migrations. (`runbooks/migration-rollback-forward-fix.md` requires verified control-plane and tenant backup evidence for every target batch and aborts the batch when evidence is missing or stale; provider scheduling and live backup execution remain MT-12 operations work.)
- [x] Define expand/migrate/contract pattern for breaking changes. (`runbooks/migration-rollback-forward-fix.md` defines additive expand, bounded backfill, and separate contract phases.)
- [x] Avoid destructive schema changes in one step. (ADR-0005 and the migration runbook require a separate contract phase and reject ad-hoc reverse SQL against live tenants.)
- [ ] Test old app/new schema and new app/transition schema compatibility where rollout requires it.
- [x] Add migration timeout. (per-tenant bootstrap is bounded by `TENANT_MIGRATION_TIMEOUT_MS`, default 120 seconds)
- [x] Add lock/contention strategy. (tenant bootstrap applies per-migration `lock_timeout` and `statement_timeout`; the orchestrator classifies PostgreSQL lock/deadlock/serialization failures as bounded transient retries.)
- [x] Add rollback/forward-fix runbook. (`runbooks/migration-rollback-forward-fix.md` defines backup gates, pause/retry behavior, isolated restore, forward-fix recovery, and schema compatibility evidence.)
- [x] Never run uncontrolled `prisma migrate deploy` against every tenant simultaneously from application startup. (tenant migrations are launched only through the bounded, canary-aware BullMQ orchestrator; application startup has no tenant-fleet migration path.)

## 14.4 Validation

- [ ] Create at least 10 disposable tenant DBs.
- [ ] Migrate all successfully.
- [ ] Inject one failing tenant.
- [ ] Prove remaining tenants are handled according to rollout policy.
- [x] Prove retry after repair. (`migration-orchestrator.service.spec.ts` retries transient failures and resumes failed results without re-running successful tenants)
- [x] Prove schema-version reporting. (migration result rows, tenant registry views, provisioning evidence, and restore verification expose schema versions)
- [x] Prove app rejects/isolates incompatible tenant safely. (resolver tests reject `MIGRATION_REQUIRED` before tenant request routing)

### MT-11 gate

- [ ] Canary → batch → fleet migration works with one intentionally failing database.
- [x] Production deployment does not depend on manually migrating tenant DBs one by one. (operator start enqueues one bounded canary/batch fleet job; workers record per-tenant results and support queued resume)

---

# 15. Release MT-12 — Backup, Restore, Export, Closure, and Disaster Recovery

## 15.1 Backup

- [ ] Select managed PostgreSQL backup/PITR strategy.
- [ ] Define RPO.
- [ ] Define RTO.
- [ ] Back up control plane.
- [ ] Back up every tenant DB.
- [ ] Track backup evidence/status centrally.
- [ ] Alert on stale/failed backup.
- [ ] Protect backup credentials.
- [ ] Define retention by plan/legal requirement.

## 15.2 Restore

- [ ] Restore control plane to isolated environment.
- [ ] Restore one tenant independently.
- [x] Restore tenant without overwriting another. (restore helper requires a new `restore_drill_*` database and refuses an existing target)
- [x] Verify schema version after restore. (restore helper requires a completed `_prisma_migrations` row and prints the restored migration name)
- [ ] Verify object/media references.
- [ ] Verify financial ledgers/reconciliation.
- [ ] Document DNS/domain behavior during disaster recovery.
- [ ] Perform and record restore exercise.

## 15.3 Tenant export/closure

- [ ] **BLOCKED:** Approve retention/deletion policy.
- [ ] Define export package.
- [ ] Export tenant business data.
- [ ] Export audit/financial data according to policy.
- [ ] Export media where required.
- [x] Revoke domains safely. (`TenantClosureService.initiateClosure` disables every domain at CLOSURE_PENDING — takeover/reassignment designed out)
- [ ] Revoke integration credentials.
- [ ] **PARTIAL:** Stop scheduled jobs. (fan-out skips non-ACTIVE orgs by query shape; explicit job-revocation sweep pending)
- [x] Close DB connections. (registry RETIRED → connection manager refuses; graceful disconnect path exists)
- [ ] **PARTIAL:** Archive/delete DB according to policy. (90-day recoverable window implemented per PO-013 — finalize refuses inside the window without operator override; registry retirement + CLOSED transition landed; physical destruction awaits hosting decision)
- [x] Prevent domain takeover after closure. (closure disables all organization domains before the retention window; domain service tests preserve the disabled state and resolver fail-closed behavior)
- [x] Preserve required platform billing/audit evidence.

### MT-12 gate

- [ ] One tenant can be restored independently from backup.
- [x] A documented closure flow exists before accepting production tenants. (`TenantClosureService` and its tests cover CLOSURE_PENDING, domain revocation, retention-window refusal, explicit finalization acknowledgement, registry retirement, and audit evidence)

---

# 16. Release MT-13 — Observability, Security, Performance, and SaaS Hardening

## 16.1 Observability

- [x] Add organization/tenant ID to safe structured logs. (`StructuredLogger` stamps `organizationId`/`hostname` on every JSON entry via a bootstrap-registered context accessor — registry IDs only, never credentials)
- [x] Add resolved domain where safe. (hostname rides the same envelope from the trusted `TenantContext`)
- [x] Add tenant DB connection metrics. (`db_acquire_failure` / `db_breaker_opened` counters emitted per tenant database)
- [x] Add provisioning metrics. (`provisioning_run_started`, `provisioning_run_completed`, and `provisioning_run_failed` are bounded control-plane counters emitted through the shared structured metrics snapshot.)
- [x] Add migration fleet metrics. (`migration_run_started`, `migration_tenant_succeeded`, `migration_tenant_failed`, `migration_run_paused`, and `migration_run_completed`; tenant labels remain bounded by `TenantMetrics` cardinality limits)
- [x] Add subscription/entitlement denial metrics. (`entitlement_denied{code,featureKey}` counted at every server-side denial in `EntitlementsService.evaluate`)
- [x] Add unknown-domain metrics. (`resolver_unknown_domain` / `resolver_suspended` / `resolver_tenant_unavailable` / `resolver_migration_required` counted at each fail-closed branch)
- [x] Add per-tenant queue failure visibility. (`queue_tenant_failure{label,organizationId}` counted per isolated fan-out failure; snapshots carry org labels)
- [x] Add platform billing metrics. (invoice creation, payment initiation, hosted-session creation, payment success, and payment failure emit bounded control-plane counters without organization or payment identifiers.)
- [x] Add backup freshness metrics. (Platform and tenant operations-health projections emit bounded `backup_freshness_observed` observations with backup and restore states; no credentials, storage keys, or tenant identifiers are included.)
- [x] Add support-access security events. (`SUPPORT_ACCESS_GRANTED`, `SUPPORT_ACCESS_USED`, and `SUPPORT_ACCESS_REVOKED` are append-only platform audit events; usage fails closed if the audit write fails)
- [x] Validate support-access control-plane requests with dedicated DTOs. (organization/reason/scope fields are bounded; TTL is transformed and constrained to 5 minutes through 8 hours; active-grant query filters are explicit)
- [ ] **PARTIAL:** Add alerting for isolation-critical failures. (counters surface as periodic structured `tenant_metrics_snapshot` events any log pipeline can alert on; dedicated alert routing awaits metrics-stack decision)

## 16.2 Security tests

- [x] Host-header manipulation tests. (trusted-proxy, forwarded-host chain, and direct-client rejection cases cover resolver input)
- [x] Cross-tenant JWT/session replay tests. (tenant membership guard rejects a valid member session against another resolved organization)
- [x] IDOR tests using same IDs across tenant DBs. (wallet, cart, payment callback, rider, storage, returns, refunds, RTO, settlements, pickup, and analytics suites use overlapping identifiers under two tenant contexts)
- [x] Tenant Admin → Platform Admin privilege escalation tests. (platform realm guard rejects tenant tokens and enforces platform permissions)
- [x] Platform Support access expiry/revocation tests. (active lookup requires exact organization/user, unexpired `expiresAt`, and `revokedAt: null`; revoke is idempotent)
- [x] Cross-tenant saved-cart token tests. (`cart.tenant-isolation.spec.ts` proves identical share-token input is resolved only against the current trusted tenant database.)
- [x] Cross-tenant wallet tests. (`wallet.tenant-isolation.spec.ts` uses the same customer ID in two tenant contexts and proves wallet balances and ledgers remain database-local.)
- [x] Cross-tenant payment callback tests. (`commerce-payments.controller.spec.ts` rejects a callback token signed with another secret before tenant routing; valid callbacks route only through the HMAC-bound organization context and the tenant-local payment client.)
- [x] Cross-tenant rider assignment/GPS tests. (`delivery-personnel.tenant-isolation.spec.ts` proves the same rider user ID resolves to tenant-local personnel and location history.)
- [x] Cross-tenant WebSocket room tests. (single-instance and Redis-adapter multi-instance integration suites assert same-tenant delivery only)
- [x] Cross-tenant Redis collision tests. (`src/tenancy/tests/redis-collision.spec.ts` proves identical logical identifiers produce distinct tenant-scoped keys while preserving intentional platform-global keys)
- [x] Cross-tenant file/object access tests. (`storage.controller.spec.ts` rejects another organization object prefix before presigning and allows only the current tenant namespace.)
- [x] Unknown/suspended/deleted tenant tests. (resolver covers unknown/inactive domains, suspended browsing, closure, and unavailable registries)
- [ ] SSR/BFF tenant-confusion tests.
- [x] Cache poisoning/leak tests. (resolver cache validation binds entries to normalized hostnames and tests negative/positive isolation)

## 16.3 Performance and scale

- [x] Load-test tenant resolver. (cached hot load: 2,000 interleaved resolutions in ~15ms with exactly 2 control-plane queries; evidence lines in performance-baseline suite)
- [x] Load-test connection manager. (`test/performance-baseline.integration-spec.ts` measures cold/warm acquisition, 50 concurrent gets, LRU churn, and real PostgreSQL pool bounds)
- [x] Load-test 10/50/100+ active tenant simulations. (`tenant-fanout.service.spec.ts` runs 100 ready-tenant operations and asserts the configured concurrency ceiling is never exceeded)
- [x] Measure cold tenant DB connection latency. (~105ms cold vs <1ms warm median against local PostgreSQL — recorded per run as structured evidence)
- [x] Measure cached tenant resolution. (same suite; positive/negative cache effectiveness asserted by query counts, not wall-clock alone)
- [x] Test pool exhaustion behavior. (`tenant-database.manager.spec.ts` proves active-client capacity fails closed with `TENANT_DATABASE_CAPACITY_EXHAUSTED`; the integration baseline proves configured pool bounds)
- [ ] Test noisy-neighbor queue behavior.
- [x] Test one slow tenant DB. (`tenant-fanout.service.spec.ts` proves two healthy tenants progress while one bounded slow tenant is still running.)
- [x] Test control-plane outage behavior. (`performance-baseline.integration-spec.ts` proves tenant resolution fails closed within a bounded latency without legacy fallback)
- [x] Define safe degraded behavior; never bypass tenant authorization. (resolver, database manager, membership guard, and fan-out tests assert fail-closed errors, per-tenant breakers, and isolated worker failures)
- [x] Establish capacity thresholds for when database connection strategy must change. (`scripts/connection-budget-check.mjs` computes replica, platform, legacy, tenant-client, pool, reserved, and usable connection totals and exits non-zero on budget overflow)

## 16.4 Dependency/security hygiene

- [x] CI dependency audit. (critical production dependency audit runs for backend and every web/mobile workspace)
- [x] Secret scan. (Required CI `security-scan` job runs the full repository through `gitleaks/gitleaks-action@v2`; exposed credentials still require rotation when detected.)
- [x] SAST/lint/typecheck.
- [x] Production builds for all web apps/backend. (CI matrix: backend, Customer Web, Admin Web, Platform Admin)
- [x] Prisma migration validation. (CI runs `check:migrations` before deployment; it validates both PostgreSQL migration roots, naming, SQL presence, duplicate names, and lock providers)
- [x] Tenant-isolation integration suite mandatory in CI. (backend workflow runs cross-tenant integration and performance suites against disposable PostgreSQL)
- [x] Prevent merge if critical isolation tests fail. (integration, capacity, queue-smoke, typecheck, lint, and audit failures fail their required CI jobs)

### MT-13 gate

- [ ] Security review finds no known path for tenant A to read/write tenant B data.
- [x] Capacity test demonstrates bounded DB connection behavior. (real PostgreSQL performance baseline plus the connection-budget gate prove bounded client-cache and pool behavior)
- [ ] Critical SaaS metrics and alerts are operational.

---

# 17. Release MT-14 — Internal Alpha, Pilot Tenants, and Production Launch

## 17.1 Internal alpha

- [ ] Provision at least three internal tenants.
- [ ] Use intentionally overlapping customer/product/order identifiers.
- [ ] Run browse → checkout → order → payment/COD → fulfillment → rider/courier → return/refund flows.
- [ ] Run wallet flow.
- [ ] Run warranty/service/chat/pickup flow.
- [ ] Run tenant suspension/reactivation.
- [ ] Run plan upgrade/downgrade.
- [ ] Run provisioning retry.
- [ ] Run tenant migration canary/batch.
- [ ] Run tenant backup/restore.
- [ ] Run support-access workflow.

## 17.2 Pilot beta

- [ ] Select 2–5 controlled real businesses.
- [ ] Provision each independently.
- [ ] Validate owner onboarding.
- [ ] Validate real domains/subdomains.
- [ ] Validate tenant-specific provider configuration.
- [ ] Monitor DB pools and tenant latency.
- [ ] Monitor queue fairness.
- [ ] Monitor support volume.
- [ ] Collect onboarding friction.
- [ ] Collect plan/limit feedback.
- [ ] Freeze destructive schema changes during pilot unless required.

## 17.3 Production launch gate

- [ ] Every PRD Release 1 SaaS exit criterion passes.
- [ ] At least two independent organizations have isolated DBs and domains.
- [ ] Cross-tenant negative test suite passes.
- [ ] Provisioning is idempotent.
- [ ] Migration orchestration is proven.
- [ ] Subscription/entitlement enforcement is proven.
- [ ] Platform billing is separated from tenant commerce billing.
- [ ] Backup and restore are proven.
- [ ] Unknown/suspended-domain behavior is proven.
- [ ] Redis/BullMQ/WebSocket/file isolation is proven.
- [x] Platform Admin support access is audited and constrained. (reason-bound, time-bound, organization/user-scoped, revocable, and usage-audited)
- [x] No production request path can fall back to the original single-tenant DB. (The production configuration gate requires tenancy and the shared resolver rejects missing tenant context instead of returning the legacy Prisma client.)
- [ ] Critical/high security findings are closed or formally accepted.
- [ ] Operational runbooks are complete.

---

# 18. Release 2 — Multi-Tenant CRM, Retention, and Growth

Release 2 should begin only after SaaS isolation and operations are stable.

## 18.1 Tenant Customer 360

- [ ] Unified tenant-local customer timeline.
- [ ] Reviewed duplicate profile merge within a tenant.
- [ ] Delivered/cancelled/returned/spend/source/risk indicators.
- [ ] Support context.
- [ ] Cohort and lifetime-value/contribution views.
- [ ] Explicitly prevent cross-tenant Customer 360 aggregation unless a separate privacy-reviewed platform product is approved.

## 18.2 Tenant consent and communications

- [ ] Channel-specific consent evidence.
- [ ] Revocation/suppression.
- [ ] Frequency caps.
- [ ] Quiet hours.
- [ ] Tenant marketing kill switch.
- [ ] Explainable eligibility.
- [ ] Tenant-specific send history.
- [ ] Tenant-specific messaging credentials/templates.
- [ ] Plan entitlement for advanced marketing if applicable.

## 18.3 Segments and campaigns

- [ ] Deterministic tenant-local segments.
- [ ] Segment preview/count.
- [ ] WhatsApp-first controlled campaigns.
- [ ] Abandoned-cart automation.
- [ ] Restock automation.
- [ ] Price-drop automation.
- [ ] Post-purchase automation.
- [ ] Repeat-purchase automation.
- [ ] Win-back automation.
- [ ] Meta Lead Ads / Pixel / CAPI if approved.
- [ ] Tenant campaign reporting through delivered/returned/contribution outcomes.
- [ ] Tenant usage/billing metering for campaign volume if plan requires it.

## 18.4 Release 2 SaaS gates

- [ ] Campaign jobs cannot cross tenant.
- [ ] Suppression/consent is evaluated inside correct tenant.
- [ ] Provider credentials cannot cross tenant.
- [ ] Segment preview cannot query another tenant DB.
- [ ] Usage limits are enforced server-side.
- [ ] Release 2 PRD exit criteria pass.

---

# 19. Release 3 — SaaS Optimization and Scale

These are trigger-based candidates, not launch prerequisites.

- [ ] Dedicated search infrastructure with tenant index isolation.
- [ ] Personalized recommendations with tenant/customer privacy boundaries.
- [ ] Advanced COD/fraud scoring.
- [ ] AI-assisted product descriptions.
- [ ] AI-assisted SEO.
- [ ] Review summarization/image moderation.
- [ ] Customer-support assistant/translation.
- [ ] Image background removal.
- [ ] Category/duplicate-product detection.
- [ ] Analytics warehouse with explicit tenant partitioning.
- [ ] Advanced courier optimization.
- [ ] Multi-warehouse entitlement.
- [ ] Public tenant APIs.
- [ ] Tenant webhooks.
- [ ] Enterprise SSO if demand justifies it.
- [ ] Higher-availability/dedicated tenant tiers.
- [ ] Tenant DB placement/region strategy if scale requires it.
- [ ] Read replicas only after measured need.
- [ ] Service extraction only after modular-monolith bottlenecks are demonstrated.

---

# 20. Product-Owner / Architecture Decision Checklist

The following decisions should be recorded in a dedicated ADR/product decision log.

- [x] **RESOLVED** (Plan names/structure resolved (PO-001); prices remain pilot-dependent.) — was: Initial SaaS plan names, prices, billing intervals.
- [ ] **RESOLVED-DIRECTION** (Resolved: 14-day trial; INTERNAL plan (PO-002).) — was: Trial/free/internal tenant policy.
- [x] RESOLVED-DIRECTION (limits defined per plan for seats/products/warehouses/features; NO GMV limit per owner #12; prices remain TBD until cost baseline).
- [ ] **RESOLVED-DIRECTION** (Resolved: 7-day grace; browsable storefront, checkout disabled (PO-004/005).) — was: Subscription grace-period and suspension behavior.
- [ ] **RESOLVED-DIRECTION** (Resolved direction: provider abstraction, SSLCOMMERZ first (PO-006) — adapter build pending.) — was: SaaS subscription payment provider.
- [ ] **RESOLVED-DIRECTION** (Resolved: {slug}.{FERIO_PUBLIC_DOMAIN} (PO-007).) — was: Default production tenant hostname/domain.
- [x] RESOLVED-DIRECTION (Cloudflare DNS + wildcard subdomains + automated TLS; record creation is ops-on-production-domain).
- [x] RESOLVED-DIRECTION (automated wildcard TLS preferred; custom domains post-alpha per PO-008).
- [ ] **RESOLVED-DIRECTION** (Resolved: shared managed cluster initially (PO-009).) — was: PostgreSQL hosting model for database-per-tenant.
- [ ] **RESOLVED-DIRECTION** (Resolved: AES-256-GCM + external master key (PO-010).) — was: Tenant DB credential storage/KMS strategy.
- [ ] **RESOLVED-DIRECTION** (Resolved sequencing: bounded LRU now, PgBouncer at scale (PO-011).) — was: PgBouncer/connection-pooling infrastructure.
- [ ] **RESOLVED-DIRECTION** (Resolved: RPO ≤1h, RTO ≤4h (PO-012).) — was: RPO/RTO.
- [ ] **RESOLVED-DIRECTION** (Resolved: 30 days (PO-012).) — was: Backup retention.
- [ ] **RESOLVED-DIRECTION** (Resolved: 90-day recoverable window (PO-013), implemented in TenantClosureService.) — was: Tenant closure/export/deletion retention.
- [ ] **RESOLVED-DIRECTION** (Resolved: tenant-local for Release 1 (PO-015).) — was: Customer identity scope across tenants.
- [ ] **RESOLVED-DIRECTION** (Resolved: yes, global identity + memberships (PO-014); switcher UX later.) — was: Whether one global login may have memberships in multiple tenant businesses.
- [x] RESOLVED (owner #10: tenant OWNER grants explicitly with reason/expiry/scope/audit; emergency override Super Admin-only + security event).
- [ ] **RESOLVED-DIRECTION** (Resolved abstraction + keys tenants/{orgId}/… (PO-017); provider selection pending for production tenancy.) — was: Object storage provider and tenant object-key strategy.
- [ ] **BLOCKED:** Plan treatment of custom domains, advanced CRM, campaigns, integrations, warehouses, staff counts, products/SKUs, and usage.
- [ ] **RESOLVED-DIRECTION** (Resolved: Platform Admin/sales-assisted initially (PO-018).) — was: Production tenant onboarding model: self-service, sales-assisted, or Platform Admin-only for initial launch.
- [x] RESOLVED (PO-005 stands: storefront browsable, checkout disabled)
- [x] RESOLVED (owner #14: compatible migrations canary->batch->fleet; destructive/locking require announced window + tested rollback; bootstrapper now enforces lock/statement timeouts + NON_TRANSACTIONAL marker).
- [ ] **OPEN:** Legal review still pending; engineering posture unchanged.

---

# 21. Delivery Order and Dependency Schedule

This is a dependency schedule, not a calendar promise. The safest implementation order is:

| Order | Slice | Depends on | Completion gate |
|---:|---|---|---|
| 0 | MT-0 Architecture & safety baseline | Current Ferio baseline | Model ownership classified; ADRs and threat model approved |
| 1 | MT-1 Control plane | MT-0 | Organizations/plans/subscriptions/DB registry work independently |
| 2 | MT-2 Tenant resolver/context | MT-1 | Trusted host → tenant context; unknown/cross-tenant attempts fail closed |
| 3 | MT-3 DB router | MT-2 | Two isolated tenant DBs work with bounded connections |
| 4 | MT-4 Provisioning | MT-1–3 | Organization → DB → migration → seed → owner → ready is idempotent |
| 5 | MT-5 Domains | MT-2, MT-4 | Separate tenant hosts render correct isolated stores |
| 6 | MT-6 Subscription/entitlements | MT-1, MT-2 | Plan limits and subscription state enforced server-side |
| 7 | MT-7 Existing module migration | MT-2–6 | Existing commerce works tenant-isolated end to end |
| 8 | MT-8 Redis/jobs/sockets/files/integrations | MT-2–7 | Non-HTTP infrastructure passes cross-tenant isolation tests |
| 9 | MT-9 Platform Admin | MT-1, MT-4, MT-6, MT-11 foundations | Ferio can operate tenant lifecycle safely |
| 10 | MT-10 Tenant SaaS UX | MT-5–9 | Tenant owner can configure and operate a complete store |
| 11 | MT-11 Migration orchestration | MT-3–4 | Canary/batch/failure-isolation fleet migration passes |
| 12 | MT-12 Backup/restore/closure | MT-3–4 | Independent tenant restore is proven |
| 13 | MT-13 Hardening | MT-1–12 | Security/performance/observability gates pass |
| 14 | MT-14 Alpha/beta/launch | All prior | PRD SaaS Release 1 exit criteria pass |
| 15 | Release 2 CRM/retention | Stable SaaS Release 1 | Tenant-local CRM/consent/campaign gates pass |
| 16 | Release 3 optimization | Measured triggers | Approved experiments prove value and isolation |

---

# 22. Suggested Engineering Schedule

Assuming one strong full-time engineer/AI-assisted development workflow, this should be treated as a **sequencing estimate**, not a guaranteed delivery date.

| Phase | Suggested effort | Primary outcome |
|---|---:|---|
| MT-0 | 2–4 days | Architecture freeze, model classification, threat model |
| MT-1 | 4–7 days | Control-plane schema/services/auth |
| MT-2 | 3–5 days | Trusted tenant resolver/context/membership |
| MT-3 | 5–8 days | Tenant Prisma router + bounded connection manager |
| MT-4 | 5–8 days | Idempotent tenant provisioning |
| MT-5 | 3–6 days | Subdomains/domain routing and tenant frontend state |
| MT-6 | 5–8 days | Plans/subscriptions/entitlements/usage foundation |
| MT-7 | 15–25 days | Migrate existing commerce modules to tenant-safe operation |
| MT-8 | 5–9 days | Redis/BullMQ/socket/storage/provider isolation |
| MT-9 | 6–10 days | Platform Admin operational surface |
| MT-10 | 5–9 days | Tenant onboarding/plan/branding UX |
| MT-11 | 5–8 days | Fleet migration orchestrator |
| MT-12 | 4–7 days | Backup/restore/export/closure |
| MT-13 | 7–12 days | Security, performance, observability hardening |
| MT-14 | 7–14 days | Alpha, pilot, remediation, launch proof |

**Indicative Release 1 SaaS engineering range:** approximately **81–140 focused engineering days** for a production-grade conversion, depending heavily on infrastructure/provider choices, how much existing code can be adapted cleanly, and the depth of automated testing already available.

Parallel work can shorten calendar time, but MT-2/MT-3 are architectural choke points: feature teams should not independently invent tenant routing before those contracts are stable.

---

# 23. Recommended First 20 Implementation Tasks

Execute these before broad UI work:

1. [ ] Create `control-plane` architecture ADR.
2. [ ] Classify every existing Prisma model as control-plane or tenant-plane.
3. [ ] Create separate control-plane Prisma schema/database.
4. [ ] Add `Organization`, `TenantDomain`, `TenantDatabase`, `Plan`, `Subscription`.
5. [ ] Add Platform Admin identity/permission boundary.
6. [ ] Implement trusted hostname normalization/resolution.
7. [ ] Implement immutable request-scoped `TenantContext`.
8. [ ] Implement encrypted tenant DB registry credentials.
9. [ ] Implement bounded tenant Prisma client manager.
10. [ ] Remove/default-disable global tenant Prisma access from tenant HTTP paths.
11. [ ] Create two disposable tenant DBs with intentionally overlapping IDs.
12. [ ] Add first cross-tenant isolation integration suite.
13. [ ] Implement organization provisioning state machine.
14. [ ] Refactor tenant seed to be idempotent and business-neutral.
15. [ ] Implement tenant subdomain reservation/activation.
16. [ ] Tenant-enable authentication/membership.
17. [ ] Tenant-enable catalog + settings first as a vertical proof.
18. [ ] Tenant-enable cart → checkout → COD order as the first complete commerce proof.
19. [ ] Namespace Redis/BullMQ/socket identifiers.
20. [ ] Build minimal Platform Admin organization/provisioning screen.

**Do not start by rewriting every controller.** Prove one complete vertical slice:

```text
tenant hostname
    ↓
trusted tenant resolver
    ↓
tenant context
    ↓
tenant DB router
    ↓
tenant catalog
    ↓
tenant cart
    ↓
tenant checkout
    ↓
tenant COD order
    ↓
tenant admin sees only that order
```

Then use that pattern to migrate the remaining modules.

---

# 24. Mandatory Cross-Tenant Test Matrix

For each high-risk resource, create tenant A and tenant B with overlapping numeric/UUID-like test fixtures wherever possible.

| Domain | Required negative proof |
|---|---|
| Auth/session | Tenant A session cannot authorize tenant B protected route |
| Catalog | Product A ID/slug cannot expose B product |
| Cart | Guest/customer cart cannot move between tenants accidentally |
| Saved cart | Share token resolves only its tenant |
| Checkout | Tenant B cannot price/place A cart |
| Coupon | Coupon belongs to correct tenant |
| Customer | Tenant Admin A cannot search/read B customer |
| Order | Reference/ID from A cannot return B order |
| Payment | Callback/merchant reference maps to exactly one tenant |
| Wallet | A balance cannot be read/debited/refunded by B |
| Inventory | Reservation/movement cannot target B SKU |
| Rider | A rider cannot see/update B assignment |
| GPS/live map | A Admin cannot subscribe/read B locations |
| Return/refund | A return cannot mutate B order/payment |
| Settlement | Import/reconciliation is tenant-bound |
| Warranty/service | Ownership checks include tenant |
| Chat | Socket ticket/room cannot cross tenant |
| Notification | Inbox/outbox remains tenant-scoped |
| Reports/export | Queries and exports contain one tenant only |
| Audit | Tenant audit cannot expose B events |
| Redis | Same logical key in A/B does not collide |
| BullMQ | Job payload cannot choose arbitrary tenant DB |
| Object storage | Guessed B path is inaccessible to A |
| Settings/Hero | Cache cannot return B branding/content |
| Platform support | Access requires explicit active support grant |

---

# 25. CI/CD Gate for Multi-Tenancy

Every merge affecting tenant-aware code should run:

- [x] Backend lint/typecheck/build. (required backend CI job)
- [x] Backend unit suite. (required backend CI job)
- [x] Control-plane Prisma migration validation. (platform migration deploy plus static migration preflight)
- [x] Tenant-plane Prisma migration validation. (tenant migration deploy plus static migration preflight)
- [x] Disposable control-plane PostgreSQL integration tests. (CI PostgreSQL service)
- [x] At least two disposable tenant PostgreSQL databases. (tenant bootstrap/integration suites create isolated scratch databases)
- [x] Cross-tenant isolation suite. (required integration job)
- [x] Redis/BullMQ isolation tests for affected modules. (required queue-smoke job)
- [x] WebSocket isolation tests for affected realtime modules. (integration suite and multi-instance suite when Redis is available)
- [x] Storefront production build. (Customer Web CI job)
- [x] Tenant Admin production build. (Admin Web CI job)
- [x] Platform Admin production build. (Platform Admin CI job)
- [x] Rider surface production build. (included in the Tenant Admin workspace build)
- [x] Secret scan. (required gitleaks job)
- [x] Dependency/security audit. (critical production dependency audit matrix)
- [ ] Migration compatibility check.
- [x] No use of production tenant credentials in CI. (CI uses disposable PostgreSQL/Redis credentials and synthetic JWT secrets)
- [x] Fail build on critical tenant-isolation regression. (required integration, queue, typecheck, lint, and build jobs)

Before production deployment:

```text
control-plane migration
        ↓
application compatibility deployment if required
        ↓
tenant migration canary
        ↓
post-canary validation
        ↓
bounded tenant batches
        ↓
failed-tenant isolation/recovery
        ↓
full rollout
```

---

# 26. Definition of Done for the Multi-Tenant Conversion

The conversion is not complete merely because requests contain `tenantId`.

It is complete when:

- [ ] Ferio has a separate operational control plane.
- [ ] Each tenant has an independently registered and isolated database.
- [ ] Tenant context comes only from trusted server-side resolution/membership.
- [ ] Every tenant commerce module uses the resolved tenant database.
- [ ] Existing single-tenant commerce functionality remains behaviorally correct.
- [ ] Platform billing and tenant commerce money remain separate.
- [ ] Plans and limits are enforced server-side.
- [ ] Tenant provisioning is idempotent and recoverable.
- [ ] Domains are safely verified/routed.
- [ ] Redis, BullMQ, WebSockets, caches, files, and provider integrations are tenant-isolated.
- [ ] Fleet migrations are staged and failure-isolated.
- [ ] One tenant can be backed up/restored independently.
- [x] Platform support access is explicit and audited. (no active grant means no support-data access; grant use is recorded)
- [ ] Cross-tenant negative tests cover all sensitive domains.
- [ ] Two or more real/pilot tenants can operate concurrently without data, cache, job, socket, credential, or financial leakage.
- [ ] No legacy default-tenant fallback exists in production.
- [ ] Release 1 SaaS acceptance criteria in PRD v2.1 pass.

---

# 27. Checklist Maintenance

After every completed slice:

1. Change `[ ]` to `[x]` only after the stated multi-tenant gate is validated.
2. Record test/build/migration evidence in the current progress document.
3. Record architecture changes as ADRs.
4. Add newly discovered tenant-boundary risks immediately.
5. Never mark UI-only implementation as completion when backend isolation is missing.
6. Re-run the cross-tenant negative suite after changes to auth, DB routing, cache, jobs, sockets, files, payments, wallet, riders, or Platform Admin.
7. Keep Release 2/3 growth work behind the Release 1 SaaS isolation and operational gates.
