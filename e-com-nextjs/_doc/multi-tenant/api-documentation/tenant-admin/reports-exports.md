# Tenant Admin — Reports & Exports

**Frontend:** `app/reports`, export buttons
**Verified against:** `reports.controller.ts`

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/reports/overview?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&source=&provider=` | Funnel outcomes, revenue (gross/delivered/net-of-refund), finance (COD variance/refunds/RTO cost), operations counters, dimensions by source/provider. Bounded-memory aggregation (chunked fold). |
| 2 | GET | `/admin/reports/orders-export?dateFrom&dateTo&source&provider` | CSV stream capped at 5,001 rows per pull |

Delivered-order contribution reporting is explicitly `INCOMPLETE` until
approved cost inputs exist — the API says so rather than guessing.
