# MT-14 Provisioning Retry Hardening

Date: 2026-09-10

## Change

Hardened `LocalPostgresProvisioner` for a partial provisioning retry:

- only PostgreSQL duplicate-object error `42710` is treated as an existing role;
- permission, connectivity, and other database errors still fail the run;
- an existing role has its password reconciled before credentials are returned;
- role/database identifiers and password literals use PostgreSQL-safe quoting;
- the unused control-plane Prisma dependency was removed from the provisioner.

## Evidence

- `local-postgres-provisioner.spec.ts`: 2 tests passed;
- `pnpm run typecheck:application`: passed;
- `pnpm run lint:strict:src`: passed;
- `git diff --check`: passed.

## Scope and remaining work

This closes an application-level retry correctness defect. It does not close
the provider-level Release 1 gate for managed database creation, orphan
resource cleanup, or production hosting selection.
