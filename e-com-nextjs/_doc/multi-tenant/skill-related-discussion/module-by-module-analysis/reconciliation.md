# Reconciliation Module

## Scope

Admin reconciliation findings, alerts, scans, queue health, retries, and
finding actions.

## Architecture Score

**80%**. Strong operational intent, queue separation, actor-aware actions,
and retry concepts. Aggregation scale and idempotent action semantics need
continued hardening.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/reconciliation/findings` | 78% | Bounded filters and tenant scope required. |
| `GET /admin/reconciliation/alerts` | 78% | Ensure alert acknowledgment and visibility rules are explicit. |
| `POST /admin/reconciliation/scan` | 80% | Must be permissioned, deduplicated, and queue-backed for expensive scans. |
| `GET /admin/reconciliation/queue-health` | 82% | Useful operational signal; keep it bounded and non-sensitive. |
| `POST /admin/reconciliation/runs/:id/retry` | 80% | Actor and idempotency handling are important. |
| `POST /admin/reconciliation/findings/:id/action` | 82% | High-risk mutation should use legal transitions and atomic audit. |

## Tasks

1. Add concurrent scan deduplication and per-tenant budgets.
2. Move large reconciliation aggregation to read models/workers.
3. Add rollback and duplicate-action tests.
