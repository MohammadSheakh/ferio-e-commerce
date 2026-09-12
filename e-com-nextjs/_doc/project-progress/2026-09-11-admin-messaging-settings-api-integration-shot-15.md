# Admin Messaging, Settings, Notifications, and Catalog API Integration Shot 15

Date: 2026-09-11

## Scope

Audited tenant-admin transactional messaging, commerce settings, hero
showcase settings, catalog/content callers, and customer notification routes
against the active NestJS controllers and DTOs.

## Findings

- Tenant-admin transactional-message BFF routes and the messages dashboard
  match the controller for outbox listing, queue health, templates, template
  updates, retry, and the policy/provider endpoints exposed by the backend.
- The message query DTO supports `page`, `limit`, `status`, `eventType`, and
  `search`; it does not support a `channel` query filter.
- Commerce settings admin GET/PATCH and public `GET /store/config` match the
  BFFs and storefront contract.
- Hero showcase BFF reads/writes `GET/POST /settings?type=heroShowcase`; the
  settings service returns the expected single-document array projection.
- Customer notification BFFs forward list, unread count, mark-one-read,
  mark-all-read, and delete operations with the authenticated session.
- Catalog and product-content admin callers use the active `/admin/catalog`
  and `/admin/product-content` controller paths.

## Changes

- Corrected transactional messaging documentation to use `eventType` and
  `search` rather than the unsupported `channel` filter.
- Expanded settings documentation with the real POST/DELETE admin settings
  contracts and corrected the public store-config path.
- Corrected the public hero settings enum value to `heroShowcase`.
- Expanded customer notification documentation with mark-one-read and delete
  routes and the supported `unreadOnly` query parameter.

## Boundary notes

This is source-level contract evidence. It does not claim live provider
delivery, Redis/queue capacity, browser E2E, tenant-host isolation, or
production operational acceptance.
