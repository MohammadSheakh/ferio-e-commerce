# Ferio Implementation Checklist and Delivery Schedule

**Document status:** Living execution tracker  
**Created:** August 6, 2026  
**Primary source:** [Product Requirements Document](product-requirement-document-PRD.md)  
**Visual input:** [Extra Plan](extraPlan.png)  
**Progress evidence:** [Project Progress 50](project-progress-50.md), [Project Progress 57](project-progress-57.md), and current code review of all four applications

## 1. How to Use This Document

This document converts the PRD and visual plan into an implementation checklist. It is the working tracker; the PRD remains the product source of truth.

### Status legend

- [x] **Done** — implemented and validated at the current checkpoint.
- [ ] **Partial** — started, but the stated acceptance condition is not fully met. The item includes a `PARTIAL` label.
- [ ] **Pending** — not yet implemented.
- [ ] **Blocked** — waiting for a product-owner or provider decision.
- [ ] **Deferred** — intentionally outside the current release.

### Update rule

An item may be changed to `[x]` only when its relevant backend behavior, frontend integration, authorization, error states, tests, and documentation satisfy the PRD Definition of Done. A working mock screen is not considered complete.

## 2. Current Position

**Current milestone:** Release 1 — Cross-surface reconciliation and launch hardening
**Current completed scope:** Core commerce plus substantial support, pickup, delivery, and customer-engagement extensions
**Next scheduled scope:** Run Mobile App, chat, payment, and courier end-to-end provider proof, then continue Release 1 hardening
**Release 1 launch status:** Not ready

## 3. Release 0 — Foundation Checklist

### 3.1 Repository and architecture

- [x] Maintain four clear applications: Customer Web, Admin Web, Expo 54 Customer Mobile App, and NestJS backend.
- [x] Use NestJS as a modular monolith rather than premature microservices.
- [x] Use PostgreSQL and Prisma as the primary data layer.
- [x] Retain Redis and BullMQ for caching and background jobs.
- [x] Remove MongoDB from the active backend configuration.
- [x] Define separate customer and admin application origins.
- [x] Add backend environment examples and startup documentation.
- [x] Add frontend environment examples and backend URL boundaries.
- [ ] **PARTIAL:** Define shared domain contracts; authentication and catalog contracts exist, but later commerce domains do not.
- [x] Apply and verify the complete Prisma migration chain against a disposable PostgreSQL database.
- [x] Define module-level audit conventions for all sensitive mutations.
- [ ] **PARTIAL:** Define provider-neutral payment, courier, storage, and communication adapter interfaces; payment, courier, and transactional communication boundaries exist, while production object storage remains pending.
- [x] Add validated correlation IDs across HTTP requests, active BullMQ jobs, shared Customer/Admin Web backend clients, and all payment/courier provider calls.
- [ ] **PARTIAL:** Add production-ready structured logging and stable machine-readable error codes; Backend, direct-fetch BFFs, all Customer session routes, and all 80 Admin API routes preserve coded failures, while a shared correlation-aware, secret-safe JSON logger covers HTTP outcomes, PostgreSQL lifecycle, authentication/authorization security events, and Release 1 payment-recovery, courier, reconciliation, and transactional-message operations; remaining domain conversion, production transport, and retention remain pending.

### 3.2 Authentication and access

- [x] Implement backend staff authentication (`FR-AUTH-001`).
- [x] Add dedicated server-validated admin login.
- [x] Enforce server-owned roles during public registration and OAuth login.
- [x] Add 15-minute access tokens, seven-day rotating refresh tokens, logout, and refresh-token revocation (`FR-AUTH-004`).
- [x] Store Admin Web session tokens in HTTP-only cookies.
- [x] Protect Admin Web dashboard routes, forward middleware-rotated credentials to the active request, and retry Admin BFF calls once after refresh.
- [x] Add repeated-login protection and temporary account lockout.
- [x] Prevent account discovery through forgot-password responses.
- [x] Add an environment-driven initial administrator seed.
- [x] Implement server-owned explicit permissions and role checks across every protected active Release 1 module (`FR-AUTH-002`, `FR-AUTH-003`); 86 permission boundaries across 23 controller files cover Admin reads/mutations, rider self-service requires the `delivery_man` role, customer/guest routes retain authentication, ownership, participant, or public boundaries as appropriate, and three non-imported legacy payment/subscription controllers remain outside the runtime pending retirement.
- [x] Complete privacy-safe, reason-coded security-event logging for password rejection and lockout, Admin role rejection, refresh-token rejection, OAuth rejection, OTP rejection, authentication rate limiting, and authentication-email queue/delivery diagnostics (`FR-AUTH-005`).
- [ ] **PARTIAL:** Add staff invitation, deactivation, and reset workflows (`FR-AUTH-006`); the Backend has a distinct delegated `staff` role, explicit permissions/status, hashed expiring one-time invitation/reset tokens with atomic consumption, session-version revocation, owner-only audited management endpoints, and secret-safe access-email processing. Admin Web now provides owner staff management, grouped permission assignment, activation/deactivation, reset initiation, development setup-link handoff, one-time invitation/reset completion, and permission-aware navigation. Production email template/provider staging proof remains before completion.
- [x] Add optional TOTP two-factor authentication for Admin owners and delegated staff (`FR-AUTH-007`), including AES-256-GCM encrypted authenticator secrets, five-minute signed password-to-MFA challenges, one-way hashed single-use recovery codes, session revocation on enrollment/disable, rate-limited verification, Admin enrollment/disable UI, and a password login flow that issues no session cookies before MFA succeeds.
- [x] Implement guest checkout without account creation (`FR-AUTH-008`).
- [x] Implement verified customer access to order history (`FR-AUTH-009`).
- [x] Add Customer Web email registration, Redis-backed email-code verification, resend, verified-session issuance, and unverified-login rejection.
- [x] Add Google Identity Services sign-in with official audience/signature verification and durable provider-identity linking; activation remains configuration-gated by the Google client ID.

### 3.3 Frontend alignment

- [x] Replace Admin Web mock login with backend authentication.
- [x] Add real Admin Web logout.
- [x] Add Customer Web 15-minute HTTP-only access cookies, seven-day refresh cookies, refresh-token rotation, retry-once behavior for authenticated APIs, and revoking logout.
- [x] Add polished Customer Web sign-in, registration, and email-verification screens with visible account creation and Google sign-in entry points.
- [x] Enforce exact same-origin checks for every state-changing Customer Web BFF route while keeping payment-provider callbacks on the backend boundary.
- [x] Add a typed Customer Web backend-client foundation.
- [x] Fix the Customer Web checkout server-rendering failure.
- [x] Connect Customer Web catalog, cart, checkout preview, and COD order placement to real APIs.
- [x] Keep checkout idempotency-key generation compatible with non-secure HTTP test origins while preferring native secure-context UUIDs.
- [x] Connect Admin Web catalog, inventory, delivery, order, reporting, settings, overview, and customer-management screens to protected APIs.
- [ ] **PARTIAL:** Align all retained screens with `_doc/design-language.md`; the focused shared/core Release 1 surfaces plus Admin delivery-personnel, order-list/detail/fulfillment/store-pickup, prepaid-payment investigation/recovery, courier shipment/callback/poll/RTO, return review/inspection/refund, reconciliation/COD-settlement, and warranty-claim operations plus Customer warranty submission/history are complete, while the remaining retained routes still require route-by-route audit and manual accessibility/device validation.
- [ ] Verify loading, empty, success, validation, failure, and retry states on each connected screen.

### 3.4 Release 0 validation

- [x] Generate Prisma Client from the composed schema.
- [x] Pass the current backend production build.
- [x] Pass the current backend unit suite.
- [x] Pass Admin Web TypeScript validation and production build.
- [x] Pass Customer Web TypeScript validation and production build.
- [ ] **PARTIAL:** Mobile App screens and integrations exist, but canonical backend contract, secure token-storage, refresh lifecycle, and end-to-end validation remain incomplete.
- [ ] **PARTIAL:** Run the full stack against local PostgreSQL and Redis; isolated PostgreSQL reconciliation and Redis BullMQ runtime harnesses pass, while a combined API-stack environment remains pending.
- [ ] Apply migrations and seed an administrator in a disposable environment.
- [ ] Complete a browser-level admin login, refresh, and logout test.

## 4. Release 1 — Sell Reliably

Release 1 has broad implementation coverage, but launch completion still depends on contract parity, security remediation, provider proof, recovery operations, and end-to-end validation.

### Slice 1 — Catalog, products, variants, and inventory

**Purpose:** Create the shared commerce data foundation required by every later slice.  
**PRD coverage:** `FR-CAT-001`–`FR-CAT-010`, `FR-INV-001`–`FR-INV-010`

- [ ] Confirm the Release 1 category structure and variant model.
- [x] Model category, product, variant, SKU, attributes, media, price, publication, and SEO data.
- [x] Store money in minor units and support compare-at price.
- [x] Model one warehouse and on-hand, reserved, available, damaged, and incoming quantities.
- [x] Keep immutable stock movements and order-linked reservation records for every confirmation-time stock hold.
- [x] Draft, publish, unpublish, edit, and archive workflows work with catalog mutation audit records.
- [x] Add product and media ordering.
- [x] Add new and second-hand product conditions with required grade/disclosure, storefront filtering, and immutable order-item snapshots.
- [ ] **PARTIAL:** Media URLs are validated; S3-compatible upload and delivery are not connected.
- [x] Add backend catalog and inventory services, DTO validation, authorization, and pagination.
- [x] Add admin category creation, editing, hierarchy, activation, and ordering controls.
- [x] Add guarded category deletion that blocks categories with products or child categories and records an audit event.
- [x] Replace Admin Web product mocks with create, edit, archive, publish, and unpublish operations.
- [x] Add multi-variant, SKU, price, threshold, initial-stock, and stock-adjustment administration.
- [x] Add low-stock and discrepancy views with movement history.
- [x] Add stock-adjustment permission, reason, actor, and immutable movement behavior.
- [x] Add typed adjustment reasons, sign rules, source references, optional unit cost, effective time, and evidence URL to manual inventory records.
- [ ] **PARTIAL:** Catalog unit tests, confirmation-time reservation contention, and manual stock-adjustment concurrency pass; broader category, product, and media database integration remain.
- [x] Verify both frontend production builds after integration.

### Slice 2 — Storefront discovery and product detail

**Purpose:** Expose only valid, published, purchasable catalog data to customers.  
**PRD coverage:** `FR-SRCH-001`–`FR-SRCH-007`, customer-facing parts of `FR-CAT-*`

- [x] Replace Customer Web static category and product data with public APIs.
- [x] Implement category and product listing routes.
- [x] Implement product detail with media gallery, price, compare-at price, variants, availability, delivery, and return information.
- [x] Remove production-path demo features, customer reviews, and Q&A; product detail now renders only backend catalog data and approved YouTube content, with an explicit empty state when no approved videos exist.
- [x] Add backend-driven Customer Web support contacts, policy references, delivery coverage, and footer navigation without placeholder legal copy.
- [x] Prevent unpublished products from appearing in listing, search, or direct routes.
- [x] Implement PostgreSQL-backed search for name, category, brand, keywords, and SKU.
- [x] Add category, price, computed availability, and variant-attribute filters.
- [x] Add newest, product-name, and price sorting.
- [ ] **PARTIAL:** Search is Unicode-aware and case-insensitive for Latin text; Banglish/transliteration normalization remains.
- [x] Add clear no-result and unavailable-product recovery states.
- [x] Add product-view, search, filter, and add-to-cart analytics events.
- [ ] **PARTIAL:** SEO metadata, sitemap, Open Graph, responsive layouts, and labelled controls exist; device, performance, keyboard, and screen-reader validation remain.

### Slice 3 — Customer, address, cart, and checkout foundation

**Purpose:** Build a validated guest purchase path before connecting payment and order operations.  
**PRD coverage:** `FR-CART-001`–`FR-CART-006`, `FR-CHK-001`–`FR-CHK-010`, `FR-CUST-001`–`FR-CUST-008`

- [x] Implement opaque persistent guest cart identity and server storage.
- [x] Add, remove, and update valid variant quantities through the backend cart.
- [x] Add a cart-page continue-shopping action and checkout-side quantity plus sibling-variant editing with server validation.
- [x] Revalidate unpublished, repriced, invalid, and unavailable lines.
- [x] Label cart totals as estimates and recalculate current product prices on the server.
- [x] Merge guest carts safely after verified password login, Google OAuth, or email verification: the opaque browser cart becomes the authenticated target, ownership is claimed server-side, other active account carts merge transactionally with stock-capped quantities and current prices, stale checkout drafts are invalidated, source carts are abandoned, and cross-account claims are rejected and cleared by Customer Web.
- [x] Require verified customer identity and current explicit email-marketing consent before abandoned-cart eligibility; only active, unexpired, nonempty, sufficiently inactive authenticated carts with a consented checkout draft and no order appear in the permission-protected read-only Admin queue. Message sending remains deferred to Release 2 campaign controls.
- [x] Normalize Bangladesh phone numbers while preserving appropriate source data.
- [x] Model customer profiles without treating a phone match as infallible identity proof.
- [x] Support reusable multiple-address records and immutable order-address snapshots.
- [x] Add authenticated customer profile and previous-order history through an explicit one-to-one link verified by order reference plus checkout phone; never infer ownership from similar email or phone alone.
- [x] Collect name, phone, district, area, address, and optional landmark.
- [ ] Add selectable map location only if approved and useful; do not block checkout on it.
- [x] Separate optional promotional consent from transactional communication.
- [x] Present required order terms clearly at checkout and link to the current configured policy references.
- [x] Add configurable delivery regions, fees, and free-delivery thresholds.
- [x] Add deterministic, server-owned coupon validation and calculation with normalized codes, fixed or percentage discounts, active windows, minimum subtotal, percentage caps, subtotal floor protection, checkout-draft/order snapshots, and placement-time revalidation.
- [x] Cart, coupon discount, delivery, payment charge, and final checkout total are server-calculated and revalidated before order creation.
- [x] Display the final total and payment method before confirmation.
- [x] Capture source and campaign attribution.
- [x] Preserve entered data across recoverable checkout errors.
- [x] Persist an optional customer order note into the checkout draft and immutable order record, and expose it to Admin operations.
- [x] Show configured support phone or email directly in checkout without hard-coded contact data.
- [ ] **PARTIAL:** Persistent cart and checkout calculation tests pass; database integration tests remain.

### Slice 4 — Orders and COD operations

**Purpose:** Place and operate idempotent COD orders with explicit state transitions.  
**PRD coverage:** `FR-ORD-001`–`FR-ORD-010`, COD portions of `FR-PAY-*`

- [x] Prove idempotent COD placement and human-readable references against concurrent duplicate database requests.
- [x] Persist immutable product, variant, SKU, price, discount, tax, quantity, and address snapshots.
- [x] Keep order, payment, fulfillment, shipment, return, and refund states separate.
- [x] Implement and unit-test server-side order transition rules.
- [x] Record complete order status history with actor, source, time, and note.
- [x] Implement configurable COD verification policy.
- [x] Admin order queue supports reference, phone, customer, status, payment, fulfillment, courier, tracking, and date controls.
- [x] Admin order detail shows customer/address and item snapshots, totals, reservations, separate lifecycle states, fulfillment exceptions, courier evidence, return controls, and a payload-safe unified timeline across order, payment, fulfillment, shipment, return, refund, and transactional-message events.
- [x] Add call/confirmation actions for order operations agents.
- [x] Require a cancellation reason and transactionally release reservations with inverse movement, history, audit, and message evidence.
- [x] Prove serializable confirmation transactions prevent oversell when two orders compete for the same finite stock.
- [x] Add paginated Admin customer profiles with masked list contacts, delivered/completed order count and spend, cancellation/return/RTO context, latest attribution, saved addresses, bounded order history, and direct order-queue links.
- [x] Cover invalid transition rules, duplicate placement, confirmation lock contention, and reservation release with unit or PostgreSQL integration tests.

### Slice 5 — Prepaid payments

**Purpose:** Add one safe provider-neutral prepaid path without coupling orders to one provider.  
**PRD coverage:** `FR-PAY-001`–`FR-PAY-010`

- [x] Approve the first production payment provider and launch requirement; SSLCommerz store credentials (`SSL_STORE_ID`, `SSL_STORE_PASSWORD`) are configured in `.env` and integrated into the backend gateway registry.
- [x] Implement an abstract payment gateway, registry, and configuration-gated SSLCommerz and aamarPay hosted-payment strategies.
- [x] Store a separate durable record for every payment attempt, merchant reference, provider reference, callback, raw outcome, and processing status.
- [x] Add hosted redirect initiation and success, failure, cancellation, and IPN result handling.
- [x] Idempotently process callbacks/webhooks and verify outcomes through SSLCommerz validation API; server-side validation, idempotency key verification, minor-unit amount checking, and payment confirmation are fully active.
- [x] Verify merchant transaction, amount, currency, order, provider, expected state, and SSLCommerz risk before marking payment successful.
- [ ] **PARTIAL:** Support safe payment retry without duplicate order creation; secure reference-plus-phone retry, expired-attempt claiming, reservation release, same-order re-reservation, and fresh hosted sessions are implemented, while provider sandbox retry proof remains.
- [x] Show paid, unpaid, failed, expired, partially refunded, and refunded states in Admin Web with provider, attempt, payment, refund, and reference filters plus payload-safe callback/refund drill-down.
- [x] Restrict and audit manual payment-state changes; the active Admin payment API exposes no generic state mutation, privileged operations are limited to recovery orchestration, and provider, expiry, settlement, and refund transitions retain append-only evidence.
- [ ] Add sandbox tests for success, failure, cancellation, replay, expiry, and retry.

### Slice 6 — Fulfillment, courier, tracking, and notifications

**Purpose:** Move confirmed orders through warehouse and delivery with traceable customer updates.  
**PRD coverage:** `FR-SHP-001`–`FR-SHP-010`, `FR-NOT-001`–`FR-NOT-008`

- [ ] **PARTIAL:** Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee adapter candidates plus deterministic routing/scorecard exist; a primary provider, production credentials, contract proof, and service-area rules still require approval.
- [x] Implement fulfillment queues for confirmed orders.
- [x] Implement pick, pack, quality check, ready-for-handover, and handed-over actions.
- [x] Record shortages and substitutions as explicit exceptions.
- [x] Implement the provider-neutral courier adapter registry with configuration-gated Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee candidates.
- [x] Add deterministic courier recommendation and scorecard behavior without coupling order state to one provider.
- [x] Store courier request, response, external consignment, tracking, label reference, COD amount, charge, and weight.
- [x] Store raw courier events and normalized shipment states outside the order table.
- [ ] **PARTIAL:** Authenticate with constant-time credential comparison, isolate rejected attempts from valid event identity, claim concurrent events once, recover failed or abandoned attempts through bounded BullMQ retries, retain attempt evidence, expose queue health, and provide audited Admin retry controls; provider sandbox tests remain.
- [x] Prevent unknown and out-of-order events from regressing accepted shipment state.
- [ ] **PARTIAL:** Add polling fallback where the provider requires it; the provider-neutral contract, durable attempts, shared normalized event path, bounded BullMQ cadence/backoff, terminal stop rules, health, Admin evidence, and fake-provider PostgreSQL/Redis proof are complete, while concrete Pathao/Steadfast status calls await real sandbox contracts.
- [x] Add secure public order tracking using verification or a signed link.
- [x] Queue transactional messages only after business transactions commit.
- [ ] **PARTIAL:** Message-attempt and provider-outcome records exist; an approved provider adapter is still required to populate live outcomes.
- [x] Keep notification failure isolated from commerce operations.
- [ ] **PARTIAL:** Add configured transactional channel priority and fallback; versioned priority, immutable message snapshots, definitive-failure-only fallback, uncertain-outcome duplicate protection, durable attempt evidence, queue health, and audited retry are implemented, while activation awaits approved priority and real provider adapters.
- [ ] Test delivery, failed attempt, cancellation, RTO, callback replay, and provider outage with provider sandbox access.
- [ ] Add pickup batches after the MVP shipment/event flow is proven.
- [ ] Add provider labels and printable AWB/barcodes where the approved provider exposes them.
- [ ] **PARTIAL:** COD collection, courier settlement, normalized provider report import, versioned evidence-bound canonical CSV workflow, immutable row evidence, and shipment-settlement reconciliation are implemented; provider-native column mappings/API retrieval and sandbox-proven delivery callbacks remain pending.

### Slice 7 — Returns, replacement, refund, and reconciliation

**Purpose:** Complete the post-purchase lifecycle and make inconsistencies visible.  
**PRD coverage:** `FR-RET-001`–`FR-RET-009`, reconciliation requirements from inventory, payment, and shipping

- [ ] **Blocked:** Approve return windows and category exceptions; the system records review-required eligibility while policy is unapproved.
- [x] Add return eligibility evaluation without automatic blanket approval.
- [x] Record return item, quantity, reason, evidence, requested resolution, channel, and append-only status history.
- [x] Add received-item inspection with received/accepted quantities, condition, decision, final resolution, and explicit inventory disposition.
- [ ] **PARTIAL:** Support approve, partial approve, reject, replacement, and refund outcomes; review, inspection, refund instruction, and refund result recording are implemented, while replacement fulfillment and direct provider execution remain pending.
- [x] Link refunds to optional source-payment reference, order, return, reason, amount, method, provider/manual result, and actor.
- [x] Model RTO separately from customer return.
- [x] Add traceable RTO cost and stock disposition.
- [ ] **PARTIAL:** Add reservation, stock, payment, COD settlement, courier, and refund reconciliation jobs; persistent idempotent scans and a scheduled BullMQ worker now cover active terminal reservations, invalid stock, COD/payment mismatch, missing or overdue collection, RTO collection, settlement variance, and aged refunds, while prepaid-provider comparison remains pending.
- [x] Add an Admin Web cross-domain exception queue with severity, age, owner, context, related-record drill-down, acknowledgement, resolution, reopening, and manual scan actions.
- [ ] **PARTIAL:** Test return-to-refund, RTO, failed refund, delayed settlement, and seeded inconsistencies; unit coverage includes return/refund/RTO/settlement paths, finding persistence, durable scan failure, scheduled worker routing, retry enqueueing, and audited resolution. PostgreSQL proves a seeded invalid-stock lifecycle and concurrent idempotent replay, while isolated Redis proves scheduler delivery, worker retry, next delayed execution, and operator retry. Provider sandbox and broader database integration cases remain.

### Slice 8 — Reports, settings, audit, and operations

**Purpose:** Make delivered outcomes, controls, and accountability launch-ready.  
**PRD coverage:** `FR-ANL-001`–`FR-ANL-011`, `FR-SET-001`–`FR-SET-007`

- [x] Configure store identity, contacts, currency, timezone, order prefix, and policies.
- [ ] **PARTIAL:** Configure COD rules, return window, delivery fees, regions, payments, and notification templates; COD availability, COD verification, return-window default, delivery zones, fees, and audited/versioned transactional notification templates are configurable, while prepaid-provider production activation remains blocked on approved credentials and sandbox verification.
- [x] Keep provider credentials outside normal application settings.
- [x] Add append-only audit records for sensitive actions.
- [x] Add placed, confirmed, shipped, delivered, cancelled, returned, and RTO reporting.
- [x] Separate revenue, collection, refund, and settlement views with explicit gross, delivered, collected, refunded, COD settlement, fee, variance, and RTO cost bases.
- [ ] **Blocked:** Add delivered contribution only after approved cost inputs and formulas exist; the required product-cost source and allocation policy remain unapproved.
- [x] Label incomplete profitability calculations clearly and never present incomplete contribution as profit.
- [x] Add permission-aware exports with sensitive-data masking.
- [x] Add capability-aware owner, operations, and finance dashboard views that request only permitted data, expose assigned tools, separate finance outcomes from operational queues, and link to URL-initialized filtered order and payment details.
- [x] Add feature flags for risky staged rollouts where appropriate.
- [x] Add explicit checkout opt-in for anonymized purchase activity and snapshot consent on the order.
- [x] Derive public social proof only from real delivered/completed orders; mask customer names and never expose contact or full-address data.
- [x] Add a four-second global customer popup and paginated verified-purchase history aggregated per order as lead product plus `+N items`, with disabled-by-default visibility controls.
- [x] Add an Admin Global Order History tab for popup/history visibility, optional district, timing, age window, product exclusions, and read-only eligible-record preview.
- [x] Replace raw purchase-activity exclusion IDs with debounced Admin catalog search, named selections, and explicit remove actions while retaining backend ID enforcement.

### Slice 8A — Omnichannel and operational extensions

**Purpose:** Track approved capabilities added after the original Release 1 plan without confusing code presence with launch readiness.
**PRD coverage:** `FR-OMNI-*`, `FR-EXT-*`, `FR-OPS-*`

- [ ] **PARTIAL:** Expo 54 Customer Mobile App includes authentication, catalog, product, cart, checkout, tracking, account, services, requests, and support surfaces; production contract parity and end-to-end proof remain incomplete.
- [ ] **PARTIAL:** Mobile Google OAuth now sends `{ provider, idToken }`; checkout synchronizes a fresh server cart and uses canonical preview/order headers and endpoints; service booking uses `/services/bookings/request`; prepaid opens the provider redirect; fake service, hero, delivery, review, and Q&A fallbacks no longer create production data. Device/provider E2E and mobile payment-return deep-link proof remain.
- [ ] **PARTIAL:** Mobile access and refresh credentials now use Expo SecureStore on native devices, backend auth supports backward-compatible body refresh-token rotation/revocation, and the API client retries once after refresh; expiry, revocation, offline recovery, and upgrade-path device E2E remain.
- [x] Add reusable customer addresses and Customer Web checkout address selection while preserving immutable order-address snapshots.
- [x] Add requested-product submission and Admin lifecycle management across Backend, Customer Web, Admin Web, and Mobile App.
- [x] Add account-authenticated YouTube review submission, Admin moderation/featuring, approved product embeds, and product review banners.
- [x] Add category-scoped service offerings, validated customer booking requests, immutable snapshots, and guarded Admin transitions.
- [x] Add authenticated warranty claims for eligible delivered order items with issue details, image evidence, duplicate protection, and append-only repair/brand/rejection history.
- [ ] **PARTIAL:** Chat now uses verified five-minute socket tickets, token/database-derived staff roles, scoped guest/customer rooms, protected Admin conversation lists, authorized message history, and restricted socket origins; live Guest ↔ Admin ↔ authenticated Customer Web/Mobile multi-client E2E proof remains before completion.
- [x] Add Admin chat folders, quick replies, unread context, and resizable conversation workspace.
- [x] Add active page-visitor aggregation and Admin topbar visibility.
- [x] Add store outlets, click-and-collect, PAY_AT_STORE, pickup lifecycle, OTP handover, and Admin operations.
- [x] Add delivery-personnel application/review, assignment, authorized location updates, and Admin live-map operations.
- [x] Add consented real-order social proof, four-second popup, paginated global history, masked locality, and Admin visibility/exclusion settings.
- [x] Add provider-neutral courier registry, six provider candidates, deterministic recommendation, scorecard, and CarryBee webhook integration foundation.
- [ ] **PARTIAL:** Prove each enabled courier against its real sandbox/contract and approve one launch provider; implemented adapter breadth is not production verification.
- [x] Add prepaid reconciliation finding types and automated service coverage.
- [x] Add page-specific loading and skeleton states across major Web and Admin routes.
- [ ] **CRITICAL SECURITY PARTIAL:** Removed the exposed CarryBee credential from current documentation and source, removed the adapter's hardcoded fallback, and added env-only webhook verification coverage. Provider-side revocation/rotation and deployed-environment verification remain owner-required launch blockers.

### Slice 9 — Release 1 hardening and launch

**Purpose:** Satisfy all PRD Release 1 exit criteria before real launch.

- [ ] **PARTIAL:** Complete automated unit tests required by PRD section 27.1; all 59 Backend unit suites pass with 207 tests, including direct evidence for money/discounts, order/payment/fulfillment/shipment/return/warranty rules, warranty evidence contracts, reconciliation and warranty pagination, phone normalization, courier/payment mapping, and deterministic reservation/release behavior. Release 2 consent suppression remains deferred, and contribution-formula tests cannot exist until the owner approves the currently blocked cost sources and allocation policy.
- [ ] **PARTIAL:** Complete transactional and concurrency integration tests; purchase-activity PostgreSQL scenarios now cover eligibility, consent, terminal status, age, exclusions, Bengali masking, order aggregation, locality, and pagination, but require a configured disposable `TEST_DATABASE_URL` for live execution.
- [ ] Complete browse-to-COD and browse-to-prepaid end-to-end tests.
- [ ] Complete admin-confirmation-to-delivery and return-to-refund tests.
- [ ] **PARTIAL:** Test Bangla, English, and mixed customer names and addresses; purchase-activity coverage now includes English and Bengali names plus Dhaka/Rampura address output rules, while full checkout, fulfillment, and support-flow coverage remains.
- [ ] Test mobile devices, constrained networks, keyboard use, and screen readers.
- [ ] **PARTIAL:** Add request, database, queue, commerce, provider, and backup metrics; the permission-protected System Health workspace now aggregates bounded in-process request latency/error evidence, PostgreSQL and Redis probes, six critical BullMQ queues, 24-hour commerce outcomes, payment/courier readiness, and deployment-reported backup/restore evidence. Durable external metrics storage, independent backup-job verification, retention, and infrastructure alert transport remain pending.
- [x] Add permission-aware actionable alerts for unresolved critical/high reconciliation findings, unknown or failed prepaid attempts, stalled/erroring courier callbacks, failed courier polls, blocked/failed transactional messages, failed refunds, and failed reconciliation scans, with deterministic thresholds and direct Admin investigation links.
- [ ] **PARTIAL:** Configure error tracking, structured logs, and secret-safe diagnostics; correlated HTTP completion/failure events, PostgreSQL lifecycle events, authentication/authorization security events, and high-risk payment-recovery, courier, reconciliation, and transactional-message events use the shared JSON logger with recursive metadata redaction and normalized errors; stable error codes and unknown-exception normalization are implemented, while external error tracking, remaining domain conversion, production transport, and retention remain pending.
- [ ] Configure automated database backups and object-storage protection.
- [ ] Complete and document one restore exercise.
- [ ] Resolve or explicitly accept critical and high security findings.
- [x] Restore the Release 1 Web session policy across Backend, Customer Web, and Admin Web, with focused default-expiry/rotation tests and passing builds.
- [ ] Close every `CRITICAL PARTIAL` and `CRITICAL SECURITY` item in Slice 8A before beta.
- [ ] Add contract tests covering Mobile authentication, cart/checkout headers and endpoint, prepaid redirect, service booking, token refresh, and chat authorization.
- [x] Complete the focused Release 1 Ferio design-language review for shared Admin navigation/live metrics, Admin catalog/chat/delivery-map/order/payment/shipping/return/refund/reconciliation/settlement/warranty operations, Customer Header/Footer, global focus/reduced-motion behavior, core Customer checkout, Customer account/profile/address management, Customer warranty submission/history, and Customer product detail. These scoped surfaces now use the text-first, flat, grayscale, hairline, semantic-color-only language with truthful data, visible focus behavior, and aligned empty/loading/failure states. The broader all-retained-screen audit and manual accessibility/device validation remain tracked separately.
- [ ] Run internal alpha with a real catalog subset.
- [ ] Run controlled beta with one warehouse, one courier, COD, and the selected prepaid policy.
- [ ] Pass every Release 1 exit criterion in PRD section 26.1.

## 5. Release 2 — Retain Customers

These items correspond to the CRM and marketing areas in the visual plan. They must not displace Release 1 operational reliability.

### Customer 360 and identity

- [ ] **Deferred to Release 2:** Unified customer timeline and profile (`FR-CRM-001`–`FR-CRM-008`).
- [ ] **Deferred to Release 2:** Reviewed duplicate-profile merge and identity links.
- [ ] **Deferred to Release 2:** Delivered, cancelled, returned, spend, source, and risk indicators.
- [ ] **Deferred to Release 2:** Customer context for support calls and messages.
- [ ] **Deferred to Release 2:** Customer lifetime contribution and cohort views.

### Consent and communication control

- [ ] **Deferred to Release 2:** Channel-specific consent evidence (`FR-CON-001`–`FR-CON-008`).
- [ ] **Deferred to Release 2:** Revocation, suppression, frequency caps, and quiet hours.
- [ ] **Deferred to Release 2:** Global marketing kill switch.
- [ ] **Deferred to Release 2:** Explainable message eligibility and send history.

### Segments, campaigns, and automations

- [ ] **Deferred to Release 2:** Deterministic segments and previews (`FR-MKT-001`–`FR-MKT-012`).
- [ ] **Deferred to Release 2:** WhatsApp-first campaign execution with controlled fallback.
- [ ] **Deferred to Release 2:** Abandoned-cart automation.
- [ ] **Deferred to Release 2:** Restock and price-drop automation.
- [ ] **Deferred to Release 2:** Post-purchase, repeat-purchase, and win-back automation.
- [ ] **Deferred to Release 2:** Meta Lead Ads, Pixel/CAPI, and audience synchronization.
- [ ] **Deferred to Release 2:** Campaign reporting through delivered, returned, and contribution outcomes.
- [ ] **Deferred to Release 2:** Customer wishlist and reviewed product feedback workflows if approved.
- [ ] Pass every Release 2 exit criterion in PRD section 26.2.

## 6. Release 3 — Optimize and Scale

These visual-plan ideas are candidates, not commitments. Each requires separate approval and a measured trigger.

- [ ] **Deferred to Release 3:** Dedicated search infrastructure.
- [ ] **Deferred to Release 3:** Personalized recommendations.
- [ ] **Deferred to Release 3:** Advanced COD/fraud risk scoring.
- [ ] **Deferred to Release 3:** AI-assisted product descriptions.
- [ ] **Deferred to Release 3:** AI-assisted SEO generation.
- [ ] **Deferred to Release 3:** Review summarization and image moderation.
- [ ] **Deferred to Release 3:** Customer support chatbot and translation assistance.
- [ ] **Deferred to Release 3:** Image background removal.
- [ ] **Deferred to Release 3:** Automatic category and duplicate-product detection.
- [ ] **Deferred to Release 3:** Analytics warehouse.
- [ ] **Deferred to Release 3:** Predictive or dynamic courier optimization beyond the implemented deterministic provider scorecard.
- [ ] **Deferred to Release 3:** Additional warehouses or extracted services.

## 7. Product-Owner Decision Checklist

These decisions must be completed before their dependent slices can be finalized.

- [ ] **Blocked:** Approve exact Release 1 categories and variant structure — needed for Slice 1.
- [ ] **PARTIAL:** SSLCOMMERZ and aamarPay are implemented; approve which provider is enabled at initial launch and whether the other is failover — needed for Slice 5.
- [ ] **PARTIAL:** Six courier candidates are implemented; approve the primary launch courier, service-area, pricing, callback/polling, and failover rules — needed for Slice 6.
- [ ] **Blocked:** Approve COD verification method and thresholds — needed for Slice 4.
- [ ] **Blocked:** Approve stock reservation timing for COD and prepaid orders — needed for Slices 3–5.
- [ ] **Blocked:** Approve return windows and category exceptions — needed for Slice 7.
- [ ] **Blocked:** Approve delivery-fee matrix and free-delivery rules — needed for Slice 3.
- [ ] **Blocked:** Approve product-cost source and contribution allocation — needed for Slice 8.
- [ ] **Blocked:** Approve initial staff roles and approval thresholds — needed across Admin Web.
- [ ] **Blocked:** Approve transactional channel priority and fallback — needed for Slice 6.
- [ ] **Blocked:** Approve Bangla/English customer-content strategy — needed before launch review.
- [ ] **Blocked:** Approve retention and deletion periods — needed before launch review.
- [ ] **Blocked:** Select hosting providers and recovery objectives — needed for Slice 9.
- [x] Customer accounts are included in Release 1 alongside secure guest tracking.
- [ ] **Blocked:** Approve Mobile App distribution accounts, privacy disclosures, release ownership, and Android/iOS launch sequence.

Approved answers should be recorded in a separate decision log and linked from the affected checklist item.

## 8. Delivery Order and Dependency Schedule

This is a dependency sequence, not a calendar promise. Dates should be assigned only after Slice 1 domain decisions and provider availability are confirmed.

| Order | Delivery slice | Depends on | Completion gate |
| --- | --- | --- | --- |
| 0 | Remaining Release 0 foundation | Environment availability | Full-stack auth smoke test and commerce conventions documented |
| 1 | Catalog, products, variants, inventory | Category/variant decision | Admin CRUD and stock ledger work with real APIs |
| 2 | Storefront discovery and product detail | Slice 1 | Customer Web contains no production-path catalog mocks |
| 3 | Customer, address, cart, checkout | Slices 1–2; fee/reservation decisions | Server-calculated guest checkout is valid and persistent |
| 4 | Orders and COD operations | Slice 3; COD policy | Idempotent COD order moves through confirmation safely |
| 5 | Prepaid payments | Slice 4; provider decision/access | Sandbox payment lifecycle passes replay and retry tests |
| 6 | Fulfillment, courier, tracking, notifications | Slice 4; courier/channel decisions | One courier lifecycle and secure tracking work end to end |
| 7 | Returns, refunds, RTO, reconciliation | Slices 5–6; return policy | Post-purchase records and seeded inconsistencies are traceable |
| 8 | Reports, settings, audit | Slices 1–7; cost-policy decisions | Delivered-outcome reports and sensitive audit coverage reconcile |
| 8A | Omnichannel and operational extensions | Stable shared contracts and authorization | Mobile parity, private chat, pickup/delivery operations, and extension workflows pass security and contract tests |
| 9 | Hardening, alpha, beta, launch | All Release 1 slices, including 8A critical items | Every PRD Release 1 exit criterion passes |
| 10 | Release 2 CRM and retention | Stable Release 1 data and consent policy | Every PRD Release 2 exit criterion passes |
| 11 | Release 3 optimization candidates | Measured trigger and separate approval | Approved experiment proves value and safety |

## 9. Next Work Session

Immediate priority order:

1. Rotate the exposed CarryBee secret and verify replacement deployment.
2. Enforce token-derived socket roles, private chat history, participant authorization, and restricted origins.
3. Run cross-surface contract and device E2E tests for corrected Mobile authentication, cart/checkout, service booking, payment, and chat paths.
4. Add a verified Mobile payment-return deep link after provider callback configuration is approved.
5. Select and prove one prepaid provider and one courier in sandbox, then continue Release 1 hardening.

- [ ] Resolve or document assumptions for category and variant structure.
- [x] Inspect existing Prisma models for reusable catalog and inventory foundations.
- [ ] **PARTIAL:** Define Slice 1 entities, state rules, API contracts, and acceptance tests; integration cases remain.
- [x] Implement Slice 1 backend schema and initial services first.
- [x] Connect initial Admin Web category and product flows to real APIs.
- [x] Connect Customer Web catalog reads after admin write workflows are stable.
- [x] Update this checklist and create the next progress checkpoint after validation.
- [x] Apply the full catalog-through-reconciliation migration chain to a disposable PostgreSQL database.
- [ ] **PARTIAL:** Add database integration and concurrent inventory tests; reconciliation persistence, scan idempotency, finite-stock reservation contention, insufficient-stock rollback, reservation release, manual adjustment contention, cancellation-versus-adjustment convergence, auto-confirm reservation replay, courier settlement contention, and provider report import replay now run against PostgreSQL, while provider-native retrieval and broader catalog cases remain.
- [x] Add a dedicated scheduled BullMQ reconciliation worker with deterministic scan idempotency and retry/backoff.
- [x] Preserve failed reconciliation runs in PostgreSQL outside rolled-back scan transactions.
- [x] Expose queue availability, job counts, scheduler timing, durable recent runs, and failed-run retry controls.
- [x] Prove isolated BullMQ scheduler creation, first-job delivery, retry/backoff, completion, next delayed execution, and operator retry against Redis.
- [x] Add safe reconciliation operations metrics and exclude idempotency hashes from Admin health responses.
- [x] Prove concurrent COD confirmation reserves finite stock once and insufficient stock rolls back all workflow evidence.
- [x] Prove cancellation releases active stock once and concurrent manual decrements cannot create stale stock or duplicate ledger entries.
- [x] Prove concurrent COD placement creates one order, customer/address outcome, snapshot set, placement audit, and deduplicated placed message.
- [x] Prove cancellation racing manual adjustment converges to a cancelled order, released reservation, valid stock balance, and matching ledger evidence.
- [x] Prove auto-confirm COD placement immediately reserves stock once, deduplicates placed/confirmed messages, and leaves insufficient-stock carts untouched.
- [x] Prove concurrent courier settlement replay creates one batch, item set, audit record, and payment transition while overlapping batches cannot claim the same COD collection twice.
- [x] Persist normalized courier settlement reports and immutable rows, quarantine mixed exceptions without partial posting, and prove replay, row deduplication, and overlapping imports against PostgreSQL.
- [x] Connect Admin Web to submit normalized settlement rows, review immutable import history, and inspect unmatched, ineligible, duplicate, and already-settled exceptions.
- [x] Allow one corrected report to supersede a quarantined import without editing source evidence, atomically transfer row claims, audit resolution, and reject concurrent correction contenders.
- [x] Add a quoted-field-safe canonical settlement CSV preflight with strict size, row, header, encoding, identity, and BDT amount validation plus Admin diagnostics and ready-only row population.
- [x] Re-run CSV preflight during import, bind file and normalized-row checksums plus parser version to immutable evidence, exclude full file content from stored JSON, and reject post-preview drift before financial effects.
- [x] Generate a versioned canonical CSV template from the backend parser contract, expose an Admin download action with BDT guidance, and live-smoke the proxy session gate returning a clean unauthenticated 401.
- [x] Prove the authenticated canonical CSV success path through the built Admin proxy and backend against disposable PostgreSQL and Redis, including login cookies, template, preflight, import, immutable history, idempotent replay, paid-order transition, settled COD evidence, parser checksums, and audit records.
- [x] Prove Pathao and Steadfast callback authentication, rejected-attempt isolation, concurrent replay deduplication, failed-attempt recovery, delivery effects, and out-of-order retention against disposable PostgreSQL, with retry evidence exposed in Admin Web.
- [x] Add configurable BullMQ callback sweeps, deterministic bounded retry jobs, stale-lease recovery, queue health, audited operator retry controls, and isolated Redis runtime proof without regressing reconciliation jobs.
- [x] Add provider-neutral courier polling contracts, durable poll/evidence records, normalized event reuse, bounded outage backoff, terminal stop rules, queue health, audited Admin controls, and fake-provider PostgreSQL/Redis proofs without inventing Pathao or Steadfast payload fields.
- [x] Add disabled-by-default transactional routing policy, immutable route snapshots, append-only channel attempts, definitive-failure fallback, uncertain-outcome duplicate protection, BullMQ health/recovery controls, and restrained Admin evidence without inventing provider APIs.
- [x] Add prepaid checkout selection, pre-redirect stock reservation, provider-neutral attempts/callbacks, SSLCommerz and aamarPay hosted adapters, server-side outcome verification, atomic paid-order confirmation, and an Admin payment ledger.
- [x] Refactor payment providers behind an abstract gateway and registry, add durable expired-attempt recovery with reservation release, secure same-order customer retry, Admin queue health/manual sweep, and isolated Redis scheduler/retry proof.
- [x] Add guarded category deletion, checkout cart quantity/variant editing, optional persisted customer notes, continue-shopping navigation, and configured checkout support contacts.
- [x] Add second-hand product disclosure across Admin, storefront, cart, checkout, and order snapshots, plus evidence-rich inventory adjustment controls.
- [x] Add account-authenticated YouTube review submission, moderation, featured approved embeds, and product review banner management.
- [x] Add category-scoped service offerings, lead-time validated booking requests, immutable snapshots, and guarded Admin transitions.
- [x] Add authenticated warranty claims for phone-verified delivered order items, Cloudinary image evidence, duplicate-active-claim protection, immutable snapshots, and guarded repair/brand/rejection history.
- [x] Add consented real-purchase social proof, a four-second global popup, paginated public history, and audited Admin visibility/exclusion controls without manual or fake activity creation.
- [x] Add catalog-backed Admin product search for purchase-activity exclusions so operators do not need to copy internal IDs.
- [x] Add real-Prisma purchase-activity integration scenarios for disabled surfaces, consent/status/age eligibility, exclusions, order-level `+N` aggregation, Bengali masking, locality precedence, and pagination.
- [x] Apply the full migration chain to disposable PostgreSQL and test a seeded reconciliation inconsistency plus concurrent scans.
- [ ] Connect managed object storage for product media.
- [x] Implement persistent guest cart and server-side cart revalidation.
- [x] Model customer identity, reusable Bangladesh addresses, and immutable order-address snapshots.
- [x] Replace the Admin Customers placeholder with searchable customer operations profiles, delivered-order metrics, explainable attention indicators, and recent order history.
- [x] Add Customer Web account order history with explicit order ownership verification, saved addresses, product lines, lifecycle/payment/tracking context, and warranty navigation.
- [x] Complete Customer Web session lifecycle for account, review, and warranty actions with server-only token handling, transparent access refresh, and visible sign-out.
- [x] Add configurable delivery rules and server-calculated checkout preview.
- [x] Add and database-prove idempotent COD order conversion, immutable item/address snapshots, and guarded confirmation-time reservation operations.

## 10. Checklist Maintenance

After every completed slice:

1. Change only validated items from `[ ]` to `[x]`.
2. Add validation evidence to the latest progress document.
3. Record deferred work rather than silently dropping it.
4. Add newly discovered dependencies to the schedule.
5. Recheck the PRD exit criteria before beginning the next release.
6. Keep AI and scaling candidates deferred until their stated trigger exists.
