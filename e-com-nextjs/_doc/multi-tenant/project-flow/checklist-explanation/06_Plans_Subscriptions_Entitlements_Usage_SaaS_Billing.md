# Ferio Engineering Learning Series

## Document 06 --- Plans, Subscriptions, Entitlements, Usage & SaaS Billing

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-6

------------------------------------------------------------------------

# 1. The Problem MT-6 Solves

Baby Shop has now been provisioned and its hostname reaches the correct
tenant.

The next question is:

> **What is Baby Shop allowed to use, how much can it use, and how does
> it pay Ferio?**

Five words control this part of the architecture:

``` text
Plan
Subscription
Entitlement
Usage
SaaS Billing
```

They are related, but they are not the same thing.

------------------------------------------------------------------------

# 2. Child-Simple Analogy

Think about a mobile internet package.

``` text
Small package
├── 10 GB
└── 1 SIM

Large package
├── 100 GB
└── 5 SIMs
```

The **plan** is the package definition.

Your **subscription** says which package you currently have.

An **entitlement** says which feature you are allowed to use or what
your limit is.

**Usage** says how much you have already consumed.

**Billing** is the money you pay the provider.

Ferio follows the same general idea.

------------------------------------------------------------------------

# 3. Ferio's Plan Catalog

The current tracker defines:

``` text
Starter
Business
Pro
Enterprise
Internal
```

The plans are seeded idempotently through `PlatformPlanSeedService`.

The engineering structure exists, but the final commercial prices remain
pilot-dependent in the tracker; seeded `amountMinor` is currently `0`.

So remember:

``` text
plan architecture complete
≠
final market pricing approved
```

------------------------------------------------------------------------

# 4. Plan

A plan is reusable policy.

Conceptually:

``` text
Plan
├── name
├── billing interval
├── price
└── entitlements
```

Example:

``` text
Business
├── staff_seats = 10
├── products_max = 5000
├── warehouses_max = 3
└── custom_domain = true/false according to catalog
```

Many organizations may use the same plan.

------------------------------------------------------------------------

# 5. Subscription

A subscription connects one organization to a plan.

``` text
Baby Shop
    ↓
Subscription
    ↓
Business Plan
```

It also has lifecycle state:

``` text
TRIALING
ACTIVE
PAST_DUE
SUSPENDED
CANCELLED
```

So:

``` text
Plan
= what the package contains

Subscription
= which package this organization currently has
  and the state of that relationship
```

------------------------------------------------------------------------

# 6. Entitlement

An entitlement answers either:

``` text
"Can this organization use this feature?"
```

or:

``` text
"What limit does this organization have?"
```

Examples:

``` text
custom_domain = enabled
advanced_reports = enabled
staff_seats = 10
products_max = 5000
warehouses_max = 3
```

There are therefore two useful mental categories:

``` text
Feature entitlement
→ yes/no capability

Limit entitlement
→ numeric allowance
```

------------------------------------------------------------------------

# 7. Ferio's Current Numeric Directions

The tracker defines:

``` text
Staff seats
Starter  = 2
Business = 10
Pro      = 30
Enterprise = negotiated

Products
Starter  = 500
Business = 5,000
Pro      = 25,000

Warehouses
Starter  = 1
Business = 3
Pro      = 10
```

Warehouse enforcement lands with multi-warehouse support.

The project deliberately has **no GMV/order-volume hard limit
initially**. `orders_per_month` is metered but initially unlimited.

That teaches an important lesson:

> **Metered does not necessarily mean capped.**

A metric can exist for analytics, warnings, future pricing, or capacity
planning without currently blocking business.

------------------------------------------------------------------------

# 8. Server-Side Enforcement

Suppose a feature is unavailable on a tenant's plan.

Bad security:

``` text
Frontend hides button
```

A user can still call the API.

Correct:

``` text
Frontend
   ↓
API
   ↓
Backend entitlement evaluation
   ↓
ALLOW / DENY
```

Frontend controls are UX.

Backend controls are enforcement.

Ferio uses `EntitlementsService.evaluate` as the central Control Plane
evaluator before monetizable actions.

------------------------------------------------------------------------

# 9. Why Centralize Entitlements?

Bad:

``` ts
if (plan.name === "Starter") ...
```

inside CatalogService, StaffService, DomainsService, OrdersService, etc.

Now pricing policy is scattered through the application.

Better:

``` text
Feature Service
      ↓
EntitlementsService
      ↓
subscription + plan + entitlement + usage
      ↓
decision
```

Business code should ask:

``` text
"Does this organization have custom_domain?"
```

rather than:

``` text
"Is this organization Pro?"
```

This makes plan changes much safer.

------------------------------------------------------------------------

# 10. Stable Denial Codes

Ferio exposes stable machine codes including:

``` text
ENTITLEMENT_NOT_FOUND
FEATURE_DISABLED
PLAN_LIMIT_REACHED
SUBSCRIPTION_INACTIVE
```

That lets the frontend reliably decide what to display.

Bad:

``` ts
if (error.message === "You reached your plan limit")
```

Better:

``` ts
if (error.code === "PLAN_LIMIT_REACHED")
```

Human messages can change. Machine contracts should remain stable.

------------------------------------------------------------------------

# 11. Tenant Owner Plan View

Ferio exposes:

``` text
GET /tenancy/my-plan
```

for Tenant Admin.

It provides the owner with information such as:

``` text
current plan
subscription state
entitlements
limits
live usage
active domains
recovery information where applicable
```

So the owner can answer:

``` text
What plan am I on?
What can I use?
How much have I used?
Is my subscription healthy?
```

------------------------------------------------------------------------

# 12. Subscription Lifecycle

Simplified:

``` text
TRIALING
   ↓
ACTIVE
   ↓
PAST_DUE
   ↓
SUSPENDED

PAST_DUE  ──→ ACTIVE
SUSPENDED ──→ ACTIVE
CANCELLED ──→ ACTIVE
```

Ferio implements the actual transition rules in its subscription state
machine.

------------------------------------------------------------------------

# 13. Trial

The approved policy is:

``` text
14-day trial
no card required
```

Trial is explicit subscription state, not a hidden special case spread
across tenant services.

------------------------------------------------------------------------

# 14. PAST_DUE and Grace Period

Ferio gives a:

``` text
7-day grace period
```

from the latest `PAST_DUE` event.

Why?

Because a payment failure should not instantly become destructive.

The grace period allows:

``` text
payment recovery
merchant notification
billing correction
support intervention
```

while preserving tenant data.

------------------------------------------------------------------------

# 15. Suspension

Ferio's approved policy is capability-specific:

``` text
SUSPENDED
├── storefront browsing ✓
└── checkout ✗
```

Checkout denial uses:

``` text
CHECKOUT_DISABLED_SUSPENDED
```

This is an important architecture lesson.

Do **not** implement:

``` text
if suspended → reject absolutely everything
```

because billing recovery, plan visibility, and approved read-only
behavior may still need to work.

------------------------------------------------------------------------

# 16. Billing Lifecycle Is Not Database Lifecycle

Never think:

``` text
subscription unpaid
→ delete tenant DB
```

The tracker explicitly separates:

``` text
subscription/billing lifecycle
```

from:

``` text
organization/database lifecycle
```

A suspension, downgrade, or cancellation should not silently destroy the
merchant's operational history.

------------------------------------------------------------------------

# 17. Upgrade

Example:

``` text
Starter product limit = 500
current products = 500
```

Request:

``` text
create product #501
```

Backend:

``` text
EntitlementsService
      ↓
PLAN_LIMIT_REACHED
```

Then:

``` text
Starter → Business
```

New limit:

``` text
5,000
```

The capability can unlock without a tenant database migration merely
because the plan changed.

Plan changes are primarily **policy changes**, not schema changes.

------------------------------------------------------------------------

# 18. Downgrade

Suppose a tenant has historical data from a higher plan.

Bad:

``` text
downgrade
→ delete excess historical data
```

Ferio explicitly tests that downgrade does not destroy historical
orders.

Useful principle:

> Existing historical data is not the same thing as permission to create
> more data.

A lower plan may restrict future actions without rewriting customer
history.

------------------------------------------------------------------------

# 19. Usage

If:

``` text
products_max = 500
```

is the entitlement, then:

``` text
current products = 487
```

is usage.

So:

``` text
Entitlement = allowed maximum
Usage       = current consumption
```

Ferio's authoritative usage registry currently includes:

``` text
orders_per_month
products_max
staff_seats
```

------------------------------------------------------------------------

# 20. Real-Time vs Derived Usage

Different metrics can be measured differently.

Example:

``` text
orders_per_month
→ increment at monetizable event
```

Other values can be derived by recounting facts.

Mental model:

``` text
EVENT COUNTER
"I saw another event happen."

DERIVED COUNT
"Let me count the actual records."
```

Counters are fast, but they can drift.

That is why reconciliation exists.

------------------------------------------------------------------------

# 21. Concurrency Problem

Suppose:

``` text
limit = 10
usage = 9
```

Two requests arrive simultaneously.

Naive logic:

``` text
A reads 9
B reads 9

A allows
B allows

effective usage = 11
```

A sequential unit test may never find this bug.

Hard limits require concurrency-aware enforcement.

Ferio's usage counters use atomic upsert semantics around:

``` text
organizationId
metric
periodKey
```

so concurrent increments do not simply overwrite each other.

------------------------------------------------------------------------

# 22. Period Keys

Monthly metrics use UTC period keys such as:

``` text
2026-09
```

Conceptually:

``` text
org_baby
orders_per_month
2026-09
42
```

Next period:

``` text
org_baby
orders_per_month
2026-10
0 initially
```

A new period therefore naturally starts with a new counter identity.

------------------------------------------------------------------------

# 23. Reconciliation

Imagine:

``` text
UsageCounter:
products = 498

Actual tenant DB:
products = 500
```

Counters can drift because of bugs, retries, migrations, historical
changes, or failed side effects.

Ferio has `UsageReconciliationService`.

It recounts:

``` text
orders/catalog
→ tenant database facts

staff seats
→ Control Plane memberships
```

and corrects drift.

It also emits evidence such as:

``` text
usage_reconciliation_drift
```

Frequent drift is not merely something to repair---it is a signal that
an upstream path may be wrong.

------------------------------------------------------------------------

# 24. Warning Thresholds

Before a hard limit, Ferio can emit warnings at registry-defined
fractions.

Conceptually:

``` text
80% → warning
90% → warning
100% → deny when hard-capped
```

The tracker says `usage_warning_threshold_crossed` fires once per
threshold crossing.

A warning failure must not break an otherwise valid business write.

That is a production engineering principle:

> Observability should not accidentally become a critical dependency
> unless policy explicitly requires it.

------------------------------------------------------------------------

# 25. Platform and Tenant Usage Views

Platform Admin:

``` text
GET /platform/organizations/:id/usage
```

and an audited reconciliation operation.

Tenant Owner:

``` text
GET /tenancy/my-plan
```

Different users see appropriate projections of the same SaaS policy.

------------------------------------------------------------------------

# 26. The Two Payment Worlds

This is one of the most important concepts in Ferio.

There are two completely different money flows.

``` text
WORLD A
Customer → Merchant

WORLD B
Merchant → Ferio
```

Never mix them.

------------------------------------------------------------------------

# 27. Commerce Payment

Rahim buys a product from Baby Shop:

``` text
Rahim
  ↓ money
Baby Shop
```

This belongs to the tenant's commerce world.

Examples:

``` text
Payment
Wallet
COD
Refund
Settlement
```

These belong to the tenant plane.

------------------------------------------------------------------------

# 28. SaaS Payment

Baby Shop pays Ferio for the software:

``` text
Baby Shop
   ↓ subscription fee
Ferio
```

This belongs to the Control Plane.

Examples:

``` text
Subscription
SaasInvoice
SaasPaymentAttempt
```

Memorize:

``` text
CUSTOMER → TENANT
tenant commerce

TENANT → FERIO
platform SaaS billing
```

------------------------------------------------------------------------

# 29. Why Mixing Them Is Dangerous

If Baby Shop pays Ferio a subscription fee and Ferio writes it into Baby
Shop's commerce `Payment` table, reporting may interpret it as customer
revenue or merchant settlement.

Accounting semantics become corrupted.

It also couples Ferio's own financial operations to tenant databases.

The tracker says `PlatformBillingService` is Control Plane-only, and an
architecture check rejects tenant-plane imports or tenant database
access there.

That turns the boundary into an enforceable architectural rule.

------------------------------------------------------------------------

# 30. Billing Provider Adapter

Ferio uses a provider abstraction:

``` text
PlatformBillingService
       ↓
Billing Provider Interface
       ↓
SSLCOMMERZ Adapter
```

SSLCOMMERZ is first, but the abstraction is preserved.

Core subscription logic should not become hundreds of gateway-specific
calls.

This is dependency inversion:

``` text
domain logic
→ interface
→ external provider adapter
```

------------------------------------------------------------------------

# 31. SaaS Invoice and Payment Attempt

An invoice represents what an organization owes Ferio.

A payment attempt represents an attempt to pay it.

Conceptually:

``` text
SaasInvoice
    ↓
SaasPaymentAttempt
    ↓
INITIATED
   /       SUCCEEDED  FAILED
```

These records stay in the Control Plane.

------------------------------------------------------------------------

# 32. Webhook Verification

Payment gateways can call Ferio's server later with a payment result.

Never trust:

``` text
/payment/success
```

merely because somebody reached that URL.

The tracker says Ferio performs server-side SSLCOMMERZ `val_id`
validation.

The provider adapter should normalize verified provider results before
core billing trusts them.

------------------------------------------------------------------------

# 33. Webhook Idempotency

Gateways may retry the same callback:

``` text
callback #1
callback #2
callback #3
```

Correct:

``` text
first valid state transition applies
duplicates are absorbed
```

Bad:

``` text
three callbacks
→ three financial effects
```

Payment systems must be designed assuming duplicates will happen.

------------------------------------------------------------------------

# 34. Retry and Recovery

A failed payment session can be re-initiated.

Ferio also has a bounded recovery path for stale `INITIATED` attempts.

Recovery can close stale attempts with audit evidence.

It does **not** pretend money arrived merely because an attempt became
old.

This distinction protects financial correctness.

------------------------------------------------------------------------

# 35. Receipts and Exposure

Ferio provides Control Plane invoice history and a bounded receipt
projection after successful payment.

The receipt does not expose:

``` text
raw provider payloads
tenant commerce ledgers
```

Return only what the caller actually needs.

------------------------------------------------------------------------

# 36. Manual Billing Operations

Sensitive Platform Admin billing operations require:

``` text
saas_billing:write
```

plus a bounded operator reason.

They are audited.

Conceptually:

``` text
actor
organization
action
reason
time
result
```

Financial admin operations should be explainable later.

------------------------------------------------------------------------

# 37. Internal Plan

Ferio has an explicit `internal` plan.

`SubscriptionsService.startInternal()` requires that seeded plan,
creates an active subscription, and records:

``` text
SUBSCRIPTION_INTERNAL_STARTED
```

with actor and plan evidence.

This is much safer than hidden bypass logic such as:

``` ts
if (email.endsWith("@ferio.com")) {
  return unlimitedEverything;
}
```

Explicit policy is visible, auditable, and revocable.

------------------------------------------------------------------------

# 38. Full Entitlement Decision

Conceptually:

``` text
Tenant action
    ↓
trusted organization identity
    ↓
current subscription
    ↓
subscription state
    ↓
plan
    ↓
entitlement / limit
    ↓
authoritative usage if needed
    ↓
ALLOW / DENY
```

Notice what is not authoritative:

``` text
browser-supplied plan
browser-supplied organizationId
browser-supplied usage
```

------------------------------------------------------------------------

# 39. Example --- Staff Invitation

``` text
Tenant Admin
    ↓
invite employee
    ↓
authentication
    ↓
membership/permission check
    ↓
EntitlementsService
    ↓
staff_seats limit = 10
    ↓
current usage = 9
    ↓
allow
```

At usage 10:

``` text
next invitation
    ↓
PLAN_LIMIT_REACHED
```

------------------------------------------------------------------------

# 40. Example --- Custom Domain

``` text
Tenant Admin
    ↓
request custom domain
    ↓
DomainsService
    ↓
EntitlementsService
    ↓
custom_domain enabled?
   /                  yes                  no
 ↓                    ↓
PENDING_          FEATURE_DISABLED
VERIFICATION
```

This directly connects MT-5 and MT-6.

------------------------------------------------------------------------

# 41. Example --- Product Creation

``` text
Tenant Admin
    ↓
create product
    ↓
CatalogService
    ↓
evaluate products_max
    ↓
authoritative usage
    ↓
ALLOW / PLAN_LIMIT_REACHED
```

Denial should occur without leaving partial product/inventory state.

------------------------------------------------------------------------

# 42. TOCTOU

TOCTOU means:

``` text
Time Of Check
vs
Time Of Use
```

Example:

``` text
Request A checks usage = 499
Request B creates product
Request A creates product
```

An early check alone may not be enough for strict limits.

Senior engineering asks:

> Is the check and the business write protected strongly enough under
> concurrency?

------------------------------------------------------------------------

# 43. Reconciliation Does Not Replace Enforcement

Do not think:

``` text
"We can allow the limit to be exceeded and fix the counter later."
```

Reconciliation fixes **measurement**.

Entitlement/transaction logic enforces **policy**.

Different responsibilities.

------------------------------------------------------------------------

# 44. Plan Versioning

The broader Control Plane model supports plan versioning.

Why?

Because:

``` text
Business Plan today
```

may not equal:

``` text
Business Plan last year
```

If a merchant asks:

> "What was included when I subscribed?"

Ferio should be able to explain historical policy.

The tracker says plan versions increment on Platform Admin edits and
audit snapshots preserve normalized entitlement evidence.

------------------------------------------------------------------------

# 45. Control Plane Ownership

These are Control Plane concepts:

``` text
Plan
PlanEntitlement
Subscription
SubscriptionEvent
SaasInvoice
SaasPaymentAttempt
UsageCounter
```

They describe Ferio's relationship with organizations.

They are not one merchant's internal commerce records.

------------------------------------------------------------------------

# 46. Cross-Plane Reconciliation

Some usage facts live inside tenant databases.

Example:

``` text
product count
```

But `UsageCounter` is Control Plane state.

So reconciliation may intentionally cross planes:

``` text
Control Plane reconciliation
        ↓
trusted organization
        ↓
TenantDatabaseManager
        ↓
tenant facts
        ↓
normalized count
        ↓
Control Plane UsageCounter
```

Because these are separate databases, do not pretend this is one normal
ACID transaction.

Think about:

``` text
ordering
idempotency
retry
compensation
reconciliation
failure evidence
```

------------------------------------------------------------------------

# 47. Cross-Plane Failure Example

Suppose:

``` text
tenant order succeeds
```

but:

``` text
usage-side update temporarily fails
```

It may be unacceptable to destroy a legitimate customer order merely
because a secondary metering operation failed.

Ferio's reconciliation capability exists so authoritative facts can
repair drift.

Exact failure semantics still need to be read from the implementation
for each metric.

------------------------------------------------------------------------

# 48. Architecture Diagram

``` text
                    CONTROL PLANE

Organization
    │
    ▼
Subscription ───────→ Plan
    │                  │
    │                  ▼
    │            PlanEntitlement
    │
    ├────────────→ UsageCounter
    │
    └────────────→ SubscriptionEvent

SaasInvoice ─────→ SaasPaymentAttempt
                         │
                         ▼
                  Billing Provider
                         │
                         ▼
                    SSLCOMMERZ
```

Entitlement path:

``` text
Tenant action
    ↓
TenantContext
    ↓
organization
    ↓
EntitlementsService
    ↓
subscription + plan + usage
    ↓
ALLOW / DENY
    ↓
tenant business operation
```

------------------------------------------------------------------------

# 49. Financial Architecture

``` text
CUSTOMER COMMERCE

Rahim
  ↓
Baby Shop
  ↓
Baby Shop Tenant DB
Payment / COD / Wallet / Refund / Settlement


SAAS BILLING

Baby Shop
  ↓
Ferio
  ↓
Control Plane
SaasInvoice / SaasPaymentAttempt / Subscription
```

The two ledgers must remain separate.

------------------------------------------------------------------------

# 50. Testing --- Feature Matrix

Example:

``` text
Plan A:
custom_domain = false

Plan B:
custom_domain = true
```

Expected:

``` text
Plan A tenant → denied
Plan B tenant → allowed
```

The tracker marks the entitlement matrix test complete.

------------------------------------------------------------------------

# 51. Testing --- Upgrade

``` text
tenant reaches limit
    ↓
action denied
    ↓
upgrade
    ↓
same tenant DB
    ↓
action succeeds
```

The MT-6 gate proves this enforcement loop against real PostgreSQL.

------------------------------------------------------------------------

# 52. Testing --- Downgrade

``` text
higher plan
    ↓
historical orders
    ↓
downgrade
    ↓
new limits apply
    ↓
historical orders remain unchanged
```

The tracker explicitly verifies historical orders survive byte-for-byte.

------------------------------------------------------------------------

# 53. Testing --- Concurrent Limit

Run simultaneous requests near the limit.

Verify:

``` text
hard limit remains correct
counter does not lose increments
denied request leaves no partial business state
```

Sequential testing alone is insufficient.

------------------------------------------------------------------------

# 54. Testing --- Suspension

Verify the intended capability-specific policy:

``` text
storefront browsing → works
checkout → CHECKOUT_DISABLED_SUSPENDED
plan/recovery information → available to authorized owner
```

------------------------------------------------------------------------

# 55. Testing --- Financial Isolation

Create a SaaS invoice/payment.

Verify:

``` text
Control Plane:
SaasInvoice ✓
SaasPaymentAttempt ✓

Tenant DB:
Payment ✗
Wallet ✗
COD ✗
Refund ✗
Settlement ✗
```

This is financial isolation, not merely code style.

------------------------------------------------------------------------

# 56. Testing --- Duplicate Callback

Send the same valid payment callback repeatedly.

Expected:

``` text
one effective transition
duplicates absorbed
```

Never:

``` text
three callbacks
→ three payments
```

------------------------------------------------------------------------

# 57. Testing --- Reconciliation

Test environment:

``` text
counter = 9
facts = 10
```

Run reconciliation.

Expected:

``` text
counter corrected
drift evidence emitted
correct organization affected
other tenants untouched
```

------------------------------------------------------------------------

# 58. Security Invariants

Memorize these:

``` text
1. Browser cannot choose its plan.
2. Browser cannot choose another organization's subscription.
3. Hidden frontend controls are not enforcement.
4. Entitlements are evaluated server-side.
5. Hard limits must survive concurrency.
6. Subscription changes do not silently destroy tenant data.
7. Downgrades preserve historical business records.
8. SaaS billing never enters tenant commerce ledgers.
9. Gateway callbacks are verified.
10. Gateway callbacks are idempotent.
11. Sensitive Platform billing actions are permissioned and audited.
12. Internal/free access is explicit rather than a secret bypass.
13. Usage drift is reconcilable.
14. Cross-plane failures are handled deliberately.
```

------------------------------------------------------------------------

# 59. Common Bad Designs

``` text
❌ hardcode "Pro" checks everywhere
❌ trust frontend currentPlan
❌ hide UI but leave API unrestricted
❌ use stale browser usage for enforcement
❌ count strict limits non-atomically
❌ delete history on downgrade
❌ delete tenant DB when subscription fails
❌ store Ferio subscription fees in tenant Payment
❌ trust payment success redirect without server verification
❌ apply duplicate gateway callbacks repeatedly
❌ give internal tenants secret code bypasses
❌ make a warning/logging failure break valid commerce
```

------------------------------------------------------------------------

# 60. Explain It Like You Are Five

> Ferio sells different boxes of tools to shops. The box is the
> **plan**. A shop's **subscription** says which box it currently has.
> **Entitlements** say which tools are inside and how many things the
> shop may use. **Usage** counts how much it has already used. If the
> shop needs a bigger box, it can upgrade without throwing away its old
> shop data. When the shop pays Ferio for the software, that money is
> kept completely separate from money the shop receives from its own
> customers.

------------------------------------------------------------------------

# 61. Junior Engineer Answer

> MT-6 adds SaaS plans, subscriptions, entitlements, usage and platform
> billing. Ferio evaluates plan features and limits on the backend,
> tracks authoritative usage, supports
> trial/active/past-due/suspended/cancelled states, and keeps
> merchant-to-Ferio subscription payments in the Control Plane instead
> of tenant commerce payment tables.

------------------------------------------------------------------------

# 62. Mid-Level Engineer Answer

> Ferio models monetization as Control Plane policy.
> `EntitlementsService.evaluate` resolves feature and limit access from
> the organization's subscription and plan rather than hardcoded
> plan-name checks. Usage metrics use registry-defined aggregation/reset
> semantics, atomic period-keyed counters and reconciliation against
> authoritative facts. Subscription transitions preserve tenant data and
> apply capability-specific restrictions. SaaS billing uses a provider
> adapter with verified idempotent payment transitions and remains
> structurally isolated from tenant commerce ledgers.

------------------------------------------------------------------------

# 63. Senior Engineer Answer

> MT-6 establishes a centralized policy and financial boundary between
> SaaS monetization and tenant commerce. Plans and entitlements describe
> reusable capabilities, subscriptions represent organization-specific
> lifecycle state, and server-side evaluation combines subscription
> state, entitlement definitions and authoritative usage to make stable
> allow/deny decisions. Strict limits must remain concurrency-safe while
> derived counters are reconcilable against source-of-truth facts.
> Upgrade/downgrade alters policy without destructively rewriting tenant
> history. Platform billing is Control Plane-only, provider-neutral,
> verified, idempotent and auditable, preserving both financial
> semantics and tenant isolation.

------------------------------------------------------------------------

# 64. Real-Code Reading Exercise

Trace:

``` text
GET /tenancy/my-plan
    ↓
organization
    ↓
Subscription
    ↓
Plan
    ↓
Entitlements
    ↓
Usage
    ↓
PlanUsageCard
```

Then:

``` text
Create Product
    ↓
CatalogService
    ↓
EntitlementsService.evaluate
    ↓
products_max
    ↓
usage
    ↓
ALLOW / PLAN_LIMIT_REACHED
```

Then:

``` text
SaaS invoice
    ↓
PlatformBillingService
    ↓
billing adapter
    ↓
SSLCOMMERZ
    ↓
verified callback
    ↓
SaasPaymentAttempt
    ↓
subscription lifecycle
```

While reading code, ask:

``` text
Where does organization identity come from?
Is entitlement enforced server-side?
Is a plan name hardcoded?
What is the authoritative usage source?
Can the counter drift?
How is drift reconciled?
What happens under concurrency?
What happens on downgrade?
Does platform billing touch tenant Prisma?
Is callback authenticity verified?
Can callback replay duplicate the result?
Is the operator action audited?
```

------------------------------------------------------------------------

# 65. Current MT-6 Status

The supplied tracker marks the major MT-6 implementation and release
gate complete, including:

``` text
✓ Starter/Business/Pro/Enterprise/internal catalog
✓ 14-day no-card trial
✓ feature and numeric entitlements
✓ staff/product/warehouse limit definitions
✓ server-side entitlement evaluation
✓ stable denial codes
✓ owner-visible plan/usage
✓ subscription lifecycle
✓ 7-day grace policy
✓ suspension policy
✓ non-destructive upgrade/downgrade behavior
✓ billing provider abstraction
✓ SSLCOMMERZ-first direction
✓ Control Plane SaaS invoices/payment attempts
✓ webhook verification/idempotency
✓ billing retry/recovery
✓ usage registry
✓ atomic counters
✓ reconciliation
✓ warning thresholds
✓ Platform/Tenant usage views
✓ entitlement test matrix
✓ real PostgreSQL plan-limit lifecycle gate
✓ SaaS-vs-commerce financial isolation
```

Commercial plan prices remain pilot-dependent in the supplied tracker.

------------------------------------------------------------------------

# 66. The Sentence to Memorize

> **A plan describes policy, a subscription attaches that policy to an
> organization, entitlements decide capabilities, usage measures
> consumption, and SaaS billing records what the organization owes
> Ferio---without contaminating the tenant's own commerce ledger.**

------------------------------------------------------------------------

# 67. Next Document

## Document 07 --- Converting Existing Commerce Modules to Tenant-Safe Operation

This is the large MT-7 migration.

We will follow Ferio's existing:

``` text
Catalog
Inventory
Cart
Checkout
Customers
Orders
COD
Payments
Wallet
Returns
Reviews
Notifications
Search
Settings
Media
```

and answer:

> Ferio already had working commerce code. How do we make every existing
> read, write, transaction, token, file, payment and background
> operation tenant-safe without rebuilding the product?

------------------------------------------------------------------------

**End of Document 06**