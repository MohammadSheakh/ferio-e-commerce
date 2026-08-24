# Ferio Commerce Platform — Product Requirements Document (Updated)

**Document status:** Living product baseline — supersedes v1.1 where they differ

**Version:** 1.2

**Date:** August 24, 2026

**Product:** Ferio

**Market:** Bangladesh · **Model:** Single seller, single brand, one warehouse

**Primary applications:** Customer Web, Admin Web, Customer Mobile App, Rider Web Portal (new), NestJS Backend

---

## 0. Relationship to PRD v1.1 and How to Read This Document

This document captures the functionality that was designed, approved, and built **after** PRD v1.1 (August 4, 2026) was baselined, discovered by reviewing the actual backend modules (`ferio-nest-prisma/src/features/*`), Customer Web routes, Admin Web dashboard routes, and the Expo app.

Reading rules:

1. **Everything not modified here remains governed by v1.1** — vision, principles, release strategy R2/R3, domain state models, business rules, data requirements, integration requirements, non-functional requirements, testing requirements, and rollout plan carry over unchanged.
2. New requirements use **new IDs continuing the v1.1 schemes** (`FR-CART-007+`, `FR-CAT-011+`, `FR-CHK-011+`, new family `FR-RIDER-*`).
3. Where an implementation elaborates an existing v1.1 requirement without changing it, this document records the mapping in §5 so requirement and shipped surface stay traceable.
4. Two v1.1 items are formally amended: the rider-application exclusion (§6) and delivery-personnel provisioning rules (§12.21).

### Change log vs v1.1

| Area | Change |
|---|---|
| Product surfaces | Added Rider Web Portal as an approved surface (§9.5); expanded Customer Web route list (§9.1); expanded Admin module list (§9.2) |
| Non-goals | Removed "custom courier/rider application" exclusion **for Ferio's own first-party riders**; third-party courier apps remain excluded |
| Cart | Added saved carts, cart sharing via token links, reorder from past orders (§12.4A) |
| Catalog | Added product conditions (NEW / SECOND_HAND with grades and disclosure), managed Brand entity, Hero Showcase content management (§12.2A) |
| Checkout | Added customer order note and checkout-draft item editing (§12.5A) |
| Operations | Formalized the delivery-workforce PWA with hardened provisioning rules (§12.21) |
| Personas | Added Delivery Rider persona (§8.10) |

---

## 1. Executive Summary of Additions

Since v1.1, the platform grew beyond "sell reliably" into three additional capability bands that are now part of the Release 1 product:

1. **Customer retention-of-convenience features** — saved carts, shareable carts, one-click reorder from past orders, wallet self-service, private notification inbox, warranty self-service. These shorten the path to a second order.
2. **First-party delivery operations** — Ferio now operates its own rider workforce through a browser-based portal (application → admin review → assignment → GPS-tracked delivery), alongside third-party courier adapters rather than replacing them.
3. **Content and merchandising control** — brands as managed entities, new/second-hand product conditions with disclosure, and admin-managed homepage hero showcase content.

---

## 2. Users and Personas — Addition

### 8.10 Delivery Rider (first-party)

**Context:** Applies through the public join page, is reviewed and approved by an administrator, then signs into a browser portal (mobile-first PWA-style page inside Customer Web origin) to receive assigned orders.

**Needs:** Simple application flow, clear assigned-order list, one-tap duty (online/offline) state, reliable status updates while delivering, automatic location recording, and a credential handed over securely at approval.

**Constraints carried over from the security remediation:** approval must never modify an existing platform account; every approved rider receives an explicitly chosen initial password; only `APPROVED` rider profiles can perform delivery actions.

---

## 3. Product Surfaces — Updates

### 3.1 Customer Web — added routes and capabilities (extends v1.1 §9.1)

- `/account/saved-carts` — named saved carts for authenticated customers;
- `/cart/share/[token]` — public read-only view of a shared saved cart with import / save-to-account actions;
- `/payment/success`, `/payment/failed`, `/payment/cancel` — dedicated hosted-payment result pages;
- `/payment-retry` — secure same-order prepaid retry (order reference + placement phone);
- `/delivery/join` — public rider application form;
- `/delivery`, `/delivery/portal` — rider sign-in and operations portal;
- `/account/wallet`, `/account/warranty`, `/account/notifications` — already specified in v1.1 §12.9A/§12.19/§12.11, listed here because their routes are now live.

### 3.2 Admin Web — full Release 1 module map (replaces v1.1 §9.2 Release 1 list)

```text
Overview / Charts          Orders                    Returns
Products                   Fulfillment & Shipping    Reconciliation & Settlements
Categories                 Delivery Zones            Payments & Refunds
Brands                     Delivery Personnel        Wallet Review
Inventory                  Delivery Live Map         Purchase Activity
Customers                  Store Outlets & Pickup    Requested Products (Feedback)
Staff Management           Reports & Analytics       Reviews & Review Banners
Security Center (2FA)      Services                  Warranty Claims
Chat & Messages            Transactional Messages    Audit Log
Hero Showcase              Abandoned Carts Queue     Settings
System Health (Operations Health)                    Global Order History (social proof)
```

### 3.3 Backend module map (implements v1.1 §9.3 plus additions)

The bounded modules now include everything v1.1 listed, realized as: `authentication` (+ OTP, TOTP two-factor), `staff-access`, `user-management`, `catalog`, `cart`, `checkout`, `commerce-payments`, `wallet`, `order`, `shipping`, `returns`, `refunds`, `rto`, `settlements`, `reconciliation`, `transactional-messaging`, `customer-notifications`, `chatting` + `socket.gateway`, `customers`, `customer-account`, `product-content`, `product-request`, `service-booking`, `warranty`, `purchase-activity`, `storefront-analytics`, `store-locations`, `delivery-personnel`, `attachments`, `audit`, `settings`, `reports`, `operations-health`. Legacy Mongoose-era payment/subscription/notification modules were removed rather than retained dormant.

### 3.4 Rider Web Portal (new surface — see §6.4)

A mobile-first browser portal served from the Customer Web origin using the shared backend identity system — not a separate native app and not a third-party tool.

---

## 4. Non-Goals — Amendment

v1.1 excluded "custom courier/rider application for third-party delivery partners." This exclusion is **narrowed**: it continues to apply to *third-party courier companies*, but Ferio's own first-party rider workforce is now an approved product surface (Rider Web Portal, §6.4). No separate native rider app is planned; any future native wrapper requires separate approval.

---

## 5. Requirement-to-Surface Traceability (elaborations of v1.1)

These shipped Admin workspaces implement existing v1.1 requirements without changing them:

| Implemented Admin workspace | Implements |
|---|---|
| Staff Management (invite, grouped permissions, activate/deactivate, reset handoff) | `FR-AUTH-006` |
| Security Center (TOTP enrollment/disable UI) | `FR-AUTH-007` |
| Brands CRUD | extension of `FR-CAT-001/003` — promoted to first-class requirement below |
| Checkout-side quantity/variant editing | extension of `FR-CART-004` — specified below |
| Wallet Review (recharge evidence approval) | `FR-WAL-004/005/009` |
| Abandoned Carts queue | `FR-CART-006` |
| Transactional Messages (templates, routing policy, attempts evidence, queue health, audited retry) | `FR-NOT-002..008` |
| Chat folders, quick replies, unread context, resizable conversation workspace | `FR-EXT-001/002` |
| Delivery Zones editor | `FR-CHK-008/010` |
| Delivery Personnel (applications, approvals, assignments) | `FR-OPS-003` |
| Delivery Live Map (OpenStreetMap rider paths + active order locations, history clearing) | `FR-OPS-004` |
| Store Outlets & pickup operations | `FR-OPS-001/002` |
| Purchase Activity controls + catalog-backed exclusions + Global Order History | `FR-OPS-005..007` |
| Page-visitor aggregation card | `FR-OPS-008` |
| Reconciliation exception queues, settlement CSV preflight/import/correction | Slice 7 of implementation checklist, `FR-PAY-009`, `FR-INV-010` |
| Reports overview, orders export, owner charts | `FR-ANL-001..007` |
| System Health workspace (request latency/error aggregates, PostgreSQL/Redis probes, six critical BullMQ queues, 24-hour commerce outcomes, provider readiness, backup evidence) | v1.1 §22 Observability |
| Requested Products lifecycle ("Feedback") | `FR-EXT-003` |
| Reviews moderation + review banners | `FR-EXT-004/005` |
| Services booking management | `FR-EXT-006` |
| Warranty claims operations | `FR-EXT-007/008` |

---

## 6. New Functional Requirements

Priority definitions inherit v1.1 (P0 launch-blocking, P1 important with manual fallback, P2 later).

### 6.1 Saved carts, cart sharing, and reorder (extends §12.4)

| ID | Priority | Requirement |
|---|---|---|
| FR-CART-007 | P1 | Authenticated customers may save their active cart as a persistent named saved cart and list, reload, or delete saved carts from their account. |
| FR-CART-008 | P1 | A saved cart may be exposed through an opaque share token producing a public, read-only view of its contents; sharing must never expose prices-in-force guarantees or customer identity beyond display intent. |
| FR-CART-009 | P1 | A visitor opening a shared-cart link may import available items into their own active cart or, when signed in, save the shared cart to their account; unavailable or unpublished variants are skipped with explicit reasons, never silently dropped. |
| FR-CART-010 | P1 | Authenticated customers may reorder available items from one of their own past orders into the active cart; the endpoint must enforce customer-profile ownership server-side and report per-item availability outcomes (added vs. unavailable with reason). Guests cannot reorder orders they do not own. |

### 6.2 Catalog merchandising additions (extends §12.2)

| ID | Priority | Requirement |
|---|---|---|
| FR-CAT-011 | P1 | Products must carry a condition of `NEW` or `SECOND_HAND`; second-hand products require a condition grade (e.g., LIKE_NEW and defined peers) and a human-readable disclosure note shown on listing, detail, cart, checkout, and preserved immutably on order item snapshots. |
| FR-CAT-012 | P1 | Customers must be able to filter storefront listings by condition; second-hand items must be visually distinguishable from new stock. |
| FR-CAT-013 | P1 | Brands must be a managed catalog entity (name, unique slug, description, logo, activation) with guarded deletion when referenced by products; product-brand association feeds search and filters per `FR-SRCH-002/003`. |
| FR-CAT-014 | P2 | Admin may manage homepage Hero Showcase slides (image, heading, copy, link, ordering, active flag) stored as typed application settings and delivered to Customer Web through the public settings contract; showcase content is presentation-only and must not affect commerce logic. |

### 6.3 Checkout additions (extends §12.5)

| ID | Priority | Requirement |
|---|---|---|
| FR-CHK-011 | P1 | Customers may attach an optional free-text order note at checkout; the note persists on the checkout draft, copies onto the immutable order record, and is visible to authorized staff in Admin order detail. |
| FR-CHK-012 | P1 | Within a checkout draft, customers may adjust line quantities and switch a line to a sibling variant; all edits must re-validate price, publication, and stock server-side before order placement, and totals must always be recomputed server-side. |

### 6.4 First-party delivery workforce — Rider Web Portal (new family)

Business rules:

- Riders are provisioned **only** through admin review of applications or direct admin creation. Approval must never change the role, password, or verification state of an existing non-rider account; conflicting emails block approval until resolved.
- Every newly provisioned rider account requires an explicit initial password of at least 10 characters chosen by the approver; no default password may exist in code.
- Only riders linked to an `APPROVED` personnel record may authenticate into delivery operations; auto-linking may claim only genuinely approved records.
- Public application endpoints must be rate limited, must reject emails already used by platform accounts, and must respond without revealing which phones/emails have applied.
- Rider-reported COD cash remains **pending staff confirmation**: the platform records audited evidence of the delivery but does not fabricate COD collection financial records; reconciliation flags delivered-COD-without-collection for finance follow-up.
- Rider status transitions are validated server-side: cancelled, completed, returned, or already-delivered orders can never be moved by a rider; only handed-over orders are eligible.

| ID | Priority | Requirement |
|---|---|---|
| FR-RIDER-001 | P1 | Prospective riders may apply through a public form capturing name, phone, email, NID, vehicle type, operating zone, driving license (optional), and emergency contact; submissions enter a pending-review state. |
| FR-RIDER-002 | P0 | Administrators may list, search, approve, and reject applications; approval provisions a rider-linked account under the business rules above and writes an audit record. Direct admin creation follows identical constraints. |
| FR-RIDER-003 | P0 | Approved riders sign into the portal through the shared authentication system; sessions use httpOnly cookies on Customer Web origin and never expose raw tokens to client JavaScript. |
| FR-RIDER-004 | P1 | The portal shows the rider's profile, current duty state, and assigned orders with customer address snapshots required for delivery. |
| FR-RIDER-005 | P1 | Riders may toggle online/offline duty status; the authoritative state lives on the server, and the UI must reflect server outcomes only — optimistic local-only flips are forbidden. |
| FR-RIDER-006 | P1 | Riders may update assigned-order delivery status through a fixed set (picked up, in transit, out for delivery, delivered, delivery failed); DELIVERED consumes stock reservations, writes fulfillment and order history, and records audit evidence exactly as courier-path deliveries do. |
| FR-RIDER-007 | P1 | Status updates may carry GPS coordinates captured by the device; coordinates persist as location-history waypoints with sequence numbers and update the rider's current position. |
| FR-RIDER-008 | P1 | Administrators may view a live delivery map combining approved riders' current positions and recent path sequences with active order destination areas; location data must never be exposed publicly, and administrators may clear a rider's location history. |

---

## 7. Journey Additions

### 7.1 Save, share, and restore a cart (extends §11.1)

1. A signed-in customer arranges a cart (for example, a PC build) and saves it as a named saved cart.
2. The customer generates a share link; anyone opening it sees the items read-only.
3. A recipient imports available items into their own cart or saves the shared cart to their account after signing in.
4. Unavailable variants at import time are reported back with reasons; pricing is always recalculated server-side at checkout per `FR-CART-003`.

### 7.2 Repeat purchase via reorder (amends §11.7 step 1–2)

Before any campaign touch, a returning customer can self-serve: open a past order from account history and reorder its still-available items in one action. Campaign-driven repeat purchase continues to work as specified in v1.1.

### 7.3 First-party rider delivery (inserts between §11.4 and §11.5)

1. Admin assigns a ready-for-handover order to an approved rider instead of (or alongside) creating a courier shipment.
2. Rider hands over, sets picked-up/in-transit/out-for-delivery states from the portal; GPS pings record the route.
3. On delivery the rider marks DELIVERED; the platform consumes reservations, completes fulfillment, records history and audit evidence.
4. For COD, collected cash awaits staff confirmation; reconciliation raises the expected-collection finding for finance.
5. Customer-facing transactional updates behave identically to courier-path delivery.

---

## 8. Security Posture Amendments (August 2026 remediation)

The following behavioral requirements were introduced by the security remediation and are now normative:

1. JWT secrets must be cryptographically random; startup validation rejects placeholder/template values, and no component may embed a fallback signing secret.
2. Payment initiation requires order-reference + placement-phone proof; browser-reported failure/cancellation callbacks are recorded but can never mutate payment attempt or order state — only provider-verified outcomes or the expiry sweep may do so.
3. OTP codes are generated from a CSPRNG, stored hashed, compared timing-safely, consumed atomically, and their request/verify/reset endpoints are rate limited.
4. Refresh-token revocation fails closed when Redis is unavailable.
5. Rider provisioning obeys §6.4 business rules; the former default-password behavior is prohibited permanently.
6. Both Next.js applications must track a Next.js version ≥ 14.2.25 (middleware bypass fix); upgrades require the CI build matrix to pass.
7. Verification codes must never transit to the browser, even in development builds; developer codes live in the dev mailbox/logs only.
8. Production customer surfaces render explicit error/empty states on backend failure (error boundaries are mandatory in both web apps).

## 9. Continuous Integration Gate (new)

All changes must pass the GitHub Actions workflow: backend production build + full unit suite; both web apps typecheck + production build. Integration suites requiring disposable PostgreSQL/Redis should extend this workflow once runner services are approved.

---

## 10. Acceptance Criteria Supplements (extends v1.1 §26.1)

Release 1 exit additionally requires:

- Saved cart creation, share-link import, and ownership-checked reorder work end to end with explicit unavailability reporting.
- Second-hand conditions round-trip from admin entry through storefront filtering to immutable order-item snapshots.
- A rider can be applied for, approved with an explicit password, assigned an order, tracked on the live map, and marked DELIVERED with reservations consumed and COD left pending staff confirmation.
- Wallet recharge review, notification inbox, chat, service booking, warranty, and store-pickup flows operate through their documented Admin/Customer surfaces (traceability table §5).
- CI passes on every push; no previously leaked credential string appears anywhere in tracked files at HEAD.

## 11. Deferred / Not Yet Specified

Carried from v1.1 without change: Release 2 CRM/consent/campaign families, Release 3 candidates, contribution-costing formulas pending owner cost-source approval, Meta integrations, dedicated search infrastructure, multi-warehouse support, and native rider/mobile distribution decisions.
