# Tenant-admin current rider API integration shot 44

Date: 2026-09-11

## Scope

Audited tenant-admin order-detail rider assignment, approved-rider loading,
delivery personnel BFF routes, NestJS assignment controller/service, order
detail serialization, and delivery API documentation.

## Finding and change

- The assignment PATCH path and authorization were already wired, but
  `GET /admin/orders/:id` did not include the assigned rider relation. After a
  successful assignment or page reload, the operator could not see which rider
  was currently assigned.
- Added a minimal safe current-rider projection to the order-detail response:
  `id`, `name`, `phoneOriginal`, `status`, and `isOnline`.
- Rendered the current rider and duty state in the order-detail assignment
  panel while preserving the approved-rider selection for reassignment.
- Updated the delivery API documentation to distinguish source integration from
  still-open live authorization and browser evidence.

## Verification

- NestJS application typecheck passed.
- Tenant-admin TypeScript check passed.
- Tenant-admin lint passed with existing hook and image warnings.
- `git diff --check` passed.

## Remaining runtime proof

Live assignment authorization, cross-tenant denial, concurrent assignment
races, stale-rider reconciliation, tenant-host forwarding, and browser E2E
evidence remain open until the local PostgreSQL and application stack is
running. No mobile or Redis code was changed.
