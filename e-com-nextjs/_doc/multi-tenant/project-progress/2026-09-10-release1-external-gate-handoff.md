# Release 1 External Gate Handoff

Status date: 2026-09-10

The application-controlled Release 1 work is substantially complete. The remaining unchecked items require production access, provider accounts, real businesses, or formal owner/security approval. Engineering must not mark these items complete from local unit tests alone.

## Gate Handoff

| Gate | Owner | Required evidence | Current engineering support |
| --- | --- | --- | --- |
| Managed tenant database hosting | Infrastructure | Production tenant database creation, pooling, failover, and isolation evidence | `TenantSchemaBootstrapper`, provisioning runbook, connection budget check |
| Wildcard DNS and TLS | Infrastructure | Live `*.ferio.com` DNS, certificate issuance/renewal, and readiness verifier output | `verify-domain-readiness.mjs`, domain readiness runbook |
| BullMQ dead-letter retention | Infrastructure/Backend Ops | Tenant-labeled failed-job retention, replay, expiry, and alert evidence | Per-tenant fan-out failure metrics and structured failure logs; do not bypass tenant context |
| Malware scanner and quarantine | Security/Infrastructure | Approved scanner deployment, quarantine/retention policy, failure alert, and post-upload verification | Runtime HTTPS validation, MIME/signature checks, fail-closed scan, and rejected-object removal |
| Transactional messaging providers | Product/Infrastructure | Approved SMS/WhatsApp/email provider decision, tenant credentials, delivery callback, retry, and redaction evidence | Tenant-local encrypted configuration and fail-closed adapter registry |
| Physical tenant database destruction | Infrastructure/Legal | Post-retention destruction record, provider confirmation, and legal-retention exception evidence | 90-day recoverable closure window, registry retirement, domain revocation, and credential revocation |
| Pilot beta | Product/Support/Infrastructure | 2-5 real businesses, onboarding, domains, providers, pool/queue/support metrics, and feedback | Internal-alpha two-tenant and ten-tenant automated evidence |
| Backup/restore production proof | Infrastructure | Managed PITR/logical backup schedule, secret-manager path, isolated restore, RPO/RTO result, and alert evidence | Local restore drill, backup metadata checks, restore verifier, and policy preflight |
| Security acceptance | Security/Product Owner | Formal acceptance or remediation of residual high/critical findings, including provider ingress and penetration-test scope | Application isolation review and cross-tenant negative test matrix |

## Completion Rule

For each row, attach dated evidence to the fix tracker and then update the corresponding checklist item. A green local test, configuration validator, or runbook alone is not production evidence for a provider or pilot gate.

## Safety Rules

- Do not mark a gate complete without its listed external evidence.
- Keep production secrets out of the repository and evidence artifacts.
- Preserve fail-closed tenant resolution, object access, provider readiness, and restore verification.
- Do not modify the Redis implementation as part of this handoff.
- Do not include `ferio-mobile-expo54` in Release 1 execution.
