# MT-12 Local Restore Drill

Date: 2026-09-10

## Scope

This is a controlled local PostgreSQL exercise for the Release 1 restore
helper. It is not production-provider backup/PITR evidence and does not close
the managed hosting, credential protection, or disaster-recovery launch gates.

## Evidence

- Source database: `ferio_test_runner`
- Isolated target: `restore_drill_20260910`
- Dump format: PostgreSQL custom format
- Dump size: `360646` bytes
- SHA-256: `99ea368be95cebb7844c4f3e0b5fe1db9543bc3d2f1c7ea0b4c3da79322703f7`
- Restored schema head: `20260908193000_tenant_messaging_provider_configs`
- Completed migrations: `50`
- Restored orders: `0`
- Restored customers: `1`

## Procedure

1. Ran `scripts/backup-tenant.sh ferio_test_runner` with the local Docker PostgreSQL profile.
2. Verified the dump list, checksum sidecar, and schema-version metadata.
3. Ran `scripts/restore-tenant.sh` against the new `restore_drill_20260910` database.
4. Verified the migration ledger and representative tenant record counts.

The restore helper was hardened during this drill to remove the
`transaction_timeout` session setting when a newer `pg_dump` client targets an
older PostgreSQL server. SQL execution uses `ON_ERROR_STOP=1`, and the target
database remains isolated by the `restore_drill_*` naming contract.
