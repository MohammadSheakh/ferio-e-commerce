# Service Booking Module

## Scope

Public service discovery/detail/booking request and admin service plus booking
management.

## Architecture Score

**60%**. The route split is understandable, but the module is missing the
suspended-tenant write gate, audit depth, and high-risk booking tests noted in
the baseline analysis.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /services` | 72% | Public read should be bounded and cacheable. |
| `GET /services/:slug` | 72% | Slug lookup must be tenant-scoped and projection-safe. |
| `POST /services/bookings/request` | 55% | Mutation needs suspended-tenant protection, idempotency, and availability race handling. |
| `GET /admin/services` | 68% | Admin list requires bounded query and permission review. |
| `POST /admin/services` | 55% | Missing write-gate/audit concern for tenant commerce mutation. |
| `PATCH /admin/services/:id` | 55% | Same suspension, ownership, and audit gap. |
| `DELETE /admin/services/:id` | 55% | Must protect active bookings and use safe deletion semantics. |
| `GET /admin/services/bookings/all` | 68% | Expensive list needs cursor/index strategy. |
| `PATCH /admin/services/bookings/:id/status` | 60% | State transition and notification side effects need transaction/outbox design. |

## Tasks

1. Add `assertTenantCommerceWritable()` to covered mutations.
2. Add booking availability/idempotency state machine and audit events.
3. Add tests for suspended tenants, duplicate requests, and concurrent slots.
