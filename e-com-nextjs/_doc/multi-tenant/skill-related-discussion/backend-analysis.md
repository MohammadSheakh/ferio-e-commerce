
I’ll review the backend as an architecture audit, not change code yet. I’ll first map every Nest module and shared layer, then inspect each module’s controller/service/DTO/guard/repository patterns, Prisma boundaries, tenancy/auth conventions, tests, and inconsistencies; after that I’ll give you a module-by-module report and wait for your instruction before creating the backend skill.




Read files, ran a command


The backend is a large hybrid Nest codebase: a platform control plane, tenant-resolution/database infrastructure, and many commerce feature modules, with legacy Mongo/Redis/queue code still present alongside Prisma. I’m separating those planes now so the review does not treat every folder as if it followed the same lifecycle or data-isolation rules.




Read files, ran commands


The module map shows 35 feature modules plus platform and tenancy infrastructure. A consistent pattern exists in many newer modules (PrismaModule + TenancyModule + AuthModule, controller guards, service-level tenant client selection), but there are clear legacy exceptions such as Mongo-oriented attachment/user code, direct environment access, and inconsistent module formatting; I’m auditing the security and tenancy foundation first because every feature depends on it.




Read files, ran commands


The tenancy foundation is intentionally fail-closed at the resolver and exposes a dedicated TenantDbService, which is the right target architecture. However, many feature services still implement a migration fallback (tenantDb.tryGet() then base PrismaService), so I’m tracking exactly which modules are tenant-safe, which are legacy-compatible, and where guards or write gates are missing rather than assuming the shared pattern is uniformly enforced.




Read files, ran commands


The first feature groups show a mostly deliberate separation between public/customer routes and tenant-admin routes, with permission metadata on admin mutations. The main architectural concern is not the controller surface but the data layer: audit/health and some identity services still use the legacy Prisma client directly, while other services silently fall back to it; I’m checking the remaining identity, realtime, messaging, and asynchronous modules for the same boundary violations.




Read files, ran commands


The realtime and worker paths are substantially more mature than the older shared libraries: socket tickets carry organization identity, room keys are tenant-prefixed, and queue jobs fan out with organization envelopes. I also found a legacy queue/attachment layer that still imports Mongoose models and is not wired into the current Prisma root module; I’m verifying whether it is dead code or an active startup dependency, then I’ll run the backend test suite and inspect migration/seed behavior.




Read files, ran commands


Context automatically compacted



I’m in the final pass now: checking the remaining mutation write-gates, audit call sites, and tenant database lifecycle so the report distinguishes confirmed defects from intentional migration debt. I’ll then summarize every backend module and the conventions we should encode later, without changing code or creating the skill in this review.




Read files, ran a command


The remaining pass confirms two important patterns: several modules have the right tenant-aware service code but incomplete module wiring, and some tenant mutations bypass the subscription write gate entirely. I’m also treating the current test-generation failure as a release-readiness issue, because a convention is only useful if a clean checkout can build and test it reproducibly.


**Backend Review Complete**

I reviewed the NestJS backend module-by-module, including tenancy, Prisma clients, authentication, guards, queues, workers, seeders, migrations, tests, and runtime configuration. I did not modify source code or create the backend skill.

**Critical Findings**

1. **Tenant notifications can use the wrong database**

   [`customer-notifications.module.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/customer-notifications/customer-notifications.module.ts#L7) does not import `TenancyModule`, but the service optionally injects `TenantDbService`.

   [`customer-notifications.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/customer-notifications/customer-notifications.service.ts#L22) therefore may always fall back to the legacy `PrismaService`.

2. **Storefront analytics has the same tenant-wiring problem**

   [`storefront-analytics.module.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/storefront-analytics/storefront-analytics.module.ts#L8) does not import `TenancyModule`, while the service uses optional `TenantDbService`.

   Tenant analytics may be written to or read from the shared legacy database.

3. **Audit log reads are not tenant-aware**

   [`audit.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/audit/audit.service.ts#L21) always reads audit logs using the base `PrismaService`.

   The admin endpoint [`audit.controller.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/audit/audit.controller.ts#L15) is tenant-admin scoped, so tenant audit logs can be missing or incorrect.

4. **Operations health reports the legacy database**

   [`operations-health.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/operations-health/operations-health.service.ts#L32) directly uses `PrismaService`.

   Commerce metrics at lines 167-220 query orders, payments, shipments, refunds, and reconciliation data from the base database instead of the resolved tenant database.

5. **Suspended tenants can still mutate some commerce data**

   The subscription write guard exists in [`commerce-write-guard.util.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/tenancy/commerce-write-guard.util.ts#L5), but it is only used by cart, catalog, and wallet.

   It is missing from important mutation methods in:

   - [`service-booking.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/service-booking/service-booking.service.ts#L60)
   - [`product-content.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/product-content/product-content.service.ts#L36)
   - [`store-locations.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/store-locations/store-locations.service.ts#L164)

6. **Prisma generation is required before tests/build, but not enforced**

   [`package.json`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/package.json#L8) has separate Prisma generation commands, but `test` does not run generation first.

   Current test result:

   - 90 suites total
   - 55 failed to load
   - 35 passed
   - Main errors: missing `.prisma/client/default` and missing generated platform client

   A clean checkout cannot reliably run tests until generated clients are created.

**Architecture Debt**

- [`attachment.service.ts`](/home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs/ferio-nest-prisma/src/features/attachments/attachment.service.ts#L1) is still Mongoose/ObjectId-based while the active application uses Prisma/PostgreSQL.
- The attachment module is not imported by `AppModule`, and its Mongoose model is not registered in the module.
- Legacy Mongo queue processors remain under `libs/queue` and `src/core/queue`, while active workers use Prisma/BullMQ feature processors.
- Many services use the migration fallback pattern `tenantDb.tryGet() ?? prisma`. This is useful during migration but unsafe as the permanent pattern because missing tenancy wiring silently routes traffic to the old database.
- Several module files have inconsistent formatting and dependency ordering, making the architecture harder to follow.

**Module Review Summary**

- **Application/runtime:** Strong global validation, security middleware, API prefix, response transformation, logging, and CORS setup.
- **Platform:** Good separation for platform users, organizations, plans, subscriptions, billing, support, migrations, and platform audit.
- **Tenancy:** Strong fail-closed host resolution, tenant database registry, encrypted credentials, bounded client cache, circuit breaker, and fan-out support.
- **Authentication:** Good JWT tenant binding, role/permission guards, platform authentication separation, and password hashing.
- **Catalog:** Strongest tenant-commerce implementation with permission checks, tenant DB usage, write gates, and audit records.
- **Cart:** Good customer ownership checks and suspended-tenant protection.
- **Checkout/order:** Mature transaction-oriented implementation with audit and inventory concerns handled carefully.
- **Payments/refunds/returns/RTO:** Good separation of payment flows, callbacks, retries, refunds, reconciliation, and audit logging.
- **Shipping/delivery:** Broad functionality and queue support, but worker tenant context and mutation policy should be standardized.
- **Settings:** Good tenant/admin separation; some module formatting and guard placement should be normalized.
- **Customer account/notifications:** Ownership checks are good, but notification tenant module wiring must be fixed.
- **Product content:** Tenant database support exists, but mutation write-gates and error handling need improvement.
- **Service booking:** Tenant database support exists, but booking/service mutations bypass suspension protection.
- **Store locations:** Tenant database support and audit exist, but audit records currently default to the wrong client and mutations lack the write gate.
- **Analytics/reports/health:** Reports are relatively mature; storefront analytics and operations health need tenant database corrections.
- **Chat/realtime:** Strong tenant-prefixed socket rooms, signed tickets, authorization, and Prisma persistence. Legacy queue processors should be removed or isolated.
- **Wallet/warranty:** Good authorization and wallet write protection; warranty has no test coverage.
- **Attachments/storage:** Storage/Cloudinary path is active, but the older Mongoose attachment path is stale.
- **Platform database/seeding:** Separate platform schema and migrations are correct. Tenant seed and platform seed are separate, but generated Prisma clients must be part of the build/test workflow.

**Recommended Backend Convention**

For the future backend skill, every new module should follow this structure:

- `module.ts`
- `controller.ts`
- `service.ts`
- `dto/*.dto.ts`
- `*.service.spec.ts`
- `TenancyModule`, `PrismaModule`, and `AuthModule` explicitly imported
- `TenantDbService.get()` for tenant-only modules
- No silent fallback unless the module is deliberately legacy-compatible
- Controller-level authentication and role guards
- Method-level permission and tenant-membership checks
- Service-level ownership and tenant database enforcement
- `assertTenantCommerceWritable()` on commerce mutations
- Audit records inside the same transaction where possible
- Queue jobs must include tenant/organization identity
- Tests must cover tenant routing, authorization, suspended subscriptions, ownership, and transaction behavior
- Prisma generation must be guaranteed before build/test

The review is finished. When you are ready, tell me to create the backend architecture skill, and I’ll encode these project-specific conventions into a reusable `SKILL.md`.