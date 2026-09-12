# API Integration Verification — Tenant Admin Settlements and Reconciliation (Shot 52)

**Date:** 2026-09-11  
**Scope:** Tenant-admin settlements, settlement imports, reconciliation queue, and findings  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

The tenant-admin frontend already had BFF and browser callers for the documented
settlement and reconciliation workflows. The API document was stale in three
ways: it pointed at old frontend paths, omitted the existing alerts and queue-
health reads, and claimed a standalone `GET /admin/reconciliation/runs/:runId`
route that is not present in NestJS. Reconciliation run evidence is returned in
the queue-health `recentRuns` collection and is sufficient for the dashboard's
failed-run retry flow.

## Fix

- Corrected the documented frontend paths to the actual reconciliation page,
  components, and settlement type module.
- Documented `GET /admin/reconciliation/queue-health` and
  `GET /admin/reconciliation/alerts`.
- Documented the actual finding-action enum and clarified that queue health
  provides bounded recent run evidence instead of inventing a run-detail route.
- Recorded the audit in API verification status and the BHO fix tracker.

## Verification

- Confirmed BFF/browser integration for settlement list, eligible collections,
  settlement create, imports list/import, preflight, and template download.
- Confirmed BFF/browser integration for findings list, scan with
  `Idempotency-Key`, queue health, alerts, finding actions, and failed-run retry.
- Confirmed NestJS controller paths and DTO action values match the frontend.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live role authorization, idempotency behavior, queue availability, financial
reconciliation correctness, and cross-tenant isolation remain runtime gates.
Redis was not changed.
