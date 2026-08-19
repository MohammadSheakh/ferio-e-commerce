again start where you left off, follow [design-language.md](_doc/design-language.md) if you need design new something  and keep in mind [extraPlan.png](_doc/extraPlan.png)  [product-requirement-document-PRD.md](_doc/product-requirement-document-PRD.md)  and [implementation-checklist-and-schedule.md](_doc/implementation-checklist-and-schedule.md)



I’m resuming from the documented next unblocked slice: a durable transactional-message outbox. I’ll keep channel delivery configuration-gated, wire post-commit order/shipment events safely, and avoid coupling commerce success to notification providers.

The legacy notification module is an internal user/socket system and is not suitable for customer commerce messages. I’m adding a separate transactional outbox with deduplication, message-attempt history, and provider-neutral channel fields so future SMS/WhatsApp/email adapters remain clean.


The durable outbox and attempt ledger are modeled, with recipient masking and deduplication tests. I’m generating Prisma types next, then I’ll wire only committed order and accepted shipment events into the outbox.

Post-commit triggers are now wired for order placement, confirmation, cancellation, shipment creation, and accepted courier status changes. I’m compiling this boundary before adding the admin outbox view, because commerce must remain successful even when enqueueing fails.

The compiler found only a Prisma aggregation typing mismatch; that is corrected. I’m adding a read-only operational outbox page now, with masked recipients and a clear “dispatch not configured” state rather than fake send controls.

The admin now has a truthful outbox view: queued events, masked recipients, attempt counts, and a visible configuration block—no pretend delivery button. I’m running final backend/admin builds and Prisma validation before updating the checklist.


The outbox slice now compiles cleanly and all 26 backend tests pass. I’m aligning the checklist and diagrams with reality: durable post-commit queueing and failure isolation are complete; actual channel dispatch and provider outcomes remain blocked by policy and credentials.


You've hit your usage limit. Upgrade your plan or add credits to continue, or try again at Aug 10, 2026, 11:12 AM.


=======================

# Ferio Project Progress 12

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Auditability and operational controls  
**Status:** Append-only audit coverage implemented for every currently connected high-risk admin mutation

## Context

`project-progress-11.md` retained the interrupted transcript from the transactional-message outbox session. The completed outbox evidence remains in `project-progress-10.md`; this checkpoint resumes from that validated state without repeating the implementation.

## Delivered

### Backend audit domain

- Added append-only `AuditLog` records with actor, role, action, entity type, entity ID, source, safe previous value, safe new value, metadata, and timestamp.
- Added migration `20260811090000_append_only_audit_log` with indexed investigation paths and revoked public update/delete privileges.
- Added recursive redaction for passwords, secrets, tokens, authorization, cookies, credentials, signatures, and API keys before JSON snapshots are stored.
- Added bounded text snapshots to prevent oversized audit payloads.
- Added an authenticated, read-only admin audit API with action, entity, actor, and source filtering plus pagination.
- Added no audit update or delete endpoint.

### Transactional audit coverage

- Audited settings creation, update, and deletion in the same transaction as the settings mutation.
- Audited category creation and update.
- Audited product creation, editing, publication, unpublication, and archival status changes.
- Audited manual inventory adjustments with before/after stock, quantity delta, reason, and inventory reference.
- Audited delivery-zone creation and updates, including fee, threshold, activation, ordering, and district changes.
- Audited COD verification policy changes.
- Audited order confirmation and cancellation with lifecycle before/after values and operational notes.
- Audited fulfillment state changes and fulfillment-exception creation/resolution.
- Audited courier-provider activation changes.
- Audited successful and failed shipment creation without storing provider credentials or full customer request payloads.

### Admin Web

- Added `/dashboard/audit` and sidebar navigation.
- Added compact action, entity, actor, source, timestamp, and expandable safe-value presentation.
- Added action, entity-type, and source filters.
- Kept the screen read-only with calm empty/loading/error states following the Ferio design language.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema generation | Passed; 32 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 8 suites and 28 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; audit page and BFF route generated |

## Still Open

- Migrations have not been applied to a disposable or live PostgreSQL database.
- Authentication security-event logging remains separate from business mutation audit coverage.
- Explicit permissions beyond the current admin role guard remain incomplete.
- Store identity, currency, timezone, order prefix, return policy, payment methods, and notification-template configuration remain.
- Approved messaging-provider dispatch and courier sandbox verification remain blocked by decisions or credentials.
- Correlation IDs, structured production logs, metrics, alerts, backups, and restore validation remain.

## Recommended Next Work

1. Replace the legacy static-content-only settings surface with typed commerce settings for store identity and operational policies.
2. Keep all new settings writes inside the established audit transaction convention.
3. Apply migrations to disposable PostgreSQL and verify append-only privileges with a non-owner application role.
4. Resume messaging and courier adapters after provider decisions and credentials are available.


==============================


# Ferio Project Progress 13

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Settings and operational controls  
**Status:** Typed commerce settings are implemented, audited, and enforced in the current COD order path

## Delivered

### Backend configuration domain

- Added a typed singleton `CommerceSettings` model and migration for store identity, legal name, support contacts, BDT currency, IANA timezone, order prefix, return-window default, payment availability, and policy links.
- Kept the legacy static-content settings model separate so operational configuration is validated rather than stored as untyped content.
- Added authenticated admin read/update APIs and a public safe configuration API that never exposes provider credentials or internal audit data.
- Added validation and normalization for Bangladesh support phone numbers, email casing, absolute policy URLs, order prefixes, return-window bounds, and IANA timezones.
- Rejected prepaid activation until a payment provider is approved and configured instead of presenting an unavailable payment path as active.

### Operational enforcement

- Applied the configured order prefix and currency to future order creation.
- Enforced global COD availability during both checkout preview and transactional order creation.
- Preserved product-level COD restrictions and the existing configurable COD verification policy.
- Recorded every commerce-settings update in the append-only audit ledger with actor and safe before/after values inside the same database transaction.

### Admin Web

- Added `/dashboard/settings`, its authenticated BFF route, and sidebar navigation.
- Added restrained sections for identity, contacts, commerce defaults, checkout availability, return-window default, and policy links following the Ferio design language.
- Linked operational settings to the existing COD and delivery configuration surfaces.
- Added `CommerceSettings` to the audit-history entity filter.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema generation | Passed; 32 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 9 suites and 31 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; settings page and BFF route generated |

## Still Open

- Migrations have not been applied to a disposable or live PostgreSQL database.
- The exact return policy remains product-owner blocked; the setting stores an approved default when available but does not invent category exceptions.
- Prepaid activation remains blocked until the first payment provider is selected and configured securely.
- Notification-template configuration and approved provider dispatch remain incomplete.
- Delivered, cancelled, returned, RTO, collection, refund, and settlement reporting remain incomplete.
- Customer Web has a public safe configuration endpoint available, but support and policy pages have not yet consumed it.

## Recommended Next Work

1. Build a truthful delivered-outcome reporting foundation without calculating unapproved contribution metrics.
2. Add customer support and policy surfaces backed by the public safe configuration endpoint.
3. Apply migrations to disposable PostgreSQL and verify settings, audit, checkout, and order behavior against the database.
4. Resume payment, courier, and messaging adapters only after provider decisions and credentials are available.


===================================
# Ferio Project Progress 14

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Reports and operational controls  
**Status:** Truthful order-cohort outcome reporting is implemented; incomplete financial ledgers remain visibly unavailable

## Delivered

### Backend reports

- Added an authenticated admin reporting module with a UTC order-created cohort basis and a default rolling 30-day window.
- Added validated date, source, and courier filters with a maximum 366-day operational query range.
- Added distinct placed, confirmed, shipped, delivered, cancelled, received-return, broader return-case, and RTO counts.
- Added gross placed, gross confirmed, gross delivered, and known-collected values with an explicit definition for each amount.
- Added payment-state, refund-state, source, courier, pending-confirmation, fulfillment-ready, open-exception, delivery-exception, and RTO summaries.
- Kept all money in integer minor units during aggregation.

### Truthful financial boundaries

- Returned `null` for net-of-refund, refund amount, COD settlement amount, and contribution where supporting ledgers or approved inputs do not exist.
- Added a machine-readable incomplete contribution status and the exact missing input list.
- Avoided using the word “profit” for any incomplete calculation.
- Declared that report dates select `Order.createdAt` in UTC and later outcomes are attributed back to that cohort.

### Admin Web

- Added `/dashboard/reports`, an authenticated BFF route, and sidebar navigation.
- Added restrained outcome, revenue-basis, contribution-status, operations, payment-state, source, and courier sections following the Ferio design language.
- Replaced the Admin overview's mock KPI and recent-order data with live reporting and order APIs.
- Linked the overview to full reports and order operations.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused report tests | Passed; 2 suites and 5 tests |
| Backend | Full unit tests | Passed; 11 suites and 36 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; reports BFF/page and live overview generated |

## Still Open

- Migrations from earlier slices have not been applied to a disposable or live PostgreSQL database.
- Refund amounts do not have a dedicated order-linked ledger.
- COD collection and courier settlement records do not exist, so settlement amount and variance cannot be reported.
- Product cost, acquisition allocation, packaging, subsidy, return/RTO, and messaging cost inputs are incomplete or unapproved.
- Product filtering, permission-aware exports, asynchronous large reports, and masked export tests remain.
- Dedicated permission-specific owner, operations, and finance workspaces remain; the current report combines these views for the existing admin role.
- Outcome dates use an explicitly labeled order-created cohort, not independent event-date accounting views.

## Recommended Next Work

1. Connect Customer Web support and policy pages to the public safe commerce configuration endpoint.
2. Implement return, refund, RTO-cost, COD collection, and settlement records before expanding finance calculations.
3. Add product filters and permission-aware asynchronous exports after explicit staff permissions exist.
4. Apply migrations to disposable PostgreSQL and verify reporting against seeded lifecycle outcomes.


===============================


# Ferio Project Progress 15

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Customer trust and policy surfaces  
**Status:** Customer support, policy references, and delivery coverage now use live backend configuration instead of placeholders

## Delivered

### Customer Web configuration

- Added a typed public store-configuration client with a safe local fallback for temporary backend unavailability.
- Applied the configured store name to page metadata, header identity, footer identity, and copyright text.
- Replaced the placeholder phone number and unsupported delivery promise in the footer with configured contacts and factual navigation.
- Added a focused backend test proving the public configuration response excludes internal fields such as the order prefix, record ID, and timestamps.

### Customer support and policies

- Added `/support` with secure order-tracking guidance and configured phone/email links.
- Added `/policies` with configured terms, privacy, and return-policy document links.
- Displayed the configured default return window when approved and explicitly stated when it or an approved policy document is not yet published.
- Avoided inventing legal, refund, privacy, delivery-time, or return-exception text while product-owner and legal review remain open.

### Delivery and checkout

- Added `/delivery` using the same active delivery zones, district coverage, fees, and free-delivery thresholds used by checkout.
- Updated checkout's required acknowledgement to link directly to current policy references while keeping optional promotional consent separate.
- Added a return-policy link to product detail pages.
- Added support, policy, and delivery pages to the generated sitemap and global navigation.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full unit tests | Passed; 11 suites and 37 tests |
| Backend | Production build | Passed |
| Customer Web | TypeScript and production build | Passed; 20 routes generated |

## Still Open

- Approved terms, privacy, refund, and return-policy documents must be configured before launch.
- The exact return window and category/product exceptions remain product-owner blocked.
- Support hours, escalation contacts, and service-level expectations remain undefined.
- No support-case domain, return request workflow, refund ledger, or customer communication channel is connected yet.
- Earlier database migrations remain unapplied to disposable or live PostgreSQL.
- Browser, mobile-device, keyboard, screen-reader, and constrained-network validation remain.

## Recommended Next Work

1. Implement return, return-item, evidence, inspection, resolution, refund, and RTO-cost records without automatic blanket approval.
2. Add COD collection and courier settlement ledgers before expanding finance reporting.
3. Expose customer return initiation only after the return eligibility policy is approved.
4. Configure reviewed policy documents and verified support contacts before launch acceptance.
====================================
# Ferio Project Progress 16

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Returns and post-purchase controls  
**Status:** Itemized return requests and explicit review decisions are implemented; physical receipt and financial execution remain gated

## Delivered

### Return domain

- Added return case, item, evidence, and append-only status-history models with a dedicated migration.
- Added distinct eligibility, request reason, requested resolution, request channel, review decision, and case status enums.
- Added unique human-readable RMA references and indexed return queues.
- Linked return cases to immutable order-item snapshots without changing original order data.
- Protected remaining returnable quantity against duplicate or overlapping active requests inside a serializable transaction.

### Eligibility and review

- Added eligibility evaluation for delivered state, delivery timestamp, configured return window, and expiry.
- Marked cases `REVIEW_REQUIRED` when policy or delivery evidence is incomplete rather than approving by default.
- Allowed ineligible requests to be recorded for transparent staff review instead of silently discarding customer claims.
- Added explicit approve, partial-approve, and reject decisions with required reasons and per-item approved quantities.
- Kept replacement and refund as requested outcomes only; review does not create fulfillment, inventory, or payment side effects.
- Synchronized the order's coarse return status while preserving detailed case history.

### Audit and Admin Web

- Audited return creation and review with actor, before/after state, eligibility, decision, and order context in the same transaction.
- Added an order-level return panel with eligibility explanation, remaining quantities, item/reason/channel/outcome capture, and evidence URLs.
- Added `/dashboard/returns` with status filtering, customer/order context, evidence links, and explicit review controls.
- Added Returns navigation and ReturnCase filtering in audit history.
- Displayed a clear warning that approval does not receive stock, issue money, or create a replacement.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma composition | Passed; 33 schema fragments |
| Backend | Prisma validation and generation | Passed |
| Backend | Focused return tests | Passed; 2 suites and 5 tests |
| Backend | Full unit tests | Passed; 13 suites and 42 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 33 routes generated |

## Still Open

- The return migration and earlier migrations have not been applied to disposable or live PostgreSQL.
- Product-owner approval for return windows and category/product exceptions remains blocked.
- Physical receipt, inspection condition, received quantity, and explicit inventory disposition remain unimplemented.
- No stock movement occurs from return approval.
- Refund, replacement shipment, exchange, and customer-facing return initiation remain unimplemented.
- RTO cost/reason, COD collection, courier settlement, and reconciliation records remain absent.
- Database concurrency and end-to-end return lifecycle tests remain.

## Recommended Next Work

1. Add received-item inspection with received quantity, condition, final resolution, and sellable/damaged/quarantined/lost disposition.
2. Apply disposition-driven inventory movements only after explicit inspection.
3. Add an order-linked refund ledger with method, amount, status, actor, reason, and provider reference before refund execution.
4. Model RTO cost and stock disposition separately from customer returns.
=====================================
# Ferio Project Progress 17

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Returns and inventory disposition  
**Status:** Approved returns can be physically received and inspected with explicit, audited stock disposition

## Delivered

### Inspection data model

- Added inspected return status, item condition, inventory disposition, inspection decision, and final resolution enums.
- Added per-item received quantity, accepted quantity, condition, disposition, and inspection note.
- Added case-level received/inspected timestamps, inspector actor, decision, final resolution, and required inspection note.
- Added a migration and inspector/time index for operational investigation.

### Transactional inventory behavior

- Restricted inspection to approved or partially approved return cases.
- Required inspection details for every approved return item.
- Prevented received quantity from exceeding preliminary approved quantity and accepted quantity from exceeding received quantity.
- Enforced internally consistent accept, partial-accept, reject, and rejected-resolution combinations.
- Required at least one physically received unit before inspection can complete.
- Restored sellable units to on-hand inventory using the original consumed inventory reservations.
- Restored damaged units to on-hand and damaged quantities together so they do not become available stock.
- Recorded immutable `RETURN` or `DAMAGE` inventory movements linked to the return case and actor.
- Recorded quarantined and lost dispositions without adding those units to available stock.
- Failed the complete transaction when received inventory cannot be traced to delivered reservations.

### Lifecycle and Admin Web

- Added an authenticated inspection command and BFF route.
- Updated return cases and append-only history to `INSPECTED` in the same transaction as inventory effects.
- Updated the order's coarse return status to `RECEIVED` without changing refund status.
- Audited inspection before/after values, decision, resolution, received total, and accepted total.
- Added per-item receipt, condition, disposition, accepted quantity, final-resolution, and inspection-note controls to the Admin Returns queue.
- Kept refund and replacement execution visibly separate from inspection.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma generation and validation | Passed; 33 schema fragments |
| Backend | Focused return tests | Passed; 2 suites and 8 tests |
| Backend | Full unit tests | Passed; 13 suites and 45 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; inspection route and controls generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- Refund records, payment execution, replacement fulfillment, and customer notifications remain unimplemented.
- Quarantined and lost dispositions are explicit on return items but do not yet have warehouse location or custody ledgers.
- Product-owner approval for return windows and exceptions remains blocked.
- RTO cost, RTO stock disposition, COD collection, courier settlement, and reconciliation remain absent.
- Database integration, concurrency, and end-to-end post-purchase tests remain.

## Recommended Next Work

1. Add an order- and return-linked refund ledger with amount, method, reason, status, actor, idempotency key, and provider reference.
2. Keep refund execution separate from inspection and support safe retry without duplicate money movement.
3. Add explicit quarantine/custody movements before warehouse operations need location-level quarantine stock.
4. Model RTO costs and stock disposition separately from customer returns.

=======================================
# Ferio Project Progress 18

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Refund ledger and controlled result recording  
**Status:** Inspected refund resolutions can create bounded, idempotent refund instructions and record externally evidenced settlement outcomes

## Delivered

### Refund data model

- Added an independent commerce refund ledger linked to the order and return case, with optional source-payment reference for prepaid methods.
- Added amount, currency, method, reason, provider result, failure reason, creator/completer actors, and processing timestamps.
- Added append-only execution attempts with manual/provider mode, outcome, receipt/provider reference, actor, and idempotent deduplication.
- Added schema composition relations and an unapplied SQL migration for refund records, attempts, indexes, and foreign keys.

### Transactional behavior

- Restricted refund creation to inspected returns whose final resolution is `REFUND`.
- Bounded the refundable amount to accepted returned quantities using item line totals and prevented cumulative over-refunds.
- Prevented COD orders from masquerading as original-payment refunds and required a source payment reference for prepaid original-payment refunds.
- Made creation and result commands idempotent, preserving failed attempts for retry on the same refund record.
- Required a receipt or provider reference before recording success, a provider name for provider results, and a reason for failure.
- Synchronized independent order refund status and only changed payment status when the order already represented collected payment.
- Added audit records for refund creation and every recorded result.

### Admin Web and reporting

- Added protected BFF routes for eligibility, refund creation, refund listing, and result recording.
- Added a refund ledger panel to inspected refund cases with maximum, reserved, and remaining amounts.
- Added explicit manual/provider settlement controls, retry history, and warnings that creating an instruction does not move money.
- Added succeeded refund totals and delivered revenue net of succeeded refunds to reports; COD settlement remains explicitly unavailable.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and validation | Passed; 34 schema fragments |
| Backend | Focused refund tests | Passed; 1 suite and 4 tests |
| Backend | Full unit tests | Passed; 14 suites and 49 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 33 pages/routes generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- No refund provider adapter moves money; staff record an actual manual/provider outcome only after external execution.
- A first-class prepaid payment-attempt ledger and provider webhook reconciliation remain pending.
- Replacement fulfillment, customer refund notifications, and refund ageing/ownership queues remain pending.
- RTO cost, RTO stock disposition, COD collection, courier settlement, and cross-ledger reconciliation remain absent.
- Database integration, concurrency, provider sandbox, and end-to-end post-purchase tests remain.

## Recommended Next Work

1. Model RTO separately from customer returns, including cost and explicit stock disposition.
2. Add COD collection and courier settlement ledgers before presenting collected COD revenue.
3. Add provider-neutral prepaid payment/refund adapters and webhook reconciliation when credentials and contracts are approved.
4. Apply the migration chain in a disposable PostgreSQL environment and test refund concurrency there.
===============================

# Ferio Project Progress 19

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — RTO receipt, cost, and stock disposition  
**Status:** Courier return completion creates a separate RTO case whose inventory remains reserved until audited physical receipt

## Delivered

### Separate RTO model

- Added dedicated RTO cases and items linked to shipment, order, order item, and original inventory reservation rather than using customer return records.
- Added awaiting-receipt and inspected states, normalized operational reasons, courier raw reason, timestamps, and inspector actor.
- Added outbound courier, return courier, other, and bounded total cost fields.
- Added an unapplied migration with RTO enums, tables, indexes, uniqueness constraints, and restricted relations.

### Courier and inventory behavior

- Normalized Pathao's returned event to terminal `RTO` and permitted explicit failed-delivery-to-RTO transitions.
- Automatically creates one audited RTO case from an accepted terminal courier event.
- Removed automatic reservation release from courier callbacks so unreceived parcels cannot become sellable stock.
- Required staff to reconcile every expected unit as received or lost, and every received unit as sellable or damaged.
- Released reservations only after physical receipt; sellable units become available, damaged units increase damaged stock, and lost units reduce on-hand stock.
- Added traceable release, damage, and correction movements linked to the RTO case and actor.
- Cancelled the commercial order and fulfillment with timestamp, reason, and histories only after physical RTO receipt.

### Admin Web and reporting

- Added protected RTO list and inspection BFF routes.
- Added an RTO receipt queue to Shipping with item counts, reason, cost, validation, history, and retry-safe terminal behavior.
- Added recorded RTO cost to operational finance reporting without presenting it as contribution or profit.
- Continued to label contribution incomplete because approved cost allocation rules and other required inputs remain absent.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and validation | Passed; 35 schema fragments |
| Backend | Focused RTO, shipping, and report tests | Passed; 3 suites and 7 tests |
| Backend | Full unit tests | Passed; 15 suites and 52 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 34 pages/routes generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- RTO callback behavior has unit coverage but not real Pathao or Steadfast sandbox verification.
- Existing records normalized as legacy `RETURNED` require migration/backfill policy before production rollout.
- COD collection, courier settlement, settlement items, provider fee variance, and reconciliation jobs remain absent.
- Quarantine/location custody and partial-delivery handling remain outside this RTO disposition model.
- Database integration, webhook concurrency, browser, and end-to-end RTO tests remain.

## Recommended Next Work

1. Add COD collection and courier settlement ledgers linked to shipments and provider references.
2. Record settlement items, courier fees, deductions, variances, and settlement result actors.
3. Add reconciliation checks for delivered COD without collection, RTO with collection, and unmatched settlement items.
4. Apply the migration chain to disposable PostgreSQL and test concurrent duplicate courier callbacks.
