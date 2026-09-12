# Ferio Flow Diagrams

These Mermaid source files are intentionally split by architectural boundary.
They are study diagrams, not a replacement for the implementation, API
documentation, tests, or release checklist.

## Reading Order

1. `01-system-context-and-planes.mmd` - actors, web applications, backend,
   and the platform/tenant database split.
2. `02-tenant-request-lifecycle.mmd` - trusted host resolution through a
   tenant-scoped Prisma client and response/error handling.
3. `03-storefront-checkout-order-sequence.mmd` - server-priced checkout,
   idempotent order creation, payment, and asynchronous fulfillment boundaries.
4. `04-platform-tenant-provisioning-sequence.mmd` - operator-driven
   organization creation and the nine provisioning steps.
5. `05-organization-lifecycle-state-machine.mmd` - allowed organization
   status transitions and their operational meaning.
6. `06-domain-and-tenant-availability-rules.mmd` - domain activation,
   resolver readiness, suspension, closure, and fail-closed routing.
7. `07-tenant-stamped-worker-lifecycle.mmd` - durable intent, trusted job
   envelope, tenant reconstruction, idempotent processing, and retry outcome.
8. `08-payment-and-courier-recovery-sequence.mmd` - payment recovery,
   courier callbacks, polling, and provider calls outside database transactions.
9. `09-messaging-and-reconciliation-reliability.mmd` - deduplicated messages,
   bounded delivery retries, settlement/reconciliation evidence, and alerts.
10. `10-platform-admin-authentication.mmd` - platform login, platform realm,
    and control-plane authorization.
11. `11-tenant-customer-session-lifecycle.mmd` - tenant login, verification,
    refresh rotation, logout, and account recovery.
12. `12-tenant-admin-authorization-chain.mmd` - authentication, role,
    permission, membership, and service-level ownership checks.
13. `13-socket-ticket-and-room-isolation.mmd` - REST ticket issuance, socket
    verification, tenant-scoped rooms, presence, and disconnect cleanup.
14. `14-catalog-cart-and-checkout-journey.mmd` - published catalog, guest cart,
    account merge, server-priced checkout, and order creation.
15. `15-delivery-pickup-returns-and-refunds.mmd` - fulfillment, courier state,
    store pickup, return inspection, refund, and RTO boundaries.
16. `16-wallet-warranty-and-service-booking.mmd` - wallet ledger safety,
    warranty evidence, and customer service booking ownership.
17. `17-platform-organization-and-domain-operations.mmd` - organization
    management, domain verification, primary-domain selection, and status changes.
18. `18-subscription-entitlement-and-usage-evaluation.mmd` - plans,
    subscription state, overrides, usage counters, and backend enforcement.
19. `19-migration-backup-restore-and-closure.mmd` - canary/batch migrations,
    tenant restore evidence, export, retention, and destructive closure.
20. `20-support-access-health-and-audit-evidence.mmd` - time-bounded support
    access, dependency health, reconciliation, and operator audit trails.
21. `21-customer-chat-and-support-conversation.mmd` - conversation membership,
    durable messages, notifications, and tenant-scoped realtime delivery.
22. `22-customer-notification-preferences-and-inbox.mmd` - notification
    creation, deduplication, preferences, read state, and soft deletion.
23. `23-storefront-analytics-and-purchase-activity.mmd` - sanitized analytics,
    bounded tenant aggregation, consent, and privacy-safe public activity.
24. `24-product-request-and-delivery-personnel.mmd` - public product requests,
    admin workflow, rider authentication, assignment, and delivery status.
25. `25-reports-and-orders-export.mmd` - permission-aware reports, keyset
    accumulation, integer money arithmetic, and safe CSV export.
26. `26-courier-settlement-import-and-posting.mmd` - template preflight,
    duplicate protection, evidence matching, and idempotent settlement posting.
27. `27-reconciliation-findings-and-remediation.mmd` - durable scan runs,
    tenant-scoped retry, finding upsert, alerts, and operator resolution.
28. `28-database-redis-queue-and-provider-health.mmd` - bounded dependency
    probes, queue health, backup evidence, and sanitized operator status.
29. `29-diagram-navigation-map.mmd` - actor-to-boundary navigation across the
    complete diagram set, including frontend/API integration and assurance.
30. `30-customer-profile-address-and-account-linking.mmd` - order-proof account
    linking, tenant-local profile data, address ownership, and default address.
31. `31-staff-invitation-and-access-lifecycle.mmd` - staff invitation, reset,
    role/permission updates, deactivation, and session revocation.
32. `32-content-settings-locations-and-feature-flags.mmd` - admin configuration,
    public-safe settings, locations, content, and cache invalidation.
33. `33-tenant-storage-upload-and-evidence.mmd` - validated upload, presigned
    storage, tenant object namespace, malware/quarantine, and evidence linkage.
34. `34-release-1-user-journey-study-path.mmd` - recommended learner path from
    tenant identity through a complete business operation and release evidence.
35. `35-frontend-route-and-bff-surface.mmd` - browser route groups, Next.js BFF
    handlers, tenant API resolution, and the separate platform-admin surface.
36. `36-api-documentation-to-frontend-integration.mmd` - API documentation
    domains mapped to frontend surfaces, NestJS controller families, and review
    questions for auth, tenant context, ownership, and failure handling.
37. `37-tenant-admin-dashboard-initialization.mmd` - dashboard loading through
    the admin BFF, session/permission guards, tenant-scoped reads, and UI states.
38. `38-tenant-admin-permissioned-crud.mmd` - server-side authorization,
    ownership validation, transactional mutation, audit evidence, and refresh.
39. `39-tenant-admin-async-and-realtime-feedback.mmd` - durable commands,
    tenant-stamped workers, retries, socket notifications, and authoritative reads.
40. `40-platform-organization-provisioning.mmd` - operator organization setup,
    durable provisioning, tenant database creation, migrations, and evidence.
41. `41-platform-domain-activation-and-routing.mmd` - domain verification,
    primary-domain rules, resolver readiness, suspension, and closure behavior.
42. `42-platform-subscription-entitlement-change.mmd` - plan/subscription
    mutations, entitlement evaluation, usage limits, and server-side enforcement.
43. `43-platform-migration-and-closure-safety.mmd` - preflight, canary/batch
    execution, pause/resume, recovery evidence, and destructive closure safety.
44. `44-redis-bullmq-job-reliability.mmd` - durable intent, Redis/BullMQ
    delivery, tenant-stamped workers, idempotency, retries, and dead letters.
45. `45-provider-callback-and-recovery.mmd` - callback authenticity, trusted
    lookup, valid state transitions, reconciliation conflicts, and notifications.
46. `46-backup-restore-evidence-drill.mmd` - isolated restore, verification,
    measured recovery evidence, and operator-visible results.
47. `47-dependency-health-and-operational-evidence.mmd` - dependency probes,
    normalized health, thresholds, sanitized alerts, and audit follow-up.
48. `48-cross-tenant-negative-test.mmd` - hostile identifiers, host/token/room
    mismatch checks, safe failures, and proof that foreign data is untouched.
49. `49-live-host-ssr-bff-isolation.mmd` - two tenant hosts, SSR internal fetch,
    host preservation, cache boundaries, and rendered-data separation.
50. `50-security-session-and-observability-checks.mmd` - transport, host,
    session, permission, ownership, fail-closed, and sanitized audit checks.
51. `51-release-1-acceptance-gate.mmd` - product, isolation, operations,
    runtime, security, documentation, pilot evidence, and go/no-go decision.
52. `52-api-endpoint-contract-lifecycle.mmd` - request validation, BFF
    forwarding, NestJS guards, domain service, scoped persistence, and response mapping.
53. `53-project-flow-document-to-evidence.mmd` - PRD, checklist, flow docs,
    API contracts, source, tests, runtime evidence, and release review traceability.
54. `54-web-admin-backend-scope-boundary.mmd` - current web/admin/backend scope
    and the explicit exclusion of the mobile Expo application.

For the honest coverage boundary and intentionally grouped flows, read
`DIAGRAM-COVERAGE.md`.

The existing PNG files in this directory are retained as historical visual
artifacts. The `.mmd` files are the editable source of truth for this diagram
set.

## Diagram Rules

- Keep one business or infrastructure boundary per file.
- Prefer named boundaries over implementation-internal details.
- Show where tenant identity is established; never imply that the browser
  selects a database.
- Mark asynchronous work explicitly so readers do not mistake a queue for a
  synchronous request result.
- Update the matching project-flow document when implementation behavior
  changes.

## Evidence Boundary

These diagrams reflect the documented architecture and inspected source
anchors. They do not claim that production DNS, external provider delivery, or
live two-host browser isolation has been proven.
