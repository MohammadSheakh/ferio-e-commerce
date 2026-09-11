# Tenant Admin — Payments, Wallet, Reviews & Messaging

**Frontend:** `app/payments`, `app/wallet`, `app/reviews`, `app/messages`,
`app/requested-products`, `app/feedback`, `app/stores`
**Verified against:** commerce-payments, admin/wallet, product-content,
transactional-messages, store-locations controllers

---

## Payments (prepaid attempts + recovery)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/payments/attempts?status=&provider=` | Attempt ledger incl. provider reference |
| 2 | GET/PATCH | `/admin/payments/attempts/:id` | Detail / restricted manual status change (reason+audit) |
| 3 | GET | `/admin/payments/providers` | Configured prepaid providers |
| 4 | POST | `/admin/payments/recovery/sweep` `{ dryRun? }` | Expiry/recovery sweep now |
| 5 | GET | `/admin/payments/recovery/queue-health` | Recovery backlog |

## Wallet review desk
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/wallet/top-ups?status=PENDING_REVIEW` | Evidence queue |
| 2 | POST | `/admin/wallet/top-ups/:id/review` `{ status: COMPLETED\|REJECTED, reviewNote }` | Atomic credit + immutable ledger entry; replay-safe |

## Reviews / banners moderation + requests + feedback
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/product-content/reviews` | YouTube review moderation queue; the current controller returns the full tenant-scoped queue and does not accept a `status` filter |
| 2 | PATCH | `/admin/product-content/reviews/:id` `{ status }` | Approve/reject (feeds PDP) |
| 3 | GET/POST | `/admin/product-content/products/:productId/banners` | Read/create review banners (sort order) |
| 4 | PATCH/DELETE | `/admin/product-content/banners/:id` | Update/delete a review banner |
| 5 | GET | `/product-requests?status=&search=&page=&limit=` | Tenant-admin requested-products queue; the backend controller is guarded admin access but is not mounted under `/admin` |
| 6 | PATCH | `/product-requests/:id/status` `{ status?, notes? }` | Update requested-product status |
| 7 | DELETE | `/product-requests/:id` | Delete a requested-product record |

## Transactional messaging ops
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/transactional-messages?page=&limit=&status=&eventType=&search=` | Tenant-scoped message outbox |
| 2 | GET | `/admin/transactional-messages/templates` | Template registry (per tenant) |
| 3 | PATCH | `/admin/transactional-messages/templates/:key` `{ subject?, body?, enabled? }` | Update a message template |
| 4 | GET | `/admin/transactional-messages/providers` | Configured SMS/WhatsApp/email provider state |
| 5 | PATCH | `/admin/transactional-messages/providers/:channel` | Update a provider configuration |
| 6 | GET/PATCH | `/admin/transactional-messages/policy` | Read/update tenant messaging policy |
| 7 | GET | `/admin/transactional-messages/queue-health` | Outbox backlog evidence |
| 8 | POST | `/admin/transactional-messages/:id/retry` | Retry a failed message with audit/permission checks |

## Store outlets
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/POST/PATCH/DELETE | `/admin/store-locations[...]` | Outlet CRUD feeding pickup availability |
