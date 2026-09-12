# Tenant Admin — Orders, COD & Fulfillment (role: admin)

**Frontend:** `app/orders/*`, `app/delivery`
**Verified against:** `order.controller.ts` (`@Controller('admin/orders')`), fulfillment exceptions routes

---

## Screen 1: Orders queue + filters
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/orders?page=&limit=&status=&fulfillmentStatus=&paymentStatus=&search=&dateFrom=&dateTo=` | Filter by reference/phone/status/fulfillment/payment/date |
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
| 1 | POST | `/admin/orders/:id/fulfillment` `{ status, note? }` | Advance fulfillment status with history |
| 2 | POST | `/admin/orders/:id/fulfillment-exceptions` `{ type, orderItemId?, quantity?, description }` | Shortage/substitution — silent changes forbidden |
| 3 | POST | `/admin/orders/:id/fulfillment-exceptions/:exceptionId/resolve` `{ resolution }` | Resolve exception |

## Screen 4: Store pickup
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | PATCH | `/admin/orders/:id/store-pickup/status` | Admin pickup lifecycle |
| 2 | POST | `/admin/orders/:id/store-pickup/verify-handover` `{ otp }` | OTP-verified handover |

Customer scheduling is not an admin operation. The customer contract is
`PATCH /orders/:id/store-pickup/schedule` with the authenticated customer's
pickup timestamp/notes; it is currently tracked separately from this admin
screen.

All mutations write OrderStatusHistory rows (old→new, actor, source).
