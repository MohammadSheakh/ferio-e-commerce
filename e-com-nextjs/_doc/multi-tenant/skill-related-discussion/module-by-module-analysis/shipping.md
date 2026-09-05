# Shipping Module

## Scope

Courier provider routing, shipment lifecycle, webhook/poll workers, scorecards,
provider configuration, and admin shipment operations.

## Architecture Score

**70%**. Adapter separation, provider readiness, webhook leases, and queue
health are strong; tenant worker context and expensive scorecard reads remain
important risks.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/shipping/providers` | 76% | Safe readiness projection; protect credentials. |
| `GET /admin/shipping/scorecard` | 58% | Current aggregation loads provider/shipment data broadly; move to bounded/read-model computation. |
| `POST /admin/shipping/router/recommend` | 72% | Routing boundary is clear; test provider configuration and tenant policy. |
| `GET /admin/shipping/shipments` | 72% | Must use bounded cursor filters. |
| `GET /admin/shipping/webhooks` | 72% | Admin operational query needs retention/index bounds. |
| `GET /admin/shipping/webhooks/queue-health` | 78% | Good operational boundary with safe metadata. |
| `POST /admin/shipping/webhooks/:id/retry` | 74% | Idempotent retry and tenant job envelope required. |
| `GET /admin/shipping/polls` | 72% | Bound by time/status and tenant. |
| `GET /admin/shipping/polls/queue-health` | 78% | Good operational surface. |
| `POST /admin/shipping/shipments/:id/poll` | 74% | Provider call must remain outside DB transaction. |
| `PATCH /admin/shipping/providers/:code` | 70% | Configuration mutation requires audit and cache invalidation. |
| `GET/POST /admin/shipping/orders/:orderId` | 76% | Shipment/order invariants and idempotency need tests. |
| `POST /webhooks/couriers/:provider` | 80% | Raw-body/signature/tenant binding are correct priorities; add provider contract tests. |

## Tasks

1. Make organization identity mandatory for tenant-mode workers.
2. Replace scorecard full scans with aggregates or bounded async jobs.
3. Add provider circuit breakers, callback replay tests, and audit coverage.
