# Tenant Admin — Settlements & Reconciliation (finance role)

**Frontend:** `app/settlements`, `app/reconciliation`
**Verified against:** settlements + settlement-imports + reconciliation controllers

---

## Courier settlement imports
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/settlements/imports/template` | Canonical CSV template download |
| 2 | POST | `/admin/settlements/imports/preflight` `{ provider, fileName, content }` | Validate headers/rows/checksums BEFORE submit |
| 3 | POST | `/admin/settlements/imports` `{ idempotencyKey, provider, rows[], csvEvidence }` | Import → APPLIED or NEEDS_REVIEW with per-row reasons |
| 4 | GET | `/admin/settlements/imports?page=` | Import history incl. supersede chains |
| 5 | GET | `/admin/settlements` · `/eligible-collections` | Settlements + unclaimed COD collections |

Row-level deduplication keys make replays safe; corrections claim the review
import atomically and never partially settle valid rows.

## Reconciliation
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/reconciliation/findings?status=` | Findings queue (INVALID_STOCK_BALANCE etc.) |
| 2 | POST | `/admin/reconciliation/scan` `{ overdueHours }` | Idempotent scan run (dedup key) |
| 3 | GET | `/admin/reconciliation/runs/:runId` | Run evidence |
| 4 | POST | `/admin/reconciliation/findings/:id/action` `{ action: RESOLVE\|AUTO_FIX }` | Manual/auto resolution path |
| 5 | POST | `/admin/reconciliation/runs/:runId/retry` | Retry failed run |
