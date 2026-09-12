# Discovery and Product API Integration Shot 26

Date: 2026-09-11

## Scope

Compared the customer product listing/detail pages, catalog helper, review BFF,
product-content fetch, and purchase-activity surface with the NestJS catalog
and product-content controllers/DTOs.

## Findings and changes

- Product detail slug routing, server-side tenant forwarding, product-content
  loading, and authenticated YouTube review submission matched the backend
  routes and DTOs.
- Found an integration completeness gap in catalog pagination: the backend
  `ProductQueryDto` accepts `page` and returns `page/totalPages`, but the
  storefront helper omitted `page` and the listing had no pagination controls.
- Added page forwarding and filter-preserving previous/next controls to the
  customer product listing.
- The public `/catalog/brands` endpoint exists, but the current storefront has
  no brand filter or caller. Updated documentation to mark it as an optional
  unused surface instead of claiming it is integrated.

## Verification

The customer app will be verified with `api:check`, TypeScript, and lint before
commit. Live proof remains blocked until the local application stack and public
staging host are available.

## Remaining runtime proof

Runtime checks still need product-list pagination under a large catalog,
host-aware SSR cache behavior, unavailable/hidden product handling, review auth
and moderation visibility, purchase-activity consent, and cross-tenant cache
isolation.
