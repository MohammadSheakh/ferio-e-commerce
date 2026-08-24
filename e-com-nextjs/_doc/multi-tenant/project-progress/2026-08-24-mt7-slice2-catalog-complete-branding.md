# Project Progress — MT-7 Slice 2: Full Catalog Tenancy + Per-Tenant Branding

**Date:** August 24, 2026 (fifth increment)
**Scope:** Completes the catalog module migration (all reads AND writes) and pulls settings/branding tenancy forward — a tenant's storefront now renders its own name, flags, policies, and hero content end to end.

---

## What landed

### 1. Entire `CatalogService` behind tenant scope (17 methods)

Completed the slice-1 start: every `this.prisma` usage in the service now flows through the explicit `db()` resolution helper, including:

- **Admin writes** — category/brand/product create-update-publish-archive flows with their serializable `$transaction` blocks (transactions now belong to the resolved tenant client — a write and its audit row can never land in different databases);
- **Inventory surfaces** — stock views, movement history, manual adjustments;
- **Admin detail reads**.

Migration mechanics note: an automated method-sweep script mis-scoped two insertions (object-literal braces matched before signature braces), which unit tests caught immediately as `db is not defined`. The final approach strips and re-inserts resolutions strictly after each method's true signature-close (`) {`), then verifies programmatically that every `db.`-using method has its resolution within the first lines. Lesson recorded: mechanical multi-method rewrites require a structural verification step, not spot-checks.

### 2. Storefront branding per tenant (`CommerceSettingsService`)

- `get()` / `getPublic()` / `update()` resolve through the tenant client.
- Customer Web's store config (name, contacts, currency/timezone, COD/prepaid/service/warranty/analytics/social-proof flags, policy URLs) now comes from the **tenant's own database** inside storefront requests.
- Legacy behavior identical outside tenant requests (optional injection pattern throughout).

### 3. Hero Showcase + settings cache isolation (MT-8 hazard closed early)

- Public settings reads (`getSettingsByType`, serving Hero Showcase slides via `/settings?type=heroShowcase`) resolve through the tenant client.
- **Cache keys now carry organization identity**: `settings:{orgId}:{type}` vs legacy `settings:{type}` — identical setting types across tenants can no longer share a cached entry. Invalidation uses the same context-aware key builder, so writes inside a tenant request invalidate exactly that tenant's entry. This retires the checklist's §11.1 collision hazard for the one cache that existed in tenant-plane code today.

## Verification

- Backend build clean; **69 suites / 277 tests passing** (+2 branding-routing cases: tenant store name served from tenant DB; legacy name outside requests).
- The sweep-induced breakage was caught by the suite within one run — evidence the per-module test discipline is doing its job during this migration.

## Checklist movement

§10.1 catalog routing marked **complete**; new §10.1A records the pulled-forward settings/branding/cache-isolation work.

## Next

1. **MT-7 slice 3** — cart + guest-cart identity binding to the resolved tenant (cookie namespacing), then checkout draft/order placement: the first financial-path migration, requiring the membership guard so admin-plane sessions cannot straddle tenants when the flag flips on.
2. Membership/RBAC binding for tenant-admin sessions (MT-2 §5.3) — prerequisite for enabling `TENANCY_ENABLED` beyond read-only storefronts.
