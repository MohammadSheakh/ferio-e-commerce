# Storefront Analytics Module

## Scope

Public storefront event ingestion and admin analytics dashboard aggregation.

## Architecture Score

**65%**. Event sanitization and measured aggregation direction are positive,
but module wiring and analytics scale need continued attention.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /storefront-analytics/events` | 68% | Sanitize and bound event payloads; rate-limit anonymous ingestion and stamp tenant from context. |
| `GET /storefront-analytics/dashboard` | 62% | Expensive aggregation needs date bounds, indexes/read models, and cache policy. |

## Tasks

1. Keep explicit `TenancyModule` wiring and add module bootstrap regression test.
2. Queue/batch event writes if request latency or volume requires it.
3. Build time-bucketed aggregates for dashboard queries.
4. Add abuse controls and retention/privacy policy.
