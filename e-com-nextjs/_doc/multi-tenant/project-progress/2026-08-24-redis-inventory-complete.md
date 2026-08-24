# Project Progress — Redis Key Inventory Complete (§11.1 closed)

**Date:** August 24, 2026 (fifteenth increment)
**Scope:** Finishes the Redis half of MT-8 — every tenant-plane cache key is now namespaced by trusted organization identity, with the one intentional exception documented.

---

## Inventory result

| Key family | Location | Status |
|---|---|---|
| `settings:{orgId}:{type}` | SettingsService | Org-scoped since MT-7 slice 2 |
| `t:{orgId}:otp:{type}:{email}` | OtpService | Scoped in MT-8 via `scopedRedisKey` |
| user profile / stats caches | UserProfileService, UserService | **Scoped this pass** — `scopedRedisKey(PREFIX, …)`; identical userIds across tenants can no longer share entries |
| courier webhook dedup/claim keys | ShippingService | Already tenant-isolated by construction: dedup keys hash provider payload + live inside per-tenant processing paths introduced with the fan-out runner |
| rate-limit keys (`api_user`, `auth_attempt`) | SlidingWindowRateLimitGuard | **Intentionally global** — abuse control keyed by IP/token is platform policy, not business data |
| refresh-token blacklist | AuthService | **Intentionally global** — hash-opaque token hashes; sessions remain in the legacy identity realm until the auth-migration decision (ADR-0004 open item) lands |

Chatting services' Redis injections proved dead (no calls) — noted for a future cleanup pass rather than patched blindly.

## Verification

- Build clean; strict tsc non-spec errors zero; **73 suites / 297 tests passing**.

## Checklist movement

§11.1 prefix item and OTP/rate-limit item both marked complete, with the blacklist exception documented as intentional-shared. §11.1 is now closed except for one operational note: eviction/TTL tuning remains config work (`TENANCY_DB_*`-style env knobs) once real traffic exists.

## Remaining program items

1. §13.1 onboarding wizard consolidation + nav upgrade labels (code).
2. CI disposable-PG runner → gated cross-tenant suites on every push (ops enablement).
3. Owner-blocked: credential vault storage, backup strategy + retention windows, DNS/TLS, plan catalog pricing.
