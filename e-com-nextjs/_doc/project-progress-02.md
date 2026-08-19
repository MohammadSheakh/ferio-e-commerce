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


===========================================


# Ferio Project Progress 03

**Checkpoint date:** August 6, 2026  
**Milestone:** Release 1 — Catalog operations and storefront discovery  
**Status:** Second catalog pass completed and validated

## Delivered

### Backend

- Added category editing, hierarchy, ordering, activation, and safe deactivation rules.
- Prevented category deactivation while it contains published products.
- Added complete product editing for core content, SEO fields, delivery terms, return terms, ordered media, and variants.
- Added new-variant creation with SKU, attributes, minor-unit price, compare-at price, weight, threshold, and initial stock.
- Added lifecycle safeguards for draft, active, and archived products.
- Prevented publication without an active category and at least one active variant.
- Prevented an active product edit from disabling every variant.
- Added inventory queue APIs with low-stock and discrepancy states.
- Added protected inventory adjustments and movement-history APIs.
- Added price, stock, attribute, category, featured, search, and sort query contracts.
- Corrected public catalog serialization so inactive variants and internal warehouse breakdowns are not exposed.
- Made in-stock filtering use computed available stock after reservations and damaged quantities.

### Admin Web

- Added category editing, parent selection, ordering, and activation controls.
- Added a shared product form for creation and editing.
- Added multiple variant rows with SKU, pricing, attributes, weight, active state, and stock thresholds.
- Added product media ordering through managed URL rows.
- Added product delivery, return, featured, COD, and SEO controls.
- Added publish, move-to-draft, and archive actions.
- Added product edit routes and protected backend-for-frontend API routes.
- Added an Inventory navigation item and operational inventory screen.
- Added product/SKU search, low-stock filtering, discrepancy labels, adjustments, and movement history.
- Followed the Ferio design language: whitespace-led sections, hairline tables, pill actions, muted semantic status, and direct operational copy.

### Customer Web

- Added minimum and maximum price filters.
- Added computed in-stock filtering.
- Added generic variant-attribute filtering.
- Added newest, price, and name sorting.
- Added ordered product media presentation.
- Added product return information.
- Added product-level title, description, and Open Graph metadata.
- Added dynamic sitemap output for storefront, categories, and published products.
- Added `NEXT_PUBLIC_SITE_URL` configuration.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed |
| Backend | Unit tests | Passed; 2 suites and 8 tests |
| Backend | Production build | Passed |
| Admin Web | TypeScript check | Passed |
| Admin Web | Production build | Passed; 16 routes generated |
| Customer Web | TypeScript check | Passed |
| Customer Web | Production build | Passed; sitemap route generated |

## Still Open

- The catalog migration has not been applied to a disposable or live PostgreSQL database.
- Database integration, concurrency, and browser end-to-end tests remain.
- Product and category mutation audit records remain beyond inventory movement history.
- S3-compatible media upload remains unconfigured; the admin currently manages validated image URLs.
- Banglish/transliteration search normalization remains.
- Analytics events for catalog views, search, filters, and cart actions remain.
- Device performance, keyboard, and screen-reader validation remain.
- Checkout and order placement remain mock behavior and are not production functionality.

## Recommended Next Work

1. Apply the migration to a disposable PostgreSQL database and run live catalog API integration tests.
2. Add persistent guest cart identity and storage.
3. Add server-side cart revalidation for publication, price, stock, and quantity.
4. Begin customer/address and checkout domain models after cart behavior is stable.
5. Connect managed object storage when provider credentials and bucket policy are approved.


===============================================


# Ferio Project Progress 04

**Checkpoint date:** August 6, 2026  
**Milestone:** Release 1 — Persistent guest cart  
**Status:** Guest cart persistence and server revalidation completed

## Delivered

### Backend

- Added `Cart`, `CartItem`, and `CartStatus` Prisma models.
- Added a dedicated persistent guest-cart migration.
- Added opaque 256-bit guest cart tokens stored only as SHA-256 hashes.
- Added 30-day cart expiry refreshed by successful mutations.
- Added public APIs to read, add, update, remove, and revalidate cart lines.
- Added transactional creation of the first cart and its first item.
- Stored the unit price observed when each line was added or intentionally updated.
- Recalculated current prices and subtotal from PostgreSQL on every cart read.
- Revalidated product publication, category state, variant state, computed available stock, and quantity.
- Added warning issues for price changes and blocking issues for unavailable products, variants, stock, or quantity.
- Kept cart storage separate from inventory reservation; reservation begins only after the checkout policy is approved.

### Customer Web

- Added a server-side cart bridge using an HTTP-only `ferio_cart` cookie.
- Kept the opaque backend token unavailable to browser JavaScript.
- Replaced the in-memory cart context with API-backed persistent cart state.
- Connected add, remove, quantity update, load, and explicit revalidation operations.
- Added loading and safe backend-error states.
- Added line-level price-change, stock, quantity, publication, and variant messages.
- Disabled checkout navigation while blocking cart issues exist.
- Labelled subtotal as an estimate and removed the hardcoded delivery fee from cart totals.
- Removed random fake-order creation and fake success references from checkout.
- Kept the checkout scaffold visibly disabled until customer, address, pricing, and order APIs exist.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 27 schema fragments |
| Backend | Unit tests | Passed; 3 suites and 11 tests |
| Backend | Production build | Passed |
| Customer Web | TypeScript check | Passed |
| Customer Web | Production build | Passed; 4 cart API routes generated |

## Still Open

- Cart migrations have not been applied to a disposable or live PostgreSQL database.
- Live persistence across browser restarts has not been browser-tested with a running backend and database.
- Authenticated customer cart merge remains deferred until verified customer accounts exist.
- Abandoned-cart eligibility remains deferred until customer identity and consent exist.
- Customer profiles, Bangladesh phone normalization, and addresses remain.
- Delivery fees, coupons, promotional consent, and checkout totals remain.
- Inventory reservation, idempotent order placement, COD workflow, and real order confirmation remain.
- Checkout no longer fakes success, but it is intentionally not operational yet.

## Recommended Next Work

1. Model commerce customers separately from staff authentication users.
2. Add normalized Bangladesh phone handling while preserving original input.
3. Add reusable addresses and immutable checkout address snapshots.
4. Add configurable delivery regions, fees, and free-delivery thresholds.
5. Add server-calculated checkout preview before order creation.
