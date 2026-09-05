# Purchase Activity Module

## Scope

Customer and admin purchase activity reads.

## Architecture Score

**67%**. Read-only separation limits risk, but the module needs careful
ownership, projection, pagination, and tenant-index review.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /purchase-activity` | 70% | Customer identity must come from the authenticated principal, never a query parameter. |
| `GET /admin/purchase-activity` | 68% | Admin scope and bounded filters need verification. |

## Tasks

1. Add cross-tenant/customer authorization tests.
2. Use cursor pagination for high-activity accounts.
3. Project only activity fields needed by each client.
