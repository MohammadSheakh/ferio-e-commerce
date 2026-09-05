# RTO Module

## Scope

Admin return-to-origin shipment listing and inspection.

## Architecture Score

**71%**. Focused operational boundary with clear admin routes, but it depends
on shipping/order state and needs worker/idempotency verification.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/rto` | 72% | Bound filters, tenant scope, and status indexes are required. |
| `POST /admin/rto/:id/inspect` | 72% | Inspection must be idempotent and audit actor/result changes. |

## Tasks

1. Define RTO state transitions and ownership with shipping.
2. Add queue retry and duplicate inspection tests.
3. Verify pagination and indexes for aging RTO records.
