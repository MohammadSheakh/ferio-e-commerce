# Storefront — Value-added surfaces (services, warranty, requests, reviews, pickup)

**Frontend:** `app/services`, warranty entry, product request modal, store pages
**Verified against:** `service-booking`, `warranty`, `product-request`,
`product-content`, `store-locations` controllers

---

## Services (category-scoped booking)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/services` / `/services/:slug` | Public catalog |
| 2 | POST | `/services/bookings/request` `{ serviceId, preferredAt, contact… }` | Lead-time validated booking → history REQUESTED |

## Warranty claim
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/warranty/verify-order` `{ reference, phone }` | Proves ownership (timing-safe compare) |
| 2 | GET/POST | `/warranty/eligible` / `/warranty` `{ orderId, item, evidence… }` | Eligibility + claim creation |

## Product requests & YouTube reviews
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/product-requests` | Customer asks for a product |
| 2 | GET | `/product-content/:slug` | Approved banners + reviews for PDP |
| 3 | POST | `/product-content/:productId/reviews` `{ youtubeUrl,title }` | Customer submission (moderation queue) |

## Store pickup & outlets
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/store-locations` | Active outlets |
| 2 | POST | `/store-locations/check-availability` | Stock at outlet per variant |

## Support chat (realtime)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/socket-auth/ticket` / `/guest-ticket` | 5-minute org-bound socket ticket |
Rooms are org-prefixed server-side; a ticket can never reach another
tenant's channel (proven by wire-level E2E).
