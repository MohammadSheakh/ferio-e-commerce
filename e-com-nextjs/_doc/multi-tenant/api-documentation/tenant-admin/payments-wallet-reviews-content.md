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
| 1 | GET | `/admin/product-content/reviews?status=PENDING` | YouTube review moderation queue |
| 2 | PATCH | `/admin/product-content/reviews/:id` `{ status }` | Approve/reject (feeds PDP) |
| 3 | GET/POST/PATCH/DELETE | `/admin/product-content/products/:productId/banners[/:id]` | Review banner CRUD (sort order) |
| 4 | GET | `/admin/requested-products` … (product-request admin) | Requested products queue |

## Transactional messaging ops
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/transactional-messages/templates` | Template registry (per tenant) |
| 2 | GET | `/admin/transactional-messages/queue-health` | Outbox backlog evidence |

## Store outlets
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/POST/PATCH/DELETE | `/admin/store-locations[...]` | Outlet CRUD feeding pickup availability |
