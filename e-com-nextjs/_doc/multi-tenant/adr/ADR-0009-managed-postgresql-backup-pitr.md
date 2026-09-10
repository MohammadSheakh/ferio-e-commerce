# ADR-0009: Managed PostgreSQL Backup and PITR Strategy

**Status:** ACCEPTED (strategy only)  
**Date:** 2026-09-10  
**Deciders:** Engineering, Product Owner  
**Related decisions:** PO-009, PO-012

## Context

Release 1 uses one managed PostgreSQL cluster with a separate database for the
control plane and each tenant. The product-owner targets are an RPO of at most
one hour, an RTO of at most four hours, 30-day backup retention, mandatory
independent tenant restore, and mandatory control-plane backup.

The repository contains provider-neutral logical backup, restore, checksum,
schema-metadata, financial-invariant, and object-reference verification
helpers. A production deployment still needs a concrete managed PostgreSQL
provider, protected credentials, scheduled execution, alerting, and a
provider-backed restore drill.

## Decision

Use the following provider-neutral production strategy:

1. Provider-managed continuous WAL/PITR is the primary recovery mechanism and
   must support the PO-012 RPO target of at most one hour.
2. Nightly logical backups run for the control plane and every active tenant.
   They are encrypted at rest, checksummed, stored outside the database
   service, and retained for at least 30 days.
3. Logical backups remain the portable per-tenant restore and export mechanism;
   PITR does not replace tenant-level restore verification.
4. Restore drills use isolated databases and must verify migration state,
   tenant-scoped media references, foreign keys, financial invariants, and a
   read-only storefront before promotion.
5. The deployment owner must select a managed provider/tier whose backup,
   PITR, connection, credential, and restore capabilities satisfy this ADR and
   record the provider-specific operating procedure before production launch.

## Consequences

- The architecture remains provider-neutral and does not introduce Neon, RDS,
  Supabase, or another vendor coupling.
- Provider configuration, scheduled jobs, secret-manager integration, alert
  routing, and production restore evidence remain separate operational gates.
- A local Docker PostgreSQL drill proves helper behavior only; it is not proof
  that managed PITR or production RPO/RTO has been configured.

## Acceptance evidence

- `runbooks/backup-restore.md` is the provider-neutral operating contract.
- `scripts/backup-platform.sh`, `scripts/backup-tenant-fleet.sh`,
  `scripts/restore-tenant.sh`, `scripts/verify-tenant-restore.sh`, and
  `scripts/verify-tenant-media.sh` provide the portable execution and
  verification boundaries.
- Provider-specific scheduling, credentials, PITR configuration, and a
  production-like restore drill must be attached before the release gate for
  production readiness is closed.
