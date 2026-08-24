# ADR-0003 — Bounded Tenant Prisma Connection Management

**Status:** ACCEPTED · **Date:** 2026-08-24

## Context

Database-per-tenant (ADR-0001) means the backend may hold connections to many PostgreSQL databases simultaneously. Naive `new PrismaClient()` per request exhausts file descriptors and database connection limits within minutes of modest traffic. Conversely, unbounded caching leaks idle pools for tenants that visited once.

Prisma 7's driver-adapter architecture (`@prisma/adapter-pg` + `pg.Pool`) lets us own the pool lifecycle explicitly, matching the pattern already used by the single-tenant `PrismaService`.

## Decision

Implement a single `TenantDatabaseManager` responsible for all tenant clients:

1. **Source of truth:** connection parameters come only from control-plane `TenantDatabase` registry rows; credentials stored encrypted (AES-256-GCM) and decrypted in memory only.
2. **Bounded cache:** LRU map keyed by `tenantDatabaseId`, max active clients from env (`TENANT_DB_MAX_CLIENTS`, default 25). Evicting a client disconnects its pool.
3. **Idle eviction:** clients unused beyond `TENANT_DB_IDLE_TTL_SECONDS` (default 300s) are disconnected by a low-frequency sweep.
4. **Acquire timeout:** obtaining a client waits at most `TENANT_DB_ACQUIRE_TIMEOUT_MS` before failing with a stable error — no unbounded queueing.
5. **Health + circuit breaker:** repeated consecutive failures open a per-database breaker with cooldown; requests fail fast with `TENANT_UNAVAILABLE` instead of piling onto a dead database. Breaker state never reroutes to another tenant.
6. **One client per logical operation:** transactions must use the same resolved client end-to-end; nested services receive the client/context rather than re-resolving.
7. **Lifecycle:** graceful shutdown disconnects all clients; metrics expose active count, evictions, acquire failures, breaker events.

PgBouncer/managed pooling remains an infrastructure escalation path when measured tenant counts demand it; the manager interface does not change.

## Consequences

**Positive:** connection count is a constant, not O(tenants); one dead tenant cannot degrade others' pools; credentials never sit plaintext at rest or in logs.
**Negative/obligations:** cold-start latency on first touch per tenant (acceptable; mitigated by cache); every new data-access path must go through the manager — direct `new PrismaClient()` in tenant paths is forbidden and review-checked.

## Alternatives rejected

- Per-request clients: rejected — resource exhaustion guaranteed.
- Unbounded cache: rejected — slow leak, noisy-neighbor pool pressure.
- One shared pool with `SET search_path` schema tricks: incompatible with ADR-0001.
