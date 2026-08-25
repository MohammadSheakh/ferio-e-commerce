# Backup & Restore Runbook (PO-012 aligned — pending provider sign-off)

## Nightly backups
- Control plane: `pg_dump --format=custom "$PLATFORM_DATABASE_URL" > control_$(date +%F).dump`
- Per tenant: enumerate registries (`SELECT "databaseName" FROM "TenantDatabase" WHERE status='READY'`)
  and dump each tenant DB the same way.
- Upload dumps to object storage; retain 30 days (PO-012); encrypt at rest.

## Verification job (weekly)
- `pg_restore --list <file> >/dev/null` per dump — non-zero exit = alert.
- Record filename/size/checksum as backup evidence rows (MT-12 §15.1).

## Restore drill (quarterly, MUST be rehearsed)
1. Create scratch database `restore_drill_<date>` on an isolated instance.
2. `pg_restore --no-owner --role=postgres -d restore_drill_<date> <file>`
3. Assert: `_ferio_tenant_migrations` count matches canonical head;
   spot-check latest Order/Customer counts vs production pre-drill snapshot.
4. Point a throwaway resolver host at the drill DB via TenantDomain +
   registry copy; smoke-test storefront read-only.
5. Record drill evidence + elapsed time (RTO ≤4h target, PO-012).

## Ownership
Blocked on managed-provider selection (PO-009 follow-up). Until signed off,
this file is the contract engineering will implement against.
