# Admin and Platform API Integration Shot 19

Date: 2026-09-11

## Scope

Audited tenant-admin customers, staff, reports, analytics, audit, and
operations-health callers, plus the related platform organization/catalog
documentation, against the active NestJS controllers, DTOs, and BFF routes.

## Findings

- Customer list callers use `page`, `limit`, `search`, `filter`, `month`, and
  `sort`; the backend has no `/admin/customers/:id/orders` controller route.
- Staff browser callers already use `/admin/staff/invitations`; public staff
  access already uses `accept-invitation` and `complete-reset`. The old docs
  used shortened paths.
- Reports and charts already send `dateFrom`/`dateTo`, matching the DTO. The
  old reports docs used `from`/`to`.
- Audit callers use the DTO's `action`, `entityType`, `entityId`, `actorId`,
  `source`, `page`, and `limit` fields. Operations health and analytics callers
  match their guarded controller routes; analytics clamps `days` server-side.
- Platform plan controllers expose PATCH `/platform/plans/:id` in addition to
  plan listing and creation, so the plan documentation was missing a real
  method.

## Changes

- Corrected customer, staff, reports, dashboard, audit, and platform plan
  documentation.
- Added `tenant-admin/analytics-audit-operations.md` as the source-verified
  contract for the remaining tenant-admin monitoring screens.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E, live
tenant-host isolation, analytics event delivery, queue fairness, provider
behavior, platform authorization acceptance, or production operations.
