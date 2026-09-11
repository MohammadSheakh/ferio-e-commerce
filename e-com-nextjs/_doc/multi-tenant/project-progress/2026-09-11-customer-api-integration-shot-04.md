# Customer API Integration Shot 04

**Date:** 2026-09-11
**Scope:** Customer storefront browser calls, Next.js BFF route coverage, and generated OpenAPI contract.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Verification

The static audit mapped customer browser and shared-library `fetch` calls to
the 51 Next.js API route files under `ferio-customer-web/app/api`. It covered
dynamic routes and catch-all routes, and found no unresolved browser-call
path or method mismatch in this shot.

The generated customer OpenAPI schema was stale by one backend contract:
`POST /api/v1/admin/storage/finalize-put` and its `FinalizePutDto`. The schema
was regenerated from `ferio-nest-prisma/openapi.json`.

## Validation

```text
pnpm api:check
passed

pnpm exec tsc --noEmit
passed in ferio-customer-web

pnpm lint
passed; existing non-blocking <img> optimization warnings remain
```

This is repository-level route and contract evidence. It does not prove
browser execution, cookie refresh behavior, tenant-host isolation, live SSR /
BFF forwarding, WebSocket runtime behavior, or production provider behavior.
