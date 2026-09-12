# MT-12 Tenant Fleet Backup Evidence

## Reconciled control

Added `scripts/backup-tenant-fleet.sh` as the executable fleet boundary for
tenant backups:

- It reads only `ACTIVE` organizations with `READY` tenant database registry
  rows from `PLATFORM_DATABASE_URL`.
- It requires an operator-managed `PGSERVICE` profile for tenant database
  connections; passwords and connection strings are not accepted as positional
  arguments or read from registry output.
- It validates registry identifiers before invoking `backup-tenant.sh` for each
  tenant, writes artifacts under the organization ID, and fails if any backup
  fails or if the registry is empty.
- The delegated helper verifies the dump, checksum, and completed Prisma
  migration metadata for every tenant.

The script-contract regression covers the fleet query, active/ready filters,
credential boundary, delegation, and failure contract. Managed-provider
scheduling, object-storage upload, encryption at rest, and live fleet execution
remain deployment controls.
