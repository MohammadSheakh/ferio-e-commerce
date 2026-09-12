# Local Docker Staging Infrastructure Profile

Status: accepted for Release 1 internal/public staging; not a production
hosting claim

## Decision

Release 1 staging uses one local Docker PostgreSQL 16 server with separate
control-plane and tenant databases. The canonical provisioning path is:

```text
Platform Admin organization creation
  -> LocalPostgresProvisioner / CREATE DATABASE
  -> TenantDatabase registry row
  -> TenantSchemaBootstrapper canonical migrations
  -> baseline seed and readiness checks
  -> domain activation
```

The Docker development profile exposes PostgreSQL on host port `5433` and uses
the Compose service network internally. Tenant connection material is still
resolved from the control-plane registry and encrypted at rest; no request
input selects a database URL.

## Evidence

- `src/platform/services/local-postgres-provisioner.ts` is the registered local
  executor and quotes database/role identifiers before `CREATE DATABASE`.
- `src/platform/services/provisioning.service.ts` invokes the provisioner,
  canonical tenant migration, seed, health, and smoke-test steps before domain
  activation.
- `src/platform/services/local-postgres-provisioner.spec.ts` covers database
  creation, deterministic role identity, and retry reconciliation.
- `test/tenant-bootstrap.integration-spec.ts` and
  `test/two-tenant-vertical.integration-spec.ts` exercise disposable isolated
  PostgreSQL databases with the canonical bootstrap path.
- The local Docker restore evidence is recorded in
  `2026-09-10-mt12-local-restore-drill.md`.

## Explicit boundary

This closes the physical database/schema contract for the chosen local staging
strategy. It does not claim managed hosting, failover, PITR, external secret
management, or million-user capacity. Those remain separate deployment gates
if the environment later moves beyond the local Docker profile.
