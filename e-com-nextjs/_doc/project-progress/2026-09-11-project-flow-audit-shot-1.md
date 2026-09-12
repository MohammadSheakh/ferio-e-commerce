# Project-Flow Documentation Audit — Shot 1

Date: 2026-09-11

## Scope

This shot audited the core flow documents, provisioning flow, tenant commerce
flow, async integrations, realtime operations, and the first provisioning
learning documents. The mobile app was excluded.

## Source Checks

- Backend bootstrap and middleware: `ferio-nest-prisma/src/main.ts` and
  `src/app.module.ts`.
- Tenant resolution/context: `src/tenancy/services/tenant-resolver.service.ts`
  and `src/tenancy/context/tenant-context.ts`.
- Provisioning state machine:
  `src/platform/services/provisioning.service.ts` and
  `src/platform/services/organizations.service.ts`.
- Domain readiness and lifecycle:
  `src/platform/services/domains.service.ts` and
  `src/platform/services/domain-readiness.service.ts`.
- Commerce controllers/services under `src/features/`.
- Payment recovery queue/processor/service under
  `src/features/commerce-payments/`.
- Socket authentication/gateway under `src/features/socket-gateway/`.
- Customer Web host forwarding and BFF calls under
  `ferio-customer-web/lib/` and `ferio-customer-web/app/api/`.
- Admin dashboard host forwarding and BFF calls under
  `ferio-admin-dashboard/ferio-admin/lib/` and `middleware.ts`.

## Corrections

1. Added the implemented `SMOKE_TEST` step to the top-level provisioning
   flow and PRD lesson 5.
2. Clarified that payment recovery is concurrently executable but uses an
   atomic serializable claim per attempt; duplicate jobs safely no-op.
3. Distinguished a failed `ProvisioningRun` (`FAILED`) from the organization
   lifecycle state (`PROVISIONING_FAILED`).

## Result

No backend or frontend code change was required for this documentation shot.
The remaining checklist-explanation and PRD-explanation documents are not yet
closed; they require additional bounded source passes.

