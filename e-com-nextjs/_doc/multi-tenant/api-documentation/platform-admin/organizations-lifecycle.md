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
| 1 | POST | `/platform/organizations/:id/provision` `{ idempotencyKey? }` | Idempotent resumable provisioning (DB→migrate→seed→READY) |
| 2 | PATCH | `/platform/organizations/:id/status` `{ status:SUSPENDED\|ACTIVE, reason }` | Suspend/reactivate (audited) |
| 3 | GET | `/platform/organizations/:id/provisioning-runs` | Step-by-step timeline |
| 4 | POST | `/platform/organizations/:id/closure/initiate` `{ reason? }` (10–1,000 chars when supplied) | CLOSURE_PENDING + disables all domains |
| 5 | POST | `/platform/organizations/:id/closure/finalize` `{ retentionAcknowledged, exportAttested, overrideRetentionPeriod? }` | Retires registry after retention window confirm |

## Screen: Domain lifecycle
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/platform/organizations/:id/domains/custom` `{ hostname }` | Register a custom hostname and return its verification token |
| 2 | POST | `/platform/organizations/:id/domains/:domainId/verify` `{ verificationToken }` | Verify ownership after DNS/TLS readiness checks |
| 3 | POST | `/platform/organizations/:id/domains/:domainId/primary` | Make an active domain the organization's primary hostname |
| 4 | POST | `/platform/organizations/:id/domains/:domainId/disable` | Disable a domain from receiving tenant traffic |

The organization detail screen calls these mutations through the platform session BFF.
The operator must publish the returned token and complete DNS/TLS readiness outside the
browser before verification can succeed; this UI does not claim live DNS or routing proof.

## Screen: Usage & reconcile
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/organizations/:id/usage` | Counters vs plan limits with warning flags |
| 2 | POST | `/platform/organizations/:id/usage/reconcile` | Recount facts → correct drift (audited report) |

Console never shows tenant DB credentials — registry views are
credential-free by construction.
