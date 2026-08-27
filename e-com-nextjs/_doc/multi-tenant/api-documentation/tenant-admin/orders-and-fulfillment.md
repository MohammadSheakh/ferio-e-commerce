# Tenant Admin — Orders, COD & Fulfillment (role: admin)

**Frontend:** `app/orders/*`, `app/delivery`
**Verified against:** `order.controller.ts` (`@Controller('admin/orders')`), fulfillment exceptions routes

---

## Screen 1: Orders queue + filters
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/orders?page&status&paymentStatus&q&from&to` | Filter by reference/phone/status/payment/date |
| 2 | GET | `/admin/orders/:id` | 360 detail: customer+address snapshot, items, totals, reservation, shipment, comms, history |
| 3 | GET | `/admin/orders/cod-policy` / PATCH same | COD verification mode ALWAYS/ABOVE_AMOUNT/NEVER |

## Screen 2: COD verification
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/admin/orders/:id/confirm` `{ note? }` | Serializable txn: reserve stock → CONFIRMED → READY_FOR_FULFILLMENT (+audit) |
| 2 | POST | `/admin/orders/:id/cancel` `{ reason }` | Releases eligible reservations; wallet orders refund exactly once |

## Screen 3: Fulfillment pipeline
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/admin/orders/:id/fulfillment` `{ action: PICK\|PACK\|QC\|READY\|HANDOVER }` | Queue actions with status history |
| 2 | POST | `/admin/orders/:id/fulfillment-exceptions` `{ itemId, type, note }` | Shortage/substitution — silent changes forbidden |
| 3 | PATCH | `/admin/orders/:id/fulfillment-exceptions/:exceptionId/resolve` `{ resolution }` | Resolve exception |

## Screen 4: Store pickup
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | PATCH | `/admin/orders/:id/store-pickup/schedule` `{ date, slot }` | Schedule handover |
| 2 | PATCH | `/admin/orders/:id/store-pickup/status` | Pickup lifecycle |
| 3 | POST | `/admin/orders/:id/store-pickup/verify-handover` `{ otp }` | OTP-verified handover |

All mutations write OrderStatusHistory rows (old→new, actor, source).
