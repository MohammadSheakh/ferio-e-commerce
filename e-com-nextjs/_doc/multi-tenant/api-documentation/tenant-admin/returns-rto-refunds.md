# Tenant Admin — Returns, RTO, Refunds

**Frontend:** `app/returns`, `app/delivery` (RTO actions)
**Verified against:** `returns.controller.ts` (`@Controller('admin')` returns routes),
`rto.controller.ts`, `refunds.controller.ts`

---

## Returns lifecycle
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/returns?page&limit&status=` | Case queue (aged-first) |
| 2 | GET | `/admin/orders/:orderId/returns/eligibility` | Policy evaluation before accept |
| 3 | POST | `/admin/orders/:orderId/returns` `{ reason, description, requestedResolution, requestChannel, items:[{orderItemId,quantity}], evidenceUrls? }` | Open case |
| 4 | POST | `/admin/returns/:id/review` `{ decision, reason, items?:[{returnItemId,approvedQuantity}] }` | Approve/partial/reject with reason |
| 5 | POST | `/admin/returns/:id/inspect` `{ decision, finalResolution, note, items:[{returnItemId,receivedQuantity,acceptedQuantity,condition,inventoryDisposition,note?}] }` | Explicit inventory disposition |
| 6 | GET | `/admin/returns/:id/refund-eligibility` | Calculate the remaining refundable amount |
| 7 | GET/POST | `/admin/returns/:id/refunds` | List or create a refund referencing the return and payment |

Refund creation uses minor currency units and accepts `amount`, `method`,
`reason`, and optional `sourcePaymentReference`. Send the idempotency key in
the `Idempotency-Key` header, not in the JSON body.

Refund status is tracked independently from return status (FR-RET-005).

## RTO
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/rto` | RTO queue (the controller currently returns the latest 100 cases) |
| 2 | POST | `/admin/rto/:id/inspect` `{ reason, reasonNote, outboundCourierCost, returnCourierCost, otherCost, items:[{rtoItemId,receivedQuantity,sellableQuantity,damagedQuantity,lostQuantity,note?}] }` | Record item outcome and cost attribution in minor currency units |
