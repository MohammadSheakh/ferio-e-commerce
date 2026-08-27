# Tenant Admin — Shipping & Couriers

**Frontend:** `app/shipping/*`, `lib/shipping.ts`
**Verified against:** `shipping.controller.ts` (`@Controller('admin/shipping')`),
courier webhook controller (`webhooks/couriers` — provider-facing, not admin)

---

## Providers & configuration
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/shipping/providers` | Configured providers + active flags (Pathao/Steadfast/RedX/eCourier/Paperfly/CarryBee) |
| 2 | GET/PATCH | `/admin/shipping/providers/:code` | Per-provider activation/config metadata |

## Shipments
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/admin/shipping/shipments` `{ orderId, providerCode?, manualTracking? }` | Creates via adapter; stores AWB/tracking URL/raw request-response |
| 2 | GET | `/admin/shipping/shipments?status=&provider=` | Shipment list with normalized status |

## Callbacks & polling
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/admin/shipping/polls` `{ shipmentId? }` | On-demand poll; scheduled sweeps fan out per tenant automatically |
| 2 | GET | `/admin/shipping/polls/queue-health` | Poll backlog evidence |
| 3 | POST | `/admin/shipping/webhooks/:eventId/replay`? | Retry path for retained raw events |

Raw courier event + normalized result are both retained (FR-SHP-005);
out-of-order events cannot regress status (FR-SHP-007). Callbacks are
tenant-bound via HMAC token — forgery fails closed.
