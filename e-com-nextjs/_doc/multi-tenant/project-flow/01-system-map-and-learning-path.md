# 1. System Map And Learning Path

## What Starts the Application

`src/main.ts` creates one NestJS application from `AppModule`. The application
serves REST traffic on `PORT` (normally `6733`) under the global prefix
`/api/v1`. Socket.IO uses its configured socket port (normally `6734`).

`src/app.module.ts` imports the major boundaries:

```text
AppModule
├── Config / Prisma / Redis / BullMQ
├── PlatformModule
├── TenancyModule
├── SocketModule + ChattingModule
├── Authentication + User Management
├── Catalog / Cart / Checkout / Order
├── Payments / Shipping / Returns / Refunds / RTO
├── Settlements / Reconciliation / Reports
├── Settings / Customers / Staff / Delivery Personnel
├── Product Content / Services / Warranty / Storage
└── Notifications / Wallet / Analytics / Audit
```

The application is intentionally a modular monolith. Modules are in one
deployment, but their responsibilities and database boundaries are explicit.

## Two Request Families

### Platform request

Used by Ferio Platform Admin:

```text
Browser -> /api/v1/platform/*
       -> platform auth guard
       -> PlatformPrismaService
       -> control-plane service
       -> control-plane PostgreSQL
```

Platform routes are excluded from tenant middleware because the platform plane
does not belong to one tenant.

### Tenant request

Used by a tenant storefront, tenant admin, customer, rider, or tenant API
client:

```text
Browser -> tenant hostname + /api/v1/*
       -> TenantContextMiddleware
       -> host/domain resolution
       -> immutable TenantContext
       -> Auth/role/permission guards when required
       -> feature controller
       -> feature service
       -> TenantDbService
       -> one tenant PostgreSQL database
```

## How To Read A Feature

For any feature, follow this order:

1. Open the feature module and identify imports, controllers, providers, and
   exports.
2. Open the controller and list its route prefix, guards, DTOs, and service
   calls.
3. Open the DTOs to understand accepted and rejected input.
4. Follow the service method called by each route.
5. Find its `db()` helper or `TenantDbService` usage and confirm which database
   plane it uses.
6. Inspect transactions, state transitions, write gates, audit calls, and
   external provider calls.
7. Follow any queue/processor/adapter it invokes.
8. Read the focused tests for authorization, tenant isolation, idempotency,
   and failure behavior.

## The Main Dependency Direction

```text
Controller
  -> DTO / guards / principal
  -> application service
  -> tenant or platform database boundary
  -> provider adapter or queue boundary
  -> audit / metrics / response
```

A controller should not contain business rules or construct a database client.
A worker should not trust request-local state. A provider adapter should not
decide tenant authorization.

