# Full Backend Audit Matrix

## Honest status

This matrix is the starting point for an exhaustive manual audit. The pattern
curriculum is source-guided and broad, but it does **not** mean every file in
`ferio-nest-prisma` has already been read. Each row below needs source review,
focused test review, and PRD/checklist reconciliation before it can be marked
verified.

## Current audit slice

The first focused slice has now inspected source inventories and representative
implementation/test files for `attachments`, `audit`, `authentication`, and
`user-management`. Source-backed observations are documented in
`16-identity-audit-and-file-patterns.md`. These areas remain **in progress**:
the complete-area checkboxes are intentionally not marked because API
documentation reconciliation, runtime execution, and all route/branch review
are still outstanding. The attachment area also currently appears incomplete
at the HTTP/domain boundary and needs product-owner clarification before it can
be considered release-ready.

The second focused slice has inspected source inventories and representative
implementation/test files for `cart`, `catalog`, `checkout`, and
`commerce-payments`. Source-backed observations are documented in
`17-cart-catalog-checkout-payment-patterns.md`. These areas also remain in
progress until all routes, API documentation, runtime behavior, and PRD/
checklist gates are reconciled.

The fourth focused slice has inspected source inventories and representative
implementation/test files for `customer-account`, `customer-notifications`,
`wallet`, `warranty`, and `service-booking`. Source-backed observations are
documented in `19-account-notification-wallet-warranty-booking-patterns.md`.
These areas remain in progress until every route, API contract, runtime path,
and PRD/checklist gate is reconciled.

The fifth focused slice has inspected source inventories and representative
implementation/test files for `chatting`, `socket-gateway`,
`storefront-analytics`, `purchase-activity`, and `product-request`. Source-
backed observations are documented in
`20-chat-sockets-analytics-and-request-patterns.md`. These areas remain in
progress until route contracts, frontend consumers, runtime fanout, and
PRD/checklist gates are reconciled.

The seventh focused slice has inspected source inventories and representative
implementation/test files for `attachments`, `storage`,
`transactional-messaging`, `libs/redis`, `libs/queue`, and
`libs/notification`. Source-backed observations are documented in
`22-storage-redis-queues-and-messaging-infrastructure-patterns.md`. These
shared areas remain in progress until provider delivery, load behavior, and
operational evidence are reconciled.

The eighth focused slice has inspected inventories and representative tests for
`src/platform`, `src/tenancy`, `libs/common`, `libs/database`, `src/core`, and
the backend `test/` suites. Source-backed observations are documented in
`23-platform-tenancy-common-and-test-patterns.md`. This broad pass does not
mark those areas complete: exhaustive route review, generated-client review,
and runtime execution remain outstanding.

The sixth focused slice has inspected source inventories and representative
implementation/test files for `reports`, `settlements`, `reconciliation`,
`operations-health`, and `settings`. Source-backed observations are documented
in `21-reports-settlements-reconciliation-health-settings-patterns.md`. These
areas remain in progress until route contracts, export/import runtime behavior,
operational evidence, and PRD/checklist gates are reconciled.

The third focused slice has inspected source inventories and representative
implementation/test files for `order`, `shipping`, `returns`, `refunds`, and
`rto`. Source-backed observations are documented in
`18-order-shipping-returns-refunds-rto-patterns.md`. These areas remain in
progress until every route, API contract, provider path, runtime test, and
PRD/checklist gate is reconciled.

## Per-area completion contract

Mark an area complete only when all of these are recorded:

```text
[ ] module wiring and dependency direction
[ ] every controller route and DTO
[ ] service/database boundary
[ ] tenant/platform identity source
[ ] auth/permission/ownership checks
[ ] pagination, transaction, and idempotency behavior
[ ] Redis/queue/socket/provider behavior
[ ] focused tests read and relevant tests run
[ ] API documentation reconciled
[ ] PRD/checklist gate reconciled
[ ] runtime evidence level recorded
```

## Feature areas

Use `pattern/README.md` and `study-codebase/08-module-by-module-source-index.md`
to assign patterns while reviewing each area.

- [ ] `attachments`
- [ ] `audit`
- [ ] `authentication`
- [ ] `cart`
- [ ] `catalog`
- [ ] `chatting`
- [ ] `checkout`
- [ ] `commerce-payments`
- [ ] `customer-account`
- [ ] `customer-notifications`
- [ ] `customers`
- [ ] `delivery-personnel`
- [ ] `operations-health`
- [ ] `order`
- [ ] `product-content`
- [ ] `product-request`
- [ ] `purchase-activity`
- [ ] `reconciliation`
- [ ] `refunds`
- [ ] `reports`
- [ ] `returns`
- [ ] `rto`
- [ ] `service-booking`
- [ ] `settings`
- [ ] `settlements`
- [ ] `shipping`
- [ ] `socket-gateway`
- [ ] `staff-access`
- [ ] `storage`
- [ ] `store-locations`
- [ ] `storefront-analytics`
- [ ] `transactional-messaging`
- [ ] `user-management`
- [ ] `wallet`
- [ ] `warranty`

## Platform and tenancy areas

- [ ] `src/platform/platform.module.ts` and platform controllers
- [ ] `src/platform/dto/`
- [ ] `src/platform/guards/`
- [ ] `src/platform/services/`
- [ ] `src/platform/utils/`
- [ ] `src/platform/tests/`
- [ ] `src/tenancy/context/`
- [ ] `src/tenancy/controllers/`
- [ ] `src/tenancy/errors/`
- [ ] `src/tenancy/guards/`
- [ ] `src/tenancy/processors/`
- [ ] `src/tenancy/queues/`
- [ ] `src/tenancy/services/`
- [ ] `src/tenancy/tests/`
- [ ] `src/tenancy/utils/`

## Shared and infrastructure areas

- [ ] `libs/common/`
- [ ] `libs/database/`
- [ ] `libs/notification/`
- [ ] `libs/queue/`
- [ ] `libs/redis/`
- [ ] `src/core/database/`
- [ ] `src/core/queue/`
- [ ] `src/core/security/`
- [ ] `prisma/schema.prisma`
- [ ] `prisma/platform.prisma`
- [ ] tenant migrations
- [ ] platform migrations
- [ ] `scripts/`
- [ ] `test/`
- [ ] generated Prisma clients, treated as generated artifacts

## Audit commands

Run from `ferio-nest-prisma` and capture results as evidence. These commands
inventory or validate the repository; they do not replace manual review.

```bash
find src libs test prisma scripts -type f | sort
pnpm typecheck:application
pnpm architecture:check
pnpm check:tenant-context-boundaries
pnpm check:migrations
pnpm test -- --runInBand
pnpm openapi:check
```

## Evidence labels

Use one label per conclusion:

```text
SOURCE      implementation inspected
UNIT        focused unit test
INTEGRATION integration/E2E test
LOCAL       Docker PostgreSQL/Redis runtime
STAGING     public Cloudflare Tunnel runtime
PROVIDER    managed infrastructure/provider proof
PILOT       real-business/human acceptance
```

Do not mark `PROVIDER`, `PILOT`, or production readiness from `SOURCE`, `UNIT`,
or `LOCAL` evidence alone.
