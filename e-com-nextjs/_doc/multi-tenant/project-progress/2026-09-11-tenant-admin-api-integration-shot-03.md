# Tenant-admin API Integration Shot 03

**Date:** 2026-09-11
**Scope:** Browser-call to Next.js BFF route coverage for the tenant-admin dashboard.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Finding and fix

The store setup checklist called `/api/admin/delivery-zones`, but no Next.js
route existed at that path. The tenant-admin BFF is
`app/api/delivery-zones/route.ts`, which forwards to the backend
`/admin/delivery-zones` endpoint through the server-side `adminApi` transport.

The checklist now calls `/api/delivery-zones`, so its delivery-zone readiness
check reaches the same authenticated, tenant-scoped BFF used by the delivery
dashboard.

The broader static audit also checked 104 Next.js API route files and the
browser call sites in the tenant-admin app. Catch-all BFF routes for product
content, services, and staff were accounted for before classifying apparent
path mismatches. No additional verified browser-call route or method gap was
found in this shot.

The tenant-admin generated OpenAPI schema was also stale. Regeneration added
the entitlement override, payment recovery, storage finalize, messaging
provider, and related operation definitions, plus the two provider-config
DELETE operations already present in the backend contract.

## Validation

```text
pnpm exec tsc --noEmit
passed in ferio-admin

pnpm lint
passed; existing non-blocking hook-dependency and <img> warnings remain

pnpm api:check
passed after regenerating lib/api-schema.ts from the backend OpenAPI artifact
```

This is repository-level route-contract evidence only. Browser E2E, live
tenant-host/SSR/BFF behavior, authorization-denial UX, and production
provider behavior remain separate Release 1 gates.
