# Tenant Admin — Analytics, Audit, and Operations Health

**Frontend:** `app/dashboard/charts`, `app/dashboard/analytics`,
`app/dashboard/audit`, `app/dashboard/operations-health`
**Verified against:** storefront analytics, reports, audit, and operations
health controllers plus the tenant-admin BFF routes.

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/storefront-analytics/dashboard?days=1..365` | Tenant-scoped aggregated storefront event dashboard |
| 2 | GET | `/admin/reports/overview?dateFrom&dateTo&source&provider` | Tenant-scoped commerce report used beside analytics charts |
| 3 | GET | `/admin/audit-logs?page&limit&action&entityType&entityId&actorId&source` | Append-only tenant audit history |
| 4 | GET | `/admin/operations/health` | Tenant operational health, queue/provider, and dependency indicators |

The analytics dashboard requires the reports-read permission and clamps
`days` server-side to 1 through 365. Audit and operations responses are
tenant-scoped through the authenticated admin BFF; they are not platform-fleet
views. Queue-health endpoints for individual workers remain documented with
their owning feature (messaging, shipping, payments, and reconciliation).
