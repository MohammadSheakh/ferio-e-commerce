# Project Progress — MT-13 Hygiene: Repo-Wide Strict Typecheck + Cleanup

**Date:** August 24, 2026 (sixteenth increment)
**Scope:** MT-13 §16.4 hygiene — the whole repository (backend including every spec file) now passes strict `tsc --noEmit` with zero errors, enforced as a CI gate. Plus dead-code and build-artifact cleanup.

---

## What landed

### 1. Zero strict-tsc errors repo-wide — including specs

The backend's jest runs ts-jest in transpile-only mode, so type errors inside spec files were invisible to the suite while making a repo-wide typecheck impossible. All latent spec debt is now fixed:

| File | Latent defect | Fix |
|---|---|---|
| `auth.controller.spec` | ctor arity 1 vs 2 | TwoFactorService stub added |
| `auth.service.spec` ×2 sites | 7 vs 8 deps; duplicate declaration | Slot-order-correct stubs (otp/email/oauth/redis/config/2fa) |
| `order-reservation.service.spec` | 5 vs 7 required deps | wallet + customerNotifications stubs |
| `permissions.guard.spec` | literal-narrowed param type | widened to `string[]` |
| `store-locations.service.spec` ×2 | `sub` instead of `userId` actor shape | UserPayload-shaped actor |
| `transactional-messaging.service.spec` | `actor as never` hid property reads | typed UserPayload cast |
| `wallet.service.spec` | mock missing `findUniqueOrThrow` typing | cast at assignment site |
| `tenancy.controller.spec` ×4 | express `Request` generic mismatch | explicit Request cast on stubs |
| `tenant-fanout.service.spec` | handler return-type widening | void block body |

### 2. CI gate raised

Backend job now runs **strict typecheck (incl. specs)** before unit tests — this class of silent debt can no longer accumulate. Dependency-audit job still pending.

### 3. Cleanups

- Chatting services' dead `RedisService` injections removed; conversation spec arity corrected to the real constructor.
- `tsconfig.tsbuildinfo` untracked and gitignored in both Next apps (build artifacts never belonged in git).

## Verification

- Cacheless strict tsc over the entire project (src + specs): **0 errors**.
- Build clean; **73 suites / 297 tests passing**.

## Checklist movement

§16.4: typecheck ✔, production builds ✔ (all four apps in CI matrix), dependency audit PARTIAL.

## Next

Remaining program items are enablement/owner-gated:
1. **CI runner with disposable PostgreSQL** → cross-tenant integration suites (bootstrap isolation, product-ID proof) run on every push — the single highest-value remaining engineering step.
2. Owner decisions: hosting, DNS/TLS, plan pricing, credential vault storage, retention windows.
3. MT-14 alpha/pilot operations.
