# Platform Auth, Support Access, and BFF API Integration Shot 68

Date: 2026-09-11
Scope: platform login/logout, support-access lifecycle, and platform BFF error/transport behavior.

## Finding and fix

The support-access screen called list and revoke but had no caller for the
documented grant-creation operation:

- `POST /platform/support-access` `{ organizationId, reason, ttlMinutes?, scope? }`

Added a support-grant form with 5–480 minute TTL validation, 10–500 character
reason validation, and JSON-object scope parsing. It sends the exact backend
DTO shape through the existing `/api/platform/[...path]` BFF. Existing revoke
continues to use `POST /platform/support-access/:grantId/revoke`.

The platform BFF previously reduced upstream failures to `{ message }`. The
server session client now retains upstream status, `code`, and `correlationId`,
and the catch-all route returns them in the error envelope. Platform JWTs remain
in the httpOnly cookie and are never exposed to client JavaScript. Login accepts
the backend's top-level or enveloped access token; local logout clears the
cookie without fabricating a backend session revocation.

## Validation

- `ferio-platform-admin`: `pnpm api:check` passed.
- `ferio-platform-admin`: `pnpm exec tsc --noEmit` passed.
- `ferio-platform-admin`: `pnpm lint` passed with no warnings or errors.
- `ferio-platform-admin`: `pnpm build` passed and generated the support-access route.

## Boundary

This closes source-level auth/support BFF integration. It does not claim live
platform identity-provider behavior, role/permission authorization, support
scope enforcement, expiry/revocation races, or production auth evidence.
