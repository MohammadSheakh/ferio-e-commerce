# Ferio Backend Project Flow

This folder explains how the Ferio backend works from request entry to data
access, background work, and response. Read the documents in this order if you
are learning the project:

1. `01-system-map-and-learning-path.md`
2. `02-http-request-lifecycle.md`
3. `03-multi-tenant-resolution-and-database-routing.md`
4. `04-authentication-and-authorization.md`
5. `05-platform-admin-and-organization-provisioning.md`
6. `06-tenant-commerce-flow.md`
7. `07-async-workers-payments-and-notifications.md`
8. `08-realtime-and-operations.md`
9. `09-module-map-and-change-guide.md`

These are learning documents, not a replacement for source code, tests, ADRs,
or the API contract. When behavior changes, update the relevant flow document
and verify it against the implementation.

## The One-Sentence Model

Ferio is a NestJS modular monolith with two database planes:

```text
Platform Admin request -> control-plane PostgreSQL
Tenant storefront/admin request -> trusted host -> tenant context -> tenant PostgreSQL
Background job -> trusted organization envelope -> tenant context -> tenant PostgreSQL
WebSocket connection -> short-lived ticket -> tenant-scoped rooms/events
```

The most important invariant is:

> A tenant database is selected only from trusted server-side host resolution
> and control-plane registry data. A browser must never choose a database by
> sending an organization ID, tenant ID, or connection string.

## Important Code Areas

| Responsibility | Primary location |
|---|---|
| Application bootstrap | `ferio-nest-prisma/src/main.ts` |
| Root module and middleware | `ferio-nest-prisma/src/app.module.ts` |
| Platform/control plane | `ferio-nest-prisma/src/platform/` |
| Tenant resolution/context | `ferio-nest-prisma/src/tenancy/` |
| Tenant commerce modules | `ferio-nest-prisma/src/features/` |
| Shared database/Redis/queue libraries | `ferio-nest-prisma/libs/` and `src/core/` |
| Prisma schemas | `ferio-nest-prisma/prisma/` |
| Architecture decisions | `e-com-nextjs/_doc/multi-tenant/adr/` |

## Terms

- **Control plane:** Ferio-owned metadata: organizations, domains, plans,
  subscriptions, entitlements, tenant database registry, platform users,
  provisioning, migrations, support access, and platform audit.
- **Tenant plane:** One business's commerce data: catalog, customers, carts,
  orders, payments, shipping, returns, reports, settings, and messages.
- **Platform Admin:** Ferio operator identity. It uses the platform JWT realm
  and control-plane Prisma client.
- **Tenant Admin:** A tenant user with admin role/permissions. It uses the
  tenant user identity and must resolve a tenant from the request host.
- **Tenant context:** Immutable AsyncLocalStorage state containing the resolved
  organization, database registry, hostname, and subscription status.

