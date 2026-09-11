# Platform API Integration Shot 02

**Date:** 2026-09-11
**Scope:** Platform-admin BFF HTTP method coverage.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Finding and fix

The platform-admin catch-all route at
`ferio-platform-admin/app/api/platform/[...path]/route.ts` accepted only
`GET`, `POST`, and `PATCH`. The backend OpenAPI contract also exposes `PUT`
and `DELETE` platform operations, including entitlement overrides and feature
flags. Those requests could not cross the frontend BFF boundary even though
the backend and generated client contract supported them.

The route now forwards `GET`, `POST`, `PATCH`, `PUT`, and `DELETE` through the
same server-side `platformApi` session path. The operator token remains in the
httpOnly cookie and is not exposed to browser JavaScript.

## Validation

```text
pnpm exec tsc --noEmit
passed in ferio-platform-admin

pnpm lint
✔ No ESLint warnings or errors
```

The OpenAPI platform surface was compared against the BFF method contract:
the supported methods now cover all methods used by the documented platform
paths. Browser execution, authorization-denial UX, and provider/production
behavior remain separate validation gates.
