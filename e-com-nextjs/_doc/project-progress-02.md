# Ferio Project Progress 02

**Checkpoint date:** August 6, 2026  
**Milestone:** Release 1 — Catalog and inventory foundation  
**Status:** Initial catalog vertical slice completed and validated

## Delivered

### Backend

- Added category, product, product-variant, product-media, warehouse, inventory-stock, and inventory-movement Prisma models.
- Added a migration artifact for the catalog and inventory foundation.
- Added protected admin APIs for category creation/listing, product creation/listing/detail, publication status, and manual stock adjustment.
- Added public APIs that expose only active, published products and active categories.
- Added PostgreSQL search across product name, brand, category, and SKU.
- Added category and featured filters with paginated results.
- Stored BDT prices in integer minor units and validated compare-at pricing.
- Added one default `MAIN` warehouse and SKU-level initial stock creation.
- Added immutable initial-stock and manual-adjustment movement records with actor and reason.
- Added safe slug generation, duplicate slug/SKU handling, URL validation, and admin role enforcement.

### Admin Web

- Added real category list and creation workflows.
- Replaced product-list mock data with the protected NestJS catalog API.
- Replaced mock product creation with a real API-backed form.
- Added initial SKU, price, compare-at price, stock, low-stock threshold, publication, COD, delivery note, and image URL fields.
- Kept backend access behind the existing HTTP-only admin session through server-side API routes.

### Customer Web

- Removed the static product dataset from the production catalog path.
- Connected the home page, category list, product listing, search, category filtering, and product detail to public catalog APIs.
- Added unpublished-product protection through backend queries.
- Added variant selection and SKU-aware cart lines.
- Converted product and cart displays to minor-unit-safe BDT formatting.
- Added empty, unavailable, and API-unavailable-safe catalog states.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 26 schema fragments processed |
| Backend | Unit tests | Passed; 2 suites and 6 tests |
| Backend | Production build | Passed |
| Admin Web | TypeScript check | Passed |
| Admin Web | Production build | Passed; category and catalog API routes included |
| Customer Web | TypeScript check | Passed |
| Customer Web | Production build | Passed; catalog routes render dynamically |

## Still Partial

- The migration has not been applied to a disposable or live PostgreSQL database.
- Category editing, hierarchy, deactivation, and ordering UI remain.
- Product editing, archive/unpublish actions, multi-variant editing, and media ordering UI remain.
- S3-compatible media upload is not connected; the current form accepts validated external URLs.
- Inventory adjustment and low-stock/discrepancy screens remain, although the protected backend adjustment command exists.
- Price, availability, and variant-attribute storefront filters remain.
- Checkout and order placement remain mock behavior and are not counted as delivered commerce functionality.
- Live full-stack browser testing requires running PostgreSQL, Redis, the API, and both frontends.

## Recommended Next Work

Complete Slice 1 before moving into checkout:

1. Add product edit, status, archive, and multi-variant administration.
2. Add inventory adjustment, movement history, and low-stock views.
3. Connect S3-compatible product media upload and ordering.
4. Add remaining storefront filters and product metadata.
5. Apply the migration in a disposable environment and run API integration tests.
