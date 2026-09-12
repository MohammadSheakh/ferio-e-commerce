# Ferio Engineering Learning Series

## Document 08 --- Redis, BullMQ, WebSockets, Cache, Files & External Integrations (MT-8)

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-8\
**Main question:** How does Ferio preserve tenant isolation after the
original HTTP request is gone?

------------------------------------------------------------------------

# 1. Why MT-8 Exists

In normal HTTP code, the path is easy to picture:

``` text
request
→ Tenant Resolver
→ TenantContext
→ service
→ tenant database
```

But modern applications do much more than synchronous HTTP.

Ferio also uses:

``` text
Redis
BullMQ
scheduled jobs
WebSockets
object storage
payment providers
courier providers
transactional messaging
```

These systems can outlive the original request.

That creates a dangerous question:

> **When the browser request is gone, how does the next piece of code
> still know which tenant owns the work?**

MT-8 answers that question.

------------------------------------------------------------------------

# 2. The Baby Analogy --- Labels on Every Box

Imagine Ferio is a giant delivery warehouse serving many shops.

A worker receives a box from ABC Electronics.

If the worker puts it on a conveyor belt without a shop label:

``` text
BOX: order_123
```

another worker later cannot safely know whether it belongs to:

``` text
ABC
Perfect
Baby Shop
```

The safe box looks like:

``` text
TENANT: ABC
WORK: order_123
```

The label must travel with the work.

MT-8 teaches Ferio to put trusted tenant identity on every shared
infrastructure path.

------------------------------------------------------------------------

# 3. The Core MT-8 Rule

Memorize:

> **Shared infrastructure may be shared physically, but tenant-owned
> state must be logically namespaced and resolved from trusted tenant
> identity.**

One Redis server can serve many tenants.

One BullMQ queue can process many tenants.

One Socket.IO server can host many tenants.

One R2 bucket can store many tenants.

But their data must never collide.

------------------------------------------------------------------------

# 4. Shared Infrastructure vs Shared Data

These are different:

``` text
SHARED INFRASTRUCTURE
Redis server
BullMQ cluster
Socket server
R2 bucket
application process
```

can be okay.

But this is not okay:

``` text
SHARED TENANT IDENTITY SPACE
settings:PUBLIC
job:reconcile:123
room:user:42
products/image.jpg
```

without tenant scope.

Correct mental model:

``` text
shared machine
+
separate logical namespace
```

------------------------------------------------------------------------

# 5. Redis

Redis is fast shared memory.

Ferio can use it for things such as:

``` text
cache
OTP state
temporary coordination
idempotency
presence
rate limits
session adjunct state
```

Redis is dangerous because keys are global within a Redis logical
database unless you namespace them.

------------------------------------------------------------------------

# 6. Redis Collision

Suppose both tenants have:

``` text
userId = 42
```

Bad:

``` text
user:42:profile
```

ABC writes:

``` text
ABC profile
```

Perfect later reads:

``` text
user:42:profile
```

It could receive ABC's cached value.

The PostgreSQL databases may be perfectly isolated while Redis leaks
data.

------------------------------------------------------------------------

# 7. Tenant-Scoped Redis Key

Conceptually:

``` text
t:{organizationId}:{resource}:{identifier}
```

Examples:

``` text
t:org_abc:user:42:profile
t:org_perfect:user:42:profile
```

or a feature-specific shape such as the tracker-documented settings key:

``` text
settings:{orgId}:{type}
```

The exact key format may vary by subsystem.

The invariant matters more than the punctuation:

> Tenant-owned Redis state must include trusted tenant identity.

------------------------------------------------------------------------

# 8. Ferio's Redis Inventory

The supplied tracker says tenant-aware Redis work includes:

``` text
settings cache
OTP
user profile/stats cache
idempotency
tenant session adjunct behavior
```

It also documents intentional exceptions.

For example, the refresh-token blacklist remains platform-scoped under
the current identity-plane policy.

That is important:

> Do not mechanically prefix every Redis key. First classify what the
> key represents.

------------------------------------------------------------------------

# 9. Rate Limits Can Be Intentionally Global

The tracker says business-semantic OTP keys are tenant-scoped, while
abuse-control rate limits may intentionally remain IP-global.

Why?

Because:

``` text
tenant business state
```

and:

``` text
platform abuse protection
```

are different architectural concerns.

An attacker should not receive a fresh independent abuse allowance
merely by switching tenant hostnames.

------------------------------------------------------------------------

# 10. Redis Inventory Is Still Open

At the supplied tracker state:

``` text
□ Inventory all Redis keys
```

is still unchecked.

Several important key families are already scoped and tested, but the
broad inventory control is not yet marked complete.

This is exactly why release checklists matter: individual
implementations can be strong while a completeness audit remains open.

------------------------------------------------------------------------

# 11. Distributed Locks

The tracker now marks this engineering control complete:

``` text
✓ Tenant-scope distributed locks
```

Why can this matter?

Suppose both tenants legitimately have:

``` text
orderId = 123
```

Bad lock:

``` text
lock:order:123
```

ABC processing can unnecessarily block Perfect.

Correct tenant-owned lock identity would conceptually include
organization scope.

A collision may cause:

``` text
false contention
incorrect deduplication
wrong serialization behavior
availability problems
```

even if it does not directly leak records.

------------------------------------------------------------------------

# 12. Redis Collision Tests

The tracker says Ferio tests helpers with identical record IDs across
tenants.

Expected:

``` text
ABC logical identifier
→ ABC Redis key

Perfect same identifier
→ different Redis key
```

This is the infrastructure version of the overlapping-ID database test
from Document 07.

------------------------------------------------------------------------

# 13. BullMQ

BullMQ is a job queue.

Think:

``` text
HTTP request:
"Please do this."

Queue:
"I will remember it."

Worker later:
"I will execute it."
```

Examples:

``` text
courier polling
payment expiry
transactional messaging
reconciliation
migration work
retry processing
```

------------------------------------------------------------------------

# 14. Why Async Jobs Are Dangerous

During HTTP:

``` text
AsyncLocalStorage
→ current organization = ABC
```

Then the request finishes.

Thirty seconds later a BullMQ worker runs.

The original request context is gone.

The worker cannot safely say:

``` text
"Whatever tenant is current."
```

There may be no current tenant.

So tenant identity must travel in the trusted job envelope.

------------------------------------------------------------------------

# 15. Trusted Job Envelope

Conceptually:

``` json
{
  "organizationId": "org_abc",
  "type": "reconcile"
}
```

But there is a critical rule:

> The job carries organization identity, not arbitrary database
> credentials.

The tracker says workers accept organization identity and resolve the
registry/database through trusted server-side infrastructure.

They do not accept a connection string supplied in the job.

------------------------------------------------------------------------

# 16. Why Not Put `databaseUrl` in the Job?

Bad:

``` json
{
  "databaseUrl": "postgres://..."
}
```

Now the queue payload becomes a database selector and secret carrier.

Problems:

``` text
forged jobs
credential exposure
stale credentials
rotation complexity
logging leaks
arbitrary DB access
```

Better:

``` text
organizationId
→ Control Plane registry
→ TenantDatabaseManager
→ trusted connection
```

------------------------------------------------------------------------

# 17. Worker Flow

``` text
BullMQ receives job
      ↓
read organizationId
      ↓
validate tenant registry record
      ↓
TenantFanoutService / trusted resolver
      ↓
TenantDatabaseManager
      ↓
establish tenant execution context
      ↓
run business operation
```

This recreates the tenant boundary for asynchronous work.

------------------------------------------------------------------------

# 18. Tenant-Scoped Job IDs

Suppose:

``` text
ABC:
reconcile job 2026-09-09

Perfect:
reconcile job 2026-09-09
```

Bad ID:

``` text
reconcile:2026-09-09
```

BullMQ deduplication could treat them as the same job.

The tracker says tenant-bearing producers use prefixes like:

``` text
t:{organizationId}:...
```

So both jobs can coexist.

------------------------------------------------------------------------

# 19. Global Jobs Can Still Exist

Not every job belongs to one tenant.

Example:

``` text
platform sweep
```

may intentionally be global.

It can then fan out:

``` text
global scheduler
    ↓
discover READY tenants
    ↓
ABC work
Perfect work
Baby work
```

The tracker explicitly distinguishes tenant-bearing queue jobs from
intentionally platform-wide sweep jobs.

------------------------------------------------------------------------

# 20. Tenant Fan-Out

Conceptually:

``` text
Scheduled Reconciliation
        ↓
TenantFanoutService
        ↓
┌────────────┬────────────┬────────────┐
ABC          Perfect      Baby
↓            ↓            ↓
ABC DB       Perfect DB   Baby DB
```

Each tenant execution becomes an isolated unit.

------------------------------------------------------------------------

# 21. Failure Isolation

Suppose:

``` text
ABC DB unavailable
Perfect DB healthy
Baby DB healthy
```

Bad loop:

``` text
ABC throws
→ whole sweep stops
```

Better:

``` text
ABC → failure evidence
Perfect → continue
Baby → continue
```

The tracker says `forEachTenant` isolates per-organization failures and
tests this behavior.

------------------------------------------------------------------------

# 22. Why Failure Isolation Matters

A SaaS platform can have:

``` text
50 tenants
500 tenants
5,000 tenants
```

One tenant may temporarily have:

``` text
database issue
provider issue
bad configuration
migration problem
```

A platform-wide worker should not unnecessarily punish all healthy
tenants.

This is **blast-radius control**.

------------------------------------------------------------------------

# 23. Dead-Letter Evidence

Sometimes a job keeps failing.

Production systems need evidence:

``` text
which tenant?
which job?
how many retries?
why?
when?
can operator retry?
```

The supplied tracker marks dead-letter/failure evidence as **partial**.

Per-tenant sweep failure evidence exists, but the broader BullMQ
dead-letter retention policy remains pending.

------------------------------------------------------------------------

# 24. Per-Tenant Operational Metrics

The checklist marks bounded per-tenant operational metrics complete at the
application boundary. Durable external metrics storage and provider routing
remain deployment concerns.

Current fan-out outcomes expose useful values such as:

``` text
processed
tenantFailures
```

Durable external metrics storage and notification routing remain deployment
work, but the bounded application metrics control is checked.

Again:

``` text
working behavior
≠
complete production observability
```

------------------------------------------------------------------------

# 25. WebSockets

HTTP is:

``` text
request
→ response
→ connection may end
```

WebSockets are long-lived:

``` text
client
⇄
server
⇄
client
```

Ferio uses realtime behavior for things such as:

``` text
chat
notifications
admin channels
rider live map
```

A socket can stay connected for a long time.

So tenant identity must be bound during socket authentication.

------------------------------------------------------------------------

# 26. Socket Ticket

The tracker says authenticated socket tickets are minted inside
tenant-resolved requests and carry the resolved `organizationId`.

Conceptually:

``` text
ABC browser
   ↓ HTTP
trusted ABC TenantContext
   ↓
issue signed socket ticket
   ↓
connect WebSocket
   ↓
server verifies ticket
   ↓
socket bound to ABC
```

The client does not get to switch organizations merely by naming another
room later.

------------------------------------------------------------------------

# 27. Tenant-Scoped Rooms

Bad:

``` text
user:42
admin
conversation:123
delivery-live-map
```

If both tenants share identifiers, events can cross.

Conceptually safe:

``` text
org:abc:user:42
org:perfect:user:42

org:abc:conversation:123
org:perfect:conversation:123
```

Ferio uses an organization-scoping helper for rooms.

------------------------------------------------------------------------

# 28. Admin Chat Isolation

Imagine both organizations have:

``` text
ADMIN userId = 7
```

A notification to:

``` text
user:7
```

must not reach both.

The tracker says tenant-bound admin sockets join only
organization-prefixed role/admin rooms and message relay uses
sender-scoped admin rooms.

------------------------------------------------------------------------

# 29. Rider Live Map

Rider location is highly tenant-sensitive.

Flow:

``` text
rider GPS update
   ↓
persist in tenant DB
   ↓
emit realtime event
   ↓
tenant-scoped admin live-map room
```

Important ordering idea:

> Do not broadcast a location as successful before the tenant-local
> persistence operation has succeeded, unless the architecture
> explicitly defines otherwise.

The tracker says rider location updates emit after tenant-local
persistence succeeds.

------------------------------------------------------------------------

# 30. Cross-Tenant Room Join

A malicious client might try:

``` text
join Perfect's conversation room
```

while authenticated to ABC.

Safe design does not trust raw room names supplied by the client as
authority.

The server derives/validates tenant room identity from the socket's
trusted organization binding.

The tracker says foreign organization rooms are unreachable from foreign
tickets.

------------------------------------------------------------------------

# 31. Wire-Level Testing

Helper tests are useful:

``` text
scopedSocketRoom("abc", "user:1")
```

But the strongest proof uses real connected clients.

The tracker says Ferio has a two-tenant WebSocket integration test with
four live clients over a real Socket.IO server.

It verifies actual:

``` text
room membership
notifications
chat relay
foreign guest denial
```

on the wire.

------------------------------------------------------------------------

# 32. Object Storage

Ferio stores media/evidence outside PostgreSQL.

The selected production strategy in the tracker is:

``` text
Cloudflare R2
via S3-compatible API
```

One bucket can physically store many tenants.

So object keys must be namespaced.

------------------------------------------------------------------------

# 33. Tenant Object Keys

The tracker describes:

``` text
tenantObjectKey()
→ tenants/{organizationId}/...
```

Example:

``` text
tenants/org_abc/warranty/evidence.jpg
tenants/org_perfect/warranty/evidence.jpg
```

The organization comes from trusted ambient tenant context, not from
arbitrary client input.

------------------------------------------------------------------------

# 34. Why Object Keys Matter

Imagine both tenants upload:

``` text
logo.png
```

Bad:

``` text
branding/logo.png
```

Last writer wins.

Possible outcomes:

``` text
cross-tenant overwrite
foreign image display
data loss
privacy breach
```

Tenant prefixes prevent logical collision.

------------------------------------------------------------------------

# 35. Private-by-Default Storage

The tracker says R2 buckets are private by default and the strategy does
not use public-read ACLs.

Private content is accessed using signed/presigned URLs where required.

That creates two layers:

``` text
tenant namespace
+
access authorization
```

A tenant prefix alone is not a substitute for object access control.

------------------------------------------------------------------------

# 36. Guessed Paths

Suppose an attacker guesses:

``` text
tenants/org_perfect/warranty/abc.jpg
```

The application should not simply honor that string.

The trusted organization prefix is derived server-side.

And the bucket is private.

So a guessed path is not itself authorization.

------------------------------------------------------------------------

# 37. Presigned URLs

A presigned URL gives temporary permission to access a specific object.

The tracker says Ferio uses S3 request presigning and a configurable
expiry, defaulting to one hour.

Think:

``` text
private object
   ↓
authorized request
   ↓
short-lived signed URL
   ↓
temporary access
```

------------------------------------------------------------------------

# 38. Storage Lifecycle and Export Boundary

The current tracker shows these engineering controls checked:

``` text
✓ Add lifecycle/retention rules
✓ Add tenant export/deletion support
```

for object storage.

Provider-side application/verification and automatic closure orchestration
remain operational follow-up; the application-side lifecycle and
tenant-prefix export/deletion controls are implemented.

------------------------------------------------------------------------

# 39. Upload Validation Is Partial

The tracker says buffered warranty uploads currently enforce:

``` text
size
allowlisted MIME types
JPEG/PNG/WebP signature validation
```

Direct presigned uploads enforce allowed MIME and signed size.

But post-upload inspection/malware scanning is still pending.

Therefore this control is marked **partial**.

------------------------------------------------------------------------

# 40. External Integrations

Tenants may connect external providers.

Examples:

``` text
payment gateway
courier
SMS
WhatsApp
email
future Google/Meta integrations
```

Each tenant may have different credentials.

So provider configuration is tenant-owned secret data.

------------------------------------------------------------------------

# 41. Credential Boundary

The tracker records an accepted current-stage approach:

``` text
AES-256-GCM encryption at rest
+
master key from environment
```

with KMS/Secret Manager migration deferred to production infrastructure.

This means:

``` text
database
→ encrypted credential envelope

environment
→ master key
```

The master key must not be stored beside the ciphertext in the same
database.

------------------------------------------------------------------------

# 42. Why Encrypt Provider Secrets?

Suppose a tenant stores:

``` text
payment store ID
payment secret
courier API key
```

If the database is exposed, plaintext secrets would immediately expose
external accounts.

Encryption at rest reduces that risk.

It does not replace:

``` text
access control
secret rotation
redaction
infrastructure security
```

but it is an important layer.

------------------------------------------------------------------------

# 43. Secrets Must Not Return to Admin UI

An Admin API should not return:

``` json
{
  "secret": "real-secret-value"
}
```

after configuration.

Better response:

``` json
{
  "provider": "example",
  "enabled": true,
  "configured": true,
  "rotatedAt": "..."
}
```

The tracker says provider APIs expose bounded readiness rather than
credentials.

------------------------------------------------------------------------

# 44. Secret Redaction

Secrets must also stay out of:

``` text
logs
health endpoints
audit output
exception messages
webhook diagnostics
```

The tracker says webhook headers are redacted and health tests reject
secret-bearing output.

This is often forgotten.

A perfectly encrypted database is useless if the secret appears in
application logs.

------------------------------------------------------------------------

# 45. Tenant Payment Providers

Commerce payment provider configuration is tenant-local.

Flow:

``` text
ABC checkout
   ↓
ABC TenantContext
   ↓
ABC provider config
   ↓
decrypt inside trusted scope
   ↓
ABC gateway account
```

Perfect's checkout follows the same code but resolves Perfect's
configuration.

------------------------------------------------------------------------

# 46. Tenant Courier Providers

The same rule applies to courier adapters.

The tracker says all six courier adapters and
readiness/recommendation/polling paths use tenant-scoped credentials
with no cross-tenant process fallback.

That is important because a global process-level fallback could
accidentally send Tenant B shipments through Tenant A's courier account.

------------------------------------------------------------------------

# 47. Credential Rotation

Credentials change.

A safe rotation workflow should:

``` text
authenticate operator
authorize permission
validate replacement
encrypt replacement
atomically activate it
record rotation time
audit bounded metadata
never return plaintext
```

The tracker says payment and courier configuration replacement follows
this pattern.

------------------------------------------------------------------------

# 48. Transactional Messaging

Templates are tenant-local.

Provider configuration is also being tenantized.

The tracker marks this area **partial** because configuration
persistence, encryption, redacted management and rotation exist, but
actual SMS/WhatsApp/email adapters are not present in the repository.

Readiness therefore remains fail-closed until an approved adapter
exists.

------------------------------------------------------------------------

# 49. Future Integrations

The tracker says Google/Meta tenant integrations are not
enabled/persisted for Release 1.

That control is treated as not applicable for now and should be reopened
before such an integration path is introduced.

This is good checklist discipline:

> A future feature must not inherit an unreviewed security assumption.

------------------------------------------------------------------------

# 50. Readiness Without Secrets

Operations need to know:

``` text
Is payment configured?
Is courier configured?
Is the queue healthy?
Is a provider ready?
```

They do not need:

``` text
the raw password
the API secret
the encryption key
```

So health/readiness endpoints should return bounded metadata.

------------------------------------------------------------------------

# 51. HTTP vs Background vs Realtime

Compare the three trust paths.

### HTTP

``` text
Host
→ TenantResolver
→ TenantContext
→ TenantDb
```

### BullMQ

``` text
trusted job organizationId
→ registry validation
→ TenantContext
→ TenantDb
```

### WebSocket

``` text
tenant-resolved HTTP ticket issuance
→ signed socket ticket
→ verified organization binding
→ tenant-scoped rooms
```

Different entry points.

Same isolation principle.

------------------------------------------------------------------------

# 52. Object Storage Trust Path

``` text
tenant-resolved operation
→ trusted TenantContext
→ tenantObjectKey
→ tenants/{organizationId}/...
→ private R2 object
```

Never:

``` text
browser sends organizationId
→ concatenate path
```

------------------------------------------------------------------------

# 53. Provider Trust Path

``` text
tenant operation
→ TenantContext
→ tenant DB
→ encrypted provider config
→ decrypt in trusted scope
→ adapter
```

Never:

``` text
browser sends merchant secret
→ server uses it directly for arbitrary provider action
```

------------------------------------------------------------------------

# 54. Namespace Formula

A useful mental formula is:

``` text
TENANT RESOURCE KEY
=
trusted tenant identity
+
resource type
+
resource identity
```

Examples:

``` text
Redis:
org + setting type

BullMQ:
org + job purpose + logical ID

WebSocket:
org + room type + room ID

Object:
org + object category + object path
```

------------------------------------------------------------------------

# 55. Namespacing Is Not Authorization

Very important:

``` text
org_abc:order:123
```

is a namespace.

It does not prove the caller is authorized.

You still need:

``` text
trusted tenant context
authentication
membership/ownership
permission
```

Namespacing prevents collisions.

Authorization controls access.

------------------------------------------------------------------------

# 56. Tenant ID in a Job Is Not Automatically Trusted

A queue payload can be malformed or poisoned.

The worker should not assume:

``` text
organizationId exists
→ therefore valid
```

The tracker says workers validate tenant registry state before database
access.

So:

``` text
job org ID
→ registry
→ valid tenant?
→ compatible DB?
→ then execute
```

------------------------------------------------------------------------

# 57. Stale Jobs

Imagine a job was created when:

``` text
organization = ACTIVE
```

but runs later after:

``` text
organization = suspended/closed
```

A senior design asks:

``` text
Should this job still run?
Should it be skipped?
Should cleanup still run?
Which tenant states are eligible?
```

The answer depends on job semantics.

Do not blindly treat enqueue-time state as forever valid.

------------------------------------------------------------------------

# 58. Retries

Retries are normal in distributed systems.

But retry means:

``` text
same logical work may execute more than once
```

So jobs should be designed with idempotency where necessary.

Tenant identity must be part of the idempotency scope.

------------------------------------------------------------------------

# 59. Example --- Courier Polling

``` text
global schedule
   ↓
discover eligible tenants
   ↓
enqueue org_abc courier poll
enqueue org_perfect courier poll
   ↓
workers
   ↓
resolve each tenant
   ↓
load tenant courier config
   ↓
call correct provider account
```

If ABC fails:

``` text
record ABC failure
continue Perfect
```

------------------------------------------------------------------------

# 60. Example --- Transactional Message

``` text
ABC order placed
   ↓
ABC outbox record
   ↓
tenant-scoped job
   ↓
worker resolves ABC
   ↓
ABC template/provider
   ↓
send
```

Perfect's template must never be used.

------------------------------------------------------------------------

# 61. Example --- Realtime Notification

``` text
ABC customer event
   ↓
persist ABC notification
   ↓
SocketGateway
   ↓
org_abc:user:42
```

Even if Perfect also has:

``` text
userId = 42
```

Perfect receives nothing.

------------------------------------------------------------------------

# 62. Example --- Warranty Image

``` text
ABC customer uploads evidence
   ↓
trusted ABC context
   ↓
tenants/org_abc/warranty/...
   ↓
private R2
```

Perfect cannot obtain it merely by guessing the logical filename.

------------------------------------------------------------------------

# 63. Example --- Redis Settings

``` text
ABC:
settings:org_abc:PUBLIC

Perfect:
settings:org_perfect:PUBLIC
```

Same setting type.

Different namespace.

No collision.

------------------------------------------------------------------------

# 64. Example --- Distributed Lock

Suppose later Ferio has:

``` text
lock:inventory:{sku}
```

and both tenants have SKU `BLACK-M`.

Without tenant scope:

``` text
ABC lock
blocks
Perfect operation
```

A tenant-aware lock avoids accidental cross-tenant contention.

The tracker marks distributed-lock scoping complete: PostgreSQL advisory-lock
keys include the trusted organization identity, with identical participants
proven to receive different keys under two tenant contexts.

------------------------------------------------------------------------

# 65. Cache Stampede

Imagine a popular setting expires simultaneously for many requests.

All requests miss cache and hit the database.

This is a cache stampede.

Possible techniques include:

``` text
short lock
single-flight
jittered TTL
stale-while-revalidate
```

But any lock/single-flight identity must preserve tenant scope.

Otherwise one tenant's refresh can interfere with another's.

This is a senior operational concern, not a claim that Ferio currently
implements all of these techniques.

------------------------------------------------------------------------

# 66. Noisy Neighbor

Shared infrastructure creates a noisy-neighbor risk.

Example:

``` text
Tenant A generates huge queue traffic
```

Could Tenant B's jobs be delayed?

Potential controls include:

``` text
bounded concurrency
fair scheduling
per-tenant quotas
queue partitioning
rate limits
metrics
```

The supplied tracker does not claim all of these are implemented.

They are production design concerns to keep in mind as tenant count
grows.

------------------------------------------------------------------------

# 67. Queue Poisoning

A malformed job should not be able to say:

``` text
"Connect to this database URL."
```

or:

``` text
"Use these credentials."
```

Workers should accept bounded identifiers and recover authoritative
metadata from trusted sources.

This reduces the power of a poisoned queue payload.

------------------------------------------------------------------------

# 68. Socket Reconnection

Sockets disconnect.

Clients reconnect.

A reconnect must re-establish trusted tenant authentication.

Do not rely on:

``` text
"this connection used to be ABC"
```

after creating a new socket.

The signed ticket/session is the trust input for the new connection.

------------------------------------------------------------------------

# 69. Domain Change and Sockets

Suppose an organization's domain configuration changes.

Existing sockets may still be connected.

A senior system design must define:

``` text
ticket TTL
session revocation
membership changes
support grant expiry
organization suspension
```

and how quickly realtime access reflects them.

The supplied MT-8 tracker proves tenant binding and room isolation;
broader revocation timing should be inspected in the relevant
auth/session design.

------------------------------------------------------------------------

# 70. Files Are Data Too

Developers sometimes protect database rows carefully and treat files as
harmless.

But files can contain:

``` text
warranty evidence
invoices
identity evidence
product media
exports
private attachments
```

Object storage must receive the same tenant-isolation attention as
PostgreSQL.

------------------------------------------------------------------------

# 71. Secrets Are Data Too

Provider credentials are tenant-owned data.

Cross-tenant credential leakage can be worse than leaking a product
record.

It could allow:

``` text
unauthorized payment actions
courier bookings
message sending
account compromise
financial loss
```

So secret isolation is part of tenant isolation.

------------------------------------------------------------------------

# 72. Operational Evidence Must Be Tenant-Aware

When a background task fails, logs should tell operators:

``` text
organization
job type
correlation/job ID
safe provider identity
attempt count
bounded error
```

without exposing secrets.

Otherwise diagnosing one tenant in a shared worker becomes extremely
difficult.

------------------------------------------------------------------------

# 73. MT-8 Gate

The supplied tracker marks the main MT-8 isolation gate complete:

``` text
✓ Identical Redis/job/socket/object identifiers
  in two tenants cannot collide.

✓ Background and realtime paths meet
  the same isolation standard as HTTP.
```

That is a major milestone.

But several detailed operational controls remain open/partial, including
Redis inventory, durable dead-letter policy, malware/quarantine deployment,
and full messaging adapter readiness. Bounded application metrics,
distributed locks, and storage lifecycle/export controls are checked, with
external metrics/provider operations remaining deployment-owned.

------------------------------------------------------------------------

# 74. Testing --- Redis

Use:

``` text
same logical identifier
same resource type
different organizations
```

Assert:

``` text
key A != key B
```

Then verify reading A cannot return B.

------------------------------------------------------------------------

# 75. Testing --- BullMQ

Create:

``` text
ABC job with logical ID X
Perfect job with logical ID X
```

Verify:

``` text
different job IDs
different tenant DB resolution
both can execute
```

Then inject an ABC failure.

Verify Perfect still completes.

------------------------------------------------------------------------

# 76. Testing --- Forged Job

Try:

``` text
unknown organizationId
retired tenant
malformed payload
arbitrary database URL field
```

Expected:

``` text
fail closed
no arbitrary DB access
bounded failure evidence
```

------------------------------------------------------------------------

# 77. Testing --- WebSocket

Connect:

``` text
ABC admin user 42
Perfect admin user 42
```

Emit ABC notification.

Expected:

``` text
ABC receives
Perfect does not
```

Then attempt a foreign room join.

Expected:

``` text
denied/unreachable
```

------------------------------------------------------------------------

# 78. Testing --- Object Storage

Use the same logical object path:

``` text
warranty/evidence.jpg
```

under two tenant contexts.

Expected:

``` text
tenants/org_abc/warranty/evidence.jpg
!=
tenants/org_perfect/warranty/evidence.jpg
```

Also verify raw foreign prefixes cannot be selected by client input.

------------------------------------------------------------------------

# 79. Testing --- Credentials

Create different provider configs:

``` text
ABC → credential A
Perfect → credential B
```

Verify:

``` text
ABC operation uses A
Perfect operation uses B
API never returns either plaintext secret
logs contain neither
```

------------------------------------------------------------------------

# 80. Testing --- Rotation

Rotate ABC credentials.

Verify:

``` text
ABC new credentials active
ABC old ciphertext replaced according to workflow
rotation timestamp updated
Perfect untouched
audit contains bounded metadata
plaintext absent
```

------------------------------------------------------------------------

# 81. Educational Redis Helper

Teaching pseudocode:

``` ts
function tenantKey(
  organizationId: string,
  resource: string,
  id: string,
) {
  return `t:${organizationId}:${resource}:${id}`;
}
```

In production, organization identity should come from trusted context
rather than arbitrary browser input.

------------------------------------------------------------------------

# 82. Educational BullMQ Producer

``` ts
const ctx = requireTenantContext();

await queue.add(
  "reconcile",
  {
    organizationId: ctx.organizationId,
  },
  {
    jobId: `t:${ctx.organizationId}:reconcile:${period}`,
  },
);
```

The organization is captured from trusted execution context at enqueue
time.

------------------------------------------------------------------------

# 83. Educational Worker

``` ts
async function process(job: Job<TenantJob>) {
  const organization = await registry.requireRunnable(
    job.data.organizationId,
  );

  return tenantRunner.forOrganization(
    organization.id,
    async () => {
      await reconciliation.run();
    },
  );
}
```

Notice:

``` text
job gives organization identity
registry validates it
server resolves database
```

The job does not give a database password.

------------------------------------------------------------------------

# 84. Educational Socket Flow

``` ts
const claims = socketTicket.verify(token);

socket.data.organizationId = claims.organizationId;

socket.join(
  scopedSocketRoom(
    claims.organizationId,
    `user:${claims.userId}`,
  ),
);
```

Again, teaching pseudocode---not exact Ferio source.

------------------------------------------------------------------------

# 85. Educational Object Key

``` ts
function tenantObjectKey(
  ctx: TenantContext,
  logicalPath: string,
) {
  return `tenants/${ctx.organizationId}/${logicalPath}`;
}
```

Do not accept:

``` ts
tenantObjectKey(req.body.organizationId, path)
```

as the trust model.

------------------------------------------------------------------------

# 86. Educational Credential Adapter

``` text
TenantContext
   ↓
tenant DB provider config
   ↓
decrypt secret
   ↓
construct provider adapter
   ↓
perform bounded operation
   ↓
discard plaintext from normal application output
```

Keep the decrypted secret's exposure window as small as practical.

------------------------------------------------------------------------

# 87. Senior Review Questions

When reviewing shared infrastructure, ask:

``` text
1. Is this state tenant-owned or platform-owned?
2. Where does trusted organization identity come from?
3. Can two tenants use the same logical ID safely?
4. Can a client choose the namespace?
5. Can a job choose a DB URL?
6. What happens after the HTTP context disappears?
7. Is worker tenant state revalidated?
8. Can one tenant failure block others?
9. Are retries idempotent?
10. Are WebSocket rooms tenant-bound?
11. Are files tenant-prefixed and private?
12. Are secrets encrypted and redacted?
13. Can credentials rotate?
14. Are logs tenant-aware but secret-safe?
15. Is there a real two-tenant negative test?
```

------------------------------------------------------------------------

# 88. Common Bad Designs

``` text
❌ settings:PUBLIC shared by every tenant

❌ jobId = reconcile:123 without tenant scope

❌ queue payload contains arbitrary databaseUrl

❌ worker assumes HTTP AsyncLocalStorage still exists

❌ one tenant failure aborts every tenant sweep

❌ WebSocket room = user:42 globally

❌ browser chooses organization room name

❌ object key = uploads/logo.png globally

❌ public bucket for private evidence

❌ API returns stored provider secrets

❌ secrets appear in logs

❌ global courier credentials used as fallback

❌ tenant-specific abuse controls confused with platform-global rate limiting

❌ assuming namespacing alone is authorization
```

------------------------------------------------------------------------

# 89. Explain It Like You Are Five

> Ferio has shared helpers like a message box, a job machine, a live
> telephone system and a file cupboard. Many shops use the same helpers.
> So every shop's thing needs a trusted label. ABC's job says ABC, ABC's
> chat room says ABC, ABC's file path says ABC, and ABC's provider
> secret comes from ABC's private records. If the original web request
> disappears, the trusted label must still travel with the work.

------------------------------------------------------------------------

# 90. Junior Engineer Answer

> MT-8 extends tenant isolation beyond PostgreSQL. Redis keys, BullMQ
> jobs, WebSocket rooms, object-storage keys and tenant integration
> credentials are scoped using trusted organization identity. Background
> workers re-resolve the tenant instead of trusting arbitrary database
> details, and realtime/socket tickets bind connections to an
> organization.

------------------------------------------------------------------------

# 91. Mid-Level Engineer Answer

> Ferio treats shared infrastructure as multi-tenant execution surfaces.
> Tenant-owned Redis keys and job IDs are namespaced, asynchronous jobs
> carry a bounded organization envelope and rehydrate trusted tenant
> context through the registry, WebSocket authentication binds sockets
> to organization-prefixed rooms, object keys derive from ambient tenant
> context, and provider credentials remain encrypted and tenant-local.
> Global platform concerns such as abuse rate limiting or sweep
> scheduling are explicitly distinguished from tenant state.

------------------------------------------------------------------------

# 92. Senior Engineer Answer

> MT-8 closes the isolation gap created when work leaves the synchronous
> HTTP request lifecycle. It establishes organization identity as
> durable execution metadata across cache, queue, realtime, storage and
> integration boundaries without allowing those payloads to become
> arbitrary database selectors. Workers revalidate tenant registry state
> and resolve databases server-side; tenant-bearing deduplication and
> namespaces prevent cross-organization collisions; fan-out limits blast
> radius; socket tickets establish durable realtime trust; private
> object storage and encrypted provider configuration extend the tenant
> boundary beyond PostgreSQL. Remaining work is predominantly
> operational completeness---inventorying all Redis keys, scoping
> distributed locks, durable DLQ/metrics, storage lifecycle/deletion,
> malware inspection and unfinished messaging adapters.

------------------------------------------------------------------------

# 93. Current MT-8 Status From the Supplied Tracker

### Completed major isolation controls

``` text
✓ tenant-scoped important Redis keys
✓ tenant-scoped idempotency
✓ Redis collision tests
✓ BullMQ queue inventory
✓ trusted organization job envelope
✓ registry validation before worker DB access
✓ worker tenant DB resolution
✓ tenant-scoped job IDs
✓ tenant-scoped scheduled jobs
✓ forged DB URL path prevented
✓ per-tenant worker failure isolation
✓ socket tenant authentication
✓ signed tenant socket binding
✓ tenant-prefixed rooms
✓ tenant-scoped admin chat
✓ tenant-scoped rider live map
✓ tenant-scoped realtime notifications
✓ cross-tenant room rejection
✓ R2 storage strategy
✓ tenant object namespaces
✓ private objects
✓ presigned access
✓ encrypted payment/courier credentials
✓ secret redaction
✓ credential rotation
✓ bounded readiness/health
✓ MT-8 isolation gate
```

### Still open or partial in the supplied tracker

``` text
□ complete Redis key inventory
✓ tenant-scope distributed locks
△ full BullMQ dead-letter retention
✓ bounded per-tenant operational metrics
✓ object-storage lifecycle rules
✓ tenant export/deletion support
△ post-upload inspection/malware scanning
△ complete transactional messaging provider adapters
```

This distinction matters when evaluating whether MT-8 is
production-complete versus architecturally isolated.

------------------------------------------------------------------------

# 94. Your Codebase Exercise

Trace one asynchronous path:

``` text
Order placed
   ↓
transactional message requested
   ↓
outbox
   ↓
BullMQ
   ↓
worker
   ↓
organization registry
   ↓
tenant DB
   ↓
tenant template/provider
   ↓
send
```

Then answer:

``` text
Where is organizationId captured?
Can the browser provide it directly?
What is the BullMQ job ID?
What happens if the tenant is no longer runnable?
Can the job contain a database URL?
How is tenant context re-established?
Which provider configuration is loaded?
Can another tenant use the same logical message ID?
What happens when sending fails?
Can one tenant's failure block the sweep?
Are secrets present in logs?
```

Then trace a WebSocket path:

``` text
HTTP tenant context
→ socket ticket
→ socket authentication
→ organization binding
→ room
→ event
```

Finally trace an object upload:

``` text
tenant request
→ trusted context
→ tenantObjectKey
→ private R2
→ presigned access
```

If you can explain all three, you understand the central purpose of
MT-8.

------------------------------------------------------------------------

# 95. The Sentence to Memorize

> **When work leaves the HTTP request, tenant identity must travel with
> the work as trusted bounded metadata, be revalidated server-side, and
> scope every shared namespace---cache, job, socket, file and
> credential---without ever becoming a client-controlled database
> selector.**

------------------------------------------------------------------------

# 96. Next Document

## Document 09 --- Ferio Platform Admin (MT-9)

Next we move above individual stores and study Ferio's own operator
console:

``` text
platform dashboard
organization lifecycle
plan administration
billing operations
provisioning retry
tenant migration control
database/domain health
closure/export
support access
auditing
```

The central question will be:

> **How can Ferio's own operators manage thousands of tenants without
> becoming unrestricted superusers of every tenant's private data?**

------------------------------------------------------------------------

**End of Document 08**
