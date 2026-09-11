# Cross-application BFF contract shot 30

Date: 2026-09-11

## Scope

Performed a shared transport review across customer web, tenant admin, and
platform admin API handlers, focusing on envelope preservation, upstream error
mapping, tenant/auth forwarding, and generated OpenAPI drift.

## Finding and change

- The customer delivery-application BFF parsed a successful backend envelope
  and then nested the entire envelope inside `data`. This differed from the
  other BFF handlers and made the public contract unnecessarily inconsistent.
  It now uses the shared `proxyBackendResponse` helper, preserving status,
  `success`, `data`, error code, and correlation ID consistently.
- The customer, tenant-admin, and platform-admin generated API checks all
  passed against the current NestJS OpenAPI document.
- No additional cross-app BFF status or tenant-forwarding mismatch was
  verified in this pass.

## Verification

- Customer `pnpm api:check`, TypeScript, and lint: passed; existing image
  optimization warnings remain.
- Tenant-admin `pnpm api:check`, TypeScript, and lint: passed; existing hook
  dependency/image warnings remain.
- Platform-admin `pnpm api:check`, TypeScript, and lint: passed with no lint
  warnings.

## Remaining runtime proof

This remains source-level evidence. Live BFF forwarding, cookie/auth behavior,
tenant-host isolation, WebSocket rooms, provider callbacks, idempotency races,
and operational capacity still require the local Docker/application stack or
staging tunnel. Mobile and Redis code were not touched.
