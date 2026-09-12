# Patterns 125-140: Platform, Operations, And Evidence

This block covers the remaining representative platform/admin, reporting,
settings, audit, migration, backup, support-access, and registry code.

## 125. Report field masking by permission

Template: `src/features/reports/services/reports.service.ts` and tests. Build
the report from tenant data, then mask customer-sensitive fields unless the
actor has the specific permission. Reports are not automatically safe because
the route is admin-only.

## 126. Export audit event

Template: reports tests and audit service. Exporting data is itself a sensitive
action: record actor, tenant, scope, and masking decision without storing the
exported sensitive payload in the audit record.

## 127. Settings offset/cursor dual contract

Template: settings controller/DTO/service. The code supports a legacy offset
contract and a cursor variant; study ordering, unique cursor field, bounded
limits, and how the API keeps the two contracts unambiguous.

## 128. Domain readiness aggregate

Template: `domain-readiness.service.ts` and domains service. A domain is ready
only when its own verification/activation state, organization lifecycle, and
tenant registry health all satisfy the contract.

## 129. Credential-free health response

Template: domain health and operations-health services/tests. Return status,
reason, and safe identifiers, but never host credentials, encrypted material,
tokens, or connection details.

## 130. Time-bounded support access grant

Template: `support-access.service.ts` and tests. Support access requires exact
organization/user scope, expiry, revocation checks, reason/audit metadata, and
does not become permanent impersonation.

## 131. Platform support scope enforcement

Template: platform support-access controller and service. A platform operator
may inspect a tenant only through an explicit grant; every downstream operation
must retain organization scope and audit context.

## 132. Migration canary barrier

Template: `migration-orchestrator.service.ts` and tests. Validate and migrate a
selected canary before starting the ordered fleet; canary failure stops the
run rather than partially migrating everyone.

## 133. Migration durable run state

Template: migration run/processor. Persist pending/running/succeeded/failed
state, per-tenant result, retry information, pause/resume controls, and queue
identity so operators can recover without guessing.

## 134. Backup evidence freshness

Template: `backup-evidence.service.ts` and platform operations health. Compute
current/stale/failed from recorded evidence and age thresholds; “backup enabled”
without a recent evidence record is not a verified recovery claim.

## 135. Restore verification attestation

Template: backup restore scripts/specs. A backup becomes useful evidence only
after restore into a disposable target and verification of schema/data, with
timestamp and limitations recorded.

## 136. Tenant database registry readiness

Template: `tenant-databases.service.ts`. Registry state controls whether a
tenant database may be acquired. Health updates and retirement are separate
from creating the physical database.

## 137. Plan seed upsert

Template: `platform-plan-seed.service.ts` and plan services. Seed plan names,
limits, and feature entitlements idempotently so deployment replay does not
duplicate billing configuration.

## 138. Usage counter idempotency

Template: `usage.service.ts`, usage metrics, and tests. Increment usage through
an organization/metric/period uniqueness boundary and reconcile rather than
trusting an in-memory count.

## 139. Platform audit JSON boundary

Template: platform audit service and JSON input utilities. Convert metadata to
the platform JSON type, keep values serializable, and exclude secret-bearing
fields before persistence.

## 140. Operator health summary

Template: `platform-operations-health.service.ts` and tests. Combine tenant
registry, support grants, backup/restore, and dependency signals into an
operator-readable summary with explicit missing/stale status.

## Study tests

```text
src/features/reports/tests/reports.service.spec.ts
src/features/settings/tests/settings.service.spec.ts
src/features/settings/tests/staged-feature-flags.spec.ts
src/platform/services/domains.service.spec.ts
src/platform/services/support-access.service.spec.ts
src/platform/services/migration-orchestrator.service.spec.ts
src/platform/services/backup-evidence.service.spec.ts
src/platform/services/backup-restore-scripts.spec.ts
src/platform/services/platform-operations-health.service.spec.ts
src/platform/services/usage-metering.spec.ts
```
