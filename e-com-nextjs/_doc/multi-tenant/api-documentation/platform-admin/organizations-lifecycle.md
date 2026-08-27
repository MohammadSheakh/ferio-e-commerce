# Platform Admin — Dashboard, Organizations & Lifecycle

**Frontend:** `ferio-platform-admin/app` (dashboard, organizations, org detail)
**Verified against:** `platform.controller.ts`, `tenant-closure.service.ts`,
provisioning endpoints. Realm: `PLATFORM_JWT` + `PlatformAuthGuard`
permissions (`organization:read|write` etc.).

---

## Screen: Dashboard
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/dashboard` | Org counts by lifecycle, subscription states, DB statuses, provisioning failures, active support grants |

## Screen: Organizations list + create
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/organizations` | Directory |
| 2 | POST | `/platform/organizations` `{ name, slug, ownerEmail… }` | Create (audited) |
| 3 | GET | `/platform/organizations/:id` | Metadata, domains, databases, subscription, members |

## Screen: Lifecycle actions
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/organizations/:id/provision` | Idempotent resumable provisioning (DB→migrate→seed→READY) |
| 2 | PATCH | `/platform/organizations/:id/status` `{ status:SUSPENDED\|ACTIVE, reason }` | Suspend/reactivate (audited) |
| 3 | GET | `/platform/organizations/:id/provisioning-runs` | Step-by-step timeline |
| 4 | POST | `/platform/organizations/:id/closure/initiate` `{ reason }` | CLOSURE_PENDING + disables all domains |
| 5 | POST | `/platform/organizations/:id/closure/finalize` | Retires registry after retention window confirm |

## Screen: Usage & reconcile
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/organizations/:id/usage` | Counters vs plan limits with warning flags |
| 2 | POST | `/platform/organizations/:id/usage/reconcile` | Recount facts → correct drift (audited report) |

Console never shows tenant DB credentials — registry views are
credential-free by construction.
