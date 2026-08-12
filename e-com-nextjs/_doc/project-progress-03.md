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
