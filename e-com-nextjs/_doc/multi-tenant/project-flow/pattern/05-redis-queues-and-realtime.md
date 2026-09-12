# Patterns 21-25: Redis, Queues, And Realtime

## 21. Tenant-namespaced Redis key

Template: `src/tenancy/utils/redis-keys.util.ts` and collision tests. Every
tenant-sensitive cache, lock, session, and pub/sub key must include a stable
organization namespace.

## 22. Redis cache-aside

Template: tenant resolver and catalog/settings caches. Read miss, authoritative
lookup, validated write, TTL, invalidation, and Redis outage behavior as one
pattern. Cache data cannot become tenant authority.

## 23. Distributed lock

Template: Redis lifecycle/queue helpers and reconciliation/shipping queues.
Study ownership token, expiry, release safety, duplicate worker behavior, and
what happens when a lock expires mid-operation.

## 24. Trusted queue envelope

Template: processors under `src/features/*/processors/` and tenancy worker
boundary tests. Jobs carry organization identity from a trusted server-side
producer; workers validate lifecycle and registry state before DB acquisition.

## 25. Tenant-safe WebSocket room

Template: `src/features/socket-gateway/`, chat services, and socket isolation
tests. Follow ticket issuance, user/tenant binding, room naming, event
authorization, and disconnect cleanup.

### Senior questions

- What is the blast radius of a missing namespace component?
- Can a duplicate job safely execute twice?
- Is a Redis outage fail-open or fail-closed for each operation?
- Can a socket client subscribe to another organization's room by name?
