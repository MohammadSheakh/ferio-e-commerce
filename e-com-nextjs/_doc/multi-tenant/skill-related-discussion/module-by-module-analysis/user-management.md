# User Management Module

## Scope

Users, profiles, devices, OAuth accounts, preferences, and authenticated
account operations.

## Architecture Score

**75%**. Authenticated ownership, Prisma payload typing, Redis cache, and
submodule separation are good; OAuth/provider contracts and cache consistency
need more hardening.

## Routes

| Route group | Score | Review |
|---|---:|---|
| `GET/PUT /users/profile` | 78% | Typed owner profile boundary; cache invalidation and field allowlist required. |
| `PUT /users/preferred-time` | 78% | Simple owner mutation; audit/privacy policy should be explicit. |
| `GET /users/statistics` | 72% | Counts can become expensive; use bounded/aggregate strategy. |
| `GET /users/me` | 82% | Clear authenticated identity route. |
| `GET/PUT /users/profile/details*` | 76% | Avoid duplicate profile API contracts and unify response shape. |
| `PUT /users/profile/support-mode` | 78% | DTO enum and owner scope should be tested. |
| `PUT /users/profile/notification-style` | 78% | DTO enum and cache invalidation should be tested. |
| `GET /users/profile/full` | 74% | Project sensitive fields deliberately. |
| `POST/GET/DELETE /users/devices*` | 76% | Device ownership and token revocation must be enforced. |
| `GET /users/oauth/accounts*` | 72% | Provider account ownership and unlink-last-login rules need tests. |
| `DELETE /users/oauth/unlink/:provider` | 70% | Step-up authentication and account recovery protection required. |

## Tasks

1. Replace remaining DTO/cache boundary casts with named types.
2. Add OAuth unlink, device takeover, and cache race tests.
3. Consolidate overlapping profile route contracts.
