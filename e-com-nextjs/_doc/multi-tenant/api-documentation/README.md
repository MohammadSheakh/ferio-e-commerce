# Ferio API Documentation — Per Role, Per Screen

Living documentation mapping **every UI screen to the exact API calls** that
power it. Derived from source code on 2026-08-26 and verified against the
backend controller tree (`ferio-nest-prisma/src/features/**`) — 245 routes.

## Conventions

| Topic | Contract |
|---|---|
| Base URL | `https://<store-domain>/api/v1` (global prefix). Platform Admin BFF proxies `/api/platform/*` → backend `platform/*` with an httpOnly-cookie token. |
| Success envelope | `{ "success": true, "data": <payload>, "message": string }` (+ optional `correlationId`) |
| Error envelope | `{ "success": false, "message": string \| string[], "code": string, "correlationId": string }` with proper HTTP status |
| Correlation | Send `x-correlation-id`; it is echoed back and stamped in logs |
| Auth (storefront/admin) | `Authorization: Bearer <accessJWT>`; refresh via `POST /auth/refresh` cookie flow |
| Auth (platform) | Separate realm token (`PLATFORM_JWT_SECRET`); staff tokens are rejected by design |
| Tenant resolution | Server-side only, from the storefront Host (`x-forwarded-host` on server-side fetches). No body/query/header may choose a database. |
| Admin tenancy gate | Tenant-admin controllers add `TenantMembershipGuard` — session email must be an active OWNER/STAFF of the resolved org |
| Pagination (admin lists) | `{ docs, page, limit, total, totalPages }` |
| Idempotency | Order placement & wallet top-ups accept an idempotency key (header/body field documented inline) |

## Stable machine codes (non-exhaustive)

| Code | Meaning |
|---|---|
| `TENANT_RESOLUTION_FAILED` / `TENANT_SUSPENDED` / `TENANT_UNAVAILABLE` / `TENANT_MIGRATION_REQUIRED` | Fail-closed tenant states (503 family) |
| `PLAN_LIMIT_REACHED`, `FEATURE_DISABLED`, `SUBSCRIPTION_INACTIVE`, `ENTITLEMENT_NOT_FOUND` | Entitlement denials (403) |
| `CHECKOUT_DISABLED_SUSPENDED` | Suspended subscription keeps storefront browsable but blocks checkout |
| `PAYMENT_CALLBACK_TENANT_INVALID` | Forged/tampered courier or gateway callback |

## Role → surface map

| Role | App | Docs folder |
|---|---|---|
| Guest / Customer | Storefront Web (& Mobile via same contracts) | `customer-storefront/` |
| Rider (1st-party) | Rider portal routes inside Storefront | `customer-storefront/rider-portal.md` |
| Owner / Admin / Staff | Tenant Admin Dashboard | `tenant-admin/` |
| Platform Admin / Super Admin / Support | Ferio Platform Admin | `platform-admin/` |

## Index

- customer-storefront/: discovery-and-product · cart · checkout-and-payment · auth-and-account · account-post-purchase · value-added-services · rider-portal
- tenant-admin/: dashboard-overview · catalog-and-inventory · orders-and-fulfillment · shipping-and-couriers · customers · payments-wallet-reviews-content · returns-rto-refunds · settlements-reconciliation · reports-exports · chat-support · staff-settings-security
- platform-admin/: organizations-lifecycle · plans-billing-subscriptions · usage-fleet-migrations · support-access
