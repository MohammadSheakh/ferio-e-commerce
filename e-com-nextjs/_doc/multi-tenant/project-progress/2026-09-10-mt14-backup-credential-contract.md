# MT-14 Backup Credential Contract

## Completed

Release 1 backup, export, restore, and object-lifecycle helpers now have an
automated credential-boundary contract. The test suite checks every helper for
restrictive `umask 077`, rejects positional password/connection-string
patterns, and rejects shell tracing. The helpers accept database URLs only
through the protected process environment, or use the operator's configured
database/profile authentication for identifier-based commands.

The scripts write checksums and migration metadata without printing connection
strings, passwords, provider secrets, or export contents.

## Boundary

This closes the repository-level protection control. It does not claim that a
production secret manager, provider-side rotation, or backup scheduling has
been selected. Those remain deployment-owned launch gates and are intentionally
tracked separately from the script contract.

## Evidence

- `src/platform/services/backup-restore-scripts.spec.ts`
- `scripts/backup-platform.sh`
- `scripts/backup-tenant.sh`
- `scripts/export-tenant.sh`
- `scripts/export-tenant-media.sh`
- `scripts/restore-tenant.sh`
- `scripts/verify-tenant-restore.sh`
- `scripts/configure-r2-lifecycle.sh`
