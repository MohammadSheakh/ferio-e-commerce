# Ferio Engineering Learning Series

## Document 03 --- Tenant Database Router, Prisma Client Lifecycle & Connection Management

**Level:** Child-simple explanation → senior/industry-level engineering\
**Project:** Ferio Commerce SaaS\
**Focus:** What happens after Ferio already knows `TenantContext = ABC`:
how it safely gets a Prisma/PostgreSQL connection for ABC without
exhausting the server or accidentally using another tenant's database.

------------------------------------------------------------------------

# 1. The Question This Lesson Answers

Document 02 ended here:

``` text
Request: abc.ferio.com
        ↓
Trusted tenant resolution
        ↓
TenantContext = ABC
```

Now CatalogService needs products.

The next question is:

> How does Ferio turn `TenantContext = ABC` into a safe database client
> connected to ABC's PostgreSQL database?

The simplified answer:

``` text
TenantContext = ABC
        ↓
TenantDbService
        ↓
trusted TenantDatabase registry
        ↓
TenantDatabaseManager
        ↓
find/reuse/create managed client
        ↓
ABC Prisma client
        ↓
ABC PostgreSQL pool
        ↓
ABC PostgreSQL
```

The difficult part is making this work safely when Ferio has:

``` text
2 tenants
50 tenants
100 tenants
1,000 tenants
many simultaneous requests
some broken databases
limited PostgreSQL connections
```

------------------------------------------------------------------------

# 2. First: What Is Prisma?

Ferio uses PostgreSQL.

Applications could manually send SQL:

``` sql
SELECT * FROM "Product";
```

But Ferio uses Prisma as an application database layer.

Baby version:

> Prisma is a translator/helper between TypeScript code and the
> database.

Conceptually:

``` ts
db.product.findMany()
```

becomes database work roughly equivalent to:

``` sql
SELECT ... FROM "Product";
```

Prisma also helps with:

``` text
typed queries
transactions
schema-generated client APIs
database access
```

Important:

> Prisma is not the database.

``` text
Prisma client
     ↓
PostgreSQL connection/pool
     ↓
PostgreSQL server
```

------------------------------------------------------------------------

# 3. Single-Tenant Prisma Is Easy

In a normal single-business application, you might have:

``` text
NestJS
   ↓
PrismaService
   ↓
one DATABASE_URL
   ↓
one PostgreSQL database
```

Every service can use the same database.

Example:

``` ts
this.prisma.product.findMany()
```

There is no routing question because there is only one operational
database.

------------------------------------------------------------------------

# 4. Ferio Changes the Problem

Ferio's target is:

``` text
ABC        → ABC DB
Perfect    → Perfect DB
Baby Shop  → Baby DB
...
```

Now one global operational Prisma client cannot represent all tenants.

If:

``` text
PrismaService → ABC DB
```

then Perfect requests cannot use it.

If:

``` text
PrismaService → old/default DB
```

then tenant requests must never silently fall through to it.

Ferio therefore needs a **tenant database router/manager**.

------------------------------------------------------------------------

# 5. The Hotel-Key Analogy

Imagine a hotel.

The receptionist already verified:

``` text
Guest belongs to Room 307
```

That is like:

``` text
TenantContext = ABC
```

Now the guest needs a key.

The hotel does not let the guest say:

> "Actually give me the master key for Room 900."

Instead:

``` text
trusted booking record
       ↓
key-management system
       ↓
correct room key
```

Ferio:

``` text
trusted TenantContext
       ↓
TenantDbService
       ↓
TenantDatabaseManager
       ↓
correct tenant DB client
```

------------------------------------------------------------------------

# 6. TenantDbService --- The Application Boundary

Application code should not know all the machinery required to:

``` text
decrypt credentials
manage clients
evict idle clients
handle capacity
open circuit breakers
create pools
disconnect pools
```

CatalogService should basically need:

> Give me the database for my current trusted tenant.

That is the role of the tenant-aware application boundary.

Conceptually:

``` ts
const db = await this.tenantDb.resolveTenantDatabase();
return db.product.findMany();
```

This code is simplified teaching code.

The project tracker says active commerce services use `TenantDbService`,
`resolveTenantDatabase()` or local `db()` helpers as the shared
tenant-aware boundary.

------------------------------------------------------------------------

# 7. Where Does the Database Identity Come From?

Not here:

``` text
request.body.databaseUrl
```

Not here:

``` text
request.query.tenantId
```

Not here:

``` text
random X-Database header
```

Instead:

``` text
trusted TenantContext
        ↓
TenantDatabase registry identity
        ↓
Control Plane metadata
```

The tracker explicitly says database connection material is resolved
only from trusted `TenantDatabase` Control Plane metadata.

------------------------------------------------------------------------

# 8. TenantDatabase Registry

The Control Plane keeps metadata describing a tenant's operational
database.

Conceptually:

``` text
TenantDatabase
-------------------------
id
organizationId
status/readiness
schemaVersion
encrypted connection material
...
```

The exact schema should be read from the real Control Plane Prisma model
when coding.

The mental model is:

> The registry is Ferio's authoritative server-side record of where a
> tenant database is and whether it is usable.

------------------------------------------------------------------------

# 9. Why Store Credentials Encrypted?

A PostgreSQL connection normally requires sensitive material such as:

``` text
host
database
username
password
```

If the database containing tenant registry information were exposed,
plain-text passwords would make the damage much worse.

Ferio's tracker says tenant DB credentials are stored using an
AES-256-GCM encrypted envelope.

Conceptually:

``` text
Control Plane
     |
     | stores
     v
encrypted credential blob

TenantDatabaseManager needs connection
     |
     v
decrypt only at trusted pool-construction boundary
     |
     v
construct DB client
```

------------------------------------------------------------------------

# 10. Encryption at Rest Does Not Mean "Safe Everywhere"

Suppose a credential is encrypted in PostgreSQL.

Good.

But then code does:

``` ts
console.log(decryptedPassword);
```

Security is gone.

Or an exception says:

``` text
Failed connecting to postgres://admin:SECRET@...
```

Again: leak.

The tracker explicitly says decrypted credentials are scoped to pool
construction and excluded from normal structured errors/logs.

Senior rule:

> Secret protection is about the entire secret lifecycle, not only how
> the value is stored.

------------------------------------------------------------------------

# 11. The Encryption Key Must Be Separate

Conceptually:

``` text
Database:
encrypted secret

Environment / secret manager:
master encryption key
```

If you store:

``` text
encrypted password
+
master key
```

in the exact same unprotected place, the protection becomes much weaker.

The broader industry principle is:

> Encryption keys should be managed separately from the encrypted data
> and kept outside source code.

The supplied tracker establishes AES-256-GCM at-rest encryption and
scoped decryption; exact production key-management infrastructure
remains an operational/deployment concern.

------------------------------------------------------------------------

# 12. What Is a Database Connection?

Baby analogy:

> A database connection is an open phone call between the application
> and PostgreSQL.

Opening a new phone call has a cost.

If every tiny query creates a completely new connection:

``` text
connect
query
disconnect
connect
query
disconnect
```

you waste time and resources.

Applications therefore normally use **connection pools**.

------------------------------------------------------------------------

# 13. What Is a Connection Pool?

Imagine a taxi stand.

Instead of ordering a brand-new taxi factory for every passenger, a
small set of taxis is available and reused.

``` text
PostgreSQL Pool

connection 1
connection 2
connection 3
connection 4
```

Request:

``` text
borrow connection
      ↓
run query
      ↓
return connection to pool
```

The pool controls how many connections may be active.

------------------------------------------------------------------------

# 14. Database-per-Tenant Makes Pooling Harder

Single database:

``` text
one app
  ↓
one pool
  ↓
one DB
```

Database-per-tenant:

``` text
one app
  |
  +→ ABC pool
  |
  +→ Perfect pool
  |
  +→ Baby pool
  |
  +→ Tenant 4 pool
  |
  +→ Tenant 5 pool
  ...
```

If every tenant keeps a large pool permanently open, connection count
can explode.

That is why Ferio needs a bounded client manager.

------------------------------------------------------------------------

# 15. The Dangerous `new PrismaClient()` Per Request Pattern

Imagine:

``` text
1 request  → new PrismaClient()
2 requests → 2 more clients
1000 requests → huge number of clients/connections
```

This can cause:

``` text
memory pressure
too many PostgreSQL connections
slow startup/handshakes
pool exhaustion
unstable latency
database refusal
application failure
```

Ferio explicitly prevents unbounded `new PrismaClient()` per request.

------------------------------------------------------------------------

# 16. One Managed Client Per Registry Identity

Ferio's manager caches tenant clients by trusted registry identity.

Conceptually:

``` text
client cache

DB_REGISTRY_ABC      → ABC client
DB_REGISTRY_PERFECT  → Perfect client
DB_REGISTRY_BABY     → Baby client
```

If another ABC request arrives:

``` text
ABC request
    ↓
manager
    ↓
ABC client already exists
    ↓
reuse
```

This is much cheaper than constructing a new client for every request.

------------------------------------------------------------------------

# 17. Why Key by Registry ID?

Imagine a tenant changes database infrastructure during an operation
such as migration/restore/cutover.

Using an authoritative registry identity gives the manager a stable
server-side routing object rather than trusting arbitrary connection
strings from callers.

The tracker specifically describes LRU-bounded clients keyed by registry
ID.

Baby version:

> Ferio uses its own trusted database card number, not a database
> address written by the customer.

------------------------------------------------------------------------

# 18. What Does "Bounded" Mean?

Bounded means:

> There is a maximum.

Bad:

``` text
cache can grow forever
```

Good:

``` text
maximum active tenant clients = configured limit
```

The tracker names:

``` text
TENANT_DB_MAX_CLIENTS
```

as the reservation/capacity gate.

This protects the application and PostgreSQL from unbounded growth.

------------------------------------------------------------------------

# 19. Example With a Limit of 3

For teaching only, imagine:

``` text
MAX_CLIENTS = 3
```

Current cache:

``` text
ABC
Perfect
Baby
```

Now:

``` text
New Tenant D request
```

The manager cannot simply keep:

``` text
ABC
Perfect
Baby
Tenant D
```

forever if the configured capacity is three.

It needs an eviction/capacity policy.

That leads to LRU.

------------------------------------------------------------------------

# 20. What Is LRU?

LRU means:

> Least Recently Used.

Imagine three chairs:

``` text
ABC      used 1 second ago
Perfect  used 2 minutes ago
Baby     used 20 minutes ago
```

A new tenant needs a chair.

The least recently used candidate is:

``` text
Baby
```

So, when safe under the manager's rules:

``` text
evict Baby client
      ↓
make capacity
      ↓
create/cache Tenant D client
```

Ferio's tracker describes a configurable LRU capacity and deterministic
LRU eviction under load.

------------------------------------------------------------------------

# 21. LRU Is About Resource Management, Not Tenant Deletion

Important:

``` text
evict client ≠ delete tenant
```

Eviction means:

> Close/remove an application's cached DB client because it is not
> currently worth keeping open.

The tenant's PostgreSQL database remains.

Later:

``` text
Baby request arrives
      ↓
manager creates/reacquires Baby client
      ↓
Baby continues
```

------------------------------------------------------------------------

# 22. Idle Eviction

LRU handles pressure.

Idle eviction handles clients that have simply not been used for a
while.

Example:

``` text
ABC client
last used 40 minutes ago
```

If configured idle TTL has passed, the manager can safely retire it
according to its eviction rules.

Conceptually:

``` text
idle client
   ↓
disconnect
   ↓
remove from active cache
   ↓
free resources
```

The tracker describes a bounded sweep with configurable idle TTL and
eviction grace.

------------------------------------------------------------------------

# 23. Why an Eviction Grace?

Imagine a client appears idle but work is still finishing around it.

A careful manager should not rip resources away recklessly.

A grace mechanism helps coordinate safe retirement.

The exact implementation should be read in the source code when you
inspect the manager, but the design intent is:

``` text
identify eviction candidate
      ↓
retire safely
      ↓
disconnect resources
```

rather than:

``` text
delete object immediately regardless of active work
```

------------------------------------------------------------------------

# 24. The Cold vs Warm Client Idea

### Cold

ABC has no cached client.

``` text
ABC request
   ↓
load trusted registry
   ↓
decrypt required connection material
   ↓
construct pool/client
   ↓
connect/validate
   ↓
query
```

### Warm

ABC client already exists.

``` text
ABC request
   ↓
cache hit
   ↓
reuse client
   ↓
query
```

Warm acquisition should generally be much faster.

The project performance evidence records roughly **\~105 ms cold vs \<1
ms warm median** in its local PostgreSQL baseline. That is
test-environment evidence, not a universal production guarantee.

------------------------------------------------------------------------

# 25. Single-Flight Client Creation

Now a tricky concurrency problem.

ABC is cold.

At the exact same moment, 50 ABC requests arrive.

Naive implementation:

``` text
request 1 → create ABC client
request 2 → create ABC client
request 3 → create ABC client
...
request 50 → create ABC client
```

Terrible.

Instead Ferio uses **single-flight creation**.

Conceptually:

``` text
50 ABC requests
       ↓
"ABC creation already in progress?"
       ↓ YES
all wait for same creation promise
       ↓
ONE ABC client
       ↓
all reuse it
```

The tracker says 50 concurrent acquisitions collapse to one active
client in the performance baseline.

------------------------------------------------------------------------

# 26. Why Single-Flight Matters

Without it, cold-start bursts can cause a connection storm.

Example:

``` text
deployment restart
      ↓
popular tenant gets 500 requests
      ↓
500 simultaneous client creations
      ↓
PostgreSQL overwhelmed
```

Single-flight converts:

``` text
many identical creation attempts
```

into:

``` text
one creation
+
many waiters
```

This is a common production concurrency pattern.

------------------------------------------------------------------------

# 27. Acquire Timeout

Suppose every connection in ABC's pool is busy.

A new request needs a connection.

Should it wait forever?

No.

Ferio has a bounded acquisition timeout named:

``` text
TENANT_DB_ACQUIRE_TIMEOUT_MS
```

Conceptually:

``` text
request asks for connection
       ↓
wait up to configured time
       ↓
connection available?
    /             \
  yes              no
   ↓                ↓
query          controlled failure
```

Timeouts prevent infinite waiting and resource pileups.

------------------------------------------------------------------------

# 28. Why Timeouts Are Safety Features

Without a timeout:

``` text
DB becomes slow
      ↓
requests wait
      ↓
more requests arrive
      ↓
more memory held
      ↓
more sockets held
      ↓
server becomes overloaded
      ↓
everything gets worse
```

This is a cascading failure.

Timeouts put a bound on waiting.

Senior principle:

> Every remote/resource acquisition should have a failure budget.

------------------------------------------------------------------------

# 29. Pool Exhaustion

Pool exhaustion means:

> All allowed DB connections are occupied and more work wants one.

Possible causes:

``` text
slow queries
long transactions
too-small pool
traffic spike
database degradation
connection leaks
```

Ferio tracks acquisition failures/pool exhaustion and tests bounded
behavior.

A senior engineer does not immediately solve pool exhaustion by saying:

``` text
increase pool size to 500
```

because PostgreSQL also has limits.

------------------------------------------------------------------------

# 30. Connection Budget

Imagine:

``` text
50 active tenants
×
10 connections per tenant
=
500 possible connections
```

Then add:

``` text
Control Plane connections
legacy/admin connections
migration connections
monitoring
reserved PostgreSQL capacity
multiple application replicas
```

The total can become dangerous.

A **connection budget** asks:

> How many database connections can this deployment safely create in the
> worst expected case?

Conceptually:

``` text
application replicas
×
max cached tenant clients
×
per-client pool size
+
platform pools
+
operational/migration connections
+
safety reserve
≤
database/provider capacity
```

The tracker says Ferio has an automated connection-budget check covering
replica, platform, legacy, tenant-client, pool, reserved and usable
totals.

------------------------------------------------------------------------

# 31. Why Multiple App Replicas Change the Math

Suppose one NestJS instance can cache:

``` text
20 tenant clients
```

and each has:

``` text
5 DB connections
```

One replica:

``` text
20 × 5 = 100
```

Now deploy four backend replicas:

``` text
4 × 20 × 5 = 400
```

Each process has its own in-memory client cache.

So production sizing cannot look only at one Node.js process.

------------------------------------------------------------------------

# 32. What Is a Circuit Breaker?

Imagine a broken elevator.

Without a circuit breaker:

``` text
person 1 presses button → waits → fails
person 2 presses button → waits → fails
person 3 presses button → waits → fails
...
```

The building keeps wasting time trying the known-broken elevator.

A circuit breaker says:

``` text
We have seen enough failures.
Temporarily stop trying.
Fail fast.
Try again after cooldown.
```

Ferio uses a **per-database circuit breaker**.

------------------------------------------------------------------------

# 33. Circuit Breaker States --- Mental Model

A common conceptual model is:

``` text
CLOSED
  |
  | repeated failures
  v
OPEN
  |
  | cooldown
  v
recovery attempt
  |
  +→ success → CLOSED
  |
  +→ failure → OPEN again
```

The exact internal state names may differ.

The supplied tracker guarantees the behavior:

``` text
bounded acquisition failures
→ per-registry circuit opens
→ cooldown/backoff
→ fail-fast until recovery
```

------------------------------------------------------------------------

# 34. Why Per-Tenant Circuit Breaker?

Suppose Perfect's DB is broken.

Bad global breaker:

``` text
Perfect fails
    ↓
all tenant DB access disabled
```

Better:

``` text
Perfect circuit → OPEN
ABC circuit     → healthy
Baby circuit    → healthy
```

Then:

``` text
Perfect requests fail fast
ABC continues
Baby continues
```

This limits blast radius.

------------------------------------------------------------------------

# 35. Fail Fast Is Sometimes Better

Without breaker:

``` text
Perfect request
   ↓
wait 5 sec
   ↓
fail

next Perfect request
   ↓
wait 5 sec
   ↓
fail
```

With an open breaker:

``` text
Perfect request
   ↓
known unhealthy right now
   ↓
fail quickly
```

Benefits:

``` text
less resource consumption
lower queue buildup
less pressure on failing DB
faster predictable error
healthier tenants protected
```

------------------------------------------------------------------------

# 36. Backoff

If a database is unhealthy, retrying continuously can make things worse.

Backoff means:

``` text
failure
  ↓
wait
  ↓
retry
  ↓
if still failing, wait according to policy
```

The purpose is to avoid hammering an unhealthy dependency.

Ferio's tracker describes cooldown/backoff around the per-registry
breaker.

------------------------------------------------------------------------

# 37. One Broken Tenant Must Not Route to Another

This is non-negotiable.

Suppose:

``` text
TenantContext = PERFECT
Perfect DB = DOWN
```

Never:

``` text
Perfect DB unavailable
      ↓
ABC client is healthy
      ↓
use ABC
```

Correct:

``` text
Perfect DB unavailable
      ↓
Perfect operation fails
```

The isolation suite explicitly tests that a tenant DB outage does not
route work to another tenant.

------------------------------------------------------------------------

# 38. One Broken Tenant Should Not Crash Healthy Traffic

Security is not the only goal.

We also want failure isolation.

``` text
Perfect DB down
```

should ideally become:

``` text
Perfect degraded
```

not:

``` text
whole Ferio backend dead
```

The tracker includes fan-out tests showing healthy tenant work continues
when another tenant's connection fails.

This is **blast-radius control**.

------------------------------------------------------------------------

# 39. Transactions Must Stay on One Tenant Client

Imagine an order transaction:

``` text
create order
reserve stock
write movement
```

It must run inside ABC's database transaction.

Bad conceptual flow:

``` text
start transaction on ABC
       ↓
nested service silently gets Perfect client
       ↓
write elsewhere
```

That would destroy consistency and isolation.

Ferio requires tenant feature transactions to enter through the resolved
tenant client and nested services not to silently acquire a different
tenant client.

------------------------------------------------------------------------

# 40. Simplified Transaction Example

Conceptually:

``` ts
const db = await this.db();

await db.$transaction(async (tx) => {
  await tx.order.create(...);
  await tx.inventoryReservation.create(...);
});
```

The important point:

``` text
db = ABC client
tx = transaction inside ABC DB
```

Everything in that transaction stays within the same database boundary.

This is simplified teaching code, not source code copied from Ferio.

------------------------------------------------------------------------

# 41. Rollback Is Tenant-Local

Suppose ABC transaction:

``` text
create order
reserve inventory
```

fails halfway.

PostgreSQL rolls back ABC's transaction.

Perfect's independent database should remain untouched.

The project integration suite explicitly forces rollback in tenant A and
verifies tenant B remains unchanged.

This is a concrete benefit of the database-per-tenant boundary.

------------------------------------------------------------------------

# 42. Cross-Plane Work Is NOT One ACID Transaction

Now suppose provisioning does:

``` text
Control Plane:
create organization

Tenant infrastructure:
create DB

Tenant DB:
run migrations
```

You cannot pretend:

``` text
BEGIN
  write Control Plane
  create external DB
  migrate tenant DB
COMMIT
```

is one ordinary PostgreSQL ACID transaction.

These operations cross databases/infrastructure boundaries.

Ferio therefore uses recorded workflow/state-machine/replay/compensation
patterns for cross-plane workflows such as provisioning.

------------------------------------------------------------------------

# 43. ACID --- Tiny Refresher

ACID is a group of transaction properties.

For this lesson, the simple idea is:

> A normal database transaction gives strong all-or-nothing behavior
> inside its database boundary.

Example:

``` text
ABC PostgreSQL transaction
```

can protect related ABC writes.

But:

``` text
Control Plane DB
+
ABC DB
+
Cloud provider API
```

do not automatically become one transaction just because they are called
from one NestJS function.

------------------------------------------------------------------------

# 44. The Legacy Prisma Client Problem

Ferio began as a single-business system.

That means old code may have assumed:

``` text
this.prisma
```

always points to the correct operational DB.

During SaaS migration, that assumption becomes dangerous.

The tracker says tenant-scoped request paths have been moved away from
direct singleton tenant Prisma usage, with architecture checks guarding
the boundary.

A legacy compatibility client may still exist for explicitly allowed
migration/non-production-tenancy paths, but it must not silently become
the tenant selector.

------------------------------------------------------------------------

# 45. Architecture Checks as Guardrails

Humans make mistakes.

A future developer might write:

``` ts
this.prisma.order.findMany()
```

inside a tenant service without realizing they bypassed tenant routing.

Ferio uses an `architecture:check` boundary to detect prohibited direct
singleton patterns in tenant paths.

This is valuable because architecture is stronger when it is:

``` text
documented
+
tested
+
automatically enforced
```

rather than:

``` text
"Please remember this rule."
```

------------------------------------------------------------------------

# 46. Graceful Shutdown

Suppose you deploy a new backend version.

The old NestJS process receives a shutdown signal.

Bad:

``` text
process dies immediately
```

while DB clients/connections are still active.

Ferio's manager implements `OnModuleDestroy` behavior that drains
in-progress creations and disconnects pools.

Conceptually:

``` text
shutdown requested
      ↓
stop/finish relevant client creation work
      ↓
disconnect tenant pools
      ↓
exit cleanly
```

This reduces resource leaks and messy deployment behavior.

------------------------------------------------------------------------

# 47. Metrics

If the manager is important, operations must be able to observe it.

The tracker says it exposes/records metrics around:

``` text
active clients
evictions
acquisition failures
pool exhaustion
```

Why?

Because without metrics you may only learn about capacity problems when
customers complain.

Example questions:

``` text
Are we constantly at TENANT_DB_MAX_CLIENTS?
Are clients churning?
Are cold acquisitions slow?
Which tenant DB is failing?
Are pools exhausting?
```

------------------------------------------------------------------------

# 48. Client Churn

Imagine capacity is very small but active tenants are many.

Requests:

``` text
A B C D A B C D A B C D
```

with only two cached clients.

The manager may repeatedly:

``` text
create
evict
create
evict
```

This is **churn**.

Even though memory stays bounded, performance may suffer.

So:

> bounded does not automatically mean well-sized.

Metrics and load tests tell you whether the bound is appropriate.

------------------------------------------------------------------------

# 49. What Is PgBouncer?

PgBouncer is a PostgreSQL connection pooler.

Baby version:

> It is a traffic manager between applications and PostgreSQL
> connections.

Conceptually:

``` text
many app-side connection demands
        ↓
PgBouncer
        ↓
controlled PostgreSQL server connections
```

Ferio's ADR keeps the bounded LRU manager as the default and defines an
escalation path toward PgBouncer/managed pooling if tenant scale
requires it.

------------------------------------------------------------------------

# 50. Why Not Add PgBouncer Immediately?

More infrastructure is not automatically better.

It introduces:

``` text
deployment complexity
configuration
monitoring
transaction/session behavior constraints
operational knowledge
failure modes
```

A sensible architecture can say:

``` text
current bounded manager is enough for now

IF measured connection budget/scale crosses threshold
THEN introduce stronger pooling infrastructure
```

That is evidence-driven scaling.

------------------------------------------------------------------------

# 51. Transaction Pooling Has Tradeoffs

PgBouncer can operate in modes such as transaction pooling.

The important concept:

> A server connection may be assigned only for the duration of a
> transaction rather than permanently belonging to one application
> session.

This improves connection efficiency, but some session-dependent
PostgreSQL behavior can become incompatible or require special handling.

The Ferio ADR therefore tracks transaction-pooling constraints and
direct-session exceptions for migrations/operations.

You do not need to memorize every PgBouncer rule yet.

------------------------------------------------------------------------

# 52. Migrations Are Different From Normal Requests

Normal commerce request:

``` text
get products
create order
update inventory
```

Migration:

``` text
ALTER TABLE ...
CREATE INDEX ...
apply schema artifact
```

Migrations are operationally special.

They may need:

``` text
different connection behavior
longer-running operations
exclusive locks
direct sessions
careful rollout
```

That is one reason Ferio separates tenant fleet migration orchestration
from ordinary request-time DB routing.

------------------------------------------------------------------------

# 53. Schema Version Matters

ABC DB and Perfect DB are separate.

During fleet migration, they may temporarily be at different rollout
states.

Example:

``` text
ABC      schema v20
Perfect  schema v19
Baby     schema v20
```

The application must not blindly use an incompatible tenant database.

The broader project includes tenant schema readiness/version tracking
and rejects/isolate incompatible tenants before unsafe request routing.

Document 10/11 will go deeply into fleet migrations.

------------------------------------------------------------------------

# 54. Database Readiness

Before a tenant database is considered ready, Ferio's provisioning
workflow includes checks such as:

``` text
database health
migration ledger
required baseline tables
smoke verification
```

This means:

``` text
database exists
```

is not equivalent to:

``` text
database is safe for production tenant traffic
```

That distinction is important.

------------------------------------------------------------------------

# 55. Performance Evidence From the Project

The supplied tracker records several useful test results/claims:

``` text
50 concurrent gets tested
100 distinct tenant identities tested
active client cache remains bounded
LRU eviction tested
cold/warm acquisition measured
real PostgreSQL pool bounds tested
one slow tenant does not occupy all fan-out slots
pool exhaustion fails closed
```

Treat these as project test evidence, not universal performance
guarantees.

Production latency will depend on:

``` text
hosting region
network
PostgreSQL provider
pool settings
replica count
traffic shape
query behavior
hardware
```

------------------------------------------------------------------------

# 56. A Full Warm Request

ABC's client is already cached.

``` text
CatalogService
      ↓
TenantDbService
      ↓
TenantContext = ABC
      ↓
TenantDatabaseManager
      ↓
cache lookup DB_REGISTRY_ABC
      ↓
HIT
      ↓
reuse ABC client/pool
      ↓
Prisma query
      ↓
ABC PostgreSQL
```

Fast path.

------------------------------------------------------------------------

# 57. A Full Cold Request

ABC's client is not cached.

``` text
CatalogService
      ↓
TenantDbService
      ↓
TenantContext = ABC
      ↓
trusted TenantDatabase registry
      ↓
TenantDatabaseManager
      ↓
cache MISS
      ↓
reserve client capacity
      ↓
single-flight creation
      ↓
decrypt connection material
      ↓
construct managed Prisma/pool
      ↓
connect/acquire within timeout
      ↓
cache by registry ID
      ↓
ABC query
```

That is the expensive path.

------------------------------------------------------------------------

# 58. Cold Burst Request

50 requests hit a cold ABC tenant.

Without single-flight:

``` text
50 requests
    ↓
50 creations
```

With Ferio's intended manager behavior:

``` text
50 requests
    ↓
1 creation promise
    ↓
1 ABC client
    ↓
50 callers reuse result
```

This is a classic concurrency-control win.

------------------------------------------------------------------------

# 59. Capacity-Pressure Request

Cache is full.

``` text
MAX = N
active cache = N
new tenant arrives
```

Manager evaluates safe capacity/eviction.

Possible outcomes depend on state:

``` text
safe LRU/idle candidate
       ↓
retire candidate
       ↓
admit new client
```

or:

``` text
no safe capacity
       ↓
fail closed with capacity error
```

The tracker explicitly names:

``` text
TENANT_DATABASE_CAPACITY_EXHAUSTED
```

for tested active-client capacity failure behavior.

------------------------------------------------------------------------

# 60. Unhealthy Tenant Request

Perfect DB repeatedly fails.

``` text
Perfect request
     ↓
acquisition failure
     ↓
bounded repeated failures
     ↓
Perfect circuit opens
     ↓
future Perfect request
     ↓
fail fast during cooldown
```

Meanwhile:

``` text
ABC request
     ↓
ABC client healthy
     ↓
success
```

This is tenant-specific failure isolation.

------------------------------------------------------------------------

# 61. The Manager Is Not a Security Oracle

Important distinction.

TenantDatabaseManager should not decide:

``` text
which tenant does this browser want?
```

That was already established by trusted tenant resolution.

Its job is:

``` text
Given trusted registry identity,
manage safe database client lifecycle.
```

So responsibilities remain separated:

``` text
Tenant Resolver
   → tenant identity

TenantContext
   → propagate identity

Authorization
   → actor permission

TenantDbService
   → application DB boundary

TenantDatabaseManager
   → client/pool lifecycle
```

------------------------------------------------------------------------

# 62. Why Separation of Responsibilities Matters

If one giant service did:

``` text
parse host
authenticate user
check plan
decrypt password
create Prisma
run product query
manage cache
```

it would be hard to:

``` text
test
reason about
secure
reuse
monitor
change
```

Ferio's layered boundaries let each component answer one major question.

That is senior architecture thinking.

------------------------------------------------------------------------

# 63. Security Review Questions

When reviewing tenant DB manager code, ask:

``` text
Can caller supply a raw DB URL?
Can caller select another registry ID?
Are credentials ever logged?
Can cache entries cross registry identities?
Can concurrent cold starts create duplicates?
Is client count bounded?
Can eviction disconnect active work?
Are acquisition waits bounded?
Is breaker state per tenant?
Can one DB failure crash all tenants?
Can shutdown leak pools?
Do transactions reuse the resolved tenant client?
Can legacy Prisma be reached from production tenant paths?
```

If you learn to ask these questions automatically, you are learning
architecture rather than syntax.

------------------------------------------------------------------------

# 64. Performance Review Questions

Also ask:

``` text
What is the maximum cached client count?
What is each pool's max size?
How many backend replicas exist?
What is total worst-case DB connection demand?
What is cold acquisition latency?
What is warm acquisition latency?
How often are clients evicted?
Is there cache/client churn?
What happens under 50 simultaneous cold requests?
What happens when PostgreSQL reaches its connection limit?
When does PgBouncer become necessary?
```

------------------------------------------------------------------------

# 65. Debugging Example --- "ABC Requests Are Slow"

Do not immediately blame Prisma.

Trace:

``` text
1. Is ABC client warm or cold?
2. Are there frequent LRU evictions?
3. Is ABC constantly being recreated?
4. Is pool acquisition waiting?
5. Is ABC's circuit close to/open?
6. Is PostgreSQL itself slow?
7. Are queries slow?
8. Is the application at client capacity?
9. Is another tenant causing shared-resource pressure?
10. Are there too many backend replicas/pools for DB capacity?
```

Different symptoms require different fixes.

------------------------------------------------------------------------

# 66. Debugging Example --- "Too Many DB Connections"

Trace the math.

``` text
backend replicas
×
max tenant clients per replica
×
pool max per client
```

Then add:

``` text
Control Plane pools
legacy pools
migration connections
operational tools
reserved capacity
```

Check whether observed connection count matches the architecture budget.

Do not blindly:

``` text
increase PostgreSQL max_connections
```

without understanding memory/provider limits and workload.

------------------------------------------------------------------------

# 67. Debugging Example --- "Perfect Is Down, ABC Also Slow"

Possible investigation:

``` text
Is breaker per tenant?
Are retries hammering Perfect?
Is fan-out concurrency bounded?
Is Perfect occupying all worker slots?
Is shared PostgreSQL infrastructure saturated?
Is connection manager at global capacity?
Are timeout values too large?
```

The point:

> Database-per-tenant isolates data, but shared compute and
> orchestration still need noisy-neighbor controls.

------------------------------------------------------------------------

# 68. Testing Isolation With Identical IDs

Ferio's integration tests create separate tenant DBs and deliberately
use identical identifiers.

Example:

``` text
ABC DB
Product ID = P123
Name = ABC Phone

Perfect DB
Product ID = P123
Name = Perfect Shirt
```

Then:

``` text
TenantContext = ABC
find P123
```

must return:

``` text
ABC Phone
```

This proves routing better than tests where every tenant uses completely
different IDs.

------------------------------------------------------------------------

# 69. Test a Rollback

ABC:

``` text
BEGIN
create row
force error
ROLLBACK
```

Perfect:

``` text
existing row remains unchanged
```

The project integration suite verifies this type of cross-database
isolation.

The test proves two things:

``` text
transaction correctness
tenant isolation
```

------------------------------------------------------------------------

# 70. Test an Outage

Simulate:

``` text
Perfect DB unavailable
ABC DB healthy
```

Expected:

``` text
Perfect → controlled failure
ABC     → continues
```

Forbidden:

``` text
Perfect → ABC DB
```

This tests both availability isolation and confidentiality isolation.

------------------------------------------------------------------------

# 71. Test Capacity

Simulate many tenants:

``` text
Tenant 1
Tenant 2
...
Tenant 100
```

Acquire clients.

Invariant:

``` text
active cached clients
<=
TENANT_DB_MAX_CLIENTS
```

The tracker says this is tested with deterministic LRU behavior.

------------------------------------------------------------------------

# 72. Test Concurrent Cold Start

Simulate:

``` text
50 simultaneous requests
for same uncached tenant
```

Invariant:

``` text
one managed active client
```

not:

``` text
50 duplicate clients
```

This proves the single-flight boundary.

------------------------------------------------------------------------

# 73. Source-Derived vs Teaching Concepts

The following are explicitly established in the supplied Ferio tracker:

``` text
central TenantDatabaseManager
trusted registry-only connection resolution
AES-256-GCM credential envelope
credential redaction
single-flight creation
bounded LRU cache
idle eviction
TENANT_DB_MAX_CLIENTS
TENANT_DB_ACQUIRE_TIMEOUT_MS
per-database circuit breaker/backoff
graceful disconnect
metrics
PgBouncer escalation design
tenant-aware service boundary
same-client transaction requirement
cross-plane ACID prohibition
database isolation tests
```

Some diagrams, analogies, numeric examples and simplified TypeScript in
this lesson are **teaching illustrations**, not claims that the exact
source code has those literal values or shapes.

That distinction matters.

------------------------------------------------------------------------

# 74. Explain It Like You Are Five

> Ferio has many shops, and every shop has its own locked database room.
> Ferio remembers a small number of room connections so it does not keep
> opening new doors every second. If too many doors are open, it safely
> closes old unused ones. If one shop's database is broken, Ferio stops
> trying it for a little while instead of breaking every other shop. And
> the customer is never allowed to tell Ferio which secret database
> password to use.

That is the baby explanation.

------------------------------------------------------------------------

# 75. Explain It Like a Junior Engineer

> `TenantDbService` obtains database access from the immutable tenant
> context. `TenantDatabaseManager` resolves trusted registry metadata
> and reuses a bounded cached Prisma client per tenant database instead
> of creating clients per request. It evicts idle/LRU clients and limits
> acquisition time.

------------------------------------------------------------------------

# 76. Explain It Like a Mid-Level Engineer

> The manager owns tenant Prisma clients and PostgreSQL pools, performs
> single-flight cold creation keyed by trusted registry identity,
> enforces active-client capacity, manages idle/LRU eviction, bounds
> pool acquisition, redacts/decrypts connection secrets only at
> construction, and isolates repeated DB failures with per-registry
> circuit breakers. Tenant transactions are entered through the resolved
> client so nested work cannot silently cross tenant databases.

------------------------------------------------------------------------

# 77. Explain It Like a Senior Engineer

> Ferio's database-per-tenant runtime treats connection management as a
> bounded shared-resource problem. Tenant authority is established
> before the manager; the manager accepts only trusted registry material
> and controls client lifecycle under explicit connection budgets. Cold
> creation is coalesced, cache cardinality is bounded, idle/LRU
> retirement limits retained resources, acquisition timeouts prevent
> indefinite backpressure, and per-registry circuit breakers constrain
> failure blast radius. Transaction entry points preserve a single
> resolved tenant client, while cross-plane workflows avoid false
> distributed-ACID assumptions. PgBouncer/managed pooling is an
> evidence-triggered escalation path rather than an unconditional
> dependency.

------------------------------------------------------------------------

# 78. Five Concepts to Burn Into Your Brain

## 1. Trusted registry only

``` text
Browser never supplies DB connection identity.
```

## 2. Reuse, don't recreate

``` text
Never new PrismaClient per request.
```

## 3. Bounded resources

``` text
Client cache and connection demand need limits.
```

## 4. Isolate failures

``` text
Perfect DB failure must not become ABC failure/data.
```

## 5. Transactions stay inside the resolved tenant DB

``` text
ABC operation → ABC client → ABC transaction.
```

------------------------------------------------------------------------

# 79. Self-Test

### Q1. Why can't Ferio use one global tenant Prisma client?

Because each tenant has an independent operational PostgreSQL database.

### Q2. Who selects the tenant DB?

The server-side tenant boundary using trusted
`TenantContext`/`TenantDatabase` registry metadata.

### Q3. Can the browser provide `databaseUrl`?

It must never be authoritative for tenant routing.

### Q4. Why not create PrismaClient per request?

It can create unbounded clients/connections and destabilize
PostgreSQL/application resources.

### Q5. What is LRU?

Least Recently Used eviction.

### Q6. Does LRU eviction delete the tenant database?

No. It retires the cached application client.

### Q7. What is idle eviction?

Closing/removing clients that have not been used for a configured period
when safe.

### Q8. What is single-flight?

Concurrent requests for the same cold tenant share one client-creation
operation.

### Q9. What does acquire timeout protect against?

Indefinite waiting/resource buildup when DB pool acquisition is
unavailable or slow.

### Q10. What does a circuit breaker do?

After bounded repeated failures, it temporarily fails fast for that
unhealthy tenant DB and retries according to cooldown/backoff behavior.

### Q11. Why is the breaker per database?

So one tenant's failure does not unnecessarily disable healthy tenants.

### Q12. Why must transactions use the same resolved client?

To preserve consistency and prevent cross-tenant writes during one
business operation.

### Q13. Can a Control Plane transaction and ABC DB transaction be one normal ACID transaction?

No. They are separate database boundaries; cross-plane workflows need
orchestration/retry/compensation patterns.

### Q14. Why are DB credentials encrypted?

To reduce exposure of sensitive connection secrets at rest.

### Q15. Is encryption enough if logs print the decrypted password?

No.

### Q16. What is a connection budget?

A calculated upper bound for database connection demand across replicas,
tenant clients/pools, platform pools and operational reserve.

### Q17. When might PgBouncer be introduced?

When measured scale/connection-budget evidence reaches the
architecture's escalation threshold.

------------------------------------------------------------------------

# 80. Real-Code Reading Exercise

When you open Ferio, trace these concepts in this order:

``` text
TenantDbService
       ↓
resolveTenantDatabase
       ↓
TenantDatabaseManager
       ↓
client cache
       ↓
client creation
       ↓
credential decryption
       ↓
pool construction
       ↓
LRU / idle eviction
       ↓
capacity gate
       ↓
acquire timeout
       ↓
circuit breaker
       ↓
OnModuleDestroy
       ↓
metrics
```

For each method ask:

``` text
What trusted input does it accept?
What resource does it create?
Who owns that resource?
How is concurrency controlled?
What is the maximum?
What happens on failure?
What gets logged?
What gets cleaned up?
Can another tenant be affected?
```

------------------------------------------------------------------------

# 81. Full Architecture So Far

After Documents 01--03, your mental model should now be:

``` text
                    Browser
                       |
                       v
              abc.ferio.com
                       |
                       v
                NestJS Backend
                       |
                       v
               Tenant Resolver
                       |
                       v
                 Control Plane
                       |
                       v
             TenantContext = ABC
                       |
              +--------+--------+
              |                 |
              v                 v
        Authorization      Application Service
                                  |
                                  v
                           TenantDbService
                                  |
                                  v
                      TenantDatabaseManager
                                  |
                     +------------+------------+
                     |                         |
                     v                         v
                client cache              health state
                LRU / idle                breaker
                capacity                  timeout
                     |
                     v
               ABC Prisma client
                     |
                     v
              PostgreSQL pool
                     |
                     v
               ABC PostgreSQL
```

------------------------------------------------------------------------

# 82. Next Document

## Document 04 --- Tenant Provisioning & Lifecycle Automation

Next we create a brand-new tenant from nothing:

``` text
Platform Admin clicks:
Create "Baby Shop BD"
        ↓
Organization = PROVISIONING
        ↓
reserve slug
        ↓
reserve subdomain
        ↓
create TenantDatabase registry
        ↓
create physical PostgreSQL database
        ↓
generate/store encrypted credentials
        ↓
apply migrations
        ↓
seed baseline
        ↓
create/attach owner membership
        ↓
health check
        ↓
smoke test
        ↓
activate domain
        ↓
organization ACTIVE
```

We will learn:

``` text
state machines
idempotency
replay/resume
partial failure
compensation
database bootstrap
migration ledger
seed safety
readiness
smoke testing
race conditions
duplicate requests
why provisioning must not be one giant controller method
```

------------------------------------------------------------------------

**End of Document 03**