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

- [ ] Confirm the canonical SaaS application map:
  - `ferio-nest-prisma` — shared NestJS backend;
  - Tenant Storefront Web;
  - Tenant Admin Web;
  - Rider Web Portal / rider surface;
  - Customer Mobile App;
  - Ferio Platform Admin.
- [x] Decide whether Platform Admin is a separate Next.js application or an explicitly isolated application boundary inside an existing admin repository. (`ferio-platform-admin` — ADR-0008)
- [ ] Document which modules are **control-plane**, **tenant-plane**, or **shared infrastructure**.
- [x] Add an architecture decision record for database-per-tenant. (`_doc/multi-tenant/adr/ADR-0001`)
- [x] Add an architecture decision record for tenant resolution. (`ADR-0002`)
- [x] Add an architecture decision record for connection-pool management. (`ADR-0003`)
- [x] Add an architecture decision record for platform identity vs tenant membership. (`ADR-0004`)
- [x] Add an architecture decision record for tenant migration orchestration. (`ADR-0005`)
- [x] Add an architecture decision record for subscription/entitlement enforcement. (`ADR-0006`)
- [x] Add an architecture decision record for tenant deletion/export/retention. (`ADR-0007`, policy owner-blocked)
- [ ] Freeze accidental new global tables in the existing tenant schema until ownership is classified.
- [ ] Create a tenant-boundary review checklist for every future module/PR.

## 3.2 Data classification

- [x] Produce a table for every current Prisma model: `CONTROL_PLANE`, `TENANT`, `PLATFORM_SHARED`, or `REMOVE/LEGACY`. (`_doc/multi-tenant/data-classification.md`)
- [x] Classify all existing tables for catalog, inventory, cart, checkout, orders, payments, wallet, returns, riders, chat, services, warranty, reviews, settings, analytics, audit, reconciliation, and notifications.
- [x] Identify every current singleton/global setting that must become tenant-local.
- [x] Identify every current unique constraint that becomes tenant-local after DB separation.
- [ ] Identify every cross-domain reference that cannot cross database boundaries.
- [x] Prohibit tenant DB foreign keys to control-plane tables. (enforced by ADR-0001; canonical schema extraction will make it physical)
- [x] Define opaque identifiers required in cross-plane messages/events instead of database foreign keys. (TenantContext carries registry IDs only)
- [ ] Document ownership and retention of uploaded product, warranty, review, return, and other media.

## 3.3 Security baseline before tenancy

- [ ] Re-run secret scanning and rotate any remaining exposed credentials.
- [x] Verify JWT/session secrets have no development fallback in production. (Aug 2026 remediation + template-secret startup rejection)
- [x] Verify refresh revocation fails closed. (Aug 2026 remediation)
- [x] Verify OTP/TOTP hardening remains active. (Aug 2026 remediation)
- [ ] Verify Platform Admin cannot reuse Tenant Admin authorization implicitly.
- [x] Add stable error codes for tenant resolution, tenant unavailable, subscription denial, provisioning failure, and tenant migration failure. (`src/tenancy/tenant-errors.ts`; entitlement/provisioning codes in services)
- [x] Add a rule: **no tenant lookup failure may fall back to the original Ferio database**. (resolver fails closed; enforced by tests)
- [x] Add a rule: **no request body/query/header may select a tenant database directly**. (resolver reads host only; manager keys on registry ID)

### MT-0 gate

- [ ] Architecture decisions approved.
- [ ] Existing Prisma models classified.
- [ ] No ambiguous global-vs-tenant business data remains undocumented.
- [ ] Threat model reviewed before implementing database routing.

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
- [ ] Model plan versions if plan behavior must remain historically explainable.
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
- [x] Implement provisioning orchestration service. (8-step idempotent state machine, resumable runs, pluggable executor)
- [ ] **PARTIAL:** Implement tenant migration orchestration service. (run/result models + version stamping landed; BullMQ fleet runner lands in MT-11)
- [x] Implement support-access service. (reason-bound TTL grants, revoke, assert-active)
- [x] Implement platform audit service. (append-only)
- [x] Keep all control-plane services independent of tenant Prisma models. (separate generated client + datasource)

## 4.3 Control-plane authorization

- [x] Create separate Platform Admin guards. (`PlatformAuthGuard`, realm=platform tokens, role→permission map)
- [ ] Define platform permissions for organization, subscription, billing, domain, provisioning, migration, support access, and platform health.
- [x] Ensure tenant staff roles cannot invoke Platform Admin APIs. (realm mismatch rejected)
- [ ] Ensure Platform Admin identity alone does not grant direct tenant commerce access.
- [ ] Require explicit support-access workflow for tenant-data access.
- [x] Make support access reason-bound, time-bound, auditable, and revocable. (min reason length, 5min–8h TTL clamp)

## 4.4 Validation

- [x] Unit-test organization state transitions.
- [x] Unit-test subscription state transitions.
- [x] Unit-test entitlement evaluation. (full matrix incl. concurrent-limit semantics)
- [x] Unit-test domain lifecycle. (reserved names, verification mismatch → FAILED, activation)
- [ ] Integration-test control-plane migrations on disposable PostgreSQL.
- [ ] Prove platform billing tables cannot be confused with tenant payment/wallet ledgers.

### MT-1 gate

- [ ] Control-plane database can operate without connecting to a tenant DB.
- [ ] Platform Admin authorization is independent.
- [ ] Organization/domain/plan/subscription/database registry foundations are production-build clean.

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
- [ ] **PARTIAL:** Support development host mapping without weakening production behavior. (`TENANCY_ENABLED` staged-rollout flag added: disabled = passthrough legacy mode; enabled = strict fail-closed resolution. Per-host dev mapping table still pending.)
- [x] Cache domain resolution only with tenant-aware keys. (key IS the trusted hostname; positive 60s / negative 15s TTL)
- [x] Implement explicit invalidation on domain/status changes. (`invalidate(hostname)`)
- [x] Define negative-cache TTL for unknown domains. (15s window; only definitive unknown/inactive answers are cached — outages never are; storm test proves 299 subsequent misses cost zero control-plane queries)
- [x] Never trust `tenantId`, `organizationId`, `databaseUrl`, or equivalent browser-supplied routing values. (host-only input; middleware)

## 5.2 Tenant request context

- [x] Create immutable request-scoped `TenantContext`. (frozen object via AsyncLocalStorage)
- [x] Include organization ID, tenant DB registry ID, hostname/domain ID, subscription state, and safe correlation metadata. (correlation rides the existing ALS)
- [ ] Make tenant context available to application services without reading raw host repeatedly.
- [x] Prevent code from mutating tenant context during a request. (Object.freeze + no setters exported)
- [ ] **PARTIAL:** Propagate trusted tenant context to background jobs. (`TenantDatabaseMaterial` now rides the immutable request context; BullMQ envelope propagation lands with MT-8 job work.)
- [ ] Propagate tenant scope to WebSocket authorization.
- [ ] Include tenant identity in audit events.
- [ ] Include safe tenant identity in structured logs/metrics.
- [x] Do not expose DB credentials in context returned to frontend clients. (context carries registry IDs only; publicView strips secrets)

## 5.3 Identity + tenant membership

- [ ] Define global identity vs tenant membership behavior.
- [ ] **PARTIAL:** Verify an authenticated account is a member/customer/rider of the resolved tenant before protected tenant actions. (staff membership gate live behind flag; rider binding remains enforced tenant-locally via approved personnel records; customer accounts tenant-local by database separation)
- [ ] Define same-email behavior across independent tenant businesses.
- [ ] Define whether customer identity is tenant-local initially.
- [ ] Prevent a valid session from tenant A being replayed against tenant B.
- [ ] **PARTIAL:** Bind Tenant Admin session authorization to resolved tenant membership. (`TenantMembershipGuard` shipped: legacy passthrough, cross-tenant replay denial, OWNER/STAFF roster lookup with 60s cache + invalidation; applied to `admin/catalog` as the proof point — remaining controllers sweep at MT-10 cutover)
- [ ] Bind rider authorization to tenant + approved personnel record.
- [ ] **PARTIAL:** Add negative tests for forged hosts and cross-tenant cookies/tokens. (unit suites cover forged/malformed hosts, unknown-domain fail-closed, cross-org session replay denial; full multi-client E2E remains MT-14)

### MT-2 gate

- [x] Two test hostnames resolve deterministically to two different organizations. (`src/tenancy/redis-collision.spec.ts`: tenant-a/tenant-b hosts resolve to their own orgs, interleaved resolutions never cross, positive-cache path stays deterministic)
- [x] Unknown/suspended hosts fail closed. (negative tests prove no legacy-DB fallback)
- [x] Changing an ID, cookie, host, or request payload cannot select another tenant's database. (manager accepts registry rows only)

---

# 6. Release MT-3 — Tenant Database Router and Connection Management

## 6.1 Tenant Prisma client manager

- [ ] Implement a centralized tenant database connection manager.
- [ ] Resolve DB connection only from trusted `TenantDatabase` control-plane metadata.
- [ ] Encrypt tenant database credentials at rest.
- [ ] Keep decrypted credentials out of normal logs/errors.
- [ ] Add bounded client/connection caching.
- [ ] Add idle eviction.
- [ ] Add maximum active tenant-client limits.
- [ ] Add connection acquisition timeout.
- [ ] Add health-state handling for unavailable tenant DBs.
- [ ] Prevent unbounded `new PrismaClient()` per request.
- [ ] Add graceful application shutdown/disconnect.
- [ ] Add metrics for active clients, evictions, acquisition failures, and pool exhaustion.
- [ ] Design for PgBouncer/managed pooling if tenant count requires it.
- [ ] Add a circuit-breaker/backoff strategy for repeatedly unhealthy tenant DBs.

## 6.2 Repository/application-service integration

- [ ] Remove direct singleton tenant Prisma usage from tenant-scoped request paths.
- [ ] **PARTIAL:** Introduce tenant-aware repository/service access. (`TenantDbService.get()/tryGet()` primitive shipped — resolves client exclusively from immutable context + control plane; commerce-module migration begins MT-7)
- [ ] Ensure transactions use the same resolved tenant client for the entire operation.
- [ ] Ensure nested services cannot silently acquire a different tenant client.
- [ ] Ensure control-plane transactions never include tenant DB writes as if they were one ACID transaction.
- [ ] Define saga/compensation behavior for cross-plane workflows such as provisioning.
- [ ] Add tests for transaction rollback inside one tenant without affecting another.

## 6.3 Database isolation tests

- [ ] Provision tenant A database.
- [ ] Provision tenant B database.
- [ ] Seed deliberately similar IDs into both.
- [ ] Prove tenant A reads only A.
- [ ] Prove tenant B reads only B.
- [ ] Prove writes remain isolated.
- [ ] Prove transaction rollback remains isolated.
- [ ] Prove one tenant DB outage does not route to another.
- [ ] Prove one tenant DB outage does not crash healthy tenant traffic unnecessarily.
- [ ] Load-test connection manager with many simulated tenants.

### MT-3 gate

- [ ] Database-per-tenant isolation is demonstrated automatically.
- [ ] No tenant-scoped HTTP path uses a global/default Prisma client.
- [x] Pool/client count remains bounded under load. (50 concurrent acquisitions collapse to 1 active client; LRU churn never exceeds TENANT_DB_MAX_CLIENTS — performance-baseline suite)

---

# 7. Release MT-4 — Tenant Provisioning and Lifecycle Automation

## 7.1 Organization creation workflow

Provisioning should behave as an idempotent state machine, not a controller script.

- [ ] Platform Admin creates organization.
- [ ] Reserve unique organization slug.
- [ ] Reserve default tenant subdomain.
- [x] Create tenant DB registry record.
- [ ] **PARTIAL:** Create physical database/schema according to infrastructure strategy. (default executor issues CREATE DATABASE on the platform server + canonical migration set applied via `TenantSchemaBootstrapper`; managed hosting remains owner-blocked)
- [x] Generate/store tenant DB credential securely. (AES-256-GCM at rest, decrypted only inside pool creation/bootstrap)
- [x] Apply current approved tenant migration set. (ordered artifact execution tracked in `_ferio_tenant_migrations`; idempotent re-runs proven)
- [x] Run tenant seed.
- [x] Seed default tenant settings. (CommerceSettings store identity + COD verification ALWAYS baseline, ON CONFLICT-safe)
- [ ] Seed default permissions/owner role.
- [ ] Create/attach initial owner membership.
- [x] Run DB health check. (bootstrap success + registry READY stamping)
- [ ] Run minimal tenant smoke test.
- [ ] Activate domain only after readiness.
- [ ] Mark organization `READY/ACTIVE` only after all required steps succeed.
- [x] Persist every provisioning step/result.
- [x] Make retries resume safely. (resume-from-first-incomplete-step; idempotency-key replay returns completed runs)
- [x] Prevent duplicate DB/domain creation on repeated requests. (unique org slug/domain hostname/registry orgId/idempotencyKey)
- [ ] Add compensation/manual-recovery instructions for partial failure.

## 7.2 Tenant seed

- [ ] Refactor existing Ferio seed into tenant-safe seed logic.
- [ ] Remove global hard-coded Ferio business assumptions.
- [ ] Seed tenant owner separately from platform super-admin.
- [ ] Seed tenant-local settings.
- [ ] Seed tenant-local feature defaults.
- [ ] Seed tenant-local notification templates.
- [ ] Seed delivery/payment defaults as disabled/configuration-required where appropriate.
- [ ] Seed no fake customer/order/payment data in production provisioning.
- [x] Make seed idempotent.

## 7.3 Organization lifecycle

- [ ] Implement `PROVISIONING`.
- [ ] Implement `ACTIVE`.
- [ ] Implement `SUSPENDED`.
- [ ] Implement `PROVISIONING_FAILED`.
- [ ] Implement `CLOSURE_PENDING` if approved.
- [ ] Implement archived/deleted lifecycle according to retention policy.
- [ ] Define which public/storefront operations remain visible during subscription suspension.
- [ ] Prevent destructive deletion while legal/financial retention applies.
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

### MT-4 gate

- [ ] A new organization can be created from Platform Admin and reach a working isolated storefront/admin environment without manual SQL.
- [ ] Replaying provisioning is idempotent.
- [ ] Failed provisioning is diagnosable and recoverable.

---

# 8. Release MT-5 — Domain, Subdomain, and Storefront Routing

## 8.1 Default tenant subdomains

- [x] Define canonical hostname format, e.g. `{tenant}.ferio...`. (`PLATFORM_PUBLIC_DOMAIN` + slug; enforced in DomainsService)
- [ ] **PARTIAL:** Configure wildcard DNS. (Decision made: *.ferio.com → storefront infrastructure, PO-007/008; DNS record creation itself is an ops task on the production domain)
- [ ] Configure wildcard TLS/certificate strategy.
- [ ] **PARTIAL:** Add local-development tenant-domain strategy. (LEGACY passthrough mode keeps localhost working; per-host dev mapping table pending)
- [ ] Add canonical redirect rules.
- [x] Add reserved subdomain list (`www`, `admin`, `api`, `app`, etc.). (`RESERVED_SUBDOMAINS`)
- [ ] Prevent organization slugs from colliding with reserved/system routes.
- [x] Ensure storefront SSR/server requests resolve tenant before fetching tenant data. (Customer Web root layout gates rendering on backend `/tenancy/status`; all server-side BFF fetches forward `x-forwarded-host` via the instrumentation-registered provider)
- [ ] **PARTIAL:** Make metadata/SEO tenant-aware. (layout metadata falls back neutrally on non-active states; per-tenant SEO titles/descriptions arrive with MT-7 settings reads)
- [ ] Make sitemap/robots tenant-aware.
- [ ] Make tenant branding cache-aware.

## 8.2 Custom domains — P1 / plan-gated

- [ ] **BLOCKED:** Select DNS/TLS automation strategy/provider.
- [ ] Add custom-domain request.
- [ ] Generate ownership verification challenge.
- [ ] Verify DNS.
- [ ] Verify TLS readiness.
- [ ] Activate only after verification.
- [ ] Support primary/canonical domain.
- [ ] Support domain removal.
- [ ] Prevent stale domain takeover/reassignment.
- [ ] Audit domain changes.
- [ ] Entitlement-gate custom domains by plan.

## 8.3 Tenant-aware frontend state

- [x] Unknown store page.
- [x] Provisioning/not-ready page.
- [x] Suspended store page according to approved business policy.
- [ ] Domain verification pending state.
- [ ] Tenant branding load failure fallback that does not display another tenant's branding.
- [ ] Tenant-specific support contacts/policies.

### MT-5 gate

- [ ] Tenant A and tenant B render different storefronts/data/settings on distinct hosts.
- [ ] Cache/CDN behavior cannot leak branding/catalog/settings between hosts.
- [ ] Unknown and removed domains are safe.

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
- [ ] Define integration/provider entitlement if applicable.
- [ ] Store entitlement evaluation server-side.
- [ ] Do not rely on hidden/disabled frontend controls for enforcement.
- [ ] Add owner-visible current plan and usage.
- [ ] Add upgrade-required errors with stable machine codes.

## 9.2 Subscription lifecycle

- [x] Implement trialing if approved. (startTrial, default 14 days per PO-002)
- [x] Implement active.
- [x] Implement past-due/grace period if approved. (7-day window from latest PAST_DUE event, PO-004 — unit-tested incl. override)
- [x] Implement suspended/restricted. (checkout denial CHECKOUT_DISABLED_SUSPENDED per PO-005; storefront stays browsable)
- [x] Implement cancelled/non-renewing.
- [x] Implement reactivation. (PAST_DUE/SUSPENDED/CANCELLED → ACTIVE)
- [x] Preserve tenant data across non-destructive subscription state changes. (plan-limit lifecycle integration spec: every historical order survives an upgrade AND a downgrade byte-for-byte)
- [ ] Define storefront behavior when subscription is overdue.
- [ ] Define Tenant Admin behavior when subscription is overdue.
- [x] Keep billing lifecycle separate from organization/database lifecycle.

## 9.3 SaaS billing

- [x] Build platform billing adapter interface.
- [x] Approve SaaS subscription payment provider(s). (PO-006: SSLCOMMERZ first, abstraction preserved)
- [x] Store platform payment attempts in control plane.
- [ ] Add invoices/receipts.
- [x] Add webhook verification/idempotency. (server-side val_id validation; single-transition INITIATED→SUCCEEDED/FAILED; duplicates absorbed)
- [ ] **PARTIAL:** Add retry/recovery. (failed sessions recorded with reasons and can be re-initiated as fresh attempts; automated recovery sweep pending)
- [x] Add billing history.
- [ ] Add manual/admin adjustment workflow with audit if required.
- [ ] Never write SaaS subscription payments into tenant `Payment`, `Wallet`, COD, refund, or settlement records.

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
- [ ] Downgrade does not destroy historical data.
- [x] Limit exceeded is enforced concurrently. (evaluate() limit+usage semantics unit-tested; atomic counters in UsageService)
- [x] Suspended subscription blocks only approved capabilities.
- [ ] Internal/free entitlement is explicit and audited.

### MT-6 gate

- [x] One test tenant can subscribe/activate, hit a plan limit, upgrade, and unlock the capability. (subscription/trial activation covered by the subscriptions unit suite; `test/plan-limit-lifecycle.integration-spec.ts` proves the full enforcement loop against REAL PostgreSQL — placement succeeds under limit, third order denied server-side with PLAN_LIMIT_REACHED and zero partial state, upgrade unlocks without touching tenant rows, downgrade blocks again)
- [ ] SaaS billing is financially and technically isolated from customer commerce billing.

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
- [ ] Make Hero content tenant-local.
- [x] Make catalog search/filter cache tenant-aware. (catalog reads resolve per tenant; no shared cache layer exists to leak across)
- [ ] Tenant-scope product media object keys/metadata.
- [x] Prove tenant A unpublished/product IDs cannot be queried from tenant B. (`tenant-bootstrap.integration-spec.ts`: identical product IDs/slugs seeded into two real PostgreSQL databases; A publishes, B stays draft; publish-filtered read returns 1 in A, 0 in B)
- [ ] Prove storefront SEO/catalog caches cannot cross tenants.

## 10.2 Inventory

- [x] Stock movements/reservations/concurrency foundations exist.
-[x] Move inventory transactions behind tenant client. (adjustment/movement flows inside `CatalogService` swept; reservation consumption inside `OrderService` transactions)
- [ ] Tenant-scope reconciliation jobs and idempotency keys.
-[x] Tenant-scope low-stock alerts. (`getInventory` low-stock computation resolves through the tenant client)
- [ ] **PARTIAL:** Tenant-scope exports. (orders export routed through tenant client; remaining export surfaces pending)
-[x] Preserve finite-stock concurrency guarantees independently per tenant. (serializable confirmation transactions execute on the resolved tenant client — same mechanism proven under concurrency)
-[x] Validate same SKU can exist independently across tenant databases. (bootstrap integration suite proves identical identifiers coexist)

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
- [ ] **PARTIAL:** Prove order history reorder ownership + tenant checks. (ownership enforced against the caller's linked customer profile; reorder resolves through the tenant client — cross-database integration case lands with the orders-module slice)

## 10.4 Customers, addresses, identity, notifications

- [x] Customer profile/address/order-history foundations exist.
- [x] Private notification inbox exists.
- [x] Define customer identity tenancy policy. (PO-015: tenant-local for Release 1)
- [x] Tenant-scope customer profile/history.
- [x] Tenant-scope addresses.
- [x] Tenant-scope notification inbox. (`CustomerNotificationsService` resolves through the tenant client; BullMQ-side dispatch resolution lands with MT-8)
- [x] Tenant-scope abandoned-cart eligibility. (eligibility query resolves through the tenant client inside swept CartService)
- [x] Prevent customer search in Tenant Admin from crossing databases. (`CustomersService` swept)
- [ ] Tenant-scope analytics/customer metrics.

## 10.5 Orders and COD

- [x] Idempotent orders and lifecycle state rules exist.
- [x] Tenant-scope order reference generation/prefix. (`OrderService` resolves through the tenant client; references are unique per database by construction)
- [x] Tenant-scope idempotency keys.
- [x] Tenant-scope order history and audit. (audit rows written inside the same tenant transaction)
- [x] Tenant-scope COD policy.
- [x] Tenant-scope confirmation queues.
- [x] Tenant-scope public/signed tracking.
- [ ] **PARTIAL:** Prove same human-readable reference/prefix cannot cause cross-tenant lookup. (references unique per database by construction; product-level cross-read proof landed — order-reference cross-read case rides the two-tenant vertical spec in CI)

## 10.6 Commerce payments

- [x] Provider-neutral prepaid architecture exists.
- [ ] Move payment provider configuration to tenant-secure integration configuration.
- [ ] Tenant-scope provider credentials/secrets.
- [x] Tenant-scope merchant references/idempotency. (attempts/callbacks resolve per tenant database; unique references scoped by construction)
- [x] Resolve webhook/callback tenant without trusting customer browser input. (HMAC-signed `cbt` token minted at initiation and embedded in gateway callback URLs; verified timing-safe server-side before any mutation — forgery fails closed with PAYMENT_CALLBACK_TENANT_INVALID)
- [ ] Define provider account mapping to tenant.
- [x] Verify callback cannot mutate another tenant's payment. (token binds organization; processing runs inside that tenant's context/database — cross-tenant mutation has no resolution path)
-[x] Tenant-scope payment recovery/sweeps. (`enqueueDue` fans out per READY tenant; expiry processor resolves envelopes via forOrganization)
-[x] Tenant-scope reconciliation. (scheduled scans fan out per READY tenant with isolated failure evidence)
-[x] Preserve platform SaaS billing separation. (SaasInvoice/SaasPaymentAttempt live exclusively in the control plane; no code path bridges them into tenant commerce records)

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
- [ ] Tenant-scope courier integrations and credentials.
-[x] Tenant-scope shipment callbacks/polls. (`ShippingService` resolves through the tenant client; callback tenant binding rides the HMAC cbt token)
- [x] Tenant-scope rider application.
- [x] Tenant-scope rider personnel approval.
- [x] Tenant-scope assignment.
- [x] Tenant-scope duty state.
- [x] Tenant-scope GPS history.
- [ ] **PARTIAL:** Tenant-scope WebSocket/live-map rooms. (all existing socket room families — conversations, tasks, admin, notifications — are org-scoped; a dedicated rider live-map emitter does not exist server-side yet)
- [x] Tenant-scope location-history clearing.
-[x] Prevent rider session from tenant A acting on tenant B order. (`DeliveryPersonnelService` resolves through the tenant client; assigned-order lookup is scoped to the same database — cross-tenant action has no resolution path)
- [ ] Preserve COD staff-confirmation rule per tenant.
- [ ] Add location retention policy.

## 10.9 Returns, refunds, RTO, settlement, reconciliation

- [x] Existing post-purchase/reconciliation foundations exist.
- [ ] Tenant-scope every return/refund/RTO/settlement record.
- [x] Tenant-scope scheduled reconciliation runs.
- [x] Tenant-scope settlement imports and evidence. (`SettlementImportsService` resolves every import/classify/persist/claim path through the tenant client)
- [ ] Tenant-scope BullMQ job IDs.
- [ ] Tenant-scope manual retry actions.
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
- [ ] Tenant-scope media/evidence.
- [ ] Tenant-scope outlet inventory/pickup configuration.
- [ ] Tenant-scope moderation and Admin queues.
- [ ] Add cross-tenant ownership tests.

## 10.11 Chat and real-time communication

- [x] Chat foundation exists.
- [ ] Tenant-scope socket tickets.
- [x] Tenant-scope rooms/channels. (conversations, tasks, admin role rooms, and every server-side emission path are org-prefixed; task-room Redis presence lists are scoped by the same names)
- [x] Tenant-scope conversation lookup/history. (chat REST swept; realtime rooms namespaced in MT-8)
- [ ] Tenant-scope quick replies/folders if configurable.
- [x] Reject cross-tenant socket subscriptions. (org-scoped rooms unreachable from foreign tickets)
- [x] Add multi-client E2E with two tenants active simultaneously. (`test/socket-isolation.integration-spec.ts`: four live WebSocket clients — same-userId admins of org-a/org-b plus org-bound guests — over a real socket.io server; connection rooms, tenant-scoped notifications and chat relay proven isolated on the wire; foreign guest join denied)

## 10.12 Reports, analytics, purchase activity, audit, settings, health

- [x] Existing reports/audit/settings/health foundations exist.
- [ ] **PARTIAL:** Tenant-scope report queries. (`ReportsService` overview/export resolve via tenant client; deeper report families follow the same pattern)
- [ ] **PARTIAL:** Tenant-scope exports. (orders export routed through tenant client; remaining export surfaces pending)
- [x] Tenant-scope purchase activity/social proof.
- [ ] Clarify that "Global Order History" means tenant-global only.
- [ ] **PARTIAL:** Tenant-scope feature flags/settings. (`SettingsService` — all settings CRUD/pagination/delete paths now resolve through the tenant client; platform-vs-tenant feature-flag separation still open)
- [ ] Separate platform feature flags from tenant feature flags.
- [ ] Tenant-scope operations health while keeping platform health separate.
- [ ] Ensure Platform Admin aggregate metrics use approved metadata/aggregation and do not expose tenant PII by default.
- [ ] Tenant-scope audit logs.
- [ ] Add support-access audit linking when Platform Support views tenant data.

### 10.4A Transactional messaging outbox (pulled forward)

- [x] `TransactionalMessagingService` (outbox, templates, attempts evidence) resolves through the tenant client — messages can never be orphaned from the tenant orders they reference.
- [x] Transactional-message dispatch + payment-expiry sweeps now fan out per READY/ACTIVE tenant (`TenantFanoutService`), processors resolve envelopes via `forOrganization`. Remaining flag-on blockers shrink to: courier polling/callback-retry sweeps, reconciliation schedule, socket room namespacing (§11.3), and integration credential vault (§11.5).

### 10.13 Commerce service sweep inventory (completed)

All commerce-plane services now resolve through `TenantDbService` (`db()` helper + `@Optional() tenantDb` injection; legacy fallback outside resolved requests):

Catalog, Cart, Checkout, Order, Shipping (+ CourierRouter), ShippingPolling, CommercePayments, Wallet, CustomerNotifications, Customers, **CustomerAccount**, **StaffAccess**, DeliveryPersonnel, Reconciliation, Refunds, Reports, Returns, RTO, Settlements (**+ SettlementImports**), Settings (CommerceSettings **+ admin SettingsService**), StorefrontAnalytics, PurchaseActivity, TransactionalMessaging, Chatting (Conversation + Message), ServiceBooking, Warranty, ProductContent (reviews/banners), ProductRequest, StoreLocations.

Intentionally NOT swept (documented boundaries): `auth`/`two-factor`/`oauthAccount`/`userDevices`/`userProfile`/`user` (identity plane — PO-015 auth-migration decision), `operations-health` (platform-scoped by design), `audit.service` (writes into whatever client the caller passes — per-DB by construction). Socket identity/room services were subsequently swept with MT-8 WebSocket isolation; org propagation rides the socket ticket.

### MT-7 gate

- [ ] Every existing protected commerce controller/service has a documented tenant boundary.
- [ ] Automated tests cover at least two tenants for every high-risk financial/identity/real-time module.
- [ ] No legacy single-store global setting or default tenant DB remains on production request paths.

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
- [ ] Tenant-scope catalog/settings caches.
- [x] Tenant-scope idempotency keys.
- [ ] Tenant-scope distributed locks.
- [x] Add collision tests using identical record IDs in two tenants. (`src/tenancy/redis-collision.spec.ts`: scopedRedisKey, OTP keys, and settings cache keys all diverge per organization for identical identifiers; legacy key shape preserved outside contexts)

## 11.2 BullMQ

- [ ] Inventory every queue.
- [x] Add tenant ID to trusted job envelope. (transactional dispatch + payment expiry jobs carry `organizationId` from the fan-out context; type-extended)
- [x] Validate tenant registry record before job DB access.
- [x] Resolve tenant DB inside worker from control plane. (`TenantFanoutService.forOrganization` → registry → bounded manager → immutable context)
- [x] Tenant-scope job IDs/deduplication keys. (`t:{orgId}:...` prefixes)
- [x] Tenant-scope scheduled jobs. (courier polling, courier callback-retry, reconciliation scans — all fan out per READY tenant; retries carry org envelopes captured at enqueue time)
- [x] Prevent a poisoned/forged job from selecting arbitrary DB URL. (workers only accept organizationId and resolve via registry — never connection strings)
- [ ] **PARTIAL:** Add dead-letter/failure evidence with tenant context. (fan-out failures recorded per-org in sweep outcomes + structured logs; BullMQ dead-letter retention policy pending)
- [ ] **PARTIAL:** Add per-tenant operational metrics where useful. (fanout outcomes expose processed/tenantFailures per sweep; durable metrics storage remains §22 work)
- [x] Prove one tenant's failed jobs do not starve the entire queue. (`forEachTenant` isolates per-org failures with recorded evidence — unit-tested with an injected failing database)

## 11.3 WebSockets

- [x] Resolve tenant during socket authentication.
- [x] Bind socket ticket/session to tenant. (tickets minted inside tenant-resolved requests embed `organizationId`; `SocketUser` propagates it)
- [x] Prefix rooms with tenant identity. (`scopedSocketRoom` applied to personal/conversation/role/admin joins and message emissions; identical room IDs across tenants can never share a channel)
- [x] Tenant-scope Admin chat. (org-bound admin sockets join ONLY org-prefixed role/admin rooms at connection; the message relay broadcasts to sender-scoped admin rooms so one tenant's chats can never reach another's console; REST-initiated chat mutations via `emitToRoom` resolve the ambient tenant)
- [ ] Tenant-scope rider live map. (no server-side WebSocket live-map emitter exists yet — location surfaces are poll-based; scope the room when realtime lands)
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
- [ ] Encrypt provider secrets.
- [ ] Redact secrets from Admin/API/logs.
- [ ] Tenant-scope payment providers.
- [ ] Tenant-scope courier providers.
- [ ] Tenant-scope transactional messaging providers/templates.
- [ ] Tenant-scope Google/Meta integrations where later enabled.
- [ ] Add credential rotation workflow.
- [ ] Add readiness/health without leaking secrets.

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
- [ ] Domain health.
- [x] Tenant DB health. (fleet view surfaces registry status + schema version per tenant database)
- [x] Platform billing outcomes. (`GET /platform/billing/invoices` + `/billing/payment-attempts`; Billing console page with invoice/payment tables and PAID/OPEN states)
- [x] Usage/limit alerts. (`usage_warning_threshold_crossed` counter + structured warn exactly once per crossing; per-org Usage card on the console organization detail renders NEAR LIMIT states and a "Recount from facts" reconcile action)
- [ ] Queue/system health.
- [ ] Backup status.
- [ ] Security/support-access alerts.

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
- [ ] Manual billing operations require explicit permission/reason/audit.
- [ ] Add internal/free entitlement state if approved.
- [ ] Add tenant-specific override with expiry/reason if approved.

## 12.4 Tenant operations

- [x] Provisioning retry. (console "Run provisioning" action replays the resumable orchestrator; per-step timeline evidences recovery)

- [ ] Tenant migration canary/batch control.
- [ ] Pause rollout.
- [ ] Retry failed tenant.
- [ ] DB health probe.
- [x] Schema version drift view. (Database Health page highlights any tenant database behind the canonical head)
- [ ] Backup evidence.
- [ ] Restore workflow status.
- [ ] Domain verification diagnostics.
- [ ] Tenant cache invalidation where safe.

## 12.5 Support access

- [x] Request support access. (API landed MT-1)
- [x] Require reason. (≥10 chars enforced server-side)
- [ ] Require tenant authorization where policy demands it.
- [x] Set expiry. (5min–8h TTL clamp)
- [ ] Restrict scope/permissions.
- [ ] Record every support action.
- [x] Revoke immediately. (console revoke button + `revoke()` audit)
- [ ] Display active support sessions prominently.

### MT-9 gate

- [ ] Ferio operators can manage tenant lifecycle without direct DB shell access for normal operations.
- [ ] Platform Admin is not an unrestricted universal tenant superuser.

---

# 13. Release MT-10 — Tenant Admin and Storefront SaaS Experience

## 13.1 Tenant owner onboarding

- [x] Invitation/first-login flow.
- [ ] Organization/store setup wizard.
- [ ] **PARTIAL:** Store identity. (tenant-scoped via CommerceSettings; surfaced in the Store Setup checklist card — full consolidated wizard remains polish)
- [ ] Logo/branding.
- [x] Support contacts.
- [ ] Currency/timezone.
- [ ] Order prefix.
- [x] Delivery zones.
- [ ] COD policy.
- [ ] Payment configuration.
- [ ] Courier configuration.
- [ ] Notification configuration.
- [ ] Initial catalog/import guidance.
- [ ] Subscription/plan summary.
- [ ] Usage/limit summary.
- [ ] Domain status.

## 13.2 Tenant Admin entitlement UX

- [ ] **PARTIAL:** Navigation hides or labels unavailable plan features. (Plan & Usage card on the admin dashboard surfaces plan, usage vs limits and limit-reached labels; full nav gating pending)
- [x] Backend remains authoritative.
- [ ] Upgrade CTA for plan-gated features.
- [ ] Limit warnings before hard limits.
- [x] Stable errors when limit reached. (`PLAN_LIMIT_REACHED` / `FEATURE_DISABLED` / `SUBSCRIPTION_INACTIVE` from EntitlementsService)
- [ ] Downgraded tenant can still access historical records appropriately.
- [ ] Suspended tenant gets approved read/write restrictions.

## 13.3 Tenant branding

- [ ] Tenant storefront logo.
- [ ] Tenant name.
- [ ] Hero Showcase.
- [ ] Contact information.
- [ ] Policies.
- [ ] Social links.
- [ ] Theme tokens only within approved customization boundary.
- [ ] No tenant-supplied unsafe arbitrary script/CSS by default.
- [ ] Cache invalidation after branding update.

## 13.4 Storefront tenant behavior

- [ ] Tenant-aware catalog.
- [ ] Tenant-aware cart cookies/session.
- [ ] Tenant-aware auth/customer account.
- [ ] Tenant-aware checkout/payment.
- [ ] Tenant-aware tracking.
- [ ] Tenant-aware wallet.
- [ ] Tenant-aware warranty/services/chat.
- [ ] Tenant-aware support information.
- [ ] Tenant-aware SEO.
- [ ] Unknown/suspended domain states.

### 13.2A Server-side entitlement enforcement hooks (landed)

- [x] Order placement evaluates `orders_per_month` before work begins and meters usage post-commit (non-blocking; metering can never fail an order).
- [x] Product creation evaluates `products_max` against the tenant's own live catalog count.
- [x] All gates activate only inside a resolved tenant context — legacy mode unaffected — and deny with stable machine codes.
- [x] Staff-seat hook on invitations. (`PLAN_GATE` + `ORG_MEMBERS_COUNTER` tokens; active-member count feeds the evaluation; over-limit invites throw `PLAN_LIMIT_REACHED`)

### MT-10 gate

- [ ] A business owner can receive a tenant, configure it, publish products, receive an order, fulfill it, and see only that business's data.
- [ ] A second tenant can perform the same flow concurrently with no shared state.

---

# 14. Release MT-11 — Tenant Migration Orchestration

Database-per-tenant requires fleet migration tooling before production tenant count grows.

## 14.1 Migration packaging

- [ ] Define canonical tenant Prisma schema.
- [ ] Define canonical migration artifact/version.
- [ ] Record expected schema version in control plane.
- [ ] Make migration artifact immutable once released.
- [ ] Add compatibility metadata if application version requires minimum schema version.
- [ ] Separate control-plane migrations from tenant-plane migrations.

## 14.2 Migration orchestrator

- [x] Discover eligible tenant DBs. (READY + ACTIVE org, ordered)
- [x] Preflight tenant DB connectivity. (bootstrap opens a real connection; failures recorded per-tenant)
- [x] Verify current version.
- [x] Apply canary tenant migration.
- [x] Run post-migration health checks. (schemaVersion stamped; registry health recorded)
- [x] Roll out in bounded batches. (sequential batches sized by run concurrencyLimit)
- [x] Limit concurrency. (1–10 clamp at API boundary)
- [x] Record per-tenant result. (TenantMigrationResult upserted for success AND failure with detail)
- [ ] Retry transient failures.
- [x] Stop/pause on failure threshold. (two consecutive-failure case unit-tested)
- [x] Isolate one failed tenant without blocking already healthy tenants unnecessarily. (healthy members of a batch complete before the pause)
- [x] Prevent application from serving incompatible schema silently.
- [x] Provide operator resume/retry. (resume skips already-successful tenants via recorded results)
- [x] Provide migration fleet dashboard. (console /migrations: start form, fleet results tables, pause/resume controls)

## 14.3 Migration safety

- [ ] Back up before high-risk migrations.
- [ ] Define expand/migrate/contract pattern for breaking changes.
- [ ] Avoid destructive schema changes in one step.
- [ ] Test old app/new schema and new app/transition schema compatibility where rollout requires it.
- [ ] Add migration timeout.
- [ ] Add lock/contention strategy.
- [ ] Add rollback/forward-fix runbook.
- [ ] Never run uncontrolled `prisma migrate deploy` against every tenant simultaneously from application startup.

## 14.4 Validation

- [ ] Create at least 10 disposable tenant DBs.
- [ ] Migrate all successfully.
- [ ] Inject one failing tenant.
- [ ] Prove remaining tenants are handled according to rollout policy.
- [ ] Prove retry after repair.
- [ ] Prove schema-version reporting.
- [ ] Prove app rejects/isolates incompatible tenant safely.

### MT-11 gate

- [ ] Canary → batch → fleet migration works with one intentionally failing database.
- [ ] Production deployment does not depend on manually migrating tenant DBs one by one.

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
- [ ] Restore tenant without overwriting another.
- [ ] Verify schema version after restore.
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
- [ ] Prevent domain takeover after closure.
- [x] Preserve required platform billing/audit evidence.

### MT-12 gate

- [ ] One tenant can be restored independently from backup.
- [ ] A documented closure flow exists before accepting production tenants.

---

# 16. Release MT-13 — Observability, Security, Performance, and SaaS Hardening

## 16.1 Observability

- [x] Add organization/tenant ID to safe structured logs. (`StructuredLogger` stamps `organizationId`/`hostname` on every JSON entry via a bootstrap-registered context accessor — registry IDs only, never credentials)
- [x] Add resolved domain where safe. (hostname rides the same envelope from the trusted `TenantContext`)
- [x] Add tenant DB connection metrics. (`db_acquire_failure` / `db_breaker_opened` counters emitted per tenant database)
- [ ] Add provisioning metrics.
- [ ] Add migration fleet metrics.
- [x] Add subscription/entitlement denial metrics. (`entitlement_denied{code,featureKey}` counted at every server-side denial in `EntitlementsService.evaluate`)
- [x] Add unknown-domain metrics. (`resolver_unknown_domain` / `resolver_suspended` / `resolver_tenant_unavailable` / `resolver_migration_required` counted at each fail-closed branch)
- [x] Add per-tenant queue failure visibility. (`queue_tenant_failure{label,organizationId}` counted per isolated fan-out failure; snapshots carry org labels)
- [ ] Add platform billing metrics.
- [ ] Add backup freshness metrics.
- [ ] Add support-access security events.
- [ ] **PARTIAL:** Add alerting for isolation-critical failures. (counters surface as periodic structured `tenant_metrics_snapshot` events any log pipeline can alert on; dedicated alert routing awaits metrics-stack decision)

## 16.2 Security tests

- [ ] Host-header manipulation tests.
- [ ] Cross-tenant JWT/session replay tests.
- [ ] IDOR tests using same IDs across tenant DBs.
- [ ] Tenant Admin → Platform Admin privilege escalation tests.
- [ ] Platform Support access expiry/revocation tests.
- [ ] Cross-tenant saved-cart token tests.
- [ ] Cross-tenant wallet tests.
- [ ] Cross-tenant payment callback tests.
- [ ] Cross-tenant rider assignment/GPS tests.
- [ ] Cross-tenant WebSocket room tests.
- [ ] Cross-tenant Redis collision tests.
- [ ] Cross-tenant file/object access tests.
- [ ] Unknown/suspended/deleted tenant tests.
- [ ] SSR/BFF tenant-confusion tests.
- [ ] Cache poisoning/leak tests.

## 16.3 Performance and scale

- [x] Load-test tenant resolver. (cached hot load: 2,000 interleaved resolutions in ~15ms with exactly 2 control-plane queries; evidence lines in performance-baseline suite)
- [ ] Load-test connection manager.
- [ ] Load-test 10/50/100+ active tenant simulations.
- [x] Measure cold tenant DB connection latency. (~105ms cold vs <1ms warm median against local PostgreSQL — recorded per run as structured evidence)
- [x] Measure cached tenant resolution. (same suite; positive/negative cache effectiveness asserted by query counts, not wall-clock alone)
- [ ] Test pool exhaustion behavior.
- [ ] Test noisy-neighbor queue behavior.
- [ ] Test one slow tenant DB.
- [ ] Test control-plane outage behavior.
- [ ] Define safe degraded behavior; never bypass tenant authorization.
- [ ] Establish capacity thresholds for when database connection strategy must change.

## 16.4 Dependency/security hygiene

- [ ] **PARTIAL:** CI dependency audit. (strict typecheck incl. specs now a CI gate; dependency-audit job pending)
- [ ] Secret scan.
- [x] SAST/lint/typecheck.
- [x] Production builds for all web apps/backend. (CI matrix: backend, Customer Web, Admin Web, Platform Admin)
- [ ] Prisma migration validation.
- [ ] Tenant-isolation integration suite mandatory in CI.
- [ ] Prevent merge if critical isolation tests fail.

### MT-13 gate

- [ ] Security review finds no known path for tenant A to read/write tenant B data.
- [ ] Capacity test demonstrates bounded DB connection behavior.
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
- [ ] Platform Admin support access is audited and constrained.
- [ ] No production request path can fall back to the original single-tenant DB.
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

- [ ] Backend lint/typecheck/build.
- [ ] Backend unit suite.
- [ ] Control-plane Prisma migration validation.
- [ ] Tenant-plane Prisma migration validation.
- [ ] Disposable control-plane PostgreSQL integration tests.
- [ ] At least two disposable tenant PostgreSQL databases.
- [ ] Cross-tenant isolation suite.
- [ ] Redis/BullMQ isolation tests for affected modules.
- [ ] WebSocket isolation tests for affected realtime modules.
- [ ] Storefront production build.
- [ ] Tenant Admin production build.
- [ ] Platform Admin production build.
- [ ] Rider surface production build.
- [ ] Secret scan.
- [ ] Dependency/security audit.
- [ ] Migration compatibility check.
- [ ] No use of production tenant credentials in CI.
- [ ] Fail build on critical tenant-isolation regression.

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
- [ ] Platform support access is explicit and audited.
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
