# Ferio Engineering Learning Series
# Document 11 — Tenant Migration Orchestration (MT-11)

> **Learning goal:** Understand, from child-simple to senior-engineer level, how Ferio safely upgrades the schema of many physically separate tenant PostgreSQL databases.

---

## 1. The problem MT-11 solves

Ferio uses **database-per-tenant** isolation.

```text
Ferio
├── Control Plane PostgreSQL
├── Tenant A PostgreSQL
├── Tenant B PostgreSQL
├── Tenant C PostgreSQL
└── ...
```

That gives Ferio a strong isolation boundary, but it creates an operational problem.

Suppose a new Ferio release needs a new field:

```text
Order.deliveryNote
```

With one database, you migrate one database.

With 500 tenants, the same logical schema change may need to reach 500 independent databases.

The dangerous solution is:

```text
start application
    ↓
run migration against every tenant at once
```

Ferio deliberately does **not** use that model.

The MT-11 model is:

```text
Validate migration
      ↓
Choose eligible tenants
      ↓
Canary
      ↓
Verify
      ↓
Bounded batches
      ↓
Record every result
      ↓
Pause / retry / resume when necessary
      ↓
Fleet reaches target schema
```

The sentence to remember is:

> **Canary → batch → fleet.**

---

## 2. What is a migration?

A database schema is the structure of the database.

For example:

```text
Order
├── id
├── customerId
├── total
└── status
```

A new feature might require:

```text
Order
├── id
├── customerId
├── total
├── status
└── deliveryNote
```

A migration is the controlled change that moves the old schema toward the new schema.

For example:

```sql
ALTER TABLE "Order"
ADD COLUMN "deliveryNote" TEXT;
```

The migration changes **structure**, not which tenant owns the data.

---

## 3. Ferio has two migration worlds

Ferio must keep two database planes separate.

### Control Plane

The Control Plane stores information **about businesses**:

```text
Organization
TenantDomain
TenantDatabase
Plan
Subscription
UsageCounter
SaasInvoice
TenantMigrationRun
TenantMigrationResult
```

Its Prisma schema is:

```text
prisma/platform.prisma
```

Its migrations are separate under:

```text
prisma/platform-migrations
```

### Tenant Plane

Tenant databases store information **inside each business**:

```text
Product
Inventory
Cart
Customer
Order
Payment
Wallet
CommerceSettings
```

The canonical tenant Prisma schema is:

```text
prisma/schema.prisma
```

Its migration artifacts are under:

```text
prisma/migrations
```

The important rule is:

> **Platform migrations and tenant migrations are different operational pipelines.**

The current Ferio checklist confirms they have independent PostgreSQL locks, validation, and deployment commands.

---

## 4. One blueprint, many databases

Database-per-tenant does not mean every tenant gets a different application schema.

Think of `prisma/schema.prisma` as Ferio's master blueprint.

```text
             Canonical tenant blueprint
                prisma/schema.prisma
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Tenant A DB    Tenant B DB    Tenant C DB
```

Their **business data** differs.

Their supported **database structure** should converge.

For example:

```text
Tenant A → schema v48
Tenant B → schema v48
Tenant C → schema v48
```

---

## 5. Schema version

Ferio needs to know which migration state each database has reached.

The current implementation records schema information through:

```text
TenantDatabase.schemaVersion
```

Migration results also retain:

```text
fromVersion
toVersion
```

Conceptually:

```text
TenantDatabase
--------------------------
organizationId = org_abc
status         = READY
schemaVersion  = v48
```

This lets Ferio answer:

> Which database version is this tenant actually running?

That answer becomes important both for operations and for normal request safety.

---

## 6. An incompatible tenant must fail closed

Imagine:

```text
Application requires schema v48
Tenant B is still schema v46
```

The unsafe behavior is:

```text
try the request anyway
```

Some endpoints might fail unpredictably because the application expects tables or columns that do not exist.

Ferio instead has compatibility metadata and can reject the tenant with:

```text
TENANT_MIGRATION_REQUIRED
```

Conceptually:

```text
Request
  ↓
Tenant resolver
  ↓
Trusted TenantDatabase registry
  ↓
Schema compatible?
 ├── YES → establish tenant context
 └── NO  → TENANT_MIGRATION_REQUIRED
```

This extends a rule we have seen throughout Ferio:

> **When tenant safety cannot be established, fail closed.**

Never fall back to another database.

---

## 7. Released migration history must be immutable

Suppose migration 48 has already run for Tenant A.

Later, someone edits migration 48 before Tenant B receives it.

Now:

```text
Tenant A says "migration 48"
Tenant B says "migration 48"
```

but they may have experienced different SQL.

That destroys the meaning of migration history.

Ferio therefore records SHA-256 migration digests in:

```text
prisma/migration-checksums.json
```

At the current checklist checkpoint, this protects all 48 listed tenant/platform migration artifacts.

Validation runs through:

```bash
pnpm check:migrations
```

It fails if a released migration is changed, missing, or unlisted.

The rule is:

> **Never rewrite released migration history. Create another migration.**

Example:

```text
048_add_delivery_note      ← released; leave it alone
049_fix_delivery_note      ← correction
```

This is append-only thinking.

---

## 8. Why application-startup fleet migration is dangerous

Imagine Ferio has:

```text
500 tenant databases
10 NestJS replicas
```

All ten servers restart.

If startup code says:

```text
for every tenant:
    prisma migrate deploy
```

you can accidentally create:

```text
10 × 500 migration attempts
```

Potential consequences:

- connection spikes,
- duplicate work,
- lock contention,
- deadlocks,
- provider overload,
- unpredictable ordering,
- no clear operator control.

Ferio explicitly avoids uncontrolled tenant-fleet migration from application startup.

Tenant migrations are operated through a bounded, canary-aware BullMQ workflow.

That creates a very important separation:

```text
Serving requests
        ≠
Operating fleet migrations
```

---

# 9. Migration orchestrator

Think of the orchestrator as the manager of the entire migration operation.

Its high-level job is:

```text
Discover
   ↓
Preflight
   ↓
Verify version
   ↓
Canary
   ↓
Health check
   ↓
Bounded batch
   ↓
Record results
   ↓
Continue / pause
   ↓
Retry / resume
```

The SQL itself is only one part of the system.

The hard part is coordinating change safely across independent databases.

---

## 10. Discover eligible tenants

Ferio does not blindly migrate every database registry row.

The current checklist defines eligible targets as:

```text
TenantDatabase = READY
Organization   = ACTIVE
```

and discovery is ordered.

That prevents an ordinary rollout from blindly targeting things such as:

- incomplete provisioning databases,
- retired databases,
- closed organizations,
- databases intentionally not ready.

Migration targets originate from trusted Control Plane registry state.

A browser/operator does not choose an arbitrary connection URL.

---

## 11. Preflight connectivity

Before changing a database, Ferio first proves that it can open a real connection.

Example:

```text
Tenant A → reachable
Tenant B → connection failure
Tenant C → reachable
```

Tenant B receives its own failure evidence.

This is much more useful than one giant error:

```text
"MIGRATION FAILED"
```

A production system needs to tell an operator:

```text
which tenant
which stage
which attempt
which safe error class
```

without leaking credentials.

---

## 12. Verify current version

Before applying work, Ferio verifies where the database currently is.

Example:

```text
Target = v48

Tenant A = v48
Tenant B = v47
Tenant C = v46
```

This matters for:

- deciding required work,
- detecting already-complete tenants,
- retry,
- recovery after worker crashes,
- avoiding unnecessary reruns.

It is especially important in distributed systems because the Control Plane's last known result may occasionally lag behind the database's real outcome.

---

# 13. Canary migration

A **canary** is the first controlled tenant used to test the migration before the wider fleet.

```text
500 tenants
    ↓
Tenant A canary
    ↓
Migration
    ↓
Post-migration checks
    ↓
Healthy?
 ├── NO  → stop/pause
 └── YES → batches
```

Why?

A migration can work perfectly in CI and behave badly on real data.

Possible differences include:

- table size,
- old historical rows,
- active traffic,
- lock contention,
- unexpected data states.

The canary reduces blast radius.

---

## 14. Canary success is evidence, not certainty

One successful tenant does not prove every database will succeed.

Suppose:

```text
Tenant A → 5,000 orders
Tenant B → 20,000,000 orders
```

A migration touching `Order` may behave very differently.

So Ferio does not go:

```text
canary success → migrate everybody simultaneously
```

It goes:

```text
canary success → bounded batches
```

---

# 15. Post-migration health

A migration command exiting successfully is not enough evidence.

Ferio also records the schema version and registry health after migration.

The difference is:

```text
"the command completed"
```

versus:

```text
"this tenant is ready for compatible application traffic"
```

Production systems care about the second statement.

---

# 16. Bounded batches

After the canary, Ferio proceeds through sequential batches.

Example:

```text
Canary
[A]

Batch 1
[B C D E]

Batch 2
[F G H I]

Batch 3
[J K L M]
```

The current MT-11 API clamps migration concurrency to:

```text
1–10
```

So an operator cannot accidentally request:

```text
100,000 simultaneous migrations
```

The backend enforces the safety limit.

That is important:

> **Operational safety must not depend on the frontend behaving correctly.**

---

# 17. Why concurrency must be bounded

Each active migration consumes resources:

```text
DB connections
CPU
disk I/O
locks
worker capacity
provider capacity
```

Unlimited parallelism can turn a valid migration into an outage.

A senior engineer thinks in resource budgets:

```text
normal application traffic
+ jobs
+ migration connections
+ migration locks
< safe infrastructure capacity
```

Migration speed is not the only objective.

Safety and predictable load matter more.

---

# 18. Durable per-tenant results

Ferio records a `TenantMigrationResult` for success **and** failure.

Think:

```text
Migration Run #77
├── Tenant A → SUCCESS
├── Tenant B → SUCCESS
├── Tenant C → FAILED
├── Tenant D → SUCCESS
└── Tenant E → PENDING
```

This gives the migration operation memory.

If a process crashes, Ferio should not need a human to reconstruct the rollout from terminal logs.

Durable state answers:

```text
Who succeeded?
Who failed?
Who has not started?
Who needs retry?
What version did they move from/to?
```

---

# 19. Migration run vs migration result

These are different concepts.

### Migration Run

Represents the fleet-level operation.

Conceptually:

```text
runId
target version
status
canary organization
concurrency limit
timestamps
```

### Migration Result

Represents one database's outcome inside the run.

```text
Run 77
├── org_a → SUCCESS
├── org_b → FAILURE
└── org_c → SUCCESS
```

This parent/child design gives Ferio both:

- fleet-level control,
- tenant-level evidence.

---

# 20. Resume must skip completed tenants

Imagine:

```text
A → success
B → success
C → failure
D → not started
```

After C is repaired, resume should behave like:

```text
A → skip
B → skip
C → retry
D → run
```

not:

```text
A → rerun
B → rerun
C → rerun
D → run
```

The current Ferio implementation records successful results and resume skips them.

This is idempotent workflow design.

---

# 21. Transient vs structural failure

Not every migration failure deserves the same response.

Potential transient errors:

```text
lock timeout
deadlock
serialization failure
temporary PostgreSQL connectivity problem
```

These may disappear.

Potential structural errors:

```text
invalid migration
unexpected historical data
impossible constraint
schema corruption
```

Retrying a structural problem 100 times accomplishes nothing.

Ferio classifies known PostgreSQL/Prisma transient failures and applies bounded retry.

The current checklist states:

```text
1–5 attempts
```

with configurable retry count and backoff.

---

# 22. Backoff

Bad retry:

```text
fail
retry immediately
fail
retry immediately
fail
```

Better:

```text
fail
 ↓
wait
 ↓
retry
```

Why?

If the problem is temporary lock contention or infrastructure pressure, immediate retries can make the problem worse.

Backoff gives the resource time to recover.

---

# 23. Failure isolation

Imagine one batch:

```text
B
C
D
E
```

Results:

```text
B → success
C → failure
D → success
E → success
```

Ferio preserves C's failure while healthy batch members can complete according to rollout policy.

Why not rollback B, D, and E?

Because these are separate physical PostgreSQL databases.

There is no normal transaction like:

```sql
BEGIN TRANSACTION ACROSS 500 DATABASES;
```

Fleet operations must be designed around:

> **partial progress + durable evidence + repair + resume**

That is distributed-systems thinking.

---

# 24. Failure threshold

One tenant failure might be an isolated data problem.

Repeated failures can indicate that the migration itself is unsafe.

Ferio therefore supports threshold-based pause behavior.

The current tests include a two-consecutive-failure scenario.

Conceptually:

```text
failure
   ↓
record
   ↓
evaluate policy
   ↓
threshold crossed?
 ├── NO → continue according to policy
 └── YES → PAUSE
```

The orchestrator should listen to evidence rather than stubbornly attacking the fleet.

---

# 25. Pause must be real

A UI button saying:

```text
PAUSED
```

means nothing if queued workers keep migrating databases.

A proper distributed pause requires workers to respect authoritative durable run state.

Conceptually:

```text
Worker receives job
      ↓
Read migration run
      ↓
Still RUNNING?
 ├── YES → work
 └── NO  → don't begin new migration work
```

This is why operational state belongs in the backend/control plane.

---

# 26. Migration timeout

A migration must not be allowed to hang forever.

Ferio bounds per-tenant bootstrap using:

```text
TENANT_MIGRATION_TIMEOUT_MS
```

The current default is:

```text
120 seconds
```

The purpose is not to promise every migration completes in 120 seconds.

The purpose is to guarantee that the orchestrator eventually regains control.

---

# 27. Lock strategy

Schema changes can require PostgreSQL locks.

Imagine:

```text
checkout transaction
     ↓
holds DB lock

migration
     ↓
needs conflicting lock
```

Without limits, the migration may wait too long and create production pressure.

Ferio applies per-migration:

```text
lock_timeout
statement_timeout
```

`lock_timeout` limits waiting for a lock.

`statement_timeout` limits SQL execution duration.

Known lock/deadlock/serialization failures can then enter the bounded transient-retry path.

---

# 28. Expand → migrate → contract

This is the most important schema-evolution pattern in MT-11.

Never make a breaking change in one dangerous step if a compatibility window is required.

Consider changing:

```text
Customer.fullName
```

into:

```text
Customer.firstName
Customer.lastName
```

## Phase 1 — Expand

Temporarily support:

```text
fullName
firstName
lastName
```

Old code can still work.

## Phase 2 — Migrate

Backfill existing data.

```text
"Yahya Khan"
    ↓
firstName = "Yahya"
lastName  = "Khan"
```

Move application behavior toward the new representation.

## Phase 3 — Contract

Only after old code is gone and the new path is proven:

```text
remove fullName
```

The old structure disappears in a later controlled migration.

---

# 29. Why this matters during rolling deployment

A real deployment can temporarily look like:

```text
Old app instances
New app instances

Tenant A → new/transition schema
Tenant B → new/transition schema
Tenant C → old schema
```

So you must consider combinations, not just one final state.

A useful compatibility matrix is:

| Application | Schema | Desired behavior |
|---|---|---|
| Old app | Old schema | Works |
| Old app | Expanded/transition schema | Works when rollout requires overlap |
| New app | Transition schema | Works |
| New app | Final schema | Works |
| Old app | Contracted schema | Usually unsafe; remove old app first |

Expand/migrate/contract creates the overlap needed for rolling changes.

---

# 30. The important MT-11 item still open

The current checklist has one unchecked migration-safety item:

> Test old app/new schema and new app/transition schema compatibility where rollout requires it.

This matters because two different questions exist:

```text
Does the migration orchestrator work?
```

and:

```text
Can application generations safely coexist with transitional schemas?
```

The first is proven by the MT-11 gate.

The second still needs explicit compatibility testing when a rollout requires it.

---

# 31. Destructive migration danger

Suppose the old application executes:

```sql
SELECT "fullName" FROM "Customer";
```

Then you deploy:

```sql
ALTER TABLE "Customer"
DROP COLUMN "fullName";
```

before all old processes are gone.

Result:

```text
old process
    ↓
column missing
    ↓
production error
```

This is why destructive changes belong in a later **contract** phase.

---

# 32. Remember background workers too

"Old application" does not mean only the HTTP API.

Ferio also has:

```text
BullMQ workers
payment recovery jobs
courier jobs
notification workers
reconciliation workers
```

An old worker can still depend on an old column.

Before contract:

```text
API upgraded?
Workers upgraded?
Scheduled jobs upgraded?
Integrations safe?
Backfill complete?
```

All relevant consumers matter.

---

# 33. Forward fix vs reverse SQL

Database rollback is not equivalent to application rollback.

If a migration deleted data, rolling the application binary back does not magically restore it.

Ferio's migration safety approach therefore includes a rollback/forward-fix runbook.

A common safer pattern is:

```text
Migration 48 introduced a problem
        ↓
do not rewrite released 48
        ↓
pause rollout
        ↓
repair
        ↓
Migration 49 forward-fixes the issue
```

Ad-hoc reverse SQL against live tenant databases is explicitly rejected by the migration strategy.

---

# 34. Backup gate

Before high-risk migration batches, Ferio's migration runbook requires verified backup evidence for the targeted databases.

If evidence is missing or stale, the batch should abort.

But distinguish:

```text
MT-11
→ checks/requires backup evidence before risky migration work

MT-12
→ actual backup/PITR/restore/disaster-recovery operations
```

The current checklist explicitly says provider scheduling and live backup execution remain MT-12 operations work.

This is important: a dashboard must not pretend a backup capability exists merely because metadata fields exist.

---

# 35. BullMQ architecture

Fleet migration is a long-running background operation.

Bad:

```text
Browser
  ↓
HTTP request
  ↓
migrate 500 databases
  ↓
wait 20 minutes
```

Better:

```text
Platform Admin
     ↓
Start migration API
     ↓
Create durable run
     ↓
Enqueue BullMQ work
     ↓
HTTP response
```

Then independently:

```text
BullMQ worker
    ↓
load durable run
    ↓
canary
    ↓
batches
    ↓
results
```

HTTP requests request the operation.

Workers execute it.

Durable records remember it.

---

# 36. Trusted registry, never arbitrary DB URL

MT-11 must preserve the trust boundary learned in Documents 1–3.

Dangerous migration API:

```json
{
  "databaseUrl": "postgres://whatever-user-supplied-host"
}
```

Safe conceptual path:

```text
organization / registry identity
        ↓
trusted Control Plane TenantDatabase row
        ↓
trusted credential resolution
        ↓
migration bootstrapper
        ↓
tenant PostgreSQL
```

The migration console must not become an arbitrary database execution tool.

---

# 37. Credential-safe diagnostics

Migration errors may accidentally contain:

```text
DB host
DB username
connection URL
password
provider details
raw SQL
```

Operators need useful diagnostics, but not secret leakage.

Prefer bounded information such as:

```text
organizationId
registryId
migrationRunId
stage
fromVersion
toVersion
attempt
safe error classification
```

Never expose raw database credentials.

---

# 38. Ambiguous outcomes

Consider:

```text
tenant migration succeeds
        ↓
worker crashes
        ↓
before Control Plane success result is saved
```

Now:

```text
Tenant DB may already be v48
Control Plane result may still look incomplete
```

This is an **ambiguous distributed outcome**.

That is one reason Ferio verifies current version before migration/resume.

A retry should inspect reality rather than assume:

```text
no success record = SQL never happened
```

---

# 39. Exactly-once is usually the wrong mental model

Across:

```text
BullMQ
worker
Control Plane PostgreSQL
tenant PostgreSQL
```

perfect exactly-once execution is difficult.

A stronger practical design is:

```text
possible repeated delivery/execution
        +
version-aware/idempotent behavior
        +
durable results
        +
current-state verification
        =
effectively-once desired outcome
```

You have already seen this pattern in Ferio provisioning and background jobs.

---

# 40. Worker crash example

Initial state:

```text
A → success
B → migration starts
```

Worker dies.

After recovery:

```text
reload run
   ↓
inspect B's current migration state/version
   ↓
determine whether work actually completed
   ↓
record/retry appropriately
   ↓
continue
```

A production operation must survive process death.

Terminal output is not durable workflow state.

---

# 41. Provider outage example

Suppose PostgreSQL connectivity begins failing for many tenants.

Bad:

```text
hundreds of workers
× immediate retry
× unlimited attempts
```

This creates a retry storm.

Ferio's model provides:

```text
bounded retries
+
backoff
+
failure evidence
+
threshold pause
```

A migration system should not amplify an infrastructure incident.

---

# 42. Schema drift

Schema drift means the actual database state differs from Ferio's expected canonical state.

Possible causes:

- manual SQL,
- incomplete migration,
- restored older backup,
- migration-history mismatch,
- operational mistake.

Ferio surfaces schema versions through migration results, tenant registry information, provisioning evidence, and restore verification.

The goal is to detect drift operationally instead of waiting for a random customer request to expose it.

---

# 43. CI uses a fleet-shaped test

The current MT-11 validation creates at least:

```text
10 disposable tenant PostgreSQL databases
```

The suite applies the canonical tenant migrations and verifies:

```text
common schema version
+
readiness
```

Then the databases are cleaned up.

Why ten?

The exact number is less important than the principle:

> **Database-per-tenant orchestration should be tested as a fleet, not only against one database.**

---

# 44. Failure is deliberately injected

Ferio's migration regression intentionally creates a middle-tenant failure after the canary succeeds.

Conceptually:

```text
Canary A → SUCCESS

B → SUCCESS
C → FAILURE   ← deliberate
D → SUCCESS
```

The test then verifies that the orchestrator:

- preserves failure evidence,
- handles healthy tenants according to rollout policy,
- supports threshold pause,
- can retry after repair,
- does not rerun already-successful tenants.

This is much stronger than testing only a perfect happy path.

---

# 45. Migration safety is also request safety

MT-11 does not end when the queue worker stops.

Normal request routing must respect migration readiness.

```text
abc.ferio.com
     ↓
Tenant Resolver
     ↓
registry/schema compatibility
     ↓
compatible?
 ├── YES → TenantContext → tenant DB
 └── NO  → TENANT_MIGRATION_REQUIRED
```

That means migration safety has defense in depth:

```text
orchestrator tries to keep fleet healthy
+
resolver prevents incompatible tenants from being silently served
```

---

# 46. Control-plane metadata, tenant-plane execution

Migration orchestration is cross-plane.

```text
TenantMigrationRun
TenantMigrationResult
TenantDatabase.schemaVersion
```

are Control Plane operational metadata.

But:

```text
ALTER TABLE
CREATE INDEX
migration ledger
```

operate inside a tenant database.

So:

```text
Control Plane records the operation
Tenant Plane experiences the schema change
```

There is no one ACID transaction across both databases.

That is why durable recovery logic matters.

---

# 47. A migration is a state machine

A useful teaching model:

```text
CREATED
   ↓
PREFLIGHT
   ↓
CANARY_RUNNING
   ↓
CANARY_PASSED
   ↓
BATCH_RUNNING
   ├─────────────┐
   ↓             │
PAUSED           │
   ↓             │
RESUMED ─────────┘
   ↓
COMPLETED
```

Exact Ferio enum names should always be taken from the implementation.

The important lesson is:

> Long-running operations should have explicit durable states instead of being one giant boolean-returning function.

---

# 48. Preconditions

Before touching a tenant database, a mature migration workflow asks questions like:

```text
Is this tenant eligible?
Is the registry trusted?
Is the DB READY?
Is the organization ACTIVE?
Can we connect?
What version is it on?
Is the migration artifact valid?
Is the run still authorized/running?
Is required backup evidence fresh?
```

These are **preconditions**.

---

# 49. Postconditions

After a migration claims success:

```text
Did the migration actually apply?
What is the resulting schema version?
Did health/readiness pass?
Was registry state updated?
Was the per-tenant result persisted?
```

These are **postconditions**.

A successful command exit is weaker than proven postconditions.

---

# 50. High-risk example

Suppose Ferio wants:

```text
Order.reference NOT NULL
```

but some old tenant has:

```text
reference = NULL
```

Dangerous:

```sql
ALTER TABLE "Order"
ALTER COLUMN "reference" SET NOT NULL;
```

Safer:

### Expand

Ensure all new writes generate references.

### Migrate

Backfill historical null values.

### Validate

Prove:

```sql
SELECT COUNT(*)
FROM "Order"
WHERE "reference" IS NULL;
```

returns zero.

### Contract

Only then enforce:

```text
NOT NULL
```

This is why migration design requires understanding real historical data.

---

# 51. Large backfills

A schema change may be cheap.

A data backfill may touch millions of rows.

That can create:

```text
I/O pressure
WAL growth
locks
CPU usage
replica lag
long transactions
```

For sufficiently large systems, the migrate/backfill phase may need to become its own bounded background workflow rather than one giant SQL statement.

Do not assume Ferio currently has every possible large-scale backfill mechanism unless the code/checklist explicitly shows it.

The lesson is about operational design.

---

# 52. Choosing a canary

An empty tenant proves less than a realistic tenant.

A production canary policy may consider:

```text
representative data
known health
business risk
observability
database size
```

The current Ferio checklist confirms canary support, but the exact long-term production tenant-selection policy should be treated as an operational decision rather than invented.

---

# 53. Deployment compatibility

Suppose:

```text
new app requires v49
fleet is still v48
```

Deploying the new app first may make many tenants unusable.

A safer rollout might be:

```text
1. deploy additive/compatible schema expansion
2. canary
3. migrate fleet
4. verify
5. deploy new behavior
6. backfill if necessary
7. contract later
```

Another migration may require a different order.

The universal rule is:

> **Application deployment and schema deployment need one compatibility plan.**

---

# 54. Code-review questions for every migration

Before approving a tenant schema migration, ask:

1. Is this a Control Plane or Tenant Plane change?
2. Is it additive or destructive?
3. Has the migration artifact been generated correctly?
4. Could this lock a hot table?
5. Could it exceed the migration timeout?
6. Is a backfill needed?
7. Can old application code survive the expanded schema?
8. Can new application code survive transitional data?
9. What happens if one tenant fails?
10. Is the failure transient or structural?
11. Is retry safe?
12. Is a forward fix possible?
13. Is backup evidence required?
14. How is readiness verified?
15. How is schema version recorded?
16. Can resume skip successful tenants?
17. Can an incompatible tenant fail closed?
18. Is any released migration being edited?

These questions are more valuable than simply asking:

```text
"Does prisma migrate deploy work?"
```

---

# 55. Anti-patterns

### Anti-pattern: fleet migration on startup

```text
server starts → migrate all tenants
```

Risk: uncontrolled migration storm.

### Anti-pattern: unlimited parallel migration

Risk: connection and lock exhaustion.

### Anti-pattern: edit released SQL

Risk: migration history stops meaning one thing.

### Anti-pattern: destructive one-step change

Risk: old app/workers break during rolling deployment.

### Anti-pattern: retry everything forever

Risk: retry storm and hidden structural defects.

### Anti-pattern: forget successful tenants after one failure

Risk: unnecessary repeated work and poor resumability.

### Anti-pattern: legacy/global DB fallback

Risk: tenant isolation violation.

### Anti-pattern: arbitrary operator-supplied DB URL

Risk: migration interface becomes raw infrastructure execution.

### Anti-pattern: mark success because the worker exited

Risk: false green without readiness evidence.

### Anti-pattern: casual reverse SQL

Risk: irreversible data damage and confusing migration history.

---

# 56. What MT-11 currently implements

According to the Ferio implementation checklist, MT-11 currently has:

### Migration packaging

- canonical tenant Prisma schema,
- separate platform Prisma schema,
- canonical migration artifact/version,
- tenant schema-version recording,
- migration result from/to versions,
- SHA-256 migration checksum validation,
- separate tenant/platform migration locks and commands,
- compatibility rejection using `TENANT_MIGRATION_REQUIRED`.

### Migration orchestration

- ordered discovery of READY databases for ACTIVE organizations,
- real connectivity preflight,
- current-version verification,
- canary migration,
- post-migration health checks,
- schema-version stamping,
- bounded sequential batches,
- API concurrency clamp of 1–10,
- durable success/failure result recording,
- bounded transient retry of known PostgreSQL/Prisma errors,
- failure-threshold pause,
- isolated tenant failure handling,
- operator resume/retry,
- skip of already-successful tenants,
- Platform Admin `/migrations` fleet console.

### Migration safety

- backup evidence gate for high-risk migrations,
- expand/migrate/contract runbook,
- separate contract phase for destructive changes,
- 120-second default per-tenant migration timeout,
- lock/statement timeout strategy,
- bounded retry for lock/deadlock/serialization failures,
- rollback/forward-fix runbook,
- no uncontrolled tenant migration from application startup.

### Validation

- ten disposable tenant PostgreSQL databases in CI,
- canonical migration applied across all ten,
- common schema version/readiness verified,
- deliberate middle-tenant failure,
- rollout-policy behavior verified,
- repair/retry verified,
- successful tenants skipped during resume,
- schema-version reporting verified,
- incompatible tenant routing safely rejected.

---

# 57. MT-11 gate status

The formal MT-11 gate is currently checked complete.

Ferio proves:

```text
Canary → batch → fleet
```

with an intentionally failing database.

It also proves that production deployment no longer depends on an engineer manually migrating each tenant database one by one.

One migration-safety test remains open:

```text
old app / new schema compatibility
new app / transition schema compatibility
```

where a rollout requires that overlap.

So the correct conclusion is:

> **The MT-11 fleet orchestration gate is complete, while explicit rolling app/schema compatibility coverage still has an open checklist item.**

---

# 58. Explain it like you are 5

Ferio owns many separate houses.

Each house needs the same renovation.

Ferio does not send 500 builders into 500 houses at once.

It first renovates one test house.

If that works, it renovates a few houses at a time.

It writes down which houses worked and which did not.

If too many things go wrong, it stops.

After the problem is fixed, it continues from where it stopped.

That is MT-11.

---

# 59. Junior developer explanation

MT-11 is Ferio's fleet database migration system.

It:

```text
validates migrations
tracks schema versions
selects eligible tenant DBs
runs a canary
rolls out in bounded batches
records each result
retries transient errors
pauses on dangerous failure patterns
supports resume
rejects incompatible tenants
```

Never solve this with a global Prisma client or startup loop over every tenant.

---

# 60. Mid-level explanation

MT-11 is a distributed workflow spanning:

```text
Control Plane
BullMQ
migration workers
many independent PostgreSQL databases
```

There is no fleet-wide transaction.

Correctness therefore depends on:

```text
durable state
idempotent/version-aware work
bounded concurrency
failure classification
partial-progress handling
pause/resume
postcondition verification
compatibility gates
```

Expand/migrate/contract is necessary because rolling deployments can temporarily contain multiple application and schema generations.

---

# 61. Senior explanation

MT-11 turns tenant schema evolution into an explicit control-plane operation with bounded blast radius.

Its important invariants are:

1. Released migration artifacts are immutable and integrity-checked.
2. Tenant and Control Plane migration streams remain separate.
3. Targets are derived from trusted registry state.
4. Fleet rollout is canary-first and concurrency-bounded.
5. One tenant failure does not erase unrelated successful progress.
6. Every outcome is durable enough for recovery and resume.
7. Retry is bounded and failure-class aware.
8. Application routing rejects incompatible schemas.
9. Breaking changes use compatibility windows and delayed contraction.
10. High-risk work requires recovery evidence.
11. Production deployment does not require manual per-tenant SQL.
12. Success means verified postconditions, not merely process completion.

The remaining old/new app-schema compatibility test is significant because **orchestration correctness and deployment compatibility are different safety dimensions**.

---

# 62. How to study the Ferio code

Read MT-11 in this order:

```text
1. prisma/schema.prisma
2. prisma/platform.prisma
3. prisma/migrations
4. prisma/platform-migrations
5. prisma/migration-checksums.json
6. check:migrations script
7. TenantSchemaBootstrapper
8. TenantMigrationRun / TenantMigrationResult
9. migration orchestrator service
10. migration BullMQ worker
11. Platform Admin /migrations
12. TENANT_MIGRATION_REQUIRED resolver path
13. migration-orchestrator.service.spec.ts
14. 10-database integration test
```

While reading, continuously ask:

```text
Where is durable truth?
Which database plane am I in?
Who selected this tenant DB?
What happens if this line runs twice?
What happens if the worker dies after this line?
What happens if this tenant is huge?
What happens if the next tenant fails?
```

That is how to read infrastructure code like a senior engineer.

---

# 63. Practical exercise

Suppose Ferio wants to replace:

```text
Product.price
```

with:

```text
Product.basePrice
Product.salePrice
```

Do not immediately delete `price`.

Design it as:

```text
EXPAND
price
basePrice
salePrice

      ↓

MIGRATE
backfill basePrice from price
update new code

      ↓

VERIFY
new reads/writes healthy
old processes gone

      ↓

CONTRACT
remove price in later migration
```

Then answer:

```text
Which tenant is the canary?
What is the target schema version?
What if Tenant 6 fails?
Is failure retryable?
How do you resume?
What compatibility matrix must pass?
What backup evidence is required?
```

If you can answer those questions, you are thinking beyond "just Prisma."

---

# 64. Self-test

Try answering these yourself:

1. Why is migration harder with database-per-tenant?
2. What is the difference between tenant and platform migrations?
3. Why does Ferio track `TenantDatabase.schemaVersion`?
4. What is `TENANT_MIGRATION_REQUIRED` protecting?
5. Why are released migrations immutable?
6. What do migration checksums protect?
7. Why must fleet migration not happen on application startup?
8. What is a canary?
9. Why isn't canary success enough?
10. Why use bounded batches?
11. Why clamp concurrency server-side?
12. Why persist both success and failure?
13. Why does resume skip successful tenants?
14. What is a transient migration failure?
15. Why use retry backoff?
16. Why can't the whole fleet be one transaction?
17. What does failure isolation mean?
18. What does a failure threshold do?
19. Why must pause be durable?
20. What does `TENANT_MIGRATION_TIMEOUT_MS` do?
21. What is `lock_timeout` for?
22. What is `statement_timeout` for?
23. Explain expand → migrate → contract.
24. Why are destructive changes delayed?
25. Why must workers be included in compatibility planning?
26. Why is forward-fix often preferred?
27. What is MT-11's backup evidence gate?
28. Why is actual backup execution an MT-12 concern?
29. Why must migration targets come from the trusted registry?
30. Why use BullMQ?
31. What is the difference between a migration run and result?
32. What is an ambiguous migration outcome?
33. Why is exactly-once a weak mental model here?
34. What is schema drift?
35. Why does CI create multiple disposable tenant databases?
36. Why intentionally inject a failing tenant?
37. What MT-11 checklist item remains open?
38. Is the formal MT-11 gate complete?

---

# 65. Five sentences to memorize

> **Ferio has one canonical tenant schema but many physical tenant databases.**

> **Fleet migration follows canary → bounded batches → fleet.**

> **Every tenant result must be durable so partial failure, retry, and resume are safe.**

> **Breaking database changes should use expand → migrate → contract.**

> **If Ferio cannot safely use a tenant's schema, it fails closed instead of silently routing the request.**

---

# 66. Final architecture picture

```text
                  PLATFORM ADMIN
                        │
                  Start migration
                        ▼
                 CONTROL PLANE
              TenantMigrationRun
                        │
                        ▼
                     BullMQ
                        │
                        ▼
              Migration Orchestrator
                        │
               ┌────────┴────────┐
               ▼                 ▼
            Canary          Bounded batches
               │                 │
               ▼                 ▼
         Tenant DB A      Tenant DB B/C/D...
               │                 │
               └────────┬────────┘
                        ▼
               Health + versions
                        │
                        ▼
               Migration Results
                        │
                        ▼
             pause / retry / resume
```

Normal application traffic separately follows:

```text
Tenant Host
    ↓
Resolver
    ↓
Schema compatible?
 ├── YES → TenantContext → correct tenant DB
 └── NO  → TENANT_MIGRATION_REQUIRED
```

Together, those two diagrams explain MT-11.

---

# 67. Next document

**Document 12 — Backup, Restore, Export, Closure & Disaster Recovery (MT-12)**

MT-11 answers:

> How do we safely change a fleet of tenant databases?

MT-12 asks:

> What happens when a tenant database is lost, corrupted, restored, exported, closed, or deleted?

That next lesson moves into:

```text
backups
PITR
RPO
RTO
restore
restore verification
tenant export
closure retention
deletion
disaster recovery
```

And one of the most important production lessons:

> **A backup is not truly trusted until restore has been proven.**