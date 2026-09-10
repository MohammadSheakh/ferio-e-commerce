# Ferio Engineering Learning Series

## Document 01 --- Ferio & Multi-Tenancy Fundamentals

**Level:** Beginner-friendly explanation → senior/industry-level
understanding\
**Project:** Ferio Commerce SaaS\
**Purpose:** Build the mental model required before reading or changing
the multi-tenant codebase.

------------------------------------------------------------------------

# 1. What You Should Understand After This Document

By the end of this lesson, you should be able to explain:

-   what Ferio is becoming;
-   what **SaaS** means;
-   what a **tenant** is;
-   why multi-tenancy is mainly an **isolation problem**, not just a
    database problem;
-   the difference between the **Control Plane** and **Tenant Plane**;
-   why Ferio uses **one operational PostgreSQL database per tenant**;
-   how one NestJS backend can safely serve many businesses;
-   why the browser must never be trusted to select a tenant database;
-   what **trusted tenant context** means;
-   what "fail closed" means;
-   what must be isolated besides PostgreSQL;
-   how an industry engineer thinks about multi-tenant failures and
    security.

The goal is not to memorize definitions. The goal is to build a picture
in your head.

------------------------------------------------------------------------

# 2. Start With the Old Ferio

Imagine Ferio originally runs one business:

``` text
Customer
   |
   v
Ferio Website
   |
   v
NestJS Backend
   |
   v
PostgreSQL
   |
   v
Products / Orders / Customers
```

There is only one business.

If the backend asks:

> "Give me all products."

there is no difficult question about **which company's products**.

There is only one company.

This is a **single-tenant mental model**.

Ferio's migration baseline is an existing single-tenant commerce
implementation. The SaaS work is not intended to rebuild all commerce
features; it progressively moves the existing commerce capabilities
behind a trusted tenant boundary.

------------------------------------------------------------------------

# 3. What Does SaaS Mean?

**SaaS** means **Software as a Service**.

Instead of building a completely separate software product for every
company, Ferio operates a platform that many companies can use.

Imagine:

``` text
                    FERIO
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
 ABC Electronics  Perfect Textile  Baby Shop BD
```

All three businesses use Ferio.

They may use the same:

-   NestJS application;
-   storefront codebase;
-   admin application;
-   mobile application;
-   infrastructure patterns;
-   deployment pipeline.

But their **business data and authority must remain isolated**.

That last sentence is the important part.

------------------------------------------------------------------------

# 4. What Is a Tenant?

In this project:

> **A tenant is one business/organization using Ferio.**

Examples:

``` text
ABC Electronics = Tenant A
Perfect Textile = Tenant B
Baby Shop BD    = Tenant C
```

Do not imagine a tenant as merely a user.

One tenant can have:

``` text
ABC Electronics
|
+-- Owner
+-- Admins
+-- Warehouse staff
+-- Customer-service staff
+-- Riders
+-- Customers
+-- Products
+-- Orders
+-- Payments
+-- Inventory
+-- Settings
```

The **organization/business** is the tenant boundary.

------------------------------------------------------------------------

# 5. The Apartment-Building Analogy

This analogy will stay useful throughout the entire course.

Imagine Ferio is a large apartment building.

``` text
FERIO APARTMENT BUILDING
|
+-- Apartment A -> ABC Electronics
+-- Apartment B -> Perfect Textile
+-- Apartment C -> Baby Shop BD
```

The businesses share the building infrastructure.

But ABC must not be able to open Perfect Textile's apartment.

So we can map the architecture like this:

  Ferio concept           Apartment analogy
  ----------------------- ------------------------------------------
  Ferio platform          Building
  Tenant                  Apartment resident/business
  Control Plane           Building management office
  Tenant database         Private apartment
  Tenant Resolver         Reception/security desk
  TenantContext           Trusted apartment-access label
  TenantDatabaseManager   Controlled path to the correct apartment
  Platform Admin          Building management
  Tenant Admin            Manager of one apartment/business

The analogy is not technically perfect, but it gives you the correct
first mental model:

> **Shared platform does not mean shared authority.**

------------------------------------------------------------------------

# 6. Multi-Tenancy Is Not "Add tenantId Everywhere"

A beginner may think:

``` text
We have many companies.
Therefore add tenantId to every table.
Done.
```

That is only one possible multi-tenant architecture.

Ferio's target architecture is different.

Ferio uses:

> **database-per-tenant for operational commerce data.**

Conceptually:

``` text
Ferio Control Plane DB

ABC Electronics DB
Perfect Textile DB
Baby Shop BD DB
```

So ABC's `Order` table physically lives in a different operational
database from Perfect Textile's `Order` table.

This is a major architectural decision.

------------------------------------------------------------------------

# 7. Ferio Has Two Main Data Worlds

## 7.1 Control Plane

The **Control Plane** manages the SaaS platform itself.

It answers questions such as:

``` text
Which organizations exist?
Which hostname belongs to which organization?
Which database belongs to that organization?
Which plan is it using?
Is its subscription active?
What features is it entitled to use?
Is provisioning complete?
What schema version is its database on?
```

Examples of Control Plane concepts include:

``` text
Organization
TenantDomain
TenantDatabase
Plan
Subscription
SaasInvoice
SaasPaymentAttempt
UsageCounter
PlatformUser
OrganizationMember
SupportAccessGrant
PlatformAuditLog
```

Baby version:

> **Control Plane = information ABOUT the businesses.**

------------------------------------------------------------------------

## 7.2 Tenant Plane

A tenant database contains the operational commerce world of one
business.

For ABC Electronics:

``` text
ABC DATABASE
|
+-- Products
+-- Variants
+-- Inventory
+-- Customers
+-- Addresses
+-- Carts
+-- Orders
+-- Payments
+-- Wallet
+-- Returns
+-- Refunds
+-- Riders
+-- Reviews
+-- Settings
+-- Chat
+-- Reports
```

Perfect Textile gets its own independent database containing its own
versions of those records.

Baby version:

> **Tenant DB = information INSIDE the business.**

------------------------------------------------------------------------

# 8. The Rule You Should Memorize

``` text
ABOUT the shop  -> Control Plane
INSIDE the shop -> Tenant Database
```

Example:

### ABC pays Ferio for the SaaS subscription

``` text
ABC Electronics
      |
      | SaaS subscription payment
      v
    FERIO
```

That belongs to the **Control Plane**.

### Nadia buys a phone from ABC

``` text
Nadia
  |
  | product purchase
  v
ABC Electronics
```

That commerce payment belongs to **ABC's tenant database**.

These are both "payments," but they belong to completely different
financial domains.

A production system must not confuse them.

------------------------------------------------------------------------

# 9. Why Database-per-Tenant?

Imagine both companies use one database:

``` text
Orders

id | tenantId | order
-----------------------------
1  | ABC      | Nadia's order
2  | PERFECT  | Karim's order
```

Every query must correctly enforce tenant scope.

A missing condition could become dangerous:

``` sql
SELECT * FROM orders;
```

instead of logically:

``` sql
SELECT *
FROM orders
WHERE tenant_id = 'ABC';
```

Ferio's database-per-tenant design changes the boundary.

ABC request:

``` text
ABC Request
   |
   v
ABC Database
   |
   v
Order.findMany()
```

Perfect request:

``` text
Perfect Request
   |
   v
Perfect Database
   |
   v
Order.findMany()
```

The query may not need a tenant filter because the **selected
operational database is already tenant-specific**.

This does not magically make the system secure. The difficult security
question moves to:

> **How does Ferio guarantee that it selected the correct database?**

That is why tenant resolution and trusted context are critical.

------------------------------------------------------------------------

# 10. One Backend Can Serve Many Tenants

Ferio does not need this:

``` text
ABC NestJS Server
Perfect NestJS Server
BabyShop NestJS Server
```

The intended architecture can use one shared NestJS application:

``` text
                 NestJS
                   |
        +----------+----------+
        |          |          |
        v          v          v
      ABC DB   Perfect DB   Baby DB
```

The code can be shared.

The data connection changes according to trusted tenant context.

That gives us one of the most important sentences in the entire
architecture:

> **Same application code does not mean same tenant data.**

------------------------------------------------------------------------

# 11. Follow One Request

Nadia opens:

``` text
https://abc.ferio.com
```

and requests products.

Conceptually:

``` text
abc.ferio.com
      |
      v
NestJS receives request
      |
      v
Tenant Resolver
      |
      | "abc.ferio.com belongs to ABC"
      v
TenantContext
      |
      | organization = ABC
      | database registry = ABC_DB
      v
CatalogService
      |
      v
TenantDbService
      |
      v
TenantDatabaseManager
      |
      v
ABC Prisma Client
      |
      v
ABC PostgreSQL
```

Now Perfect Textile sends a request:

``` text
perfect.ferio.com
      |
      v
same NestJS application
      |
      v
Tenant Resolver
      |
      | organization = PERFECT
      v
Perfect tenant database
```

Same backend.

Different trusted context.

Different database.

Different data.

------------------------------------------------------------------------

# 12. Why Can't the Browser Select the Tenant?

Suppose Ferio accepted:

``` json
{
  "tenantId": "ABC"
}
```

and used that value to choose a database.

A malicious user could change it:

``` json
{
  "tenantId": "PERFECT"
}
```

The browser is controlled by the user.

The user can modify:

-   request bodies;
-   query parameters;
-   many headers;
-   JavaScript;
-   API calls;
-   local storage;
-   cookies they control;
-   mobile-client requests.

Therefore:

> **Client-supplied database identity is untrusted.**

Ferio's implementation rule explicitly prohibits request
body/query/header values such as `tenantId`, `organizationId`, or
`databaseUrl` from selecting the tenant database.

------------------------------------------------------------------------

# 13. Trusted Tenant Resolution

For a normal storefront request, the server starts from the trusted
routing mechanism.

Conceptually:

``` text
Incoming hostname
      |
      v
normalize hostname
      |
      v
look up TenantDomain
      |
      v
validate organization/domain state
      |
      v
load trusted TenantDatabase registry identity
      |
      v
create TenantContext
```

The important word is:

> **trusted**

A random request value does not become authoritative merely because it
contains an organization ID.

------------------------------------------------------------------------

# 14. What Is TenantContext?

Imagine a waiter taking an order in a restaurant.

The waiter writes:

``` text
TABLE 7
```

on the ticket.

The kitchen does not need to ask every time:

> "Which table was this again?"

The trusted ticket carries that context.

Ferio uses a similar idea.

Conceptually:

``` text
TenantContext
{
    organizationId: ABC,
    databaseRegistryId: ABC_DB,
    hostname: abc.ferio.com,
    subscriptionState: ACTIVE,
    correlation metadata: ...
}
```

This is not frontend-controlled database configuration.

It is server-created request context.

Ferio's implementation uses an **immutable request-scoped TenantContext
via AsyncLocalStorage**.

------------------------------------------------------------------------

# 15. What Does Immutable Mean?

Immutable means:

> once created for that request, application code cannot casually change
> it.

Bad imaginary situation:

``` text
Request begins as ABC
        |
        v
some service changes tenant
        |
        v
request suddenly becomes PERFECT
```

That would destroy the trust boundary.

Instead:

``` text
Request begins
      |
      v
TenantContext = ABC
      |
      v
frozen / immutable
      |
      v
all downstream work stays ABC
```

------------------------------------------------------------------------

# 16. AsyncLocalStorage --- Baby Explanation

Without request context, you might pass tenant information manually:

``` text
Controller(tenant)
    |
    v
Service(tenant)
    |
    v
OtherService(tenant)
    |
    v
Repository(tenant)
```

That becomes noisy and easy to misuse.

AsyncLocalStorage lets Node.js associate trusted context with the
asynchronous execution of a request.

Baby analogy:

> Ferio puts an invisible trusted "ABC" sticker on the request.

Deep services can ask:

``` text
Which tenant context am I currently running inside?
```

and receive ABC.

Industry-level warning:

AsyncLocalStorage is not permission by itself. It is a context
propagation mechanism. The security comes from establishing that context
from trusted resolution and ensuring privileged operations validate
identity, membership, permissions, lifecycle, and other required
policies.

------------------------------------------------------------------------

# 17. TenantDbService

Now imagine `CatalogService` wants the database.

It should not say:

``` text
Connect to database URL supplied by browser.
```

Instead, conceptually:

``` text
CatalogService
      |
      v
TenantDbService
      |
      v
current trusted TenantContext
      |
      v
trusted TenantDatabase registry
      |
      v
TenantDatabaseManager
```

This gives application services a consistent tenant-aware database
boundary.

------------------------------------------------------------------------

# 18. TenantDatabaseManager

The TenantDatabaseManager is not the thing that creates new businesses.

Provisioning creates/prepares tenant resources.

The manager's job is closer to:

> **Give the application a safe, managed client for an already
> registered tenant database.**

Ferio's current implementation includes industry-level
connection-management concerns such as:

``` text
bounded clients
LRU caching
idle eviction
acquisition timeout
per-database circuit breaker
encrypted credentials
graceful disconnect
```

You do not need to understand those yet.

First remember:

``` text
TenantDatabaseManager
        |
        v
correct tenant DB client
```

------------------------------------------------------------------------

# 19. Why Not Create PrismaClient on Every Request?

Imagine 1,000 requests.

Bad architecture:

``` text
request 1 -> new PrismaClient
request 2 -> new PrismaClient
request 3 -> new PrismaClient
...
request 1000 -> new PrismaClient
```

Database connections are limited resources.

Unbounded clients can exhaust:

-   PostgreSQL connections;
-   memory;
-   file descriptors;
-   infrastructure capacity.

So Ferio uses a bounded manager.

Conceptually:

``` text
TenantDatabaseManager

ABC     -> cached client
Perfect -> cached client
Baby    -> cached client

old/idle clients -> evicted
unhealthy DB     -> circuit-breaker behavior
```

This is where "works in development" becomes "designed for production."

------------------------------------------------------------------------

# 20. What Does Fail Closed Mean?

Suppose:

``` text
abc.ferio.com
```

cannot be resolved.

A dangerous system might say:

``` text
Hmm...
tenant lookup failed.

Let's use the old/default Ferio database.
```

That could expose the wrong company's data.

Ferio explicitly forbids that.

Correct behavior:

``` text
Tenant resolution failed
        |
        v
STOP
        |
        v
return controlled error
```

This is called:

> **fail closed**

When security context cannot be proven, deny access rather than
guessing.

------------------------------------------------------------------------

# 21. Unknown Tenant Example

Request:

``` text
evil-example.ferio.com
```

No organization owns it.

Correct:

``` text
unknown host
    |
    v
tenant resolution fails
    |
    v
request rejected
```

Incorrect:

``` text
unknown host
    |
    v
use default database
```

The second behavior is precisely the kind of fallback a multi-tenant
system must avoid.

------------------------------------------------------------------------

# 22. Suspended Tenant Example

Suppose ABC exists, but its organization/subscription state does not
permit a commerce operation.

The system should not pretend ABC does not exist, nor silently route
elsewhere.

Instead, the trusted organization is resolved and the approved
lifecycle/subscription policy is enforced.

For example, Ferio's current subscription policy keeps a suspended
storefront browsable while disabling approved commerce mutations such as
checkout.

This shows an important separation:

``` text
Tenant resolution:
"Which organization is this?"

Authorization/lifecycle/entitlement:
"What may happen for this organization right now?"
```

Those are related, but not identical questions.

------------------------------------------------------------------------

# 23. Database Isolation Is Only Part of Multi-Tenancy

Imagine ABC and Perfect have separate PostgreSQL databases.

Great.

But then both use this Redis key:

``` text
settings:hero
```

ABC writes:

``` text
ABC HERO BANNER
```

Perfect later reads the same global key.

Now the databases are isolated but the cache is not.

Result:

> Perfect could receive ABC's cached data.

So true tenant isolation must include more than PostgreSQL.

------------------------------------------------------------------------

# 24. The Full Isolation Surface

Ferio's completion rules require tenant-safe boundaries for:

``` text
PostgreSQL
Redis/cache
BullMQ jobs
WebSocket rooms
files/object storage
authorization
audit/logging context
background processing
integration credentials
```

Think:

``` text
Tenant isolation
|
+-- Database
+-- Cache
+-- Jobs
+-- Sockets
+-- Files
+-- Credentials
+-- Identity/membership
+-- Audit
+-- Operational tooling
```

If only the database is isolated, the SaaS boundary is incomplete.

------------------------------------------------------------------------

# 25. Redis Example

Unsafe:

``` text
settings:hero
```

Safer tenant-aware idea:

``` text
settings:ORG_ABC:hero
settings:ORG_PERFECT:hero
```

The exact key convention is an implementation detail.

The architecture rule is:

> tenant-owned cached state must not collide across organizations.

------------------------------------------------------------------------

# 26. BullMQ Example

A background worker may run after the original HTTP request is gone.

HTTP request originally knew:

``` text
hostname = abc.ferio.com
```

But later the worker sees only a job.

Unsafe job:

``` json
{
  "orderId": "1001"
}
```

Which tenant owns order `1001`?

ABC may have `1001`.

Perfect may also have `1001`.

So tenant-bearing jobs need trusted organization scope.

Conceptually:

``` json
{
  "organizationId": "ORG_ABC",
  "orderId": "1001"
}
```

The worker then resolves the organization's registered database through
the trusted server-side path.

------------------------------------------------------------------------

# 27. WebSocket Example

Unsafe room:

``` text
order:1001
```

Both tenants may have order `1001`.

Safer architecture:

``` text
tenant:ORG_ABC:order:1001
tenant:ORG_PERFECT:order:1001
```

And the socket must be authorized for its organization before joining
the room.

A prefix alone is not authorization.

------------------------------------------------------------------------

# 28. File Storage Example

Suppose both businesses upload:

``` text
logo.png
```

Unsafe object layout:

``` text
uploads/logo.png
```

Tenant-aware concept:

``` text
tenants/ORG_ABC/...
tenants/ORG_PERFECT/...
```

Again, naming alone is not enough. Presigned URLs, authorization and
metadata operations must also enforce ownership.

------------------------------------------------------------------------

# 29. Identity Is Not Tenant Context

Suppose Rahim logs in.

Authentication proves:

``` text
user = Rahim
```

It does **not** automatically prove:

``` text
Rahim may administer ABC.
```

The request needs both dimensions:

``` text
WHO?
Rahim

WHERE?
ABC

MAY HE ACT THERE?
membership + permission
```

This gives a powerful formula:

``` text
Identity + Tenant + Authorization
```

------------------------------------------------------------------------

# 30. Platform Admin Is Not Tenant Admin

Ferio has a separate Platform Admin authorization domain.

Platform Admin responsibilities may include:

``` text
Organizations
Plans
Subscriptions
Provisioning
Domains
Tenant DB registry/health
Migrations
SaaS billing
Support access
Platform health
```

Tenant Admin responsibilities are about one organization's commerce
operations.

Example:

``` text
ABC Tenant Admin
   |
   +-- ABC products
   +-- ABC orders
   +-- ABC inventory
```

not:

``` text
all Ferio organizations
all SaaS invoices
all tenant DB credentials
```

The two authority domains must remain explicit.

------------------------------------------------------------------------

# 31. Support Access Is a Special Case

Sometimes Ferio support personnel may need to investigate tenant data.

Bad design:

``` text
Platform Admin
      |
      v
can always read every tenant DB
```

A safer design uses explicit support access:

``` text
support person
     |
     v
request/grant
     |
     +-- reason
     +-- tenant scope
     +-- expiry
     +-- revocation
     +-- audit
     |
     v
temporary authorized access
```

Ferio's implementation models support-access grants and requires
explicit audited support access rather than making platform identity
equivalent to tenant commerce authority.

------------------------------------------------------------------------

# 32. Cross-Database Foreign Keys

Suppose an ABC order wants to reference the Control Plane's
`Organization` row.

A normal database foreign key works inside one database.

But:

``` text
Control Plane DB
      X
ABC Tenant DB
```

are separate databases.

Ferio therefore treats cross-plane references as opaque
identifiers/messages rather than pretending ordinary relational foreign
keys span the boundary.

Baby version:

> One apartment cannot install a physical door directly into the
> management office's filing cabinet.

------------------------------------------------------------------------

# 33. Transactions Have Boundaries Too

Inside ABC's database:

``` text
create order
reserve inventory
write order audit
```

may participate in one database transaction where designed.

But this is dangerous thinking:

``` text
Control Plane transaction
+
ABC tenant DB transaction
=
one magical ACID transaction
```

They are separate databases.

Cross-plane workflows need patterns such as:

``` text
state machines
idempotency
recorded steps
retry
compensation
orchestration
```

Provisioning is a perfect example.

------------------------------------------------------------------------

# 34. The Noisy-Neighbor Problem

Multi-tenant systems share resources.

Imagine ABC suddenly gets huge traffic.

Potential effect:

``` text
ABC traffic spike
      |
      v
connections / CPU / queues
      |
      v
Perfect becomes slow
```

This is called a **noisy-neighbor** problem.

Database-per-tenant improves some isolation properties, but shared
backend, Redis, workers, network and infrastructure still need resource
controls.

Ferio's bounded tenant-client manager is one example of protecting
shared infrastructure.

------------------------------------------------------------------------

# 35. Blast Radius

**Blast radius** means:

> If something breaks, how much of the system can it affect?

Example:

``` text
Perfect tenant DB goes down
```

Desired behavior:

``` text
Perfect
  -> unavailable/degraded

ABC
  -> continues operating
```

Not:

``` text
Perfect DB failure
      |
      v
entire Ferio platform crashes
```

Ferio's database isolation tests explicitly cover the principle that one
tenant database outage must not route to another tenant and should not
unnecessarily crash healthy tenant traffic.

------------------------------------------------------------------------

# 36. Tenant IDs Can Overlap Inside Separate Databases

ABC may have:

``` text
Product ID = 123
```

Perfect may also have:

``` text
Product ID = 123
```

That is okay.

Because:

``` text
ABC DB / Product 123
```

and:

``` text
Perfect DB / Product 123
```

are different records in different databases.

This is why an ID alone is often insufficient when work moves outside a
tenant-bound request.

Background jobs, logs and operational systems need tenant identity as
well.

------------------------------------------------------------------------

# 37. Senior-Level Mental Model: Trust Boundaries

An industry engineer does not only ask:

> "Does the feature work?"

They ask:

``` text
What inputs are trusted?
What inputs are attacker-controlled?
Where is tenant identity established?
Can tenant identity change?
Where is authorization checked?
Which database is selected?
What happens when resolution fails?
Can caches collide?
Can async jobs lose tenant scope?
Can sockets join foreign rooms?
Can files cross tenant ownership?
Can logs leak credentials?
Can retries duplicate financial effects?
```

That is **threat-model thinking**.

------------------------------------------------------------------------

# 38. Positive Test vs Negative Test

Positive test:

``` text
ABC asks for ABC product
        |
        v
success
```

Good---but insufficient.

Negative test:

``` text
ABC session
+
Perfect hostname/resource
        |
        v
DENIED
```

Another:

``` text
forged tenant ID in body
        |
        v
cannot change DB selection
```

Another:

``` text
unknown hostname
        |
        v
no fallback database
```

Multi-tenant security depends heavily on negative tests.

Ferio's completion rule explicitly requires negative cross-tenant tests
before an item is considered complete.

------------------------------------------------------------------------

# 39. Why Similar IDs Are Useful in Tests

Suppose:

``` text
ABC DB:
product id = 100

Perfect DB:
product id = 999
```

A broken test may accidentally pass because the IDs are different.

Stronger isolation test:

``` text
ABC DB:
product id = SAME-ID
name = ABC Product

Perfect DB:
product id = SAME-ID
name = Perfect Product
```

Then ask ABC for `SAME-ID`.

Correct result:

``` text
ABC Product
```

Never:

``` text
Perfect Product
```

Ferio's database isolation tests deliberately seed similar/identical
identifiers across tenant databases for this reason.

------------------------------------------------------------------------

# 40. Multi-Tenant Definition of Done

For Ferio, "I changed the query" is not enough.

A tenant-aware feature needs to prove things such as:

``` text
trusted tenant resolution
correct database selection
server-side authorization
server-side entitlement enforcement
cache/job/socket/file isolation
no unsafe fallback
negative cross-tenant tests
safe observability
frontend failure states
migration/rollback/operations documentation
```

That is an industry-level definition of completion.

------------------------------------------------------------------------

# 41. The Architecture in One Diagram

``` text
                         FERIO
                           |
                 +---------+---------+
                 |                   |
          CONTROL PLANE          SHARED BACKEND
                 |                   |
       +---------+---------+         |
       |         |         |         |
 Organization  Plan   Subscription   |
 TenantDomain  SaaS Billing          |
 TenantDB Registry                   |
                                     |
                          Trusted Tenant Resolver
                                     |
                               TenantContext
                                     |
                          TenantDatabaseManager
                                     |
                 +-------------------+-------------------+
                 |                   |                   |
                 v                   v                   v
               ABC DB            Perfect DB          Baby DB
                 |                   |                   |
              commerce            commerce            commerce
```

------------------------------------------------------------------------

# 42. Request Architecture in One Diagram

``` text
Browser
  |
  | GET https://abc.ferio.com/products
  v
NestJS
  |
  v
Normalize trusted host
  |
  v
Tenant Resolver
  |
  | lookup Control Plane
  v
ABC Organization + ABC DB registry
  |
  v
Immutable TenantContext
  |
  v
Authentication / Membership / Permission
  |
  v
CatalogService
  |
  v
TenantDbService
  |
  v
TenantDatabaseManager
  |
  v
ABC Prisma Client
  |
  v
ABC PostgreSQL
```

------------------------------------------------------------------------

# 43. What Ferio Is NOT

Do not imagine Ferio SaaS as:

``` text
one giant database
+
a tenant dropdown
```

Do not imagine:

``` text
browser sends tenantId
+
backend trusts it
```

Do not imagine:

``` text
database isolation alone
=
complete tenant isolation
```

Do not imagine:

``` text
Platform Admin
=
Tenant Admin
```

Do not imagine:

``` text
tenant lookup failed
=
use default database
```

Those mental models will lead you in the wrong direction.

------------------------------------------------------------------------

# 44. What Ferio IS

The correct mental model is:

``` text
One shared commerce platform
        |
        v
Many independent organizations
        |
        v
Trusted server-side tenant resolution
        |
        v
One isolated operational PostgreSQL DB per tenant
        |
        v
Tenant-scoped authorization and infrastructure
        |
        v
Separate SaaS Control Plane
```

------------------------------------------------------------------------

# 45. Five Rules to Burn Into Your Brain

## Rule 1

``` text
Tenant = business/organization.
```

## Rule 2

``` text
ABOUT the business -> Control Plane.
INSIDE the business -> Tenant DB.
```

## Rule 3

``` text
The client never chooses the tenant database.
```

## Rule 4

``` text
If trusted tenant resolution fails, fail closed.
```

## Rule 5

``` text
Tenant isolation includes DB + cache + jobs + sockets + files + auth + operations.
```

If you understand these five rules, you have the foundation for the rest
of the Ferio architecture.

------------------------------------------------------------------------

# 46. Beginner → Senior Ladder

### Beginner

You can explain:

> Ferio lets many businesses use one platform, but each business has
> isolated data.

### Junior engineer

You can explain:

> Ferio resolves the organization server-side from trusted routing
> context and routes tenant commerce operations to that organization's
> operational PostgreSQL database.

### Mid-level engineer

You can explain:

> Tenant resolution establishes immutable request context; application
> services obtain tenant-aware DB access through a shared boundary,
> while authorization, Redis, queues, sockets and storage preserve the
> same organization scope.

### Senior engineer

You start asking:

> What are the trust boundaries, failure modes, connection budgets,
> async-context propagation rules, cross-plane consistency model,
> observability requirements, recovery paths, negative isolation tests,
> and operational blast radius?

That is where architecture becomes engineering rather than diagrams.

------------------------------------------------------------------------

# 47. Self-Test

Try answering these without looking back.

### Q1. What is a tenant?

One business/organization using Ferio.

### Q2. Does one tenant mean one user?

No. A tenant can contain many staff, customers, products, orders and
other records.

### Q3. Where should ABC's products live?

ABC's tenant database.

### Q4. Where should ABC's Ferio SaaS subscription live?

The Control Plane.

### Q5. Can `tenantId` from the request body choose a database?

No.

### Q6. What decides the tenant for a normal storefront request?

Trusted server-side tenant resolution, starting from the approved
hostname/domain routing boundary.

### Q7. What is TenantContext?

Immutable trusted request context carrying safe tenant identity needed
by downstream application services.

### Q8. What does fail closed mean?

If trusted security/tenant context cannot be established, deny/fail
rather than guessing or falling back.

### Q9. Why isn't separate PostgreSQL enough?

Redis, jobs, sockets, files, credentials, authorization and other shared
infrastructure can still leak/collide.

### Q10. Is Platform Admin automatically Tenant Admin?

No. They are separate authorization domains.

### Q11. Why can ABC and Perfect both have Product ID `123`?

Because their products live in independent databases.

### Q12. What should happen if Perfect's DB is down?

Perfect should fail/degrade safely; Ferio must not route it to ABC, and
healthy tenants should remain unaffected where possible.

------------------------------------------------------------------------

# 48. Practical Exercise

Take this imaginary request:

``` text
GET https://abc.ferio.com/products/123
```

Say the path aloud:

``` text
1. Request reaches Ferio.
2. Ferio normalizes/resolves abc.ferio.com.
3. Control Plane says the domain belongs to ABC.
4. Ferio establishes ABC TenantContext.
5. Authentication/authorization rules are applied as required.
6. Catalog code asks for tenant DB access.
7. TenantDatabaseManager supplies ABC's client.
8. Prisma queries Product 123 inside ABC's database.
9. Response returns ABC's data.
```

Now change only:

``` text
abc.ferio.com
```

to:

``` text
perfect.ferio.com
```

The application code can remain mostly the same.

But the trusted context and database become Perfect's.

If that picture is clear in your mind, Document 01 has done its job.

------------------------------------------------------------------------

# 49. Real Ferio Checkpoint

At the August 24, 2026 checkpoint documented by the project:

``` text
MT-0 — architecture/safety baseline: complete
MT-1 — Control Plane foundation: complete in code + tests
MT-2 — trusted tenant resolution/context: complete in code + tests
MT-3 — core TenantDatabaseManager: complete in code + tests
```

The checkpoint recorded a clean backend production build and **67 suites
/ 264 unit tests passing**.

Do not interpret that as "the entire SaaS migration is finished." The
same implementation tracker explicitly states that Ferio is not
SaaS-ready until the required isolation, provisioning, migrations,
subscriptions, domain routing, backup/restore and cross-tenant security
gates pass.

------------------------------------------------------------------------

# 50. Next Document

## Document 02 --- Request Journey & Trusted Tenant Resolution

Document 02 will take one request:

``` text
https://abc.ferio.com/catalog/products
```

and dissect it at industry depth:

``` text
DNS / hostname
    ->
HTTP request
    ->
host normalization
    ->
TenantDomain lookup
    ->
positive/negative cache
    ->
organization lifecycle validation
    ->
TenantContext
    ->
AsyncLocalStorage
    ->
middleware boundary
    ->
authentication/membership
    ->
TenantDbService
    ->
TenantDatabaseManager
    ->
Prisma
    ->
ABC PostgreSQL
```

We will also study forged hosts, forwarded-host trust, negative caching,
cache invalidation, request correlation, fail-closed errors,
cross-tenant replay, and the exact security assumptions behind each
step.

------------------------------------------------------------------------

**End of Document 01**