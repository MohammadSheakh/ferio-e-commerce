# Transactional Messaging Module

## Scope

Admin message logs, policies, templates, queue health, retry operations, and
provider dispatch.

## Architecture Score

**79%**. Outbox/lease thinking, tenant fan-out, structured logs, queue health,
and retry controls are strong. Provider idempotency and template safety need
continued testing.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/transactional-messages` | 78% | Bounded operational list and sensitive-content projection required. |
| `GET /admin/transactional-messages/policy` | 78% | Tenant-scoped configuration read. |
| `GET /admin/transactional-messages/templates` | 78% | Safe template projection and versioning required. |
| `PATCH /admin/transactional-messages/templates/:key` | 78% | Validate keys/content, audit changes, and invalidate cache. |
| `PATCH /admin/transactional-messages/policy` | 78% | Write gate, audit, and concurrent update semantics required. |
| `GET /admin/transactional-messages/queue-health` | 82% | Good operations boundary; keep provider data safe. |
| `POST /admin/transactional-messages/:id/retry` | 80% | Lease/idempotency and tenant identity must be preserved. |

## Tasks

1. Add provider acceptance/retry/idempotency integration tests.
2. Verify stale lease handling and operator-visible dead-letter states.
3. Add template injection/sanitization tests and delivery metrics.
