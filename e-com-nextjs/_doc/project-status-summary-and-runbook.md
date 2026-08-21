# Ferio Project Status Summary and Engineering Runbook

**Status basis:** Implementation checklist, PRD, and project checkpoints 57 through 103

**Evidence cutoff:** August 21, 2026 (`project-progress-103.md`)

**Release position:** Release 1 is broadly implemented but is **not launch-ready**

**Active engineering scope:** NestJS backend, Customer Web, and Admin Web

**Deferred active work:** Expo mobile application; preserve it, but do not treat mobile parity as complete

---

## 1. Purpose

This document is the consolidated handoff for the Ferio project. It records:

- what is implemented and validated;
- what is partial, blocked, deferred, or still requires proof;
- which decisions and credentials require product-owner action;
- how to install, run, build, lint, and test each application;
- the recommended order for completing Release 1.

The implementation checklist remains the authoritative item-by-item tracker. The PRD remains the authoritative product and acceptance contract. This document is a readable status and operating guide, not a replacement for either source.

---

## 2. Repository Map

| Application | Location | Stack | Local URL |
| --- | --- | --- | --- |
| Backend API | `ferio-nest-prisma/` | NestJS 11, Prisma 7, PostgreSQL, Redis, BullMQ | `http://localhost:6733/api/v1` |
| Customer Web | `ferio-customer-web/` | Next.js 14 App Router | `http://localhost:3002` |
| Admin Web | `ferio-admin-dashboard/ferio-admin/` | Next.js 14 App Router | `http://localhost:3001` |
| Customer Mobile | `ferio-mobile-expo54/` | Expo SDK 54, React Native | Expo development server |
| Product documentation | `_doc/` | Markdown, Mermaid, reference images | Not applicable |

The active architecture is a modular NestJS monolith. PostgreSQL is the system of record, Prisma is the data layer, Redis supports cache/session/OTP concerns, and BullMQ handles background jobs. Payment, courier, storage, and communication integrations remain behind provider boundaries rather than being embedded directly in commerce services.

---

## 3. Executive Status

### 3.1 Overall assessment

Ferio has moved beyond a prototype. Core commerce, protected administration, post-purchase operations, and several extended customer features are implemented across the backend and both Web applications. The most recent recorded validation passed:

- Backend production build;
- Backend full unit suite: **59 suites and 207 tests**;
- Customer Web production build and type validation: **61 generated routes**;
- Admin Web production build and type validation: **93 generated routes**;
- workspace `git diff --check`.

These are checkpoint-103 results, not a substitute for rerunning validation against the current working tree.

### 3.2 Release readiness

| Area | Status | Summary |
| --- | --- | --- |
| Architecture and core data | Mostly complete | Modular backend, PostgreSQL/Prisma, Redis/BullMQ, migrations, audit conventions, and core provider abstractions exist. |
| Authentication and authorization | Mostly complete | Customer/Admin auth, registration, Google OAuth, refresh rotation, permissions, staff accounts, and TOTP exist; production email proof and browser E2E remain. |
| Catalog through COD ordering | Implemented | Catalog, variants, inventory, cart, checkout, coupons, COD orders, reservations, transitions, and operational views are connected. |
| Prepaid payments | Implemented, proof pending | Abstract gateway with SSLCommerz and aamarPay exists; real sandbox scenarios and launch-provider approval remain. |
| Fulfillment and courier | Implemented, proof pending | Warehouse workflow and six courier candidates exist; one courier must be selected and proven end to end. |
| Returns, refunds, RTO, reconciliation | Mostly complete | Operational flows and evidence exist; provider-native execution/imports and broader integration proof remain. |
| Customer/Admin design language | Substantially complete | Core and high-risk retained screens were audited; remaining routes and manual accessibility/device checks remain. |
| Observability and recovery | Partial | Correlation, structured logs, health, queue evidence, and alerts exist; external transport, retention, backups, and restore proof remain. |
| Automated validation | Strong unit baseline | 207 backend unit tests pass at the evidence cutoff; full browser E2E, combined stack, provider sandbox, and broader DB integration remain. |
| Mobile | Deferred/partial | Major screens and contracts exist, but device, deep-link, provider, offline, and end-to-end parity are not release-proven. |

---

## 4. Completed Scope

### 4.1 Backend platform and security

- NestJS modular-monolith structure with Prisma/PostgreSQL, Redis, BullMQ, validation, Swagger, health checks, and environment templates.
- Customer email registration and verification, password login, Google Identity sign-in, password reset, protected Admin login, logout, refresh-token rotation/revocation, and account lockout.
- Fifteen-minute access-token and seven-day refresh-token lifecycle for Web clients.
- Server-owned roles and explicit permissions across active Release 1 controllers, including owner Admin, delegated staff, customer, guest, and delivery-person boundaries.
- Staff invitation, activation/deactivation, reset, session-version revocation, permission assignment, and optional TOTP two-factor authentication.
- Same-origin Customer BFF protections, HTTP-only Web sessions, safe retry-once refresh behavior, and hardened guest/customer chat authorization.
- Stable machine-readable errors, cross-system correlation IDs, secret-safe structured JSON logging, privacy-safe security events, and coded Customer/Admin BFF failures.
- Audit records for sensitive catalog, inventory, order, payment, shipping, return, refund, reconciliation, settings, staff, and reporting operations.
- Backend-enforced feature flags for staged prepaid, purchase activity, service booking, warranty submission, and storefront analytics rollout.

### 4.2 Catalog, inventory, and storefront

- Categories, brands, products, variants, SKUs, attributes, media ordering, SEO fields, publication lifecycle, and new/second-hand product condition snapshots.
- Single-warehouse on-hand, reserved, available, damaged, and incoming stock with immutable movement records.
- Admin product/category/brand creation and maintenance, stock adjustments, discrepancy views, movement history, and archive/publish controls.
- Public category/product APIs, product listing/detail, search, filters, sorting, availability, delivery/return information, sitemap, metadata, and Open Graph support.
- Durable privacy-safe product-view, search, filter, and add-to-cart analytics.
- Moderated product-linked YouTube reviews and product review banners.
- Backend-driven support contacts, policy links, delivery coverage, and production-safe empty states instead of fabricated fallback content.

### 4.3 Cart, checkout, customers, and orders

- Persistent opaque guest cart, quantity/variant edits, server-side price and stock validation, and safe cart merge after verified login/OAuth/email verification.
- Customer profile, multiple saved addresses, immutable order address snapshots, verified order linking, and paginated order history.
- Bangladesh phone normalization, district/area/address capture, delivery zones and fees, marketing consent separation, attribution, customer notes, and policy acceptance.
- Deterministic server-owned fixed/percentage coupons with validity windows, minimums, caps, snapshots, and placement-time revalidation.
- Server-calculated subtotal, discount, delivery charge, payment charge, and final total.
- Idempotent COD placement without relying exclusively on `window.crypto.randomUUID`, plus human-readable order references.
- Immutable order-item/product/address snapshots and separate order, payment, fulfillment, shipment, return, and refund states.
- Confirmation-time serializable stock reservation, oversell prevention, cancellation release, reasoned transitions, and append-only lifecycle evidence.
- Admin order discovery, detail, call/confirmation controls, fulfillment operations, courier handover, customer profiles, and unified investigation timeline.

### 4.4 Prepaid payments

- OOP payment implementation based on an abstract payment gateway and registry.
- Configuration-gated SSLCommerz and aamarPay hosted-payment strategies.
- Durable attempt, merchant/provider reference, callback, validation, outcome, expiry, refund, and processing evidence.
- Hosted redirect initiation plus success, failure, cancellation, and IPN/callback handling.
- Idempotent callback processing with amount, currency, order, provider, expected-state, and risk verification.
- Safe same-order retry and expiry recovery without creating duplicate orders.
- Admin provider readiness, payment ledger, filters, detail evidence, recovery operations, and audited restriction of manual payment-state changes.

### 4.5 Fulfillment, delivery, and post-purchase operations

- Fulfillment queues and pick, pack, quality-check, ready-for-handover, handed-over, shortage, and substitution workflows.
- Provider-neutral courier registry with Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee candidates.
- Deterministic courier recommendation/scorecard, provider readiness, shipment creation, tracking, labels/references, callback attempts, polling fallback, and queue health.
- Authenticated, deduplicated courier events with normalized shipment states and bounded retry/recovery controls.
- RTO evidence and physical inspection workflows.
- Store locations, click-and-collect, PAY_AT_STORE support, pickup lifecycle, and OTP-verified handover.
- Delivery-person applications, approval, assignment, authorized location updates, and private Admin live-map evidence.
- Return request/review/inspection and refund instruction/result workflows with separate states and audit history.
- COD collections, settlement recording, canonical CSV preflight/import, reconciliation findings, scan history, resolution actions, and operational alerts.

### 4.6 Extended customer and operations features

- Guest and authenticated customer live chat with persisted messages, scoped socket rooms, verified short-lived socket tickets, staff access, folders, and quick replies.
- Product-request submission and Admin lifecycle management.
- Category-scoped service creation and customer service booking with immutable service snapshots.
- Customer warranty eligibility verification, exact order-item selection, issue details, image evidence upload, submission, and history.
- Admin warranty search, pagination, customer/item evidence, append-only timeline, and received/repaired/brand/resolved/rejected lifecycle transitions.
- Consent-controlled real-order purchase activity, four-second visitor toast, masked customer/locality display, paginated global history, and Admin visibility/timing/exclusion settings.
- Active visitor aggregates, reporting overview, permission-aware order CSV export, dashboard views, system health, and critical operational alerts.
- Versioned transactional notification templates, immutable outbox snapshots, configured priority/fallback logic, attempt evidence, queue health, and audited retry controls.

### 4.7 Design-language work completed in checkpoints 89–103

- Shared Customer and Admin shells.
- Customer checkout, account/profile/addresses, product detail, and warranty submission/history.
- Admin catalog, chat, delivery map, delivery personnel, orders, prepaid payments, shipping/RTO, returns/refunds, reconciliation/COD settlements, and warranty claims.
- Flat restrained visual hierarchy, semantic status styling, visible focus treatment, reduced-motion-safe skeletons, resilient partial loading, calm empty/error states, and replacement of blocking browser prompts on audited screens.

---

## 5. Checkpoint 57–103 Summary

| Checkpoints | Delivered milestone group |
| --- | --- |
| 57–59 | Real-time chat integration and authorization hardening; initial mobile contract/session parity. |
| 60–67 | Web session hardening, credential containment, correlation IDs, machine-readable errors, and complete Admin BFF error normalization. |
| 68–74 | Structured/security logging, full active permission boundaries, delegated staff access workflows, and optional Admin/staff TOTP. |
| 75–80 | Deterministic coupons, verified cart merge, consent-safe abandoned-cart eligibility, storefront analytics, audited exports, and staged feature flags. |
| 81–88 | Restricted payment transitions, payment ledger, transactional templates, unified order timeline, operational alerts, role-aware dashboards, system health, and PRD unit-test hardening. |
| 89–96 | Shared-shell and high-priority Customer/Admin design-language audits through delivery-person operations. |
| 97–103 | Admin order/payment/shipping/RTO/returns/refunds/reconciliation/settlement/warranty audits and polished Customer warranty workflow. |

---

## 6. Remaining Release 1 Work

### 6.1 Critical launch blockers

- Select the prepaid provider enabled at first launch and decide whether the second implementation is disabled or used as failover.
- Supply approved sandbox and production credentials for the selected payment provider, then prove success, failure, cancellation, replay, expiry, and retry.
- Select one primary courier and approve service areas, pricing, callback versus polling behavior, and failover rules.
- Supply courier sandbox/production credentials and prove creation, webhook authentication/replay, polling, delivery, failure, outage, RTO, COD collection, settlement, and correction behavior.
- Revoke/rotate the previously exposed CarryBee credential at the provider and verify the deployed environment uses only the replacement secret.
- Configure production object storage/Cloudinary and approve evidence/media retention and deletion periods.
- Configure and prove production email/transactional messaging delivery for staff invitations, authentication mail, and customer operational notifications.
- Configure automated database backups, protect uploaded objects, document recovery objectives, and complete one restore exercise.
- Resolve or explicitly accept all critical/high security findings before beta.

### 6.2 Product-owner decisions required

- Release 1 category hierarchy and variant model.
- COD verification method and thresholds.
- Stock-reservation timing policy for COD and prepaid orders.
- Return windows and category/product exceptions.
- Warranty duration and brand/category/product coverage rules.
- Delivery fee matrix and free-delivery thresholds.
- Product-cost source and contribution allocation formula.
- Initial delegated staff roles and approval thresholds.
- Transactional channel priority and fallback.
- Bangla/English customer-content policy.
- Data and evidence retention/deletion periods.
- Hosting providers, backup ownership, recovery point objective, and recovery time objective.
- Whether selectable checkout map location is useful enough to include.

### 6.3 Engineering work still partial

- Finish shared domain contracts for later commerce modules.
- Connect production object storage/S3-compatible product media delivery.
- Expand database integration coverage for catalog/media and cart/checkout calculations.
- Add Banglish/transliteration search normalization if approved for Release 1.
- Finish payment-provider sandbox proof and prepaid-provider reconciliation comparison.
- Finish selected-courier native status calls, provider-native report mappings/API retrieval, printable labels/AWB where supported, and real callback/polling proof.
- Add a real transactional communication provider adapter and verify live outcomes.
- Implement replacement/exchange fulfillment if it remains a Release 1 requirement; current post-purchase flow is refund-oriented.
- Add direct provider refund execution if required; current workflow records instructions and results.
- Add orphan warranty-upload cleanup when evidence upload succeeds but claim creation later fails.
- Add warranty status notifications and optional pickup/return logistics after policy approval.
- Add capacity-aware pagination before reconciliation/settlement/import history reaches current bounded limits.
- Complete the remaining route-by-route design-language review and every loading, empty, success, validation, failure, and retry state.
- Complete external log transport, retention, error tracking, durable metrics storage, infrastructure alert transport, and independent backup-job verification.

### 6.4 Required automated and manual proof

- Run one combined API stack against disposable PostgreSQL and Redis.
- Apply migrations and seed an Admin in a disposable environment using the standard runbook.
- Add browser-level Admin login, refresh, logout, permission, and TOTP checks.
- Complete browse-to-COD and browse-to-prepaid end-to-end tests.
- Complete Admin confirmation-to-delivery and return-to-refund end-to-end tests.
- Complete guest-to-Admin and authenticated-customer-to-Admin multi-client chat E2E.
- Test Bangla, English, and mixed names/addresses through checkout, fulfillment, purchase activity, warranty, and support flows.
- Test keyboard use, visible focus, screen readers, touch, narrow tables, mobile browsers, reduced motion, constrained networks, large evidence files, and real images.
- Measure the PRD performance targets for catalog reads, Admin reads, and order placement under expected launch load.
- Run an operational provider-outage and reconciliation tabletop exercise.
- Run internal alpha with a real catalog subset, then controlled beta with one warehouse, one courier, COD, and the selected prepaid policy.

### 6.5 Explicitly deferred

- Active Mobile App hardening is deferred until the backend and two Web applications complete launch proof. Existing mobile work still needs contract tests, device E2E, payment-return deep links, expiry/revocation/offline recovery, and store-release decisions.
- Release 2 CRM, consent-center, segmentation, campaign automation, marketing suppression/frequency controls, Meta integration, lifecycle contribution, and wishlist/review extensions remain deferred.
- Release 3 dedicated search infrastructure, recommendations, advanced risk scoring, AI features, analytics warehouse, dynamic courier optimization, additional warehouses, and service extraction remain deferred.

---

## 7. Recommended Completion Order

1. Record all owner decisions in a decision log and update PRD/checklist acceptance tests.
2. Select one payment provider and one courier; obtain sandbox credentials first.
3. Run the combined PostgreSQL/Redis stack, migration, seed, and authentication browser smoke tests.
4. Prove payment and courier sandbox matrices, including replay, outage, retry, and reconciliation.
5. Complete COD/prepaid/delivery/return browser E2E and multi-client chat E2E.
6. Configure production email, storage, logs/error tracking, backups, alerts, and restore proof.
7. Finish remaining Web route states, accessibility, device, network, and performance checks.
8. Resolve/accept security findings, run internal alpha, then run controlled beta.
9. Re-evaluate every PRD Release 1 exit criterion before enabling general launch flags.

---

## 8. Local Prerequisites

- Node.js compatible with the committed lockfiles and project dependencies. The latest recorded local toolchain was Node `v24.19.0` and pnpm `9.12.3`; CI/production should pin an approved version rather than relying on an operator's global installation.
- pnpm.
- PostgreSQL with a development database.
- Redis 6.2 or newer for supported BullMQ operation.
- Provider credentials only for integrations being exercised; providers remain disabled when required credentials are absent.
- Separate Customer and Admin origins in the backend CORS configuration.

No repository-managed Docker Compose file was found at the evidence cutoff. PostgreSQL and Redis must therefore be started through the developer's local service manager, containers, or managed development services.

Check tool versions:

```bash
node --version
pnpm --version
psql --version
redis-server --version
```

---

## 9. First-Time Setup

Run from the repository root.

### 9.1 Backend

```bash
cd ferio-nest-prisma
cp .env.example .env
pnpm install
pnpm run prisma:sync
pnpm run prisma:migrate:status
pnpm run prisma:migrate:dev
pnpm run prisma:seed
```

Before seeding, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `ferio-nest-prisma/.env`. Use `prisma:migrate:dev` only for local development. For staging or production, build the composed schema/client and deploy committed migrations instead:

```bash
cd ferio-nest-prisma
pnpm install --frozen-lockfile
pnpm run prisma:sync
pnpm run prisma:migrate:deploy
pnpm run prisma:seed
```

### 9.2 Customer Web

```bash
cd ferio-customer-web
cp .env.example .env.local
pnpm install
```

Set `FERIO_API_URL`, `NEXT_PUBLIC_FERIO_API_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` as required.

### 9.3 Admin Web

```bash
cd ferio-admin-dashboard/ferio-admin
cp .env.example .env.local
pnpm install
```

Set the server-only `FERIO_API_URL` to the backend base URL.

### 9.4 Mobile, when work resumes

```bash
cd ferio-mobile-expo54
cp .env.example .env
pnpm install
pnpm run fix-deps
pnpm run doctor
```

Set `EXPO_PUBLIC_FERIO_API_URL` to a URL reachable by the device. A physical phone cannot use the development computer's `localhost`; use the computer's LAN address or a secure development tunnel.

---

## 10. Run the Projects

Start PostgreSQL and Redis first, then use separate terminals.

### Terminal 1 — Backend API

```bash
cd ferio-nest-prisma
pnpm run start:dev
```

Useful backend endpoints:

- API: `http://localhost:6733/api/v1`
- Swagger: `http://localhost:6733/api/docs`
- Health: `http://localhost:6733/api/v1/health`

### Terminal 2 — Customer Web

```bash
cd ferio-customer-web
pnpm run dev
```

Open `http://localhost:3002`.

### Terminal 3 — Admin Web

```bash
cd ferio-admin-dashboard/ferio-admin
pnpm run dev
```

Open `http://localhost:3001`.

### Terminal 4 — Mobile, when work resumes

```bash
cd ferio-mobile-expo54
pnpm start
```

Alternative Expo commands:

```bash
pnpm run android
pnpm run ios
pnpm run web
```

---

## 11. Validation Commands

### 11.1 Backend standard validation

```bash
cd ferio-nest-prisma
pnpm run prisma:sync
pnpm run build
pnpm test -- --runInBand
```

Coverage and watch modes:

```bash
pnpm run test:cov -- --runInBand
pnpm run test:watch
```

Run a focused Jest file or matching suite while developing:

```bash
pnpm exec jest path/to/example.spec.ts --runInBand
pnpm exec jest --testNamePattern="payment" --runInBand
```

The backend lint script applies fixes and can modify files. Review the diff after running it:

```bash
pnpm run lint
pnpm run format
git diff --check
```

### 11.2 PostgreSQL integration tests

The test database name must contain `_test_`, start with `test_`, or end with `_test`; the test guard rejects normal development/production database names.

```bash
cd ferio-nest-prisma
TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/ferio_test_local' \
  pnpm run test:integration
```

Never point `TEST_DATABASE_URL` at a development, staging, or production database containing valuable data.

### 11.3 Redis/BullMQ smoke tests

Use a disposable Redis instance on a non-default test port and an isolated queue prefix:

```bash
cd ferio-nest-prisma
TEST_REDIS_PORT=6389 \
TEST_QUEUE_PREFIX='ferio:test:reconciliation' \
  pnpm run test:queue-smoke
```

### 11.4 Backend E2E suite

```bash
cd ferio-nest-prisma
pnpm run test:e2e
```

The script exists, but Release 1 browser/provider journey coverage remains incomplete. Passing this command alone does not close the checklist's browse-to-order, delivery, return/refund, or provider-sandbox gates.

### 11.5 Customer Web validation

```bash
cd ferio-customer-web
pnpm exec tsc --noEmit
pnpm run build
pnpm run lint
```

Run the production server after a successful build:

```bash
pnpm run start -- -p 3002
```

The package's default `start` script does not pin port 3002, so pass `-p 3002` when the Admin application is also running.

### 11.6 Admin Web validation

```bash
cd ferio-admin-dashboard/ferio-admin
pnpm exec tsc --noEmit
pnpm run build
pnpm run lint
```

Run the production server:

```bash
pnpm run start
```

### 11.7 Mobile validation, when work resumes

```bash
cd ferio-mobile-expo54
pnpm run typecheck
pnpm run doctor
```

### 11.8 Full current Web/backend validation sequence

```bash
cd ferio-nest-prisma
pnpm run prisma:sync
pnpm run build
pnpm test -- --runInBand

cd ../ferio-customer-web
pnpm exec tsc --noEmit
pnpm run build

cd ../ferio-admin-dashboard/ferio-admin
pnpm exec tsc --noEmit
pnpm run build

cd ../..
git diff --check
```

Add lint separately because backend lint/format commands can modify files.

---

## 12. Environment Configuration Groups

Do not store real credentials in this document, screenshots, progress files, commits, or frontend environment variables.

### Backend core

- Application: `NODE_ENV`, `PORT`, `API_PREFIX`.
- Data: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`.
- Security: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, token expiries, OTP settings, bcrypt settings, analytics hash secret, TOTP encryption/challenge secrets.
- Origins: `CUSTOMER_WEB_URL`, `ADMIN_WEB_URL`, `PUBLIC_API_URL`.
- Seed: `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### External integrations

- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
- Email: SMTP host, port, username, password, and sender.
- Payment: SSLCommerz and aamarPay base URLs and credentials.
- Courier: Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee credentials/webhook secrets.
- Uploads: selected file-upload strategy plus Cloudinary or S3-compatible credentials.
- Workers: payment recovery, courier callback retry/polling, reconciliation, and transactional-message scheduling settings.
- Operations: log level/format and health configuration.

Use `ferio-nest-prisma/.env.example` as the complete variable inventory.

---

## 13. Smoke-Test Checklist

After starting the three active applications:

- Confirm Backend health and Swagger load.
- Register a customer, verify email, sign in, refresh the session, and sign out.
- Verify Google sign-in only after the configured client ID and origin are approved.
- Browse categories/products, search/filter, add a variant, edit cart quantity, and reload the cart.
- Preview checkout and place one idempotent COD test order.
- Sign in to Admin, find the order, confirm it, and inspect reservation/timeline evidence.
- Exercise pick, pack, quality check, handover, and a fake/sandbox shipment only when the selected provider is configured.
- Exercise prepaid initiation/callback only with sandbox credentials and verify no duplicate order/payment is created on replay.
- Submit and moderate a YouTube review, service booking, product request, chat message, and warranty claim.
- Verify guest chat cannot read another guest/customer conversation and cannot self-assign Admin privileges.
- Verify purchase-activity UI uses only eligible consented real-order evidence and obeys Admin visibility settings.
- Verify returns, refunds, RTO, settlements, reconciliation findings, alerts, and audit history remain separate and append-only.

---

## 14. Launch Gate Checklist

Release 1 should remain disabled for general launch until all items below are evidenced:

- [ ] Owner decisions are approved and reflected in settings/tests.
- [ ] One payment provider passes the complete sandbox matrix and production credential check.
- [ ] One courier passes creation, callback/polling, delivery, outage, RTO, COD, and settlement proof.
- [ ] CarryBee credential rotation and deployed verification are complete.
- [ ] Production email, upload storage, log/error transport, alerts, and retention are configured.
- [ ] Automated backups and one restore exercise are documented.
- [ ] Combined PostgreSQL/Redis stack validation passes from a clean migration and seed.
- [ ] COD, prepaid, fulfillment/delivery, return/refund, and chat E2E journeys pass.
- [ ] Remaining Web states, accessibility, device, network, mixed-language, and performance checks pass.
- [ ] Critical/high security findings are closed or explicitly accepted.
- [ ] Internal alpha and controlled beta complete with incident/reconciliation review.
- [ ] Every PRD section 26.1 exit criterion is checked against current production-like evidence.

---

## 15. Source Documents

- `_doc/product-requirement-document-PRD.md` — product requirements, state models, NFRs, exit criteria, and product decisions.
- `_doc/implementation-checklist-and-schedule.md` — authoritative implementation checklist and release schedule.
- `_doc/design-language.md` — visual and interaction language.
- `_doc/project-progress-57.md` through `_doc/project-progress-103.md` — implementation and validation evidence used by this summary.
- `ferio-nest-prisma/.env.example` and `ferio-nest-prisma/package.json` — backend configuration and executable scripts.
- `ferio-customer-web/.env.example` and `ferio-customer-web/package.json` — Customer Web configuration and scripts.
- `ferio-admin-dashboard/ferio-admin/.env.example` and `ferio-admin-dashboard/ferio-admin/package.json` — Admin Web configuration and scripts.
- `ferio-mobile-expo54/.env.example` and `ferio-mobile-expo54/package.json` — deferred mobile configuration and scripts.

---

## 16. Maintenance Rule

After each meaningful development checkpoint:

1. append a new numbered `project-progress-<N>.md` file;
2. update item status and evidence in the implementation checklist;
3. update the PRD only when product scope, requirements, decisions, or acceptance criteria change;
4. update this document when the overall release status, run commands, prerequisites, major completed groups, or launch blockers change;
5. never mark provider, accessibility, backup, security, or end-to-end work complete from compilation or unit tests alone.
