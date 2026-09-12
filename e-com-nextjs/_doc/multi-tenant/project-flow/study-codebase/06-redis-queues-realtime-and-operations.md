# 6. Redis, Queues, Realtime, And Operations

## Infrastructure reading order

1. `libs/redis/src/redis.module.ts`, `redis.service.ts`, and lifecycle files.
2. `libs/queue/src/bullmq.module.ts`, provider, constants, and queue names.
3. Feature processors under `src/features/*/processors/`.
4. `src/tenancy/utils/redis-keys.util.ts` and object-key helpers.
5. `src/features/socket-gateway/` and `src/features/chatting/`.
6. `src/platform/services/backup-evidence.service.ts`, migration and closure
   services, then the operational scripts in `scripts/`.

## Async invariant

An async job must carry a trusted organization envelope. A worker cannot rely
on request AsyncLocalStorage because there is no original HTTP request. The
worker validates lifecycle/registry state before acquiring a tenant database.
Processors must be idempotent and safe when duplicate jobs are delivered.

## Redis and WebSockets

Every tenant-sensitive cache, lock, queue payload, and socket room needs an
organization namespace. Read the Redis collision tests and socket isolation
tests. A passing unit test does not prove production Redis inventory, durable
dead-letter retention, or multi-instance delivery; those are separate MT-8
operational gates.

## Operations commands

Use the command references in `_doc/multi-tenant/commands/` for Docker, Prisma,
Redis, Cloudflare Tunnel, health checks, and evidence capture. The local
Cloudflare wildcard setup proves one-level staging host routing; it does not
prove deep wildcard TLS coverage without Advanced Certificate Manager.

## Operational study questions

- What happens when Redis is unavailable during tenant resolution?
- Which job owns retries and what makes a retry idempotent?
- Which worker checks a tenant's lifecycle before DB acquisition?
- Where are correlation IDs, tenant IDs, and secrets sanitized?
- Which evidence is local-only versus managed-provider proof?
