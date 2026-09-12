# Customer API Integration Shot 01

**Date:** 2026-09-11
**Scope:** Customer storefront tenant-resolution API integration.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Finding and fix

`GET /api/v1/tenancy/status` is returned by NestJS's global response
interceptor as `{ success: true, data: { code, storeName? }, message }`.
The customer storefront previously cast the full JSON object directly to
`TenantStatus`, so `tenant.code` was undefined for a healthy tenant. That
could cause the root layout, metadata, robots, and sitemap to treat an active
tenant as unavailable.

`ferio-customer-web/lib/tenancy.ts` now parses the documented envelope and
keeps a compatibility path for older unwrapped staging responses. Unknown or
malformed payloads fail closed as `TENANT_UNAVAILABLE`.

## Validation

```text
pnpm exec tsc --noEmit
passed in ferio-customer-web

pnpm lint
passed in ferio-customer-web
```

The API documentation status was updated with the corrected contract. This is
one verified integration correction, not a claim that every API has now been
validated end-to-end. Remaining shots must compare each frontend BFF route and
screen flow with the backend OpenAPI/controller surface and exercise live
tenant-host behavior.
