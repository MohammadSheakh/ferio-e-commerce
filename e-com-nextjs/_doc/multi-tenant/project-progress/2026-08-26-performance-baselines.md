# Project Progress — §16.3 Performance Baselines + Negative-Cache Fix

**Date:** August 26, 2026
**Scope:** Measured performance evidence for the tenant plane, plus one real product fix the measurements surfaced.

---

## Product fix: negative cache was never written

Writing the load test exposed that `NEGATIVE_CACHE_TTL_SECONDS` was dead code
— unknown hosts hammered the control plane on every request. The resolver now
writes a 15s negative entry **only** for definitive "no active domain here"
answers. Two related hardenings landed with it:

- Control-plane outages no longer leak raw driver errors (`ECONNREFUSED`) —
  they map to the stable `TENANT_RESOLUTION_FAILED` code at the boundary,
  increment a `resolver_failed` counter, fail closed in ~1ms, and are
  **never** negatively cached (an outage is not an answer).

## Measured baselines (`test/performance-baseline.integration-spec.ts`, 6 tests)

| Evidence line | Result |
|---|---|
| `perf_resolver_cached_load` | 2,000 interleaved resolutions in 10–15ms (**~130–200k ops/s**), exactly **2** control-plane queries total |
| `perf_resolver_negative_storm` | 299 unknown-host attempts after first miss → **1** query |
| `perf_resolver_control_plane_outage` | fails closed in **1ms** with stable code |
| `perf_db_acquire` | cold **~105ms**, warm median **<1ms**, 50 concurrent gets → **1** active client |
| `perf_db_lru_bound` | churn across 4 DBs never exceeds `TENANT_DB_MAX_CLIENTS=2` |
| `perf_bootstrap_full_chain` | full 43-migration canonical chain ≈ **1.9s** |

All numbers print as structured JSON evidence lines for capacity planning;
assertions use generous bounds so shared CI runners cannot flake.

## Checklist updates

- §5.1 negative-cache TTL → `[x]`
- §16.3: load-test resolver `[x]`, cold-connect latency `[x]`, cached
  resolution `[x]`; MT-3 gate "pool/client count remains bounded under load"
  `[x]`

## Still open in §16.3 (need real infrastructure/traffic)

Pool-exhaustion under production connection limits, noisy-neighbor queue
behavior, sustained 10/50/100+ live-tenant soak — these require the
owner-gated hosting decision to be meaningful.

## Verification

Typecheck ✅ · 80 suites / 339 unit tests ✅ · **11 suites / 44 integration tests (+6)** ✅ · build ✅
