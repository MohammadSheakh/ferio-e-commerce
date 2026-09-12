# API Integration Verification — Tenant Admin Catalog & Inventory (Shot 47)

**Date:** 2026-09-11  
**Scope:** Tenant-admin catalog, inventory, and hero-showcase API callers  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

Catalog, category, brand, product, and inventory BFF routes matched the
`admin/catalog` controller methods and DTO query/body contracts. The documented
settings delete operation was different: NestJS exposed authenticated,
tenant-scoped `DELETE /settings?type=heroShowcase`, but the admin hero-showcase
BFF and screen only supported GET and POST.

## Fix

- Added `DELETE /api/hero-showcase` through the shared admin session transport.
- Added a confirmed admin action to remove the saved hero showcase.
- Restored the screen's built-in defaults only after server-side deletion
  succeeds, and made load/delete failures visible to the operator.
- Updated API verification status and retained the existing tenant-scoped,
  audited settings boundary.

## Verification

- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass.
- `git diff --check`: pass.

Live tenant authorization, settings-cache invalidation, browser behavior, and
cross-tenant isolation remain runtime gates. Redis was not changed.

