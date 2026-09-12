# Platform, Tenancy, Shared Security, and Test Patterns

This chapter is based on the platform/tenancy/shared-library inventory and
representative focused tests. It is the final broad architecture slice for the
pattern curriculum, not a claim that every platform file has been manually
reviewed.

## 279. Immutable AsyncLocalStorage tenant context

The resolver creates a frozen tenant context and downstream services read it
through `AsyncLocalStorage`. Tenant identity is not copied from arbitrary
request fields by feature code.

- Source: `src/tenancy/context/tenant-context.ts`
- Failure mode: mutable ambient identity changing halfway through a request.

## 280. Fail-loud tenant context access

Tenant-scoped code throws when accessed outside a resolved tenant request. The
legacy fallback is explicit at database boundaries rather than silently guessed.

- Source: tenant context and `resolveTenantDatabase`
- Test: tenant context/database service specs
- Failure mode: a background or admin request accidentally reading a storefront DB.

## 281. Host-to-control-plane resolution boundary

The resolver maps a normalized trusted host to control-plane organization,
domain, and tenant-database material before business services execute.

- Source: `tenant-resolver.service.ts`
- Tests: resolver and middleware cache-boundary specs
- Failure mode: accepting a client-selected organization id.

## 282. Tenant database manager with bounded client cache

Tenant clients are acquired from a manager with pool/client limits and eviction
behavior. Cold acquisition, warm reuse, and churn are measured separately.

- Source: `tenant-database.manager.ts`
- Test: performance baseline and manager specs
- Failure mode: one process opening unbounded PostgreSQL clients.

## 283. Bounded tenant fanout

Platform jobs enumerate ready tenant registries in pages and execute work under
a configurable concurrency bound. One tenant failure is recorded without
starving healthy tenants.

- Source: `tenant-fanout.service.ts`
- Test: fanout pagination, capacity, failure-isolation, and fairness cases
- Failure mode: a fleet-wide task becoming a serial bottleneck or thundering herd.

## 284. Stamped tenant worker boundary

Queue jobs carry organization identity and workers re-enter that organization
through a fanout/context runner before using tenant services. Missing context in
strict mode is rejected.

- Source: worker-boundary services/processors
- Test: `tenant-worker-boundaries.spec.ts`
- Failure mode: a queue worker using whichever tenant context was last active.

## 285. Membership guard cache with pub/sub invalidation

Tenant membership checks use a scoped cache, and membership changes publish
targeted invalidation messages so multiple application instances converge before
TTL expiry.

- Source: `tenant-membership.guard.ts`
- Test: `tenant-membership.pubsub.spec.ts`
- Failure mode: revoked staff access remaining usable on another instance.

## 286. Tenant suspension commerce guard

Suspended tenants may retain safe reads while commerce writes are blocked by a
shared guard. Feature services call the guard before mutation instead of each
inventing suspension logic.

- Source: `commerce-write-guard.util.ts` and suspension guard
- Tests: commerce-write and suspension specs
- Failure mode: one write endpoint bypassing a suspended subscription.

## 287. Bounded retention sweep

Retention scans only ready active tenant databases, deletes in bounded batches,
honors per-rule budgets, and isolates a failing tenant from the rest of the
fleet sweep.

- Source: `retention-sweep.service.ts`
- Test: retention sweep service specs
- Failure mode: destructive cleanup exceeding a tenant's intended scope.

## 288. Platform/tenant database split

Organizations, domains, plans, subscriptions, tenant registry, and provisioning
state belong to the platform client; storefront business data belongs to the
tenant client. Services must choose the boundary deliberately.

- Source: `platform-prisma.service.ts`, platform services, tenant DB service
- Failure mode: control-plane secrets or cross-tenant business rows in the wrong DB.

## 289. Durable provisioning step journal

Tenant provisioning records durable steps and statuses so a failed run can be
resumed or diagnosed. Side effects are not represented only by an in-memory
boolean.

- Source: provisioning services and tenant database provisioner interface
- Test: provisioning service specs and tenant bootstrap integration tests
- Failure mode: retrying a partial provision as if it were a clean install.

## 290. Organization creation versus tenant identity bootstrap

Platform owner membership and tenant-database user identity are distinct
records. Organization creation alone does not prove that a tenant admin can log
into the storefront.

- Source: organizations/provisioning services and tenant schema bootstrapper
- Release implication: owner bootstrap must be verified as an end-to-end gate.

## 291. Secret-box credential storage

Platform/provider credentials use authenticated encryption with a configured key;
malformed or tampered envelopes fail closed and safe metadata is used in audit
events.

- Source: `src/platform/utils/secret-box.ts` and provider credential utilities
- Failure mode: treating encrypted-looking text as trusted without authenticity.

## 292. Time-bounded support access

Platform support access is represented by an explicit grant with scope and
expiry, checked before access, and recorded for operator accountability.

- Source: support-access DTO/service/controller
- Test: support-access service specs
- Failure mode: permanent or organization-wide support access from one approval.

## 293. Plan entitlement and usage enforcement

Entitlement evaluation and usage metering are server-side platform decisions.
Usage counters need idempotent references so retries do not consume capacity
twice.

- Source: `entitlements.service.ts`, plan gate, usage services
- Tests: entitlement, plan lifecycle, and usage specs
- Failure mode: frontend-only limits or double-counted usage.

## 294. Domain readiness aggregate

Domain readiness combines verification, TLS/routing, organization status, and
tenant database readiness before a hostname is treated as active.

- Source: `domain-readiness.service.ts` and domain services
- Failure mode: exposing a hostname before its tenant DB is usable.

## 295. Backup evidence freshness

Backup evidence is represented with timestamps, scope, status, and restore
attestation rather than a boolean “backups enabled” setting.

- Source: backup-evidence controller/service and DTOs
- Test: backup evidence service specs
- Failure mode: claiming recovery readiness without a recent verifiable artifact.

## 296. Correlation-aware sanitized structured logging

Shared logging adds correlation and tenant-safe registry context while redacting
tokens, credentials, URLs, and sensitive error text. Logs are operational
evidence, not a dumping ground for request bodies.

- Source: `libs/common/src/utils/structured-logger.ts`, log sanitizer, request context
- Tests: structured logger, log sanitizer, and request-context specs
- Failure mode: useful traces becoming credential leaks.

## 297. Guard/decorator authorization composition

Authentication, role, permission, tenant membership, rate limits, and public
route metadata are composable decorators/guards. Controllers declare the policy;
services still enforce ownership and domain invariants.

- Source: `libs/common/src/guards`, decorators, and core security tests
- Failure mode: relying on one guard to replace service-level ownership checks.

## 298. Disposable integration-test database evidence

Integration tests validate migrations, tenant bootstrap, two-tenant isolation,
concurrency, queues, sockets, and provider callback behavior against disposable
test databases or controlled runtime doubles.

- Source: `test/` integration and queue-smoke suites
- Failure mode: treating unit mocks as proof of database, Redis, or worker behavior.

## Audit boundary

This chapter closes the broad pattern curriculum, but not the full repository
audit. The matrix remains the authoritative list of areas needing route-level
review, API-documentation reconciliation, and runtime evidence.
