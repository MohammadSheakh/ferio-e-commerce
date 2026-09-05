# Store Locations Module

## Scope

Public pickup-store listing/availability and admin warehouse/store CRUD.

## Architecture Score

**70%**. Tenant routing and audit intent exist, but the module had pagination,
actor fallback, and suspension-policy concerns that require regression tests.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /store-locations` | 76% | Public projection is appropriate; verify cache and tenant host routing. |
| `POST /store-locations/check-availability` | 72% | Good stock comparison intent; bound variant count and avoid N+1 hub lookups. |
| `GET /admin/store-locations` | 68% | Must cap page size and use indexed search. |
| `POST /admin/store-locations` | 68% | Write gate/audit/unique-code race must be explicit. |
| `PATCH /admin/store-locations/:id` | 68% | Owner/tenant scope and audit required. |
| `DELETE /admin/store-locations/:id` | 68% | Protect inventory/orders and use safe deactivation semantics. |

## Tasks

1. Add suspension regression tests to every mutation.
2. Bound variant availability input and batch inventory reads.
3. Add warehouse code/index/concurrent update tests.
