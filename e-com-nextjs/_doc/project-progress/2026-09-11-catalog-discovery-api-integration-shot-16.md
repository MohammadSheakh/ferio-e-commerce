# Catalog and Discovery API Integration Shot 16

Date: 2026-09-11

## Scope

Audited tenant-admin product, category, brand, inventory, and hero/catalog
callers, plus customer storefront catalog listing, product detail, filters,
and purchase-activity callers.

## Findings

- Tenant-admin product list/create/update/status calls match the
  `/admin/catalog/products` controller and DTOs. The edit page correctly uses
  the server-side `adminApi` for the GET detail call; the browser BFF handles
  mutations.
- Category and brand CRUD callers match the corresponding admin BFFs and
  `POST/PATCH/DELETE` controller methods.
- Inventory list, movement history, and adjustment callers match the BFF and
  `InventoryQueryDto`/`AdjustInventoryDto` contracts, including paisa-based
  `unitCost` and ISO `effectiveAt` normalization.
- Customer storefront catalog callers use the public catalog routes and only
  send filters supported by `ProductQueryDto`: category, search, featured,
  condition, price bounds, stock, sort, and variant attributes.
- Customer product detail and purchase-activity callers preserve the public
  slug and `surface/page/limit` contracts.

## Changes

- Corrected admin catalog documentation for separate brand list/create versus
  brand update/delete methods and added inventory pagination/search fields.
- Removed the unsupported storefront `brand` product-list query and documented
  the supported product filters and server-side search fields.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E, live
tenant-host/cache isolation, large-catalog performance evidence, or production
operational acceptance.
