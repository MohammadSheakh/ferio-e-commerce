# Ferio Commerce SaaS Platform — Product Requirements Document

**Document status:** Consolidated living baseline for product, design, engineering, SaaS tenancy, and shipped post-v1.1 functionality

**Version:** 2.1 — Multi-Tenant SaaS + Shipped Feature Baseline

**Date:** August 24, 2026

**Product:** Ferio

**Initial market:** Bangladesh

**Operating model:** Multi-tenant Commerce SaaS. Each subscribed business operates an independent branded storefront and back office. Each tenant begins with one warehouse unless its plan enables more.

**Primary applications:** Tenant Storefront Web, Tenant Admin Web, Customer Mobile App, Rider Web Portal, Ferio Platform Admin, NestJS Backend, and background workers

**Primary language:** Bangla and English, with Banglish-compatible customer data and messaging

---

## 1. Document Purpose

This document defines the product requirements for Ferio, a Bangladesh-focused multi-tenant Commerce SaaS platform. Ferio enables independent businesses to subscribe, receive an isolated commerce workspace with its own branded storefront/domain and operational data, and run catalog, inventory, orders, payments, fulfillment, CRM, marketing, support, reporting, and integrations through the shared Ferio platform.

The PRD translates the existing business plan, marketing strategy, architecture diagrams, sequence diagrams, practical architecture review, design language, and current Next.js prototypes into one implementation-ready product baseline.

This document is the source of truth for:

- product scope and release boundaries;
- customer and staff workflows;
- business rules and state transitions;
- functional and non-functional requirements;
- data, analytics, consent, and integration requirements;
- acceptance criteria and launch gates;
- explicit exclusions that prevent premature overengineering.

The future-state architecture diagrams remain useful directional references. They are not an instruction to implement every depicted service or technology in the first release.

---

## 2. Executive Summary

Ferio will help many independent commerce businesses sell reliably while Ferio operates as the SaaS provider. Every subscribed business receives an isolated store, administration workspace, configuration, staff access, integrations, and commerce data. Ferio itself manages tenant lifecycle, plans, subscriptions, domains, provisioning, platform billing, usage, support, tenant database operations, and platform-wide security.

The product consists of two responsive web applications and one Expo customer application sharing one NestJS backend:

1. **Customer Web** — discovery, product browsing, cart, checkout, payment, order tracking, and post-purchase actions.
2. **Admin Web** — catalog, inventory, orders, customers, CRM, shipping, returns, marketing, reconciliation, reports, settings, and audit history.
3. **Customer Mobile App** — Expo-based access to the same customer identity, commerce, service, tracking, and support capabilities through shared backend contracts.

The platform's central business loop is:

```text
Rented acquisition channel
        ↓
Ferio Web, Mobile App, or lead capture
        ↓
First-party customer identity and consent
        ↓
Reliable order and fulfillment operation
        ↓
Delivered-order economics
        ↓
Rule-based, consent-aware retention
        ↓
Repeat purchase
```

Ferio will launch as a **modular monolith**, not a microservice platform. Release 1 prioritizes reliable selling and operations. Release 2 adds first-party CRM and retention. Release 3 adds optimization capabilities only after sufficient usage and clean data justify them.

---

## 3. Product Vision

### 3.1 Vision statement

Build the most operationally reliable Bangladesh-first Commerce SaaS platform for independent businesses, combining strong tenant isolation, branded storefronts, subscription-based access, and Ferio’s existing high-integrity commerce operations.

### 3.2 Product promise

Ferio enables a business to:

- sell through a fast, trustworthy storefront;
- process COD and prepaid orders without losing operational control;
- maintain accurate product, stock, order, payment, delivery, and return records;
- understand each customer through a unified first-party profile;
- retain customers through consent-based WhatsApp, SMS, email, and later push messaging;
- measure profitability using delivered orders, returns, RTO, discounts, fulfillment, and acquisition costs;
- evolve without adopting infrastructure before the business needs it.

### 3.3 Strategic principle

> Acquire on rented platforms, identify on Ferio, store in the CRM, serve through the commerce system, and retain through consent-based multichannel automation.

### 3.4 Product positioning

Ferio is a **multi-tenant Commerce SaaS platform**. Each business operates its own storefront and back office. It is not initially a multi-vendor marketplace where multiple sellers transact in one shared storefront, nor a full ERP, ad-management replacement, warehouse management suite, or AI platform.

---

## 4. Problem Definition

### 4.1 Business problems

Bangladesh online sellers commonly face:

- repeated dependence on paid social acquisition;
- customer identity and history trapped in external channels or spreadsheets;
- poor visibility from placed order to confirmed, shipped, delivered, returned, or RTO outcome;
- COD cancellation and fake-order risk;
- disconnected courier, payment, customer support, and marketing workflows;
- inaccurate stock and inconsistent product information;
- profitability reports based on revenue or placed-order ROAS instead of delivered contribution;
- manual customer follow-up with no consent, suppression, or frequency control;
- limited ability to generate repeat purchases from existing customers.

### 4.2 Customer problems

Customers need:

- clear product information, prices, variants, and availability;
- a simple mobile checkout suitable for Bangladesh addresses;
- trustworthy COD and local payment options;
- timely confirmation and delivery updates;
- a way to track orders without contacting support;
- predictable return, replacement, and refund handling;
- control over promotional communication.

### 4.3 Staff problems

Owners and staff need:

- one operational view of products, stock, orders, customers, and delivery;
- clear queues for orders needing action;
- controlled order status changes;
- reconciliation between internal records and payment/courier outcomes;
- customer context before calling or messaging;
- reports that distinguish revenue from real contribution;
- permission boundaries and auditability as the team grows.

---

## 5. Goals and Success Criteria

### 5.1 Product goals

| ID | Goal | Target outcome |
|---|---|---|
| G-01 | Sell reliably | Customers can discover, order, pay, and track without manual workaround |
| G-02 | Operate accurately | Order, payment, stock, shipment, return, and refund records stay consistent |
| G-03 | Handle Bangladesh COD well | Verification, delivery, RTO, and courier status are first-class workflows |
| G-04 | Own customer relationships | Identity, consent, source, purchase history, and engagement remain in Ferio |
| G-05 | Improve lifetime economics | Repeat purchases become cheaper than first purchases and are measurable |
| G-06 | Protect execution speed | Architecture remains simple enough for a small team to deliver and operate |
| G-07 | Isolate tenants | One tenant must never read, mutate, search, export, or receive another tenant's operational data |
| G-08 | Monetize software | Businesses can subscribe to plans, receive entitlements, upgrade/downgrade, and retain data through billing lifecycle changes |
| G-09 | Provision reliably | A subscribed business can move to a working tenant domain and database through an observable idempotent workflow |
| G-10 | Brand independently | Each tenant can operate under its own store identity, Ferio subdomain, and later a verified custom domain |
| G-11 | Operate the platform | Ferio staff can manage subscriptions, provisioning, migrations, usage, support, and platform security without casual tenant-data access |

### 5.2 Release 1 success metrics

The baseline must be measured after stable production traffic exists. Initial targets are product targets, not guaranteed business outcomes.

| Metric | Definition | Initial target |
|---|---|---|
| Storefront availability | Successful customer requests / total valid requests | ≥ 99.5% monthly |
| Checkout completion | Placed orders / valid checkout starts | Baseline established within 30 days |
| Order record integrity | Orders with complete items, totals, customer, address, and status history | 100% |
| Inventory integrity | Confirmed orders with traceable reservation or deduction | 100% |
| Duplicate order rate | Duplicate orders caused by retries / placed orders | < 0.1% |
| Notification isolation | Orders failed because a notification failed | 0 |
| Courier event traceability | Courier updates stored with raw and normalized status | 100% |
| Admin audit coverage | Sensitive mutations with actor and timestamp | 100% |
| Delivered-order reporting | Orders attributable through delivered/cancelled/returned outcome | ≥ 95% |

### 5.3 Release 2 success metrics

| Metric | Definition | Target direction |
|---|---|---|
| Identified customer rate | Orders linked to a resolved customer profile | Increase |
| Consent evidence rate | Marketed contacts with valid consent evidence | 100% |
| Repeat purchase rate | Customers with 2+ delivered orders / customers with delivered orders | Increase |
| Retention conversion | Attributed delivered orders / eligible campaign recipients | Baseline then improve |
| Message complaint rate | Opt-outs, blocks, or complaints / delivered messages | Remain below channel threshold |
| Delivered-order CAC | Acquisition spend / delivered first orders | Decrease or remain controlled |
| Return-adjusted contribution | Net contribution after cancellations, returns, and RTO | Increase |

### 5.4 Guardrail metrics

- COD cancellation rate;
- RTO rate;
- return and replacement rate;
- payment failure rate;
- oversell incidents;
- order processing SLA breaches;
- promotional opt-out and complaint rates;
- support contacts per order;
- refund aging;
- courier settlement variance.

---

## 6. Non-Goals

The following are explicitly outside Release 1 and should not influence its architecture unless a foundational requirement is inexpensive and proven:

- multi-vendor marketplace inside one shared storefront; Ferio SaaS tenants are independent businesses, not marketplace sellers;
- marketplace seller onboarding, KYC, commissions, and seller settlements between multiple merchants in one checkout;
- multiple independently deployed microservices;
- Kubernetes;
- Kafka, NATS, or enterprise event streaming;
- MongoDB in addition to PostgreSQL;
- ClickHouse or a dedicated analytics warehouse;
- complete ERP accounting, payroll, tax, fixed assets, or general ledger;
- custom courier/rider application for third-party delivery partners;
- a separate delivery-partner application for third-party couriers; the customer Expo application is now an approved product surface;
- full Meta Ads Manager replacement;
- full email service provider replacement;
- machine-learning recommendations, churn prediction, or autonomous campaign decisions;
- complex event sourcing;
- advanced multi-touch attribution;
- multi-country, multi-currency, or multi-language operation beyond Bangla/English presentation needs;
- multi-warehouse routing until operations require it.

Multi-tenant SaaS is now approved product scope. A future multi-vendor marketplace remains separate and would still require seller offers, shared-cart/checkout ownership, commissions, settlements, disputes, stock ownership, and marketplace-specific returns.

---

## 7. Product Principles

### 7.1 Business principles[OK]

1. Delivered orders matter more than placed orders.
2. Customer lifetime contribution matters more than first-order revenue.
3. CRM improves unit economics but cannot rescue structurally unprofitable products.
4. Phone number is the practical primary customer identity in Bangladesh, not an infallible unique person identifier.
5. WhatsApp is the primary retention channel, not the customer database.
6. Ferio owns consent, customer history, segments, and rules; external channels deliver messages.
7. Marketing and notification failures must never block checkout or fulfillment.

### 7.2 Product principles[OK]

1. Mobile-first customer experience.
2. Clear states and next actions over decorative dashboards.
3. Self-service purchasing by default; assisted sales only where useful.
4. Operational exceptions must be visible, owned, and recoverable.
5. Every external callback must be verified, idempotent, and retryable.
6. Payment status, order status, fulfillment status, shipment status, and return status remain separate.[OK[OK][OK][OK][OK][OK][OK][OK][OK]]
7. A smaller reliable release is more valuable than an incomplete enterprise platform.

### 7.3 Engineering principles

1. Begin with a NestJS modular monolith.
2. PostgreSQL is the primary source of truth.
3. Use asynchronous jobs for non-critical background work.
4. Add infrastructure only when measured constraints justify it.
5. Integrate third-party systems instead of rebuilding all their capabilities.
6. Maintain domain boundaries so modules can be extracted later if team or scaling needs require it.
7. Tenant context is infrastructure authority and must be resolved server-side; clients must never choose a database directly.
8. Tenant operational data uses the approved database-per-tenant model.
9. Platform/control-plane data and tenant commerce data have separate schemas and ownership.
10. Subscription entitlement checks are centralized and must not be scattered as ad hoc plan-name conditionals.
11. Database-per-tenant operations require bounded connection management, versioned tenant migrations, backups, restore procedures, and staged rollout controls.
12. Every shipped commerce capability—including carts, riders, live maps, wallet, warranty, chat, services, hero content, and operational health—must be classified and enforced as tenant-scoped, platform-scoped, or intentionally shared; global-by-accident behavior is prohibited.

---

## 8. Users and Personas

### 8.1 First-time customer

**Context:** Arrives from Facebook, Instagram, TikTok, Google, referral, or offline QR. Mostly uses a mobile device and may prefer COD.

**Needs:** Trust, clear product details, easy checkout, accurate delivery expectations, and order confirmation.

### 8.2 Repeat customer

**Context:** Has at least one delivered order and may return through WhatsApp, SMS, email, direct traffic, or referral.

**Needs:** Faster checkout, relevant products, order history, dependable service, and controlled communication.

### 8.3 Owner / administrator

**Needs:** Revenue and contribution visibility, operational queues, permissions, settings, campaign performance, and auditability.

### 8.4 Order operations agent

**Needs:** Confirm COD orders, verify addresses, identify risk, update statuses, create shipments, resolve exceptions, and contact customers.

### 8.5 Catalog and inventory operator

**Needs:** Create products and variants, manage media and prices, publish products, update stock, and investigate stock movements.

### 8.6 Warehouse operator

**Needs:** View fulfillment queue, print or read pick lists, pick, pack, quality-check, label, and hand over parcels.

### 8.7 CRM and marketing operator

**Needs:** View Customer 360, manage consent, create deterministic segments, run approved campaigns, and measure delivered-order outcomes.

### 8.8 Customer support agent

**Needs:** Search customers and orders, see contact and status history, create return/support cases, and communicate without losing context.

### 8.9 Finance / reconciliation operator

**Needs:** Review payments, refunds, COD collections, courier settlements, fees, variances, and aged unresolved records.

Initially, these personas may be performed by one person. Permissions and views must still reflect the responsibilities so the product can support team growth.

### 8.10 Ferio platform administrator

**Context:** Operates Ferio itself rather than any tenant's store.

**Needs:** Create/suspend organizations, manage plans and subscriptions, inspect provisioning and migration status, handle platform billing, domains, feature flags, support access, security events, tenant health, and platform audit.

### 8.11 Tenant owner / SaaS account owner

**Context:** Owns or controls a subscribing business and is responsible for the SaaS relationship.

**Needs:** Choose a plan, manage subscription/billing, invite staff, configure store identity, connect providers, manage domains, see usage limits, export business data, and request cancellation/offboarding.

### 8.12 Tenant staff member

**Context:** Works inside one or more subscribed businesses with explicit membership and permissions.

**Needs:** One identity with safe switching between authorized workspaces while all commerce access remains tenant-scoped.

### 8.13 Ferio support operator

**Context:** Helps tenant administrators resolve platform problems.

**Needs:** Metadata-first support, audited time-bound support access where explicitly authorized, tenant health/provisioning context, and no default unrestricted access to tenant customer/order data.

---

## 9. Product Surfaces

### 9.1 Tenant Storefront Web

Release 1 routes and capabilities:

- Home;
- product listing and categories;
- search and filters;
- product detail;
- cart;
- checkout;
- payment redirect/result where applicable;
- order confirmation;
- public order tracking using secure verification;
- policy and support pages.

Later additions:

- customer account and order history;
- wishlist;
- reviews;
- saved addresses;
- personalized recommendations;
- PWA capabilities.

### 9.2 Tenant Admin Web

Release 1 modules:

- Login and access;
- Overview;
- Products and categories;
- Inventory;
- Orders;
- Fulfillment and shipping;
- Customers;
- Payments and refunds;
- Returns and RTO;
- Reports;
- Settings;
- Audit log.

Release 2 modules:

- Customer 360;
- Leads and CRM pipeline where the business uses assisted selling;
- Consent and suppression;
- Segments;
- Campaigns;
- Automation;
- WhatsApp, SMS, and email delivery reports;
- Retention and contribution analytics.

### 9.3 Backend and Tenant Runtime

One NestJS codebase with bounded modules:

```text
Platform Organizations
Plans and Subscriptions
Domains
Provisioning
Tenant Database Registry
Tenant Migration Orchestration
Tenant Resolution and Context
Auth
Memberships and RBAC
Catalog
Search
Customers and CRM
Consent
Cart
Checkout
Pricing and Promotions
Inventory
Orders
Payments
Shipping
Fulfillment
Returns and Refunds
Notifications
Marketing
Analytics and Reporting
Settings
Audit
Integrations
Jobs and Reconciliation
```

These are modules, not separately deployable services in the initial product. Control-plane modules use the platform database; tenant commerce modules execute against the resolved tenant database. No request may trust a client-supplied database connection target.

### 9.4 Ferio Platform Admin

Platform Admin is a separate privileged surface for Ferio operators.

Release 1 SaaS capabilities:

- organization/tenant directory;
- tenant status and subscription state;
- plans and entitlements;
- tenant subdomain/custom-domain management;
- provisioning jobs and failures;
- tenant database registry and schema version;
- staged tenant migration operations;
- platform billing and subscription events;
- platform feature flags;
- platform audit/security events;
- tenant usage and plan-limit visibility;
- support-access requests and audit;
- backup/restore status metadata.

Platform Admin must not reuse tenant-admin authorization or silently bypass tenant isolation.

### 9.5 Rider Web Portal

A mobile-first browser portal for a tenant's own first-party delivery workforce. It is not a third-party courier application and does not replace courier adapters.

Tenant-aware routes/capabilities include:

- public tenant rider application/join flow;
- approved-rider sign-in;
- rider profile and duty state;
- tenant-assigned orders only;
- picked-up, in-transit, out-for-delivery, delivered, and failed delivery actions;
- GPS waypoint/current-position capture where permitted;
- tenant Admin live-map visibility;
- audited COD delivery evidence while cash remains pending authorized staff confirmation.

Rider identity and delivery actions must resolve the tenant server-side. A rider must never be able to enumerate or act on another tenant's orders by changing IDs, hosts, tokens, or job payloads.

### 9.6 Customer Mobile App

The Expo 54 application is a supported Ferio customer surface, not a separate product. It must use the same backend domain rules and customer identity as Customer Web.

Required capabilities include:

- registration, verified sign-in, Google sign-in, logout, and recoverable sessions;
- catalog, search, product details, cart, checkout, COD, prepaid redirect/result, order history, and tracking;
- saved addresses, product requests, service booking, warranty entry points, and customer support chat;
- native-safe loading, empty, offline, error, retry, and deep-link behavior;
- no production fallback catalog, services, reviews, or Q&A that can be mistaken for server data.

Mobile completion requires contract-level parity with the backend. A rendered screen or local-only AsyncStorage flow is not sufficient evidence of completion.

---

## 10. Release Strategy

### 10.1 Release 0 — SaaS foundation and current-product migration

**Outcome:** Existing Ferio commerce becomes a tenant-aware reference implementation while preserving current commerce behavior. Control-plane and database-per-tenant foundations are production-capable before broad tenant onboarding.

Scope:

- introduce a platform/control-plane PostgreSQL database;
- introduce organization, tenant-domain, tenant-database, plan, entitlement, subscription, provisioning, platform billing, and platform-audit models;
- implement host-based tenant resolution and request-scoped tenant context;
- implement bounded tenant Prisma connection/client management rather than a new client per request;
- implement tenant database provisioning, migration, seed, health check, retry, and repair;
- implement a tenant migration orchestrator with staged rollout and concurrency limits;
- migrate the current Ferio business into the first tenant database;
- separate Platform Admin from Tenant Admin;
- establish centralized entitlement enforcement and usage measurement;
- define custom-domain verification/lifecycle contracts;

- replace static assumptions with typed API contracts;
- define environment and deployment structure;
- establish authentication and RBAC foundation;
- define database schema and migrations;
- establish logging, error handling, validation, and audit conventions;
- align both frontends with the Ferio design language;
- remove conflicting older visual direction such as serif-display typography, decorative motifs, gradients, or excessive rounding;
- define integration adapter interfaces and mock providers.

### 10.2 Release 1 — Commerce SaaS launch

**Outcome:** Multiple independent businesses can subscribe, receive isolated stores, and operate real orders end to end without cross-tenant data exposure.

Scope:

- organization signup/creation and subscription activation;
- deterministic tenant subdomain assignment;
- dedicated tenant database provisioning and baseline seeding;
- tenant owner membership and staff invitation;
- plan/entitlement gates and safe usage limits;
- tenant branding/store identity;
- tenant-aware storefront rendering by host;
- tenant-aware Admin Web and customer journeys;

- storefront, search, product detail, cart, and checkout;
- guest checkout with phone-first customer resolution;
- COD and at least one configurable prepaid payment integration or a production-ready payment adapter;
- authenticated customer wallets with reviewed recharge requests and wallet-funded checkout;
- product, variant, category, price, media, and publication management;
- one-warehouse stock management and reservation;
- order lifecycle and status history;
- COD verification workflow configurable by settings;
- fulfillment, shipment creation, courier integration, tracking, and RTO;
- basic customer profile and order history;
- transactional WhatsApp/SMS/email notifications;
- return, replacement, and refund case handling;
- operational, delivered-order, and contribution reporting;
- reconciliation jobs;
- security, audit, backup, monitoring, and launch operations.
- Customer Web and Mobile App account access, saved addresses, and order history;
- real-time customer support chat with authenticated staff access;
- product requests, product-linked YouTube review moderation, warranty claims, and category-scoped service booking;
- store pickup, outlets, pickup OTP handover, delivery-personnel operations, and live location where enabled;
- consented purchase-activity social proof and configurable public history;
- provider-neutral multi-courier routing while requiring at least one provider to pass launch verification.

### 10.3 Release 2 — Retain customers and deepen SaaS operations

**Outcome:** Each tenant owns its customer relationships and can run controlled retention workflows, while Ferio gains stronger subscription, usage, domain, support, and tenant-operations tooling.

Scope:

- Customer 360;
- identity resolution and merge review;
- channel-specific consent evidence;
- suppression lists, frequency caps, and quiet hours;
- deterministic customer segments;
- WhatsApp-first campaign execution with fallback policy;
- abandoned cart, restock, price-drop, post-purchase, repeat-purchase, and win-back automation;
- lead import and assisted-sales pipeline where needed;
- source and campaign attribution through delivered outcome;
- Meta Lead Ads, Pixel/CAPI, and audience sync integration;
- retention, cohort, RFM, and customer contribution reporting.

### 10.4 Release 3 — Optimize, scale, and support enterprise tenants

**Outcome:** Proven bottlenecks and repeatable growth workflows receive advanced tooling; tenant database operations, custom domains, staged migrations, higher availability, enterprise entitlements, and API/webhook capabilities mature.

Candidate scope, subject to data and business validation:

- dedicated search engine;
- richer workflow builder;
- recommendation models;
- AI-assisted copy, segmentation, support, and anomaly detection;
- advanced fraud or COD risk scoring;
- analytics warehouse;
- advanced courier optimization beyond the implemented deterministic provider scorecard;
- warehouse-optimized scanner interface;
- additional warehouse support;
- selective module extraction when deployment or team ownership requires it.

Release 3 items are not commitments until separately approved.

---

## 11. Core Customer Journeys [NEED TO READ PROPERLY]

### 11.1 Discover and browse

1. Customer arrives with source parameters where available.
2. Ferio stores first-party attribution using privacy-safe identifiers.
3. Customer browses categories, collections, search results, and product details.
4. Product pages show current price, available variants, stock messaging, delivery information, and return terms.
5. Customer adds a valid variant and quantity to cart.

### 11.2 Checkout and COD order

1. Customer reviews cart and starts checkout.
2. Customer enters name, Bangladeshi phone number, district/area, detailed address, and optional landmark.
3. Customer sees item, discount, delivery, and total breakdown before placing the order.
4. Customer selects COD.
5. Server revalidates price, product status, stock, coupon, and delivery fee.
6. Ferio creates one order using an idempotency key.
7. Order enters `PENDING_CONFIRMATION` when COD verification is required, otherwise `CONFIRMED`.
8. Transactional confirmation is queued after the order transaction commits.
9. Staff verifies the order using configured call, OTP, or confirmation rules.
10. Confirmed orders reserve stock and enter fulfillment.

### 11.3 Checkout and prepaid order

1. Customer completes the same server-side validation.
2. Ferio creates an order with separate `PENDING` order and payment states.
3. Ferio creates a payment attempt and redirects or presents provider UI.
4. Provider callback/webhook is verified and processed idempotently.
5. Successful payment sets payment status to `PAID` and confirms the order.
6. Failed or expired payment does not falsely confirm the order.
7. Stock reservation timing follows the configured payment policy and has an expiry.
8. Customer can safely retry payment without creating a duplicate order.

### 11.4 Fulfillment and shipping

1. Staff views confirmed orders ready for fulfillment.
2. Ferio verifies reservation and creates a pick list.
3. Warehouse operator picks the required SKUs and quantities.
4. Operator records shortages or substitutions as exceptions; silent changes are forbidden.
5. Items are packed and quality checked.
6. Ferio creates a shipment through the configured courier adapter.
7. AWB/tracking identifier and label are stored.
8. Parcel handover is recorded.
9. Courier webhook or polling updates normalized shipment states.
10. Customer receives non-blocking transactional status updates.

### 11.5 Delivery and completion

1. Courier reports delivered or COD-collected outcome.
2. Ferio records proof/reference when available and marks shipment `DELIVERED`.
3. Order becomes `DELIVERED`, not immediately `COMPLETED`.
4. The configurable return window starts.
5. If no return is initiated, a scheduled job marks the order `COMPLETED` after the window.
6. Completion triggers customer value, loyalty if enabled, and retention eligibility updates.

### 11.6 Return and refund

1. Customer or support creates a return request within policy.
2. Ferio evaluates eligibility without automatically approving every request.
3. Approved returns receive instructions or an RMA reference.
4. Returned item is received and inspected.
5. Inspection results in approve, partial approve, reject, replacement, or other configured resolution.
6. Inventory disposition is explicit: sellable, damaged, quarantined, or lost.
7. Refund is created against the original payment policy or approved alternative.
8. Order, return, refund, inventory, CRM, and analytics records update independently but consistently.

### 11.7 Repeat purchase

1. Customer becomes eligible based on delivery, consent, category, time, and suppression rules.
2. Marketing selects the best permitted channel.
3. Customer receives one relevant message, not simultaneous messages on every channel.
4. Link carries campaign attribution.
5. A resulting order is tracked through delivered, cancelled, returned, and contribution outcomes.

---

## 12. Functional Requirements

Priority definitions:

- **P0:** Required for the release to launch.
- **P1:** Important; may follow immediately after launch if a safe manual fallback exists.
- **P2:** Enhancement or later release.

### 12.1 Identity, authentication, and access

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-001 | P0 | Staff must authenticate before accessing Admin Web. |
| FR-AUTH-002 | P0 | The system must support roles and explicit permissions rather than UI-only hiding. |
| FR-AUTH-003 | P0 | Protected backend operations must enforce authorization server-side. |
| FR-AUTH-004 | P0 | Sessions or tokens must expire, support logout, and be revocable. |
| FR-AUTH-005 | P0 | Login attempts must be rate limited and security-relevant failures logged. |
| FR-AUTH-006 | P1 | Owners must be able to invite, deactivate, and reset access for staff. |
| FR-AUTH-007 | P1 | High-risk roles should support two-factor authentication. |
| FR-AUTH-008 | P0 | Guest customer checkout must not require account creation. |
| FR-AUTH-009 | P1 | Customer accounts must verify control of phone or email before exposing order history. |

Initial roles:

- Owner/Admin;
- Order Operations;
- Catalog/Inventory;
- Warehouse;
- CRM/Marketing;
- Support;
- Finance;
- Read-only Analyst.

### 12.2 Catalog and merchandising

| ID | Priority | Requirement |
|---|---|---|
| FR-CAT-001 | P0 | Admin must create, edit, archive, publish, and unpublish products. |
| FR-CAT-002 | P0 | Products must support variants with unique SKU and independent stock. |
| FR-CAT-003 | P0 | Products must support name, slug, description, category, brand, attributes, media, SEO metadata, status, and publication state. |
| FR-CAT-004 | P0 | Price must be stored in minor units and support regular and optional compare-at price. |
| FR-CAT-005 | P0 | Customer Web must never expose unpublished products through listing, search, or direct URL. |
| FR-CAT-006 | P0 | Admin must control product and media sort order. |
| FR-CAT-007 | P0 | Media upload must validate type and size and generate safe delivery URLs. |
| FR-CAT-008 | P1 | Admin should support collections, featured products, and scheduled publication. |
| FR-CAT-009 | P1 | Catalog changes affecting price or publication must be auditable. |
| FR-CAT-010 | P2 | Product feed export may support Meta Catalog or Google Merchant. |

### 12.3 Discovery and search

| ID | Priority | Requirement |
|---|---|---|
| FR-SRCH-001 | P0 | Customers must browse active categories and product listings. |
| FR-SRCH-002 | P0 | Customers must search product name, category, brand, and relevant keywords. |
| FR-SRCH-003 | P0 | Customers must filter by applicable category, price, availability, and variant attributes. |
| FR-SRCH-004 | P0 | Search results must exclude unpublished products and unavailable variants according to settings. |
| FR-SRCH-005 | P1 | Search must tolerate common casing and Bangla/English input differences where practical. |
| FR-SRCH-006 | P1 | No-results state must provide a clear recovery action. |
| FR-SRCH-007 | P2 | Dedicated search infrastructure must be introduced only after PostgreSQL search no longer meets relevance or latency goals. |

### 12.4 Cart

| ID | Priority | Requirement |
|---|---|---|
| FR-CART-001 | P0 | Customers must add, remove, and change quantities for valid product variants. |
| FR-CART-002 | P0 | Guest carts must persist across page navigation and reasonable browser restarts. |
| FR-CART-003 | P0 | Cart totals shown to the customer are estimates until server validation at checkout. |
| FR-CART-004 | P0 | Invalid, unpublished, repriced, or unavailable lines must be clearly identified before order placement. |
| FR-CART-005 | P1 | A guest cart should merge safely with an authenticated customer's cart. |
| FR-CART-006 | P1 | Abandoned-cart eligibility must require an identifiable customer and valid channel consent. |

### 12.5 Checkout, pricing, and promotions

| ID | Priority | Requirement |
|---|---|---|
| FR-CHK-001 | P0 | Checkout must collect name, normalized phone, district, area, detailed address, and optional landmark. |
| FR-CHK-002 | P0 | Server must recalculate items, prices, discounts, delivery fee, payment charge, and total. |
| FR-CHK-003 | P0 | Customer must see the final total and payment method before confirming. |
| FR-CHK-004 | P0 | Order creation must be idempotent. |
| FR-CHK-005 | P0 | Checkout must record source and campaign attribution when available. |
| FR-CHK-006 | P0 | Promotional consent must be optional and separate from transactional communication. |
| FR-CHK-007 | P0 | Required terms must be presented clearly without preselecting optional marketing consent. |
| FR-CHK-008 | P0 | Delivery fees must be configurable by supported geography or rule. |
| FR-CHK-009 | P1 | Coupons must support validity window, usage limits, minimum amount, eligibility, and deterministic calculation. |
| FR-CHK-010 | P1 | Checkout must support configurable free-delivery thresholds and campaigns. |

### 12.6 Customer and address data

| ID | Priority | Requirement |
|---|---|---|
| FR-CUST-001 | P0 | Every order must link to a customer profile or a customer record created during checkout. |
| FR-CUST-002 | P0 | Phone numbers must be normalized while preserving the original user input when needed for audit/support. |
| FR-CUST-003 | P0 | The same phone number must not automatically prove two records represent one person when conflict signals exist. |
| FR-CUST-004 | P0 | Customers may have multiple addresses with one snapshot copied onto each order. |
| FR-CUST-005 | P0 | Editing a customer address must not change historical order addresses. |
| FR-CUST-006 | P1 | Authorized staff may merge duplicate customer profiles using a reviewed and audited process. |
| FR-CUST-007 | P1 | Customer profile must show delivered, cancelled, returned, total spend, last purchase, source, and risk indicators. |
| FR-CUST-008 | P1 | Customers may request access, correction, suppression, or deletion subject to legal and transactional retention requirements. |

### 12.7 Inventory

| ID | Priority | Requirement |
|---|---|---|
| FR-INV-001 | P0 | Stock must be tracked by warehouse and product variant, initially for one warehouse. |
| FR-INV-002 | P0 | System must distinguish on-hand, reserved, available, damaged, and incoming quantities where applicable. |
| FR-INV-003 | P0 | Available stock must not become negative through normal operations. |
| FR-INV-004 | P0 | Every stock change must create an immutable movement record with reason and reference. |
| FR-INV-005 | P0 | Reservation creation, expiry, release, and deduction must follow documented order/payment rules. |
| FR-INV-006 | P0 | Concurrent checkout must not oversell the same remaining stock. |
| FR-INV-007 | P0 | Cancellation, expiry, failed payment, return disposition, and manual adjustment must update stock correctly. |
| FR-INV-008 | P1 | Admin must show low-stock items and discrepancies. |
| FR-INV-009 | P1 | Manual adjustments require a reason and appropriate permission. |
| FR-INV-010 | P1 | A reconciliation job must detect reservation and stock inconsistencies. |

### 12.8 Orders

| ID | Priority | Requirement |
|---|---|---|
| FR-ORD-001 | P0 | Every order must have a human-readable unique reference and immutable internal ID. |
| FR-ORD-002 | P0 | Order item snapshots must preserve product name, SKU, variant, unit price, discounts, tax if used, and quantity at purchase time. |
| FR-ORD-003 | P0 | Order status history must record old state, new state, actor, source, timestamp, and optional note. |
| FR-ORD-004 | P0 | Invalid transitions must be rejected server-side. |
| FR-ORD-005 | P0 | Admin must filter and search orders by reference, phone, customer, status, payment, courier, tracking, and date. |
| FR-ORD-006 | P0 | Admin order detail must show customer, address snapshot, items, totals, payment, reservation, fulfillment, shipment, communications, return, and audit history. |
| FR-ORD-007 | P0 | Cancellation must require a reason and release eligible reservations. |
| FR-ORD-008 | P0 | COD verification policy must be configurable and may consider order amount, customer history, geography, and risk flags. |
| FR-ORD-009 | P1 | Authorized staff may create a draft order for assisted sales and send a checkout/payment link. |
| FR-ORD-010 | P1 | Split or partial fulfillment is deferred unless explicitly enabled with complete status behavior. |

### 12.9 Payments

| ID | Priority | Requirement |
|---|---|---|
| FR-PAY-001 | P0 | Payment status must remain independent from order status. |
| FR-PAY-002 | P0 | System must support COD and a provider-neutral prepaid payment adapter. |
| FR-PAY-003 | P0 | Each payment attempt must have its own record and provider reference. |
| FR-PAY-004 | P0 | Payment callbacks/webhooks must verify authenticity and be idempotent. |
| FR-PAY-005 | P0 | Amount, currency, order, and expected provider state must be verified before marking payment successful. |
| FR-PAY-006 | P0 | Duplicate callbacks must not duplicate payments, confirmation, stock actions, or notifications. |
| FR-PAY-007 | P0 | Admin must see paid, unpaid, failed, expired, partially refunded, and refunded states. |
| FR-PAY-008 | P0 | Manual payment status changes require restricted permission, reason, and audit. |
| FR-PAY-009 | P1 | Reconciliation must compare internal payments against provider records or reports. |
| FR-PAY-010 | P1 | Refunds must reference payment, return/order reason, amount, method, provider result, and actor. |

### 12.9A Customer wallet

| ID | Priority | Requirement |
|---|---|---|
| FR-WAL-001 | P0 | Every authenticated customer must have at most one active BDT wallet, created lazily or during account provisioning. |
| FR-WAL-002 | P0 | Wallet balances and all wallet amounts must use integer minor units; clients must never submit or calculate an authoritative balance. |
| FR-WAL-003 | P0 | Customers must be able to submit recharge requests for bKash, Nagad, Rocket, or bank transfer with a provider transaction/reference and an idempotency key. |
| FR-WAL-004 | P0 | Recharge requests must remain pending until an authorized administrator verifies the external payment evidence and approves or rejects the request with a note. |
| FR-WAL-005 | P0 | Approval must atomically credit the wallet and append one immutable ledger entry; replay or concurrent review must not credit twice. |
| FR-WAL-006 | P0 | Authenticated customers may pay an eligible order from wallet balance, while COD, SSLCommerz, and aamarPay remain separate checkout choices. |
| FR-WAL-007 | P0 | Wallet order placement must atomically verify sufficient balance, debit once, reserve stock, and create the order; insufficient balance must create no order or partial debit. |
| FR-WAL-008 | P0 | Cancelling a wallet-paid order must credit the eligible refund exactly once and preserve order-linked debit and refund ledger entries. |
| FR-WAL-009 | P0 | Customers must see current balance, recharge status, and paginated ledger history; authorized Admin users must see and review pending recharge requests. |
| FR-WAL-010 | P1 | Direct provider-verified wallet recharge may replace manual review only through authenticated provider adapters, idempotent callbacks, amount/reference verification, and reconciliation evidence. |

### 12.10 Fulfillment, shipping, and courier

| ID | Priority | Requirement |
|---|---|---|
| FR-SHP-001 | P0 | Confirmed orders must enter a fulfillment queue. |
| FR-SHP-002 | P0 | Admin must support pick, pack, quality-check, ready-for-handover, and handed-over actions. |
| FR-SHP-003 | P0 | Shipment creation must use a courier adapter and store request, response, courier, AWB, tracking URL, and label reference. |
| FR-SHP-004 | P0 | Courier-specific statuses must map to normalized internal shipment statuses. |
| FR-SHP-005 | P0 | Raw courier event and normalized result must both be retained. |
| FR-SHP-006 | P0 | Courier callbacks must be authenticated where supported, idempotent, retryable, and observable. |
| FR-SHP-007 | P0 | Out-of-order courier events must not regress a shipment incorrectly. |
| FR-SHP-008 | P0 | Delivery, failed attempt, cancellation, and RTO must update order workflows according to explicit rules. |
| FR-SHP-009 | P1 | Courier polling must be available when webhooks are unavailable or incomplete. |
| FR-SHP-010 | P1 | Courier selection may be manual or rule-based using geography, rate, and availability; advanced optimization is deferred. |

### 12.11 Order tracking and notifications

| ID | Priority | Requirement |
|---|---|---|
| FR-NOT-001 | P0 | Customer must access order tracking using a secure order reference plus verification factor or signed link. |
| FR-NOT-002 | P0 | Transactional notifications must be queued after the business transaction commits. |
| FR-NOT-003 | P0 | Notification failure must not roll back or fail an order, payment, refund, or shipment. |
| FR-NOT-004 | P0 | Every message attempt must record channel, template, recipient, purpose, provider ID, status, and timestamps. |
| FR-NOT-005 | P0 | Transactional and promotional messages must have distinct purposes and consent rules. |
| FR-NOT-006 | P0 | Retry policy must avoid duplicate customer messages when provider outcome is uncertain. |
| FR-NOT-007 | P1 | Channel fallback must follow policy, not broadcast the same message to all channels. |
| FR-NOT-008 | P1 | Customer-facing status language must be normalized and understandable, not expose provider codes. |
| FR-NOT-009 | P0 | Authenticated customers must have a private in-app notification inbox with unread count, pagination, read state, and soft deletion scoped to the owning account. |
| FR-NOT-010 | P0 | In-app notifications must use deterministic deduplication keys so retries cannot create duplicate customer events. |
| FR-NOT-011 | P0 | CommerceMessage remains the outbound SMS/WhatsApp/email outbox and must not be treated as the customer in-app inbox. |
| FR-NOT-012 | P1 | Order, payment, wallet, warranty, service, and other actionable customer lifecycle events should link to the relevant authenticated screen when available. |

Required Release 1 transactional triggers:

- order placed;
- COD verification needed or completed;
- payment success or actionable failure;
- order confirmed;
- shipment created;
- picked up / in transit;
- out for delivery where supported;
- delivered;
- return request received;
- refund processed;
- order cancelled.

### 12.12 Returns, replacements, RTO, and refunds

| ID | Priority | Requirement |
|---|---|---|
| FR-RET-001 | P0 | Return window must be configurable by product/category policy where needed. |
| FR-RET-002 | P0 | Return request must capture order item, quantity, reason, description, evidence, requested resolution, and channel. |
| FR-RET-003 | P0 | System must distinguish customer return, replacement, cancellation, failed delivery, and RTO. |
| FR-RET-004 | P0 | Inspection must record received quantity, condition, decision, and inventory disposition. |
| FR-RET-005 | P0 | Refund status must be tracked independently from return status. |
| FR-RET-006 | P0 | Rejected or partial returns require a reason visible to authorized staff and suitable customer communication. |
| FR-RET-007 | P0 | RTO cost and reason must be included in operational and contribution reporting. |
| FR-RET-008 | P1 | Replacement must create traceable outbound fulfillment without losing linkage to the original order and return. |
| FR-RET-009 | P1 | Aged returns and refunds must appear in exception queues. |

### 12.13 Customer 360 and CRM — Release 2

| ID | Priority | Requirement |
|---|---|---|
| FR-CRM-001 | P0 | Customer 360 must unify identity, source, consent, orders, delivery outcomes, returns, value, behavior summary, and communications. |
| FR-CRM-002 | P0 | Phone remains the primary practical identity, with explicit identity links and merge history. |
| FR-CRM-003 | P0 | Profile must calculate total orders, delivered orders, cancellations, returns, revenue, contribution, AOV, last purchase, and COD success. |
| FR-CRM-004 | P0 | Staff must see customer source and first/last known campaign attribution. |
| FR-CRM-005 | P0 | CRM notes, tasks, lead stage changes, and contact attempts must be auditable. |
| FR-CRM-006 | P1 | Lead pipeline must support assignment, status, next action, interested product, and conversion to customer/order. |
| FR-CRM-007 | P1 | Deterministic risk indicators must be explainable and must not silently block legitimate customers. |
| FR-CRM-008 | P2 | Predictive scores require sufficient clean data, documented evaluation, and human override. |

### 12.14 Consent and communication preferences — Release 2

| ID | Priority | Requirement |
|---|---|---|
| FR-CON-001 | P0 | Consent must be recorded separately for WhatsApp, SMS, email, and push. |
| FR-CON-002 | P0 | Evidence must include status, timestamp, source, wording/version, purpose, and capture context. |
| FR-CON-003 | P0 | Revocation must take effect before the next promotional send. |
| FR-CON-004 | P0 | Suppression lists must override campaign inclusion. |
| FR-CON-005 | P0 | Transactional messaging must not be falsely classified as marketing to bypass consent rules. |
| FR-CON-006 | P0 | Campaign audience preview must exclude invalid, revoked, suppressed, over-frequency, and quiet-hour contacts. |
| FR-CON-007 | P1 | Customers should be able to manage preferences through a secure self-service link or support-assisted process. |
| FR-CON-008 | P1 | Consent policy must accommodate provider and applicable legal requirements without hard-coding policy text in business logic. |

### 12.15 Segments, campaigns, and automation — Release 2

| ID | Priority | Requirement |
|---|---|---|
| FR-MKT-001 | P0 | Segments must be deterministic, previewable, and based on approved customer/order/behavior fields. |
| FR-MKT-002 | P0 | Campaign must define purpose, audience, channel, template/content, schedule, attribution window, and owner. |
| FR-MKT-003 | P0 | Campaign send requires audience re-evaluation at execution time. |
| FR-MKT-004 | P0 | Frequency caps, quiet hours, suppression, consent, and duplicate prevention must apply to every promotional send. |
| FR-MKT-005 | P0 | Marketing work must run asynchronously and never block commerce workflows. |
| FR-MKT-006 | P0 | Campaign outcomes must include attempted, accepted, delivered, failed, read/opened where available, clicked, ordered, delivered-order, returned, and contribution. |
| FR-MKT-007 | P0 | Automation must support trigger, delay, eligibility, action, exit, and failure behavior. |
| FR-MKT-008 | P0 | Automation enrollment must be idempotent. |
| FR-MKT-009 | P0 | Operators must be able to pause campaigns and workflows. |
| FR-MKT-010 | P1 | WhatsApp should be primary where consent and policy permit; fallback channel must be policy-driven. |
| FR-MKT-011 | P1 | Meta integration should prioritize lead import, CAPI outcome events, audience sync, catalog feed, and metrics ingestion. |
| FR-MKT-012 | P2 | Full ad campaign creation and billing management are excluded until justified. |

Initial deterministic segments:

- first-time customer;
- repeat customer;
- VIP based on explicit thresholds;
- successful COD customer;
- high COD cancellation history;
- prepaid customer;
- Dhaka and outside-Dhaka;
- category buyer;
- price-sensitive or premium based on observable behavior;
- abandoned cart;
- inactive 30/60/90 days;
- viewed but not purchased;
- returned previous order;
- WhatsApp engaged but not converted.

Initial automations:

- cart abandoned;
- product restocked;
- watched product price dropped;
- post-delivery follow-up;
- expected repeat-purchase window;
- inactive-customer win-back.

### 12.16 Reports and analytics

| ID | Priority | Requirement |
|---|---|---|
| FR-ANL-001 | P0 | Reports must distinguish placed, confirmed, shipped, delivered, cancelled, returned, and RTO orders. |
| FR-ANL-002 | P0 | Revenue reports must identify whether values are gross, delivered, net of refund, or collected. |
| FR-ANL-003 | P0 | Contribution must include configurable product cost, acquisition, discount, packaging, courier subsidy, payment fee, return/RTO, and messaging cost. |
| FR-ANL-004 | P0 | The UI must not label a value “profit” unless required cost inputs and calculation basis are present. |
| FR-ANL-005 | P0 | Reports must support date and relevant status/channel/courier/product filters. |
| FR-ANL-006 | P0 | Export must respect the user's permissions and mask sensitive data where appropriate. |
| FR-ANL-007 | P1 | Owner dashboard should show delivered revenue, contribution, cash/collection indicators, order outcomes, and key exceptions. |
| FR-ANL-008 | P1 | Operations dashboard should show queues, SLA, stock, courier, RTO, and reconciliation exceptions. |
| FR-ANL-009 | P1 | Marketing dashboard should show spend, placed and delivered CAC, repeat rate, and campaign contribution. |
| FR-ANL-010 | P1 | CRM dashboard should show customer cohorts, retention, segments, consent, and follow-ups. |
| FR-ANL-011 | P1 | Finance view should show payment, refund, COD settlement, fee, and variance status. |

Core formulas:

```text
Placed-order CAC = Acquisition spend ÷ Placed first orders

Delivered-order CAC = Acquisition spend ÷ Delivered first orders

Net contribution = Delivered revenue
                 − Product cost
                 − Acquisition cost
                 − Discount
                 − Packaging cost
                 − Courier subsidy
                 − Payment charges
                 − Return and RTO cost
                 − Messaging cost

Customer lifetime contribution = Customer delivered revenue
                               − all attributable variable costs
                               − refunds and return/RTO cost

LTV:CAC = Customer lifetime value ÷ Customer acquisition cost
```

Every formula must declare its included costs, date basis, and handling of late returns.

### 12.17 Settings and audit

| ID | Priority | Requirement |
|---|---|---|
| FR-SET-001 | P0 | Authorized admin must configure store identity, contacts, currency, timezone, order prefixes, and policies. |
| FR-SET-002 | P0 | COD verification, return window, delivery fees, supported regions, payment methods, and notification templates must be configurable. |
| FR-SET-003 | P0 | Secret credentials must never be exposed in Admin Web or stored as plain application settings. |
| FR-SET-004 | P0 | Sensitive settings changes must be audited. |
| FR-SET-005 | P0 | Audit records must identify actor, action, entity, previous/new values where safe, source, and timestamp. |
| FR-SET-006 | P0 | Audit records must be append-only for normal users. |
| FR-SET-007 | P1 | Feature flags may control risky staged rollouts. |

### 12.18 Omnichannel customer experience

| ID | Priority | Requirement |
|---|---|---|
| FR-OMNI-001 | P0 | Customer Web and Mobile App must use the same backend identity, catalog, cart, checkout, order, payment, service, and support contracts. |
| FR-OMNI-002 | P0 | Mobile registration and Google sign-in payloads must match the verified backend authentication contract. |
| FR-OMNI-003 | P0 | Mobile checkout must use the server cart, required idempotency and cart headers, and the canonical order endpoint. |
| FR-OMNI-004 | P0 | Mobile prepaid checkout must open the provider redirect URL and safely handle success, failure, cancellation, and retry. |
| FR-OMNI-005 | P0 | Mobile sessions must use secure device storage and the same refresh, revocation, and expiry policy as supported customer sessions. |
| FR-OMNI-006 | P0 | Production customer surfaces must not silently substitute static fallback content for failed backend data. |
| FR-OMNI-007 | P1 | Customer capabilities should retain consistent labels, status meaning, and recovery actions across web and mobile. |

### 12.19 Support, requests, reviews, services, and warranty

| ID | Priority | Requirement |
|---|---|---|
| FR-EXT-001 | P1 | Authenticated customers may start support conversations and exchange persisted real-time messages with authorized staff. |
| FR-EXT-002 | P0 | Conversation lists, message history, socket rooms, and staff identity must be authorized server-side; clients cannot self-assign an admin role. |
| FR-EXT-003 | P1 | Customers may submit requested products and Admin may review and manage the request lifecycle. |
| FR-EXT-004 | P1 | Authenticated customers may submit product-linked YouTube reviews; Admin may add, edit, approve, feature, reject, or delete them. |
| FR-EXT-005 | P1 | Admin may manage product review banners shown on eligible product-detail pages. |
| FR-EXT-006 | P1 | Admin may create category-scoped service offerings and customers may submit validated booking requests with immutable service snapshots. |
| FR-EXT-007 | P1 | Eligible delivered order items may open warranty claims with issue details and image evidence. |
| FR-EXT-008 | P1 | Warranty history must support received, repaired, sent-to-brand, received-from-brand, resolved, and rejected-with-cause outcomes without erasing prior states. |

### 12.20 Pickup, delivery workforce, and public activity

| ID | Priority | Requirement |
|---|---|---|
| FR-OPS-001 | P1 | Admin may manage store outlets and eligible customers may select click-and-collect with PAY_AT_STORE where enabled. |
| FR-OPS-002 | P1 | Pickup orders must have an explicit lifecycle and OTP-verified handover with audit evidence. |
| FR-OPS-003 | P1 | Delivery personnel may apply, be reviewed, receive assignments, and submit authorized location updates. |
| FR-OPS-004 | P1 | Admin may inspect delivery assignment and live-location state without exposing location data publicly. |
| FR-OPS-005 | P1 | Public purchase activity must be derived only from eligible real orders with explicit consent, masked identity, bounded locality, and configurable visibility. |
| FR-OPS-006 | P1 | The public activity popup must disappear after approximately four seconds and the paginated history must aggregate each order as one lead product plus an item count. |
| FR-OPS-007 | P1 | Admin may configure activity surfaces, age window, locality, timing, and product exclusions without creating fake purchase records. |
| FR-OPS-008 | P1 | Admin may view active page-visitor aggregates; analytics must avoid unnecessary personal data and clearly distinguish live estimates from durable business reports. |

### 12.21 Developed Commerce Features Added After the Original PRD

The following capabilities were designed and developed after the original v1.1 baseline and are now normative requirements of the multi-tenant product. Unless explicitly marked platform-level, their records, permissions, settings, cache keys, jobs, files, sockets, analytics, and audit evidence are tenant-scoped.

#### 12.21.1 Saved carts, cart sharing, and reorder

| ID | Priority | Requirement |
|---|---|---|
| FR-CART-007 | P1 | Authenticated customers may save their active cart as a persistent named saved cart and list, reload, or delete saved carts within the current tenant storefront. |
| FR-CART-008 | P1 | A saved cart may be exposed through an opaque share token producing a public read-only view; the token must resolve to one tenant and must not expose customer identity or guarantee current prices. |
| FR-CART-009 | P1 | A visitor may import available shared-cart items into the active cart or save them after sign-in; unavailable/unpublished variants are reported explicitly. Cross-tenant import may occur only as a deliberate catalog remapping flow; a token must never directly reference another tenant's private catalog records. |
| FR-CART-010 | P1 | Authenticated customers may reorder available items from their own past orders. Server-side ownership and tenant checks are mandatory and per-item outcomes must be returned. |

#### 12.21.2 Catalog merchandising: condition, brands, and Hero Showcase

| ID | Priority | Requirement |
|---|---|---|
| FR-CAT-011 | P1 | Products carry `NEW` or `SECOND_HAND`; second-hand products require a grade and human-readable disclosure shown through listing/detail/cart/checkout and preserved on order-item snapshots. |
| FR-CAT-012 | P1 | Storefronts can filter by condition and visually distinguish second-hand inventory. |
| FR-CAT-013 | P1 | Brand is a tenant-managed catalog entity with name, unique tenant-local slug, description, logo, activation state, guarded deletion, and product/search/filter association. |
| FR-CAT-014 | P2 | Tenant Admin may manage homepage Hero Showcase slides including image, heading, copy, link, ordering, and active state. Content is tenant-specific presentation data and cannot affect commerce calculations. |

#### 12.21.3 Checkout additions

| ID | Priority | Requirement |
|---|---|---|
| FR-CHK-011 | P1 | Customers may attach an optional order note to a checkout draft; it is copied to the placed order and visible only to authorized tenant staff. |
| FR-CHK-012 | P1 | Customers may adjust quantities and switch sibling variants inside checkout; publication, stock, price, and totals are revalidated/recomputed server-side in the resolved tenant database. |

#### 12.21.4 Wallet, notification inbox, warranty, services, and convenience surfaces

The already-developed wallet self-service, wallet recharge review, private customer notification inbox, warranty self-service/claims, service booking, requested-product feedback, reviews/review banners, store outlets/pickup, support chat, purchase activity, and related account routes remain approved product scope.

Multi-tenant rules:

- customer-facing records belong to the tenant in which they were created;
- wallet balances and ledger entries are never portable or shared across tenants unless a future explicit platform-wallet product is approved;
- warranties, service bookings, pickup locations, product requests, reviews, notifications, and chat conversations are tenant-scoped;
- WebSocket rooms and notification delivery must include trusted tenant scope;
- tenant-specific message templates/routing/provider credentials remain isolated;
- customer identity reuse across tenants, if later approved centrally, must not imply cross-tenant access to commerce history.

#### 12.21.5 First-party delivery workforce — Rider Web Portal

Business rules:

- riders are provisioned through tenant-admin review of applications or authorized direct creation;
- approval must never modify an existing unrelated platform identity or another tenant's membership;
- every newly provisioned rider credential follows the approved secure initial-password/reset flow; no default password exists in code;
- only riders linked to an `APPROVED` tenant personnel record may perform delivery actions;
- public applications are rate limited and must not reveal whether a phone/email exists;
- rider-reported COD cash remains pending authorized tenant staff confirmation and finance reconciliation;
- only eligible handed-over tenant orders can be moved through rider delivery states;
- rider assignment, location, status, and audit events are tenant-scoped.

| ID | Priority | Requirement |
|---|---|---|
| FR-RIDER-001 | P1 | Prospective riders may apply to a tenant through its public join flow with name, phone, email, NID, vehicle type, zone, optional license, and emergency contact. |
| FR-RIDER-002 | P0 | Authorized tenant administrators may list/search/approve/reject applications; approval provisions a rider-linked account/membership safely and writes tenant audit evidence. |
| FR-RIDER-003 | P0 | Approved riders authenticate through the shared identity system into the resolved tenant rider portal using secure httpOnly session handling. |
| FR-RIDER-004 | P1 | Riders see only their tenant profile, duty state, and assigned tenant orders with delivery-required customer address snapshots. |
| FR-RIDER-005 | P1 | Riders may toggle online/offline duty state; the server is authoritative. |
| FR-RIDER-006 | P1 | Riders may update assigned orders through the fixed delivery state set. `DELIVERED` must apply the same fulfillment, reservation, order-history, messaging, and audit invariants as the courier path. |
| FR-RIDER-007 | P1 | Delivery updates may carry GPS coordinates; tenant-scoped waypoints and current position are stored with sequence/timestamp evidence. |
| FR-RIDER-008 | P1 | Tenant Admin may view a live map of its approved riders and active delivery context and may clear location history according to policy. No tenant may see another tenant's rider locations. |

#### 12.21.6 Expanded Tenant Admin workspaces

The Release 1 Tenant Admin information architecture includes the developed workspaces below, subject to plan entitlement and tenant RBAC:

```text
Overview / Charts
Orders
Returns
Products
Fulfillment & Shipping
Reconciliation & Settlements
Categories
Delivery Zones
Payments & Refunds
Brands
Delivery Personnel
Wallet Review
Inventory
Delivery Live Map
Purchase Activity
Customers
Store Outlets & Pickup
Requested Products / Feedback
Staff Management
Reports & Analytics
Reviews & Review Banners
Security Center / 2FA
Services
Warranty Claims
Chat & Messages
Transactional Messages
Audit Log
Hero Showcase
Abandoned Carts Queue
Settings
System Health / Operations Health
Global Order History / tenant social proof
```

"Global Order History" means global within the tenant storefront/business, not global across Ferio SaaS tenants.

#### 12.21.7 Security remediation requirements carried into SaaS

- JWT/signing secrets are cryptographically strong; placeholder/fallback secrets are rejected.
- Payment initiation uses the approved order-reference plus placement-proof policy; browser failure/cancel callbacks cannot authoritatively mutate payment/order state.
- OTP codes use CSPRNG generation, hashed storage, timing-safe comparison, atomic consumption, and rate limits.
- Refresh-token revocation fails closed when Redis is unavailable.
- Rider provisioning follows the hardened rider rules above.
- Verification codes never transit to browser clients.
- Production customer/admin/rider surfaces have explicit error/empty states on backend failure.
- Framework/security dependencies must remain at supported patched versions and CI must enforce production builds and tests.

#### 12.21.8 CI gate

All changes must pass the approved CI gate covering backend production build/unit tests and production typecheck/build for customer, tenant-admin, platform-admin, and rider-relevant web surfaces. Disposable PostgreSQL/Redis integration suites should cover tenant isolation, provisioning, migrations, payment/webhook security, jobs, and rider authorization.


### 12.22 SaaS organization and tenancy

| ID | Priority | Requirement |
|---|---|---|
| FR-SAAS-001 | P0 | Ferio must support multiple independent SaaS organizations, each representing one subscribed business/workspace. |
| FR-SAAS-002 | P0 | Every tenant-scoped request must resolve organization context server-side from trusted host/domain/session context before tenant-data access. |
| FR-SAAS-003 | P0 | Client-supplied tenant IDs, slugs, database names, or connection strings must never be sufficient authority to select a tenant database. |
| FR-SAAS-004 | P0 | Each active organization must have an isolated operational PostgreSQL database registered in the control plane under the database-per-tenant model. |
| FR-SAAS-005 | P0 | Cross-tenant access attempts must fail closed and create security telemetry where appropriate. |
| FR-SAAS-006 | P0 | One identity may belong to multiple organizations, but membership must be revalidated for every workspace switch. |
| FR-SAAS-007 | P0 | Organization lifecycle, subscription lifecycle, and tenant-database lifecycle must remain separate. |
| FR-SAAS-008 | P1 | Tenant-specific export, backup, restore, and offboarding must not affect unrelated organizations. |

### 12.23 Tenant domains and storefront routing

| ID | Priority | Requirement |
|---|---|---|
| FR-DOM-001 | P0 | Each organization must have a unique Ferio subdomain or equivalent tenant hostname. |
| FR-DOM-002 | P0 | Host resolution must map only to an active verified tenant-domain record. |
| FR-DOM-003 | P0 | Storefront cache keys, redirects, canonical URLs, cookies, and server rendering must remain tenant-safe. |
| FR-DOM-004 | P1 | Eligible plans may attach verified custom domains. |
| FR-DOM-005 | P1 | Custom-domain activation requires DNS/ownership verification and TLS readiness. |
| FR-DOM-006 | P1 | Removed domains must not become a takeover vector when reused. |

### 12.24 Tenant provisioning and database lifecycle

| ID | Priority | Requirement |
|---|---|---|
| FR-PROV-001 | P0 | Provisioning must be an idempotent durable workflow, not a synchronous best-effort controller action. |
| FR-PROV-002 | P0 | Provisioning must reserve organization/domain, create/register the tenant database, apply the approved tenant schema, seed defaults, attach owner membership, health-check, and mark ready. |
| FR-PROV-003 | P0 | Partial failure must leave a diagnosable state and support safe retry without duplicate databases. |
| FR-PROV-004 | P0 | Tenant database names/credentials must derive from internal identifiers, not unsanitized user slugs. |
| FR-PROV-005 | P0 | Tenant database secrets must never be returned to browser clients or embedded in client-visible tokens. |
| FR-PROV-006 | P1 | Platform Admin must show provisioning stage, safe error code, attempts, and retry/repair actions. |
| FR-PROV-007 | P1 | Suspension preserves the database and follows documented read/write policy. |

### 12.25 Tenant migration orchestration

| ID | Priority | Requirement |
|---|---|---|
| FR-MIG-001 | P0 | Tenant schema migrations must be versioned and replayable from an empty tenant database. |
| FR-MIG-002 | P0 | Ferio must track schema version and migration health for every tenant database. |
| FR-MIG-003 | P0 | Migration rollout must support bounded concurrency, failure isolation, retry, and observability. |
| FR-MIG-004 | P0 | One failed tenant migration must not make unrelated tenants unavailable. |
| FR-MIG-005 | P1 | Production rollout supports canary/batched progression before full fleet migration. |
| FR-MIG-006 | P1 | High-risk migrations require backup/restore hooks or an explicit forward-fix plan. |
| FR-MIG-007 | P1 | Code/schema compatibility must be documented while adjacent tenant schema versions coexist during rollout. |

### 12.26 Plans, subscriptions, entitlements, and usage

| ID | Priority | Requirement |
|---|---|---|
| FR-SUB-001 | P0 | Platform Admin must create/version plans and entitlements without hard-coding plan names across commerce modules. |
| FR-SUB-002 | P0 | Every SaaS organization has a subscription lifecycle or explicitly approved internal/free entitlement state. |
| FR-SUB-003 | P0 | Entitlement checks are centralized and enforced server-side. |
| FR-SUB-004 | P0 | Usage-limited features such as products, staff, orders, storage, warehouses, or integrations require authoritative usage measurement. |
| FR-SUB-005 | P0 | Reaching a plan limit must not delete or corrupt existing data. |
| FR-SUB-006 | P0 | Upgrade unlocks entitled capabilities without tenant reprovisioning. |
| FR-SUB-007 | P1 | Downgrade defines over-limit behavior and preserves existing records. |
| FR-SUB-008 | P0 | SaaS subscription billing belongs to the Ferio control plane and is separate from tenant customer-order/payment accounting. |
| FR-SUB-009 | P1 | Grace, suspension, reactivation, cancellation, and manual overrides are audited. |

Recommended subscription lifecycle:

```text
TRIAL
ACTIVE
PAST_DUE
GRACE
SUSPENDED
CANCELLED
EXPIRED
```

Recommended organization lifecycle:

```text
PROVISIONING
ACTIVE
RESTRICTED
SUSPENDED
ARCHIVED
PROVISIONING_FAILED
```

Recommended tenant database lifecycle:

```text
PENDING
CREATING
MIGRATING
SEEDING
READY
DEGRADED
FAILED
DISABLED
ARCHIVED
```

### 12.27 Tenant branding and settings

| ID | Priority | Requirement |
|---|---|---|
| FR-BRAND-001 | P0 | Each tenant configures independent store name, logo, contacts, address, policies, order prefix, and customer-facing metadata. |
| FR-BRAND-002 | P0 | Tenant settings must never leak across tenant domains or caches. |
| FR-BRAND-003 | P0 | Tenant-specific courier, payment, messaging, and other integration credentials are tenant-scoped and secret-managed. |
| FR-BRAND-004 | P1 | Platform defaults may seed settings, but subsequent tenant changes remain tenant-owned unless platform policy locks the field. |
| FR-BRAND-005 | P1 | Plans may restrict selected branding/domain capabilities without changing commerce history. |

### 12.28 Platform administration

| ID | Priority | Requirement |
|---|---|---|
| FR-PLAT-001 | P0 | Platform Admin authentication and authorization are distinct from tenant staff administration. |
| FR-PLAT-002 | P0 | Platform Admin manages organizations, plans, subscriptions, domains, provisioning, tenant DB state, usage, platform flags, audit, and system health. |
| FR-PLAT-003 | P0 | Platform staff do not receive implicit unrestricted tenant-commerce access merely by being platform administrators. |
| FR-PLAT-004 | P1 | Support access into tenant operational context, if implemented, is explicit, reasoned, auditable, and time-bound where practical. |
| FR-PLAT-005 | P1 | Platform Admin surfaces fleet migration status/failures without exposing DB credentials. |

### 12.29 Existing Ferio migration to SaaS

| ID | Priority | Requirement |
|---|---|---|
| FR-MOVE-001 | P0 | The current Ferio store becomes the first/reference tenant without losing valid catalog, customer, order, payment, inventory, shipment, return, wallet, CRM, audit, or integration history. |
| FR-MOVE-002 | P0 | Migration preserves immutable references and relationships required for reconciliation and audit. |
| FR-MOVE-003 | P0 | Existing global settings are classified into platform-global defaults versus first-tenant settings. |
| FR-MOVE-004 | P0 | Existing admin users become tenant memberships/roles and do not become Platform Admin by default. |
| FR-MOVE-005 | P0 | Existing web/mobile commerce contracts remain compatible during tenantization unless a versioned breaking change is approved. |
| FR-MOVE-006 | P1 | Migration reconciliation compares pre/post entity counts and key financial/stock invariants. |

---

## 13. Domain State Models

### 13.1 Order status

Recommended baseline:

```text
DRAFT
PENDING
PENDING_CONFIRMATION
CONFIRMED
PROCESSING
READY_TO_SHIP
SHIPPED
DELIVERED
COMPLETED
CANCELLED
```

Return and RTO are related workflows, not reasons to overload every order state. Admin may display derived labels such as `RETURN_IN_PROGRESS` while preserving separate return records.

Key rules:

- `DELIVERED` means courier/customer delivery occurred.
- `COMPLETED` means the configurable return window closed without an active blocking return.
- COD and prepaid orders may reach `CONFIRMED` through different paths.
- cancellation after shipment must follow courier/return handling rather than a simple pre-fulfillment cancellation.
- state transitions must be defined in code and tested.

### 13.2 Payment status

```text
PENDING
REQUIRES_ACTION
AUTHORIZED
PAID
FAILED
EXPIRED
PARTIALLY_REFUNDED
REFUNDED
```

COD collection may use a related collection/settlement record rather than pretending COD was prepaid.

### 13.3 Fulfillment status

```text
UNFULFILLED
PICKING
PICKED
PACKING
PACKED
READY_FOR_HANDOVER
HANDED_OVER
FULFILLED
EXCEPTION
CANCELLED
```

### 13.4 Shipment status

```text
PENDING
CREATED
PICKUP_REQUESTED
PICKED_UP
IN_TRANSIT
OUT_FOR_DELIVERY
DELIVERED
FAILED_ATTEMPT
RETURN_TO_ORIGIN
RETURNED_TO_ORIGIN
CANCELLED
UNKNOWN
```

Provider status mappings must be versioned or auditable.

### 13.5 Return status

```text
REQUESTED
UNDER_REVIEW
APPROVED
REJECTED
AWAITING_ITEM
RECEIVED
INSPECTING
RESOLUTION_APPROVED
REFUND_PENDING
REFUNDED
REPLACEMENT_PENDING
COMPLETED
CANCELLED
```

### 13.6 Consent status

```text
UNKNOWN
GRANTED
REVOKED
SUPPRESSED
```

Consent history must not be overwritten when current status changes.

---

## 14. Business Rules

### 14.1 Money

- Store all monetary amounts as integers in minor units.
- Initial currency is BDT.
- Order totals are immutable snapshots after placement except through explicit adjustment/refund records.
- Rounding behavior must be deterministic and tested.
- A discount must never reduce an order below configured boundaries.

### 14.2 Stock reservation

- Reservation policy must be explicit by payment method.
- COD may reserve at confirmation rather than raw placement.
- Prepaid may reserve before redirect for a short TTL or at verified payment success; the selected policy must avoid overselling and indefinite holds.
- Expired, failed, or cancelled paths must release reservations idempotently.
- Stock deduction and reservation release must be transactional.

### 14.3 COD verification

- Verification can be globally enabled and overridden by explainable rules.
- Low-risk repeat customers may bypass manual verification if configured.
- High-value, suspicious, incomplete-address, or historically unsuccessful COD orders may require stronger verification.
- Staff decisions require an outcome and optional note.
- Risk flags support decisions; they must not create unexplained permanent bans.

### 14.4 Customer identity

- Normalized phone is the main lookup key.
- Identity resolution may use phone, email, addresses, external lead IDs, and staff review.
- Shared household phone numbers and number reassignment are possible.
- Merges must be reversible through administrative recovery or preserve sufficient history to repair mistakes.

### 14.5 Messaging

- Transactional messages are tied to a customer-requested transaction.
- Promotional messages require valid channel consent and provider-policy compliance.
- STOP/opt-out signals must suppress future promotional messaging promptly.
- Quiet hours use Asia/Dhaka unless customer timezone is known and supported.
- A campaign must not repeatedly enroll the same customer for the same trigger without a defined re-entry rule.

### 14.6 Completion and return window

- Delivery starts the configured return-window timer.
- Active eligible returns pause automatic completion when necessary.
- Completion can be reversed only through an explicit audited recovery process.
- Late courier events and late returns must not silently rewrite financial history.

### 14.7 External integrations

- Ferio's internal state is authoritative for product workflows, while verified provider outcomes are authoritative for provider-side payment or courier facts.
- Every outbound integration call has a correlation ID.
- Every inbound event stores provider event ID or a deterministic deduplication key.
- Unknown external statuses create an exception; they are not discarded.
- Retryable and permanent failures must be distinguished.

### 14.8 Tenant isolation and SaaS lifecycle

- Tenant context is resolved server-side before tenant operational access.
- Browser-provided workspace hints cannot select a database connection.
- Cross-tenant joins against operational tenant databases are prohibited in ordinary commerce requests.
- Platform-wide analytics use explicit aggregate/read models rather than synchronous fan-out across live tenant databases.
- Suspension never silently deletes tenant operational history.
- Plan-limit enforcement preserves existing data.
- Platform Admin does not automatically grant tenant-commerce permissions.
- Cache, queue, object-storage paths, WebSocket rooms, exports, and idempotency namespaces must be tenant-scoped where shared infrastructure could collide.

### 14.9 Subscription billing separation

- Business-to-Ferio subscription billing belongs to the control plane.
- Customer-to-business orders, refunds, COD collections, wallet entries, and courier settlements belong to the tenant commerce domain.
- Platform subscription transactions must never be written into tenant customer-payment or wallet ledgers.

---

## 15. Data Requirements

### 15.1 Primary entities

Control-plane entities:

- SaaS organizations, domains, tenant database registrations, provisioning jobs, schema versions, plans, entitlements, subscriptions, platform invoices/payments, usage counters, platform feature flags, platform users, support-access records, and platform audit/security events.

Tenant operational entities:

- tenant memberships, roles, permissions, and tenant-scoped staff settings;
- users/identities and sessions according to the approved central-identity model;
- customers, customer identities, addresses, notes, and merge history;
- consent records, suppressions, and preferences;
- categories, brands, products, variants, attributes, media, and collections;
- prices, coupons, promotion rules, and redemptions;
- carts and cart items;
- orders, order items, status history, adjustments, and attribution;
- warehouses, stock balances, reservations, and stock movements;
- payment attempts, transactions, refunds, and reconciliation results;
- customer wallets, recharge requests, and immutable wallet ledger entries;
- fulfillments, pick lists, packages, shipments, courier events, and tracking history;
- return requests, inspections, resolutions, and RMA references;
- notification templates, outbound commerce messages, provider attempts/events, and private customer inbox notifications;
- segments, campaigns, audience snapshots, workflow enrollments, and outcomes;
- costs, campaign spend, contribution snapshots, and reporting dimensions;
- settings, feature flags, integration connections, scheduled jobs, and audit logs.
- saved carts/share tokens, brands, product-condition disclosures, Hero Showcase content, rider applications/personnel/assignments/location history, delivery zones, outlets/pickup, warranties, service bookings, product requests, reviews/banners, chat, purchase activity, and operations-health evidence.

### 15.2 Data ownership

| Data | System of record |
|---|---|
| SaaS organizations, plans, subscriptions, domains, tenant DB registry, platform billing | Ferio Control-Plane PostgreSQL |
| Tenant products, orders, customers, consent, stock | Resolved Tenant PostgreSQL database |
| Payment provider transaction outcome | Provider, reconciled into Ferio |
| Courier movement outcome | Courier, normalized and retained in Ferio |
| Message delivery/read outcome | Channel provider, retained in Ferio |
| Product media files | S3-compatible object storage using tenant-scoped object keys, with metadata in the owning tenant database |
| Application cache and jobs | Redis; never sole durable business record |

### 15.3 Data quality

- Required fields and formats must be validated at boundaries.
- Unique constraints must protect business invariants.
- Foreign keys or equivalent integrity constraints must protect relationships.
- Soft deletion may be used where history is required; it is not a substitute for data lifecycle policy.
- All operational timestamps use UTC in storage and Asia/Dhaka for default display.
- User-entered Bangla, English, and Banglish text must be Unicode-safe.

### 15.4 Retention and deletion

- Retention periods must be documented by data category.
- Financial, order, audit, security, and consent evidence may require longer retention than marketing data.
- Customer deletion requests must remove or anonymize non-required personal data while preserving legally or operationally required transaction records.
- Backups must follow the same eventual deletion and expiry policy.

---

## 16. Integration Requirements

### 16.1 Payment adapters

Implemented provider strategies include SSLCOMMERZ and aamarPay behind an abstract gateway and registry. Additional targets may include bKash, Nagad, Rocket, ShurjoPay, and card networks; Release 1 does not require every provider.

The adapter contract must support:

- create payment;
- retrieve/verify payment;
- process webhook/callback;
- refund where supported;
- normalize provider status and error;
- expose reconciliation identifiers.

### 16.2 Courier adapters

Implemented adapter candidates include Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee behind a provider-neutral registry, recommender, and scorecard. Release 1 still requires one selected provider to pass sandbox and production-readiness verification; breadth of adapters does not replace end-to-end proof.

The adapter contract must support where available:

- service-area validation;
- delivery price estimate;
- create/cancel shipment;
- obtain AWB, label, and tracking URL;
- receive or poll tracking events;
- normalize statuses;
- retrieve COD/settlement reference.

### 16.3 Communication adapters

Channels:

- WhatsApp Business Platform;
- Bangladesh SMS gateway;
- email provider;
- later FCM/web push.

The common delivery model must not erase channel-specific policy, template, consent, or status behavior.

### 16.4 Meta integration — Release 2

Priorities:

1. import Lead Ads through verified webhooks;
2. capture source and campaign identifiers;
3. send server-side outcome events through Conversions API;
4. sync eligible consent-aware audiences where policy permits;
5. export product catalog/feed;
6. ingest campaign cost and performance data when reliable.

Useful outcome events include:

- lead created;
- product viewed;
- add to cart;
- checkout started;
- order placed;
- order confirmed;
- order shipped;
- order delivered;
- order cancelled;
- order returned.

Delivered or confirmed outcomes are strategically more meaningful for COD optimization than treating every placed order as equal success.

---

## 17. Analytics Event Model

### 17.1 Event requirements

Every analytics event must include where applicable:

- event name and version;
- event ID;
- occurred-at timestamp;
- anonymous/session identifier;
- resolved customer ID if available;
- source, medium, campaign, ad set, and ad identifiers;
- product, variant, cart, order, payment, or shipment reference;
- amount and currency;
- application and device context;
- consent basis where required.

### 17.2 Initial events

Customer behavior:

- page viewed;
- product viewed;
- search performed;
- filter applied;
- add to cart;
- remove from cart;
- checkout started;
- checkout validation failed;
- order placed.

Operational outcomes:

- order confirmed;
- order cancelled;
- payment succeeded/failed/refunded;
- stock reserved/released/adjusted;
- shipment created/picked up/delivered/RTO;
- return requested/approved/rejected/received;
- order completed.

Marketing outcomes:

- consent granted/revoked;
- message attempted/delivered/failed/read/clicked;
- campaign enrolled/exited;
- attributed order placed/delivered/returned.

### 17.3 Attribution

Release 1 uses understandable first-touch and last-non-direct/source capture with explicit campaign identifiers where present. Release 2 adds campaign attribution windows and delivered-order outcomes.

Ferio must not claim causal attribution when only correlation is available. Reports must label the attribution model used.

---

## 18. Non-Functional Requirements

### 18.1 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-001 | Customer pages must be mobile optimized and avoid unnecessary client-side JavaScript. |
| NFR-PERF-002 | Cached public catalog reads should meet p95 server response ≤ 500 ms under expected launch load, excluding external media transfer. |
| NFR-PERF-003 | Core admin reads should meet p95 server response ≤ 800 ms under expected launch load. |
| NFR-PERF-004 | Order placement should meet p95 ≤ 2 seconds excluding external payment redirect/provider latency. |
| NFR-PERF-005 | Images must use responsive sizes, modern formats where supported, lazy loading, and CDN/object storage delivery. |

### 18.2 Availability and resilience

| ID | Requirement |
|---|---|
| NFR-REL-001 | Monthly storefront availability target is 99.5% for Release 1. |
| NFR-REL-002 | Critical writes must use database transactions. |
| NFR-REL-003 | Background jobs must support retry, backoff, dead-letter/failed-job inspection, and idempotency. |
| NFR-REL-004 | External provider degradation must fail gracefully and expose an operational exception. |
| NFR-REL-005 | Scheduled reconciliation must recover from missed webhooks and partial failures. |
| NFR-REL-006 | No cache or queue may be the sole record of an accepted order or payment outcome. |

### 18.3 Scalability

- Application processes must be stateless aside from external PostgreSQL, Redis, and object storage.
- Tenant DB connections use bounded pooling/caching with eviction/cleanup; creating an unbounded Prisma client per request or retaining one permanently for every historical tenant is prohibited.
- Provisioning and migration workloads use concurrency limits.
- Tenant-domain lookups may be cached only with explicit invalidation and fail-safe behavior.
- Platform-wide reporting must not synchronously fan out to every tenant database.
- Pagination is mandatory for unbounded admin lists.
- Expensive exports and reports run asynchronously.
- Database indexes must follow measured query patterns.
- Dedicated search, analytics, or service extraction requires measured evidence and a migration plan.

### 18.4 Accessibility

| ID | Requirement |
|---|---|
| NFR-A11Y-001 | Customer Web targets WCAG 2.2 AA for core purchase journeys. |
| NFR-A11Y-002 | All interactive controls must be keyboard accessible with visible focus. |
| NFR-A11Y-003 | Inputs require programmatic labels and clear error association. |
| NFR-A11Y-004 | Status must not be communicated by color alone. |
| NFR-A11Y-005 | Product imagery requires meaningful alternative text; decorative imagery uses empty alt text. |
| NFR-A11Y-006 | Motion must respect reduced-motion preferences. |

### 18.5 Compatibility

- Customer Web supports current and previous major versions of common mobile Chrome, Safari, and Chromium browsers.
- Admin Web supports modern desktop Chrome/Edge and responsive tablet usage.
- Core checkout remains usable on constrained mobile networks.

### 18.6 Localization

- Currency displays as Bangladeshi taka using consistent formatting.
- Phone and address validation supports Bangladesh conventions without rejecting legitimate edge cases.
- UI architecture must allow Bangla and English copy.
- User names and addresses must accept Bangla, English, and mixed text.

---

## 19. Security and Privacy Requirements

### 19.1 Application security

- TLS is required in production.
- Passwords must use an approved adaptive password hash.
- Authentication cookies/tokens must use secure settings and appropriate CSRF protection.
- Inputs must be validated and outputs encoded.
- Database access must use parameterized queries or safe ORM behavior.
- Uploads must validate MIME type, size, and filename handling.
- Rate limiting applies to login, OTP, checkout, tracking lookup, webhooks, and abuse-prone endpoints.
- Secrets must use environment/secret management and support rotation.
- Credentials or webhook secrets discovered in source code, documentation, logs, or progress records must be revoked, rotated, removed from history where practical, and treated as a launch blocker until verified.
- Dependency and image scanning should be part of CI.

### 19.2 Authorization and sensitive data

- Permissions are least-privilege and enforced server-side.
- WebSocket and HTTP authorization must derive staff identity and role from a verified session/token; handshake fields supplied by the client are never authority.
- Conversation lists and message history must not be public and must enforce participant or staff permission checks.
- Customer exports, refunds, manual stock adjustments, settings, and user management require explicit permissions.
- Sensitive data is masked in list views and logs where full values are unnecessary.
- Audit logs must avoid storing secrets, full payment credentials, or message bodies unnecessarily.
- Payment card details must never be stored unless using a compliant provider-approved architecture; provider tokenization is preferred.

### 19.3 Tenant isolation security

- Tenant resolution uses trusted host/domain and authenticated membership context.
- Client-provided database URLs, database names, connection keys, or arbitrary tenant IDs cannot select an operational database.
- Every tenant-scoped HTTP, WebSocket, background-job, export, storage, cache, and callback path carries trusted tenant scope.
- Cross-tenant authorization tests are mandatory for representative sensitive reads/writes.
- DB credentials never appear in client JWT/session claims.
- Object-storage keys and signed URLs prevent cross-tenant traversal.
- Redis keys, BullMQ jobs, socket rooms, caches, and idempotency keys are tenant-namespaced where infrastructure is shared.
- Platform support access to tenant data is explicit and audited.

### 19.4 Webhook security

- Verify signatures, credentials, source requirements, timestamp tolerance, and payload schema where supported.
- Persist event ID and processing result.
- Reject invalid signatures without exposing internal details.
- Make handlers idempotent and safe against replay.
- Move non-essential processing to jobs after durable receipt.

### 19.5 Privacy and consent

- Collect only data needed for commerce, support, compliance, analytics, or explicitly consented marketing.
- Explain marketing consent clearly and separately.
- Preserve consent evidence and revocation history.
- Provide operational processes for correction, suppression, and deletion requests.
- Do not share customer data with advertising channels beyond configured purposes and valid policy basis.

---

## 20. Design and Content Requirements

Ferio follows `_doc/design-language.md`.

### 20.1 Design objective

> Let the product speak. The interface should disappear.

### 20.2 Visual system

- Grayscale performs structural work.
- `ink #111114` for primary text and solid actions.
- `ink2 #6e6e73` for secondary text.
- `line #e8e8ea` for hairline borders.
- `surface #fafafa` for subtle backgrounds.
- `paper #ffffff` for page background.
- Semantic muted colors are reserved for status and alerts.
- One neutral grotesk typeface, preferably Inter or system equivalent.
- No serif/sans display pairing.
- Primary buttons are solid black pills with white text.
- Cards, images, and inputs use a consistent radius near 10px.
- No gradients, glassmorphism, decorative drop shadows, or oversized bubble corners.
- Prefer dividers and whitespace over boxed dashboard cards.
- Use real line icons only where they improve comprehension; plain text navigation is acceptable.

### 20.3 Product presentation

- Product cards are image-first with no shadow or decorative border.
- Information order is category, name, then price.
- Discounts use restrained chips, not ribbons.
- Product detail must prioritize imagery, variant selection, price, availability, delivery, and primary action.

### 20.4 Admin presentation

- Operational tables use hairline row dividers and compact density.
- No zebra striping or heavy gridlines.
- Status pills use muted semantic color plus readable text.
- Queues and exceptions take priority over decorative KPI cards.
- Empty states use one calm sentence and one action, without mascots or illustrations.

### 20.5 Motion

- Motion is limited to state transitions, hover feedback, and subtle image scale/opacity.
- No page-load sequences, scroll reveals, bouncing, or spring effects.
- Animation must never delay an operational action.

### 20.6 UI voice

- Plain, direct, active language.
- Explain the action and consequence.
- Use “Add to cart,” “Place order,” and “Pay when your order arrives.”
- Errors state what happened and what the user can do next.
- Avoid unnecessary apology, personality, or marketing language in operational moments.

### 20.7 Design acceptance test

Every screen must remain understandable if all non-semantic color is removed. Color cannot be the primary source of hierarchy or meaning.

---

## 21. Technical Architecture Constraints

### 21.1 Initial stack direction

- Customer Web: existing Next.js App Router application;
- Admin Web: existing Next.js App Router application;
- Customer Mobile App: Expo 54 / React Native application using the same versioned backend contracts;
- Backend: NestJS with TypeScript;
- Databases: PostgreSQL with one control-plane database plus one isolated operational database per active SaaS tenant;
- Cache and job queue: Redis with BullMQ or equivalent;
- Object storage: S3-compatible service;
- Search: PostgreSQL initially; Typesense/OpenSearch only when justified;
- Deployment: container-capable platform or conventional managed hosting without Kubernetes requirement;
- Observability: structured logs, metrics, error tracking, health checks, and alerting.

### 21.2 SaaS topology

```text
Tenant Storefront / Tenant Admin / Mobile
                  │
                  ▼
          Trusted Host Resolver
                  │
                  ▼
           Control-Plane Lookup
      ┌───────────┼────────────┐
      │           │            │
 Organization  Domain     Subscription
      │           │            │
      └───────────┼────────────┘
                  ▼
          Tenant Runtime Context
                  │
                  ▼
      Tenant DB Connection Manager
                  │
                  ▼
        Resolved Tenant PostgreSQL
                  │
                  ▼
       Commerce / CRM / Operations
```

### 21.3 Module boundaries

- Modules own their domain rules and expose application services/contracts.
- Cross-module writes must use explicit orchestration and transactions where consistency is required.
- Background integration uses durable jobs and, where needed, an outbox pattern.
- Internal events do not require Kafka in initial releases.
- Direct database access across module boundaries should be limited and reviewed.

### 21.4 API requirements

- APIs are versioned or maintain backward-compatible evolution policy.
- Request and response schemas are documented and validated.
- Errors use stable machine-readable codes plus safe user-facing messages.
- Pagination, sorting, and filtering follow consistent conventions.
- Mutation endpoints accept idempotency keys where retries can create duplicates.
- Correlation IDs propagate across API, jobs, and provider calls.
- Tenant-scoped APIs bind trusted tenant context before resolving tenant repositories/services.
- APIs never expose tenant database credentials or internal connection metadata.
- Web and mobile clients must share documented endpoint, payload, status, and authentication contracts; contract tests must detect drift before release.

---

## 22. Observability and Operations

### 22.1 Logging

Structured logs must include:

- timestamp and environment;
- service/module;
- request/correlation ID;
- tenant/organization ID and resolved domain where safe;
- actor/customer/order/provider references where safe;
- outcome and duration;
- stable error code;
- no passwords, secrets, full card data, or unnecessary personal message content.

### 22.2 Metrics

Minimum operational metrics:

- request rate, latency, and error rate;
- control-plane and tenant database connection/pool indicators;
- provisioning success/failure;
- tenant migration version distribution and failures;
- tenant-domain resolution errors;
- subscription/entitlement denial rates;
- database connection and slow-query indicators;
- job queue depth, age, retry, and failure count;
- order placement success/failure;
- payment callback and reconciliation failures;
- courier webhook lag and unknown statuses;
- notification acceptance and failure;
- stock/reservation reconciliation exceptions;
- backup status.

### 22.3 Alerts

Actionable alerts should cover:

- checkout/order placement failure spike;
- payment verification failure spike;
- webhook signature failure anomaly;
- queue backlog beyond SLA;
- stock inconsistency;
- courier integration outage;
- notification provider outage;
- backup failure;
- tenant provisioning/migration failure;
- suspicious cross-tenant authorization failures;
- tenant connection pool exhaustion;
- elevated authentication abuse.

### 22.4 Backups and recovery

- Automated backups are required for the control-plane database and every active tenant database.
- Point-in-time recovery should be enabled where platform support allows.
- Tenant-specific restore must be possible without overwriting unrelated tenant databases.
- Backup metadata must map to tenant identity and schema version.
- Object storage versioning/lifecycle is configured where appropriate.
- Restore procedures must be tested before production launch and periodically thereafter.
- Recovery point and recovery time targets must be documented after hosting selection.

---

## 23. Admin Information Architecture

### 23.1 Tenant Admin

Recommended Release 1 tenant navigation:

```text
Overview / Charts
Orders
Returns
Products
Categories
Brands
Inventory
Customers
Fulfillment & Shipping
Delivery Zones
Delivery Personnel
Delivery Live Map
Store Outlets & Pickup
Payments & Refunds
Wallet Review
Reconciliation & Settlements
Requested Products / Feedback
Reviews & Review Banners
Services
Warranty Claims
Chat & Messages
Transactional Messages
Hero Showcase
Abandoned Carts
Purchase Activity
Reports & Analytics
Security Center / 2FA
System Health
Settings
Audit
```

Release 2 additions:

```text
Growth
├── Customer 360
├── Leads
├── Segments
├── Campaigns
├── Automations
├── WhatsApp
├── SMS
├── Email
├── Consent and Suppression
├── Meta Integration
└── Retention Analytics
```

Navigation visibility follows tenant membership and permissions. Hidden navigation is not authorization.

### 23.2 Ferio Platform Admin

```text
Platform Overview
Organizations
Plans
Subscriptions
Platform Billing
Domains
Provisioning
Tenant Databases
Migrations
Usage
Feature Flags
Support
Security Events
Platform Audit
System Health
```

Platform navigation and APIs use separate platform-level permissions and must not silently reuse tenant `Owner/Admin` privileges.

---

## 24. Dashboard Requirements

### 24.1 Owner view

- delivered revenue;
- estimated contribution with calculation-status indicator;
- placed, confirmed, delivered, cancelled, returned, and RTO counts;
- cash/payment collection status;
- repeat purchase rate;
- top operational exceptions.

### 24.2 Operations view

- orders awaiting confirmation;
- orders ready for fulfillment;
- fulfillment aging and SLA breaches;
- shipment exceptions;
- low stock and reservation inconsistencies;
- returns/refunds requiring action.

### 24.3 Marketing view — Release 2

- acquisition spend;
- first-order placed and delivered CAC;
- campaign delivered-order conversion;
- repeat-order contribution;
- message delivery, click, opt-out, and complaint indicators;
- segment size and reachable audience.

### 24.4 Finance view

- prepaid payments requiring reconciliation;
- COD expected versus settled;
- refunds pending and aging;
- provider fees and settlement variance;
- contribution data completeness.

Dashboards must lead to filtered detail views. Metrics without an investigation path are insufficient.

---

## 25. Error and Exception Handling

### 25.1 Customer-facing errors

- preserve entered checkout data when recoverable;
- provide a clear next action;
- never expose stack traces or provider secrets;
- distinguish unavailable item, validation error, payment action, and temporary failure;
- provide support reference/correlation ID for unresolved failures.

### 25.2 Admin exceptions

Exception queues are required for:

- payment received but order not confirmed;
- order confirmed without valid reservation;
- reservation expired unexpectedly;
- courier shipment creation failed;
- unknown or conflicting courier status;
- delivered shipment with unresolved COD settlement;
- return received without resolution;
- refund pending beyond SLA;
- failed notification after retry;
- external event requiring manual review.

Each exception must show severity, age, owner, related entities, last attempt, safe error detail, and available action.

---

## 26. Acceptance Criteria by Release

### 26.1 Release 1 exit criteria

Release 1 SaaS is launch-ready only when:

- at least two independent test organizations can be provisioned with separate databases and distinct domains;
- tenant A cannot read, search, mutate, export, join sockets, or receive objects belonging to tenant B in automated negative tests;
- provisioning is idempotent and recoverable after seeded partial failures;
- tenant migration orchestration can migrate a canary/batch and isolate one failed database;
- current Ferio commerce data is reconciled into the first tenant;
- subscription/entitlement checks are enforced server-side;
- suspension preserves tenant data under documented access policy;
- domain resolution, cache invalidation, unknown-domain, and suspended-domain handling are tested;
- Platform Admin authorization is separate from Tenant Admin authorization;
- tenant DB credentials never appear in browser payloads, JWTs, URLs, or normal logs;

- a customer can complete the full mobile storefront journey using production data;
- COD order creation is idempotent and verification policy works;
- configured prepaid flow safely handles success, failure, cancellation, callback replay, and retry;
- wallet recharge approval, insufficient-balance rejection, wallet order debit, cancellation refund, and idempotent replay pass automated tests before wallet launch;
- stock cannot oversell during tested concurrent checkout scenarios;
- staff can move valid orders from confirmation through fulfillment and shipment;
- one real courier integration passes create, callback/poll, delivery, failed-attempt, cancellation, and RTO tests where supported;
- customers can securely track order status;
- transactional message failures do not fail commerce operations;
- return, RTO, and refund records are traceable;
- order/payment/inventory reconciliation jobs identify seeded inconsistencies;
- admin permissions are enforced server-side;
- sensitive mutations appear in audit history;
- backups and one restore exercise succeed;
- monitoring and actionable alerts exist for critical paths;
- dashboards distinguish placed, delivered, cancelled, returned, and RTO outcomes;
- design review confirms compliance with Ferio design language and core accessibility requirements;
- critical and high-severity security findings are resolved or explicitly accepted by the owner.
- Mobile App authentication, server-cart checkout, service booking, prepaid redirect, and refresh lifecycle pass backend contract and end-to-end tests without static production fallbacks.
- support chat proves authenticated staff sockets, private conversation/history access, participant authorization, and restricted production origins.
- any secret exposed in repository documentation or history is rotated and the deployed environment is verified to use the replacement.

### 26.2 Release 2 exit criteria

Release 2 is launch-ready only when:

- Customer 360 metrics reconcile to source orders and outcomes;
- consent evidence is preserved per channel;
- revocation and suppression prevent promotional sends;
- segment preview matches execution-time eligibility rules;
- campaign enrollment and send are idempotent;
- frequency caps, quiet hours, and duplicate prevention are tested;
- initial automations can be paused and inspected;
- campaign reporting follows orders through delivered and returned outcomes;
- Meta/server-side events can be reconciled to Ferio events without exposing prohibited customer data;
- support can explain why a customer received a message.

---

## 27. Testing Requirements

### 27.1 Automated tests

Unit tests are required for:

- tenant host/domain normalization;
- subscription/entitlement evaluation;
- organization/subscription/database state transitions;
- money and discount calculations;
- order, payment, fulfillment, shipment, and return transitions;
- stock reservation and release;
- phone normalization;
- consent and suppression eligibility;
- courier/payment status mapping;
- contribution formulas.

Integration tests are required for:

- tenant resolution to the correct database;
- cross-tenant access denial;
- tenant connection-manager lifecycle;
- provisioning retry/idempotency;
- tenant migration orchestration;
- subscription suspension/reactivation enforcement;
- transactional order creation;
- concurrent stock access;
- payment/courier webhook authentication and replay;
- job retry/idempotency;
- customer merge and history preservation;
- reconciliation jobs.
- web/mobile API contract compatibility for authentication, cart, checkout, payment redirects, service booking, and chat authorization.

End-to-end tests are required for:

- organization creation → DB provisioning → domain activation → tenant owner login;
- tenant A and tenant B commerce flows using independent datasets;
- cross-tenant URL/ID/socket/export attempts rejected;
- plan limit → upgrade → capability unlocked;
- tenant A saved-cart share/import and reorder, with tenant B isolation;
- tenant product condition/brand/Hero Showcase isolation;
- tenant rider application → approval → assignment → GPS/status → delivered, including cross-tenant denial;
- tenant wallet/warranty/service/chat/notification/pickup flows with ownership and tenant checks;
- browse to COD order;
- browse to prepaid outcome;
- admin confirmation to shipment;
- courier delivery to order completion;
- cancellation and reservation release;
- return to refund;
- promotional opt-out and suppression in Release 2.
- Mobile App registration/Google sign-in, server-cart COD and prepaid checkout, service booking, order tracking, and chat.
- click-and-collect selection through OTP handover, where enabled.

### 27.2 Manual validation

- mobile devices and constrained network conditions;
- Bangla/English/mixed names and addresses;
- keyboard and screen-reader checks on core journeys;
- provider sandbox and production-readiness checks;
- operational tabletop exercises for provider outage and reconciliation;
- permission review for each staff role.

---

## 28. Rollout Plan

### 28.1 Internal alpha

- migrate the current Ferio business as the first tenant;
- provision at least one synthetic second tenant;
- validate resolver, DB router, provisioning, migrations, subscriptions, entitlements, and isolation;
- real catalog subset;
- staff-only test orders;
- mock or sandbox integrations;
- migration and reset allowed;
- validate workflows and state rules.

### 28.2 Controlled beta

- onboard a small number of real SaaS businesses;
- use staged tenant-schema migrations;
- monitor per-tenant connection behavior and isolation;
- validate plan limits and subscription operations;
- limited real customers or geography;
- one warehouse;
- COD plus selected payment method;
- one courier;
- daily reconciliation and incident review;
- manual fallback documented.

### 28.3 General launch

- launch gates passed;
- support coverage and escalation contacts ready;
- provider production credentials verified;
- backup/restore and rollback plan tested;
- dashboards and alerts monitored daily during stabilization.

### 28.4 Release 2 rollout

- begin with internal/test audiences;
- then a small consented customer segment;
- validate template approval, delivery, opt-out, frequency, and attribution;
- expand automation separately, not all at once;
- maintain a global marketing kill switch.

---

## 29. Migration from Current Prototype

The current Ferio repository now represents a functioning single-business commerce implementation that must be tenantized rather than discarded. The original PRD assumed a single seller/store, so existing tables, settings, caches, jobs, provider configuration, routes, and admin permissions may be globally scoped.

The SaaS migration must separate:

- Ferio platform/control-plane data;
- central identity and organization memberships where approved;
- tenant-specific commerce data;
- platform subscription billing;
- tenant customer-order/payment data;
- Platform Admin versus Tenant Admin.

Required SaaS migration path:

1. inventory each current Prisma model as `CONTROL_PLANE`, `CENTRAL_IDENTITY`, `TENANT_DATA`, or `SHARED_INFRA_METADATA`;
2. freeze/test current commerce invariants before tenantization;
3. create the control-plane schema and migrations;
4. derive the canonical tenant schema from the current commerce schema;
5. implement tenant resolver/context and tenant DB manager;
6. implement tenant provisioning, tenant seed, and migration orchestration;
7. migrate current Ferio data into the first tenant DB and reconcile counts, financial totals, and stock invariants;
8. map existing staff into first-tenant memberships without granting Platform Admin;
9. tenant-scope Redis keys, BullMQ jobs, sockets, object paths, idempotency keys, settings, and provider credentials;
10. make storefront/Admin resolution host-aware;
11. implement plan/subscription/entitlement enforcement;
12. add Platform Admin;
13. add cross-tenant tests and tenant-specific backup/restore;
14. then continue ordinary feature delivery.

Legacy prototype migration steps still apply where mock/static implementation remains:

15. define shared domain types and API contracts;
2. implement backend authentication, catalog, customer, cart/checkout, order, and inventory foundations;
3. replace static product data with APIs;
4. replace in-memory cart with persisted guest/session behavior;
5. replace mock order placement with idempotent backend checkout;
6. replace mock admin authentication and data;
7. connect order status actions to validated backend commands;
8. add object storage media flow;
9. align typography and visual tokens to `_doc/design-language.md`;
10. add integrations, jobs, reconciliation, observability, and launch controls.

Prototype screens may be retained where they meet this PRD, but mock assumptions are not production requirements.

---

## 30. Dependencies

Business dependencies:

- confirmed catalog, prices, product costs, and return policy;
- delivery regions and fees;
- COD verification policy;
- warehouse operating process;
- courier contract and production API access;
- payment provider merchant approval;
- WhatsApp Business and template approval for selected messages;
- SMS/email provider accounts;
- privacy, consent, terms, and refund policy review;
- staff roles and operational SLAs.

Technical dependencies:

- PostgreSQL hosting capable of operating/provisioning many isolated tenant databases;
- Prisma-compatible connection/pooling strategy;
- wildcard tenant subdomain DNS/TLS strategy;
- custom-domain verification/TLS strategy for later plans;
- tenant-specific backup/restore;
- hosting and environment strategy;
- managed PostgreSQL, Redis, and object storage;
- DNS, TLS, email domain configuration;
- secret management;
- error tracking, metrics, logging, and alerting;
- backup and restore capability.

---

## 31. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope expands toward future-state diagrams | Delayed launch | Enforce release boundaries and non-goals |
| Weak unit economics | Growth without profit | Track delivered contribution and improve margin, AOV, COD, returns, and repeat rate |
| Provider API instability | Payment, courier, or messaging disruption | Adapter boundaries, retries, reconciliation, fallbacks, exception queues |
| Inaccurate inventory | Overselling and cancellations | Transactional reservation, movement ledger, reconciliation |
| Duplicate callbacks/actions | Double charge, stock, or messages | Idempotency keys and provider event deduplication |
| Customer data duplication | Misleading CRM and messaging | Phone normalization, identity links, reviewed merges |
| Spam or policy violations | Account restriction and trust loss | Consent, suppression, frequency caps, quiet hours, template policy |
| Premature AI | Cost and poor decisions | Use deterministic rules until sufficient clean data exists |
| “Profit” reports use incomplete costs | Wrong business decisions | Data completeness labels and explicit formulas |
| Single-person operational knowledge | Fragile operations | Document workflows, queues, permissions, and exception ownership |
| Security/privacy failure | Customer harm and business loss | Least privilege, secure integration, audit, retention, monitoring |
| Cross-tenant data leak | Severe customer/security impact | DB-per-tenant isolation, trusted tenant resolution, scoped cache/jobs/storage/sockets, negative tests |
| Tenant DB connection explosion | Resource exhaustion/outage | Bounded connection manager, pooling, eviction, metrics, load tests |
| Fleet migration failure | Inconsistent schemas | Migration registry, canaries, bounded concurrency, retry, compatibility policy, backup |
| Provisioning partial failure | Broken onboarding | Durable state machine/job, idempotency, repair actions, platform visibility |
| Scattered plan checks | Incorrect access and maintainability | Central EntitlementService and policy tests |
| Domain takeover/misrouting | Store impersonation/data leakage | Verified domains, safe release/reuse, TLS and ownership checks |
| Platform Admin becomes universal tenant superuser | Privacy/security exposure | Separate authorization domain and audited support-access workflow |

---

## 32. Product Decisions Already Made

- Ferio is now approved as a multi-tenant Commerce SaaS platform; the existing Ferio store becomes the reference/first tenant.
- Each tenant begins with one warehouse by default; additional warehouses may be enabled by plan or future release.
- Customer Web and Admin Web are separate applications.
- Each subscribed business has an independent SaaS organization/workspace and tenant hostname.
- The approved operational isolation model is database-per-tenant.
- Ferio uses a separate control-plane database for organizations, domains, plans, subscriptions, provisioning, tenant DB registry, usage, and platform operations.
- Platform subscription billing is separate from tenant customer-order/payment accounting.
- Tenant database selection is resolved server-side and cannot be chosen by clients.
- Tenant schema migrations require orchestrated staged fleet rollout.
- Platform Admin and Tenant Admin are separate authorization domains.
- Customer Mobile App is an approved Expo 54 surface and must remain contract-compatible with Customer Web and Backend.
- Staff functions remain role-based modules inside Admin Web initially.
- Backend is a modular monolith.
- PostgreSQL is the source of truth.
- Phone is the practical primary customer identity for Bangladesh.
- Guest checkout is required.
- COD is a first-class payment and operational workflow.
- Order, payment, fulfillment, shipment, return, and refund statuses are separate.
- `DELIVERED` and `COMPLETED` are distinct.
- Marketing is consent-based and asynchronous.
- WhatsApp is primary retention delivery, not the CRM or only channel.
- Reporting prioritizes delivered outcomes and contribution.
- AI, microservices, Kubernetes, Kafka, and analytics warehouse are deferred.
- Ferio uses the restrained design language defined in `_doc/design-language.md`.
- Payment implementations use an abstract gateway and registry; SSLCOMMERZ and aamarPay are the current hosted-payment strategies.
- Courier implementations use a provider-neutral adapter registry; Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee are current candidates, while launch approval still requires one proven provider.
- Customer accounts, saved addresses, product requests, support chat, moderated YouTube reviews, services, warranty, store pickup, delivery personnel, and consented public purchase activity are now part of the product scope.

---

## 33. Open Decisions Requiring Product Owner Approval

These decisions do not prevent the PRD baseline but must be resolved before the relevant implementation milestone:

1. Exact Release 1 product categories and variant model.
2. Which implemented prepaid provider is enabled at first public launch and whether another provider is kept as failover.
3. Which implemented courier is primary at launch, with approved service-area, pricing, callback/polling, and failover rules.
4. COD verification method: call, OTP, WhatsApp confirmation, risk-based combination, or manual policy.
5. Stock reservation timing for COD and prepaid orders.
6. Return windows and product/category exceptions.
7. Delivery fee matrix and free-delivery rules.
8. Product-cost source and contribution-cost allocation policy.
9. Initial staff roles and approval thresholds.
10. Initial transactional channel priority and fallback.
11. Customer-facing Bangla/English content strategy.
12. Data retention and deletion periods after legal/business review.
13. Hosting providers and recovery objectives.
14. Mobile distribution, privacy disclosures, and store-release ownership for Android/iOS.
15. Exact SaaS plans, pricing, trial, grace period, usage limits, and entitlement matrix.
16. Tenant database hosting topology: same cluster/separate databases, database pools, or higher-isolation enterprise placement.
17. Prisma connection-manager pool limits, eviction TTL, and scaling thresholds.
18. Whether customer identity is global across storefronts or tenant-local from the customer's perspective, including privacy impact.
19. Whether tenant staff authentication is fully central with memberships or partly tenant-local.
20. Custom-domain launch release and DNS/TLS automation provider.
21. Tenant backup retention, restore SLA, cancellation/offboarding retention, and deletion policy.
22. Subscription payment provider and automated renewal/dunning policy.
23. Whether the mobile app supports multiple tenant stores in one app or tenant-branded distributions later.

Each approved decision should be recorded in a decision log and reflected in acceptance tests.

---

## 34. Future Decision Triggers

Introduce additional infrastructure only when a trigger is observed:

| Capability | Trigger |
|---|---|
| Typesense/OpenSearch | PostgreSQL cannot meet measured search relevance or latency needs |
| Analytics warehouse | Operational PostgreSQL reporting harms workloads or retention/volume exceeds practical bounds |
| Kafka/event streaming | Durable replay, event volume, or many independent consumers justify operational cost |
| Microservice extraction | Independent teams/deployments, fault isolation, or scaling needs outweigh monolith simplicity |
| Kubernetes | Deployment count and operational scale justify dedicated orchestration expertise |
| Dedicated warehouse app | Scanner/device workflow and warehouse throughput cannot be served well in Admin Web |
| Separate delivery-partner app | Delivery volume and workforce workflow cannot be served safely by the current assigned-personnel surface |
| AI personalization | Clean data volume, measurable baseline, evaluation plan, and human policy are available |
| Multiple warehouses | Real inventory routing and fulfillment demand exists |
| Multi-vendor marketplace | Separate business approval accepts major seller, offer, settlement, and dispute redesign |
| Tenant DB placement tiers | Tenant count, DB size, compliance, or enterprise isolation requires multiple DB clusters |
| Dedicated control-plane service | Platform provisioning/billing workloads need independent deployment or scaling |
| Central analytics warehouse | Cross-tenant aggregate reporting can no longer be served safely from approved read models |

---

## 35. Definition of Done

A feature is done only when:

- tenant/control-plane data ownership is explicitly defined;
- cross-tenant negative tests exist where tenant data is involved;
- entitlement/usage behavior is defined for plan-gated features;
- product acceptance criteria are met;
- server-side validation and authorization exist;
- loading, empty, success, error, and retry states are designed;
- accessibility requirements are met for the feature's critical path;
- analytics events are defined and verified;
- sensitive actions are audited;
- tests appropriate to risk pass;
- logs and operational metrics support diagnosis;
- documentation and configuration are updated;
- rollback or safe-disable behavior exists where risk warrants it;
- no mock data or placeholder provider behavior remains in the production path;
- design review confirms Ferio design-language compliance.

---

## 36. Glossary

| Term | Meaning |
|---|---|
| AOV | Average order value |
| CAC | Customer acquisition cost |
| CAPI | Meta Conversions API |
| COD | Cash on delivery |
| Contribution | Revenue after defined variable costs, not necessarily accounting profit |
| CRM | Customer relationship management |
| Customer 360 | Unified customer identity, commerce, consent, engagement, and value view |
| Idempotency | Repeating a request/event safely without duplicating its business effect |
| LTV | Customer lifetime value |
| OMS | Order management system |
| RFM | Recency, frequency, monetary segmentation |
| RMA | Return merchandise authorization |
| RTO | Return to origin after unsuccessful delivery |
| SKU | Stock keeping unit |
| Source of truth | Authoritative durable record for a class of data |
| SaaS tenant / Organization | Independent business workspace subscribing to Ferio; not the business's end customer |
| Tenant database | Isolated PostgreSQL database holding one organization's operational commerce data |
| Control plane | Platform domain for organizations, subscriptions, domains, provisioning, DB registry, usage, and Ferio operations |
| Tenant context | Trusted server-side request/job context identifying the organization and operational database |
| Entitlement | Server-enforced capability or usage limit granted by plan/subscription/override |
| Provisioning | Idempotent workflow that creates and activates resources for a SaaS organization |
| Tenant migration orchestration | Controlled rollout of schema migrations across isolated tenant databases |
| Platform Admin | Ferio operator role, separate from a tenant business's Owner/Admin role |
| Transactional message | Communication necessary to perform or update a requested transaction |
| Promotional message | Marketing communication requiring applicable consent and policy compliance |

---


## 36A. SaaS Architecture Baseline

### 36A.1 Logical topology

```text
                              FERIO
                                │
                    ┌───────────┴───────────┐
                    │                       │
              CONTROL PLANE           TENANT RUNTIME
                    │                       │
          Control PostgreSQL               │
          ├── Organizations                │
          ├── Domains                      │
          ├── Plans                        │
          ├── Subscriptions                │
          ├── Entitlements                 │
          ├── Tenant DB Registry           │
          ├── Provisioning                 │
          ├── Migration Fleet              │
          └── Platform Audit               │
                                            │
                                  Host / Membership Resolution
                                            │
                                   Tenant DB Connection Manager
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
               Tenant DB A             Tenant DB B             Tenant DB C
               Business A              Business B              Business C
               ├── Catalog             ├── Catalog             ├── Catalog
               ├── Customers           ├── Customers           ├── Customers
               ├── Orders              ├── Orders              ├── Orders
               ├── Inventory           ├── Inventory           ├── Inventory
               ├── Payments            ├── Payments            ├── Payments
               ├── Shipping            ├── Shipping            ├── Shipping
               ├── CRM                 ├── CRM                 ├── CRM
               └── Audit               └── Audit               └── Audit
```

### 36A.2 Request resolution

```text
Request to fashionhub.ferio.com
            ↓
Normalize Host
            ↓
Lookup verified TenantDomain
            ↓
Load Organization state
            ↓
Authenticate identity if required
            ↓
Validate membership/permission for staff
            ↓
Evaluate subscription entitlement
            ↓
Resolve TenantDatabase registry entry
            ↓
Acquire bounded tenant Prisma context
            ↓
Execute tenant-scoped application service
```

### 36A.3 Mandatory isolation invariant

For every tenant-scoped operation:

```text
ResolvedTenant(request/job/event)
=
TenantOfDatabaseConnection
=
TenantOfAuthorizationScope
=
TenantOfCache/Job/Storage namespace
```

A mismatch is a security error and must fail closed.

### 36A.4 Database-per-tenant operational requirements

- do not create a Prisma client per request;
- bound/cap cached tenant clients and connections;
- evict inactive clients safely;
- expose DB health/schema version to Platform Admin;
- canary schema migrations before broad rollout;
- isolate failed migrations;
- support tenant-specific backup and restore;
- preserve data through suspension/cancellation under retention policy;
- never expose tenant database credentials to tenant users.

### 36A.5 Platform vs tenant billing

```text
BUSINESS → pays Ferio → SaaS Subscription
CUSTOMER → pays Business → Commerce Order
```

These flows use separate models, reconciliation, permissions, reports, and audit domains.

### 36A.6 SaaS growth path

Initial SaaS:

```text
Tenant subdomain
1 warehouse
Core commerce
Staff/RBAC
Basic plan limits
```

Later:

```text
Custom domains
Additional warehouses
Advanced CRM/automation
External API/webhooks
Advanced reports
Higher storage/staff/order limits
Enterprise DB placement/restore targets
```

Multi-vendor marketplace remains a separate future product decision.

---

## 37. Final Product Standard

Ferio succeeds when it is not merely a visually polished shop or an impressive architecture diagram. It succeeds when:

- customers can buy confidently on mobile;
- staff can fulfill orders without losing state or stock;
- COD, courier, return, refund, and settlement exceptions are visible and recoverable;
- customer identity and consent stay under the business's control;
- retention messages are relevant, permitted, and measurable;
- delivered-order contribution improves over time;
- the system remains simple enough for the team to understand and operate.
- developed convenience, merchandising, support, wallet, service, warranty, pickup, and rider-delivery capabilities remain available without weakening tenant isolation.

The approved product goal is:

> Build one reliable multi-tenant commerce platform that can provision and isolate independent businesses, give each business an excellent branded storefront and powerful role-based back office, preserve the integrity of the existing Ferio commerce engine, and scale SaaS operations without sacrificing tenant security, financial correctness, or operational understandability.
