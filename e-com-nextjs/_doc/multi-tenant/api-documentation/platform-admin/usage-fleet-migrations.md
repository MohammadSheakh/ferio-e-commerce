# Platform Admin — Migrations Fleet, DB Health & Maintenance

**Frontend:** `app/migrations`, `app/database-health`
**Verified against:** `migration-orchestrator.service.ts`, platform controller
migration routes, database-health endpoint

---

## Fleet migrations (canary → batch → fleet)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/migrations` `{ canaryOrganizationId?, batchSize?, concurrencyLimit? }` | Start run (1–10 clamp) |
| 2 | GET | `/platform/migrations` · `/platform/migrations/:runId` | Run status + per-tenant results |
| 3 | POST | `/platform/migrations/:runId/pause` / `resume` | Operator controls (two-failure pause proven) |

Every migration executes with lock/statement timeouts and supports the
`-- FERIO: NON_TRANSACTIONAL` marker for CONCURRENTLY-style statements.

## Database health (fleet drift view)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/database-health` | Each READY registry vs canonical head (`MIGRATION REQUIRED` highlight) + fleet summary |

## Retention maintenance
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/maintenance/retention-sweep` | Prune CommerceMessage/analytics/GPS across fleet (AuditLog 7y default) — audited |

Daily scheduler runs automatically when RETENTION_SWEEP_ENABLED=true.
