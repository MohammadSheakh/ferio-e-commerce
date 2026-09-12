# Storefront — Value-added surfaces (services, warranty, requests, reviews, pickup)

**Frontend:** `app/services`, warranty entry, product request modal, store pages
**Verified against:** `service-booking`, `warranty`, `product-request`,
`product-content`, `store-locations` controllers

---

## Services (category-scoped booking)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/services` / `/services/:slug` | Public catalog |
| 2 | POST | `/services/bookings/request` `{ serviceId, customerName, phone, email?, preferredAt, address?, customerNote? }` | Lead-time validated booking → history REQUESTED; address max 500 and note max 1000 characters |

## Warranty claim
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/warranty/claims/mine` | Authenticated customer's own claim history |
| 2 | POST | `/warranty/order-items` `{ reference, phone }` | Verify delivered-order ownership and list eligible items |
| 3 | POST | `/warranty/evidence/upload` multipart `images` (1–5 JPG/PNG/WebP, max 5 MB each) | Malware/content-validated evidence upload |
| 4 | POST | `/warranty/claims` `{ reference, phone, orderItemId, issueDescription, evidence[] }` | Create a warranty claim with uploaded evidence |

The customer-web warranty screen calls all four routes through the
authenticated `/api/warranty/[...path]` BFF. Customer returns are not a
separate public API in the current NestJS surface; return review/inspection is
tenant-admin only.

## Product requests & YouTube reviews
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/product-requests` `{ productName, name?, phone? }` | Customer asks for a product; `productName` max 500 characters; authentication is optional and the server associates an authenticated request when available |
| 2 | GET | `/product-content/:slug` | Approved banners + reviews for PDP |
| 3 | POST | `/product-content/:productId/reviews` `{ youtubeUrl, title?, reviewerName? }` | Authenticated customer submission (moderation queue; YouTube URL only) |

The customer-web product-request BFF uses the shared customer session client
when an access or refresh session exists, so an expired access cookie can be
rotated before the optional account association is sent upstream. Anonymous
requests use the same BFF and preserve the forwarded tenant host without an
Authorization header. Review submission is authenticated and does not have a
guest fallback.

## Store pickup & outlets
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/store-locations` | Active outlets |
| 2 | POST | `/store-locations/check-availability` `{ storeId, variantIds[] }` | Checkout stock at selected outlet per cart variant |

Checkout calls availability whenever store pickup is selected and renders the
server result as either ready for pickup or transfer required. The final
checkout transaction remains authoritative for stock and reservation races.
| 3 | PATCH | `/orders/:id/store-pickup/schedule` `{ pickupScheduledAt?, preferredPickupSlot?, customerPickupNotes? }` | Authenticated customer schedules or updates pickup from account order history |

The customer account order history exposes this action only for
`STORE_PICKUP` orders. The BFF owns the session and tenant-host forwarding;
the backend confirms that the authenticated customer owns the order.

## Support chat (realtime)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/socket-auth/ticket` / `/guest-ticket` | 5-minute org-bound socket ticket |
Rooms are org-prefixed server-side; a ticket can never reach another
tenant's channel (proven by wire-level E2E).
