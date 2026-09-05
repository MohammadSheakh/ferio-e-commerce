# Product Content Module

## Scope

Public product reviews and admin review moderation/banner management.

## Architecture Score

**58%**. The module is understandable and has public/admin separation, but it
has confirmed write-gate, error-masking, formatting, and test-coverage gaps.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /product-content/:slug` | 70% | Public read should project bounded content and cache safely. |
| `POST /product-content/:productId/reviews` | 48% | Broad exception handling can misreport outages as duplicates; add write gate and ownership/order eligibility checks. |
| `GET /admin/product-content/reviews` | 62% | Admin read needs bounded pagination and explicit permission. |
| `PATCH/DELETE /admin/product-content/reviews/:id` | 62% | Moderation should be audited and tenant-scoped. |
| `GET/POST /admin/product-content/products/:productId/banners` | 62% | Validate product ownership, media constraints, and write gate. |
| `PATCH/DELETE /admin/product-content/banners/:id` | 62% | Use tenant-scoped lookup and audit. |

## Tasks

1. Translate only expected Prisma uniqueness errors; rethrow unknown failures.
2. Add `assertTenantCommerceWritable()` to all commerce mutations.
3. Add moderation, review eligibility, pagination, and failure tests.
4. Reformat compressed source and split read/mutation responsibilities.
