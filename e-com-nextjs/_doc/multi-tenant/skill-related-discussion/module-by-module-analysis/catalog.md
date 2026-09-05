# Catalog Module

## Scope

Public catalog reads and admin category, brand, product, variant, inventory,
and movement management.

## Architecture Score

**88%**. This is the strongest feature module: clear public/admin split,
tenant routing, permissions, plan gates, write protection, bounded queries,
and transaction-aware mutations.

## Routes

| Route group | Score | Review |
|---|---:|---|
| `GET /catalog/categories`, `/brands`, `/products`, `/products/:slug` | 88% | Strong public read surface; verify cache invalidation and cursor strategy for large catalogs. |
| `GET /admin/catalog/categories`, `/brands`, `/products`, `/products/:id`, `/inventory` | 87% | Good admin read protection and bounded query DTOs. |
| `POST/PATCH/DELETE /admin/catalog/categories*` | 88% | Good permission and write-gate pattern; test uniqueness races. |
| `POST/PATCH/DELETE /admin/catalog/brands*` | 88% | Good domain boundary and audit expectations. |
| `POST/PATCH /admin/catalog/products*` | 90% | Strong transaction and tenant protections. |
| `PATCH /admin/catalog/products/:id/status` | 88% | State change should retain history/audit atomicity. |
| `PATCH /admin/catalog/inventory/:variantId` | 88% | Correct high-risk mutation surface; test concurrent stock updates. |
| `GET /admin/catalog/inventory/:variantId/movements` | 84% | Verify date/index bounds and export behavior. |

## Tasks

1. Add load tests for public product reads and cache behavior.
2. Verify all product/index queries against tenant and ownership indexes.
3. Add database-level invariants for SKU, slug, and inventory movements.
