# Provisioning Partial-Failure Runbook

**Scope:** Release 1 tenant provisioning in `ferio-nest-prisma`

**Audience:** Platform Operations and Platform Admin operators

**Safety rule:** Never delete a tenant database or role until the organization, tenant registry, provisioning steps, audit evidence, and retention policy have been reviewed together.

## What The Workflow Guarantees

Provisioning is a durable control-plane state machine. A failed run is not an instruction to start over with a new organization or a new idempotency key.

- Replaying the same organization provisioning request resumes the existing failed run.
- An active platform subdomain is reused instead of being reserved twice.
- An existing tenant database registry is reused instead of creating another registry.
- Migration and seed steps are idempotent.
- A failed migration tenant can be retried without rerunning successful tenants.
- An already-active organization is treated as successfully activated during replay.

The system does **not** automatically destroy a physical database or PostgreSQL role after a partial failure. Destructive cleanup requires provider-specific review and explicit operator approval.

## 1. Identify The Failed Run

1. Open Platform Admin and inspect the organization provisioning timeline.
2. Record the organization ID, run ID, idempotency key, failed step, error summary, database registry status, and domain status.
3. Confirm that the organization is not already serving customer traffic before changing status or credentials.
4. Do not create a second organization to work around a failed run.

The timeline endpoint is:

```text
GET /api/v1/platform/organizations/{organizationId}/provisioning-runs
```

## 2. Safe First Recovery Action

Use the existing idempotency key or the Platform Admin **Run provisioning** action. The service resumes the failed run and skips completed steps.

```text
POST /api/v1/platform/organizations/{organizationId}/provision
Content-Type: application/json

{"idempotencyKey":"<original-key>"}
```

If the failure was caused by a temporary database, Redis, or provider outage, restore the dependency first and retry once. Capture the new step results in the incident record.

## 3. Failed-Step Decision Tree

### Domain reservation failed

- If an active `PLATFORM_SUBDOMAIN` already exists for the organization, replay provisioning.
- If the hostname belongs to another organization, stop and resolve the ownership conflict through Platform Admin; never reassign it by direct SQL.
- If no domain exists, verify the platform public domain configuration before retrying.

### Tenant database registration or physical creation failed

- If a tenant database registry exists, replay provisioning; the registered database is reused.
- If no registry exists, inspect the provider for a possible physical database/role created before control-plane registration completed.
- For the local PostgreSQL provisioner, inspect only names matching `ferio_tenant_<slug>_<suffix>` and roles matching `tenant_<organization-id-suffix>`.
- Do not drop a candidate database or role until its ownership, creation time, and provisioning run correlation are confirmed.
- If the physical provider cannot correlate the resource, escalate to the infrastructure owner and preserve it as an orphan candidate.

### Migration, seed, health, or smoke test failed

- Fix the reported schema, credentials, connectivity, or timeout cause.
- Replay the same provisioning run.
- Verify the migration ledger, baseline settings, COD policy, and readiness status before activation.
- Never mark the organization `ACTIVE` manually to bypass a failed readiness step.

### Activation failed after readiness succeeded

- Inspect the current organization status and lifecycle events.
- Replay provisioning. An already-active organization is safely accepted by the activation step.
- If the organization is `PROVISIONING_FAILED`, do not force a direct status transition unless the failure is separately audited and approved.

## 4. When Automatic Replay Is Not Enough

Escalate instead of improvising when any of these conditions apply:

- the registry credential is unavailable or cannot be decrypted;
- the physical database exists but its owner cannot be established;
- the database contains customer, order, payment, or uploaded business data;
- the organization has entered `ACTIVE`, `SUSPENDED`, `CLOSURE_PENDING`, or another lifecycle state outside provisioning;
- a migration partially changed schema and the next retry is not backward-compatible;
- a provider-side cleanup, credential rotation, or database restore is required.

The incident record must include the run ID, organization ID, failed step, provider resource identifiers, timestamps, operator, decision, and evidence of the final state. Keep credentials, connection strings, and password material out of the record and logs.

## 5. Recovery Completion Checklist

- [ ] Original provisioning run and idempotency key identified.
- [ ] Failed step and root cause recorded.
- [ ] No duplicate organization, domain, registry, database, or role created.
- [ ] Same run replayed after the dependency/root cause was corrected.
- [ ] All provisioning steps are `COMPLETED`.
- [ ] Tenant registry is `READY` and the readiness probe succeeds.
- [ ] Required baseline tables and settings exist.
- [ ] Organization lifecycle is `ACTIVE` only after readiness.
- [ ] Tenant hostname resolves to the intended organization.
- [ ] A platform audit event and incident record contain the recovery evidence.

## Related Controls

- Provisioning state machine: `src/platform/services/provisioning.service.ts`
- Tenant readiness probe: `src/tenancy/services/tenant-schema.bootstrapper.ts`
- Tenant migration recovery: `src/platform/services/migration-orchestrator.service.ts`
- Backup/restore procedures: [backup-restore.md](backup-restore.md)
- Release checklist: [implementation-checklist-and-schedule-multitenant.md](../implementation-checklist-and-schedule-multitenant.md)
