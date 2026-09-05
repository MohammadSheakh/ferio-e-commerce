---
name: ferio-backend-architecture-old
description: Design, implement, or review Ferio NestJS backend modules using the project's multi-tenant Prisma architecture, security boundaries, operational conventions, and scalability standards.
---

# Ferio Backend Architecture

Use this skill for backend work in `ferio-nest-prisma`, especially when creating a new module, extending an existing domain, reviewing a backend change, or assessing readiness for high-scale multi-tenant traffic.

## Operating Standard

- Work as a senior solution architect and senior NestJS engineer.
- Inspect the existing codebase before proposing or editing code. Follow the established architecture where it is sound; do not copy legacy patterns merely because they exist.
- Be brutally honest about defects, security risks, tenancy leaks, scalability limits, missing tests, and operational gaps. Findings must be specific, actionable, and tied to files and lines.
- Do not claim support for a million concurrent users from static code inspection. Separate architectural readiness from proven capacity, and require load tests, database limits, queue capacity, cache behavior, observability, and failure testing before making that claim.
- Preserve unrelated user changes. Do not change documentation, environment files, generated clients, migrations, or deployment configuration unless the task requires it.

## Architecture Boundaries

Ferio has two database planes:

- The platform/control-plane PostgreSQL database is accessed through `PlatformPrismaService` and platform services.
- Each tenant commerce database is resolved from trusted tenant context and accessed through `TenantDbService`.

Never select a tenant database from a request body, query parameter, route parameter, or caller-supplied connection string. Tenant identity must come from the trusted host/domain resolution and immutable `TenantContext`.

For tenant-scoped modules:

- Import `PrismaModule`, `TenancyModule`, and the required authentication/authorization modules explicitly.
- Use `const db = await this.tenantDb.get()` for tenant-only code. This must fail loudly outside a resolved tenant request.
- Use `tryGet()` only for an explicitly documented migration or legacy compatibility path. Never allow an undocumented silent fallback to the base `PrismaService`.
- Ensure every module that injects `TenantDbService` imports `TenancyModule`; optional injection must not hide missing dependency wiring.
- Keep platform services on `PlatformPrismaService`; never mix platform records with tenant commerce records.

## API And TypeScript Contract

- REST routes are exposed below the configured global `api/v1` prefix. Use
  plural resource nouns, stable nested resources for ownership, and an
  explicit `admin/` route namespace for tenant-operator actions.
- Controllers accept validated DTOs and typed `@User()` principals; do not
  read arbitrary `request.user` shapes or use `req: any`.
- Preserve the existing response transformation and stable error envelope;
  domain failures should expose stable error codes rather than database or
  provider internals.
- Type every application-owned value. `noImplicitAny` does not prohibit
  explicit `any`, so new code must use `unknown`, DTOs, Prisma payload/input
  types, discriminated unions, or a narrow adapter interface instead.
- Legacy Mongoose, file-upload, OAuth-profile, socket payload, queue, and SDK
  boundaries must have named adapter types and a migration issue; they are
  not a reason to spread `any` into domain services.

## Module Shape

New modules should normally contain:

- `module.ts` with explicit, clean dependency imports
- One or more focused controllers
- One domain service per cohesive responsibility
- DTOs under `dto/` with strict validation
- Unit tests for the service and high-risk authorization/data paths
- Queue processors, policies, repositories, or utilities only when the domain needs them

### Feature folder convention

Organize the backend by bounded feature context. Keep the module boundary and
its owned runtime roles visible in the filesystem:

```text
feature-name/
  feature-name.module.ts
  controllers/                 # multiple/cohesive controllers
  services/                    # multiple/cohesive application services
  dto/
  adapters/ | gateways/        # external provider boundaries
  processors/                  # BullMQ/background workers
  queues/                      # enqueueing and scheduling
  utils/                       # side-effect-free domain helpers
  tests/                       # feature/submodule-owned tests
```

Apply these decisions:

- Keep a small one-controller/one-service feature flat when role folders would
  add ceremony without improving dependency direction.
- Create explicit role folders when responsibilities have different
  authorization, persistence, queue, provider, operational, or scaling
  characteristics. Do not split services merely to make a directory look
  larger.
- Keep tests in a local `tests/` directory owned by the feature or bounded
  submodule. Do not mix test files with production files in the same folder.
- Keep DTOs, adapters, processors, queues, gateways, policies, and utilities
  inside the feature that owns them. Do not create shared utility dumps or
  import another feature's private implementation.
- Runtime `src/features` directories contain executable source only. Move
  historical reports, completion notes, and architecture documents under
  `_doc/`.
- Use kebab-case for new directories. Rename legacy directories only as an
  atomic import, test, script, and documentation migration.
- Preserve module exports, route contracts, provider tokens, and dependency
  direction during structure-only refactors.

Track repository-wide structure changes in
`_doc/multi-tenant/skill-related-discussion/file-folder-structure-track.md`.

Keep controllers thin. Controllers handle routing, DTO input, guards, and response intent. Services enforce domain rules, ownership, tenant scope, transactions, idempotency, and audit behavior.

Prefer focused services over a single god service. Extract query/read services, mutation services, policy checks, integrations, and queue orchestration when their responsibilities or scaling characteristics differ.

## Request Security

- Apply `AuthGuard` to authenticated routes.
- Apply `RolesGuard`, `PermissionsGuard`, and `TenantMembershipGuard` according to the existing route conventions.
- Use explicit permission constants rather than string literals where the project provides them.
- Enforce ownership in the service even when a controller is guarded.
- Treat every identifier as untrusted. Scope every lookup and mutation through the resolved tenant database and ownership rules.
- Validate and normalize input with DTOs. Keep `whitelist`, `forbidNonWhitelisted`, and transformation behavior compatible with the global validation pipe.
- Verify webhook signatures, callback authenticity, replay/idempotency rules, and tenant binding before processing external events.
- Do not log passwords, tokens, connection strings, decrypted credentials, payment secrets, or unnecessary personal data.

## Commerce Mutation Rules

For tenant commerce mutations, call `assertTenantCommerceWritable()` at the mutation entry point when the domain is covered by the suspended-subscription policy. At minimum, review product, inventory, cart, order, campaign, booking, store-location, and other commerce-changing operations for this requirement.

Use transactions for multi-record state transitions. Within a transaction:

- Update the domain state and its history/audit record atomically when possible.
- Re-check mutable state inside the transaction to prevent race conditions.
- Use database constraints for uniqueness and invariants; translate expected Prisma errors into stable API errors.
- Make retries safe with idempotency keys or deterministic deduplication.
- Avoid holding transactions across network calls, file uploads, payment providers, or courier APIs.

## Data Access And Performance

- Select only fields needed by the endpoint; avoid accidental large relation graphs.
- Bound every page size, export, search, and `take` value. Use cursor pagination for large or frequently changing datasets.
- Add and verify indexes for tenant keys, ownership keys, status/time queries, idempotency keys, and queue/outbox lookup patterns.
- Avoid N+1 queries. Use appropriate joins/includes, batched queries, or bounded parallelism.
- Treat counts, reports, analytics, and health probes as potentially expensive workloads. Use aggregation tables, materialized views, read models, caching, or asynchronous computation when justified.
- Keep tenant database pools bounded. Never create an unbounded Prisma client or connection pool per request.
- Use Redis for coordination/cache only with explicit TTL, invalidation, failure behavior, and stampede protection.
- Queue slow, retryable, or fan-out work. Jobs must carry tenant/organization identity, be idempotent, have bounded retries, and expose failures through metrics and logs.

## Scalability Design Standard

Treat scalability as a bounded-resource and failure-isolation problem, not as
a consequence of NestJS module count. A module is not ready for high traffic
until its expected load, bottlenecks, and failure behavior are measurable.

- Keep HTTP handlers stateless so instances can scale horizontally. Request
  context must not be stored in process globals; use the established tenant
  context and correlation mechanisms.
- Bound every resource: database clients and pools, Redis connections, queue
  concurrency, worker batches, request payloads, file sizes, pagination,
  report ranges, and external-provider timeouts.
- Design tenant isolation against noisy neighbors. One tenant's expensive
  report, queue backlog, connection churn, retry storm, or provider outage
  must not exhaust shared capacity for other tenants.
- Use separate read/write paths when justified: projection-based queries for
  interactive reads, aggregate/read-model tables for dashboards, and queued
  exports or recomputation for expensive work. Do not turn an HTTP request into
  an unbounded relational scan.
- Use backpressure and explicit overload behavior. Prefer bounded queues,
  rate limits, concurrency controls, circuit breakers, deadlines, and safe
  degradation over unlimited retries or synchronous fan-out.
- Keep network calls outside database transactions. Use an outbox or durable
  job handoff when a committed mutation must trigger asynchronous work.
- Make cache keys tenant-aware and define TTL, invalidation, stampede
  protection, and behavior during Redis failure. A cache optimization must not
  weaken authorization or become the only source of truth.
- Make workers horizontally safe: tenant-stamped trusted envelopes,
  idempotent handlers, bounded retries, dead-letter/failure evidence, and
  concurrency appropriate to database/provider capacity.
- Instrument capacity signals per dependency and, where safe, per tenant:
  latency, errors, saturation, pool usage, queue depth/age, retry counts,
  circuit state, cache hit rate, and rejected work.
- Validate claims with progressive tests: focused unit tests, integration
  tests against PostgreSQL/Redis, concurrency tests, queue failure tests,
  tenant-isolation tests, and load tests for hot tenants, many active tenants,
  cold tenant connections, pool exhaustion, noisy neighbors, and slow
  dependencies.
- Never describe the system as supporting a target such as one million
  concurrent users from static review alone. State the architectural limits,
  tested workload, deployment topology, and remaining evidence instead.

## Realtime And Workers

- Socket authentication must bind tickets, rooms, and events to the resolved organization.
- Room names and cache keys must be tenant-prefixed; never broadcast a tenant event to a global room accidentally.
- Worker jobs must not depend on request-local state. Reconstruct tenant context from a trusted organization/database envelope and validate that the tenant is still active.
- Do not add old Mongoose processors or legacy queue conventions to new Prisma modules.
- Isolate or remove stale infrastructure rather than allowing two competing implementations to become the default.

## Auditing And Operations

- Record security-sensitive and business-critical mutations with actor, source, entity, previous state, new state, and safe metadata.
- Pass the transaction client to audit writes when the audit record must be atomic with the mutation.
- Ensure audit reads use the correct plane and tenant database; a tenant-admin endpoint must not silently read the legacy/global database.
- Add structured logs, metrics, correlation/request IDs, and useful error classifications for external integrations and background jobs.
- Health endpoints must distinguish control-plane health, tenant-database health, Redis, queues, external providers, backups, and application readiness. Do not report global legacy data as a tenant's health evidence.

## Testing Requirements

Before declaring a module complete, test the highest-risk behavior, not only happy paths:

- DTO rejection and normalization
- authentication, role, permission, and tenant-membership enforcement
- tenant database selection and cross-tenant access rejection
- ownership checks
- suspended-subscription mutation rejection where applicable
- transaction rollback and concurrency-sensitive transitions
- idempotent retries and duplicate webhook/queue delivery
- pagination bounds and expensive query behavior
- worker tenant context and retry behavior
- audit event creation and correct database placement

Run the narrowest relevant tests first, then the full suite, type-check/build, and lint without auto-fixing unrelated files. If generated Prisma clients are required, make generation an explicit reproducible prerequisite and report failures honestly.

## Review Method

For a review:

1. Map application bootstrap, modules, providers, database clients, tenancy middleware, guards, queues, and configuration.
2. Trace every controller route to its service, database client, authorization checks, transaction boundaries, and external calls.
3. Compare the module with the strongest current project examples, especially catalog, cart, order, payments, reconciliation, and tenancy infrastructure.
4. Search for direct base-Prisma access, optional tenant injection, unbounded queries, missing write gates, missing audit records, legacy imports, and unsafe background context.
5. Report findings first, ordered by severity, with file/line references and concrete impact. Separate confirmed bugs from architectural debt and residual testing gaps.

Do not soften a material finding because the code is almost correct. Also do not call an intentional migration fallback a vulnerability without tracing whether the request can reach it and what data it can affect.

## Implementation Completion Gate

Before declaring a new module complete, confirm:

- Its database plane and tenant boundary are explicit.
- Its module dependency graph provides every injected provider.
- Its routes have the correct guards and permissions.
- Its service enforces ownership and domain invariants independently of the controller.
- Its mutations handle suspension, transactions, idempotency, and audit requirements.
- Its reads are bounded and indexed for expected tenant scale.
- Its queues/realtime paths preserve tenant identity.
- Its tests cover the security and failure paths above.
- Build, generated Prisma clients, type-check, lint, and relevant tests have been verified or their failures are clearly reported.
- No new explicit `any` is introduced; changed legacy boundaries have a
  named type or a documented migration exception.

This skill guides engineering decisions; it does not replace production load testing, capacity planning, threat modeling, database migration review, or incident-readiness work.
