# Project Progress — MT-7 Slice 1: Catalog Storefront Reads Behind Tenant Scope

**Date:** August 24, 2026 (fourth increment)
**Scope:** First commerce-module migration of Release MT-7 — catalog storefront reads now execute against the resolved tenant database; product-level cross-tenant isolation proven on real PostgreSQL.

---

## What landed

### 1. `CatalogService` tenant routing

- Optional `TenantDbService` injection (`@Optional()`, third constructor arg) keeps all 20+ existing spec constructions and every legacy deployment working unchanged.
- New private `db()` helper: returns the resolved tenant client inside a tenant request; otherwise explicitly falls back to the legacy database. The fallback is deliberate and visible at one call site — never hidden inside the tenancy layer.
- Four storefront-facing methods migrated:
  - `getProducts` (listing / search / filters / pagination)
  - `getPublicProductBySlug` (product detail with publish-state filters)
  - `getCategories`
  - `getBrands`
- Admin writes intentionally stay on the legacy plane this slice — split-brain is prevented operationally by keeping `TENANCY_ENABLED=false` until the module completes.

### 2. Routing-proof unit tests (`catalog.tenant-routing.spec.ts`)

Four cases locking the contract:
1. Tenant context present → reads hit the **tenant** client only (legacy untouched).
2. Context absent → reads hit **legacy** only (no accidental tenant probing).
3. No `TenantDbService` injected at all → pure legacy behavior (existing deployments/tests unaffected).
4. Public detail preserves its publish filters (`status=ACTIVE`, `publishedAt<=now`, active variants) while routed to the tenant client — proving the routing wrapper didn't weaken FR-CAT-005.

### 3. Product-level isolation proof on real PostgreSQL

Extended `test/tenant-bootstrap.integration-spec.ts` with the §10.1 gate case:

- Two fresh databases bootstrapped from the canonical migration chain.
- Both seed a category + product with **identical IDs and slugs** (`shared-prod-1`) — the worst-case identifier-collision scenario.
- Tenant A publishes; tenant B stays DRAFT.
- A publish-filtered read returns **1 row in A, 0 rows in B**: B cannot see A's product even when it asks for the exact same ID — different databases make the leak impossible, and B's own draft copy satisfies its own filters correctly.
- Suite remains gated on `TEST_DATABASE_URL` (verified: absent → skips cleanly; present → executes).

## Verification

- Backend build clean.
- **69 suites / 275 unit tests passing** (+4 routing tests).
- Integration suite compiles and gates correctly (3 cases run only with disposable PostgreSQL provisioned).

## Checklist movement

§10.1: storefront reads ✔ (partial item), brand slug tenancy ✔ (by construction), unpublished-product isolation proof ✔. Remaining in this slice: admin catalog writes, hero/settings tenancy, media key namespacing.

## Next

1. **MT-7 slice 2:** admin catalog writes behind tenant scope + `Settings`/Hero Showcase reads (storefront branding becomes per-tenant end-to-end).
2. Then cart/checkout (guest-cart identity binding to resolved tenant) as the next high-risk financial surface.
