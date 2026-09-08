# Ferio SaaS Application Boundaries

This is the canonical Release 1 application map. It describes ownership and
dependency direction; it does not grant a runtime component access to another
database plane.

## Applications

| Application | Responsibility | Data boundary |
| --- | --- | --- |
| `ferio-nest-prisma` | Modular-monolith API, workers, callbacks, and platform operations | Uses `PlatformPrismaService` for control-plane work and `TenantDbService` for trusted tenant context |
| Customer Web | Tenant storefront and customer-facing flows | Resolves tenant from the request host and calls the API; never selects a database |
| Tenant Admin Web | Store owner/staff operations | Calls tenant-admin API routes; authorization is enforced by backend membership and permissions |
| Platform Admin | SaaS operations, plans, subscriptions, provisioning, migrations, support, and billing | Calls `/api/v1/platform/*`; control-plane metadata only unless using explicit audited support access |
| Rider surface | Tenant delivery-personnel workflows | Tenant-scoped rider/personnel authorization and tenant-local commerce data |
| Customer Mobile | Customer-facing mobile client | Client identity and host are inputs to authorization, never database routing authority |

## Backend Planes

### Control plane

`src/platform/` owns organizations, domains, tenant database registry,
subscriptions, plans, entitlements, usage, provisioning, migrations, support
grants, platform identity, platform billing, and platform audit. It uses only
the generated platform Prisma client.

### Tenant plane

`src/features/` owns catalog, inventory, carts, checkout, orders, payments,
wallets, returns, refunds, riders, chat, services, warranty, settings,
analytics, notifications, and tenant audit. Tenant services obtain their
client from the trusted immutable `TenantContext` through `TenantDbService`.

### Shared infrastructure

`src/common/`, `src/core/`, `src/database/`, queue adapters, Redis adapters,
storage strategies, and request/security utilities provide bounded shared
capabilities. Shared infrastructure may carry trusted organization IDs in
namespaced keys or job envelopes, but must not infer tenant identity from
untrusted payload fields.

## Dependency Direction

```text
HTTP/worker boundary -> authorization/context -> application service
  -> control-plane client OR trusted tenant client -> provider/queue/storage
```

Tenant databases do not contain foreign keys to control-plane tables. A
cross-plane workflow uses opaque IDs and an explicit saga/compensation policy,
never a pretend cross-database ACID transaction.
