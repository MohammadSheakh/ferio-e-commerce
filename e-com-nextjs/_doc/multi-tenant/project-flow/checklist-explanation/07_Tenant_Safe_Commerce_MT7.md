# Ferio Engineering Learning Series

## Document 07 --- Converting Existing Commerce Modules to Tenant-Safe Operation (MT-7)

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-7\
**Goal:** Understand how Ferio converts an already-working single-store
commerce system into a safe multi-tenant system without rebuilding every
feature from zero.

------------------------------------------------------------------------

# 1. Why MT-7 Is the Big Migration

By this point, Ferio already knows:

``` text
WHO?   → authentication
WHERE? → TenantContext
MAY?   → membership / authorization / entitlement
DB?    → TenantDatabaseManager
```

But there is a huge problem.

Ferio already had real commerce features:

``` text
Catalog
Inventory
Cart
Checkout
Customers
Orders
Payments
Wallet
Shipping
Riders
Returns
Reports
Settings
Chat
Reviews
Warranty
Services
```

Those features were originally built for a single-store world.

MT-7 asks:

> **How do we keep the existing business behavior but make every
> commerce operation belong to exactly one tenant?**

This is not mainly about adding shiny new features.

It is an **isolation migration**.

------------------------------------------------------------------------

# 2. The Baby Analogy --- One Notebook Becomes Many Notebooks

Imagine a teacher originally has one notebook:

``` text
Products
Orders
Customers
Payments
```

There is only one shop, so the teacher never writes the shop name beside
anything.

Then Ferio becomes SaaS.

Now there are:

``` text
ABC Electronics
Perfect Textile
Baby Shop
```

If the teacher keeps using the old notebook, everybody's information
gets mixed together.

Ferio's database-per-tenant architecture instead gives each business its
own notebook:

``` text
ABC DB
Perfect DB
Baby Shop DB
```

But every old feature must now be taught:

> "Never grab the old notebook automatically. Use the notebook selected
> by trusted TenantContext."

That is MT-7.

------------------------------------------------------------------------

# 3. The Core Transformation

Old single-store code may conceptually look like:

``` ts
return this.prisma.product.findMany();
```

There is one global Prisma client.

In SaaS, that is dangerous on tenant HTTP paths.

The new mental model is:

``` text
request
   ↓
TenantContext
   ↓
TenantDbService
   ↓
correct tenant Prisma client
   ↓
correct tenant PostgreSQL
```

Educational pseudocode:

``` ts
const db = this.tenantDb.db();

return db.product.findMany();
```

The exact Ferio implementation should be read from the repository, but
the architectural rule is:

> **Commerce code must resolve database access through the trusted
> tenant boundary.**

------------------------------------------------------------------------

# 4. Why This Migration Is Harder Than Adding `tenantId`

A common idea is:

``` text
"Just add tenantId to every table."
```

But Ferio uses **database-per-tenant**.

So isolation is primarily:

``` text
ABC request
→ ABC database

Perfect request
→ Perfect database
```

not merely:

``` sql
WHERE tenant_id = ?
```

This gives strong database isolation, but creates another engineering
responsibility:

> Every code path that accesses commerce data must use the correct
> tenant client.

------------------------------------------------------------------------

# 5. The Golden MT-7 Rule

Memorize:

> **Every tenant-owned read, write, transaction, identifier, token,
> setting, file, credential, job and realtime event must remain inside
> the tenant boundary that created it.**

Database routing is the foundation.

But tenant safety is larger than database routing.

------------------------------------------------------------------------

# 6. The Service Sweep

The supplied tracker says the commerce service sweep now routes these
major services through `TenantDbService`:

``` text
Catalog
Cart
Checkout
Order
Shipping
CourierRouter
ShippingPolling
CommercePayments
Wallet
CustomerNotifications
Customers
CustomerAccount
StaffAccess
DeliveryPersonnel
Reconciliation
Refunds
Reports
Returns
RTO
Settlements
SettlementImports
Settings
CommerceSettings
StorefrontAnalytics
PurchaseActivity
TransactionalMessaging
Chat
ServiceBooking
Warranty
ProductContent
ProductRequest
StoreLocations
```

The tracker describes a common pattern using a `db()` helper and
optional tenant DB injection, with explicit compatibility behavior
outside resolved tenant requests.

Production tenant paths, however, must fail closed rather than silently
using a legacy default database.

------------------------------------------------------------------------

# 7. What Does "Sweep a Service" Mean?

It means reviewing every method that can touch tenant-owned state.

Example:

``` text
CatalogService
├── listProducts()
├── getProduct()
├── createProduct()
├── updateProduct()
├── publishProduct()
├── inventory()
└── adjustInventory()
```

It is not enough to fix:

``` text
createProduct()
```

while forgetting:

``` text
getProduct()
```

or:

``` text
adjustInventory()
```

A single forgotten method can become a cross-tenant leak.

------------------------------------------------------------------------

# 8. Read Isolation Matters Too

Developers often focus on writes:

``` text
"Can Tenant A modify Tenant B?"
```

But reading foreign data is already a serious breach.

You must prove:

``` text
Tenant A cannot read B's:
products
customers
orders
wallet
returns
reports
settings
chat
etc.
```

So tenant safety means:

``` text
READ isolation
+
WRITE isolation
```

------------------------------------------------------------------------

# 9. The Best Isolation Test: Overlapping IDs

Suppose:

``` text
ABC DB:
product id = product_123

Perfect DB:
product id = product_123
```

This is useful.

Why?

Because now an accidental test cannot succeed merely because IDs happen
to be globally different.

Expected:

``` text
ABC hostname/context
+ product_123
→ ABC product

Perfect hostname/context
+ product_123
→ Perfect product
```

The tracker uses this pattern repeatedly with overlapping IDs across
real tenant databases.

------------------------------------------------------------------------

# 10. Catalog

Ferio's catalog includes:

``` text
products
variants
inventory
brands
product conditions
Hero Showcase
media
search/filter behavior
```

The tracker says all Prisma-touching CatalogService methods now resolve
through the tenant-aware DB helper.

So:

``` text
abc.ferio.com/products/phone
```

must query:

``` text
ABC DB
```

while:

``` text
perfect.ferio.com/products/phone
```

queries:

``` text
Perfect DB
```

even if both tenants use identical slugs.

------------------------------------------------------------------------

# 11. Tenant-Local Uniqueness

In one shared database you may need:

``` text
UNIQUE(tenantId, slug)
```

With database-per-tenant:

``` text
ABC DB:
slug = iphone

Perfect DB:
slug = iphone
```

can coexist naturally.

Each database enforces its own local uniqueness.

This is one benefit of the architecture.

------------------------------------------------------------------------

# 12. Published vs Unpublished Isolation

A strong test can create the same product identifier in both databases:

``` text
ABC:
product_1 = PUBLISHED

Perfect:
product_1 = DRAFT
```

Then public catalog reads should return:

``` text
ABC → product visible
Perfect → product not visible
```

The tracker says this is proven against two real PostgreSQL databases.

That is much stronger than merely checking that two different IDs work.

------------------------------------------------------------------------

# 13. Product Media

Database isolation is not enough if files collide.

Bad:

``` text
products/product_123/main.jpg
```

Both tenants could generate the same logical key.

Ferio's storage design derives keys from trusted organization context:

``` text
tenants/{organizationId}/...
```

So conceptually:

``` text
tenants/org_abc/products/product_123/main.jpg

tenants/org_perfect/products/product_123/main.jpg
```

Same logical product ID.

Different physical namespace.

------------------------------------------------------------------------

# 14. Inventory

Inventory is particularly sensitive because concurrency matters.

Ferio already had:

``` text
stock movements
reservations
finite-stock guarantees
```

MT-7 moves inventory transactions behind the tenant client.

So the guarantee becomes:

``` text
ABC stock concurrency
is independent from
Perfect stock concurrency
```

A sale in ABC must never reserve Perfect's stock.

------------------------------------------------------------------------

# 15. Same SKU in Different Tenants

Example:

``` text
ABC:
SKU = BLACK-M-001

Perfect:
SKU = BLACK-M-001
```

That is valid because SKU uniqueness is tenant-local.

The tracker says identical identifiers are tested across bootstrapped
tenant databases.

------------------------------------------------------------------------

# 16. Inventory Reconciliation Jobs

HTTP isolation alone is insufficient.

A scheduled reconciliation job may run later with no browser request.

So it needs tenant identity too.

Conceptually:

``` text
scheduler
   ↓
fan out tenants
   ↓
job for org_abc
   ↓
resolve ABC DB
   ↓
reconcile ABC inventory
```

Job identity and idempotency also need tenant scope.

We will go much deeper into this in Document 08.

------------------------------------------------------------------------

# 17. Cart

Carts are deceptively dangerous.

Think about:

``` text
guest cart
saved cart
share token
reorder
cart merge
coupon
delivery zone
checkout settings
```

Every one can carry tenant meaning.

Ferio's `CartService` resolves through the tenant client.

------------------------------------------------------------------------

# 18. Host-Only Cart Cookies

The tracker says storefront cart cookies are set without a `Domain`
attribute.

That means browser semantics make them host-only.

Conceptually:

``` text
abc.ferio.com
→ ABC cart cookie

perfect.ferio.com
→ Perfect cart cookie
```

The browser itself helps separate storefront session state.

But server-side DB isolation is still required.

Cookies are not the database security boundary.

------------------------------------------------------------------------

# 19. Saved Cart Share Tokens

Suppose ABC creates:

``` text
share token = xyz
```

That token must never directly resolve a private Perfect record.

Because saved carts live inside tenant databases, lookup occurs inside
the already-resolved tenant DB.

So:

``` text
ABC context + xyz
→ search ABC DB

Perfect context + xyz
→ search Perfect DB
```

------------------------------------------------------------------------

# 20. Reorder Ownership

Reorder is more than:

``` text
find order by ID
```

It must also verify the caller's linked customer ownership inside the
resolved tenant.

The tracker tests the same order ID under two tenant contexts and proves
each tenant queries only its own database.

This combines:

``` text
WHERE? → tenant context
WHO?   → customer
MAY?   → ownership
```

------------------------------------------------------------------------

# 21. Customers

Ferio's Release 1 customer identity policy is tenant-local.

That means the same human email can conceptually exist independently in
multiple stores.

For commerce data:

``` text
ABC customer
≠
Perfect customer
```

even if:

``` text
email address happens to match
```

Tenant Admin customer search must therefore never become a platform-wide
customer search accidentally.

------------------------------------------------------------------------

# 22. Customer Metrics

Metrics such as:

``` text
total spend
delivered spend
cancellation
returns
RTO
```

must be calculated from the resolved tenant DB.

A customer with the same ID in two tenant databases must produce
independent analytics.

------------------------------------------------------------------------

# 23. Orders

Orders are one of the highest-risk modules.

Tenant scope applies to:

``` text
order creation
order reference
idempotency
history
audit
COD
confirmation
tracking
stock reservation
```

Ferio's OrderService resolves through the tenant client.

------------------------------------------------------------------------

# 24. Human-Readable Order References

Suppose both tenants can have:

``` text
ORD-1001
```

That should not cause cross-tenant lookup.

Correct:

``` text
ABC context + ORD-1001
→ ABC order

Perfect context + ORD-1001
→ Perfect order
```

The tracker contains an isolation test for the same human-readable
reference and phone across two tenant contexts.

------------------------------------------------------------------------

# 25. Order Idempotency

Imagine both tenants legitimately use:

``` text
idempotency key = checkout-abc123
```

If idempotency were globally shared without tenant scope:

``` text
ABC's request
could block
Perfect's request
```

Tenant-local database records naturally help, while external
idempotency/cache/job keys also need explicit tenant namespaces.

------------------------------------------------------------------------

# 26. COD

Cash on Delivery policy belongs to each tenant.

Example:

``` text
ABC:
staff confirmation required

Perfect:
different approved policy
```

Checkout/order confirmation must read COD policy from the resolved
tenant DB.

The tracker says two-tenant tests prove identical COD orders and
confirmation stock reservations remain isolated.

------------------------------------------------------------------------

# 27. Commerce Payments

Remember Document 06:

``` text
Customer → Merchant
= commerce payment
```

MT-7 makes commerce payment provider configuration tenant-local.

Each tenant may have its own:

``` text
provider
merchant credentials
enabled state
readiness
```

Credentials are encrypted using AES-256-GCM according to the tracker.

They are not returned in ordinary API responses.

------------------------------------------------------------------------

# 28. Payment Callback Problem

Payment callbacks are tricky because the gateway---not the customer's
browser---calls Ferio.

How does Ferio know which tenant DB owns the payment?

It cannot safely trust:

``` text
?organizationId=org_abc
```

from arbitrary callback input.

The tracker says Ferio mints an HMAC-signed `cbt` callback-binding token
at payment initiation.

Conceptually:

``` text
payment initiation in ABC
      ↓
server creates signed tenant binding
      ↓
gateway receives callback URL
      ↓
gateway calls Ferio
      ↓
Ferio verifies signed binding
      ↓
resolve ABC context
      ↓
mutate ABC payment only
```

Forgery fails closed with:

``` text
PAYMENT_CALLBACK_TENANT_INVALID
```

------------------------------------------------------------------------

# 29. Why Signed Callback Binding Matters

Without a trusted binding, an attacker could try:

``` text
real payment reference
+
foreign tenant selector
```

and trick the callback handler into opening the wrong database.

The callback token binds the processing path to trusted organization
identity.

------------------------------------------------------------------------

# 30. Wallet

Wallets are financial state.

Ferio makes them strictly tenant-local.

So:

``` text
Rahim's ABC wallet
```

cannot be treated as:

``` text
Rahim's Perfect wallet
```

even if customer/user identifiers overlap.

The tracker explicitly prohibits cross-tenant wallet balance
portability.

------------------------------------------------------------------------

# 31. Wallet Transaction Isolation

The project tests identical:

``` text
user IDs
customer IDs
order IDs
```

across two real PostgreSQL databases.

A debit in Tenant A consumes only Tenant A's wallet.

Replaying A's refund against B fails closed.

This is exactly the kind of negative test senior engineers want.

------------------------------------------------------------------------

# 32. Shipping and Courier

Tenant isolation applies to:

``` text
fulfillment queues
courier credentials
shipments
callbacks
polling
rider applications
assignments
duty state
GPS history
live map
```

Courier provider configuration is tenant-local and encrypted.

One tenant's courier account must never be used to book another tenant's
shipment.

------------------------------------------------------------------------

# 33. Rider Isolation

A rider session belonging to Tenant A must not act on Tenant B's order.

The service resolves the assigned-order lookup through the same tenant
database.

So there is no legitimate lookup path from:

``` text
A rider context
```

to:

``` text
B order
```

------------------------------------------------------------------------

# 34. GPS Retention

Tenant safety also includes lifecycle.

The tracker says `RetentionSweepService` prunes tenant-local delivery
location history after a configurable retention window, defaulting to
the approved 90-day policy.

This teaches:

> Isolation is not only "who can read?" It also includes how tenant data
> is retained and deleted.

------------------------------------------------------------------------

# 35. Returns, Refunds, RTO and Settlements

These are high-risk financial/post-purchase modules.

Ferio tenant-scopes:

``` text
returns
refunds
RTO
settlements
reconciliation
settlement imports
manual retries
scheduled reconciliation
```

Again, overlapping identifiers are tested between tenants.

------------------------------------------------------------------------

# 36. Failure Isolation

Suppose:

``` text
ABC reconciliation fails
```

That must not mean:

``` text
Perfect reconciliation never runs
```

The tracker says reconciliation scans fan out per tenant with isolated
failure evidence.

This introduces a powerful SaaS principle:

> **One unhealthy tenant should not unnecessarily become a platform-wide
> outage.**

------------------------------------------------------------------------

# 37. Settings

Settings are easy to overlook because they do not look like financial
data.

But imagine:

``` text
ABC support phone
```

appearing on:

``` text
Perfect checkout page
```

That is still a serious tenant leak.

Ferio tenant-scopes:

``` text
store name
contacts
feature flags
policy URLs
Hero Showcase
branding
commerce settings
```

------------------------------------------------------------------------

# 38. Settings Cache

Database isolation can be perfect while cache isolation is broken.

Bad:

``` text
settings:PUBLIC
```

ABC writes it.

Perfect reads it.

Leak.

Ferio uses keys shaped like:

``` text
settings:{orgId}:{type}
```

So identical setting types cannot collide between organizations.

------------------------------------------------------------------------

# 39. Platform Flags vs Tenant Flags

These are different.

``` text
Platform feature flag
→ controls Ferio platform behavior

Tenant feature flag
→ controls one merchant's commerce behavior
```

The tracker says platform feature flags use `PlatformPrismaService`,
while tenant commerce settings stay tenant-local.

Do not put both into one ambiguous "settings" bucket.

------------------------------------------------------------------------

# 40. Reviews, Warranty, Services and Product Requests

Smaller modules are dangerous precisely because developers may forget
them.

Ferio sweeps:

``` text
ServiceBookingService
WarrantyService
ProductContentService
ProductRequestService
StoreLocationsService
```

through tenant DB resolution.

A system is not tenant-safe if only Orders and Products are isolated.

------------------------------------------------------------------------

# 41. Warranty Evidence

Warranty uploads may contain private customer evidence.

The tracker says warranty evidence uses the shared R2 storage strategy
and receives:

``` text
tenants/{organizationId}/...
```

object keys derived from trusted context.

Database isolation + object-storage isolation must agree.

------------------------------------------------------------------------

# 42. Store Pickup

Store locations and outlet availability are tenant-owned.

Example:

``` text
store id = outlet_1
```

may exist in both databases.

Tenant context determines which `outlet_1` is meant.

------------------------------------------------------------------------

# 43. Chat

Realtime systems create another isolation surface.

Tenant scope applies to:

``` text
socket tickets
rooms
conversation lookup
history
admin rooms
task rooms
notifications
```

The tracker says signed socket tickets carry the resolved organization
context.

Rooms are organization-prefixed.

------------------------------------------------------------------------

# 44. Four-Client Socket Test

The tracker describes an E2E test using four live WebSocket clients
across two organizations, including overlapping user IDs.

It verifies:

``` text
connection rooms
notifications
chat relay
foreign guest join rejection
```

on the actual wire.

This is stronger than testing only a helper function that generates room
names.

------------------------------------------------------------------------

# 45. Reports and Analytics

Reports must use the tenant client too.

Imagine:

``` text
ABC dashboard revenue
```

accidentally counting Perfect's orders.

That would be catastrophic even if no individual order page leaked.

So tenant safety must cover:

``` text
aggregations
exports
analytics
social proof
purchase activity
```

not just CRUD endpoints.

------------------------------------------------------------------------

# 46. Exports

Exports deserve extra attention because they can contain many records at
once.

Ferio's available orders export is described as:

``` text
tenant-routed
bounded
permission-masked
two-tenant tested
```

A cross-tenant export bug can leak an entire dataset in one request.

------------------------------------------------------------------------

# 47. Platform Dashboard Is Different

Platform Admin sometimes needs aggregate SaaS information.

But that does not mean:

``` text
SELECT all tenant customer/order PII
```

by default.

The tracker says the Platform Admin dashboard reads Control Plane group
counts and regression tests reject organization IDs, customer/order
fields and contact data from the bounded aggregate response.

This is data minimization.

------------------------------------------------------------------------

# 48. Audit Context

Tenant audit writes automatically include safe trusted context such as:

``` text
organization
tenant database identity
domain
hostname
correlation context
```

That makes incidents traceable without logging database credentials.

------------------------------------------------------------------------

# 49. Support Access

Platform Support is not a universal hidden superuser.

When support views tenant data, Ferio requires the exact
organization/operator support grant and records:

``` text
SUPPORT_ACCESS_USED
```

The tracker says audit failure blocks the access request.

For sensitive support access:

> If you cannot record the access safely, do not silently proceed.

------------------------------------------------------------------------

# 50. Transactional Messaging

Messages may refer to:

``` text
orders
customers
payment state
delivery state
```

Therefore message outbox/template/attempt records must remain
tenant-bound.

The tracker says `TransactionalMessagingService` resolves through the
tenant client.

Background dispatch fans out per tenant.

------------------------------------------------------------------------

# 51. The Hidden Problem: Async Work

An HTTP request has TenantContext.

A background job may execute 30 seconds later.

You cannot assume the original AsyncLocalStorage request context
magically still exists.

Instead:

``` text
enqueue
   ↓
trusted organizationId in job envelope
   ↓
worker
   ↓
validate organization/registry
   ↓
re-establish tenant context
   ↓
resolve tenant DB
```

Document 08 will focus on this.

------------------------------------------------------------------------

# 52. Identity-Plane Exceptions

The tracker explicitly documents some services as intentionally not part
of the normal commerce DB sweep, including identity-plane areas such as:

``` text
auth
two-factor
oauthAccount
userDevices
userProfile
user
```

because Release 1 has a separate identity-plane policy/decision.

This is important:

> Do not blindly "tenantize everything" without understanding which
> architectural plane owns the data.

------------------------------------------------------------------------

# 53. Operations Health Exception

`operations-health` is also documented as platform-scoped by design.

That teaches another lesson:

``` text
not tenant DB
```

does not automatically mean:

``` text
forgotten bug
```

Sometimes it is an intentional boundary.

Architecture documentation distinguishes intentional exceptions from
accidental global access.

------------------------------------------------------------------------

# 54. Legacy Compatibility

During migration, some services retain explicit legacy fallback outside
resolved requests.

That can be useful for compatibility/testing.

But production tenant request paths must not silently do:

``` text
TenantContext missing
→ use old default DB
```

The MT-7 gate says production configuration rejects legacy tenancy mode
and tenant-scoped services fail closed before compatibility fallback
when the tenant boundary is enabled.

------------------------------------------------------------------------

# 55. Why Fail Closed?

Imagine a bug causes TenantContext to disappear.

Dangerous:

``` text
no tenant context
→ default database
→ return somebody's products
```

Safe:

``` text
no trusted tenant context
→ error
```

An outage is better than a cross-tenant breach.

------------------------------------------------------------------------

# 56. Migration Pattern for One Service

When converting a service, think in this order:

``` text
1. Identify every DB access.
2. Classify the data plane.
3. Replace tenant commerce access with tenant DB resolution.
4. Check transactions use the same resolved client.
5. Check IDs/tokens are tenant-bound.
6. Check caches.
7. Check jobs.
8. Check files.
9. Check sockets.
10. Check external credentials.
11. Check logs/audit.
12. Add overlapping-ID two-tenant tests.
13. Test missing context fails closed.
```

That is much safer than mechanically replacing `prisma` strings.

------------------------------------------------------------------------

# 57. Transaction Rule

Suppose OrderService starts a transaction on ABC's Prisma client.

Inside that transaction, InventoryService must not accidentally use
another/global Prisma client.

Bad conceptual flow:

``` text
ABC transaction
   ↓
Order row in ABC
   ↓
global InventoryService
   ↓
wrong DB
```

Correct:

``` text
ABC tenant client
   ↓
ABC transaction
   ├── order
   ├── inventory reservation
   └── audit
```

All transaction participants must preserve the same tenant boundary.

------------------------------------------------------------------------

# 58. Tenant Identity Must Come From Trusted Context

Bad educational pseudocode:

``` ts
async getOrder(tenantId: string, orderId: string) {
  return databaseFor(tenantId).order.findUnique(...);
}
```

if `tenantId` came directly from the browser.

Better conceptual API:

``` ts
async getOrder(orderId: string) {
  const db = this.tenantDb.db();
  return db.order.findUnique(...);
}
```

The service should not invite arbitrary DB selection through business
method arguments.

------------------------------------------------------------------------

# 59. IDs Are Not Tenant Proof

Never think:

``` text
"This UUID belongs to ABC, so finding it proves ABC."
```

An identifier alone does not establish tenant authority.

Correct reasoning:

``` text
trusted tenant context
    ↓
open ABC DB
    ↓
find ID inside ABC
```

not:

``` text
ID
    ↓
search everywhere
    ↓
discover tenant
```

for ordinary tenant requests.

------------------------------------------------------------------------

# 60. Tenant Boundary Across Surfaces

A mature tenant-isolation review checks:

``` text
PostgreSQL
Redis
BullMQ
WebSockets
Object storage
Cookies
Tokens
Provider credentials
Exports
Logs
Audit
Analytics
SEO/cache
```

If only PostgreSQL is isolated, the SaaS system is not fully isolated.

------------------------------------------------------------------------

# 61. High-Risk Modules

The MT-7 release gate specifically calls attention to automated
two-tenant coverage for high-risk:

``` text
financial
identity
realtime
```

modules.

The current checklist and evidence matrix mark this gate complete for
the covered high-risk financial, identity and realtime modules. The
remaining release risk is runtime and pilot evidence beyond automated
coverage, plus the explicitly documented identity/platform-plane
exceptions.

------------------------------------------------------------------------

# 62. MT-7 Gate Status

The supplied tracker says:

``` text
✓ Every existing protected commerce controller/service
  has a documented tenant boundary.

✓ Automated tests cover at least two tenants for every
  high-risk financial/identity/real-time module.

✓ No legacy single-store global setting or default tenant DB
  remains on production request paths.
```

MT-7's engineering gate is checked. Do not confuse that result with
the separate MT-14 live pilot and production-launch gates.

------------------------------------------------------------------------

# 63. Example Threat --- Product Leak

Attack:

``` text
Tenant A knows Tenant B product ID.
```

Request occurs under A's valid context.

Expected:

``` text
A DB is queried
B DB is never opened
foreign ID cannot reveal B product
```

The strongest protection is not:

``` text
"check that product.ownerTenantId === A"
```

after accidentally reading B.

It is:

``` text
B database was never selected.
```

------------------------------------------------------------------------

# 64. Example Threat --- Wallet Replay

Attack:

``` text
A valid order/refund identifier
is replayed under Tenant B.
```

Expected:

``` text
B context
→ B database
→ no valid matching financial transition
→ fail closed
```

The tracker has real PostgreSQL evidence for this wallet case.

------------------------------------------------------------------------

# 65. Example Threat --- Cache Collision

Both tenants request:

``` text
PUBLIC settings
```

Bad key:

``` text
settings:PUBLIC
```

Correct shape:

``` text
settings:org_abc:PUBLIC
settings:org_perfect:PUBLIC
```

Database isolation cannot rescue a cache that already returned foreign
data before the DB query happens.

------------------------------------------------------------------------

# 66. Example Threat --- Foreign Payment Callback

Attacker changes:

``` text
organizationId
```

in callback input.

Correct design:

``` text
untrusted selector ignored
signed callback tenant binding verified
trusted organization re-established
correct tenant DB opened
```

------------------------------------------------------------------------

# 67. Example Threat --- Support User

Platform operator knows:

``` text
org_abc
```

That alone must not grant tenant-data access.

Expected:

``` text
platform identity
+
active support grant
+
correct organization
+
allowed scope
+
audit
```

Only then can the support workflow cross into tenant data.

------------------------------------------------------------------------

# 68. Example Threat --- Export

A Tenant Admin requests an orders export.

Expected:

``` text
trusted tenant
→ tenant DB
→ permission check
→ bounded export
→ masked fields where required
```

Never:

``` text
global export
→ filter in frontend
```

------------------------------------------------------------------------

# 69. Testing Pyramid for Tenant Isolation

### Unit tests

Good for:

``` text
namespace helper
guard behavior
callback signature verification
context requirements
```

### Integration tests

Good for:

``` text
two real tenant DBs
same IDs
different records
transactions
financial isolation
```

### E2E tests

Good for:

``` text
hostname → resolver → context → controller → service → DB
cookies
WebSockets
real request boundaries
```

You need multiple levels.

------------------------------------------------------------------------

# 70. The Overlapping-ID Test Pattern

Reusable pattern:

``` text
Tenant A DB:
id = SAME_ID
value = "A"

Tenant B DB:
id = SAME_ID
value = "B"
```

Then:

``` text
with A context → "A"
with B context → "B"
```

Also attempt foreign operations:

``` text
A action against B semantic state
→ denied / not found / conflict
```

This pattern catches accidental global-client usage very effectively.

------------------------------------------------------------------------

# 71. Negative Tests Are First-Class

A positive test says:

``` text
ABC can read ABC order.
```

Useful.

A negative test says:

``` text
ABC cannot read Perfect order.
```

For multi-tenancy, negative tests are equally important.

The system's main promise is not only:

``` text
correct data appears
```

but also:

``` text
wrong tenant data can never appear.
```

------------------------------------------------------------------------

# 72. Two Tenants Simultaneously

Do not only test:

``` text
A request
then
B request
```

Also test concurrency:

``` text
A request ──────────┐
                   ├─ same application process
B request ──────────┘
```

Why?

Because bugs involving:

``` text
global mutable state
shared cache keys
AsyncLocalStorage misuse
singleton tenant variables
socket rooms
```

may only appear under overlap.

------------------------------------------------------------------------

# 73. Never Store "Current Tenant" in a Mutable Singleton

Dangerous concept:

``` ts
class TenantService {
  currentTenantId: string;
}
```

Request A:

``` text
currentTenantId = ABC
```

Request B arrives:

``` text
currentTenantId = Perfect
```

Request A continues:

``` text
reads currentTenantId
→ Perfect
```

Disaster.

That is why request-scoped async context such as AsyncLocalStorage
matters.

------------------------------------------------------------------------

# 74. Tenant-Safe Does Not Mean Tenant-Only

Some operations are intentionally platform-wide:

``` text
platform dashboard
platform migrations
platform health
global abuse rate limiting
identity-plane operations according to policy
```

The correct question is not:

> "Does everything have an organization ID?"

The correct question is:

> **Which architectural plane owns this operation, and what is its
> trusted boundary?**

------------------------------------------------------------------------

# 75. Platform Aggregation

Platform Admin may need:

``` text
number of active tenants
number of suspended subscriptions
migration status
billing outcomes
```

Prefer Control Plane metadata/approved aggregation.

Do not casually query every tenant's customer PII merely to build a
platform dashboard.

------------------------------------------------------------------------

# 76. Tenant-Safe Error Handling

Errors should not reveal:

``` text
foreign tenant exists
foreign order details
database URL
database credentials
provider secrets
raw encrypted credentials
```

For a foreign identifier, a bounded:

``` text
not found
conflict
forbidden
```

may be appropriate depending on the operation.

Do not turn errors into an information-disclosure channel.

------------------------------------------------------------------------

# 77. Observability

Logs should help answer:

``` text
Which organization?
Which domain?
Which correlation/request?
Which safe tenant DB registry identity?
Which operation?
```

But never log:

``` text
DB password
provider secret
full sensitive customer payload
```

Tenant-aware observability is essential when one process serves many
organizations.

------------------------------------------------------------------------

# 78. Senior Review Checklist

When you inspect any Ferio commerce service, ask:

``` text
DATA
Where is this data supposed to live?

DB
Which Prisma client is used?

CONTEXT
Where does organization identity come from?

TRANSACTION
Does every nested operation use the same tenant client?

IDENTIFIERS
Can identical IDs exist safely in another tenant?

CACHE
Does the key include trusted tenant identity?

JOB
Does async work carry trusted organization identity?

SOCKET
Are rooms tenant-prefixed?

FILE
Does object storage include tenant namespace?

CREDENTIAL
Is provider configuration tenant-local and encrypted?

AUTH
Is ownership/membership checked after tenant selection?

ERROR
Can failures reveal foreign data?

TEST
Is there a negative two-tenant test?
```

------------------------------------------------------------------------

# 79. Educational NestJS Pattern

This is teaching pseudocode, not a claim that Ferio's source looks
exactly like this:

``` ts
@Injectable()
export class CatalogService {
  constructor(
    private readonly tenantDb: TenantDbService,
  ) {}

  async listProducts() {
    const db = this.tenantDb.db();

    return db.product.findMany({
      where: { published: true },
    });
  }
}
```

The important part is not the syntax.

It is:

``` text
CatalogService
does not decide tenant from request payload.

TenantDbService
uses already-established trusted context.
```

------------------------------------------------------------------------

# 80. Educational Transaction Pattern

``` ts
async confirmOrder(orderId: string) {
  const db = this.tenantDb.db();

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    // inventory, audit, etc. use THIS transaction/client
  });
}
```

Do not start with ABC's tenant DB and then call a helper that secretly
uses a global Prisma client.

------------------------------------------------------------------------

# 81. Educational Callback Pattern

``` ts
async handleGatewayCallback(input: CallbackInput) {
  const binding = this.callbackBinding.verify(input.cbt);

  // Trusted organization comes from verified server-minted binding.
  return this.tenantRunner.forOrganization(
    binding.organizationId,
    async () => {
      // Resolve payment in that tenant only.
    },
  );
}
```

Again: educational architecture, not exact source.

------------------------------------------------------------------------

# 82. Migration Strategy

A safe migration of a large existing system is incremental.

Conceptually:

``` text
inventory service
→ sweep
→ tests

catalog
→ sweep
→ tests

orders
→ sweep
→ tests

wallet
→ sweep
→ tests
...
```

Then add architecture checks so new code cannot easily reintroduce the
old pattern.

------------------------------------------------------------------------

# 83. Architecture Tests

Human review can miss things.

Useful automated rules can detect:

``` text
forbidden global Prisma imports
missing TenantMembershipGuard
tenant service importing platform billing incorrectly
unsafe production fallback
```

Ferio's tracker already references architecture checks for several
boundaries.

Architecture tests turn design rules into executable constraints.

------------------------------------------------------------------------

# 84. Why "Works" Is Not Enough

A feature can appear perfectly functional:

``` text
create order ✓
pay ✓
refund ✓
```

while still being catastrophically unsafe if another tenant can access
the same state.

For SaaS:

``` text
functional correctness
+
tenant isolation
+
authorization
+
failure safety
```

together define correctness.

------------------------------------------------------------------------

# 85. MT-7 Mental Model

``` text
                    TRUSTED TENANT CONTEXT
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
      Database            Namespace          Credentials
          │                  │                  │
          ▼                  ▼                  ▼
 Products/Orders      Cache/Jobs/Sockets    Payment/Courier
 Wallet/Returns       Files/Tokens          Tenant providers
 Reports/Settings
```

Every branch must agree on the same tenant.

------------------------------------------------------------------------

# 86. Explain It Like You Are Five

> Ferio used to have one shop, so all the code could use one big
> notebook. Now Ferio has many shops. MT-7 teaches every old feature to
> first use the shop that the trusted server selected. ABC's products,
> money, orders, files, settings and messages stay with ABC. Perfect's
> stay with Perfect. Even if both shops use the same ID, name, SKU or
> order number, they still cannot touch each other's things.

------------------------------------------------------------------------

# 87. Junior Engineer Answer

> MT-7 migrates Ferio's existing commerce modules from
> global/single-store database access to tenant-aware access through
> `TenantDbService`. Catalog, inventory, cart, customers, orders,
> payments, wallet, fulfillment, returns, reports, settings and other
> commerce modules operate against the resolved tenant database, with
> tenant-scoped supporting identifiers and isolation tests.

------------------------------------------------------------------------

# 88. Mid-Level Engineer Answer

> MT-7 is a systematic isolation sweep rather than a feature rewrite.
> Every tenant-owned persistence path is classified and moved behind the
> trusted tenant DB boundary, while secondary surfaces such as media
> keys, settings caches, payment callback bindings, job identifiers,
> socket rooms and provider credentials are aligned with the same
> organization context. Tests deliberately use overlapping identifiers
> across independent PostgreSQL databases to expose accidental
> global-client access.

------------------------------------------------------------------------

# 89. Senior Engineer Answer

> MT-7 converts the existing commerce domain into a database-per-tenant
> execution model while preserving established business behavior. The
> migration treats tenant context as a trust boundary propagated
> consistently across persistence, transactions, asynchronous work,
> financial workflows, object storage, realtime channels, configuration
> and observability. Isolation is proven negatively using overlapping
> identifiers and concurrent tenants rather than inferred from unique
> test data. Explicit identity/platform-plane exceptions prevent
> indiscriminate tenantization, while production paths fail closed when
> tenant context is unavailable. The remaining release risk is
> runtime/pilot evidence beyond automated coverage, plus the explicitly
> documented identity/platform-plane exceptions.

------------------------------------------------------------------------

# 90. Current MT-7 Status From the Supplied Tracker

The tracker shows extensive completion across:

``` text
✓ catalog
✓ inventory
✓ cart/checkout
✓ customers
✓ orders/COD
✓ commerce payments
✓ wallet
✓ fulfillment/courier/rider
✓ returns/refunds/RTO/settlements
✓ settings/branding
✓ services/warranty/reviews/product requests/pickup
✓ chat
✓ reports/analytics/audit
✓ transactional messaging
✓ documented commerce service sweep
✓ production default-DB fallback removal
```

The current MT-7 release gate now shows:

``` text
✓ Automated tests cover at least two tenants
  for every high-risk financial/identity/real-time module.
```

MT-7's engineering gate is checked. Do not confuse that with separate
MT-14 live pilot and production-launch gates.

------------------------------------------------------------------------

# 91. Your Codebase Exercise

Pick one Ferio service, for example `OrderService`.

Trace:

``` text
Controller
   ↓
Guard
   ↓
OrderService
   ↓
TenantDbService
   ↓
Tenant Prisma
   ↓
transaction
   ↓
inventory / audit / payment side effects
```

Then answer:

``` text
1. Where is TenantContext established?
2. Does OrderService accept a client-supplied tenant selector?
3. Which Prisma client starts the transaction?
4. Do nested operations use the same client?
5. Is order reference uniqueness tenant-local?
6. Is idempotency tenant-safe?
7. Can the same order ID exist in another tenant?
8. What happens if context is missing?
9. Are background jobs tenant-bound?
10. Is there a negative two-database test?
```

If you can answer those from the code, you are beginning to read Ferio
like a senior engineer.

------------------------------------------------------------------------

# 92. The Sentence to Memorize

> **MT-7 does not merely put tenant IDs on features; it makes the
> trusted tenant context determine the entire commerce execution
> boundary---from database and transaction to cache, token, file,
> payment, job, socket and audit---and proves that boundary with
> negative two-tenant tests.**

------------------------------------------------------------------------

# 93. Next Document

## Document 08 --- Redis, BullMQ, WebSockets, Cache, Files & External Integrations (MT-8)

Next we leave ordinary HTTP/database code and study the dangerous places
where tenant context can easily disappear:

``` text
Redis
BullMQ workers
scheduled jobs
WebSockets
rooms
object storage
payment/courier credentials
transactional messaging
```

The central question will be:

> **How does Ferio preserve tenant isolation after the original HTTP
> request is gone?**

------------------------------------------------------------------------

**End of Document 07**
