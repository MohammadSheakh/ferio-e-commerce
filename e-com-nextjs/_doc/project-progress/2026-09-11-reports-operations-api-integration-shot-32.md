# Tenant-admin reports and operations API integration shot 32

Date: 2026-09-11

## Scope

Audited tenant-admin reports overview, CSV order export, storefront analytics,
operations health, and purchase-activity BFF callers against their NestJS
controllers, DTOs, response types, and API documentation.

## Result

- `GET /admin/reports/overview` date/source/provider filters match the active
  reports UI and `ReportQueryDto`.
- `GET /admin/reports/orders-export` returns the documented filename, CSV
  content type, content, row count, and masked/permitted customer-field marker;
  the UI downloads those fields correctly. The backend's 5,001-row pull cap is
  documented.
- `GET /storefront-analytics/dashboard?days=1..365` matches the analytics UI
  selector and tenant-admin BFF.
- `GET /admin/operations/health` and `/admin/purchase-activity` use the shared
  `adminApi` client and match their frontend response types.
- No additional route, method, query, response-envelope, or authorization
  mismatch was verified in this shot, so no source-code change was necessary.

## Verification

The prior cross-application checks remain green: customer, tenant-admin, and
platform-admin API schema checks and TypeScript checks passed. Tenant-admin
lint passes with existing hook-dependency and image optimization warnings.

## Remaining runtime proof

Report authorization/masking, CSV limits, analytics event freshness,
operations-health accuracy, tenant isolation, and production monitoring still
require live tenant runtime evidence. Mobile and Redis code were not touched.
