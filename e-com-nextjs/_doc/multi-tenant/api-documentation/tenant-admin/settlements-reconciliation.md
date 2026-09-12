# Tenant Admin — Settlements & Reconciliation (finance role)

**Frontend:** `app/dashboard/reconciliation/page.tsx`, `components/reconciliation/*`, `lib/settlements.ts`
**Verified against:** settlements + settlement-imports + reconciliation controllers

---

## Courier settlement imports
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/settlements/imports/template` | Canonical CSV template download |
| 2 | POST | `/admin/settlements/imports/preflight` `{ provider, fileName, content }` | Validate headers/rows/checksums BEFORE submit |
| 3 | POST | `/admin/settlements/imports` `{ provider, source, providerReportReference, bankReference, remittedAmount, settledAt, rows[], csvEvidence? }` | Import → APPLIED or NEEDS_REVIEW with per-row reasons; send `Idempotency-Key` as a request header |
| 4 | GET | `/admin/settlements/imports?page=` | Import history incl. supersede chains |
| 5 | GET | `/admin/settlements` · `/admin/settlements/eligible-collections` | Settlements + unclaimed COD collections |

Row-level deduplication keys make replays safe; corrections claim the review
import atomically and never partially settle valid rows.

## Reconciliation
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/reconciliation/findings?page&limit&domain&severity&status` | Findings queue (INVALID_STOCK_BALANCE etc.) |
| 2 | POST | `/admin/reconciliation/scan` `{ overdueHours }` | Idempotent scan run (dedup key) |
| 3 | GET | `/admin/reconciliation/queue-health` | Queue counts, schedule, operations summary, and recent run evidence |
| 4 | GET | `/admin/reconciliation/alerts` | Operational reconciliation alerts for the dashboard overview |
| 5 | POST | `/admin/reconciliation/findings/:id/action` `{ action: CLAIM\|ACKNOWLEDGE\|RESOLVE\|REOPEN, note }` | Manual resolution path |
| 6 | POST | `/admin/reconciliation/runs/:runId/retry` | Retry failed run |

Run evidence is intentionally returned by queue health as `recentRuns`; there is
no standalone `GET /admin/reconciliation/runs/:runId` route. The dashboard uses
that bounded operational view when presenting failed-run retry controls.
The reconciliation scan accepts `{ overdueHours? }` and forwards the
`Idempotency-Key` header for safe retries.
