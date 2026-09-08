# Tenant Migration Rollback and Forward-Fix Runbook

This runbook applies to tenant-fleet migrations managed by the bounded,
canary-aware orchestrator. It follows ADR-0005: do not run reverse migration
scripts and do not migrate every tenant from application startup.

## Before A High-Risk Migration

1. Confirm the migration is additive or follows the expand/migrate/contract
   sequence below.
2. Confirm a verified control-plane and tenant backup exists for every target
   batch. Abort the batch when backup evidence is missing or stale.
3. Select a canary organization and set a bounded batch/concurrency limit.
4. Record the expected migration head and the supported application schema
   range before enqueueing the migration run.

## Expand, Migrate, Contract

1. **Expand:** add nullable columns, new tables, or compatibility indexes;
   deploy an application version that can read both old and new shapes.
2. **Migrate:** backfill in bounded, observable jobs; keep the old shape
   writable while the backfill is incomplete.
3. **Contract:** after fleet evidence confirms the new application path is
   stable and the backfill is complete, remove old columns or constraints in a
   separate maintenance-window migration.

## Failure Handling

- Pause the orchestrator when the configured failure threshold is reached.
- Keep successful tenant results; repair and retry only failed tenants.
- If a migration changed a tenant schema and the new application cannot serve
  it safely, restore that tenant into an isolated recovery database and use a
  forward-fix migration. Never execute an ad-hoc reverse SQL script against a
  live tenant.
- If the application requires a schema range that a tenant does not satisfy,
  tenant resolution must fail closed with `TENANT_MIGRATION_REQUIRED`.
- Record the migration run, per-tenant result, repair, retry, and final schema
  version in the control plane before resuming traffic.

## Exit Evidence

- Canary and every batch have successful migration and post-migration health
  results.
- Backup and restore evidence references the target migration head.
- No tenant remains outside the application-supported schema range.
- The operator records whether the run completed, was paused, or required a
  forward fix.
