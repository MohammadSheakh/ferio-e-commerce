# Tenant Admin — Dashboard / Overview (role: admin)

**Frontend:** `ferio-admin-dashboard/ferio-admin/app/dashboard/page.tsx` (+ PlanUsageCard)
**Verified against:** `reports.controller.ts`, `operations-health.controller.ts`,
reconciliation/shipping/payments `queue-health` endpoints, `/tenancy/my-plan`

All routes below are prefixed `/admin/...` or documented absolute, and run
under `AuthGuard → RolesGuard(admin) → PermissionsGuard → TenantMembershipGuard`.

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/reports/overview?from&to&source&provider` | Placed→delivered funnel, revenue, finance/COD variance, ops counters |
| 2 | GET | `/admin/operations/health` | Queue/system health tiles |
| 3 | GET | `/admin/reconciliation/queue-health` | Reconciliation sweep backlog |
| 4 | GET | `/admin/payments/recovery/queue-health` | Prepaid recovery backlog |
| 5 | GET | `/admin/shipping/polls/queue-health` | Courier polling backlog |
| 6 | GET | `/tenancy/my-plan` | Current plan, entitlement limits, live usage vs limits (Plan & Usage card) |

Warning state: usage ≥ registry threshold flips `warning:true`; the same
signal emits a one-time structured warn + counter server-side.
