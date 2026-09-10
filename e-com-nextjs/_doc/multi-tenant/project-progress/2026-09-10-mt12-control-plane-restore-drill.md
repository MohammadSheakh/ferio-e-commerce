# MT-12 Control-Plane Restore Drill

Date: 2026-09-10

## Scope

This is a controlled local PostgreSQL exercise for the control-plane backup
helper. It is not managed-provider backup/PITR evidence and does not close
provider scheduling, credential protection, or production disaster-recovery
launch gates.

## Evidence

- Source: `PLATFORM_DATABASE_URL` pointing to the local Docker PostgreSQL
  control plane
- Dump: `platform_control_plane_20260910T093335Z.dump`
- Dump size: `51776` bytes
- Isolated target: `restore_drill_platform_20260910`
- Restored schema head: `20260826000000_platform_init`
- Completed migrations: `1`
- Restored organizations: `1`
- Restored tenant database registry rows: `0`

The backup helper also wrote the SHA-256 sidecar and schema-version metadata
under `/tmp/ferio-release1-control-plane-backup` during the drill.

## Procedure

1. Ran `scripts/backup-platform.sh` using the protected
   `PLATFORM_DATABASE_URL` environment variable.
2. Verified the custom-format dump with `pg_restore --list` and checked the
   migration-head metadata.
3. Restored the dump with `scripts/restore-tenant.sh` into a new isolated
   `restore_drill_platform_20260910` database.
4. Verified the migration ledger and representative control-plane counts.

The helper does not accept credentials on the command line, prints no
connection URL, and reuses the isolated restore contract with
`ON_ERROR_STOP=1`.
