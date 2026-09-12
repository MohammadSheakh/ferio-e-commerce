# Ferio Engineering Learning Series

## Document 10 --- Tenant Admin & Storefront SaaS Experience (MT-10)

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-10\
**Main question:** How does Ferio turn all the invisible multi-tenant
architecture into a safe, understandable experience for each merchant
and their customers?

------------------------------------------------------------------------

# 1. What Changes in MT-10?

The earlier documents built the machinery.

``` text
tenant resolution
database isolation
provisioning
domains
plans
entitlements
tenant-safe commerce
jobs/sockets/files
Platform Admin
```

MT-10 asks:

> What does the merchant actually see?

And:

> What does the merchant's customer actually see?

This release is where infrastructure becomes product experience.

------------------------------------------------------------------------

# 2. Baby Analogy --- Moving Into a New Shop

Imagine Ferio gives a merchant a new shop in a mall.

The building already exists.

The shop now needs:

``` text
name
logo
phone number
delivery area
payment setup
courier setup
products
domain
store colors
policies
```

The merchant should not need to understand:

``` text
Prisma
PostgreSQL
TenantContext
DNS resolver internals
BullMQ
```

Ferio should turn those technical requirements into a simple setup
journey.

------------------------------------------------------------------------

# 3. Two Experiences

MT-10 has two major surfaces:

``` text
TENANT ADMIN
merchant/staff experience

CUSTOMER STOREFRONT
shopper experience
```

Both use the same trusted tenant architecture underneath.

------------------------------------------------------------------------

# 4. Tenant Admin Is Tenant-Local

When ABC's owner opens Tenant Admin:

``` text
ABC Admin
   ↓
trusted tenant context
   ↓
ABC tenant DB
```

When Perfect's owner opens the same application:

``` text
Perfect Admin
   ↓
trusted tenant context
   ↓
Perfect tenant DB
```

Same code.

Different trusted tenant.

Different data.

------------------------------------------------------------------------

# 5. Owner Onboarding

The tracker marks the invitation/first-login flow complete.

A new owner should be able to go from:

``` text
"I received access"
```

to:

``` text
"My store is ready"
```

without understanding Ferio's internal architecture.

------------------------------------------------------------------------

# 6. Store Setup Wizard

Ferio's Tenant Admin dashboard includes a Store Setup checklist.

The tracker says it combines readiness for:

``` text
store settings
delivery zones
payment
subscription
domain
```

and provides deep links to the relevant screens.

This is an important UX pattern:

> Convert distributed backend requirements into one understandable
> readiness checklist.

------------------------------------------------------------------------

# 7. Why a Checklist?

Without a checklist, a merchant might ask:

``` text
Why can't I receive an order?
Why is prepaid checkout unavailable?
Why does my store have no delivery zone?
Why isn't my domain ready?
```

A setup checklist makes dependencies visible.

------------------------------------------------------------------------

# 8. Store Identity

Store identity is tenant-scoped through `CommerceSettings`.

Conceptually:

``` text
ABC CommerceSettings
→ ABC identity

Perfect CommerceSettings
→ Perfect identity
```

The same storefront code renders different businesses.

------------------------------------------------------------------------

# 9. Branding

Tenant Admin can configure tenant-local:

``` text
logo
address
social links
approved theme preset
```

The Customer Web renders that public identity.

The key word is:

``` text
tenant-local
```

ABC branding belongs inside ABC's tenant boundary.

------------------------------------------------------------------------

# 10. Support Contacts

Each business can expose its own support information.

Example:

``` text
ABC:
support@abc.example
01...

Perfect:
help@perfect.example
01...
```

The storefront should never accidentally display another tenant's
support information.

------------------------------------------------------------------------

# 11. Currency and Timezone

The tracker says currency/timezone are validated through
`CommerceSettings` and surfaced in Store Setup.

These look like simple fields, but they influence:

``` text
money display
timestamps
business reporting
order presentation
```

They therefore belong to tenant configuration.

------------------------------------------------------------------------

# 12. Order Prefix

A tenant can have an order prefix.

Conceptually:

``` text
ABC-1001
BABY-1001
```

The underlying numeric identifiers may overlap safely because the tenant
database boundary already isolates them.

The prefix is business presentation, not the security boundary.

------------------------------------------------------------------------

# 13. Delivery Zones

Store Setup includes delivery-zone readiness.

A merchant needs to define where orders can be delivered before checkout
can behave correctly.

Again:

``` text
business setup requirement
```

is presented as:

``` text
merchant-facing configuration
```

rather than an infrastructure concept.

------------------------------------------------------------------------

# 14. COD Policy

The tracker says Tenant Admin exposes the tenant-local COD verification
policy.

Checkout and order confirmation consume the same tenant database policy.

This is important:

``` text
Admin configuration
        ↓
same tenant DB
        ↓
commerce behavior
```

There should not be one "admin copy" and another unrelated "checkout
copy."

------------------------------------------------------------------------

# 15. Payment Configuration

Tenant Admin can replace encrypted SSLCommerz/aamarPay credentials.

A provider can only be enabled after required fields validate.

The UI receives masked readiness, not raw stored secrets.

Conceptually:

``` text
merchant enters secret
   ↓
backend validates
   ↓
encrypts
   ↓
stores tenant-locally
   ↓
future UI says "configured"
```

not:

``` text
future UI displays secret
```

------------------------------------------------------------------------

# 16. Courier Configuration

Tenant Admin can manage an allowlisted courier credential set through
guarded routes.

Responses expose:

``` text
enabled
configured
```

rather than raw credentials.

This is the same secret-handling principle from MT-8, now expressed as
merchant UX.

------------------------------------------------------------------------

# 17. Notification Configuration

The tracker says Tenant Admin can list/edit transactional-message
templates through guarded tenant routes.

The template service resolves through the tenant client.

However, provider activation/credential tenancy is noted separately in
the tracker, and the broader messaging adapter readiness is not
equivalent to template editing.

So:

``` text
template UX → implemented
```

does not automatically mean:

``` text
every production SMS/WhatsApp/email adapter → complete
```

------------------------------------------------------------------------

# 18. Initial Catalog Guidance

Store Setup detects whether the tenant has a catalog product.

If not, it links directly to product creation.

This is good onboarding because it translates:

``` text
catalog empty
```

into:

``` text
"Add your first product"
```

------------------------------------------------------------------------

# 19. Plan Summary

Tenant Admin has:

``` text
GET /tenancy/my-plan
```

and a Plan & Usage card.

The merchant can understand:

``` text
which plan?
which features?
which limits?
how much usage?
```

without accessing Platform Admin.

------------------------------------------------------------------------

# 20. Usage Summary

The Plan & Usage card is tenant-scoped.

Example:

``` text
Products
742 / 1000

Orders this month
820 / 1000
```

The merchant sees their own usage.

Not fleet-wide usage.

------------------------------------------------------------------------

# 21. Near-Limit Warning

The tracker says usage at or above:

``` text
80%
```

is shown as:

``` text
near limit
```

before server-side denial.

This improves UX.

Instead of surprising the merchant at the hard limit:

``` text
warn first
→ enforce later
```

------------------------------------------------------------------------

# 22. Domain Status

`GET /tenancy/my-plan` returns active domains.

Store Setup verifies an active primary domain.

This lets the merchant understand:

``` text
"Is my store actually reachable?"
```

without needing Platform Admin's fleet-level domain diagnostics.

------------------------------------------------------------------------

# 23. Entitlement UX

The Tenant Admin sidebar consumes a tenant-scoped boolean entitlement
map.

Unavailable features can be:

``` text
hidden
or
labeled
```

depending on UX.

But:

> Frontend visibility is never the real entitlement enforcement.

------------------------------------------------------------------------

# 24. Backend Remains Authoritative

Suppose the plan does not include Feature X.

Bad security:

``` text
hide Feature X menu
```

Only.

A merchant could call the API manually.

Correct:

``` text
UI presentation
+
backend entitlement check
```

The tracker explicitly marks backend authority complete.

------------------------------------------------------------------------

# 25. Upgrade CTA

For plan-gated features, Tenant Admin provides:

``` text
Review plan or upgrade
```

This converts a denial into an understandable next step.

Good SaaS UX explains:

``` text
why unavailable
what can user do
```

------------------------------------------------------------------------

# 26. Stable Entitlement Errors

The tracker names stable machine codes:

``` text
PLAN_LIMIT_REACHED
FEATURE_DISABLED
SUBSCRIPTION_INACTIVE
```

Frontend code can map these to clear messages.

Example:

``` text
PLAN_LIMIT_REACHED
→ "You have reached your current plan limit."
```

Stable codes are much safer than parsing human exception strings.

------------------------------------------------------------------------

# 27. Downgrade Must Not Delete Historical Data

Suppose Pro allows more resources than Starter.

A tenant downgrades.

Bad:

``` text
delete everything above Starter limit
```

Ferio's tracker says changing plan updates the Control Plane
subscription reference and does not delete tenant commerce records.

Historical records remain accessible appropriately.

------------------------------------------------------------------------

# 28. Entitlement vs Data Ownership

This distinction is crucial.

A plan can control:

``` text
whether new resources may be created
```

without changing:

``` text
who owns existing records
```

Example:

``` text
Current products = 2,000
New plan limit = 1,000

Existing 2,000
→ remain

Create product 2,001
→ may be denied
```

Exact product behavior follows the implemented entitlement policy, but
this is the general principle.

------------------------------------------------------------------------

# 29. Suspended Tenant UX

The tracker says the global tenancy guard:

``` text
permits reads and authentication
blocks non-read tenant mutations
```

with:

``` text
COMMERCE_MUTATION_DISABLED_SUSPENDED
```

A service-level guard remains available for defense in depth.

------------------------------------------------------------------------

# 30. Why Allow Reads During Suspension?

The approved policy is designed so a suspended tenant can retain
appropriate visibility while commerce mutations are disabled.

Conceptually:

``` text
view records ✓
authenticate ✓
modify commerce ✗
checkout/write ✗
```

This avoids turning billing suspension into instant data disappearance.

------------------------------------------------------------------------

# 31. Branding Boundary

Ferio allows controlled customization.

The tracker permits only:

``` text
default
warm
cool
```

theme presets.

The storefront maps these fixed values to bundled CSS variables.

------------------------------------------------------------------------

# 32. Why Not Arbitrary CSS?

If a tenant could inject arbitrary CSS:

``` text
layout breakage
phishing-like overlays
data exfiltration tricks
cross-site styling issues
support complexity
```

could increase.

Ferio deliberately keeps the customization boundary typed and bounded.

------------------------------------------------------------------------

# 33. Why Not Arbitrary JavaScript?

Tenant-supplied scripts would be much more dangerous.

They could potentially:

``` text
read browser-visible data
modify checkout
capture credentials
redirect customers
break CSP assumptions
```

The tracker says the current storefront contract exposes no arbitrary
tenant script/CSS injection fields.

------------------------------------------------------------------------

# 34. Public Storefront Logo

The public `CommerceSettings` contract exposes an HTTPS-only logo URL.

The storefront header renders it using the tenant store name as alt
text.

This combines:

``` text
branding
validation
accessibility
```

------------------------------------------------------------------------

# 35. Tenant Name

Customer Web reads the tenant-local store name and uses it in:

``` text
storefront shell
metadata
```

The browser should feel like it is visiting the merchant's store, not a
generic Ferio database view.

------------------------------------------------------------------------

# 36. Hero Showcase

The Customer Web requests tenant-scoped public Hero Showcase settings
through the host-forwarding BFF path.

Flow:

``` text
customer visits ABC host
   ↓
Customer Web
   ↓
BFF forwards trusted storefront host
   ↓
backend resolves ABC
   ↓
ABC Hero Showcase
```

------------------------------------------------------------------------

# 37. Contact Information

Checkout and support pages render tenant-local:

``` text
support phone
support email
```

The tracker also notes a safe empty-contact state.

A missing setting should not cause the frontend to borrow a value from
another tenant.

------------------------------------------------------------------------

# 38. Policies

Customer Web renders tenant-local URLs for:

``` text
terms
privacy
return policy
```

Each merchant can therefore expose its own business policy references
within the allowed contract.

------------------------------------------------------------------------

# 39. Social Links

The tracker supports validated HTTPS-only links for:

``` text
Facebook
Instagram
WhatsApp
```

These are tenant-local and rendered in the storefront footer.

Validation matters because these values become public clickable links.

------------------------------------------------------------------------

# 40. Branding Cache Safety

The tracker says public commerce settings use:

``` text
no-store
```

and server-side storefront requests forward the resolved host.

Therefore a branding update cannot remain in or reuse a shared tenant
cache entry under this path.

This is both:

``` text
freshness
+
tenant isolation
```

------------------------------------------------------------------------

# 41. Storefront Tenant Behavior

Now we reach the most important customer-facing part.

The storefront must be tenant-aware for:

``` text
catalog
cart
auth
checkout
payment
tracking
analytics
wallet
warranty
services
chat
support
SEO
domain states
```

------------------------------------------------------------------------

# 42. Tenant-Aware Catalog

Customer Web server-side catalog reads forward the trusted storefront
host.

The backend resolves the correct tenant.

Conceptually:

``` text
abc.ferio.com/products
→ ABC catalog

perfect.ferio.com/products
→ Perfect catalog
```

Same route shape.

Different tenant database.

------------------------------------------------------------------------

# 43. No Legacy DB Fallback

The tracker says backend routing tests prove tenant storefront reads do
not fall back to the legacy database.

This is important.

If tenant resolution fails:

``` text
do not silently show old/default store data
```

Fail closed.

------------------------------------------------------------------------

# 44. Cart Cookies

The tracker says storefront cookies are host-only.

This matters because:

``` text
abc.ferio.com
```

and:

``` text
perfect.ferio.com
```

should not accidentally share tenant cart/session state.

------------------------------------------------------------------------

# 45. Host-Only Cookie

Conceptually:

``` text
cookie issued by ABC host
→ belongs to ABC host
```

instead of broadly sharing one cookie across every tenant subdomain.

Cookie scope is another isolation layer.

------------------------------------------------------------------------

# 46. Cart Database Routing

Cookie isolation alone is not enough.

Cart services, saved carts and reorder flows also resolve through the
tenant database.

So the safety is layered:

``` text
host-bound browser state
+
trusted tenant resolution
+
tenant-local DB
```

------------------------------------------------------------------------

# 47. Customer Authentication

Customer session cookies are host-only.

BFF calls forward the resolved storefront host.

Tenant login tokens carry the resolved organization.

Refresh rejects tokens whose organization differs from the current
tenant context.

This prevents a token from Tenant A from simply being replayed against
Tenant B.

------------------------------------------------------------------------

# 48. Authentication Flow

``` text
Customer logs into ABC
   ↓
ABC tenant context
   ↓
ABC customer identity
   ↓
token bound to ABC organization
   ↓
later request to ABC ✓
request against Perfect ✗
```

Remember:

``` text
WHO
+
WHERE
```

must agree.

------------------------------------------------------------------------

# 49. Tenant-Aware Checkout

Checkout resolves through the tenant database.

That means:

``` text
cart
prices
stock
COD policy
payment attempt
order
```

belong to the same resolved tenant.

The frontend cannot safely choose a different organization by changing
payload data.

------------------------------------------------------------------------

# 50. Payment Callback Binding

The tracker says payment attempts/callbacks use tenant database
resolution and callback organization binding.

Callbacks are special because they may arrive from the payment provider
rather than from the customer's normal browser request.

So they must re-establish tenant authority safely.

------------------------------------------------------------------------

# 51. Tenant-Aware Tracking

Tracking and storefront analytics are tenant-routed.

A page view on ABC must not increment Perfect's analytics.

Likewise, order tracking must not search a global unscoped order
namespace.

------------------------------------------------------------------------

# 52. Tenant-Aware Wallet

Wallet:

``` text
balances
ledger
top-ups
checkout debits
refunds
```

all use the resolved tenant database.

The tracker says real two-database isolation evidence exists for this
area.

Financial isolation is one of the highest-risk requirements.

------------------------------------------------------------------------

# 53. Warranty, Services and Chat

The tracker says:

``` text
warranty
service booking
product content
chatting
```

are included in the tenant-service sweep.

Realtime socket tickets/rooms also carry trusted organization scope.

So the tenant boundary continues across:

``` text
REST
database
realtime
```

------------------------------------------------------------------------

# 54. Support Information

Storefront support and checkout surfaces use tenant-local public
commerce settings.

If contact information is missing:

``` text
show safe empty state
```

not:

``` text
fall back to another organization's contact
```

------------------------------------------------------------------------

# 55. Tenant-Aware SEO

The tracker says:

``` text
metadata
sitemap
robots
```

use the resolved storefront host.

This matters because search engines also interact with tenant
storefronts.

SEO output must not accidentally mix tenants.

------------------------------------------------------------------------

# 56. Non-Active Tenant Indexing

For non-active tenant states, indexing is disabled.

This prevents search engines from treating unavailable/suspended tenant
storefront states as normal active commerce pages.

------------------------------------------------------------------------

# 57. Unknown Domain State

Suppose:

``` text
does-not-exist.ferio.com
```

The Customer Web should not show:

``` text
default tenant
first tenant
legacy store
```

The tracker says Customer Web replaces the normal storefront shell with
an explicit unknown state returned by backend resolution.

------------------------------------------------------------------------

# 58. Suspended Domain State

For a suspended tenant, Customer Web presents the approved
suspended/unavailable behavior rather than pretending the store is fully
active.

This is important because:

``` text
tenant exists
```

but:

``` text
commerce capability is restricted
```

------------------------------------------------------------------------

# 59. Unavailable State

Backend resolution may determine the storefront is unavailable for
operational/lifecycle reasons.

Frontend should render a bounded state.

Do not expose:

``` text
database errors
stack traces
internal registry details
```

to customers.

------------------------------------------------------------------------

# 60. Server-Side Entitlement Hooks

The tracker says order placement checks:

``` text
orders_per_month
```

before work begins.

After commit, usage is metered.

Metering is non-blocking and cannot fail an already-successful order.

This ordering is important.

------------------------------------------------------------------------

# 61. Why Meter Post-Commit?

Bad:

``` text
increment usage
→ order fails
```

Now usage says an order happened when it did not.

Better:

``` text
check entitlement
→ execute transaction
→ commit order
→ meter usage
```

The tracker says metering failure cannot fail the order.

------------------------------------------------------------------------

# 62. Product Limit

Product creation evaluates:

``` text
products_max
```

against the tenant's own live catalog count.

Important:

``` text
ABC product count
```

must not include:

``` text
Perfect product count
```

The entitlement input itself must be tenant-correct.

------------------------------------------------------------------------

# 63. Staff Seat Limit

The tracker says invitations have a staff-seat hook using:

``` text
PLAN_GATE
ORG_MEMBERS_COUNTER
```

Active member count feeds entitlement evaluation.

Over-limit invitations throw:

``` text
PLAN_LIMIT_REACHED
```

------------------------------------------------------------------------

# 64. Fail Closed on Entitlement Evaluation

Inside resolved tenant context, the tracker says gates fail closed if
Control Plane evaluation is unavailable.

Why?

Suppose plan validation is unavailable.

Unsafe:

``` text
"Cannot check plan, so allow everything."
```

Safe:

``` text
"Cannot establish permission, so deny bounded gated operation."
```

------------------------------------------------------------------------

# 65. Legacy Mode Nuance

The tracker says these gates activate only inside a resolved tenant
context, leaving legacy mode unaffected.

That reflects the conversion strategy.

It is a project-specific compatibility behavior, not a general
recommendation that production SaaS should retain a default-tenant
fallback.

The broader completion criteria explicitly require no legacy
default-tenant fallback in production.

------------------------------------------------------------------------

# 66. UI vs Backend Enforcement

Three layers:

``` text
Layer 1 — UX
hide/label feature

Layer 2 — API
entitlement guard/service

Layer 3 — business invariant
count/limit/state checked server-side
```

Layer 1 improves usability.

Layers 2 and 3 provide authority.

------------------------------------------------------------------------

# 67. Example --- Product Creation

``` text
Tenant Admin clicks Add Product
   ↓
sidebar says feature available
   ↓
POST /products
   ↓
trusted tenant context
   ↓
EntitlementsService
   ↓
ABC products_max
   ↓
ABC live catalog count
   ↓
allow/deny
   ↓
ABC tenant DB
```

------------------------------------------------------------------------

# 68. Example --- Order Placement

``` text
ABC customer
   ↓
ABC storefront host
   ↓
tenant resolver
   ↓
ABC context
   ↓
orders_per_month check
   ↓
ABC checkout transaction
   ↓
commit
   ↓
usage meter
```

Perfect's order counter is unrelated.

------------------------------------------------------------------------

# 69. Example --- Suspended Merchant

``` text
ABC becomes suspended
   ↓
merchant can authenticate
   ↓
reads remain available according to policy
   ↓
commerce mutation
   ↓
COMMERCE_MUTATION_DISABLED_SUSPENDED
```

Frontend should explain the state, but backend enforces it.

------------------------------------------------------------------------

# 70. Example --- Same Customer ID

Suppose:

``` text
ABC customer ID = 42
Perfect customer ID = 42
```

This is completely possible with database-per-tenant architecture.

Safe routing means:

``` text
ABC host + ABC session
→ ABC DB customer 42

Perfect host + Perfect session
→ Perfect DB customer 42
```

Numeric equality does not imply shared identity.

------------------------------------------------------------------------

# 71. Example --- Same Cart Token

If two tenants accidentally produce the same logical token value,
tenant-local database routing and host-scoped browser state must still
prevent collision.

This is why isolation should not depend on globally unique IDs alone.

------------------------------------------------------------------------

# 72. Example --- Branding

``` text
ABC:
theme = warm
logo = abc-logo

Perfect:
theme = cool
logo = perfect-logo
```

Customer Web uses the resolved host to load the correct public settings.

One shared Next.js application can therefore render many distinct
stores.

------------------------------------------------------------------------

# 73. SSR/BFF Trust Boundary

Server-side rendering creates an important question:

> When Next.js calls NestJS on behalf of the browser, how does NestJS
> still know the storefront hostname?

Ferio's storefront path forwards the approved resolved host through the
BFF/server-side request path.

The backend then performs trusted tenant resolution.

The browser should not become an arbitrary database selector.

------------------------------------------------------------------------

# 74. Why Host Forwarding Matters

Without the original tenant host:

``` text
Next.js server
→ NestJS
```

may look like a generic internal request.

The backend needs enough trusted request metadata to reconstruct:

``` text
which storefront initiated this?
```

This was a major topic in Document 05.

------------------------------------------------------------------------

# 75. Cache Isolation

Imagine:

``` text
GET /public/settings
```

is cached only by URL path.

ABC request fills cache.

Perfect requests the same path.

If hostname is absent from the cache identity:

``` text
Perfect could receive ABC branding.
```

Ferio's public commerce settings path uses `no-store`, avoiding shared
stale tenant branding on this route.

------------------------------------------------------------------------

# 76. SEO Isolation

A sitemap is data.

Metadata is data.

Robots policy is data.

Therefore:

``` text
tenant isolation
```

also applies to SEO responses.

A search crawler should never receive ABC product URLs while crawling
Perfect.

------------------------------------------------------------------------

# 77. Safe Customization Philosophy

Ferio's current customization model is:

``` text
typed fields
validated URLs
approved theme presets
static content routes
```

not:

``` text
arbitrary executable customization
```

This reduces security and support complexity.

------------------------------------------------------------------------

# 78. UX State Machine

A useful frontend mental model:

``` text
LOADING
   ↓
TENANT RESOLUTION
   ├── ACTIVE → storefront
   ├── SUSPENDED → suspended state
   ├── UNKNOWN → unknown store
   └── UNAVAILABLE → unavailable state
```

Do not render the normal storefront before tenant state is established.

------------------------------------------------------------------------

# 79. Merchant Setup State

Similarly:

``` text
tenant exists
   ↓
setup checklist
   ├── identity ready?
   ├── delivery ready?
   ├── payment ready?
   ├── subscription ready?
   ├── domain ready?
   └── catalog ready?
```

This turns backend readiness into merchant guidance.

------------------------------------------------------------------------

# 80. Two Kinds of Readiness

Do not confuse:

``` text
INFRASTRUCTURE READY
database/schema/domain technically operational
```

with:

``` text
BUSINESS READY
merchant configured store/payment/delivery/catalog
```

A tenant can have a healthy database while still not being ready to
sell.

MT-10 focuses heavily on the second type.

------------------------------------------------------------------------

# 81. Error Design

Merchant/customer errors should be:

``` text
bounded
stable
actionable
```

Examples:

``` text
PLAN_LIMIT_REACHED
FEATURE_DISABLED
SUBSCRIPTION_INACTIVE
COMMERCE_MUTATION_DISABLED_SUSPENDED
```

The UI maps them to human explanations.

Do not expose raw:

``` text
Prisma errors
Postgres errors
Redis errors
stack traces
```

------------------------------------------------------------------------

# 82. Merchant-Facing Security

A merchant should never be able to edit:

``` text
organizationId
databaseUrl
tenant database registry ID
another tenant's domain ownership
platform plan internals outside approved operations
```

Tenant Admin controls business settings, not tenant routing authority.

------------------------------------------------------------------------

# 83. Customer-Facing Security

A customer should never select:

``` text
tenantId
organizationId
database
```

to choose a store.

Store identity comes from trusted host resolution.

Customer-provided identifiers only make sense **inside** the
already-established tenant boundary.

------------------------------------------------------------------------

# 84. Test --- Two Branding Sets

Create:

``` text
ABC store name/logo/theme
Perfect store name/logo/theme
```

Request both hosts.

Verify:

``` text
ABC host → ABC branding only
Perfect host → Perfect branding only
```

Repeat with identical logical settings IDs if possible.

------------------------------------------------------------------------

# 85. Test --- Two Catalogs

Create overlapping product IDs:

``` text
ABC product 100
Perfect product 100
```

Verify:

``` text
ABC /products/100 → ABC product
Perfect /products/100 → Perfect product
```

Then try host/session mismatch.

Expected:

``` text
no cross-tenant data
```

------------------------------------------------------------------------

# 86. Test --- Session Replay

Authenticate on ABC.

Attempt to reuse token/cookie against Perfect.

Expected:

``` text
rejected or unusable
```

The tracker says refresh rejects organization mismatch.

------------------------------------------------------------------------

# 87. Test --- Suspended Tenant

Suspend ABC.

Verify:

``` text
approved reads/auth ✓
commerce mutation ✗
stable error code
storefront suspended behavior
SEO noindex/non-active behavior
```

Verify Perfect remains unaffected.

------------------------------------------------------------------------

# 88. Test --- Entitlement Limit

Set ABC near a plan limit.

Verify:

``` text
80%+ → near-limit warning
hard limit → server denial
stable machine code
```

Then verify Perfect's usage does not influence ABC.

------------------------------------------------------------------------

# 89. Test --- Downgrade

Populate historical data.

Downgrade plan.

Verify:

``` text
existing records remain
plan reference changes
new gated behavior follows new entitlement
no tenant data deleted merely due to downgrade
```

------------------------------------------------------------------------

# 90. Test --- Payment Configuration

Configure different payment credentials for two tenants.

Verify:

``` text
ABC readiness → ABC config
Perfect readiness → Perfect config
plaintext secret never returned
```

------------------------------------------------------------------------

# 91. Test --- Unknown Host

Request unknown hostname.

Expected:

``` text
explicit unknown state
no default tenant
no legacy storefront
no tenant data
```

------------------------------------------------------------------------

# 92. Test --- SEO

For two tenant hosts, verify:

``` text
metadata
canonical host behavior
sitemap
robots
```

are derived from the correct resolved tenant state.

For suspended/non-active tenant:

``` text
indexing disabled
```

according to the tracker.

------------------------------------------------------------------------

# 93. Testing the Actual MT-10 Gate

Here is the most important status nuance.

Most individual MT-10 implementation items are checked complete, and the
current checklist/evidence matrix also marks the two-tenant vertical gate
checked:

``` text
✓ A business owner can receive a tenant, configure it,
  publish products, receive an order, fulfill it,
  and see only that business's data.

✓ A second tenant can perform the same flow concurrently
  with no shared state.
```

This closes the engineering gate. It does not replace live pilot execution,
registered-host/browser evidence, provider readiness, or MT-14 production
launch approval.

------------------------------------------------------------------------

# 94. Why Can Almost Everything Be Checked but the Gate Remain Open?

Because:

``` text
feature implementation
≠
end-to-end release proof
```

You can individually prove:

``` text
branding works
checkout works
wallet isolation works
entitlements work
```

and still need one complete scenario proving:

``` text
merchant onboarding
→ setup
→ catalog
→ order
→ fulfillment
```

for two concurrent tenants.

This is a critical software-engineering lesson.

------------------------------------------------------------------------

# 95. The Missing Proof

The final proof should resemble:

``` text
Tenant A
├── provision
├── owner first login
├── configure store
├── configure delivery/payment
├── publish product
├── customer browses
├── cart
├── checkout
├── order
└── fulfill

AT THE SAME TIME

Tenant B
├── provision
├── owner first login
├── configure store
├── configure delivery/payment
├── publish product
├── customer browses
├── cart
├── checkout
├── order
└── fulfill
```

Then assert:

``` text
no DB leakage
no cookie leakage
no cache leakage
no payment leakage
no branding leakage
no order leakage
no shared state
```

------------------------------------------------------------------------

# 96. Senior Concept --- Vertical Slice Proof

Unit tests ask:

``` text
Does this component work?
```

Integration tests ask:

``` text
Do these components work together?
```

A vertical release-gate test asks:

``` text
Can a real business complete the promised journey
through the complete architecture?
```

MT-10 still needs that final vertical proof according to the supplied
tracker.

------------------------------------------------------------------------

# 97. Senior Concept --- Tenant Context Is Invisible UX

A customer should never think:

``` text
"I am currently in organization UUID abc123."
```

They should think:

``` text
"I am shopping at ABC."
```

Good multi-tenant architecture makes tenant context technically strict
but experientially invisible.

------------------------------------------------------------------------

# 98. Senior Concept --- Frontend Is a Projection of Server Truth

Tenant Admin may show:

``` text
plan
usage
domain readiness
feature availability
subscription state
```

But those views are projections of authoritative backend state.

The frontend should not invent or independently enforce SaaS policy.

------------------------------------------------------------------------

# 99. Senior Concept --- Safe Degradation

When a dependency is unavailable, choose the safe product behavior.

Examples:

``` text
unknown tenant
→ unavailable state

entitlement service unavailable
→ fail closed for gated mutation

missing support contact
→ empty state

suspended tenant
→ approved read-only behavior
```

Avoid accidental fallback to another tenant or permissive behavior.

------------------------------------------------------------------------

# 100. Senior Concept --- Presentation Isolation

Tenant isolation is not only database isolation.

Customer-visible leakage can happen through:

``` text
branding
metadata
cookies
cart
SEO
support contacts
themes
analytics
cache
```

MT-10 proves that presentation itself is part of the tenant boundary.

------------------------------------------------------------------------

# 101. Senior Concept --- Configuration as Data

Store configuration should be treated like real tenant data:

``` text
validated
authorized
tenant-routed
versioned/audited where necessary
safe to render
```

A logo URL or policy URL may seem harmless, but it becomes public
application behavior.

------------------------------------------------------------------------

# 102. Senior Concept --- No Cross-Tenant Convenience Defaults

Avoid:

``` text
if missing ABC setting
→ use Perfect/default tenant setting
```

A safe default is:

``` text
tenant-specific default
or
explicit empty/unavailable state
```

Never borrow another tenant's data to make UI look complete.

------------------------------------------------------------------------

# 103. Educational Storefront Request

Teaching pseudocode:

``` ts
async function getStorefrontSettings(request: Request) {
  const tenant = requireTenantContext();

  return tenantDb.db().commerceSettings.findFirst({
    where: { /* tenant-local schema */ },
  });
}
```

The important point is not the exact Prisma syntax.

The important point is:

``` text
tenant already resolved
→ correct tenant DB already selected
```

------------------------------------------------------------------------

# 104. Educational Entitlement UX

``` ts
try {
  await api.createProduct(dto);
} catch (error) {
  if (error.code === "PLAN_LIMIT_REACHED") {
    showUpgradeMessage();
    return;
  }

  throw error;
}
```

The frontend reacts to server truth.

It does not calculate authoritative plan eligibility itself.

------------------------------------------------------------------------

# 105. Educational Storefront State

``` ts
switch (tenancy.status) {
  case "ACTIVE":
    return <Storefront />;

  case "SUSPENDED":
    return <SuspendedStore />;

  case "UNKNOWN":
    return <UnknownStore />;

  default:
    return <UnavailableStore />;
}
```

Teaching pseudocode only.

------------------------------------------------------------------------

# 106. Educational Theme Boundary

Safe:

``` ts
type ThemePreset =
  | "default"
  | "warm"
  | "cool";
```

Then:

``` text
preset
→ bundled CSS variables
```

Unsafe design:

``` text
tenant submits arbitrary <script>
tenant submits arbitrary CSS
```

Ferio's tracker explicitly uses the bounded approach.

------------------------------------------------------------------------

# 107. Explain It Like You Are Five

> Ferio builds many online shops using one big system. Each shop owner
> gets a setup screen where they add their own name, logo, delivery
> rules, payment settings and products. Customers visiting ABC see only
> ABC's shop, cart, account and products. Customers visiting Perfect see
> only Perfect. Ferio even keeps their cookies, branding, search-engine
> pages and plan limits separate. The system is mostly built, but the
> checklist still wants one final full test where two shops complete the
> whole business journey at the same time without sharing anything.

------------------------------------------------------------------------

# 108. Junior Engineer Answer

> MT-10 turns Ferio's multi-tenant backend into merchant and customer
> UX. Tenant Admin provides onboarding, store setup, branding, provider
> configuration, plan/usage visibility and entitlement states. Customer
> Web uses trusted host resolution for catalog, auth, cart, checkout,
> wallet, tracking, support and SEO. Backend authorization and tenant
> routing remain authoritative.

------------------------------------------------------------------------

# 109. Mid-Level Engineer Answer

> The MT-10 experience projects trusted tenant state into both admin and
> storefront surfaces. Merchant configuration is persisted
> tenant-locally, plan and usage state comes from tenant-aware Control
> Plane APIs, frontend entitlement presentation mirrors---but never
> replaces---server enforcement, and suspended tenants receive
> policy-defined read/write behavior. The storefront preserves tenant
> context through host-aware SSR/BFF calls, host-only customer state,
> organization-bound auth refresh, tenant-routed commerce services and
> tenant-aware SEO/branding.

------------------------------------------------------------------------

# 110. Senior Engineer Answer

> MT-10 demonstrates that isolation is a product-surface property, not
> merely a database property. Ferio propagates trusted tenant authority
> through SSR/BFF, browser cookie scope, customer authentication,
> commerce routing, configuration, branding, analytics and SEO while
> keeping client-visible identifiers non-authoritative. Customization is
> deliberately bounded to typed settings and approved theme presets,
> entitlement UX is a projection of fail-closed backend policy,
> downgrade and suspension behavior preserve data without permitting
> unauthorized mutations, and provider readiness exposes metadata rather
> than secrets. The MT-10 engineering gate is checked by the two-tenant
> vertical evidence; live pilot, provider, and MT-14 production-launch gates
> remain separate.

------------------------------------------------------------------------

# 111. Your Codebase Exercise

Trace this complete flow:

``` text
Tenant owner invited
   ↓
first login
   ↓
Store Setup
   ↓
CommerceSettings
   ↓
delivery zone
   ↓
COD/payment/courier config
   ↓
domain active
   ↓
create product
   ↓
customer visits tenant host
   ↓
catalog
   ↓
cart
   ↓
login
   ↓
checkout
   ↓
order
   ↓
fulfillment
```

For every arrow ask:

``` text
Where does tenant identity come from?
Which database is used?
What browser state exists?
Can the client choose organizationId?
What entitlement applies?
What happens if suspended?
What is shown if configuration is missing?
Could another tenant's cache/cookie/settings appear?
What negative test proves isolation?
```

Then run the same mental trace for Tenant B simultaneously.

That is the MT-10 gate.

------------------------------------------------------------------------

# 112. The Sentence to Memorize

> **MT-10 makes tenant isolation visible as a clean SaaS experience:
> each merchant configures only their store, each customer experiences
> only the host-resolved store, frontend state reflects authoritative
> backend policy, and the final proof is two complete tenant journeys
> running concurrently without shared data, sessions, branding, limits,
> payments or commerce state.**

------------------------------------------------------------------------

# 113. Next Document

## Document 11 --- Tenant Migration Orchestration (MT-11)

Database-per-tenant creates a new production challenge.

With one database:

``` text
migration
→ one database
```

With 500 tenants:

``` text
migration
→ 500 databases
```

The next document will teach:

``` text
canonical tenant schema
migration artifact/version
schema drift
expand/migrate/contract
canary rollout
bounded batches
failure thresholds
pause/resume
retry
compatibility windows
locking migrations
migration evidence
fleet observability
```

The central question will be:

> **How does Ferio safely change the schema of hundreds or thousands of
> independent tenant databases without turning one deployment into a
> fleet-wide outage?**

------------------------------------------------------------------------

**End of Document 10**
