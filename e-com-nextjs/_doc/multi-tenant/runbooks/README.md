# Multi-Tenant Operational Runbooks

This index is the operational entry point for Release 1. Runbooks describe
safe operator actions; they do not replace provider configuration, approval,
monitoring, or production evidence.

## Runbook Matrix

| Situation | Runbook | Primary owner | Required evidence |
| --- | --- | --- | --- |
| Tenant provisioning fails or leaves an orphan candidate | [Provisioning partial failure](provisioning-partial-failure.md) | Platform Operations | Provisioning run ID, failed step, provider resource correlation, recovery action |
| Custom domain is requested or activated | [Domain readiness](domain-readiness.md) | Platform Operations | DNS TXT result, hostname-validated TLS result, activation audit event |
| Tenant schema migration is planned or fails | [Migration compatibility](migration-compatibility.md) and [migration rollback/forward-fix](migration-rollback-forward-fix.md) | Backend and Platform Operations | Migration marker, backup evidence, per-tenant result, resume/forward-fix record |
| Backup is scheduled, verified, or restored | [Backup and restore](backup-restore.md) | Platform Operations and Infrastructure | Checksum, schema version, backup evidence, isolated restore result, RTO/RPO timings |
| Tenant data or media export is requested | [Tenant export](tenant-export.md) | Platform Operations and Privacy owner | Export manifest, checksum, access audit, retention/deletion decision |

## Common Safety Rules

1. Never use direct SQL to bypass lifecycle, domain, membership, or tenant
   database guards.
2. Never restore over an existing database; use an isolated `restore_drill_*`
   target and verify the schema before promotion.
3. Do not print database URLs, credentials, provider payloads, or export
   contents in logs or tickets.
4. Record the operator, organization or control-plane scope, timestamps,
   evidence locations, and unresolved provider dependencies.
5. Stop and escalate when the runbook identifies an owner-blocked provider,
   legal, security, or production-ingress decision.

## Release 1 Boundary

The runbooks are complete as executable operating contracts. The following
remain separate release gates: managed PostgreSQL/PITR selection, production
secret management, DNS/TLS provider execution, external alert routing,
provider-side credential invalidation, live pilot execution, and production
restore evidence.
