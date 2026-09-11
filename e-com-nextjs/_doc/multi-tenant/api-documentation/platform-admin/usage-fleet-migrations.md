# Platform Admin — Migrations Fleet, DB Health & Maintenance

**Frontend:** `app/migrations`, `app/database-health`
**Verified against:** `migration-orchestrator.service.ts`, platform controller
migration routes, database-health endpoint

---

## Fleet migrations (canary → batch → fleet)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/migrations` `{ canaryOrganizationId?, concurrencyLimit?, failureThreshold? }` | Start run with bounded concurrency and pause threshold |
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

## Backup evidence ledger
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/operations/backup-evidence` | Record checksum/protection/restore evidence from the trusted backup automation path |

This is an operations automation endpoint, not a browser form: the platform
admin catch-all BFF can forward the route with the platform httpOnly session,
but no frontend screen should allow an operator to self-assert a backup. The
backup job supplies the artifact, checksum, scope, completion time, and optional
restore/protection timestamps; operations health consumes the ledger for the
control-plane backup posture.

Retention sweep and backup-evidence writes remain automation-owned for the same
reason. The platform console may consume resulting health/read-only evidence,
but must not manufacture deletion or recovery proof from a browser.
