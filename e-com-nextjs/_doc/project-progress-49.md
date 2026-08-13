# Ferio Project Progress 49

**Checkpoint date:** August 13, 2026
**Milestone:** Catalog-backed purchase-activity exclusions
**Status:** Admin can find and exclude products from public order activity without copying internal product IDs

## Delivered

- Adds authenticated `GET /api/catalog/products` proxy support in Admin Web while preserving the existing product-create route.
- Replaces the raw product-ID textarea in Global Order History settings with debounced server-side catalog search.
- Searches existing product name, brand, and SKU behavior through the established Admin catalog endpoint.
- Shows product name, category, and publication status before exclusion.
- Shows selected exclusions as named rows with explicit remove actions.
- Keeps unknown or legacy stored IDs visible and removable instead of silently dropping configuration.
- Saves the same product-ID array expected by the audited commerce-settings backend, so public activity filtering remains server-enforced.
- Follows the Ferio design language with plain text, hairline dividers, restrained grayscale, small radii, and no shadows or decorative color.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Admin Web | Production build | Passed; 60 pages generated |
| Admin Web | Type checking and route generation | Passed |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Catalog searches debounce for 250 ms and return at most eight suggestions per request.
- The first 100 products are loaded to resolve existing selected IDs to readable names; IDs outside that set remain visible as legacy catalog entries until searched or removed.
- No backend migration is required for this checkpoint.

## Recommended Next Work

1. Add database integration coverage for purchase-activity eligibility, order aggregation, exclusions, locality, and pagination.
2. Add customer-controlled withdrawal of future purchase-activity consent if the approved privacy policy requires it.
3. Continue Release 1 hardening with mixed Bangla/English customer and address tests.
