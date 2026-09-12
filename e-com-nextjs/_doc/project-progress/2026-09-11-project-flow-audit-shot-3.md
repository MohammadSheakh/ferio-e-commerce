# Project-Flow Documentation Audit — Shot 3

Date: 2026-09-11

## Scope

This shot reconciled platform-admin route and decorator examples in the MT-9
learning document with the NestJS platform controllers.

## Correction

The document used a conceptual `@RequirePlatformPermission` decorator and a
`POST /platform/organizations/:id/suspend` route. Neither exists in the
current backend. The source contract is:

```text
PATCH /api/v1/platform/organizations/:id/status
@PlatformPermissions('organization:write')
PlatformRequest.platformPrincipal
OrganizationsService.transition(...)
```

The teaching example now reflects that contract while explicitly remaining
pseudocode.

## Source Checks

- `ferio-nest-prisma/src/platform/platform.controller.ts` defines the
  controller prefix, status route, permission decorator, and request actor
  extraction.
- `ferio-nest-prisma/src/platform/guards/platform-auth.guard.ts` defines
  `PlatformPermissions` and the `organization:write` permission.
- `ferio-nest-prisma/src/platform/platform-request.type.ts` defines the
  platform request principal shape.

## Result

No backend or frontend code change was required. The MT-9 example no longer
teaches a route or decorator that would fail against the current API.
