# Tenant Boundary Review Checklist

Use this checklist for every new or changed backend module, route, processor,
queue, cache, storage key, and integration. A reviewer should link the tests
or operational evidence for each applicable item in the PR.

## Before Coding

- [ ] Classify the change as control-plane, tenant-plane, or shared infrastructure.
- [ ] Trace the route/job through guards, context, service, client, transaction, provider calls, and side effects.
- [ ] Identify whether the operation can cross a database plane. If yes, document opaque IDs and compensation behavior.
- [ ] Identify every cache key, object key, socket room, idempotency key, and job ID that could collide between tenants.

## Tenant Identity And Authorization

- [ ] Tenant identity comes only from trusted host/domain resolution or a trusted worker envelope.
- [ ] Request body, query, client token claim, or connection string cannot select a tenant database.
- [ ] Protected tenant-admin routes use the existing auth, role/permission, and membership guards.
- [ ] The service repeats object ownership and organization checks; controller guards are not treated as ownership proof.
- [ ] Platform principals cannot enter tenant data paths without an explicit reason-bound, time-bound, audited support grant.

## Data And Mutation Safety

- [ ] Tenant services use `TenantDbService.get()` and fail closed outside tenant context.
- [ ] Transactions use one resolved tenant client for the complete tenant-local operation.
- [ ] State transitions, uniqueness constraints, idempotency, retries, duplicate delivery, audit, and external-call boundaries are specified.
- [ ] No tenant database foreign key points to the control plane.
- [ ] Errors expose stable domain codes, not SQL, provider, credentials, or stack traces.

## Capacity And Evidence

- [ ] Pagination, payload size, provider timeout, queue retry, concurrency, and connection use have explicit bounds.
- [ ] A slow, failed, or noisy tenant cannot exhaust healthy tenants' capacity.
- [ ] Focused positive and negative tests cover tenant A/B isolation where the change is high-risk.
- [ ] Full application typecheck, strict source lint, architecture checks, relevant tests, build, and `git diff --check` pass.
- [ ] Remaining infrastructure or provider work is recorded as open instead of claimed complete.
