# 3. Data, Prisma, And Provisioning

## Two database planes

```text
PlatformPrismaService -> platform.prisma -> control-plane PostgreSQL
Tenant context -> TenantDatabaseManager -> tenant Prisma client -> one tenant DB
```

Read:

- `prisma/platform.prisma`
- `prisma/schema.prisma`
- `src/platform/platform-prisma.service.ts`
- `src/tenancy/services/tenant-database.manager.ts`
- `src/tenancy/services/tenant-db.service.ts`
- `libs/database/src/prisma.service.ts`

Tenant database credentials are registry material. Client creation, pooling,
idle eviction, acquisition limits, and circuit behavior belong to the manager,
not to feature services.

## Provisioning lifecycle

Read these together:

- `src/platform/services/organizations.service.ts`
- `src/platform/services/provisioning.service.ts`
- `src/platform/services/tenant-databases.service.ts`
- `src/tenancy/services/tenant-schema.bootstrapper.ts`
- `src/platform/services/local-postgres-provisioner.ts`
- `src/platform/services/tenant-closure.service.ts`

The lifecycle is control-plane driven: create organization, provision/register
tenant database, apply schema, seed a business-neutral baseline, run health
and smoke gates, then activate the organization. Retry and closure are stateful
operations and must be studied as state machines, not as one controller call.

## Prisma command study

Run from `ferio-nest-prisma` and inspect `package.json` before executing:

```bash
pnpm prisma:sync
pnpm prisma:migrate:status
pnpm prisma:migrate:deploy
pnpm prisma:migrate:platform
pnpm check:migrations
pnpm check:migration-compatibility
```

Never run destructive reset commands against a shared or evidence database.
Use the documented local Docker profile and a disposable tenant for restore,
closure, and migration experiments.

## Current onboarding limitation

`seedBaseline()` intentionally seeds business-neutral settings. The current
provisioning path does not create a tenant-plane `User` row for the owner
membership. This means tenant-admin login and authenticated catalog/commerce
fixtures cannot be honestly claimed until an expiring, single-use owner
activation/invitation flow exists. See chapter 4.
