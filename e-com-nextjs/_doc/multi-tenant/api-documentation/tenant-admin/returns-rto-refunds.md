# Tenant Admin — Returns, RTO, Refunds

**Frontend:** `app/returns`, `app/delivery` (RTO actions)
**Verified against:** `returns.controller.ts` (`@Controller('admin')` returns routes),
`rto.controller.ts`, `refunds.controller.ts`

---

## Returns lifecycle
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/returns?page&status=` | Case queue (aged-first) |
| 2 | GET | `/admin/orders/:orderId/returns/eligibility` | Policy evaluation before accept |
| 3 | POST | `/admin/orders/:orderId/returns` `{ items:[{itemId,qty,reason}], resolution }` | Open case (status RECEIVED→…) |
| 4 | POST | `/admin/returns/:id/review` `{ decision, note }` | Approve/partial/reject with reason |
| 5 | POST | `/admin/returns/:id/inspect` `{ receivedQty, condition, disposition }` | Explicit inventory disposition |
| 6 | GET/POST | `/admin/returns/:id/refund-eligibility` · `/refunds` | Refund creation referencing return+payment |

Refund status is tracked independently from return status (FR-RET-005).

## RTO
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/rto?from&to` | RTO queue with cost aggregation |
| 2 | POST | `/admin/rto/:id/inspect` `{ reason, costMinor }` | Record outcome for contribution reporting |
