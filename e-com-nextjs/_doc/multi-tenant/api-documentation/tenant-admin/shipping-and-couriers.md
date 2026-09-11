# Tenant Admin — Shipping & Couriers

**Frontend:** `app/shipping/*`, `lib/shipping.ts`
**Verified against:** `shipping.controller.ts` (`@Controller('admin/shipping')`),
courier webhook controller (`webhooks/couriers` — provider-facing, not admin)

---

## Providers & configuration
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/shipping/providers` | Configured providers + active flags (Pathao/Steadfast/RedX/eCourier/Paperfly/CarryBee) |
| 2 | PATCH | `/admin/shipping/providers/:code` | Enable or disable a provider |
| 3 | PUT | `/admin/shipping/providers/:code/config` | Store provider credentials/configuration |
| 4 | DELETE | `/admin/shipping/providers/:code/config` | Revoke provider credentials/configuration |

## Shipments
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/shipping/shipments` | Shipment list with normalized status |
| 2 | GET | `/admin/shipping/orders/:orderId` | Load the shipment for one order |
| 3 | POST | `/admin/shipping/orders/:orderId` `{ provider, parcelReady: true, note?, providerData? }` | Creates via adapter; stores AWB/tracking URL/raw request-response |

## Callbacks & polling
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/shipping/webhooks` | Retained courier callback evidence |
| 2 | GET | `/admin/shipping/webhooks/queue-health` | Callback retry backlog evidence |
| 3 | POST | `/admin/shipping/webhooks/:id/retry` | Queue a retry for one retained callback |
| 4 | GET | `/admin/shipping/polls` | Retained shipment poll attempts |
| 5 | GET | `/admin/shipping/polls/queue-health` | Poll backlog evidence |
| 6 | POST | `/admin/shipping/shipments/:id/poll` | Queue an on-demand poll for one shipment |

Raw courier event + normalized result are both retained (FR-SHP-005);
out-of-order events cannot regress status (FR-SHP-007). Callbacks are
tenant-bound via HMAC token — forgery fails closed. Provider callbacks arrive
through the separate public `POST /webhooks/couriers/:provider` endpoint and
are not called by the tenant-admin frontend.
