# 1. Backend Map And Reading Path

## Runtime composition

Start at `ferio-nest-prisma/src/main.ts`, then read
`ferio-nest-prisma/src/app.module.ts`. `main.ts` owns process bootstrap:
global prefix, validation, CORS, Helmet, compression, correlation IDs,
exception/response handling, Swagger, and shutdown behavior. `AppModule` owns
module composition and applies tenant middleware with explicit exclusions for
platform, tenancy status, health, and Socket.IO paths.

The backend is a modular monolith, not a set of independently deployed
services. The important boundaries are:

| Boundary | Read first | Main responsibility |
| --- | --- | --- |
| Platform | `src/platform/platform.module.ts` | Organizations, domains, plans, subscriptions, migrations, support, platform DB |
| Tenancy | `src/tenancy/tenancy.module.ts` | Host resolution, context, tenant DB manager, lifecycle, tenant-safe utilities |
| Shared infrastructure | `libs/common`, `libs/database`, `libs/redis`, `libs/queue` | Cross-cutting code and infrastructure adapters |
| Commerce features | `src/features/*` | Catalog, cart, checkout, orders, payments, shipping, returns, refunds, reports |
| Experience features | `src/features/*` | Auth, customers, wallet, chat, warranty, services, notifications, settings |
| Tests | `src/**/tests`, `src/**/*.spec.ts`, `test/` | Unit, boundary, integration, queue, and E2E evidence |

## Feature reading algorithm

For a feature, read in this order:

1. `*module.ts`: imports/providers/exports and dependencies.
2. `*controller.ts`: route prefix, HTTP methods, guards, DTOs.
3. DTO files: accepted input and validation constraints.
4. Service files: business rules, transactions, state transitions, idempotency.
5. Database helper: `TenantDbService`, `PlatformPrismaService`, or explicit
   compatibility path.
6. Queue/adapter/processor files, if the operation is asynchronous.
7. Focused tests, then the API document and checklist section.

## Feature inventory

```text
authentication, user-management, customers, customer-account
catalog, product-content, product-request, cart, checkout, order
commerce-payments, wallet, shipping, delivery-personnel, store-locations
returns, refunds, rto, settlements, reconciliation
service-booking, warranty, chatting, customer-notifications
transactional-messaging, storage, reports, storefront-analytics, audit
settings, staff-access, operations-health, socket-gateway
```

Do not infer a feature's completeness from the directory name. Confirm its
controller, service, tests, API contract, and release gate independently.
