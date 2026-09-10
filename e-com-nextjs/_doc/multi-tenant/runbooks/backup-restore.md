# Backup & Restore Runbook (PO-012 aligned — ADR-0009 strategy accepted)

The accepted strategy is provider-managed continuous WAL/PITR plus nightly
logical backups for the control plane and every active tenant. This runbook is
provider-neutral by design. Provider selection, scheduling, secret-manager
integration, alerting, and production restore evidence remain deployment
gates; this document must be extended with the selected provider's exact
commands and dashboard checks before production launch.

Before a production deployment, run `pnpm check:backup-policy` with the
provider-managed deployment environment. It requires a non-placeholder
`BACKUP_PROVIDER`, `BACKUP_PITR_ENABLED=true`, retention of at least 30 days,
`BACKUP_RPO_MINUTES` at most 60, `BACKUP_RTO_MINUTES` at most 240, and a
bounded `BACKUP_LOGICAL_SCHEDULE`. The validator checks configuration only and
never reads or prints database credentials; a passing result is not a
substitute for a provider-side restore drill.

## Nightly backups
- Control plane: `PLATFORM_DATABASE_URL=... ./scripts/backup-platform.sh ./backups`.
  The URL must come from the operator's secret-managed environment; the helper
  writes a checksum and migration-head metadata sidecar without printing the
  connection string.
- Tenant fleet: `PLATFORM_DATABASE_URL=... PGSERVICE=... ./scripts/backup-tenant-fleet.sh ./backups`.
  The helper enumerates only ACTIVE organizations with READY tenant registries
  from the control plane, then invokes `backup-tenant.sh` once per database and
  writes artifacts under the organization ID. `PGSERVICE` must resolve through
  the operator's protected PostgreSQL service profile; credentials are never
  passed as arguments or read from tenant rows by the shell helper.
- Upload dumps to object storage; retain 30 days (PO-012); encrypt at rest.

## Object-storage lifecycle

Apply the tenant-prefix lifecycle rule through a protected operator environment:

```bash
R2_BUCKET=... R2_ENDPOINT_URL=... \
  ./scripts/configure-r2-lifecycle.sh 30
```

The command accepts only the retention period as an argument. AWS-compatible
credentials must come from the operator's secret-managed environment or CLI
profile; credentials are never passed on the command line or written to the
repository. The rule applies only to `tenants/` objects and must be verified
in the provider console/API after each deployment.

## Verification job (weekly)
- `pg_restore --list <file> >/dev/null` per dump — non-zero exit = alert.
- Record filename/size/checksum as backup evidence rows (MT-12 §15.1).

## Restore drill (quarterly, MUST be rehearsed)
1. Create scratch database `restore_drill_<date>` on an isolated instance.
2. `./scripts/restore-tenant.sh <file> restore_drill_<date>` for either a
   tenant backup or the control-plane backup. The helper requires checksum
   metadata, refuses an existing target, and stops on the first SQL error.
3. Assert: `_prisma_migrations` contains the canonical completed migration
   head;
   spot-check latest Order/Customer counts vs production pre-drill snapshot.
4. Run `./scripts/verify-tenant-restore.sh restore_drill_<date>` to check
   required tables, non-empty media references, foreign-key reachability,
   completed wallet ledger arithmetic, and reconciliation-run presence. The
   helper is read-only and fails closed on structural corruption.
5. Verify external object/media existence against the approved storage
   provider using the tenant prefix and export/restore manifest:
   `R2_BUCKET=... R2_ENDPOINT_URL=... ./scripts/verify-tenant-media.sh
   restore_drill_<date> <organization-id>`. The helper is read-only and fails
   closed on any reference outside the tenant prefix or any missing object.
6. Point a throwaway resolver host at the drill DB via TenantDomain +
   registry copy; smoke-test storefront read-only.
7. Record drill evidence + elapsed time (RTO ≤4h target, PO-012), including
   whether the restored dump was control-plane or tenant scope.

## DNS and domain behavior during disaster recovery

- Never repoint a live tenant domain directly to an unverified restore.
- Restore into a new isolated database, keep the registry unavailable until
  schema, media, financial, and read-only storefront checks pass, then promote
  the replacement through the normal control-plane lifecycle.
- During recovery, keep the original domain disabled or in a pending state if
  the original tenant is unavailable. Unknown, closed, or not-ready domains
  must continue to fail closed rather than route to the recovery database.
- Re-issue or verify TLS at the ingress/provider layer before activation; DNS
  and certificate changes are operator actions and must be recorded with the
  restore evidence.

## Ownership
The backup/PITR strategy is accepted by ADR-0009. The deployment owner still
owns provider selection, provider-side PITR configuration, protected scheduling
credentials, stale-backup alerting, and a production-like restore drill.
