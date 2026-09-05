# 9. Module Map And Change Guide

Use this document when you want to understand where a new behavior belongs.

## Platform And Tenancy

| Area | Owns |
|---|---|
| `platform/` | platform users, organizations, domains, plans, subscriptions, entitlements, usage, provisioning, migrations, closure, support access, platform billing/audit |
| `tenancy/` | host resolution, immutable context, tenant DB clients, membership guard, tenant fan-out, schema bootstrap, retention, tenant plan/status APIs |
| `config/` | typed environment/configuration boundaries |
| `core/queue` and `libs/` | shared Redis, BullMQ, database, notifications, common guards/interceptors/logging |

## Identity And Access

| Module | Primary responsibility |
|---|---|
| `authentication` | tenant customer/admin login, registration, OTP, OAuth, refresh/logout, 2FA |
| `user-management` | profile, devices, OAuth accounts, user-level preferences |
| `staff-access` | tenant staff invitations, roles, permissions, access lifecycle |
| `audit` | tenant business audit records |

## Storefront And Order Lifecycle

| Module | Primary responsibility |
|---|---|
| `catalog` | public catalog and admin product/category/inventory management |
| `cart` | guest/account cart, saved/shared carts, reorder |
| `checkout` | server-priced checkout preview, delivery zones, payment options |
| `order` | order placement, status transitions, fulfillment, pickup, COD policy |
| `customer-account` | customer profile/address/account commerce data |
| `customers` | admin customer directory and customer metrics |
| `store-locations` | tenant pickup/warehouse/store locations |

## Money, Fulfillment, And Operations

| Module | Primary responsibility |
|---|---|
| `commerce-payments` | tenant prepaid providers, payment attempts, callbacks, recovery |
| `wallet` | customer wallet balances and ledger mutations |
| `shipping` | courier adapters, shipments, webhooks, polling, routing |
| `returns` | return request/review lifecycle |
| `refunds` | refund processing and result transitions |
| `rto` | return-to-origin operations |
| `settlements` | courier settlement import and parsing |
| `reconciliation` | financial/operational findings and scans |
| `reports` | bounded admin reports and operational reads |

## Communication, Content, And Support

| Module | Primary responsibility |
|---|---|
| `transactional-messaging` | templates, message records, channel routing, dispatch/retry |
| `customer-notifications` | customer notification preferences/history |
| `chatting` | conversations, messages, realtime participant updates |
| `product-content` | product reviews/content/moderation |
| `service-booking` | tenant service catalog and booking requests |
| `warranty` | warranty eligibility, claims, evidence |
| `purchase-activity` | customer purchase/activity history |
| `storefront-analytics` | first-party storefront event collection and reporting |
| `delivery-personnel` | rider applications, profiles, assignment/location operations |
| `storage` | tenant-scoped object upload/presigned storage operations |
| `settings` | tenant commerce settings and feature flags |
| `operations-health` | platform/tenant dependency and readiness evidence |

## Where To Add A New Module

1. Decide whether its data belongs to the control plane, tenant plane, or
   shared infrastructure.
2. Define the route surface and actor types before writing the service.
3. Create the feature module and keep dependencies explicit.
4. Add DTOs and validation at the transport boundary.
5. Add controller guards and service-level ownership/tenant checks.
6. Use `TenantDbService.get()` for tenant-only work and
   `PlatformPrismaService` for platform-only work.
7. Add transactions, idempotency, audit, write-gate, and plan-gate behavior for
   the mutation risk involved.
8. Put provider integrations in adapters/gateways and slow work in queues and
   processors.
9. Add tests under the feature/submodule `tests/` folder.
10. Update the module-by-module analysis, structure tracking, and project-flow
    documentation when the new flow changes the system map.

## Review Questions

- Can a caller select another tenant by changing an ID, host header, token, or
  job payload?
- Which database client does every service method use?
- What happens if the request is retried, duplicated, or concurrently executed?
- Can one tenant consume all DB pools, Redis memory, queue workers, or provider
  capacity?
- Which state transition and audit record prove the mutation happened?
- What work is synchronous and what should be queued?
- How will operators detect and recover from partial failure?

