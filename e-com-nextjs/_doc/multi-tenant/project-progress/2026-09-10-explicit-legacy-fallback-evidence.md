# Explicit Legacy Fallback Evidence

**Date:** 2026-09-10
**Scope:** Tenant database compatibility boundary. Redis and `ferio-mobile-expo54/` were not changed.

## Remediation

`TenantDbService.getOrLegacy` and `resolveTenantDatabase` now require a non-empty fallback reason. All tenant-facing feature services that still support legacy mode pass a stable service-level reason. The architecture boundary check rejects the old two-argument call form, so a newly added fallback cannot silently bypass review.

This is an accountability and fail-closed improvement, not a claim that legacy mode has been removed. In tenancy-enabled production, missing tenant context still raises `TENANT_IDENTITY_CONTEXT_REQUIRED` or `TENANT_DATABASE_SERVICE_REQUIRED`; the reason is only meaningful for the explicitly supported migration mode.

## Verification

```text
pnpm run lint:strict:src              passed
pnpm run lint:application             passed
pnpm run typecheck:application        passed
pnpm run architecture:check           passed
focused tenancy tests                 32 passed
full backend suite                    142 suites / 645 tests passed
git diff --check                      passed
```

## Honest boundary

The repository still contains compatibility call sites because legacy mode remains part of the migration strategy. The final removal/isolation decision requires production rollout ownership, route/worker inventory completion, migration telemetry, and an explicit deprecation date.
