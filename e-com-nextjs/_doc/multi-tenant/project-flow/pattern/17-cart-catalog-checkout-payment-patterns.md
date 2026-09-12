# Cart, Catalog, Checkout, and Payment Patterns

This chapter is based on the focused source and test pass for `cart`,
`catalog`, `checkout`, and `commerce-payments`. It explains recurring shapes;
it does not certify every branch or live gateway integration.

## 157. Hashed guest-cart token

The client may hold a guest cart token, but the database stores its SHA-256
hash. Cart lookup is bounded by token length and tenant routing comes from the
trusted request context, not from the token.

- Source: `src/features/cart/cart.service.ts`
- Tests: `cart.service.spec.ts`, `cart.tenant-isolation.spec.ts`
- Failure mode: storing a bearer cart token in plaintext or accepting a token
  across tenant databases.

## 158. Sellable-variant revalidation

Cart writes re-read the variant and verify product status, category status,
publication time, active variant state, and available stock. A cart is not a
reservation and must be revalidated again at checkout.

- Source: `cart.service.ts`
- Test: `cart.service.spec.ts`
- Failure mode: trusting stale client price, status, or quantity.

## 159. Aggregate available stock calculation

Sellable quantity is derived from the aggregate of `onHand - reserved - damaged`
across inventory rows. This central calculation is reused for add, update, and
serialization paths.

- Source: `cart.service.ts` and catalog inventory paths
- Failure mode: exposing damaged or already-reserved stock as available.

## 160. Guest-to-account cart merge

Authentication can merge a guest cart into the account cart. The merge path
revalidates each line and applies ownership and tenant predicates instead of
blindly copying arbitrary cart rows.

- Source: `CartService.mergeGuestCart`
- Test: `cart.tenant-isolation.spec.ts`
- Failure mode: cross-user cart adoption or copying unavailable inventory.

## 161. Reorder ownership and line filtering

Reorder accepts an authenticated user and optional order-line selection, then
checks that the order belongs to the caller and that each selected line is
still sellable before adding it to the active cart.

- Source: `CartService.reorderFromOrder`
- Test: `cart.reorder-ownership.spec.ts`
- Failure mode: using another customer's order id as a product discovery API.

## 162. Public/admin catalog projection

The same catalog service supports public and admin projections. Public reads
filter inactive/unpublished entities and serialize only storefront-safe fields;
admin routes use stronger guards and can access management fields.

- Source: `catalog.controller.ts` and `catalog.service.ts`
- Test: `catalog.tenant-routing.spec.ts`
- Failure mode: leaking draft products or management metadata publicly.

## 163. Slug normalization and conflict translation

Product/category/brand identifiers are normalized before persistence. Prisma
unique conflicts are translated into stable `ConflictException` responses
instead of leaking database details.

- Source: `CatalogService.slugify` and `handlePrismaConflict`
- Test: `catalog.service.spec.ts`
- Failure mode: duplicate URLs, inconsistent lookup behavior, or raw SQL errors.

## 164. Inventory adjustment invariant

Adjustment reason controls legal sign, required source reference, and effective
time. Receipts and returns cannot decrease stock; damage write-offs cannot
increase stock; future-dated corrections are rejected.

- Source: `CatalogService.validateInventoryAdjustment`
- Test: `catalog.service.spec.ts`
- Failure mode: an apparently valid admin request corrupting stock history.

## 165. Entitlement before catalog mutation

Product creation evaluates plan entitlements before writing. The check is
server-side and tenant-scoped, so a client cannot bypass plan limits by calling
the endpoint directly.

- Source: `CatalogService.createProduct` and `EntitlementsService`
- Failure mode: plan enforcement implemented only in the admin UI.

## 166. Bounded catalog pagination

Catalog query DTOs bound page and limit. The service returns a stable envelope
with items, total, total pages, and navigation flags; special filters may use
bounded application-side slicing after a capped database read.

- Source: `catalog.dto.ts` and `CatalogService.getProducts`
- Test: `catalog.service.spec.ts`
- Failure mode: unbounded scans or inconsistent frontend pagination contracts.

## 167. Server-priced checkout preview

Checkout preview loads the tenant cart and settings, recalculates subtotal,
coupon discount, delivery fee, and total on the server, then persists a short-
lived draft. Client-provided totals are never authoritative.

- Source: `CheckoutService.preview`
- Test: `checkout.util.spec.ts` and checkout service coverage
- Failure mode: price tampering between cart display and order placement.

## 168. Delivery-zone normalization and uniqueness

District names are normalized and deduplicated before zone creation. A database
unique conflict is translated into a domain conflict because a district can
belong to only one zone.

- Source: `checkout.service.ts` and `checkout.util.ts`
- Failure mode: duplicate district assignments caused by spelling/whitespace
  variants.

## 169. Audited delivery-zone transaction

Delivery-zone writes run in a Prisma transaction and record the audit event
using the same transaction client. A successful response therefore represents
both the state change and its audit record.

- Source: `CheckoutService.createDeliveryZone` and `updateDeliveryZone`
- Failure mode: an audit log claiming a change that later rolled back.

## 170. Configuration-driven coupon policy

Coupon calculation is a pure policy helper that evaluates eligibility, usage,
minimum spend, product/category scope, discount caps, and expiry before the
checkout draft is persisted.

- Source: `checkout/utils/coupon.util.ts`
- Test: `coupon.util.spec.ts`
- Failure mode: coupon behavior scattered across controllers or trusted from
  the browser.

## 171. Payment gateway registry

Payment gateways implement one provider contract and are selected through a
registry keyed by the provider enum. The service does not contain provider-
specific transport code.

- Source: `gateways/payment.gateway.ts` and `payment-gateway.registry.ts`
- Test: `adapters/payment-adapters.spec.ts`
- Failure mode: provider branching spreading through order/payment services.

## 172. Encrypted provider credential envelope

Tenant payment credentials are serialized into an encrypted, authenticated
envelope. Reads reject malformed or tampered values; audit events contain only
safe metadata, not plaintext secrets.

- Source: `utils/payment-credentials.util.ts` and payment service
- Test: `payment-credentials.util.spec.ts`
- Failure mode: storing gateway passwords in configuration rows or logs.

## 173. Customer proof before anonymous payment initiation

Public payment initiation requires the order reference and placement phone in
addition to the order id. The service verifies that proof against the tenant
order before creating a provider attempt.

- Source: payment DTOs and `CommercePaymentsService`
- Test: `commerce-payments.service.spec.ts`
- Failure mode: anonymous callers creating sessions for arbitrary orders.

## 174. Server-to-server callback validation

Provider callbacks are not trusted from browser-reported status fields. The
gateway validates with the provider API and compares amount, currency,
merchant identity, and attempt identity before mutating order/payment state.

- Source: gateway `validate` methods and `processCallback`
- Test: `adapters/payment-adapters.spec.ts`, service callback tests
- Failure mode: marking an order paid from a forged success redirect.

## 175. Callback deduplication and transaction claim

Already-succeeded attempts return a duplicate result without repeating side
effects. New successful validations update the attempt, order, audit record,
and related state in one transaction.

- Source: `CommercePaymentsService.processCallback`
- Test: duplicate callback and amount/currency mismatch cases
- Failure mode: duplicate payment events creating duplicate fulfillment or
  ledger effects.

## 176. Expired-payment recovery claim

The recovery processor finds due attempts and the service conditionally claims
only attempts still in an expirable state. It then expires the prepaid order
and releases related state in one transaction; concurrent jobs safely skip a
lost claim.

- Source: `payment-recovery.processor.ts` and `expireAttempt`
- Test: `payment-recovery.spec.ts`
- Failure mode: a late or duplicate worker mutating a succeeded payment.

## Release evidence boundary

The focused tests provide source and unit evidence for these patterns. They do
not prove live SSLCommerz/aamarPay credentials, real callback delivery, queue
fairness under load, or production recovery. Those require `PROVIDER`, `LOCAL`,
or `STAGING` evidence according to `FULL-AUDIT-MATRIX.md`.
