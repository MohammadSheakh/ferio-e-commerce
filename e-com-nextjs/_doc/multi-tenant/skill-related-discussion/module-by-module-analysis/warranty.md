# Warranty Module

## Scope

Customer warranty order-item/evidence/claim submission and admin claim
listing/status management.

## Architecture Score

**70%**. Public/customer and admin concerns are separated and the service has
a focused domain. Evidence upload, claim eligibility, state transitions, and
retention need stronger security and concurrency coverage.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /warranty/order-items` | 70% | Must verify authenticated order ownership and tenant scope. |
| `POST /warranty/evidence/upload` | 66% | Validate private storage, content type, size, ownership, and orphan cleanup. |
| `POST /warranty/claims` | 70% | Idempotency and eligibility must be checked against authoritative order state. |
| `GET /warranty/claims/mine` | 74% | Owner-scoped list requires bounded pagination and safe projection. |
| `GET /admin/warranty` | 74% | Admin list must use tenant membership and bounded filters. |
| `PATCH /admin/warranty/:id/status` | 72% | State transition, audit, and notification effects should be atomic/outboxed. |

## Tasks

1. Add claim state-machine and duplicate-submission tests.
2. Enforce evidence ownership and private object access.
3. Add indexes/retention for claim status and createdAt queries.
