# MT-12 Managed PostgreSQL Backup/PITR Strategy

**Date:** 2026-09-10  
**Status:** Strategy accepted; provider execution remains open

## Completed

ADR-0009 accepts the Release 1 strategy required by PO-009 and PO-012:

- provider-managed continuous WAL/PITR as the primary recovery mechanism;
- nightly encrypted logical backups for the control plane and every active
  tenant;
- at least 30 days of backup retention;
- isolated tenant and control-plane restore verification before promotion; and
- RPO no greater than one hour and RTO no greater than four hours as release
  targets.

The strategy is deliberately provider-neutral. Existing repository helpers
cover logical backup, checksum and schema metadata, restore, financial
invariants, and tenant-scoped object-reference checks.

## Still required before production readiness

This decision does not claim that a managed provider is configured. The
deployment owner must still select the provider/tier, configure PITR and
retention, schedule the nightly jobs, connect protected secrets, route stale
backup alerts, and complete a provider-backed restore drill with measured RPO
and RTO. Those remain independent Release 1 operational gates.

The local Docker PostgreSQL restore drills are useful helper-contract evidence
but do not prove managed-provider PITR or production-scale recovery.
