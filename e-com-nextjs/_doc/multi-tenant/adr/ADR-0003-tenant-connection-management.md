# ADR-0003 — Bounded Tenant Prisma Connection Management

**Status:** ACCEPTED (PO-011: PgBouncer escalation confirmed) · **Date:** 2026-08-24

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

### Managed pooling escalation design

The first production deployment keeps the bounded LRU manager and its
connection-budget gate. PgBouncer or an equivalent managed pool is introduced
only when measured active-tenant concurrency reaches the documented capacity
trigger (currently about 30 active tenants) or the selected PostgreSQL tier
cannot provide the reserved connection headroom.

The target topology is:

```text
NestJS tenant clients -> PgBouncer (transaction pool) -> managed PostgreSQL
NestJS migrations/admin sessions -----------------------> PostgreSQL directly
```

The tenant request path must remain transaction-safe under transaction pooling:

1. The Prisma/`pg` adapter configuration must disable or avoid session-pinned
   prepared statements and session state. No tenant request may rely on a
   connection surviving beyond its transaction.
2. A tenant transaction must begin, perform all reads/writes, and commit on one
   checkout. `SET`, temporary tables, advisory locks, session GUCs, and
   connection-local search paths are prohibited in tenant request code.
3. Schema migrations, provisioning, `pg_dump`/restore, and operational
   diagnostics use a direct session pool, never the transaction pool.
4. Pool timeouts and queue limits remain bounded at both layers. A pool
   timeout fails the current tenant operation with `TENANT_UNAVAILABLE`; it
   never retries against another tenant database.

Before enabling the pool in an environment, operators must record the managed
PostgreSQL `max_connections`, PgBouncer `default_pool_size`, `reserve_pool_size`,
and per-backend replica count in the connection-budget artifact. The combined
budget must leave the existing headroom reservation intact. Rollout evidence
must include: two-tenant isolation, transaction rollback, migration execution
through the direct path, pool saturation/failure recovery, and one multi-instance
HTTP smoke run. A failed smoke run keeps the bounded direct-pool topology active.

The `TenantDatabaseManager` interface does not change; pooling is a deployment
concern and must not move connection material or tenant selection into a client
request.

## Consequences

**Positive:** connection count is a constant, not O(tenants); one dead tenant cannot degrade others' pools; credentials never sit plaintext at rest or in logs.
**Negative/obligations:** cold-start latency on first touch per tenant (acceptable; mitigated by cache); every new data-access path must go through the manager — direct `new PrismaClient()` in tenant paths is forbidden and review-checked.

**Operational trigger:** the current bounded manager remains the default until
the capacity trigger or connection-budget calculation requires a managed pool.
This is an explicit rollout gate, not permission to enable PgBouncer without
transaction-mode compatibility evidence.

## Alternatives rejected

- Per-request clients: rejected — resource exhaustion guaranteed.
- Unbounded cache: rejected — slow leak, noisy-neighbor pool pressure.
- One shared pool with `SET search_path` schema tricks: incompatible with ADR-0001.
