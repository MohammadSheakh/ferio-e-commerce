# Ferio Engineering Learning Series

## Document 02 --- Request Journey & Trusted Tenant Resolution

**Level:** Child-simple explanation → senior/industry-level engineering\
**Project:** Ferio Commerce SaaS\
**Focus:** How Ferio takes an incoming storefront request and safely
decides **which tenant it belongs to** before any tenant data is
touched.

------------------------------------------------------------------------

# 1. The One Question This Lesson Answers

A customer opens:

``` text
https://abc.ferio.com/catalog/products
```

How does Ferio safely turn that into:

``` text
Use ABC Electronics
Use ABC's tenant database
Never use Perfect Textile's database
```

That sounds simple.

In a multi-tenant SaaS system, it is one of the most important security
paths in the entire application.

The simplified journey is:

``` text
Browser
   ↓
Hostname
   ↓
NestJS
   ↓
Tenant Middleware
   ↓
Host Normalization
   ↓
Tenant Resolver
   ↓
Control Plane lookup/cache
   ↓
Validate tenant state
   ↓
Immutable TenantContext
   ↓
Authentication / Membership / Permission
   ↓
Application Service
   ↓
TenantDbService
   ↓
TenantDatabaseManager
   ↓
ABC PostgreSQL
```

This document explains every arrow.

------------------------------------------------------------------------

# 2. First: What Is a Request?

When you open:

``` text
https://abc.ferio.com/catalog/products
```

your browser sends an HTTP request.

Baby version:

> The browser sends Ferio a letter asking for something.

The letter contains information such as:

``` text
method: GET
path: /catalog/products
host: abc.ferio.com
cookies: ...
headers: ...
```

Conceptually:

``` http
GET /catalog/products HTTP/1.1
Host: abc.ferio.com
```

The path says:

> I want catalog products.

The host says:

> I came through `abc.ferio.com`.

Those are different pieces of information.

------------------------------------------------------------------------

# 3. Why the Host Matters in Ferio

Ferio's default SaaS design gives tenants their own storefront
hostname/subdomain.

Conceptually:

``` text
abc.ferio.com      → ABC Electronics
perfect.ferio.com  → Perfect Textile
baby.ferio.com     → Baby Shop BD
```

So the hostname becomes an important input to tenant resolution.

But Ferio must not simply grab arbitrary request text and immediately
trust it.

The host must go through a controlled resolution process.

------------------------------------------------------------------------

# 4. The Reception Desk Analogy

Imagine an apartment building.

Someone walks in and says:

> "I am going to Apartment ABC."

A bad security guard says:

> "Okay, you said ABC, so go anywhere you want."

A proper security process checks the building's own records.

Ferio behaves similarly.

``` text
Request says:
"I arrived for abc.ferio.com"

            ↓

Ferio's trusted registry says:
"abc.ferio.com belongs to organization ABC"

            ↓

Ferio establishes:
TenantContext = ABC
```

The important part is that the **server's registry is authoritative**.

------------------------------------------------------------------------

# 5. Where Does the Mapping Live?

The Control Plane contains tenant/domain metadata.

Conceptually:

``` text
TenantDomain

hostname               organization
------------------------------------
abc.ferio.com          ORG_ABC
perfect.ferio.com      ORG_PERFECT
baby.ferio.com         ORG_BABY
```

Then the organization has trusted database registry information.

Conceptually:

``` text
ORG_ABC
   ↓
TenantDatabase registry
   ↓
ABC operational database
```

So:

``` text
hostname
   ↓
TenantDomain
   ↓
Organization
   ↓
TenantDatabase
```

This is the trusted routing chain.

------------------------------------------------------------------------

# 6. Step Zero --- Some Routes Are Different

Not every route should behave like a tenant storefront request.

The current Ferio checkpoint says tenant middleware is wired for normal
routes while platform, health, and socket paths have their own
boundaries.

Why?

Because:

``` text
/platform/...
```

belongs to the Ferio Platform Admin realm.

A health endpoint may need to answer infrastructure health without
pretending it belongs to ABC.

WebSockets establish their tenant scope through their own authenticated
socket flow.

Industry lesson:

> Middleware should be applied according to architectural boundary, not
> blindly because "everything needs middleware."

------------------------------------------------------------------------

# 7. Step One --- Read the Incoming Host

For our example:

``` text
Host: abc.ferio.com
```

The resolver eventually needs a canonical hostname such as:

``` text
abc.ferio.com
```

But real requests can contain messy forms.

Development might look like:

``` text
localhost:3000
```

or a host may have casing such as:

``` text
ABC.FERIO.COM
```

So before lookup, Ferio normalizes the host.

------------------------------------------------------------------------

# 8. What Is Host Normalization?

Normalization means:

> Convert acceptable forms into one predictable form and reject
> unacceptable forms.

Ferio's implementation tracker describes `normalizeTenantHost` as
handling:

``` text
lowercasing
port stripping
malformed-host rejection
IP-literal rejection
development ports
```

Example:

``` text
ABC.FERIO.COM
       ↓
abc.ferio.com
```

Development example:

``` text
abc.localhost:3000
       ↓
canonical host representation used by the resolver
```

The exact transformation depends on the accepted development-host
strategy.

------------------------------------------------------------------------

# 9. Why Normalize Before Lookup?

Imagine the registry contains:

``` text
abc.ferio.com
```

but requests can arrive as:

``` text
ABC.FERIO.COM
abc.ferio.com:443
AbC.FeRiO.CoM
```

If every variation becomes a separate cache/lookup identity, behavior
becomes inconsistent.

Normalization creates a stable comparison boundary.

Senior mental model:

``` text
untrusted/raw representation
        ↓
validation + normalization
        ↓
canonical representation
        ↓
security-sensitive lookup
```

This pattern appears throughout secure systems.

------------------------------------------------------------------------

# 10. Malformed Hosts Must Be Rejected

Ferio does not want tenant resolution to behave like:

``` text
weird host
   ↓
maybe ABC?
   ↓
let's guess
```

It wants:

``` text
malformed host
   ↓
reject
```

Why?

Because ambiguous routing is dangerous in multi-tenancy.

If the server cannot confidently establish:

``` text
this request belongs to organization X
```

it should not touch tenant data.

That is **fail-closed design**.

------------------------------------------------------------------------

# 11. Development Host Mapping

Production and development are different.

A developer may run:

``` text
localhost:3000
```

instead of a real public tenant domain.

Ferio therefore supports a development host map.

Conceptually:

``` text
localhost:3000
    ↓
development mapping
    ↓
abc.ferio.com
```

But there is a critical safety rule:

> Development shortcuts must not weaken production tenant resolution.

The implementation tracker states that `TENANT_DEV_HOST_MAP` supports
exact local aliases only when `NODE_ENV` is not production, and
production ignores that mapping.

That is an example of **environment-specific convenience with a
production safety boundary**.

------------------------------------------------------------------------

# 12. Step Two --- Tenant Resolver

After normalization, Ferio asks:

> Which active tenant owns this hostname?

Conceptually:

``` text
resolve("abc.ferio.com")
```

The resolver checks trusted Control Plane information.

Possible success:

``` text
abc.ferio.com
   ↓
TenantDomain
   ↓
ORG_ABC
```

Possible failure:

``` text
unknown.ferio.com
   ↓
no valid TenantDomain
   ↓
reject
```

The resolver is therefore a security boundary, not merely a convenience
lookup.

------------------------------------------------------------------------

# 13. Never Resolve From Browser tenantId

Suppose the request is:

``` http
GET /catalog/products
Host: abc.ferio.com
```

but the attacker adds:

``` json
{
  "tenantId": "ORG_PERFECT"
}
```

or:

``` text
?organizationId=ORG_PERFECT
```

or some custom header:

``` text
X-Tenant-ID: ORG_PERFECT
```

Ferio's rule is:

``` text
These values do NOT select the database.
```

The implementation explicitly prohibits browser-supplied values such as:

``` text
tenantId
organizationId
databaseUrl
```

from acting as the tenant database selector.

This is fundamental.

------------------------------------------------------------------------

# 14. Why Is Browser Input Untrusted?

Because the user controls the browser.

Even if your frontend never displays a tenant selector, an attacker can
use:

``` text
curl
Postman
browser DevTools
custom JavaScript
a modified mobile client
an HTTP library
```

They can construct their own request.

Frontend code is not a security boundary.

Therefore this is not sufficient:

``` ts
// BAD SECURITY IDEA
const tenantId = req.body.tenantId;
return connectToTenant(tenantId);
```

The problem is not TypeScript.

The problem is **trust**.

------------------------------------------------------------------------

# 15. Step Three --- Validate the Domain and Organization

Finding a row is not enough.

Imagine the registry says:

``` text
abc.ferio.com → ORG_ABC
```

but ABC is:

``` text
suspended
closed
archived
still provisioning
```

The resolver/lifecycle boundary must enforce the approved state rules.

The Ferio tracker explicitly covers rejection/safe handling for:

``` text
unknown domains
inactive/unverified domains
suspended organizations
closure states
unavailable registries
migration-required databases
```

The exact behavior depends on the state and operation.

------------------------------------------------------------------------

# 16. Unknown vs Suspended Are Different

Unknown:

``` text
who-is-this.ferio.com
```

means:

> Ferio cannot establish a valid tenant for this host.

Suspended ABC means:

> Ferio knows this is ABC, but ABC is currently restricted by
> lifecycle/subscription policy.

Those are different situations.

A mature system uses stable machine-readable error semantics instead of
returning random generic failures.

For example, the tracker explicitly names:

``` text
TENANT_SUSPENDED
```

for suspended tenant resolution behavior.

------------------------------------------------------------------------

# 17. Database Readiness Matters Too

Suppose:

``` text
abc.ferio.com → ORG_ABC
```

and ABC is active.

But its operational database is not ready.

Maybe:

``` text
migration incomplete
schema incompatible
database unavailable
registry not ready
```

The safe answer is not:

``` text
use some other DB
```

It is:

``` text
ABC cannot safely be served right now
```

Ferio's migration validation explicitly includes rejecting or isolating
tenants that require migration before tenant request routing.

------------------------------------------------------------------------

# 18. Fail Closed

This phrase deserves repetition.

**Fail closed** means:

> If Ferio cannot prove the tenant boundary safely, it denies/fails the
> operation instead of guessing.

Bad:

``` text
ABC lookup fails
     ↓
use legacy Ferio DB
```

Very bad:

``` text
ABC DB unavailable
     ↓
use another available tenant DB
```

Correct:

``` text
ABC resolution/readiness fails
     ↓
controlled tenant error
     ↓
STOP
```

The project explicitly requires no fallback to another tenant or the
legacy default database.

------------------------------------------------------------------------

# 19. Step Four --- Cache the Resolution

The Control Plane should not necessarily be queried from scratch for
every hot storefront request.

Imagine:

``` text
10,000 requests
```

all for:

``` text
abc.ferio.com
```

Without caching:

``` text
request → Control Plane
request → Control Plane
request → Control Plane
request → Control Plane
...
```

That creates unnecessary load.

So Ferio caches tenant resolution.

------------------------------------------------------------------------

# 20. Positive Cache

A positive cache means:

> We recently resolved this hostname successfully.

Conceptually:

``` text
abc.ferio.com
   ↓
cache
   ↓
ORG_ABC
```

Ferio's current tracker specifies a **60-second positive TTL**.

TTL means:

> Time To Live.

After that window, the cached entry expires unless refreshed/replaced
according to implementation behavior.

------------------------------------------------------------------------

# 21. Negative Cache

Now imagine an attacker repeatedly requests:

``` text
does-not-exist-1.ferio.com
```

or many requests repeatedly hit one unknown host.

Without negative caching:

``` text
unknown host
   ↓
Control Plane query

unknown host
   ↓
Control Plane query

unknown host
   ↓
Control Plane query
```

A negative cache temporarily remembers:

``` text
this hostname is definitively unknown/inactive
```

Ferio's current tracker specifies a **15-second negative TTL**.

------------------------------------------------------------------------

# 22. Why Negative Caching Needs Care

Suppose the Control Plane is temporarily down.

That does **not** mean:

``` text
abc.ferio.com does not exist
```

It means:

``` text
Ferio could not currently verify it.
```

Those are different facts.

Therefore the tracker says only definitive unknown/inactive answers are
negative-cached.

Outages are **not** cached as "tenant does not exist."

This is subtle and important.

Senior principle:

> Cache facts, not transient uncertainty.

------------------------------------------------------------------------

# 23. Cache Invalidation

Suppose:

``` text
abc.ferio.com → ORG_ABC
```

is cached.

Then Platform Admin disables that domain.

If Ferio blindly trusts the old cache until some long expiry, requests
may continue using stale routing information.

So Ferio has explicit:

``` text
invalidate(hostname)
```

behavior on relevant domain/status changes.

Baby analogy:

> If the building manager changes who owns Apartment 7, throw away the
> receptionist's old sticky note.

------------------------------------------------------------------------

# 24. Cache Poisoning Concern

A tenant resolver cache is security-sensitive.

A catastrophic bug would look like:

``` text
cache["abc.ferio.com"] = ORG_PERFECT
```

or a cache key that does not properly include the trusted hostname.

Ferio's security tests include positive/negative cache isolation and
cache-poisoning/leak checks.

The key lesson:

> A cache must preserve the same security boundary as the source of
> truth it accelerates.

Caching must never weaken authorization or tenant identity.

------------------------------------------------------------------------

# 25. Step Five --- Build TenantContext

After trusted resolution succeeds, Ferio establishes a request-scoped
context.

Conceptually:

``` ts
{
  organizationId: "ORG_ABC",
  tenantDatabaseRegistryId: "DB_ABC",
  hostname: "abc.ferio.com",
  domainId: "DOMAIN_ABC",
  subscriptionState: "ACTIVE",
  correlationId: "REQ_123"
}
```

This is simplified teaching code, not a copy of the source
implementation.

The important point is what the context represents:

> Ferio has now established which tenant this execution belongs to.

------------------------------------------------------------------------

# 26. Why Not Keep Reading Host Everywhere?

Bad architecture:

``` text
CatalogService reads Host
OrderService reads Host
WalletService reads Host
PaymentService reads Host
InventoryService reads Host
```

Now every service independently interprets raw HTTP routing data.

Problems:

``` text
duplicated logic
different normalization
different security behavior
harder testing
services coupled to HTTP
more opportunities for mistakes
```

Better:

``` text
HTTP boundary resolves tenant once
          ↓
trusted TenantContext
          ↓
application services consume trusted context
```

This is why Ferio exposes application-service boundaries such as:

``` text
TenantDbService
resolveTenantDatabase()
tryGetTenantContext()
```

instead of asking every service to parse the raw host again.

------------------------------------------------------------------------

# 27. TenantContext Is Immutable

The current implementation freezes the context and exports no setters.

Why?

Because this would be dangerous:

``` text
begin request:
TenantContext = ABC

CatalogService:
TenantContext = ABC

random helper:
TenantContext = PERFECT

PaymentService:
TenantContext = PERFECT
```

A request's trusted tenant identity should not mutate halfway through
execution.

Conceptually:

``` text
resolve once
   ↓
freeze
   ↓
consume downstream
```

------------------------------------------------------------------------

# 28. AsyncLocalStorage

Ferio uses Node.js `AsyncLocalStorage` to carry the request context.

Baby analogy:

> Each request receives an invisible backpack.

ABC request:

``` text
backpack:
TENANT = ABC
```

Perfect request:

``` text
backpack:
TENANT = PERFECT
```

Both requests may execute at the same time.

Their backpacks remain separate.

------------------------------------------------------------------------

# 29. Why a Global Variable Would Be Terrible

Imagine:

``` ts
let currentTenant;
```

Request A starts:

``` text
currentTenant = ABC
```

Then before it finishes, Request B starts:

``` text
currentTenant = PERFECT
```

Request A resumes and sees:

``` text
PERFECT
```

Disaster.

Concurrent server requests cannot safely share a mutable global
`currentTenant`.

AsyncLocalStorage exists to associate context with an asynchronous
execution chain rather than one global mutable value.

------------------------------------------------------------------------

# 30. Simplified AsyncLocalStorage Mental Code

Conceptually, middleware does something like:

``` ts
tenantContext.run(context, () => {
  next();
});
```

Later, deep in the application:

``` ts
const context = tryGetTenantContext();
```

Again: this is simplified teaching code.

The real lesson is:

``` text
request boundary establishes context
        ↓
async work continues inside that context
        ↓
deep services can retrieve it
```

------------------------------------------------------------------------

# 31. AsyncLocalStorage Does NOT Authorize the User

This distinction is essential.

TenantContext answers:

``` text
WHERE are we?
```

Authentication answers:

``` text
WHO are you?
```

Membership/authorization answers:

``` text
MAY you act here?
```

Example:

``` text
TenantContext = ABC
User = Rahim
```

That does not automatically mean Rahim may administer ABC.

Ferio must verify membership/role/permission for protected operations.

------------------------------------------------------------------------

# 32. The Three-Dimensional Security Question

For every protected tenant operation, think:

``` text
WHO?
WHERE?
WHAT?
```

Example:

``` text
WHO?
Rahim

WHERE?
ABC Electronics

WHAT?
Edit product
```

Then authorization decides:

``` text
Does Rahim have the required membership/permission
inside ABC?
```

This is more accurate than thinking:

``` text
JWT valid = allowed
```

A valid token proves identity, not universal tenant authority.

------------------------------------------------------------------------

# 33. Cross-Tenant Session Replay

Imagine Rahim is a valid ABC administrator.

He has a valid session.

Now he tries:

``` text
https://perfect.ferio.com/admin/orders
```

with the same session.

Bad system:

``` text
token valid
   ↓
allow
```

Correct system:

``` text
token valid
   ↓
resolved tenant = PERFECT
   ↓
is Rahim an authorized member of PERFECT?
   ↓
NO
   ↓
deny
```

Ferio's tracker explicitly tests cross-organization session replay
denial.

------------------------------------------------------------------------

# 34. TenantMembershipGuard

For tenant-admin operations, Ferio uses a tenant membership guard
boundary.

Conceptually:

``` text
Request
   ↓
TenantContext = ABC
   ↓
Authentication says user = Rahim
   ↓
TenantMembershipGuard
   ↓
Is Rahim a valid member of ABC?
   ↓
yes/no
```

The important part is that membership is checked against the **resolved
tenant**.

Not against an organization ID supplied by the browser.

------------------------------------------------------------------------

# 35. Customer and Rider Identity

Not every identity works exactly like Tenant Admin.

The tracker describes:

-   tenant-admin membership bound to the organization roster;
-   customer profiles/user links resolved from the current tenant
    database;
-   rider operations bound to tenant-local approved personnel records.

So the shared principle is:

> Identity must be interpreted inside the trusted tenant boundary
> appropriate to that actor type.

------------------------------------------------------------------------

# 36. Step Six --- Application Service Uses Tenant DB Boundary

After context and authorization are established, application code can do
useful work.

Example:

``` text
CatalogController
      ↓
CatalogService
      ↓
TenantDbService
      ↓
resolveTenantDatabase()
      ↓
TenantDatabaseManager
      ↓
ABC client
```

The service should not invent its own tenant.

It consumes the established boundary.

------------------------------------------------------------------------

# 37. TenantDbService vs TenantDatabaseManager

These names can be confusing.

Think of them like this:

``` text
TenantDbService
    =
application-friendly "give me the DB for my current tenant"

TenantDatabaseManager
    =
infrastructure component managing actual tenant DB clients/connections
```

Conceptually:

``` text
CatalogService
   ↓
TenantDbService
   ↓
current TenantContext says ABC
   ↓
TenantDatabaseManager
   ↓
cached/create managed ABC client
```

Document 03/next infrastructure lesson will go deeper into the manager.

------------------------------------------------------------------------

# 38. The Resolver Does Not Accept Database Credentials From the Client

This deserves its own section.

Never:

``` text
POST /products

{
  "databaseUrl":
  "postgres://..."
}
```

and then:

``` text
backend connects there
```

That would hand the attacker control over a critical infrastructure
boundary.

Ferio's context carries safe registry identifiers.

Database credentials remain server-side and are decrypted only where the
trusted database infrastructure needs them.

------------------------------------------------------------------------

# 39. Correlation Metadata

Suppose an error happens.

Logs should let engineers connect:

``` text
incoming request
tenant resolution
database acquisition
service error
background activity
```

A correlation/request ID helps tie those events together.

Conceptually:

``` text
requestId = req_789
organization = ORG_ABC
```

Then logs can safely say:

``` text
req_789
ORG_ABC
tenant database acquisition failed
```

without printing:

``` text
database password
raw authorization token
secret headers
```

The tracker explicitly includes safe tenant identity in
audit/log/metrics context while excluding credentials/raw headers.

------------------------------------------------------------------------

# 40. Observability Is Part of Tenant Safety

Observability means being able to understand what the system is doing.

In multi-tenancy, a useful error is not merely:

``` text
DATABASE ERROR
```

Operations may need safe information such as:

``` text
correlation ID
organization ID
tenant DB registry ID
operation
failure class
timing
```

But not secrets.

This helps answer:

``` text
Is only ABC broken?
Are many tenants broken?
Is the Control Plane failing?
Is one tenant DB circuit open?
Is this a resolver problem?
```

Isolation is operational as well as logical.

------------------------------------------------------------------------

# 41. Forwarded Host --- Why It Exists

Production traffic often passes through infrastructure before reaching
the application.

Conceptually:

``` text
Browser
   ↓
Cloudflare / reverse proxy / ingress
   ↓
Customer Web / BFF
   ↓
NestJS
```

The backend may need the original storefront hostname.

A trusted proxy can forward that information using a header such as:

``` text
x-forwarded-host
```

But there is a dangerous question:

> Who is allowed to set that header?

------------------------------------------------------------------------

# 42. Never Blindly Trust x-forwarded-host

A direct attacker can send custom headers.

So this is dangerous:

``` text
Always trust x-forwarded-host from everyone.
```

The Ferio tracker says Customer Web uses `Host` by default and only
accepts forwarded-host behavior when the deployment explicitly enables
the trusted-proxy configuration.

It also records rejection of comma-separated forwarded-host chains in
the security boundary.

Baby version:

> Only accept the receptionist's special note if you know it really came
> from your receptionist.

------------------------------------------------------------------------

# 43. Host vs Forwarded Host

Simplified mental model:

### Direct/untrusted client path

Prefer the actual host boundary.

``` text
Host: abc.ferio.com
```

### Explicitly trusted ingress/proxy path

Infrastructure may preserve the original host in an approved
forwarded-host mechanism.

But the application must know it is behind that trusted ingress.

The exact deployment contract matters.

This is why proxy configuration is a **security configuration**, not
merely a networking convenience.

------------------------------------------------------------------------

# 44. SSR/BFF Makes This More Interesting

Customer Web may perform server-side requests.

Example:

``` text
Browser requests abc.ferio.com
        ↓
Next.js server renders page
        ↓
Next.js server calls NestJS
```

If the server-to-server request forgets the original storefront
hostname, NestJS may not know which tenant the render belongs to.

So the Customer Web forwards the original tenant host through its
approved server-side boundary.

The tracker says storefront SSR resolves tenant status before fetching
tenant data, and server-side BFF fetches forward the host context.

------------------------------------------------------------------------

# 45. SSR Tenant Confusion

Imagine two simultaneous renders:

``` text
abc.ferio.com
perfect.ferio.com
```

A bad shared cache or bad host propagation could produce:

``` text
ABC page
+
Perfect branding
```

or worse:

``` text
ABC tenant data on Perfect host
```

Therefore SSR/BFF tenant isolation needs its own testing.

The current tracker marks live two-host SSR/BFF E2E tenant-confusion
testing as still open, even though host-forwarding safeguards and cache
controls exist.

This is an important engineering lesson:

> A partially proven boundary should be described as partially proven,
> not "done because the code looks right."

------------------------------------------------------------------------

# 46. Frontend Cache Safety

Tenant-aware SSR also affects caching.

If:

``` text
abc.ferio.com/settings
```

and:

``` text
perfect.ferio.com/settings
```

share a cache entry incorrectly, branding can leak.

The tracker records tenant-aware behavior including:

``` text
Cache-Control: private, no-store
Vary: x-forwarded-host
host-forwarded server fetches
no-store for sensitive tenant reads
```

The deeper principle:

> Cache identity must contain every dimension that changes the
> meaning/security of the response.

Here, tenant hostname is one of those dimensions.

------------------------------------------------------------------------

# 47. A Full Successful Request

Let's trace the whole thing.

Request:

``` text
GET https://abc.ferio.com/catalog/products
```

### Step 1

Browser sends request.

``` text
Host = abc.ferio.com
```

### Step 2

Request enters the tenant-aware HTTP boundary.

### Step 3

Ferio normalizes:

``` text
abc.ferio.com
```

### Step 4

Resolver checks cache.

Cache hit:

``` text
abc.ferio.com → trusted ABC resolution
```

or cache miss:

``` text
query Control Plane
```

### Step 5

Ferio verifies valid tenant/domain/database state.

### Step 6

Ferio creates:

``` text
TenantContext = ABC
```

and freezes it.

### Step 7

AsyncLocalStorage carries ABC through the request execution.

### Step 8

For protected operations, authentication/membership/permissions are
checked against ABC.

### Step 9

CatalogService asks for tenant-aware DB access.

### Step 10

TenantDbService reads the trusted context.

### Step 11

TenantDatabaseManager supplies ABC's managed client.

### Step 12

Prisma queries:

``` text
ABC PostgreSQL
```

### Step 13

Response goes back to the user.

At no point did:

``` text
req.body.tenantId
```

choose the database.

------------------------------------------------------------------------

# 48. Two Requests at the Same Time

Now:

``` text
Request A:
abc.ferio.com

Request B:
perfect.ferio.com
```

Conceptually:

``` text
Request A execution
TenantContext = ABC
      |
      +--> CatalogService
      +--> ABC DB

Request B execution
TenantContext = PERFECT
      |
      +--> CatalogService
      +--> PERFECT DB
```

The application code can be identical.

The execution context is isolated.

This is why AsyncLocalStorage must be understood as **per async
execution chain**, not a mutable global variable.

------------------------------------------------------------------------

# 49. Attack Scenario --- Fake tenantId

Attacker sends:

``` text
Host: abc.ferio.com

body:
{
  "tenantId": "ORG_PERFECT"
}
```

Expected:

``` text
resolver uses trusted host
       ↓
TenantContext = ABC
       ↓
body tenantId has no routing authority
       ↓
ABC database only
```

If business DTOs do not require `tenantId`, ideally the
irrelevant/malicious field is rejected or ignored according to the API
validation policy.

But regardless, it must never become the DB selector.

------------------------------------------------------------------------

# 50. Attack Scenario --- Valid ABC Session on Perfect

``` text
Host: perfect.ferio.com
Cookie: valid ABC admin session
```

Expected:

``` text
TenantContext = PERFECT
        ↓
identity = Rahim
        ↓
membership check against PERFECT
        ↓
Rahim is not a Perfect member
        ↓
DENY
```

The session being cryptographically valid is not enough.

------------------------------------------------------------------------

# 51. Attack Scenario --- Unknown Host

``` text
Host: fake.ferio.com
```

Expected:

``` text
normalize
   ↓
resolver
   ↓
definitively unknown
   ↓
short negative cache
   ↓
controlled tenant error
```

Never:

``` text
legacy/default DB
```

------------------------------------------------------------------------

# 52. Failure Scenario --- Control Plane Outage

Request:

``` text
abc.ferio.com
```

but the resolver needs Control Plane data and the Control Plane is
unavailable.

Important distinction:

``` text
UNKNOWN TENANT
```

is not the same as:

``` text
CANNOT VERIFY TENANT RIGHT NOW
```

Therefore transient outage must not be written into the negative cache
as if ABC does not exist.

The safe behavior remains fail closed.

The performance/security tests in the tracker include bounded
fail-closed behavior during Control Plane outage.

------------------------------------------------------------------------

# 53. Failure Scenario --- Tenant DB Down

Resolution succeeds:

``` text
abc.ferio.com → ORG_ABC
```

but ABC's DB is unavailable.

Expected:

``` text
ABC request fails/degrades safely
```

Never:

``` text
route ABC to Perfect
```

A tenant DB outage is an availability problem.

Routing to another tenant would turn it into a confidentiality/integrity
disaster.

------------------------------------------------------------------------

# 54. Security Property vs Availability Property

This distinction is senior-level important.

Suppose ABC's DB is down.

You have two goals:

``` text
Availability:
Can ABC continue working?

Security:
Can ABC ever see Perfect's data?
```

If you cannot satisfy availability, you may return an error.

You must not sacrifice security to fake availability.

In other words:

``` text
better:
ABC gets 503

than:
ABC gets Perfect's products
```

------------------------------------------------------------------------

# 55. Stable Error Codes

Humans see messages.

Applications need stable machine behavior.

Instead of frontend logic depending on:

``` text
"Oops, something went wrong with tenant"
```

the backend can expose stable error semantics.

The tracker explicitly includes stable tenant-resolution, unavailable,
subscription, provisioning and migration error codes.

Benefits:

``` text
frontend state mapping
monitoring
tests
support diagnostics
API compatibility
```

------------------------------------------------------------------------

# 56. Tenant-Aware Frontend States

The frontend needs to distinguish situations such as:

``` text
unknown store
provisioning/not ready
suspended store
domain verification pending
active store
```

Why?

Because:

``` text
unknown
```

and:

``` text
known but suspended
```

are different product states.

The frontend must also avoid showing another tenant's branding as a
fallback.

Ferio's tracker explicitly requires a static/safe fallback rather than
another host's tenant response.

------------------------------------------------------------------------

# 57. What Happens Before the Controller?

A beginner often thinks NestJS starts here:

``` ts
@Controller()
```

But tenant architecture begins earlier.

Conceptually:

``` text
HTTP request
   ↓
tenant middleware/context boundary
   ↓
guards
   ↓
controller
```

So by the time a tenant controller performs tenant-owned work, the
application should already have a trustworthy answer to:

``` text
Which tenant is this?
```

That dramatically simplifies downstream services.

------------------------------------------------------------------------

# 58. Why Middleware Is a Good Boundary

Middleware is suitable for establishing request context because it runs
early in the HTTP lifecycle.

Conceptually:

``` text
raw request
   ↓
middleware establishes tenant context
   ↓
later layers consume context
```

But remember:

``` text
middleware = establish context
guard      = authorize actor/action
```

Do not confuse the two.

------------------------------------------------------------------------

# 59. What the Controller Should NOT Do

Avoid architecture like:

``` ts
@Get("products")
async products(@Req() req) {
  const tenant = parseHost(req.headers.host);
  const db = connectSomehow(tenant);
  ...
}
```

Why?

The controller now owns:

``` text
host parsing
tenant resolution
database routing
business request handling
```

That mixes responsibilities.

Better architecture separates:

``` text
middleware/resolver → tenant identity
guard               → authorization
controller          → HTTP contract
service             → business logic
TenantDbService     → tenant-aware DB boundary
manager             → connection lifecycle
```

------------------------------------------------------------------------

# 60. Industry Concept --- Establish Authority Once

A strong design tries to establish authoritative context at a narrow
boundary.

For tenant routing:

``` text
raw host
   ↓
one normalization/resolution policy
   ↓
trusted immutable context
```

Then downstream code uses the trusted result.

Why is this better?

Because if 40 services each implement their own tenant resolution:

``` text
40 implementations
=
40 chances to disagree
```

Centralized policy reduces inconsistency.

------------------------------------------------------------------------

# 61. Industry Concept --- Context Propagation

Once tenant identity is established, it must survive across:

``` text
controller
service
nested service
transaction
audit
logs
queue handoff
socket handoff
```

But not all propagation is automatic.

AsyncLocalStorage works for the current asynchronous execution chain.

A BullMQ job happens later and possibly in another process.

So the tenant must be deliberately encoded into a trusted job envelope.

A WebSocket connection has its own handshake/authorization boundary.

This is why "we use AsyncLocalStorage" does not solve all tenant
propagation.

------------------------------------------------------------------------

# 62. Industry Concept --- Trust Re-Establishment

Think of tenant identity crossing process boundaries.

HTTP request:

``` text
trusted resolver
   ↓
TenantContext
```

BullMQ:

``` text
trusted job producer
   ↓
organizationId in job envelope
   ↓
worker re-establishes tenant execution context
```

WebSocket:

``` text
authenticated socket ticket
   ↓
organization scope
   ↓
authorized tenant rooms
```

At every new execution boundary, tenant authority must be preserved or
re-established safely.

------------------------------------------------------------------------

# 63. Industry Concept --- TOCTOU and Stale State

TOCTOU means:

> Time Of Check To Time Of Use.

Imagine:

``` text
10:00:00
ABC resolved ACTIVE

10:00:01
ABC gets suspended

10:00:20
old cached state still says ACTIVE
```

Caching creates a controlled stale-state window.

This is why:

``` text
short TTL
explicit invalidation
operation-level policy checks where necessary
```

matter.

Not every state can be made perfectly instantaneous in a distributed
system.

The architecture chooses acceptable consistency behavior and protects
high-risk operations accordingly.

------------------------------------------------------------------------

# 64. Industry Concept --- Cache Stampede

Suppose a popular tenant's cache entry expires.

Then 1,000 requests arrive simultaneously.

Bad:

``` text
1,000 cache misses
      ↓
1,000 Control Plane queries
```

That is a cache stampede.

Ferio's tracker includes resolver load/storm evidence and bounded cache
behavior.

At senior level, you think beyond:

``` text
Does caching exist?
```

and ask:

``` text
What happens when the cache expires under load?
What happens during an outage?
What gets negative-cached?
How is invalidation performed?
```

------------------------------------------------------------------------

# 65. Industry Concept --- Host Header Security

The hostname participates in tenant identity.

Therefore host handling is a security concern.

Questions a reviewer asks:

``` text
Are malformed hosts rejected?
Are IP literals accepted?
Are ports normalized?
Can forwarded-host chains confuse parsing?
Is proxy trust explicit?
Can development mapping run in production?
Can an attacker poison resolver cache?
```

Ferio's test tracker includes host-header manipulation tests covering
trusted-proxy, forwarded-host-chain and direct-client rejection cases.

------------------------------------------------------------------------

# 66. Industry Concept --- Defense in Depth

Suppose tenant resolution is correct.

Should the rest of the application assume nothing can ever go wrong?

No.

Ferio also has:

``` text
membership checks
tenant-local DBs
tenant-scoped caches
tenant-scoped queues
tenant-scoped socket rooms
tenant-prefixed storage
negative cross-tenant tests
audit/observability
```

This is **defense in depth**.

If one control is imperfect, other boundaries reduce the chance that one
mistake becomes a catastrophic cross-tenant leak.

------------------------------------------------------------------------

# 67. What We Can Claim Is Complete

According to the supplied implementation tracker, MT-2 is marked
complete in code and tests for:

``` text
host normalization
fail-closed resolver
positive/negative caching
immutable TenantContext
AsyncLocalStorage
middleware integration
tenant membership boundaries
```

It also records the MT-2 gate as passing for deterministic two-host
resolution, unknown/suspended fail-closed behavior, and prevention of
client-controlled database selection.

------------------------------------------------------------------------

# 68. What Is Still Not Fully Proven

The tracker still marks one relevant area partial/open:

``` text
full multi-client negative E2E around forged hosts/cookies/tokens
```

and later specifically:

``` text
live two-host SSR/BFF tenant-confusion E2E
```

This distinction matters.

Senior engineers do not turn:

``` text
unit coverage + partial integration coverage
```

into:

``` text
everything is proven in production
```

They preserve the evidence boundary.

------------------------------------------------------------------------

# 69. The Request Journey in One Picture

``` text
                   RAW REQUEST
                       |
                       v
              Host / trusted ingress
                       |
                       v
               HOST NORMALIZATION
                       |
                       v
                 TENANT RESOLVER
                  /           \
            cache hit        cache miss
                |               |
                |        Control Plane lookup
                |               |
                +-------+-------+
                        |
                        v
          DOMAIN / ORG / DB STATE CHECKS
                        |
               unsafe?  |  safe?
                 +------+------+
                 |             |
                 v             v
               FAIL       TENANT CONTEXT
                              |
                              v
                    AsyncLocalStorage
                              |
                              v
                AUTH / MEMBERSHIP / PERMISSION
                              |
                              v
                     APPLICATION SERVICE
                              |
                              v
                       TenantDbService
                              |
                              v
                  TenantDatabaseManager
                              |
                              v
                         ABC DATABASE
```

------------------------------------------------------------------------

# 70. The Five Concepts to Burn Into Your Brain

## 1. Normalization

``` text
Turn acceptable host input into one canonical form.
Reject malformed input.
```

## 2. Resolver

``` text
Trusted hostname
   ↓
trusted tenant identity
```

## 3. Fail Closed

``` text
Cannot prove tenant safely?
STOP.
```

## 4. TenantContext

``` text
Immutable trusted identity for this request.
```

## 5. AsyncLocalStorage

``` text
Carry that context through the current async execution chain
without a dangerous global currentTenant variable.
```

If these five are clear, you understand the heart of MT-2.

------------------------------------------------------------------------

# 71. Code-Reading Exercise for Your Real Ferio Repository

When you open the real code, do **not** begin by reading every tenancy
file.

Trace one request.

Search for these concepts/names:

``` text
normalizeTenantHost
tenant resolver
TenantContext
AsyncLocalStorage
tenant middleware
tryGetTenantContext
resolveTenantDatabase
TenantDbService
TenantMembershipGuard
```

For each one, answer:

``` text
1. What input enters this class/function?
2. Is that input trusted or untrusted?
3. What validation happens?
4. What trusted output is produced?
5. Where is failure handled?
6. Can it ever fall back?
7. Which next component consumes the result?
```

That is how a senior engineer reads security-sensitive architecture.

------------------------------------------------------------------------

# 72. Mini Debugging Exercise

Suppose this request returns Perfect Textile products:

``` text
GET https://abc.ferio.com/catalog/products
```

Do not randomly inspect CatalogService first.

Debug the boundary in order:

``` text
1. What raw host reached the app?
2. Was forwarded-host involved?
3. What did normalization return?
4. What cache key was used?
5. What organization did resolver return?
6. What TenantContext was established?
7. What database registry ID was in context?
8. What client did TenantDatabaseManager return?
9. Which physical DB executed the query?
```

This narrows the failure systematically.

------------------------------------------------------------------------

# 73. Self-Test

### Q1. What is the first tenant-routing input for a normal storefront request?

The trusted hostname/domain boundary.

### Q2. Why normalize the host?

To create a predictable canonical value and reject malformed/unsafe
forms before security-sensitive lookup.

### Q3. Can `tenantId` in the body choose the DB?

No.

### Q4. What does the resolver consult?

Trusted Control Plane tenant/domain/database metadata, accelerated by
its safe cache behavior.

### Q5. Positive cache TTL in the current tracker?

60 seconds.

### Q6. Negative cache TTL?

15 seconds.

### Q7. Should a Control Plane outage be cached as "unknown tenant"?

No. A transient inability to verify is not a definitive unknown-domain
fact.

### Q8. Why invalidate cache?

Because domain/status changes must not depend only on stale cached
routing information.

### Q9. What is TenantContext?

Immutable trusted request-scoped tenant metadata established after
resolution.

### Q10. Why use AsyncLocalStorage?

To propagate request-specific context through asynchronous calls without
using a shared mutable global tenant variable.

### Q11. Does TenantContext mean the user is authorized?

No.

### Q12. What does TenantMembershipGuard answer?

Whether the authenticated identity is allowed as a member of the
currently resolved tenant for the protected tenant-admin boundary.

### Q13. What happens when tenant resolution is unsafe?

Fail closed.

### Q14. Why is `x-forwarded-host` sensitive?

Because if blindly trusted, an attacker could influence the hostname
used for tenant resolution.

### Q15. Why are SSR/BFF tests important?

Because server-side host propagation and shared caches can otherwise
create tenant confusion even when browser-facing routing looks correct.

------------------------------------------------------------------------

# 74. Explain It Like You Are Five

If someone asks what this whole lesson means, say:

> Ferio looks at which shop website you entered. It checks its own
> trusted records to find that shop. Then it puts an invisible,
> unchangeable label on your request saying which shop it belongs to.
> Everything that happens afterward uses that label. If Ferio cannot
> safely figure out the shop, it stops instead of guessing.

That is the baby explanation.

------------------------------------------------------------------------

# 75. Explain It Like a Senior Engineer

A senior-level explanation is:

> Ferio establishes tenant authority at the HTTP boundary by
> canonicalizing the approved hostname input and resolving it against
> Control Plane domain metadata with bounded positive/negative caching
> and explicit invalidation. Definitive tenant failures fail closed and
> never fall back to the legacy or another tenant database. Successful
> resolution creates an immutable AsyncLocalStorage-backed TenantContext
> containing safe organization/database-registry identity. Downstream
> authorization binds the authenticated principal to the resolved
> tenant, while application services obtain database access through the
> tenant-aware database boundary rather than parsing raw routing input.
> Trusted-proxy/SSR host propagation is treated as a separate security
> boundary and requires explicit deployment trust.

If you understand both the five-year-old explanation and the senior
explanation, you truly understand the concept rather than merely
memorizing terminology.

------------------------------------------------------------------------

# 76. Next Document

## Document 03 --- Tenant Database Router, Prisma Client Lifecycle & Connection Management

Next we follow:

``` text
TenantContext = ABC
       ↓
TenantDbService
       ↓
TenantDatabaseManager
       ↓
encrypted TenantDatabase registry credentials
       ↓
Prisma client / PostgreSQL pool
       ↓
ABC PostgreSQL
```

We will explain, from baby level to production depth:

``` text
Why not one global PrismaService?
Why not new PrismaClient() per request?
What is a connection pool?
What is LRU?
What is idle eviction?
What is single-flight client creation?
What is an acquire timeout?
What is a circuit breaker?
What happens when 100 tenants become active?
What is a connection budget?
Why PgBouncer may eventually matter?
How does one broken tenant DB stay isolated?
How are credentials encrypted/decrypted safely?
How do transactions stay on one tenant client?
```

------------------------------------------------------------------------

**End of Document 02**