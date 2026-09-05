# Customers Module

## Scope

Admin customer list and detail views.

## Architecture Score

**69%**. Simple read-only admin boundary with low mutation risk, but it must
remain strictly tenant-scoped and avoid wide customer projections.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/customers` | 70% | Admin and tenant membership protection should be paired with bounded query DTOs. |
| `GET /admin/customers/:id` | 68% | Must project only needed fields and reject cross-tenant IDs. |

## Tasks

1. Verify guards and tenant indexes in integration tests.
2. Add search normalization, maximum page size, and sensitive-field projection.
3. Add authorization tests for staff roles and customer ownership boundaries.
