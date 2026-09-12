# Patterns 11-15: Prisma, Domain, And Transaction Boundaries

## 11. Platform/tenant database split

Templates: `src/platform/platform-prisma.service.ts`, `libs/database/`,
`prisma/platform.prisma`, and `prisma/schema.prisma`. Learn which entities
belong to the registry/control plane versus one business database.

## 12. Repository through a database boundary

Template: `TenantDbService` use in `catalog`, `cart`, `order`, and `reports`.
Feature services must not construct arbitrary Prisma clients or accept a
connection string from an HTTP caller.

## 13. Interactive transaction

Templates: order reservation, wallet, payment, and refund services. Identify
the transaction owner, isolation level, timeout, lock/claim rule, and work that
must remain outside the transaction because it calls a network provider.

## 14. Idempotency key

Templates: checkout/order/payment tests and service methods. Follow the key
from the HTTP boundary to the tenant transaction, persisted result, duplicate
request behavior, and safe retry outcome.

## 15. Server-side price/stock revalidation

Templates: `src/features/checkout/` and `src/features/order/`. The client may
display a price, but the server reloads authoritative product, coupon,
delivery, and stock data before committing an order.

## 41. Bounded offset/cursor pagination

Templates: `src/features/catalog/catalog.service.ts`,
`src/features/settings/services/settings.service.ts`,
`src/features/chatting/message/message.service.ts`, and
`src/features/returns/services/returns.service.ts`. Compare offset pagination
(`skip`/`take`) with cursor pagination (`cursor`, `skip: 1`, bounded `take`).
Study input limits, deterministic ordering, unique cursor fields, total-count
cost, next-cursor construction, and whether filtering happens in SQL or in
application memory. Pagination is a reusable service pattern, not merely a
controller query parameter.

### Senior questions

- Which invariants must be atomic?
- Which external calls are intentionally outside a DB transaction?
- Can a duplicate request charge, reserve, or fulfill twice?
- Does every mutation verify tenant and actor ownership independently?
