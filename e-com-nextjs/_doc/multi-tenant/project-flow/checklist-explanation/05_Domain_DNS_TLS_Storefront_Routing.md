# Ferio Engineering Learning Series

## Document 05 --- Domain, Subdomain, DNS, TLS & Storefront Routing

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-5\
**Goal:** Understand how a browser hostname reaches the correct Ferio
tenant safely.

------------------------------------------------------------------------

# 1. Where We Are

So far:

``` text
Document 01 → Multi-tenancy
Document 02 → Tenant Resolver + TenantContext
Document 03 → TenantDatabaseManager + Prisma routing
Document 04 → Provisioning a new tenant
```

Baby Shop is now provisioned.

Its default hostname might be:

``` text
baby-shop-bd.ferio.com
```

Now we must answer:

> When someone types that address into Chrome, how does the request
> reach Baby Shop instead of another Ferio store?

That is MT-5.

------------------------------------------------------------------------

# 2. The Big Picture

``` text
Customer
   ↓
baby-shop-bd.ferio.com
   ↓
DNS
   ↓
Cloudflare / storefront infrastructure
   ↓
HTTPS / TLS
   ↓
Customer Web
   ↓
trusted hostname forwarded
   ↓
NestJS
   ↓
Tenant Resolver
   ↓
TenantContext = Baby Shop
   ↓
Baby Shop DB
```

There are several different systems here. Do not mix them together.

------------------------------------------------------------------------

# 3. Domain vs Subdomain

Suppose Ferio owns:

``` text
ferio.com
```

That is the base domain.

These are subdomains:

``` text
abc.ferio.com
baby-shop.ferio.com
perfect-textile.ferio.com
```

Ferio's canonical default tenant hostname follows the idea:

``` text
{slug}.{FERIO_PUBLIC_DOMAIN}
```

So:

``` text
slug = baby-shop
public domain = ferio.com

→ baby-shop.ferio.com
```

------------------------------------------------------------------------

# 4. Why Use One Subdomain Per Tenant?

Because the hostname itself becomes a strong tenant-routing signal.

``` text
abc.ferio.com
       ↓
ABC tenant

baby-shop.ferio.com
       ↓
Baby Shop tenant
```

Same application code.

Different trusted hostname.

Different TenantContext.

Different tenant database.

------------------------------------------------------------------------

# 5. DNS --- Baby Explanation

DNS is like the internet's phonebook.

You know:

``` text
baby-shop.ferio.com
```

but computers ultimately need to know where to send the request.

DNS answers roughly:

``` text
"Where should baby-shop.ferio.com go?"
```

and points traffic toward Ferio's storefront infrastructure.

DNS does **not** choose the PostgreSQL database.

That happens later inside Ferio.

------------------------------------------------------------------------

# 6. Wildcard DNS

Imagine Ferio eventually has:

``` text
abc.ferio.com
baby-shop.ferio.com
shoe-store.ferio.com
book-store.ferio.com
...
```

Creating a separate DNS record manually for every tenant would become
annoying.

A wildcard can conceptually say:

``` text
*.ferio.com
     ↓
Ferio storefront infrastructure
```

Meaning many tenant subdomains can reach the same storefront entry
point.

Then the application examines the actual hostname and decides which
tenant it belongs to.

------------------------------------------------------------------------

# 7. Important: Wildcard DNS Does Not Create a Tenant

This is critical.

If wildcard DNS exists, even:

``` text
banana-random-123.ferio.com
```

may reach Ferio's infrastructure.

That does **not** mean `banana-random-123` is a valid tenant.

Ferio still must perform:

``` text
hostname
   ↓
TenantDomain lookup
   ↓
valid active organization?
   ↓
yes → continue
no  → fail closed
```

DNS routing and tenant authorization/resolution are different layers.

------------------------------------------------------------------------

# 8. Current Ferio Wildcard DNS Status

The project has selected the direction:

``` text
*.ferio.com
→ storefront infrastructure
```

with Cloudflare as the preferred DNS strategy.

But the checklist marks actual production wildcard DNS record creation
as **PARTIAL**, because creating the real production DNS record is an
operations task.

So distinguish:

``` text
architecture decision ✓
application behavior ✓/mostly
actual production DNS operation still required
```

------------------------------------------------------------------------

# 9. What Is TLS?

When you visit:

``` text
https://baby-shop.ferio.com
```

the `https` matters.

TLS provides the secure encrypted connection underneath HTTPS.

Baby analogy:

``` text
HTTP  = sending a postcard
HTTPS = sending it inside a secure envelope
```

TLS also helps the browser verify that it is talking to a server
authorized for the hostname.

------------------------------------------------------------------------

# 10. Wildcard TLS

If Ferio has hundreds of subdomains, a wildcard certificate strategy can
cover hostnames under the Ferio domain.

Conceptually:

``` text
*.ferio.com
```

can cover tenant names such as:

``` text
abc.ferio.com
baby-shop.ferio.com
perfect.ferio.com
```

Ferio's selected direction is automated wildcard TLS for the
Cloudflare-backed storefront ingress.

Actual certificate issuance, renewal monitoring and production readiness
verification remain operational responsibilities.

------------------------------------------------------------------------

# 11. DNS vs TLS

Do not confuse them.

``` text
DNS
"Where does this hostname go?"

TLS
"Can we establish a trusted encrypted HTTPS connection for this hostname?"
```

Both are required for a normal secure production storefront.

------------------------------------------------------------------------

# 12. The Browser Request

A customer enters:

``` text
https://baby-shop.ferio.com/products
```

Conceptually the request contains:

``` http
GET /products
Host: baby-shop.ferio.com
```

That hostname is extremely important.

Ferio uses trusted hostname information to determine:

``` text
which organization?
```

------------------------------------------------------------------------

# 13. Reverse Proxy / Ingress

Production requests often do not go straight from the browser into
NestJS.

They may pass through infrastructure:

``` text
Browser
   ↓
Cloudflare
   ↓
load balancer / reverse proxy / ingress
   ↓
Next.js Customer Web
   ↓
NestJS API
```

A reverse proxy receives traffic and forwards it to internal
applications.

Baby analogy:

> It is the reception desk at the front of the building.

------------------------------------------------------------------------

# 14. Why Host Forwarding Matters

Suppose the browser requested:

``` text
baby-shop.ferio.com
```

but an internal server-side call to NestJS looks only like:

``` text
http://ferio-backend:6733
```

If the backend sees only the internal backend hostname, it cannot know
the original tenant.

Therefore the trusted original storefront hostname must be
preserved/forwarded through the server-side request path.

------------------------------------------------------------------------

# 15. X-Forwarded-Host

A proxy can carry the original hostname in a header such as:

``` http
X-Forwarded-Host: baby-shop.ferio.com
```

Conceptually:

``` text
Browser:
Host = baby-shop.ferio.com
        ↓
trusted proxy
        ↓
internal request:
X-Forwarded-Host = baby-shop.ferio.com
```

Ferio's Customer Web server-side/BFF requests forward the original
storefront host so the backend can resolve the correct tenant.

------------------------------------------------------------------------

# 16. But Never Blindly Trust Forwarded Headers

A client can attempt to send:

``` http
X-Forwarded-Host: victim.ferio.com
```

So the security question is not:

> "Does the header exist?"

It is:

> "Did this hostname information come through a trusted proxy boundary
> configured by us?"

Production systems must define which proxy/ingress is trusted and how
forwarded headers are sanitized/replaced.

The Ferio checklist explicitly describes HTTPS redirects in terms of
**trusted-proxy** requests.

------------------------------------------------------------------------

# 17. Host vs X-Forwarded-Host

Simplified:

``` text
Host
→ hostname seen at the current HTTP hop

X-Forwarded-Host
→ original host preserved by a proxy
```

Which one is authoritative depends on deployment architecture and
trusted-proxy configuration.

Do not implement:

``` ts
const tenant = req.headers['x-forwarded-host'];
```

and blindly trust arbitrary internet input.

------------------------------------------------------------------------

# 18. Server-Side Rendering Changes Everything

Ferio's Customer Web uses server-side behavior.

Imagine Next.js is rendering:

``` text
baby-shop.ferio.com
```

The server needs Baby Shop's:

``` text
store name
logo
products
support contacts
policies
SEO metadata
```

So the SSR/server request must preserve Baby Shop's host when fetching
tenant data.

Otherwise:

``` text
browser host = baby-shop.ferio.com

Next.js → backend
          forgets host

backend → cannot resolve tenant correctly
```

------------------------------------------------------------------------

# 19. Ferio's SSR Safety Gate

The project says the Customer Web root layout resolves tenant status
through:

``` text
/tenancy/status
```

before tenant rendering proceeds.

Then server-side BFF fetches forward the original hostname.

Mental model:

``` text
request for Baby Shop
       ↓
Customer Web
       ↓
check tenant status
       ↓
is this an active/resolvable tenant?
       ↓
yes
       ↓
fetch Baby Shop data with trusted host context
```

------------------------------------------------------------------------

# 20. Why Resolve Before Fetching Tenant Data?

Bad:

``` text
render page
→ fetch generic settings
→ later determine tenant
```

Potentially dangerous.

Correct:

``` text
resolve tenant
→ establish tenant boundary
→ fetch tenant-local data
```

The hostname decision must come before tenant-specific reads.

------------------------------------------------------------------------

# 21. Tenant-Specific Branding

Suppose:

``` text
ABC:
logo = abc-logo.png
store name = ABC Electronics

Baby Shop:
logo = baby-logo.png
store name = Baby Shop BD
```

Request:

``` text
baby-shop.ferio.com
```

must never render:

``` text
ABC Electronics
```

even temporarily because of caching or a fallback.

The project explicitly requires branding failure fallbacks that never
display another tenant's branding.

------------------------------------------------------------------------

# 22. Caching Is a Multi-Tenant Security Problem

Caching normally sounds like performance.

But in SaaS it can become isolation/security.

Bad cache:

``` text
key = "store-settings"
```

ABC request:

``` text
store-settings → ABC settings
```

Baby request:

``` text
store-settings → cache hit
              → ABC settings  ❌
```

That is cross-tenant leakage.

------------------------------------------------------------------------

# 23. Ferio's Current Cache Safety

For resolved tenant responses, the checklist describes:

``` http
Cache-Control: private, no-store
Vary: x-forwarded-host
```

and tenant-local server fetches preserve the original host.

Sensitive tenant reads use `no-store`.

The point is:

> A response produced for one tenant hostname must not be reused for
> another hostname.

------------------------------------------------------------------------

# 24. What Does `no-store` Mean?

Simplified:

``` text
Do not store this response for later reuse.
```

That sacrifices some caching performance for strong safety where
tenant-local data is involved.

Later, Ferio could introduce carefully tenant-keyed caching, but
isolation must remain correct.

------------------------------------------------------------------------

# 25. What Does `Vary` Mean?

Conceptually:

``` http
Vary: x-forwarded-host
```

tells an HTTP cache:

> Responses may differ depending on this header.

So:

``` text
ABC host response
```

and:

``` text
Baby Shop host response
```

must not be treated as interchangeable.

Again, the actual trusted deployment boundary matters.

------------------------------------------------------------------------

# 26. Cache Keys Must Include Tenant Identity

If Ferio later uses a cache for branding:

Bad:

``` text
branding
```

Better:

``` text
tenant:org_abc:branding
tenant:org_baby:branding
```

or another trusted canonical tenant identity.

Never derive a sensitive cache namespace from an untrusted
browser-supplied tenant ID.

------------------------------------------------------------------------

# 27. SEO Is Also Tenant-Specific

Search engines see each storefront as its own site.

ABC should have:

``` text
ABC Electronics
ABC description
ABC canonical URLs
ABC sitemap
```

Baby Shop should have:

``` text
Baby Shop BD
Baby Shop description
Baby Shop canonical URLs
Baby Shop sitemap
```

Ferio's `generateMetadata()` resolves the tenant before reading
tenant-local settings.

------------------------------------------------------------------------

# 28. Unknown Hosts Must Not Be Indexed

Suppose:

``` text
does-not-exist.ferio.com
```

Because wildcard DNS may still route it to Ferio, the application must
not generate a normal public storefront.

The checklist says unknown/non-active hosts receive safe
unavailable/noindex behavior.

That prevents search engines from indexing garbage or inactive tenant
pages.

------------------------------------------------------------------------

# 29. robots.txt

`robots.txt` gives search-engine crawlers instructions.

Conceptually an inactive/unknown tenant should not advertise itself for
indexing.

Ferio makes robots behavior tenant/status-aware.

The important point is not the exact text of the robots file.

The important point is:

``` text
resolve host first
→ determine tenant status
→ generate safe crawler policy
```

------------------------------------------------------------------------

# 30. sitemap.xml

A sitemap tells search engines about public URLs.

Danger:

``` text
Baby Shop sitemap accidentally contains ABC product URLs
```

That is both SEO corruption and potential tenant leakage.

Ferio resolves tenant status first and derives sitemap URLs from the
current forwarded host.

------------------------------------------------------------------------

# 31. Canonical URLs

A canonical URL tells search engines which URL is the preferred identity
for a page.

If one tenant can have:

``` text
baby-shop.ferio.com
```

and later:

``` text
babyshop.com
```

Ferio needs a primary/canonical-domain concept so search engines do not
treat copies as competing pages.

The MT-5 design supports selecting a primary active domain.

------------------------------------------------------------------------

# 32. HTTP → HTTPS Redirect

Production storefront traffic should use HTTPS.

Ferio's Customer Web permanently redirects trusted-proxy safe methods
such as:

``` text
GET
HEAD
OPTIONS
```

from HTTP to HTTPS.

Why be careful with mutation requests?

A blind redirect of unsafe API operations can have tricky
security/semantic consequences.

The checklist says unsafe API mutations retain same-origin protections
rather than simply following unsafe redirects.

------------------------------------------------------------------------

# 33. Reserved Subdomains

Ferio protects names such as:

``` text
www
admin
api
app
```

Why?

Imagine a merchant chooses:

``` text
slug = api
```

Then:

``` text
api.ferio.com
```

could collide with system infrastructure.

So `RESERVED_SUBDOMAINS` protects Ferio's platform namespace.

------------------------------------------------------------------------

# 34. Local Development

Production:

``` text
baby-shop.ferio.com
```

Local development may use:

``` text
localhost:3000
```

or another developer host.

Ferio has a:

``` text
TENANT_DEV_HOST_MAP
```

for exact local aliases.

Conceptually:

``` text
localhost:3000
      ↓ dev-only mapping
baby-shop registered tenant
```

This lets developers test tenant behavior without changing production
routing.

------------------------------------------------------------------------

# 35. Dev Rules Must Never Leak Into Production

Dangerous:

``` text
unknown production hostname
→ use dev fallback tenant
```

That violates fail-closed isolation.

Development mappings must be:

``` text
explicit
exact
non-production only
```

Production must ignore the dev map.

------------------------------------------------------------------------

# 36. Custom Domains

Some merchants may want:

``` text
babyshop.com
```

instead of only:

``` text
baby-shop.ferio.com
```

That is a custom domain.

Flow:

``` text
Tenant requests babyshop.com
        ↓
Ferio records request
        ↓
PENDING_VERIFICATION
        ↓
prove domain ownership
        ↓
verify DNS/TLS readiness
        ↓
activate
```

Custom domains are plan-gated in the current design.

------------------------------------------------------------------------

# 37. Why Ownership Verification?

Imagine attacker controls Tenant A and submits:

``` text
google.com
```

Ferio must not simply accept:

``` text
"Sure, google.com belongs to Tenant A."
```

The tenant must prove control of the domain.

That is why Ferio creates an ownership verification challenge.

------------------------------------------------------------------------

# 38. Verification Challenge

Conceptually Ferio might issue:

``` text
ferio-verification = random-secret-token
```

and require the domain owner to place a corresponding DNS record.

Then Ferio checks:

``` text
Does DNS prove the requester controls this domain?
```

The exact DNS record format/provider automation is
implementation-specific; the checklist confirms the ownership-token
lifecycle but leaves automated DNS verification as an open item.

------------------------------------------------------------------------

# 39. PENDING_VERIFICATION

A custom domain starts:

``` text
PENDING_VERIFICATION
```

It must remain unresolvable as an active tenant domain until ownership
verification succeeds.

This prevents:

``` text
request domain
→ instantly hijack routing
```

------------------------------------------------------------------------

# 40. Custom-Domain Current Status

The tracker marks these implemented:

``` text
custom-domain request
ownership challenge
activation only after challenge verification
primary/canonical selection
domain disable/removal
stale takeover protections
auditing
plan entitlement gate
```

But these remain open:

``` text
automated DNS verification
TLS readiness verification
```

So do not claim custom-domain production automation is fully complete.

------------------------------------------------------------------------

# 41. Domain Entitlement

Custom domains are not merely a frontend button.

Ferio evaluates the organization's subscription before creating the
pending custom-domain record.

Meaning:

``` text
Tenant Admin clicks "Add custom domain"
        ↓
backend
        ↓
EntitlementsService
        ↓
allowed?
   /          \
 yes           no
 ↓             ↓
create       stable denial
request
```

Backend enforcement matters because hidden UI controls are not security.

------------------------------------------------------------------------

# 42. Domain Removal

Suppose Baby Shop removes:

``` text
shop.example.com
```

Ferio must:

``` text
disable/revoke routing
```

and invalidate cached hostname resolution.

Otherwise a stale cache might continue routing traffic to Baby Shop
after the domain was removed.

------------------------------------------------------------------------

# 43. Stale Domain Takeover

This is an important SaaS security problem.

Scenario:

``` text
Tenant A once owned:
shop.example.com

Tenant A removes it.

Later Tenant B tries to claim it.
```

If old cache/state remains, requests might route unpredictably.

Ferio protects this using:

``` text
unique hostname ownership
organization-scoped mutations
disabled-domain invalidation
verification lifecycle
```

------------------------------------------------------------------------

# 44. Domain Cache Invalidation

Remember the Tenant Resolver may cache:

``` text
hostname → organization
```

Example:

``` text
babyshop.com → org_baby
```

Now domain is disabled.

If cache remains:

``` text
babyshop.com → org_baby
```

for too long, routing is stale.

So domain mutations need explicit cache invalidation.

The Platform Admin has a safe organization-scoped domain-cache
invalidation path.

------------------------------------------------------------------------

# 45. Why Admin Should Not Supply Raw Cache Keys

Bad API:

``` text
POST /invalidate-cache
{
  "key": "whatever-user-wants"
}
```

This gives the caller too much control.

Ferio's platform operation instead identifies the organization,
enumerates its trusted Control Plane hostnames and invokes the tenancy
invalidation hook.

It does not accept arbitrary cache keys or database URLs from the
caller.

------------------------------------------------------------------------

# 46. Unknown Store State

Request:

``` text
random.ferio.com
```

No active TenantDomain.

Correct:

``` text
dedicated unavailable/unknown store page
no tenant data
no fallback tenant
no index
```

Never:

``` text
"Could not resolve tenant, so use original Ferio DB."
```

That would destroy the security model.

------------------------------------------------------------------------

# 47. Provisioning / Not-Ready Store

A hostname may be known but its tenant is still being prepared.

Correct UI:

``` text
Store is being prepared / unavailable
```

not:

``` text
partially render whatever data exists
```

Remember Document 04:

``` text
readiness before activation
```

MT-5 carries that rule into the frontend.

------------------------------------------------------------------------

# 48. Suspended Store

The approved Ferio policy keeps a suspended storefront browsable while
commerce writes such as checkout are denied.

So:

``` text
SUSPENDED tenant
        ↓
browse storefront ✓
checkout          ✗
```

The exact visible suspended-state UX should follow Ferio's policy and
subscription enforcement.

------------------------------------------------------------------------

# 49. Removed / Closed Domains

The resolver fails closed for states including unknown/disabled and
organization lifecycle states where routing should no longer be active.

The Customer Web then shows safe unavailable behavior and prevents
indexing.

Again:

``` text
fail closed
```

means:

> If Ferio cannot safely prove the tenant is valid for this request, do
> not guess another tenant.

------------------------------------------------------------------------

# 50. Branding Failure

Suppose Baby Shop is active, but its settings request fails.

Bad fallback:

``` text
show last cached ABC branding
```

Correct:

``` text
use static application-safe fallback
```

The checklist explicitly says an unavailable host or branding failure
must never display another tenant's branding.

------------------------------------------------------------------------

# 51. Full Default-Subdomain Request

``` text
User types:
https://baby-shop.ferio.com
          ↓
DNS
*.ferio.com → Ferio storefront
          ↓
Cloudflare / ingress
          ↓
TLS
secure connection for hostname
          ↓
Customer Web
          ↓
preserve trusted original host
          ↓
/tenancy/status
          ↓
NestJS tenant resolver
          ↓
TenantDomain
baby-shop.ferio.com
          ↓
Organization = Baby Shop
          ↓
TenantContext
          ↓
server-side tenant data fetch
          ↓
TenantDatabaseManager
          ↓
Baby Shop PostgreSQL
          ↓
Baby Shop branding/products
          ↓
HTML returned to customer
```

------------------------------------------------------------------------

# 52. Two Tenants at the Same Time

``` text
Request A
abc.ferio.com
    ↓
org_abc
    ↓
ABC DB
```

while:

``` text
Request B
baby-shop.ferio.com
    ↓
org_baby
    ↓
Baby Shop DB
```

The infrastructure may be shared.

The code may be shared.

The databases/data are isolated.

The trusted hostname starts the routing decision.

------------------------------------------------------------------------

# 53. The MT-5 Gate Has One Important Open Item

The supplied checklist currently shows:

``` text
[ ] Tenant A and Tenant B render different storefronts/data/settings
    on distinct hosts.
```

while cache/CDN isolation and unknown/removed-domain safety are marked
complete.

This means the architecture/components may exist, but the specific
end-to-end distinct-host gate still needs proof according to the
tracker.

Do not silently mark it complete.

------------------------------------------------------------------------

# 54. Why This Gate Matters

Unit tests can prove:

``` text
resolver works
cache headers work
settings service works
```

But the final proof should resemble reality:

``` text
Host A
→ Store A logo
→ Store A products
→ Store A settings

Host B
→ Store B logo
→ Store B products
→ Store B settings
```

with deliberately overlapping identifiers where useful.

That is an end-to-end isolation proof.

------------------------------------------------------------------------

# 55. CDN Danger

A CDN can sit before the app:

``` text
Customer
   ↓
CDN
   ↓
Ferio
```

If CDN caching ignores hostname/tenant variation, it could serve:

``` text
ABC page
```

to:

``` text
Baby Shop visitor
```

So CDN configuration is part of tenant isolation.

Multi-tenancy is not only a database concern.

------------------------------------------------------------------------

# 56. Cache Poisoning / Host Confusion

Security review should ask:

``` text
Can attacker-controlled Host values enter a cache key incorrectly?
Can forwarded host be spoofed?
Can unknown hosts poison cached metadata?
Can one host's canonical URL appear on another?
Can redirects be generated from untrusted host input?
```

Hostname handling must be normalized and trusted before it influences
routing or generated URLs.

------------------------------------------------------------------------

# 57. Host Normalization Reminder

From the earlier tenant-resolver lesson, hostnames should be normalized
before lookup.

Conceptually:

``` text
BABY-SHOP.FERIO.COM:443
        ↓
normalize
        ↓
baby-shop.ferio.com
```

Rules include lowercase handling, development port handling, and
malformed/IP-literal rejection according to the resolver contract.

MT-5 depends on MT-2 getting this right.

------------------------------------------------------------------------

# 58. Dependency Relationship

MT-5 depends on earlier architecture:

``` text
MT-1 Control Plane
       ↓
TenantDomain registry

MT-2 Resolver
       ↓
hostname → TenantContext

MT-3 DB router
       ↓
TenantContext → correct DB

MT-4 Provisioning
       ↓
reserve/activate tenant domain

MT-5
       ↓
make real storefront routing work safely
```

This is why implementation order matters.

------------------------------------------------------------------------

# 59. Domain State vs Organization State

A domain can have its own lifecycle.

Example:

``` text
Domain:
PENDING_VERIFICATION
```

while the organization exists.

Or:

``` text
Domain:
ACTIVE
```

while organization later becomes suspended.

Tenant resolution must consider enough state to determine whether
routing/use is allowed.

Do not assume:

``` text
domain row exists = tenant fully usable
```

------------------------------------------------------------------------

# 60. Primary Domain

Suppose Baby Shop has:

``` text
baby-shop.ferio.com
babyshop.com
www.babyshop.com
```

Ferio needs one primary/canonical domain.

Conceptually:

``` text
primary = babyshop.com
```

This helps:

``` text
canonical URLs
SEO consistency
redirect policy
merchant branding
```

The project supports primary selection only for active domains and
clears the previous primary atomically.

------------------------------------------------------------------------

# 61. Atomic Primary Switch

Why atomically?

Bad race:

``` text
domain A primary = true
domain B primary = true
```

Now the tenant has two primaries.

Correct operation conceptually:

``` text
transaction:
  clear old primary
  set new primary
commit
```

Final invariant:

``` text
at most one intended primary domain
```

------------------------------------------------------------------------

# 62. Audit Domain Changes

Domain operations are security-sensitive.

Audit:

``` text
domain reserved
custom domain requested
verification attempted/completed
domain activated
primary changed
domain disabled
cache invalidated
```

Useful evidence:

``` text
actor
organization
domain ID
action
time
safe outcome
```

Do not expose verification secrets unnecessarily in diagnostics.

------------------------------------------------------------------------

# 63. Domain Verification Diagnostics

Platform operators need to know:

``` text
domain status
organization status
verification failure
routing issue
```

The platform domain-health endpoint exposes bounded credential-free
diagnostics.

It intentionally does not return verification tokens in the diagnostic
view.

------------------------------------------------------------------------

# 64. SSR vs Browser Fetch

Two paths can exist.

Browser-side:

``` text
Browser
→ API
```

Server-side:

``` text
Browser
→ Next.js server
→ backend API
```

The second path is easy to get wrong because the backend request is
created by your own server.

You must deliberately carry the original trusted tenant hostname through
that internal hop.

------------------------------------------------------------------------

# 65. BFF

BFF means:

``` text
Backend For Frontend
```

In Ferio's Customer Web context, Next.js server-side code can act as a
frontend-specific server layer that calls the backend.

Mental model:

``` text
Browser
  ↓
Next.js BFF
  ↓
NestJS
```

Tenant identity must survive:

``` text
Browser host → BFF → backend
```

------------------------------------------------------------------------

# 66. SEO Isolation Test

Create:

``` text
Tenant A:
name = Alpha Shop
domain = alpha.ferio.com

Tenant B:
name = Beta Shop
domain = beta.ferio.com
```

Verify:

``` text
alpha metadata
→ Alpha Shop

beta metadata
→ Beta Shop
```

Then verify:

``` text
alpha sitemap contains no beta URLs
beta sitemap contains no alpha URLs
unknown host = noindex
```

------------------------------------------------------------------------

# 67. Cache Isolation Test

Request:

``` text
alpha.ferio.com/settings
```

then immediately:

``` text
beta.ferio.com/settings
```

Expected:

``` text
Alpha → Alpha
Beta  → Beta
```

Repeat in reverse order.

Why reverse order?

Because many cache bugs only become visible depending on which tenant
populated the cache first.

------------------------------------------------------------------------

# 68. Unknown-Host Test

Try:

``` text
does-not-exist.ferio.com
```

Expected:

``` text
no default tenant
no tenant DB fallback
safe unavailable page
noindex
```

This should remain true even though wildcard DNS may route the hostname
to Ferio.

------------------------------------------------------------------------

# 69. Removed-Domain Test

1.  Activate a domain.
2.  Resolve it successfully.
3.  Disable/remove it.
4.  Immediately request it again.

Expected:

``` text
routing revoked
resolver cache invalidated
safe unavailable state
```

This proves stale cache cannot keep a removed domain alive.

------------------------------------------------------------------------

# 70. Custom-Domain Security Test

Attempt:

``` text
Tenant A requests victim-example.com
```

without proving ownership.

Expected:

``` text
PENDING_VERIFICATION
not active
not routable as trusted tenant domain
```

Then attempt to activate without correct organization-scoped challenge.

Expected:

``` text
denied
```

------------------------------------------------------------------------

# 71. Reserved-Slug Test

Attempt to create organizations with:

``` text
www
admin
api
app
```

Expected:

``` text
rejected before tenant provisioning opens
```

This protects system routes.

------------------------------------------------------------------------

# 72. Suspended Tenant Test

Given an approved suspended tenant:

``` text
GET storefront
→ browsable according to policy

checkout/write
→ denied by subscription policy
```

Domain routing and subscription authorization are related but not
identical.

The hostname may still resolve to the tenant while business actions are
restricted.

------------------------------------------------------------------------

# 73. Failure Mode: Wrong Host Forwarding

Symptom:

``` text
all storefronts show same store
```

Investigate:

``` text
Is original Host preserved?
Does Next.js forward x-forwarded-host?
Is proxy overwriting it?
Does backend trust the correct proxy?
Is tenant status resolved before fetch?
Is a cache ignoring host variation?
```

Do not immediately blame Prisma.

The bug may occur before database routing.

------------------------------------------------------------------------

# 74. Failure Mode: Works in Browser, Fails in SSR

Symptom:

``` text
client-side navigation works
direct page refresh shows wrong/unavailable tenant
```

Likely area:

``` text
server-side host forwarding / SSR tenant resolution
```

Browser and server fetch paths may be carrying different host context.

------------------------------------------------------------------------

# 75. Failure Mode: Wrong Logo Appears Occasionally

This strongly suggests investigating:

``` text
shared cache
CDN cache key
Next.js fetch cache
static generation
fallback state
host variation
```

Cross-tenant cache leakage can look random because it depends on which
tenant warmed the cache first.

------------------------------------------------------------------------

# 76. Failure Mode: Removed Domain Still Works

Check:

``` text
TenantDomain status
resolver positive cache
explicit invalidation
CDN cache
DNS cache
browser cache
proxy cache
```

Not every cache lives in the same layer.

Application cache invalidation does not instantly erase global DNS
caching.

------------------------------------------------------------------------

# 77. DNS TTL vs Application Cache TTL

DNS may cache:

``` text
hostname → infrastructure address
```

Ferio's resolver cache may cache:

``` text
hostname → organization
```

These are different.

Disabling a tenant domain does not necessarily require DNS to stop
resolving.

It can still reach Ferio infrastructure, where Ferio rejects it safely.

That is often desirable for centralized unavailable behavior.

------------------------------------------------------------------------

# 78. Canonical Redirect Safety

Redirects constructed from host data need care.

Bad:

``` text
take arbitrary Host header
→ build Location header
```

Potential result:

``` text
open redirect / host-header abuse
```

Only normalized/trusted domains should influence canonical redirects.

This is a general security principle; exact Ferio redirect
implementation should be checked in source when reviewing code.

------------------------------------------------------------------------

# 79. DNS Does Not Equal Ownership

A hostname pointing at Ferio does not automatically prove that the
requester owns it.

For default Ferio subdomains:

``` text
Ferio owns ferio.com
```

so Ferio controls creation.

For merchant custom domains:

``` text
merchant must prove control
```

That distinction is why custom-domain verification exists.

------------------------------------------------------------------------

# 80. TLS Does Not Equal Tenant Authorization

Even if:

``` text
HTTPS certificate valid
```

Ferio must still verify:

``` text
Is this hostname registered?
Is it active?
Which organization owns it?
Is organization state allowed?
```

TLS protects the connection.

Tenant resolution protects application routing.

------------------------------------------------------------------------

# 81. Senior Mental Model: Four Independent Questions

For every storefront request ask:

``` text
1. NETWORK
   Did the hostname reach our infrastructure?

2. TRANSPORT
   Is the HTTPS/TLS connection valid?

3. TENANCY
   Which trusted organization does this hostname map to?

4. APPLICATION
   What may this tenant/user do right now?
```

Do not collapse these into one concept.

------------------------------------------------------------------------

# 82. Senior Mental Model: Hostname Is Security-Relevant Input

Hostnames affect:

``` text
tenant selection
redirects
canonical URLs
SEO
caching
cookies
domain ownership
SSR data
```

Therefore hostname processing deserves the same seriousness as
authentication input.

Normalize, validate, trust only defined proxy paths, and fail closed.

------------------------------------------------------------------------

# 83. Senior Mental Model: Isolation Includes Presentation

Tenant isolation is not only:

``` text
"Tenant B cannot SELECT Tenant A's order."
```

It also means:

``` text
B cannot receive A's logo
B cannot receive A's SEO metadata
B cannot receive A's sitemap
B cannot receive A's cached settings
B cannot receive A's support contacts
B cannot inherit A's canonical domain
```

Presentation leakage is still tenant leakage.

------------------------------------------------------------------------

# 84. Senior Mental Model: CDN Is Part of Your Security Boundary

If the application is perfect but the CDN serves the wrong cached
response:

``` text
isolation still failed
```

Therefore production multi-tenant testing must include:

``` text
browser
DNS/proxy/CDN
frontend SSR
backend resolver
cache headers
database routing
```

not only service unit tests.

------------------------------------------------------------------------

# 85. Senior Mental Model: Fail Closed

Unknown:

``` text
unknown.ferio.com
```

Bad:

``` text
"Not sure. Use default Ferio tenant."
```

Correct:

``` text
"Cannot prove tenant → unavailable."
```

This principle must survive every layer:

``` text
SSR
resolver
cache
domain lifecycle
SEO
```

------------------------------------------------------------------------

# 86. Senior Mental Model: Domain Lifecycle Is a State Machine Too

Custom domain example:

``` text
REQUESTED
    ↓
PENDING_VERIFICATION
    ↓
VERIFIED / ACTIVE
    ↓
DISABLED
```

The exact persisted enum should be read from Ferio source, but the
checklist clearly establishes pending verification, activation after
verification, primary selection and disabling.

Do not allow arbitrary jumps that violate ownership/readiness.

------------------------------------------------------------------------

# 87. Simplified Teaching Pseudocode

Not copied from Ferio source:

``` ts
async function renderStore(request) {
  const host = trustedHostFromRequest(request);

  const status = await backend.getTenantStatus(host);

  if (!status.active) {
    return renderUnavailable(status);
  }

  const settings = await backend.getSettings({
    forwardedHost: host,
    cache: 'no-store',
  });

  return renderTenantStore(settings);
}
```

The important order is:

``` text
trusted host
→ tenant status
→ tenant-local fetch
→ render
```

------------------------------------------------------------------------

# 88. Simplified Domain Request Pseudocode

``` ts
async function requestCustomDomain(orgId, hostname) {
  await entitlements.require(orgId, 'custom_domain');

  const normalized = normalizeHostname(hostname);

  assertNotReserved(normalized);
  assertNotOwnedByAnotherOrg(normalized);

  return createDomain({
    organizationId: orgId,
    hostname: normalized,
    status: 'PENDING_VERIFICATION',
    verificationChallenge: generateChallenge(),
  });
}
```

Teaching only.

Actual Ferio source may structure these operations differently.

------------------------------------------------------------------------

# 89. Simplified Verification Pseudocode

``` ts
async function verifyCustomDomain(orgId, domainId, proof) {
  const domain = await getDomainForOrganization(orgId, domainId);

  verifyOwnershipProof(domain, proof);

  // Production design must also establish DNS/TLS readiness
  // before considering the external domain truly launch-ready.

  await activate(domain);
  await invalidateTenantResolverCache(domain.hostname);
}
```

Again, conceptual only.

The checklist currently marks DNS and TLS readiness verification as
open, so this pseudocode must not be mistaken for proof that those
production checks are complete.

------------------------------------------------------------------------

# 90. What Not to Do

``` text
❌ wildcard DNS = automatic tenant trust
❌ TLS certificate = tenant authorization
❌ trust arbitrary X-Forwarded-Host
❌ fetch tenant data before resolving tenant
❌ generic cross-tenant settings cache
❌ unknown host falls back to default DB
❌ inactive host gets indexable SEO
❌ sitemap mixes tenant URLs
❌ custom domain activates before ownership proof
❌ removed domain remains in resolver cache
❌ merchant chooses "api" as tenant slug
❌ diagnostics expose verification secrets
❌ assume local dev host map is safe in production
```

------------------------------------------------------------------------

# 91. Explain It Like You Are Five

> Every Ferio shop gets an internet address. DNS sends that address to
> the Ferio building. HTTPS locks the road so the connection is secure.
> Ferio then reads the shop name from the trusted address, checks that
> the shop really exists and is allowed to open, and sends the request
> to that shop's private data. If Ferio cannot prove which shop it is,
> it shows an unavailable page instead of guessing.

------------------------------------------------------------------------

# 92. Junior Engineer Answer

> MT-5 maps tenant hostnames to the shared storefront safely. Ferio uses
> `{slug}.{FERIO_PUBLIC_DOMAIN}`, wildcard DNS/TLS strategy, trusted
> host forwarding through Customer Web SSR, and the tenant resolver to
> select the organization. Tenant-specific settings, metadata, sitemap
> and robots behavior follow the resolved host, while unknown/inactive
> domains fail closed.

------------------------------------------------------------------------

# 93. Mid-Level Engineer Answer

> The domain layer is part of tenant isolation. Wildcard DNS routes
> tenant subdomains to shared infrastructure, but application-level
> `TenantDomain` resolution remains authoritative. SSR/BFF requests
> preserve trusted original-host context, and tenant-local responses
> avoid unsafe shared caching using host variation and `no-store`.
> Custom domains are organization-scoped, plan-gated and
> ownership-verified before activation, with primary-domain semantics,
> auditing and resolver-cache invalidation on lifecycle changes.

------------------------------------------------------------------------

# 94. Senior Engineer Answer

> MT-5 establishes hostname as a security-sensitive tenancy boundary
> across edge, SSR and backend layers. DNS/TLS only deliver
> authenticated transport to shared ingress; they do not establish
> tenant authorization. Trusted proxy semantics preserve normalized
> origin-host identity through the Next.js BFF into server-side tenant
> resolution, where active domain/organization state gates access.
> Presentation-layer isolation is protected through tenant-aware
> metadata, sitemap/robots generation, non-shared sensitive caching and
> host variation. Custom-domain lifecycle uses organization-scoped
> ownership proof, entitlement gating, uniqueness, primary-domain
> invariants, audit and cache invalidation to mitigate stale
> routing/takeover. Unknown or invalid domains fail closed rather than
> falling back to legacy/default tenant state.

------------------------------------------------------------------------

# 95. Ten Concepts to Remember

``` text
1. Domain       = internet name
2. Subdomain    = tenant name under Ferio's domain
3. DNS          = sends hostname toward infrastructure
4. TLS          = secures/authenticates HTTPS transport
5. Wildcard     = handles many Ferio subdomains
6. Trusted host = starts tenant resolution
7. SSR forwarding = preserves tenant through server fetches
8. Cache isolation = prevents presentation leakage
9. Verification = proves custom-domain ownership
10. Fail closed = never guess a tenant
```

------------------------------------------------------------------------

# 96. Self-Test

**Q: Does wildcard DNS mean every `*.ferio.com` hostname is a valid
tenant?**\
No. It may reach Ferio, but the resolver must find an allowed active
domain.

**Q: DNS vs TLS?**\
DNS routes the hostname; TLS secures/verifies the HTTPS transport.

**Q: Why forward the original host during SSR?**\
Because the backend needs the storefront hostname to resolve the correct
tenant.

**Q: Can we blindly trust `X-Forwarded-Host` from the internet?**\
No. It must be interpreted through a trusted proxy configuration.

**Q: Why use `no-store` for sensitive tenant reads?**\
To prevent unsafe reuse of one tenant's response for another.

**Q: Why is SEO tenant-aware?**\
Each storefront needs its own metadata, URLs, sitemap and crawler
policy.

**Q: What happens for an unknown host?**\
Fail closed, show safe unavailable behavior and avoid indexing.

**Q: Why verify custom-domain ownership?**\
To stop one tenant from claiming a domain it does not control.

**Q: Why invalidate resolver cache after domain removal?**\
To stop stale hostname → organization routing.

**Q: Can a suspended store still resolve?**\
Yes according to Ferio's policy; storefront browsing remains possible
while commerce writes such as checkout are restricted.

**Q: Is MT-5 completely proven?**\
Not yet according to the supplied tracker: the distinct-host Tenant
A/Tenant B storefront/data/settings gate remains unchecked, wildcard DNS
is partial operationally, and custom-domain DNS/TLS readiness
verification remains open.

------------------------------------------------------------------------

# 97. Real-Code Reading Exercise

Trace:

``` text
Customer Web root layout
        ↓
/tenancy/status
        ↓
host forwarding / instrumentation provider
        ↓
NestJS tenant middleware
        ↓
hostname normalization
        ↓
Tenant Resolver
        ↓
TenantDomain
        ↓
Organization
        ↓
TenantContext
        ↓
settings/catalog service
        ↓
TenantDatabaseManager
        ↓
tenant DB
```

Then trace domain administration:

``` text
Platform Admin
        ↓
DomainsService
        ├─ reserve default domain
        ├─ request custom domain
        ├─ create verification challenge
        ├─ verify/activate
        ├─ set primary
        ├─ disable
        └─ invalidate resolver cache
```

For every function ask:

``` text
Where did hostname come from?
Was it normalized?
Why is it trusted?
Could a browser spoof it?
Which organization owns it?
What state is the domain in?
What state is the organization in?
Can cache reuse another tenant's response?
What happens for unknown host?
Can this URL be indexed?
Can another org claim this domain?
Does mutation invalidate resolver cache?
```

------------------------------------------------------------------------

# 98. Architecture So Far

``` text
                     INTERNET
                        ↓
           baby-shop-bd.ferio.com
                        ↓
                       DNS
                        ↓
              CLOUDFLARE / INGRESS
                        ↓
                    TLS / HTTPS
                        ↓
                 CUSTOMER WEB
                  Next.js / SSR
                        ↓
             preserve trusted host
                        ↓
                 /tenancy/status
                        ↓
                   NESTJS API
                        ↓
                Tenant Resolver
                        ↓
                  TenantDomain
                        ↓
                  TenantContext
                        ↓
              TenantDatabaseManager
                        ↓
              Baby Shop PostgreSQL
                        ↓
          products/settings/branding
                        ↓
              tenant-specific HTML
```

------------------------------------------------------------------------

# 99. Current MT-5 Status From the Tracker

Implemented/selected:

``` text
✓ canonical tenant hostname format
✓ wildcard TLS strategy
✓ dev host mapping
✓ HTTPS canonical redirect rules
✓ reserved subdomains
✓ SSR host forwarding
✓ tenant-aware metadata/SEO
✓ tenant-aware sitemap/robots
✓ cache-aware branding
✓ custom-domain request/challenge
✓ activation after verification challenge
✓ primary domain
✓ domain removal
✓ stale takeover protections
✓ domain auditing
✓ plan gating
✓ unknown/provisioning/suspended frontend states
✓ cache/CDN isolation protections
✓ unknown/removed-domain safety
```

Still not fully closed:

``` text
△ production wildcard DNS record creation
△ automated custom-domain DNS verification
△ custom-domain TLS readiness verification
△ end-to-end proof that Tenant A and Tenant B render
  distinct storefronts/data/settings on distinct hosts
```

This distinction is important when evaluating whether MT-5 is actually
production-complete.

------------------------------------------------------------------------

# 100. Next Document

## Document 06 --- Plans, Subscriptions, Entitlements, Usage & SaaS Billing

Next we follow:

``` text
Baby Shop
   ↓
Starter / Business / Pro / Enterprise
   ↓
Subscription
   ↓
Entitlements
   ↓
Usage
   ↓
Can Baby Shop perform this action?
```

Then:

``` text
Baby Shop → pays Ferio
```

which is completely separate from:

``` text
Customer → pays Baby Shop
```

We will learn plan limits, server-side enforcement, trials, `PAST_DUE`,
grace periods, suspension, upgrade/downgrade, usage counters, SaaS
invoices, SSLCOMMERZ, webhook idempotency, and why platform billing must
never enter tenant commerce ledgers.

------------------------------------------------------------------------

**End of Document 05**