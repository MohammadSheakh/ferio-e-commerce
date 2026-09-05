# Order Module

## Scope

Customer order placement/tracking and admin order listing, policy, status,
fulfillment, pickup, exception, and handover operations.

## Architecture Score

**86%**. This is one of the most mature domains: idempotent order placement,
transactional state changes, audit intent, tenant routing, and explicit
fulfillment workflows are present.

## Routes

| Route group | Score | Review |
|---|---:|---|
| `POST /checkout/orders`, `/checkout/orders/wallet` | 88% | Strong placement boundary; verify idempotency under retries and inventory races. |
| `POST /orders/track` | 82% | Public tracking must use non-guessable references and rate limits. |
| `PATCH /orders/:id/store-pickup/schedule` | 82% | Ownership and pickup availability need concurrency tests. |
| `GET /admin/orders`, `/admin/orders/:id` | 86% | Admin tenant scope and projection are good; verify query/index scale. |
| `GET/PATCH /admin/orders/cod-policy` | 84% | Policy mutation should be audited and tenant-scoped. |
| `POST /admin/orders/:id/confirm`, `/cancel`, `/fulfillment` | 88% | State transitions should remain transactionally audited and legal-transition checked. |
| `PATCH /admin/orders/:id/store-pickup/status` | 86% | Good domain-specific transition; test retries/races. |
| `POST /admin/orders/:id/store-pickup/verify-handover` | 86% | High-risk handover needs idempotency and actor evidence. |
| `POST /admin/orders/:id/fulfillment-exceptions*` | 84% | Good exception workflow; verify permission granularity and duplicate actions. |

## Tasks

1. Add stress tests for placement and state transitions.
2. Verify all admin reads use bounded cursors and covering indexes.
3. Complete order event/outbox guarantees for external notifications.
