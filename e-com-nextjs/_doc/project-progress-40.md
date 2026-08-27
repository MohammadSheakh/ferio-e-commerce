# Ferio Project Progress 40

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Provider-neutral courier polling and outage controls  
**Status:** Courier polling now has durable attempts, source-tagged provider evidence, shared normalized shipment rules, bounded BullMQ cadence/backoff, terminal stop rules, queue health, and Admin visibility without inventing Pathao or Steadfast API contracts

## Delivered

### Provider-neutral polling contract

- Extends the courier adapter boundary with polling configuration and a provider-neutral tracking identity input.
- Requires a configured adapter polling implementation before a shipment can be queued.
- Keeps Pathao and Steadfast polling explicitly unavailable until real status endpoints and payload contracts are confirmed.
- Exposes provider polling readiness separately from shipment-creation credential readiness.

### Durable poll lifecycle

- Adds queued, processing, succeeded, failed, and skipped poll-attempt states with correlation, queue, raw response, normalized status, error, timing, shipment, and operator evidence.
- Adds shipment-level last/next poll time, consecutive failure count, and current polling error.
- Tags retained provider evidence as webhook or poll while keeping callback evidence lists callback-only.
- Applies poll results through the existing normalized shipment event path, preserving out-of-order, transition, delivery, COD, RTO, inventory, message, and audit rules.

### Cadence and outage behavior

- Registers a dedicated courier polling BullMQ queue and configurable scheduler.
- Selects only active-provider, non-terminal, due shipments without queued or processing attempts.
- Stops polling after delivered, returned, cancelled, or RTO outcomes.
- Schedules successful non-terminal polls at a 15-minute cadence.
- Records provider failures durably and applies exponential 15-minute-to-6-hour backoff.
- Keeps polling disabled by default until deployment and provider contracts are approved.

### Admin operations

- Adds admin-guarded poll history, polling queue health, and manual shipment-poll endpoints.
- Audits operator-queued shipment polls.
- Adds authenticated Admin proxies for poll evidence, health, and manual polling.
- Extends Shipping with polling readiness, eligible count, cadence, guarded `Poll now` actions, and a hairline poll-evidence table using restrained semantic pills.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused shipping tests | Passed; 5 suites and 12 tests |
| Backend | Full unit tests | Passed; 24 suites and 85 tests |
| Backend | Production build | Passed |
| PostgreSQL | Full migration deployment | Passed; 23 of 23 migrations |
| PostgreSQL | Webhook and polling integration proof | Passed; 1 suite and 5 tests |
| Redis/BullMQ | Polling, callback, and reconciliation runtime smokes | Passed; 3 suites and 7 tests |
| Admin Web | Production build | Passed; 47 of 47 static pages generated |
| Cleanup | Disposable PostgreSQL and Redis removal | Passed; zero disposable infrastructure remains |

## Still Open

- Concrete Pathao and Steadfast polling calls remain blocked on verified sandbox endpoints, credentials, payloads, status fields, and rate limits.
- Real-provider outage, throttling, malformed-response, cancellation, and RTO polling scenarios remain pending sandbox access.
- Provider-native settlement report mappings and retrieval remain pending real samples and credentials.
- Automatic polling and callback recovery remain disabled by default pending deployment review.
- Local Redis 6.0.16 passes the smoke, but BullMQ recommends Redis 6.2 or newer.

## Recommended Next Work

1. Define transactional channel priority and fallback as a provider-neutral policy.
2. Persist channel selection, fallback reason, attempt order, and terminal outcome evidence.
3. Keep concrete SMS, WhatsApp, and email dispatch disabled until providers and consent rules are approved.
4. Expose operational health and failed-message recovery using the existing restrained Admin message view.

================================

# Ferio Project Progress 41

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Transactional channel routing and safe fallback controls
**Status:** The transactional outbox now has a versioned provider-neutral routing policy, immutable per-message route evidence, append-only attempts, definitive-failure fallback, uncertain-outcome duplicate protection, a durable BullMQ dispatch path, and Admin operational visibility while real delivery remains safely disabled

## Delivered

### Routing policy and provider boundary

- Adds an audited singleton transactional policy with ordered WhatsApp, SMS, and email channels, versioning, activation state, and definitive-failure fallback control.
- Adds a provider-neutral channel adapter contract and readiness registry without inventing SMS, WhatsApp, or email provider payloads.
- Allows priority to be recorded while refusing policy activation until at least one approved provider adapter is configured.
- Keeps deployment dispatch disabled by default through explicit environment configuration.

### Durable delivery evidence

- Snapshots the active channel plan and policy version onto each message before dispatch.
- Retains attempt order, selected channel, provider identity, provider message ID, request/response evidence, fallback reason, terminal reason, and timestamps.
- Falls back only after a definitive provider failure.
- Stops automatically on an unknown provider outcome so a timeout cannot broadcast duplicate customer messages across channels.
- Preserves prior attempts during audited operator retry while applying a fresh routing-policy snapshot.

### Queue and Admin operations

- Registers a dedicated transactional-message BullMQ queue with bounded retries, configurable sweeps, batch limits, and queue health.
- Adds admin-guarded policy, health, and retry endpoints with append-only audit evidence for policy changes and recovery actions.
- Extends the Messages workspace with routing status, provider readiness, eligible backlog, route/fallback evidence, terminal reasons, and guarded retry controls.
- Keeps recipients masked and provider payloads backend-only.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma composed-schema validation and client generation | Passed |
| Backend | Focused routing safety tests | Passed; 1 suite and 2 tests |
| Backend | Full unit suite | Passed; 25 suites and 87 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 48 of 48 static pages generated |

## Still Open

- Product-owner approval for exact transactional channel order and fallback policy remains blocked.
- Concrete WhatsApp, Bangladesh SMS, and email providers, credentials, template contracts, callback status mappings, and sandbox access remain pending.
- Live acceptance, delivery, rejection, throttling, timeout, duplicate, and provider-outage proof remains pending approved sandboxes.
- The new migration has schema validation and build proof but still requires application to the target deployment database.
- Transactional template content, locale strategy, versioning, and customer-facing normalized wording remain pending.

## Recommended Next Work

1. Add versioned transactional template governance for the existing Release 1 event triggers.
2. Define normalized customer-facing status language without exposing internal or provider codes.
3. Keep templates inactive until Bangla/English content and provider-specific approval requirements are decided.
4. Expose template readiness and missing-trigger coverage in the existing restrained Admin Messages workspace.

===================================

# Ferio Project Progress 42

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Prepaid payment foundation with SSLCommerz and aamarPay
**Status:** Customer Checkout now supports configuration-gated COD or hosted prepaid payment through SSLCommerz and aamarPay, backed by durable attempts, idempotent callback evidence, server-side provider verification, pre-redirect stock reservation, atomic paid-order confirmation, and an Admin payment ledger

## Delivered

### Provider-neutral payment lifecycle

- Adds dedicated commerce payment attempts and callback evidence instead of coupling orders to legacy subscription-payment records.
- Stores merchant transaction, provider/session/validation references, amount, currency, redirect, raw initiation and validation evidence, failure details, timing, and callback outcomes.
- Adds configuration-gated SSLCommerz and aamarPay adapters behind one hosted-payment contract.
- Uses official server-side initiation endpoints and provider validation/query APIs rather than trusting browser redirects or callback fields.

### Order and inventory safety

- Adds COD and prepaid checkout methods with a selected prepaid provider snapshot on the checkout draft.
- Creates prepaid orders as unpaid and pending instead of auto-confirming them through COD policy.
- Reserves stock transactionally before redirecting the customer, with a 30-minute expiry marker, so a provider charge cannot be followed by first-time stock discovery.
- Confirms the order, marks payment paid, and moves fulfillment readiness in one serializable transaction only after merchant transaction, amount, currency, provider status, order state, and SSLCommerz risk checks pass.
- Treats repeated successful callbacks as duplicates without repeating inventory or order effects.

### Customer and Admin Web

- Adds restrained checkout cards for COD, SSLCommerz, and aamarPay, showing prepaid only when credentials exist and the commerce setting is enabled.
- Redirects customers to each provider's hosted payment page; card, mobile-banking, and internet-banking options remain provider-owned.
- Adds a dedicated Admin Payments workspace showing provider readiness, recent attempts, merchant references, amounts, callbacks, failures, and terminal status.
- Allows prepaid activation in settings only after at least one provider has configured credentials.

## Verified Provider Contracts

- SSLCommerz hosted session, IPN, and mandatory order-validation flow: https://developer.sslcommerz.com/doc/v4/index.html
- aamarPay JSON initiation, hosted redirect, POST result fields, and sandbox contract: https://github.com/aamarpay-dev/aamarPay-nodejs

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma composed-schema validation and client generation | Passed |
| Backend | Provider adapter tests | Passed; SSLCommerz initiation and aamarPay server-query validation covered |
| Backend | Full unit suite | Passed; 26 suites and 89 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 21 of 21 pages generated |
| Admin Web | Production build | Passed; 51 of 51 pages generated |
| PostgreSQL | New migration deployment | Not run; no reachable local PostgreSQL service was available in this session |

## Still Open

- Real SSLCommerz and aamarPay sandbox credentials and an internet-reachable HTTPS callback URL are required for end-to-end payment proof.
- Sandbox success, failure, cancellation, IPN replay, risky SSLCommerz payment, amount mismatch, delayed callback, provider outage, and aamarPay query scenarios remain pending.
- Expired prepaid reservations need an automated release/recovery job and customer-facing retry path before launch.
- Provider refunds, settlement retrieval, reconciliation comparison, and audited manual payment correction remain pending.
- Production provider account approval, fees, allowed channels, callback allow-list guidance, and operational ownership remain product-owner decisions.

## Recommended Next Work

1. Add the expired-payment and reservation recovery worker with safe customer retry.
2. Apply the migration and run both providers through real sandboxes using public HTTPS callbacks.
3. Add provider payment reconciliation and refund adapters after sandbox payment completion is proven.
4. Complete Admin payment drill-down, expiry filters, and restricted manual recovery controls.

===========================

# Ferio Project Progress 43

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Abstract payment gateways and prepaid recovery
**Status:** Payments now use an abstract gateway with registered SSLCommerz and aamarPay strategies, while expired prepaid sessions have deterministic BullMQ recovery, stock release, secure same-order customer retry, re-reservation, and Admin queue controls

## Delivered

### Abstract gateway architecture

- Replaces the interface plus conditional provider selector with an abstract `PaymentGateway` base class and `PaymentGatewayRegistry`.
- Centralizes provider readiness, configuration access, minor-unit conversion, JSON response handling, and common initiation/validation contracts.
- Keeps SSLCommerz and aamarPay request construction, response parsing, and transaction-query behavior in dedicated subclasses.
- Makes additional gateways registerable without adding provider conditionals to the payment orchestration service.

### Expiry and reservation recovery

- Finds only unpaid initiating or pending attempts whose payment windows are due.
- Claims each attempt once before marking it expired.
- Releases active inventory reservations with inverse stock movements when the payment window expires.
- Marks the order payment failed without creating a duplicate replacement order.
- Re-reserves currently available stock on the same order before creating a fresh hosted payment attempt.
- Refuses successful payment confirmation after the original reservation expires, preventing paid-but-unavailable stock outcomes.

### Customer and Admin operations

- Adds rate-limited payment retry using order reference, verified Bangladesh phone, and the checkout-selected provider.
- Adds a restrained customer recovery page that explains re-verification and re-reservation before redirect.
- Returns failed and cancelled provider callbacks with the order reference so customers can reach recovery directly.
- Adds payment-recovery queue health, due-attempt count, scheduler state, and audited manual sweep controls to Admin Payments.
- Keeps automatic recovery disabled by default until deployment review.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused gateway and recovery tests | Passed |
| Backend | Full unit suite | Passed; 27 suites and 91 tests |
| Backend | Production build | Passed |
| Redis/BullMQ | Payment scheduler, due-job delivery, retry, and completion | Passed; 1 suite and 1 runtime smoke |
| Customer Web | Production build | Passed; 23 of 23 pages generated |
| Admin Web | Production build | Passed; 53 of 53 pages generated |

## Still Open

- SSLCommerz and aamarPay sandbox credentials plus a public HTTPS callback remain required for real payment lifecycle proof.
- Provider reconciliation queries/reports, settlement comparison, and refund execution adapters remain pending.
- Production must use Redis 6.2 or newer; local Redis 6.0.16 passed but emitted BullMQ's version warning.
- Automatic payment recovery remains disabled by default through `PAYMENT_RECOVERY_ENABLED=false`.
- PostgreSQL migration deployment from Progress 42 remains pending a reachable database service.

## Recommended Next Work

1. Define provider-neutral payment reconciliation and refund contracts.
2. Add immutable provider reconciliation evidence and mismatch findings.
3. Connect restricted refund initiation to the existing commerce refund ledger without marking success before provider confirmation.
4. Run full SSLCommerz and aamarPay sandbox payment, retry, replay, expiry, and refund scenarios when credentials arrive.
===================================
# Ferio Project Progress 44

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Category lifecycle and checkout usability
**Status:** Empty categories can now be deleted safely, while checkout supports server-validated quantity and sibling-variant changes, persisted customer notes, and configured support contacts

## Delivered

### Category lifecycle

- Adds an Admin category delete action and authenticated backend endpoint.
- Blocks deletion while a category owns products or child categories, preserving catalog references and hierarchy integrity.
- Deletes eligible empty categories inside an audited transaction.

### Cart and checkout

- Adds a design-language-aligned Continue shopping action beside Proceed to checkout.
- Exposes active sibling variants and computed stock through the cart contract.
- Lets customers change quantity and switch color, size, or other sibling variants from checkout while invalidating stale previews.
- Merges into an existing target variant line atomically and rejects cross-product variant replacement.
- Adds an optional 1,000-character customer note to the checkout draft and immutable order.
- Shows the note on the Admin order detail and displays configured support phone or email at checkout.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused catalog and cart tests | Passed; 2 suites and 12 tests |
| Backend | Full unit suite | Passed; 27 suites and 94 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 24 of 24 pages generated |
| Admin Web | Production build | Passed; 53 of 53 pages generated |

## Still Open From `my-plan.md`

- Category-based service booking and second-hand product classification.
- Account-based YouTube review submission, Admin moderation, banners, and featured review placement.
- Expanded inventory adjustment evidence and reasons.
- Customer warranty claims with attachments and the Admin warranty state workflow.
- Privacy-safe recent-purchase social proof, paginated history, and Admin settings controls.
- The new checkout-note migration still requires deployment to the target PostgreSQL environment.

## Recommended Next Work

1. Add second-hand product condition fields and storefront/Admin presentation.
2. Expand inventory adjustment reason codes, reference data, and evidence fields.
3. Design service booking as a separate purchasable domain rather than overloading product orders.
4. Implement authenticated review submission before public review and social-proof features.

========================================

# Ferio Project Progress 45

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Second-hand catalog and inventory evidence
**Status:** Ferio can now classify and sell disclosed second-hand products, while manual stock changes capture structured operational evidence

## Delivered

### Second-hand catalog

- Adds explicit `NEW` and `SECOND_HAND` product conditions with like-new, good, and fair grading.
- Requires a grade and meaningful condition disclosure before a second-hand product can be saved.
- Adds Admin create/edit controls and condition visibility in the product list.
- Adds a storefront condition filter, restrained product-card label, and detailed disclosure panel.
- Carries condition and grade through cart and checkout.
- Freezes condition, grade, and disclosure into immutable order-item snapshots for later operational evidence.

### Inventory adjustment evidence

- Adds stock-count correction, purchase receipt, customer return, damage write-off, and other reason codes.
- Enforces positive receipt/return quantities, negative damage write-offs, and source references where required.
- Captures reference type and ID, optional unit cost in minor units, effective time, evidence URL, actor, and detailed note.
- Maps structured adjustment reasons to the existing immutable movement types.
- Expands Admin movement history to show operational references, effective time, unit cost, and evidence links.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused catalog and cart tests | Passed; 2 suites and 14 tests |
| Backend | Full unit suite | Passed; 27 suites and 96 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 24 of 24 pages generated |
| Admin Web | Production build | Passed; 53 of 53 pages generated |

## Still Open From `my-plan.md`

- Category-based service booking alongside product purchasing.
- Account-based YouTube review submission, Admin moderation, banners, and featured review placement.
- Customer warranty claims with attachments and the Admin warranty state workflow.
- Privacy-safe recent-purchase social proof, paginated history, and Admin settings controls.
- Migrations from Progress 44 and this checkpoint still require deployment to the target PostgreSQL environment.

## Recommended Next Work

1. Model category-scoped service offerings separately from inventory-backed products.
2. Add service availability, booking details, pricing, status transitions, and Admin operations.
3. Reuse checkout identity and payment foundations without mixing service bookings into parcel fulfillment.


=====================================
# Ferio Project Progress 46

**Checkpoint date:** August 13, 2026
**Milestone:** Product review moderation and category service booking
**Status:** Logged-in customers can submit moderated YouTube product reviews, approved content and banners render on product details, and customers can request category-scoped service bookings

## Delivered

- Adds unique per-product YouTube submissions with pending, approved, and rejected states.
- Requires a customer access session; the Customer Web keeps the short-lived access token in an HTTP-only cookie.
- Adds Admin approval, rejection, featured selection, edit/delete APIs, moderator evidence, and one-featured-review enforcement.
- Adds ordered product review banners with Admin create, update, and delete APIs.
- Renders only approved reviews through privacy-enhanced YouTube embeds and only active banners.
- Adds category-scoped services with publication, price, duration, lead time, requirements, area, and image data.
- Adds public service listing/detail pages and guest booking requests with normalized Bangladesh phones.
- Freezes service name, price, and duration into bookings and keeps them separate from inventory, parcel orders, and shipping.
- Adds Admin service creation, booking queues, guarded status transitions, and append-only history.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full unit suite | Passed; 27 suites and 96 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 28 pages generated |
| Admin Web | Production build | Passed; 56 pages generated |

## Operational Notes

- Banner inputs use managed URLs while object-storage activation remains pending.
- Service bookings are request-based and do not collect payment yet.
- Deploy migration `20260813233000_reviews_banners_service_booking` to target PostgreSQL.

## Recommended Next Work

1. Connect managed banner uploads and customer registration/session refresh screens.
2. Add service availability calendars, capacity, and rescheduling after policy approval.
3. Begin warranty claims with authenticated order-item ownership verification.

=================================

# Ferio Project Progress 47

**Checkpoint date:** August 13, 2026
**Milestone:** Online warranty claim workflow
**Status:** Customers can submit image-backed warranty claims for verified delivered order items, and Admin can operate repair and brand-service lifecycles with append-only history

## Delivered

- Requires a valid customer login plus matching order reference and checkout phone before exposing delivered order items.
- Allows selection of an exact previous order item and requires a detailed issue description.
- Uploads one to five JPG, PNG, or WebP evidence images through the existing Cloudinary strategy with a 5 MB per-file limit.
- Persists image URL/public ID, immutable order/product/variant/SKU snapshots, submitter, handler, and timestamps in PostgreSQL.
- Prevents duplicate active claims for the same order item.
- Adds customer claim history at `/account/warranty`.
- Adds an Admin Warranty queue grouped by customer and item with evidence previews.
- Supports submitted, product received, diagnosis, sent to brand, received from brand, repaired, resolved, and rejected states.
- Requires a rejection reason and blocks skipped, reversed, or terminal-state transitions.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full unit suite | Passed; 28 suites and 98 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 29 pages generated |
| Admin Web | Production build | Passed; 58 pages generated |

## Operational Notes

- Deploy migration `20260814003000_warranty_claim_workflow` to target PostgreSQL.
- Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for evidence uploads.
- Warranty duration and category/brand coverage rules still require product-owner approval; this workflow verifies delivered ownership but does not invent eligibility periods.

## Recommended Next Work

1. Add approved warranty-period and brand/category eligibility policies.
2. Add customer-visible status history details and transactional updates.
3. Add courier pickup/return logistics only after the service policy is approved.

=================================

# Ferio Project Progress 48

**Checkpoint date:** August 13, 2026
**Milestone:** Privacy-safe global purchase activity
**Status:** Real completed purchases can power a four-second customer popup and paginated public history under explicit customer consent and audited Admin controls

## Delivered

- Adds a separate optional checkout consent for anonymized purchase activity and snapshots that consent on the final order.
- Derives one public entry per real `DELIVERED` or `COMPLETED` order; Admin cannot create or edit activity records.
- Uses one lead product and aggregates the remaining visible quantity into the requested `+N items` format, for example `R*** ordered Sunpeed Cycle +2 items from Rampura Bazar`.
- Masks the customer name to its first character, never exposes order reference, phone, email, street, or detailed address, and shows district or local area only when Admin enables it after checkout disclosure.
- Adds a global customer popup that defaults to 4,000 ms and cycles through eligible verified purchases at a controlled interval.
- Adds `/purchase-history` with server-backed pagination, verified-purchase labels, and a clear privacy explanation.
- Adds the Admin `/dashboard/purchase-activity` tab with separate popup/history switches, optional district or local area, display duration, interval, maximum age, product exclusions, and a read-only eligible-record preview.
- Keeps popup and history disabled by default and removes the customer footer/sitemap history entry when the public history switch is off.
- Audits all configuration changes through the existing commerce-settings audit transaction.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed |
| Backend | Full unit suite | Passed; 29 suites and 100 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 31 pages generated |
| Admin Web | Production build | Passed; 60 pages generated |

## Operational Notes

- Deploy migration `20260814020000_privacy_safe_purchase_activity` to target PostgreSQL.
- Existing and non-consenting orders remain excluded because order consent defaults to `false`.
- Enable the popup and history separately from Admin only after reviewing the displayed eligible-record preview.
- Product exclusions accept catalog product IDs and are enforced by the backend for both public surfaces.
- This is in-page social proof, not browser Push API permission or an operating-system notification.

## Recommended Next Work

1. Add an authenticated customer consent-revocation workflow if historical withdrawal is required by policy.
2. Add product search/autocomplete for exclusions instead of raw product IDs.
3. Add end-to-end database coverage for eligibility filtering and public pagination.


========================================

# Ferio Project Progress 49

**Checkpoint date:** August 13, 2026
**Milestone:** Catalog-backed purchase-activity exclusions
**Status:** Admin can find and exclude products from public order activity without copying internal product IDs

## Delivered

- Adds authenticated `GET /api/catalog/products` proxy support in Admin Web while preserving the existing product-create route.
- Replaces the raw product-ID textarea in Global Order History settings with debounced server-side catalog search.
- Searches existing product name, brand, and SKU behavior through the established Admin catalog endpoint.
- Shows product name, category, and publication status before exclusion.
- Shows selected exclusions as named rows with explicit remove actions.
- Keeps unknown or legacy stored IDs visible and removable instead of silently dropping configuration.
- Saves the same product-ID array expected by the audited commerce-settings backend, so public activity filtering remains server-enforced.
- Follows the Ferio design language with plain text, hairline dividers, restrained grayscale, small radii, and no shadows or decorative color.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Admin Web | Production build | Passed; 60 pages generated |
| Admin Web | Type checking and route generation | Passed |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Catalog searches debounce for 250 ms and return at most eight suggestions per request.
- The first 100 products are loaded to resolve existing selected IDs to readable names; IDs outside that set remain visible as legacy catalog entries until searched or removed.
- No backend migration is required for this checkpoint.

## Recommended Next Work

1. Add database integration coverage for purchase-activity eligibility, order aggregation, exclusions, locality, and pagination.
2. Add customer-controlled withdrawal of future purchase-activity consent if the approved privacy policy requires it.
3. Continue Release 1 hardening with mixed Bangla/English customer and address tests.

