# Settings Module

## Scope

Generic tenant settings and commerce-specific storefront configuration,
including public reads and admin writes/pagination.

## Architecture Score

**72%**. DTO validation, Redis caching, and cursor pagination exist, but the
generic settings API has compatibility-shaped responses and requires careful
JSON typing and cache invalidation.

## Routes

| Route group | Score | Review |
|---|---:|---|
| `POST/GET/DELETE /settings` | 72% | Admin guard and DTOs are present; define setting ownership and audit contract. |
| `GET /settings/all` | 68% | Verify maximum result bounds and sensitive-setting projection. |
| `GET /settings/paginate` | 76% | Offset pagination is acceptable for small settings sets; cap limits. |
| `GET /settings/paginate/v2` | 78% | Cursor direction is better; verify stable ordering/indexes. |
| `GET /store/config` | 78% | Public configuration must expose only allowlisted fields. |
| `GET/PATCH /admin/commerce-settings` | 76% | Tenant admin mutation needs write gate, audit, and cache invalidation. |

## Tasks

1. Replace generic JSON escape hatches with typed setting schemas by key.
2. Add cache invalidation and concurrent-update tests.
3. Remove duplicate response fields once frontend contract migration is done.
