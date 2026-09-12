# Ferio Engineering Learning Series

## Document 04 --- Tenant Provisioning & Lifecycle Automation

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-4

------------------------------------------------------------------------

# 1. What This Document Teaches

Documents 01--03 brought us here:

``` text
hostname → trusted TenantContext → correct tenant database client
```

But before `baby-shop-bd.ferio.com` can work, Ferio must create and
prepare that business. That process is **tenant provisioning**.

Baby definition:

> Provisioning is preparing a new shop's private Ferio environment
> before opening the door to customers.

``` text
Create organization
→ reserve slug/domain
→ prepare private DB
→ migrate
→ seed
→ verify
→ smoke test
→ activate
```

The project's most important MT-4 rule is:

> **Provisioning should behave as an idempotent state machine, not a
> controller script.**

------------------------------------------------------------------------

# 2. Example: Baby Shop BD

Teaching example:

``` text
Business: Baby Shop BD
Slug: baby-shop-bd
Hostname: baby-shop-bd.ferio.com
Owner: Rahim
Initial organization state: PROVISIONING
```

The exact public hostname comes from Ferio's configured public domain.

------------------------------------------------------------------------

# 3. Why Start as PROVISIONING?

Creating an `Organization` record does not prove that its database,
schema, baseline data and domain are ready.

Bad:

``` text
create organization
→ mark ACTIVE
→ try to create DB
→ DB creation fails
```

Ferio would now claim a broken tenant is active.

Correct:

``` text
PROVISIONING
    ↓
perform required work
    ↓
verify readiness
    ↓
ACTIVE
```

**State must tell the truth.**

------------------------------------------------------------------------

# 4. What Is a State Machine?

A state machine has known states and controlled transitions.

Traffic-light analogy:

``` text
RED → GREEN → YELLOW → RED
```

Ferio's organization lifecycle includes:

``` text
PROVISIONING
ACTIVE
SUSPENDED
PROVISIONING_FAILED
CLOSURE_PENDING
CLOSED
ARCHIVED
```

Simplified provisioning flow:

``` text
              create
                ↓
          PROVISIONING
           /        \
      success       failure
         ↓             ↓
      ACTIVE    PROVISIONING_FAILED
                       ↓
                   retry/resume
                       ↓
                    ACTIVE
```

------------------------------------------------------------------------

# 5. Why Not One Giant Controller Method?

A beginner implementation might look like:

``` ts
createOrganization();
createDomain();
createDatabase();
runMigrations();
seedDatabase();
activate();
```

Now imagine:

``` text
organization ✓
domain       ✓
database     ✓
migration    ✓
seed         ✗
```

The HTTP request failed, but real resources already exist.

This is a **partial failure**.

A controller cannot simply pretend the earlier work never happened.

------------------------------------------------------------------------

# 6. ProvisioningService Is the Orchestrator

Baby analogy:

> The orchestrator is the project manager.

It coordinates the steps and remembers their results.

Conceptually:

``` text
ProvisioningService
    ├─ reserve domain
    ├─ provision/register DB
    ├─ apply migrations
    ├─ seed baseline
    ├─ health check
    ├─ smoke test
    └─ activate
```

The Control Plane models provisioning operations/runs and steps. The
important idea is that progress is **durable data**, not just Node.js
memory.

------------------------------------------------------------------------

# 7. Why Durable Progress Matters

Bad:

``` ts
let currentStep = 5;
```

Server crashes → variable disappears.

Good mental model:

``` text
ProvisioningRun
  status = FAILED

MIGRATION
  status = SUCCEEDED

SEED
  status = FAILED
```

After restart Ferio can discover exactly where it stopped.

------------------------------------------------------------------------

# 8. Step 1 --- Organization + Owner

Platform Admin creates the organization through the platform
organization boundary.

Conceptually:

``` text
Organization
  id     = org_baby
  name   = Baby Shop BD
  slug   = baby-shop-bd
  status = PROVISIONING
```

Ferio also creates the initial `OWNER` organization membership
atomically.

Why atomically?

Bad:

``` text
organization created ✓
owner creation       ✗
```

Result: an orphan organization.

The organization and its initial owner belong to the Control Plane.
Ferio does **not** create a duplicate tenant-local super-admin just
because a tenant DB is being provisioned.

------------------------------------------------------------------------

# 9. Step 2 --- Reserve a Unique Slug

``` text
Baby Shop BD
      ↓
baby-shop-bd
```

The slug must be normalized, validated and unique.

Why database uniqueness as well as service checks?

Race:

``` text
Request A: "abc free?" → yes
Request B: "abc free?" → yes
```

Both can pass an application-level existence check before either
commits.

A unique DB constraint is the final guard.

------------------------------------------------------------------------

# 10. Step 3 --- Reserve the Domain, But Do Not Open It

Example:

``` text
baby-shop-bd.ferio.com
```

Ferio initially keeps the default subdomain:

``` text
PENDING_ACTIVATION
```

Why?

If the hostname becomes live before the tenant DB is ready:

``` text
customer
  ↓
baby-shop-bd.ferio.com
  ↓
tenant DB
  ↓
required table missing
  ↓
failure
```

Correct:

``` text
reserve hostname
→ build tenant
→ verify tenant
→ activate hostname
```

System/reserved names such as `www`, `admin`, `api`, `app`, etc. also
need protection from organization-slug collision.

------------------------------------------------------------------------

# 11. Step 4 --- TenantDatabase Registry

Ferio creates trusted Control Plane metadata describing the tenant
database.

Mental model:

``` text
TenantDatabase
  organizationId
  readiness/status
  schemaVersion
  encrypted connection material
  ...
```

Do not confuse:

``` text
TenantDatabase registry row
```

with:

``` text
physical PostgreSQL database
```

Analogy:

``` text
car registration document ≠ physical car
```

------------------------------------------------------------------------

# 12. Step 5 --- Provision the Physical PostgreSQL Database

Conceptually:

``` sql
CREATE DATABASE baby_shop_db;
```

Ferio uses a provisioner/executor boundary so the high-level workflow is
not tied forever to one infrastructure implementation:

``` text
ProvisioningService
      ↓
TENANT_DB_PROVISIONER
      ↓
provider-specific DB creation/bootstrap
```

The supplied tracker says the default executor can automate database
creation/bootstrap on the platform server, while final
managed-production hosting remains an infrastructure/provider decision.

So:

> Application-level provisioning exists, but final managed-provider
> production infrastructure is not the same thing as being fully
> decided.

------------------------------------------------------------------------

# 13. Database Credentials

The new DB needs sensitive connection material.

Ferio stores tenant DB credentials encrypted at rest using AES-256-GCM
and decrypts them only at trusted bootstrap/pool-construction
boundaries.

Never expose secrets through:

``` text
Platform Admin UI
normal API output
logs
audit payloads
exception messages
```

Security is about the whole secret lifecycle, not only encryption in the
database.

------------------------------------------------------------------------

# 14. Step 6 --- Apply Migrations

An empty DB does not yet contain Ferio's tenant commerce schema.

Migration:

``` text
empty database
   ↓
migration 001
   ↓
migration 002
   ↓
...
   ↓
current approved tenant schema
```

### Migration vs Seed

``` text
Migration = builds/changes the house
Seed      = puts required basic furniture inside
```

Migration examples:

``` text
CREATE TABLE
ADD COLUMN
CREATE INDEX
```

Seed examples:

``` text
CommerceSettings
COD policy
safe templates
disabled integration defaults
```

------------------------------------------------------------------------

# 15. Migration Ledger

Ferio tracks approved tenant migration execution in:

``` text
_ferio_tenant_migrations
```

Mental model:

``` text
migration              applied
--------------------------------
001_initial            yes
002_inventory          yes
003_settings           yes
```

This lets bootstrap/retry know what has already happened instead of
guessing.

------------------------------------------------------------------------

# 16. Step 7 --- Idempotent Tenant Seed

Ferio's tenant baseline seed is handled through
`TenantSchemaBootstrapper.seedBaseline`.

It should be:

``` text
tenant-safe
business-neutral
idempotent
production-safe
```

The seed uses tenant-specific information rather than assuming every
business is the original Ferio store.

It also avoids fake production commerce data.

Do **not** seed:

``` text
fake customers
fake orders
fake payments
```

The supplied tracker explicitly protects against that.

------------------------------------------------------------------------

# 17. Safe Defaults

Provisioning creates useful defaults without pretending external
services are configured.

The supplied MT-4 design includes ideas such as:

``` text
CommerceSettings
COD verification baseline
transactional notification templates
prepaid checkout disabled until configured
courier catalog entries inactive
no courier credentials
```

Industry principle:

> A safe "not configured yet" state is better than a fake "ready" state.

------------------------------------------------------------------------

# 18. What Is Idempotency?

Baby definition:

> Repeating the same operation does not create another logical result.

Example:

``` text
Turn light OFF.
Turn light OFF again.
```

Final state remains:

``` text
OFF
```

For provisioning:

``` text
Provision Baby Shop
Provision Baby Shop again
```

must not mean:

``` text
Baby DB 1
Baby DB 2
Baby DB 3
```

------------------------------------------------------------------------

# 19. Why Retries Are Normal

Provisioning requests may repeat because of:

``` text
double-click
network timeout
gateway retry
worker retry
server restart
operator retry
response lost after success
```

A production system assumes retries will happen.

------------------------------------------------------------------------

# 20. Idempotency Key

Conceptually:

``` text
organization = Baby Shop
idempotencyKey = provision-baby-001
```

First call:

``` text
create/find run → execute
```

Same logical call again:

``` text
find existing run
→ return/resume it
```

not:

``` text
create another tenant
```

Ferio also uses uniqueness constraints so concurrent requests converge
safely.

------------------------------------------------------------------------

# 21. Race-Safe Idempotency

Two requests arrive simultaneously:

``` text
A ─┐
   ├→ same provisioning key
B ─┘
```

Both might initially believe they should create a run.

The unique constraint decides the winner.

The losing request can:

``` text
re-read winning run
→ resume/return it
```

The tracker also says cross-organization reuse of the same provisioning
key is rejected with a stable conflict rather than accidentally sharing
a run.

------------------------------------------------------------------------

# 22. Idempotency Is More Than One Key

Having an idempotency key is not enough if a step does:

``` text
retry → create random new database every time
```

Real retry safety combines:

``` text
operation identity
resource uniqueness
durable state
step-level idempotency
migration ledger
conflict-safe seed
provider reconciliation
```

------------------------------------------------------------------------

# 23. Resume From the First Incomplete Step

Example:

``` text
DOMAIN       ✓
DATABASE     ✓
MIGRATION    ✓
SEED         ✗
HEALTH       not started
SMOKE_TEST   not started
ACTIVATE     not started
```

Retry should conceptually do:

``` text
read durable run
→ find first incomplete/failed step
→ resume safely
```

not rebuild everything from zero.

The project explicitly describes resume-from-first-incomplete-step
behavior.

------------------------------------------------------------------------

# 24. Completed Replay

If Baby Shop is already successfully provisioned, replay should safely
reuse the existing:

``` text
active subdomain
registered tenant database
active organization
```

and return the same logical success.

This is **effectively-once logical outcome despite possible repeated
execution**.

------------------------------------------------------------------------

# 25. Partial Failure Is Normal

Example:

``` text
organization ✓
domain       ✓
database     ✓
migration    ✓
seed         ✗
```

Do not hide this.

Persist:

``` text
what succeeded
what failed
when
for which organization
safe error evidence
```

Then recover.

------------------------------------------------------------------------

# 26. Why `catch { deleteEverything(); }` Is Dangerous

Cleanup can fail too.

A cloud/provider request may time out after actually creating the DB.

An operator may need evidence.

Retention policy may prohibit deletion.

So this is dangerous:

``` text
error
→ blindly DROP DATABASE
```

Ferio's current posture keeps durable failure evidence and uses a
partial-failure runbook; automatic physical-provider cleanup remains
intentionally controlled/infrastructure-dependent.

------------------------------------------------------------------------

# 27. Compensation and Saga Thinking

Provisioning crosses:

``` text
Control Plane DB
physical DB infrastructure
tenant DB
domain lifecycle
```

These cannot be wrapped in one normal PostgreSQL transaction.

A **saga-style** workflow coordinates multiple durable steps.

If a later step fails:

``` text
record
→ retry
→ reconcile
→ compensate/manual recovery where appropriate
```

Compensation is not magical rollback.

It is an explicit repair/neutralization action, for example:

``` text
disable a domain
release a reservation
mark an orphan resource
schedule controlled cleanup
```

Exact compensation depends on the provider/resource.

------------------------------------------------------------------------

# 28. Ambiguous Outcomes

Hard distributed-systems example:

``` text
Ferio → provider: CREATE DATABASE
provider creates DB
network response is lost
Ferio sees timeout
```

Now:

``` text
Was it created?
Was it not created?
```

This is an **ambiguous outcome**.

A robust provider integration must reconcile existing provider state
before blindly creating another resource.

The supplied tracker does not fully define final managed-provider
reconciliation because final production provider selection remains an
infrastructure decision.

------------------------------------------------------------------------

# 29. Step 8 --- Database Health Check

Before READY, Ferio checks more than "a DB address exists."

The tracker specifies:

``` text
read-only SELECT 1
+
migration-ledger verification
+
required baseline-table verification
```

Why isn't `SELECT 1` enough?

Because this can work:

``` sql
SELECT 1;
```

while:

``` text
CommerceSettings missing
migration ledger missing
required schema incomplete
```

Connectivity is weaker than readiness.

------------------------------------------------------------------------

# 30. Step 9 --- Smoke Test

Ferio records a separate `SMOKE_TEST` provisioning step.

Baby definition:

> Run a small critical test before opening the shop.

The tracker says the smoke check verifies the migration ledger and
baseline tables including:

``` text
CommerceSettings
CodVerificationPolicy
```

It is not a full test of every commerce feature.

It is minimum readiness evidence.

------------------------------------------------------------------------

# 31. Health vs Smoke

Mental model:

``` text
Health:
"Can I reach the DB and is required structure present?"

Smoke:
"Does the minimum newly provisioned Ferio baseline behave as expected?"
```

Both happen before public activation.

------------------------------------------------------------------------

# 32. Activate Last

The domain moves from:

``` text
PENDING_ACTIVATION
```

to:

``` text
ACTIVE
```

only after required migration, seed, health and smoke work succeeds.

Then successful finalization can transition the organization to:

``` text
ACTIVE
```

If required provisioning fails:

``` text
PROVISIONING_FAILED
```

The failure remains durable and resumable.

------------------------------------------------------------------------

# 33. Complete Flow

``` text
Platform Admin
      ↓
Create Baby Shop
      ↓
Organization = PROVISIONING
      ↓
Initial OWNER membership
      ↓
Reserve unique slug
      ↓
Reserve domain = PENDING_ACTIVATION
      ↓
Create TenantDatabase registry
      ↓
Provision physical PostgreSQL DB
      ↓
Store encrypted connection material
      ↓
Apply canonical migrations
      ↓
Record migration ledger
      ↓
Run idempotent tenant seed
      ↓
DB health verification
      ↓
SMOKE_TEST
      ↓
DB ready
      ↓
Domain ACTIVE
      ↓
Organization ACTIVE
      ↓
Tenant can receive traffic
```

------------------------------------------------------------------------

# 34. Failure Examples

### Migration fails

``` text
DB exists
migration incomplete
→ persist failure
→ no activation
→ diagnose/fix
→ retry/resume
```

### Server crashes after seed

``` text
seed may already exist
→ retry
→ idempotent seed recognizes existing baseline
→ continue
```

### User double-clicks

``` text
two HTTP requests
→ same logical provisioning identity
→ one winning run
→ other request reuses/resumes it
```

### Smoke test fails

``` text
domain must remain non-active
organization must remain non-active
```

A readiness test is useless if failure does not block activation.

------------------------------------------------------------------------

# 35. Provisioning Operations UI

The Platform Admin exposes operational views such as:

``` text
organization list/create
organization detail
subscription/usage
domains
database metadata
members
provisioning timeline
retry action
DB health/readiness
schema version
safe diagnostics
```

This UI is not just decoration.

It is how operators understand and recover durable workflows.

------------------------------------------------------------------------

# 36. A Useful Timeline

Instead of:

``` text
Provisioning failed.
```

operators should be able to reason like:

``` text
DOMAIN          SUCCEEDED
DATABASE        SUCCEEDED
MIGRATE         SUCCEEDED
SEED            FAILED
SMOKE_TEST      NOT_STARTED
ACTIVATE        NOT_STARTED
```

Then "Run provisioning" means:

``` text
resume the idempotent orchestrator
```

not:

``` text
delete everything and start over
```

------------------------------------------------------------------------

# 37. Diagnostics Without Secrets

Operators need:

``` text
DB status
schema version
readiness
step/error category
```

They do not need:

``` text
raw DB password
full secret-bearing connection URL
encryption key
```

The project explicitly keeps registry/operational diagnostics
credential-free.

------------------------------------------------------------------------

# 38. Lifecycle After Provisioning

Provisioning is only the beginning.

Later:

``` text
ACTIVE ↔ SUSPENDED
```

and closure may progress:

``` text
ACTIVE
  ↓
CLOSURE_PENDING
  ↓
CLOSED
  ↓
ARCHIVED
```

The supplied policy keeps suspended storefront browsing available while
commerce writes are denied.

Suspension is not deletion.

------------------------------------------------------------------------

# 39. Closure and Retention

The tracker specifies a 90-day closure retention gate with an explicit
audited override.

Therefore closure is intentionally not:

``` text
click delete
→ DROP DATABASE immediately
```

There can be:

``` text
financial
legal
audit
support
recovery
```

reasons to preserve data.

Physical destruction remains provider/retention controlled.

The export package and tenant business/audit/financial/media export workflows
are implemented and checked. Automatic provider-side export orchestration
before every closure remains an operational policy/deployment concern.

------------------------------------------------------------------------

# 40. Provisioning Invariants

An invariant is something that must remain true.

Important examples:

``` text
ACTIVE tenant must have required ready DB state.

ACTIVE domain must not expose an unready tenant.

Retry must not create duplicate logical resources.

Seed must not create fake production commerce data.

Platform diagnostics must not reveal DB secrets.

Failed provisioning must retain recovery evidence.

One organization's idempotency operation must not become another's.
```

Senior engineering is largely about protecting invariants.

------------------------------------------------------------------------

# 41. Preconditions and Postconditions

For each step ask what must be true before and after it.

### Migration

Precondition:

``` text
physical DB exists
trusted credentials available
```

Postcondition:

``` text
approved migration set applied/recorded
```

### Seed

Precondition:

``` text
required schema exists
```

Postcondition:

``` text
safe baseline data exists exactly once logically
```

### Activation

Precondition:

``` text
required steps succeeded
DB ready
smoke passed
```

Postcondition:

``` text
tenant may receive intended traffic
```

------------------------------------------------------------------------

# 42. Industry Step Contract

Every provisioning step should answer:

``` text
What do I require?
How do I detect "already done"?
What side effect do I create?
How do I prove success?
What error do I persist?
Can I retry?
Can I compensate?
Can I safely skip?
```

That is far more useful than memorizing function names.

------------------------------------------------------------------------

# 43. Exactly-Once vs Effectively-Once

A common beginner dream:

> "I'll guarantee this whole distributed workflow runs exactly once."

Across HTTP, workers, databases and providers, true end-to-end
exactly-once execution is difficult.

A practical design assumes:

``` text
execution may repeat
```

and guarantees logical safety with:

``` text
idempotency
uniqueness
durable state
reconciliation
```

So the logical result behaves effectively once.

------------------------------------------------------------------------

# 44. Retry Classification

Not every failure deserves the same retry.

### Transient

``` text
temporary network failure
temporary DB/provider unavailability
```

May be retryable.

### Permanent/configuration

``` text
reserved slug
invalid configuration
unsupported state
```

Blind retry will not fix it.

### Ambiguous

``` text
provider timed out after a create call
```

Reconcile before recreating.

Senior systems classify failure rather than:

``` text
catch → retry forever
```

------------------------------------------------------------------------

# 45. Retry Storms

If a dependency is unhealthy and hundreds of workflows retry
continuously, retries can prevent recovery.

Industry systems commonly use:

``` text
bounded retries
backoff
jitter
operator visibility
manual/dead-letter recovery where appropriate
```

The supplied MT-4 checklist establishes resumable retry/recovery, but
exact retry timing algorithms should be confirmed from the real
implementation/runbook rather than invented.

------------------------------------------------------------------------

# 46. Provisioning Is Cross-Plane

The workflow moves through multiple boundaries:

``` text
CONTROL PLANE
organization/run/domain/registry
        ↓
INFRASTRUCTURE
physical PostgreSQL
        ↓
TENANT PLANE
migrations + baseline seed
        ↓
CONTROL PLANE
readiness + activation
```

That is why a normal one-database transaction cannot solve the entire
workflow.

------------------------------------------------------------------------

# 47. Security Review

Provisioning is highly privileged.

Never let an ordinary browser request authoritatively supply:

``` text
raw database URL
DB password
arbitrary SQL migration
organization status = ACTIVE
arbitrary domain activation
```

Review questions:

``` text
Who can start provisioning?
Who can retry it?
Are DB secrets ever returned?
Can a user choose physical DB connection material?
Can activation bypass readiness?
Can another organization reuse this operation?
Can cleanup destroy an unrelated DB?
Are lifecycle changes audited?
```

------------------------------------------------------------------------

# 48. Testing Matrix

### Happy path

Verify:

``` text
organization
owner
domain reservation
DB registry
physical DB
migrations
seed
health
smoke
activation
```

### Replay

Same logical request again:

``` text
no duplicate DB/domain/baseline
same successful logical outcome
```

### Concurrent replay

Two same-key requests:

``` text
one winning logical run
```

### Failure + resume

Force a middle step to fail:

``` text
failure persisted
no early activation
retry continues safely
```

### Seed twice

``` text
no duplicate logical defaults
no fake commerce rows
```

### Secret leakage

Inspect:

``` text
API
logs
audit
Platform Admin diagnostics
```

for forbidden credentials.

### Activation gate

Force smoke failure:

``` text
domain != ACTIVE
organization != ACTIVE
```

------------------------------------------------------------------------

# 49. Debugging --- Tenant Stuck in PROVISIONING

Trace:

``` text
1. Find organization.
2. Find latest ProvisioningRun.
3. Inspect step statuses.
4. Find first failed/incomplete step.
5. Read safe error evidence.
6. Determine whether its side effect already happened.
7. Reconcile provider state if ambiguous.
8. Fix the real blocker.
9. Run resumable provisioning.
10. Verify health/smoke/activation.
```

Do **not** fix it by manually setting:

``` text
status = ACTIVE
```

That hides the broken invariant.

------------------------------------------------------------------------

# 50. Debugging --- Duplicate DB

Investigate:

``` text
Were different idempotency keys used?
Was DB naming/resource identity deterministic?
Did provider creation support reconciliation?
Was there a timeout with ambiguous outcome?
Did concurrent requests converge on one run?
Were uniqueness constraints present?
```

The bug may be below the controller layer.

------------------------------------------------------------------------

# 51. Debugging --- ACTIVE but Broken

This is an invariant violation.

Check:

``` text
Could activation happen before smoke?
Was readiness too weak?
Was state manually changed?
Could domain activation bypass provisioning?
Did schema drift after provisioning?
Does production infrastructure differ from tested executor?
```

Fix the path that allowed the invalid state, not only that one tenant.

------------------------------------------------------------------------

# 52. Simplified Teaching Pseudocode

This is **not copied from Ferio source**:

``` ts
async provision(orgId: string, key: string) {
  const run = await this.getOrCreateRun(orgId, key);

  await this.step(run, 'DOMAIN', () =>
    this.ensureDomainReserved(orgId));

  await this.step(run, 'DATABASE', () =>
    this.ensureDatabaseProvisioned(orgId));

  await this.step(run, 'MIGRATE', () =>
    this.ensureMigrationsApplied(orgId));

  await this.step(run, 'SEED', () =>
    this.ensureBaselineSeeded(orgId));

  await this.step(run, 'HEALTH', () =>
    this.verifyDatabase(orgId));

  await this.step(run, 'SMOKE_TEST', () =>
    this.smokeTest(orgId));

  await this.step(run, 'ACTIVATE', () =>
    this.activateTenant(orgId));
}
```

Mental model for the step wrapper:

``` text
already succeeded?
    ↓ yes
skip safely

otherwise
    ↓
mark running
    ↓
perform work
   / \
success failure
  ↓      ↓
persist  persist safe failure
```

------------------------------------------------------------------------

# 53. What Not to Do

``` text
❌ ACTIVE before DB readiness
❌ browser supplies databaseUrl
❌ fake customer/order/payment seed
❌ every retry creates another DB
❌ application-only uniqueness checks
❌ progress stored only in RAM
❌ secret-bearing errors
❌ domain active before smoke
❌ catch-all DROP DATABASE cleanup
❌ Platform Admin silently becomes tenant owner
❌ pretend Control Plane + tenant DB + provider are one ACID transaction
❌ restart provisioning blindly from zero
```

------------------------------------------------------------------------

# 54. Project Status Nuance

The supplied tracker records the MT-4 gate as working for:

``` text
organization → isolated environment without manual SQL
idempotent replay
diagnosable/recoverable failure
```

However, the physical database creation item remains **PARTIAL** with
respect to final managed production infrastructure/provider choice.

Also, completing MT-4 does not mean the entire SaaS is production-ready.
Later work still covers areas such as domain operations, fleet
migrations, backup/restore, hardening and launch gates.

------------------------------------------------------------------------

# 55. Explain It Like You Are Five

> Ferio prepares a new shop like preparing a new house. It writes down
> the owner, reserves the address, builds a private database room, puts
> the correct tables and basic settings inside, checks that everything
> works, and only then unlocks the front door. If something breaks
> halfway, Ferio remembers where it stopped and safely continues later
> instead of building a second house.

------------------------------------------------------------------------

# 56. Junior Engineer Answer

> A tenant starts in `PROVISIONING`. The provisioning workflow reserves
> its domain, provisions/registers the database, applies migrations,
> runs an idempotent seed, verifies health and smoke checks, then
> activates the domain and organization. Failed runs persist step state
> and can resume safely.

------------------------------------------------------------------------

# 57. Mid-Level Engineer Answer

> MT-4 is a persisted, idempotent provisioning orchestrator rather than
> a synchronous controller script. `ProvisioningRun`/step state,
> uniqueness constraints and idempotency keys make replay and
> concurrency safe. Canonical migration tracking plus business-neutral
> conflict-safe seeding make tenant bootstrap resumable, while
> readiness/smoke gates prevent traffic before initialization is proven.
> Cross-system failures use replay, reconciliation and controlled
> compensation rather than fake distributed rollback.

------------------------------------------------------------------------

# 58. Senior Engineer Answer

> Ferio models tenant creation as a durable cross-plane workflow with
> explicit lifecycle invariants. The Control Plane owns organization,
> domain, database registry and provisioning state; infrastructure
> provisioning and tenant-schema bootstrap are coordinated through
> retry-safe step contracts. Unique resource identities and operation
> idempotency absorb concurrent/replayed execution, while migration
> ledgers and idempotent seeding make bootstrap resumable. Readiness
> evidence gates traffic activation. Partial failures preserve
> diagnostic state and require provider-aware
> reconciliation/compensation rather than destructive pseudo-rollback,
> yielding effectively-once logical outcomes under at-least-once
> execution.

------------------------------------------------------------------------

# 59. Five Things to Burn Into Your Brain

``` text
1. STATE MACHINE
   Status must tell the truth.

2. IDEMPOTENCY
   Retry must not create another logical tenant.

3. DURABLE WORKFLOW
   Progress survives process crashes.

4. READINESS BEFORE ACTIVATION
   Never expose a half-built tenant.

5. PARTIAL FAILURE IS NORMAL
   Record → diagnose → reconcile/resume/compensate.
```

------------------------------------------------------------------------

# 60. Self-Test

**Q: What is provisioning?**\
Preparing all required tenant resources/configuration so the business
can safely use Ferio.

**Q: Initial organization state?**\
`PROVISIONING`.

**Q: Why not ACTIVE immediately?**\
The DB/schema/seed/readiness may not exist yet.

**Q: Migration vs seed?**\
Migration builds/evolves schema; seed adds required baseline data.

**Q: What tracks tenant migration execution?**\
`_ferio_tenant_migrations`.

**Q: Why must seed be idempotent?**\
Provisioning may replay after partial failure.

**Q: Should production seed contain fake orders?**\
No.

**Q: Why is the domain initially pending?**\
Traffic must wait until readiness is proven.

**Q: What does an idempotency key do?**\
Identifies one logical operation across retries.

**Q: Is the key alone enough?**\
No; resource uniqueness, step idempotency and reconciliation are also
needed.

**Q: What happens after a middle-step failure?**\
Persist failure, keep tenant non-active, diagnose, then safely
resume/recover.

**Q: Can provisioning be one ordinary ACID transaction?**\
No; it crosses databases and infrastructure/provider boundaries.

**Q: What is compensation?**\
An explicit repair/neutralization action for an earlier distributed side
effect.

**Q: Why not automatically delete every partial DB?**\
Deletion is destructive and provider outcomes can be ambiguous.

**Q: What happens if smoke fails?**\
Activation must be blocked.

**Q: Does MT-4 mean all SaaS launch work is done?**\
No.

------------------------------------------------------------------------

# 61. Real-Code Reading Exercise

Trace the real repository in this order:

``` text
Platform organization controller
        ↓
OrganizationsService
        ↓
organization + OWNER membership
        ↓
ProvisioningService
        ↓
ProvisioningRun / Step
        ↓
domain reservation
        ↓
TENANT_DB_PROVISIONER
        ↓
TenantDatabase registry
        ↓
TenantSchemaBootstrapper
        ├─ migrations
        ├─ _ferio_tenant_migrations
        └─ seedBaseline
        ↓
health/readiness
        ↓
SMOKE_TEST
        ↓
domain activation
        ↓
organization ACTIVE
```

For every method ask:

``` text
What state does it require?
What state does it produce?
Is it safe to retry?
What unique constraint protects it?
What if it crashes after the side effect?
What is persisted?
Can secrets leak?
What blocks early activation?
What if two requests run concurrently?
```

------------------------------------------------------------------------

# 62. Architecture So Far

``` text
                        PLATFORM ADMIN
                              ↓
                     Create Organization
                              ↓
                    CONTROL PLANE
             Organization = PROVISIONING
                    OWNER membership
                              ↓
                   ProvisioningService
                              ↓
       ┌──────────────────────┼─────────────────────┐
       ↓                      ↓                     ↓
 Domain Registry       DB Provisioner       ProvisioningRun
PENDING_ACTIVATION       / Registry             + Steps
                              ↓
                     Physical Tenant DB
                              ↓
                    Canonical Migrations
                              ↓
                     Migration Ledger
                              ↓
                      Baseline Seed
                              ↓
                   Health + Smoke Test
                              ↓
                         DB READY
                              ↓
                       Domain ACTIVE
                              ↓
                  Organization ACTIVE
                              ↓
             baby-shop-bd.ferio.com
                              ↓
                    Tenant Resolver
                              ↓
                     TenantContext
                              ↓
                 TenantDatabaseManager
                              ↓
                   Baby Shop PostgreSQL
```

------------------------------------------------------------------------

# 63. Next Document

## Document 05 --- Domain, Subdomain, DNS, TLS & Storefront Routing

Next:

``` text
baby-shop-bd.ferio.com
        ↓
DNS
        ↓
Cloudflare / ingress
        ↓
TLS / HTTPS
        ↓
Customer Web / SSR
        ↓
NestJS
        ↓
Tenant Resolver
        ↓
Baby Shop
```

We will learn wildcard DNS, TLS, reverse proxies, trusted
`Host`/`X-Forwarded-Host`, SSR host forwarding, canonical URLs, SEO
isolation, custom-domain verification, domain takeover protection, cache
invalidation, and unknown/provisioning/suspended storefront states.

------------------------------------------------------------------------

**End of Document 04**
