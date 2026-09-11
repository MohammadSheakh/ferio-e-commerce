# Tenant Admin — Payments, Wallet, Reviews & Messaging

**Frontend:** `app/dashboard/payments/page.tsx`, `app/dashboard/wallet/page.tsx`,
`app/dashboard/reviews/page.tsx`, `app/dashboard/messages/page.tsx`,
`app/dashboard/stores/page.tsx`, and the corresponding `components/*`/BFF routes
**Verified against:** commerce-payments, admin/wallet, product-content,
transactional-messages, store-locations controllers

---

## Payments (prepaid attempts + recovery)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/payments/attempts?status=&provider=` | Attempt ledger incl. provider reference |
| 2 | GET | `/admin/payments/attempts/:id` | Attempt detail and evidence (read-only) |
| 3 | GET | `/admin/payments/providers` | Configured prepaid providers |
| 4 | PUT | `/admin/payments/providers/:provider` | Store provider credentials/configuration |
| 5 | DELETE | `/admin/payments/providers/:provider` | Revoke provider credentials/configuration |
| 6 | POST | `/admin/payments/recovery/sweep` | Queue expiry/recovery sweep |
| 7 | GET | `/admin/payments/recovery/queue-health` | Recovery backlog |

Payment provider credential PUT/DELETE routes are intentionally not exposed as
browser forms. Provider readiness is read by the dashboard, while secret
provisioning and revocation remain in the operator-controlled path.

## Wallet review desk
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/wallet/top-ups?status=PENDING_REVIEW` | Evidence queue |
| 2 | PATCH | `/admin/wallet/top-ups/:id` `{ status: COMPLETED\|REJECTED, reviewNote }` | Atomic credit + immutable ledger entry; replay-safe |

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
