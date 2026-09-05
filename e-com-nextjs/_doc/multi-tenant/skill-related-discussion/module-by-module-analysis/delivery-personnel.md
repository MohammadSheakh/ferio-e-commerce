# Delivery Personnel Module

## Scope

Rider applications, admin approval/profile operations, assignments, rider
orders, online status, and location tracking.

## Architecture Score

**68%**. The domain surface is clear and rider endpoints now use typed
principals, but the service still has Prisma casts, status casts, location
history scale concerns, and needs deeper authorization/concurrency tests.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /delivery-personnel/apply` | 72% | Rate-limited public registration and normalization are good; add abuse/duplicate tests. |
| `GET /delivery-personnel/admin/list` | 70% | Protected admin list; verify bounded status/search pagination. |
| `POST /delivery-personnel/admin/create` | 72% | Password hashing and conflict checks are good; audit account creation. |
| `GET /delivery-personnel/admin/map-data` | 62% | Potentially expensive location/order aggregation; require bounded time/window. |
| `DELETE /delivery-personnel/admin/:id/location-history` | 70% | Mutation permission exists; audit and retention semantics need tests. |
| `PATCH /delivery-personnel/admin/:id/approval` | 72% | State transition needs concurrency and audit guarantees. |
| `PATCH /delivery-personnel/admin/:id` | 70% | Sensitive profile/password update needs explicit field policy and audit. |
| `GET /delivery-personnel/admin/:id` | 72% | Admin detail read; project sensitive fields carefully. |
| `PATCH /delivery-personnel/admin/assign-order` | 70% | Assignment race and order-state checks need transaction tests. |
| `GET /delivery-personnel/my-orders` | 76% | Typed principal and role guard now clear; ensure assignment scope in service. |
| `PATCH /delivery-personnel/my-orders/:orderId/status` | 76% | Good actor boundary; enforce legal status transitions atomically. |
| `GET /delivery-personnel/me` | 78% | Typed authenticated rider identity. |
| `PATCH /delivery-personnel/online-status` | 74% | Idempotent status update and heartbeat policy should be explicit. |
| `POST /delivery-personnel/location` | 68% | High-write endpoint needs rate limiting, sampling, retention, and abuse controls. |

## Tasks

1. Replace remaining Prisma transaction/status casts with generated types.
2. Add assignment/status concurrency tests and actor audit events.
3. Define location ingestion limits, partition/retention, and geospatial index.
