# Tenant-admin authorization API integration shot 39

Date: 2026-09-11

## Scope

Audited tenant-admin rider assignment, delivery-personnel authorization,
staff-access mutations, and the related BFF routes against tenant membership,
permission guards, DTOs, and existing regression coverage.

## Findings and changes

- Confirmed the delivery-personnel admin routes use authentication, role,
  permission, and tenant-membership guards for list, create, update, approval,
  assignment, map, and location-history operations.
- Confirmed staff list/invite/access/reset calls use the shared admin BFF and
  preserve upstream error envelopes rather than selecting a tenant from client
  input.
- Preserved the shot-38 route-order fix so static
  `PATCH /delivery-personnel/admin/assign-order` is registered before
  `PATCH /delivery-personnel/admin/:id`.

## Verification

- Focused backend suites passed: 3 suites, 22 tests.
- Covered tenant-scoped rider GPS isolation, staff-access service behavior, and
  tenant-admin guard coverage.
- NestJS typecheck/lint and tenant-admin API/typecheck/lint passed in shot 38.

## Remaining runtime proof

Live cross-tenant assignment denial, concurrent assignment races, staff token
revocation, browser cookie/host forwarding, and production courier callback
evidence remain open. No mobile or Redis code was changed.
