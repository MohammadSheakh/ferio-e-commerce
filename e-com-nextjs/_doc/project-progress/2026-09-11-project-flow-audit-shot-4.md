# Project-Flow Documentation Audit — Shot 4

Date: 2026-09-11

## Scope

This shot reconciled route and feature examples across all project-flow
document groups with the API documentation, generated frontend schemas,
NestJS controllers, and active Next.js BFF handlers. The mobile app was
excluded.

## Checks

- Compared documented platform, tenant-admin, customer, checkout, catalog,
  tenancy-plan, socket-ticket, and BFF path examples with the current route
  inventory.
- Confirmed frontend BFF translation preserves the backend route contract for
  the documented examples.
- Confirmed the generated customer and tenant-admin API schemas include the
  documented `/api/v1` public paths.
- Re-scanned for stale suspension codes, obsolete platform permission
  decorators, obsolete platform routes, and outdated internal-alpha status.

## Result

No additional route or HTTP-method mismatch was found in this shot. The only
confirmed route/documentation drift in this portion was already corrected in
MT-9 Shot 3. Conceptual host-relative examples remain labelled as teaching
examples; they are not being presented as raw public URL contracts.

This remains source-level evidence. Live browser host forwarding, cookies,
WebSocket rooms, provider delivery, concurrency races, and production
authorization still require runtime validation.
