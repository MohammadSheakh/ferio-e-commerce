# MT-14 Workflow Rehearsal Evidence

## Reconciled controls

Three additional internal-alpha controls are backed by bounded workflow suites:

- Provisioning retry and idempotency are covered by
  `src/platform/services/provisioning.service.spec.ts`, including raced
  replay and protection against repeating domain/database side effects.
- Tenant migration canary/batch behavior is covered by
  `src/platform/services/migration-orchestrator.service.spec.ts`, including
  retry, isolated failure, threshold pause, and resume.
- Support access is covered by
  `src/platform/services/support-access.service.spec.ts`, including scoped
  grants, exact-organization checks, expiry/revocation, usage auditing, and
  idempotent revoke.

These are automated workflow rehearsals, not evidence of real-business pilot
execution. Production hosting, real domains, provider configuration, and
operator-led onboarding remain open.
