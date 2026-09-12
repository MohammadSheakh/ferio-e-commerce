# 4. Authentication, RBAC, And Owner Bootstrap

## Read in layers

1. `src/features/authentication/auth/auth.controller.ts` and its service.
2. `src/features/user-management/` for tenant users, profiles, devices, and
   OAuth accounts.
3. `src/core/security/` for principals, permissions, rate limits, errors,
   request context, and log sanitization.
4. `src/tenancy/guards/tenant-membership.guard.ts` and
   `tenant-suspension.guard.ts`.
5. `src/platform/guards/platform-auth.guard.ts` and platform controllers.

## Mental model

```text
credential/token
  -> authentication realm
  -> principal
  -> tenant membership or platform permission
  -> route permission/role
  -> service ownership and state rules
```

Authentication is not tenant isolation by itself. The request host still
resolves the organization, membership binds the principal to that organization,
and each service must enforce ownership and state transitions.

## Important evidence gap

The current platform organization creation flow records the owner in the
control-plane `OrganizationMember`, while tenant bootstrap leaves tenant `User`
empty. A seeded admin login therefore returns authentication failure in a
freshly provisioned tenant. This is documented in
`../PROJECT-FLOW-AUDIT-STATUS.md` and
`_doc/project-progress/2026-09-12-tenant-admin-bootstrap-blocker-shot-29.md`.

Study this as an explicit release gate. Do not work around it by inserting
users directly into tenant databases. The senior-level fix is an audited,
tenant-bound, expiring, single-use owner invitation or activation flow that
creates the tenant identity, establishes credentials, and creates a session.

## Tests to read

```text
src/core/security/auth-tenant-binding.spec.ts
src/core/security/permissions.guard.spec.ts
src/tenancy/tests/tenant-membership.guard.spec.ts
src/tenancy/tests/tenant-admin-guard-coverage.spec.ts
src/platform/guards/platform-auth.guard.spec.ts
src/features/authentication/auth/tests/auth.service.spec.ts
```
