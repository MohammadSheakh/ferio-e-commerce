# Patterns 31-35: Data, Observability, And Recovery

## 31. Operator-derived export target

Templates: tenant export scripts and platform export services. Export scope,
database target, and media target come from trusted organization registry data;
the request cannot provide an arbitrary connection string or filesystem path.

## 32. Backup/restore verification

Templates: `src/platform/services/backup-evidence.service.ts`, `scripts/backup-*`,
`restore-tenant.sh`, and `verify-tenant-restore.sh`. Distinguish creating a
backup, restoring a disposable tenant, verifying schema/data, and proving an
actual managed-provider RPO/RTO.

## 33. Closure retention state machine

Template: `src/platform/services/tenant-closure.service.ts`. Study pending
closure, retention timing, domain disablement, registry retirement, credential
revocation, queued-work safety, and final destruction as separate steps.

## 34. Sanitized structured logging

Templates: `src/core/security/log-sanitizer.spec.ts`, structured logger, and
request metrics. Logs should carry useful correlation/tenant references while
excluding passwords, tokens, connection strings, and sensitive payloads.

## 35. Operational alert emission

Templates: operations-health, usage metrics, reconciliation alerts, and
`request-metrics.spec.ts`. Learn the difference between application alert
emission and external routing, retention, and paging configuration.

### Senior questions

- Can the restore be verified without touching another tenant?
- Which closure actions are reversible and which are destructive?
- What evidence is generated and where is it retained?
- Is an alert merely emitted, or actually delivered to an operator?
