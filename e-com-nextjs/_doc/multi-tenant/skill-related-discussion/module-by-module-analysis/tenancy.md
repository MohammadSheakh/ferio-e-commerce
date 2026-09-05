# Tenancy Module

## Scope

Trusted host/domain resolution, immutable tenant context, tenant client cache,
membership guards, tenant fan-out, retention, usage reconciliation, callback
context, and tenant observability.

## Architecture Score

**86%**. This is one of the best architectural areas: trusted proxy handling,
fail-closed resolution, bounded tenant client management, circuit breakers,
and tenant envelopes are clearly designed.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /tenancy/status` | 84% | Safe public state mapping; avoid leaking registry details and bound lookup latency. |
| `GET /tenancy/plan` and entitlement reads | 82% | Must use control-plane authority and cache invalidation on subscription changes. |
| Tenant middleware/context | 88% | Strong trusted-host/immutable-context direction; test proxy spoofing and cache collisions. |
| Tenant membership guard | 84% | Good authorization boundary; test revocation/cache invalidation across instances. |
| Tenant fan-out/worker context | 80% | Good envelope direction; every worker must reject missing organization identity in tenant mode. |

## Tasks

1. Complete migration from optional `tryGet()` fallbacks to explicit `get()` in
   tenant-only services.
2. Add host spoofing, domain cache, stale membership, and cross-tenant tests.
3. Stress tenant client eviction, pool limits, breaker recovery, and fan-out.
4. Publish operational budgets for tenants, pools, Redis keys, and worker lag.
