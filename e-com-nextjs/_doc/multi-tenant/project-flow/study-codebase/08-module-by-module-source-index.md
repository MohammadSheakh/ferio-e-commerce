# 8. Module-By-Module Source Index

This is the practical index for `ferio-nest-prisma/src/features`. Read the
module file first, then the controller/service, then the tests in the same
feature directory.

| Study area | Source directories | First questions |
| --- | --- | --- |
| Identity | `authentication`, `user-management`, `customer-account`, `customers` | Which realm owns the identity? How is tenant membership checked? |
| Catalog | `catalog`, `product-content`, `product-request`, `store-locations` | What is published? Where is stock and ownership enforced? |
| Purchase | `cart`, `checkout`, `order`, `purchase-activity` | Where are price, inventory, idempotency, and ownership revalidated? |
| Money | `commerce-payments`, `wallet`, `refunds`, `settlements`, `reconciliation` | What is the state machine and what is the retry boundary? |
| Fulfillment | `shipping`, `delivery-personnel`, `returns`, `rto` | Which provider events are authenticated and deduplicated? |
| Engagement | `chatting`, `customer-notifications`, `transactional-messaging` | Are rooms, messages, and jobs tenant-namespaced? |
| Services | `service-booking`, `warranty`, `storefront-analytics`, `reports` | Which data is tenant-owned and what is the retention policy? |
| Control and safety | `audit`, `settings`, `staff-access`, `operations-health`, `storage` | Which actions are audited, gated, rate-limited, or operator-only? |
| Realtime | `socket-gateway` | How is a short-lived socket ticket bound to tenant and user? |

## A repeatable deep dive

For each row, create a small note with:

```text
route prefix:
guards/decorators:
DTO validation:
principal and tenant source:
database helper:
transaction/idempotency:
queue/provider side effects:
audit/metrics:
focused tests:
open PRD/checklist gate:
```

## Platform source index

Read `src/platform/platform.module.ts`, then these controllers and services:

```text
platform-auth.controller.ts
platform.controller.ts
platform-domains.controller.ts
platform-billing.controller.ts
platform-catalog.controller.ts
platform-migrations.controller.ts
platform-support-access.controller.ts
services/organizations.service.ts
services/provisioning.service.ts
services/tenant-databases.service.ts
services/tenant-closure.service.ts
services/migration-orchestrator.service.ts
```

Platform code owns registry metadata and lifecycle orchestration. It should
not be used as an implicit path into another tenant's commerce database.

## Prisma and shared library index

```text
prisma/schema.prisma          tenant schema
prisma/platform.prisma        control-plane schema
libs/database                 legacy/shared Prisma boundary
libs/redis                    Redis lifecycle and service
libs/queue                    BullMQ connection and module
src/core/security             global security contracts
src/tenancy                   tenant context and database routing
```
