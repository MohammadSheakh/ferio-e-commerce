# Ferio Project Progress 47

**Checkpoint date:** August 13, 2026
**Milestone:** Online warranty claim workflow
**Status:** Customers can submit image-backed warranty claims for verified delivered order items, and Admin can operate repair and brand-service lifecycles with append-only history

## Delivered

- Requires a valid customer login plus matching order reference and checkout phone before exposing delivered order items.
- Allows selection of an exact previous order item and requires a detailed issue description.
- Uploads one to five JPG, PNG, or WebP evidence images through the existing Cloudinary strategy with a 5 MB per-file limit.
- Persists image URL/public ID, immutable order/product/variant/SKU snapshots, submitter, handler, and timestamps in PostgreSQL.
- Prevents duplicate active claims for the same order item.
- Adds customer claim history at `/account/warranty`.
- Adds an Admin Warranty queue grouped by customer and item with evidence previews.
- Supports submitted, product received, diagnosis, sent to brand, received from brand, repaired, resolved, and rejected states.
- Requires a rejection reason and blocks skipped, reversed, or terminal-state transitions.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full unit suite | Passed; 28 suites and 98 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 29 pages generated |
| Admin Web | Production build | Passed; 58 pages generated |

## Operational Notes

- Deploy migration `20260814003000_warranty_claim_workflow` to target PostgreSQL.
- Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for evidence uploads.
- Warranty duration and category/brand coverage rules still require product-owner approval; this workflow verifies delivered ownership but does not invent eligibility periods.

## Recommended Next Work

1. Add approved warranty-period and brand/category eligibility policies.
2. Add customer-visible status history details and transactional updates.
3. Add courier pickup/return logistics only after the service policy is approved.
