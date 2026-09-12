# Ferio Engineering Learning Series
# Document 12 — Backup, Restore, Export, Closure & Disaster Recovery (MT-12)

> **Learning goal:** Understand how Ferio protects tenant data when databases are damaged, deleted, closed, or need to be recovered — explained simply enough for a beginner, but with production/SaaS engineering depth.

---

# 1. Why MT-12 exists

MT-11 taught us how to **change** hundreds of tenant databases safely.

MT-12 asks a more serious question:

> **What happens when something goes wrong with the data itself?**

Examples:

```text
database accidentally deleted
database corrupted
bad migration damages data
cloud region/provider incident
operator mistake
tenant asks to close account
tenant needs an export
backup exists but cannot be restored
```

Ferio uses database-per-tenant isolation:

```text
Control Plane DB

Tenant A DB
Tenant B DB
Tenant C DB
...
```

This gives Ferio a major recovery advantage:

> Tenant A should be recoverable independently without overwriting Tenant B.

But that only works if backup and restore are deliberately engineered.

---

# 2. Baby analogy: school notebooks

Imagine every tenant owns a notebook.

```text
ABC Store notebook
XYZ Store notebook
Perfect Textile notebook
```

Ferio also has one school office notebook:

```text
Control Plane
```

A backup is a safe copy of a notebook.

A restore means:

> Take the safe copy and rebuild a usable notebook from it.

A serious system must answer:

```text
Do we have the copy?
How old is it?
Can we actually open it?
Can we restore only ABC Store?
Can we prove the restored notebook is correct?
What happens to photos/files?
What happens to money records?
```

That is MT-12.

---

# 3. Backup is not the same as restore

This distinction is fundamental.

```text
BACKUP
Production DB
    ↓
Recovery copy
```

versus:

```text
RESTORE
Recovery copy
    ↓
Usable PostgreSQL database
```

A system can successfully create backups every day and still have a broken restore process.

Therefore:

> **Backup existence is evidence of a copy. Restore testing is evidence of recoverability.**

This is why MT-12's restore gate matters so much.

---

# 4. What must Ferio protect?

There are several categories.

## 4.1 Control Plane data

Examples:

```text
Organizations
TenantDatabase registry
Domains
Plans
Subscriptions
SaaS billing
Usage
Platform audit
Migration state
Support-access evidence
```

## 4.2 Tenant database data

Examples:

```text
Products
Inventory
Customers
Orders
Payments
Wallet
Returns
CommerceSettings
Delivery configuration
```

## 4.3 Object/media data

Examples:

```text
product images
logos
uploaded files
documents
```

These may live in object storage rather than PostgreSQL.

## 4.4 External/integration state

Examples:

```text
payment provider configuration
courier credentials
notification integrations
```

Some of this may be encrypted inside a tenant database, while some recovery behavior depends on external providers.

So "restore the PostgreSQL database" is not automatically equivalent to:

> "The whole tenant is operational again."

---

# 5. RPO — how much data can we lose?

Ferio's current requirement defines:

```text
RPO ≤ 1 hour
```

RPO means:

> **Recovery Point Objective**

Baby version:

> If the database dies, how far back in time might we have to go?

Suppose:

```text
failure occurs at 15:00
latest recoverable point is 14:20
```

Data-loss window:

```text
40 minutes
```

That satisfies a 1-hour RPO.

But:

```text
failure = 15:00
latest recovery point = 12:00
```

means:

```text
3 hours potentially lost
```

which violates the target.

Remember:

> **RPO measures acceptable data-loss time.**

---

# 6. RTO — how long can recovery take?

Ferio's current requirement defines:

```text
RTO ≤ 4 hours
```

RTO means:

> **Recovery Time Objective**

Baby version:

> After disaster happens, how long can the service take to become usable again?

Example:

```text
Incident: 10:00
Recovered: 12:30

Recovery time = 2.5 hours
```

This fits the 4-hour target.

Remember:

```text
RPO = how much recent data may be lost
RTO = how long recovery may take
```

---

# 7. RPO and RTO are not backup frequency alone

A common mistake is:

```text
"We back up hourly, therefore our RPO/RTO are solved."
```

Not necessarily.

An hourly backup might support the RPO.

But RTO also depends on:

```text
backup discovery
download/restore speed
database size
credential access
DNS/routing changes
schema verification
media verification
financial reconciliation
operator procedure
```

If restoring takes eight hours, a four-hour RTO is missed even if backups are perfect.

---

# 8. PITR — Point-in-Time Recovery

A mature managed PostgreSQL service often supports **PITR**.

PITR means recovering the database to a selected time.

Example:

```text
14:00 healthy
14:37 destructive mistake
14:45 incident discovered
```

Instead of restoring only a midnight snapshot, PITR may allow recovery close to:

```text
14:36
```

Conceptually, PostgreSQL recovery often combines:

```text
base backup
+
transaction/WAL history
=
point-in-time recovery
```

The exact production mechanism depends on Ferio's final managed PostgreSQL provider.

And this is important:

> **PO-012 has selected the managed PostgreSQL backup/PITR direction, but
> provider scheduling, PITR execution, and production recovery evidence are
> still deployment-owned.**

So PITR is the architectural target/category to understand, not a capability we should falsely claim is already operational in Ferio.

---

# 9. Current backup status: important reality check

MT-12 is not production-operations complete, but the current checklist marks
the application-side backup, evidence, alert, credential-safety, and local
restore controls complete. The remaining provider-owned work is:

```text
[ ] Execute managed-provider scheduling/PITR in the selected deployment
[ ] Prove production recovery and provider-side restore evidence
```

What is already defined:

```text
RPO ≤ 1 hour
RTO ≤ 4 hours
initial backup retention = 30 days
```

Legal or plan-specific retention extensions remain an operations-policy follow-up.

This distinction is critical:

> Ferio has recovery objectives, application-side backup/restore tooling, and
> local drill evidence; managed-provider scheduling/PITR and production
> recovery proof remain open.

---

# 10. Backup retention

The current Ferio requirement sets initial backup retention to:

```text
30 days
```

Retention answers:

> How long do we keep recovery points?

If today is September 30, a simple 30-day policy may preserve recovery material back into roughly early September, depending on the provider's exact retention semantics.

Longer retention may eventually depend on:

```text
legal obligations
financial requirements
tenant plan
enterprise contract
operational policy
```

Do not confuse:

```text
backup retention
```

with:

```text
closed-tenant retention
```

They are different concepts.

---

# 11. Backup retention vs closure retention

Ferio currently has two important time periods.

### Backup retention

```text
30 days initially
```

This concerns recovery copies.

### Tenant closure recovery window

```text
90 days
```

This concerns a business that is intentionally being closed.

So:

```text
Backup retention ≠ closure retention
```

They solve different problems.

---

# 12. Every tenant database needs protection

Database-per-tenant means the backup architecture must cover:

```text
Control Plane
Tenant A
Tenant B
Tenant C
...
```

It is not enough to protect only the Control Plane.

The Control Plane might know:

```text
ABC Store exists
ABC database registry ID = xyz
```

while ABC's actual:

```text
orders
customers
inventory
wallet
```

could still be lost if its tenant PostgreSQL database has no recovery path.

Likewise, tenant DB backups alone do not replace a Control Plane backup.

Both planes matter.

---

# 13. Central backup evidence

A production operator should be able to answer:

```text
When was Control Plane last backed up?
When was Tenant A last backed up?
Did it succeed?
How old is the latest recovery point?
Does it satisfy RPO?
When was restore last verified?
```

This is why the checklist calls for centrally tracked backup evidence/status.

Conceptually:

```text
BackupEvidence
├── resource
├── backup/recovery point
├── status
├── createdAt
├── verifiedAt
└── provider-safe metadata
```

The exact schema should come from the implementation once built.

The principle is:

> Recovery evidence must be observable, not assumed.

---

# 14. Stale backup alerts

Suppose RPO is one hour.

Latest backup/recovery evidence:

```text
3 hours old
```

Even if the last backup technically succeeded, recovery protection is now stale relative to policy.

Ferio therefore needs alerting for:

```text
backup failed
backup missing
backup too old
recovery protection degraded
```

Application-side stale/failed-backup alert emission is checked; external
notification routing and provider-side retention remain deployment work.

---

# 15. Backup credentials are highly sensitive

Backup systems may have credentials capable of:

```text
reading entire databases
writing recovery storage
restoring databases
accessing snapshots
```

These credentials can be more dangerous than ordinary application credentials.

They must not be:

```text
logged
returned to browsers
stored in source code
placed in screenshots
included in audit detail
```

Application helpers already protect backup credentials through operator-
provided environment/CLI-profile inputs, restrictive file permissions, and
secret-free evidence. Provider secret-manager selection and rotation remain
production deployment work.

---

# 16. Restore is where backup claims become real

Imagine Platform Admin says:

```text
Backup: SUCCESS
```

That is useful.

But the real question is:

> Can Ferio turn that backup into a working isolated database?

MT-12 therefore requires restore exercises.

A serious restore test is not:

```text
"provider dashboard says snapshot available"
```

It is:

```text
take recovery source
      ↓
create isolated restore target
      ↓
restore
      ↓
connect
      ↓
verify schema
      ↓
verify data/invariants
      ↓
record evidence
```

---

# 17. Restore Control Plane separately

The checklist records the local control-plane restore drill:

```text
[x] Restore Control Plane to isolated environment
```

Why isolated?

You do not want a restore drill to overwrite production.

Safe conceptual flow:

```text
Production Control Plane
         ↓ backup
Recovery source
         ↓
NEW isolated PostgreSQL
         ↓
verification
```

Never:

```text
restore drill
    ↓
overwrite production
```

---

# 18. Restore one tenant independently

This is the defining database-per-tenant recovery requirement.

Suppose only Tenant B is damaged.

Desired:

```text
Tenant A → untouched
Tenant B → restored independently
Tenant C → untouched
```

Not:

```text
restore entire SaaS fleet because one tenant broke
```

The current MT-12 gate specifically requires proof that one tenant can be restored independently from backup.

The application-level gate is checked by the recorded local PostgreSQL
restore drill; managed-provider recovery evidence remains open.

---

# 19. Ferio already has one restore safety guard

The current restore helper requires a **new** database named in the `restore_drill_*` pattern and refuses an existing target.

Conceptually:

```text
backup
  ↓
restore_drill_abc_20260909
```

instead of:

```text
backup
  ↓
abc_production_db   ← dangerous overwrite
```

This is a strong safety pattern:

> **Restore into isolation first. Verify before replacement/cutover.**

---

# 20. Why restore should not overwrite another tenant

Imagine a typo:

```text
Restore Tenant A backup
Target = Tenant B database
```

That could destroy Tenant B.

Ferio's restore helper refusing an existing target reduces this class of disaster.

A restore operation should be conservative because recovery tooling itself can cause catastrophic damage.

---

# 21. Verify schema after restore

The current helper requires a completed:

```text
_prisma_migrations
```

row and prints the restored migration name.

Why?

A restored database must have a known schema history.

Suppose the current app expects:

```text
v48
```

but the restored database is:

```text
v43
```

You cannot simply route production traffic to it.

The recovery flow must determine:

```text
restored version
        ↓
compatible?
        ↓
migration required?
```

Restore and migration orchestration therefore interact.

---

# 22. Restore does not mean immediately activate

A safe restore sequence is conceptually:

```text
Restore backup
    ↓
Isolated database
    ↓
Schema verification
    ↓
Data verification
    ↓
Media/reference verification
    ↓
Financial reconciliation
    ↓
Application smoke test
    ↓
Operational approval
    ↓
Controlled cutover
```

Do not jump directly from:

```text
pg_restore finished
```

to:

```text
send customer traffic here
```

---

# 23. Object/media references

Tenant databases may contain references to objects such as:

```text
tenants/org_abc/products/photo.jpg
```

The PostgreSQL restore can be correct while the corresponding object is:

```text
missing
deleted
inaccessible
wrongly scoped
```

The current MT-12 tooling verifies tenant-prefixed media references with
read-only provider `head-object` checks. Provider credentials and live bucket
availability remain operator-managed.

A full tenant recovery must reason about both:

```text
database state
+
object storage state
```

---

# 24. Why tenant-prefixed object keys help recovery

Ferio's object-storage model uses tenant-scoped paths such as:

```text
tenants/{organizationId}/...
```

That gives operations a clear ownership boundary.

Conceptually:

```text
Tenant A DB
   ↕
tenants/org_a/*

Tenant B DB
   ↕
tenants/org_b/*
```

This helps:

- isolation,
- export,
- recovery,
- deletion,
- forensic verification.

But PostgreSQL backup does not automatically prove object storage is healthy.

---

# 25. Financial verification after restore

Commerce databases contain financially sensitive state:

```text
orders
payments
refunds
wallet entries
COD state
settlements/reconciliation evidence
```

Suppose a restored DB says:

```text
Payment = SUCCESS
```

while external provider reality says something else.

Recovery may therefore require reconciliation.

The current checklist marks financial ledger/reconciliation verification
complete for the local restore contract. Provider settlement verification
remains deployment work.

---

# 26. Database truth vs external truth

Some systems are fully internal.

Payments are not.

You can have:

```text
Ferio tenant DB state
        ↓
payment provider state
```

During disaster recovery, they may need to be reconciled.

For example:

```text
DB restored to 14:30
payment provider processed payment at 14:45
```

If RPO permits losing that DB event, the external provider may still know the payment occurred.

So recovery cannot blindly assume:

> Restored database = complete financial truth.

External systems may need replay/reconciliation.

---

# 27. DNS/domain behavior during DR

The checklist still requires documentation of:

```text
DNS/domain behavior during disaster recovery
```

Why?

Suppose the restored tenant database is healthy in an isolated environment.

How does traffic eventually reach it?

Potential layers include:

```text
hostname
DNS
Cloudflare/ingress
TenantDomain
TenantDatabase registry
connection manager
application readiness
```

Recovery needs a controlled cutover story.

Do not casually repoint traffic before verification.

---

# 28. Restore drill

The checklist records the completed local drill:

```text
[x] Perform and record restore exercise
```

A restore drill proves the process under controlled conditions.

A good drill records:

```text
which backup/recovery point
which tenant
start time
restore target
schema version
verification results
problems found
finish time
actual recovery duration
```

This helps determine whether Ferio can truly meet:

```text
RTO ≤ 4 hours
```

---

# 29. Why a runbook alone is insufficient

A document can say:

```text
Step 1 restore
Step 2 verify
Step 3 cut over
```

But reality may reveal:

```text
missing permission
wrong provider command
slow restore
missing media
unknown credentials
DNS issue
schema mismatch
```

A drill turns theoretical recovery into evidence.

The senior rule is:

> **Recovery capability must be exercised.**

---

# 30. Tenant export

Closure and backup are different from tenant export.

A backup is designed primarily for Ferio recovery.

An export is designed to package tenant-owned/required data according to policy.

Possible categories include:

```text
business data
financial/audit data
media
```

The current Ferio export package is defined and implemented as an operator
workflow.

The checklist currently says:

```text
[x] Define export package
[x] Export tenant business data
[x] Export audit/financial data according to policy
[x] Export media where required
```

Do not invent a final export format until the project defines it.

---

# 31. Backup is not a customer export

A raw PostgreSQL dump is not automatically a good tenant export.

Why?

It may contain:

```text
internal IDs
implementation details
encrypted credentials
system metadata
data outside intended portability scope
```

An export should have an explicit contract:

```text
what is included
what is excluded
format
security
retention
delivery mechanism
audit evidence
```

That contract remains to be defined in MT-12.

---

# 32. Tenant closure lifecycle

Ferio already has a substantial closure flow.

The approved policy defines:

```text
90-day recoverable closure window
```

followed by deletion only when legal/financial retention permits.

Conceptually:

```text
ACTIVE
  ↓
closure initiated
  ↓
CLOSURE_PENDING
  ↓
90-day recoverable window
  ↓
eligible finalization
  ↓
CLOSED / registry retirement
  ↓
physical deletion when policy/infrastructure permit
```

The closure service enforces the recovery window and requires explicit acknowledgement.

---

# 33. Why closure is not immediate deletion

Suppose a tenant owner accidentally requests closure.

Immediate destruction:

```text
click close
   ↓
database deleted forever
```

is too dangerous.

A recovery window gives time for:

```text
mistake correction
business/legal review
export
financial settlement
support intervention
```

Ferio's current policy uses 90 days.

---

# 34. Domain revocation happens early

When closure reaches `CLOSURE_PENDING`, Ferio disables every organization domain.

Why?

A closed business should not continue serving normal storefront traffic.

It also protects against domain takeover/reassignment problems.

Conceptually:

```text
Tenant closure initiated
        ↓
CLOSURE_PENDING
        ↓
all tenant domains disabled
        ↓
resolver fails closed
```

The checklist marks this implemented.

---

# 35. Prevent domain takeover

Suppose:

```text
shop-a.example.com
```

belonged to a closing tenant.

A dangerous lifecycle would free it too casually while old caches/records still exist.

Ferio's closure/domain design preserves disabled state and fail-closed behavior.

The current checklist marks prevention of domain takeover after closure as complete.

---

# 36. Scheduled jobs during closure

A closing tenant should not continue receiving normal background operations forever.

Ferio already reduces this risk because tenant fan-out and retention sweeps select only:

```text
READY tenant databases
owned by ACTIVE organizations
```

The current checklist marks the safety contract as **DONE**: new tenant
fan-out work is restricted to READY databases owned by ACTIVE organizations,
and targeted queued work fails closed before tenant-client acquisition when an
organization is closed or unavailable. Redis queue deletion is intentionally
not required for this safety contract.

This distinction is subtle and important:

```text
don't schedule NEW work
```

is not identical to:

```text
cancel/reject OLD queued work
```

---

# 37. Jobs need revalidation at execution time

A robust job architecture should not assume:

> The tenant was ACTIVE when this job was enqueued, therefore it is still ACTIVE now.

Example:

```text
09:00 job queued for Tenant A
09:05 tenant closure begins
09:10 worker executes job
```

The worker should re-establish trusted tenant/lifecycle state before sensitive work.

This is the same principle we used for migration pause:

> **Long-lived asynchronous work must re-check authoritative state.**

---

# 38. Close database connections

The current closure flow marks this capability complete.

Once a tenant database registry becomes:

```text
RETIRED
```

the connection manager refuses it.

Ferio also has graceful disconnect behavior.

Conceptually:

```text
Tenant DB registry → RETIRED
        ↓
TenantDatabaseManager
        ↓
refuse new acquisition
        ↓
close/disconnect existing managed client
```

This prevents a closed tenant from remaining accidentally reachable through a warm Prisma client.

---

# 39. Why connection retirement matters

Imagine:

```text
Tenant A closed
registry retired
```

but the application still has a cached Prisma client.

If the connection manager ignores registry state:

```text
old client
   ↓
database still reachable
```

The logical closure would not match runtime reality.

Therefore lifecycle state must influence connection acquisition.

---

# 40. Archive/delete is only partial

Ferio has implemented important policy controls:

```text
90-day recoverable window
finalize refuses early deletion
operator override/acknowledgement controls
registry retirement
CLOSED transition
```

But physical destruction is still waiting on the final hosting/provider decision.

So the current state is:

```text
logical lifecycle + safety policy = substantial implementation
physical DB destruction automation = not final
```

Do not claim the database is physically deleted merely because the registry is retired.

---

# 41. Logical deletion vs physical destruction

These are different.

### Logical closure

```text
organization CLOSED
domains disabled
registry RETIRED
connection refused
jobs excluded
```

### Physical destruction

```text
actual managed PostgreSQL database deleted
storage destroyed according to provider/policy
```

A SaaS system must know which statement is true.

Audit/UI language should not say:

```text
"database permanently deleted"
```

if only logical retirement occurred.

---

# 42. Integration credentials on closure

The checklist records this control as complete:

```text
[x] Revoke integration credentials
```

Why?

A closed tenant may have credentials for:

```text
payment provider
courier
email/SMS
other integrations
```

Closing Ferio access does not necessarily revoke external-provider credentials.

A complete closure process must define what:

```text
disable
revoke
delete
retain
```

means for each integration.

---

# 43. Preserve platform billing/audit evidence

The current checklist marks preservation of required platform billing/audit evidence complete.

Why preserve anything after closure?

Because some records may need to survive tenant commerce shutdown for:

```text
financial accounting
security investigations
support evidence
legal requirements
SaaS billing history
auditability
```

Deletion policy should never mean:

> Delete absolutely everything without classification.

---

# 44. Data classification matters

A mature closure policy classifies data.

For example:

```text
tenant operational data
tenant financial records
platform SaaS billing
security/audit evidence
object/media data
integration secrets
backups
```

Each category may have a different:

```text
retention period
deletion trigger
legal basis
export requirement
recovery rule
```

This is why closure/deletion is a policy problem as much as a database problem.

---

# 45. Disaster recovery

Disaster recovery, or **DR**, asks:

> How does Ferio recover from a serious incident affecting production infrastructure?

Examples:

```text
managed PostgreSQL outage
region failure
Control Plane loss
tenant DB corruption
operator destroys a DB
storage incident
major deployment damages data
```

DR combines:

```text
backup
restore
infrastructure
DNS/routing
secrets
application deployment
verification
incident procedure
```

It is broader than `pg_restore`.

---

# 46. Tenant-specific disaster vs platform disaster

These are different incidents.

### Tenant-specific

```text
Tenant B DB corrupted
```

Desired blast radius:

```text
A works
B recovery mode
C works
```

### Platform-wide

```text
Control Plane unavailable
```

This can affect tenant resolution and SaaS management across the platform.

Database-per-tenant reduces some blast radius, but the Control Plane remains a critical shared dependency.

Recovery plans must cover both.

---

# 47. Fail closed during uncertain recovery

Suppose Ferio is not sure whether Tenant B's restored DB is correct.

Unsafe:

```text
"Probably fine — route customers."
```

Safe:

```text
keep tenant unavailable
verify
then activate
```

The recurring Ferio rule still applies:

> **Uncertain tenancy/data integrity should fail closed.**

Availability is important, but serving incorrect financial/customer data can be worse than temporary unavailability.

---

# 48. Restore verification layers

A strong restore process verifies several layers.

```text
Layer 1 — database connects
Layer 2 — migration/schema state valid
Layer 3 — critical tables/data exist
Layer 4 — tenant identity matches expected tenant
Layer 5 — media/object references valid
Layer 6 — financial invariants reconcile
Layer 7 — application smoke tests pass
Layer 8 — routing/cutover is safe
```

MT-12 currently has only part of this proven.

That is why the restore gate remains open.

---

# 49. Tenant identity verification after restore

Imagine restoring:

```text
Tenant A backup
```

into:

```text
restore_drill_a
```

Before cutover, operations should be able to prove:

```text
this is actually Tenant A's data
```

not merely:

```text
PostgreSQL opened successfully
```

Useful evidence may come from trusted expected identifiers/configuration and known tenant-specific records.

The exact verification mechanism should follow Ferio's implementation rather than being invented casually.

---

# 50. Financial invariants

A restore may need checks such as:

```text
wallet ledger consistency
payment/order relationship
refund state
settlement/reconciliation state
```

The exact financial invariants depend on Ferio's commerce model.

The current checklist records financial ledger/reconciliation verification as
complete for the local restore contract; provider settlement verification
remains deployment work.

This is appropriate because financial correctness needs deliberate tests rather than generic "row count looks okay."

---

# 51. Recovery and migrations interact

Suppose production is on schema:

```text
v50
```

but a 10-day-old backup restores:

```text
v47
```

The recovery process may need:

```text
restore v47
    ↓
verify backup
    ↓
run canonical migrations v48-v50
    ↓
verify
    ↓
application smoke test
```

This is why MT-11's migration orchestration and MT-12's restore verification are connected.

Recovery does not freeze schema evolution.

---

# 52. Recovery and object storage interact

Suppose database backup time:

```text
14:30
```

but object storage has current state at:

```text
15:00
```

You can get mismatches:

```text
DB references object that no longer exists
object exists but restored DB has no row
```

A full recovery strategy must define how database and object-storage recovery points relate.

The current Ferio checklist records media-reference verification as complete
through the read-only tenant-media verification script.

---

# 53. Recovery and queues interact

After restoring a tenant, old queued jobs may still exist.

Imagine:

```text
old payment reconciliation job
old courier sync job
old notification job
```

If blindly replayed, they may act on recovered state incorrectly.

A mature DR procedure must consider:

```text
queue pause
job deduplication
tenant lifecycle state
idempotency
reconciliation
```

This is another reason background work must remain tenant-scoped and state-aware.

---

# 54. Recovery and caches interact

Suppose Tenant A is restored and receives a new database registry target.

Old caches may still contain:

```text
old domain resolution
old readiness
old settings
old application data
```

A controlled cutover should invalidate/rebuild relevant caches.

Never let:

```text
new restored DB
+
stale old cache
```

create inconsistent customer behavior.

---

# 55. Recovery and connection pools interact

The `TenantDatabaseManager` may have a cached Prisma client pointing to the old database.

A recovery/cutover process must ensure:

```text
old client retired/disconnected
registry updated safely
new client acquired from trusted registry
```

Otherwise the Control Plane could say "restored" while application workers still talk to the old target.

---

# 56. Recovery should use an isolated target first

The safest mental model is:

```text
PRODUCTION TENANT DB
        │
      backup
        │
        ▼
 recovery source
        │
        ▼
NEW isolated restore DB
        │
        ├── schema check
        ├── data check
        ├── media check
        ├── finance check
        └── smoke test
        │
        ▼
approved?
 ├── NO → investigate
 └── YES
        ↓
controlled cutover
```

This dramatically reduces the risk of recovery tooling damaging production.

---

# 57. What should a restore drill measure?

At minimum, a useful drill should produce evidence for:

```text
start time
recovery point selected
restore start
restore finish
verification finish
problems encountered
final readiness
```

Then calculate:

```text
actual recovery duration
```

Compare it with:

```text
RTO ≤ 4h
```

Also inspect the recovery point age against:

```text
RPO ≤ 1h
```

Objectives become meaningful only when measured.

---

# 58. Closure flow in detail

A simplified Ferio closure journey is:

```text
Tenant ACTIVE
    ↓
Operator/authorized closure action
    ↓
reason + acknowledgement
    ↓
CLOSURE_PENDING
    ↓
domains disabled
    ↓
normal tenant activity blocked
    ↓
90-day recoverable period
    ↓
retention/legal checks
    ↓
finalization
    ↓
TenantDatabase registry RETIRED
    ↓
organization CLOSED
    ↓
physical destruction when provider/policy allow
```

This flow is deliberately slower than a simple DELETE button.

---

# 59. Why explicit acknowledgement matters

Permanent lifecycle actions are dangerous.

A safe control plane should make the operator explicitly acknowledge the consequence before finalization.

This reduces accidental destructive operations.

The current closure service requires explicit acknowledgement and enforces the retention window.

---

# 60. Operator override is dangerous

Sometimes an exceptional situation may require overriding a normal waiting period.

If an override exists, it should be:

```text
permissioned
explicit
reason-required
audited
rare
```

An override should not silently become the normal path.

Operational escape hatches require stronger evidence than ordinary actions.

---

# 61. Closure is a saga, not one SQL transaction

Closing a tenant affects multiple systems:

```text
Control Plane organization
domains
tenant DB registry
Prisma connection pool
jobs
integration credentials
object storage
physical DB provider
billing/audit retention
```

There is no one transaction across all of them.

So closure behaves like a distributed saga/state machine.

Each step needs:

```text
durable state
idempotency
retry
safe partial failure
audit
```

This is similar to provisioning, migration orchestration, and payment workflows.

---

# 62. Example partial closure failure

Suppose:

```text
organization → CLOSURE_PENDING
domains → disabled
registry → not yet retired
integration revocation → provider outage
```

You cannot simply say:

```text
closure = false
```

The system is already partially changed.

A robust workflow records what completed and what remains.

This is why long-running lifecycle operations should be explicit state machines.

---

# 63. Do not physically delete too early

Imagine:

```text
Day 0: closure requested
Day 1: physical DB deleted
```

But policy says:

```text
90-day recoverable window
```

That violates the intended recovery promise.

Ferio currently refuses normal finalization inside the window unless the explicit override conditions are satisfied.

Physical destruction itself remains provider-dependent/open.

---

# 64. Deletion must respect legal/financial retention

After 90 days, deletion is not automatically mandatory if another policy requires preservation.

The approved rule is essentially:

```text
90-day recoverable closure window
+
delete afterward only when
legal/financial retention permits
```

This prevents the product lifecycle from overriding compliance/financial obligations.

---

# 65. Platform evidence can outlive tenant commerce data

A closed tenant's operational database may eventually be destroyed while Ferio still preserves bounded platform records such as:

```text
SaaS billing evidence
security audit
closure audit
required legal evidence
```

This is not necessarily a contradiction.

The data belongs to different retention categories and planes.

---

# 66. Security: backups are copies of sensitive production data

A backup can contain:

```text
customer names
addresses
orders
payment metadata
wallet data
configuration
encrypted integration credentials
```

So backups must receive production-grade security.

Think:

```text
encryption
access control
least privilege
credential rotation
audit
retention/deletion
isolated restore
```

A backup is not "just a file."

---

# 67. Security: restore environments

A restore drill can accidentally create a new copy of production-sensitive data.

Therefore isolated restore environments should be controlled.

Questions include:

```text
Who can access it?
Is network access restricted?
How long is it retained?
Are secrets exposed?
How is it destroyed after the drill?
Can it send real notifications?
Can it call real payment/courier providers?
```

A restored database should not accidentally become a second live tenant.

---

# 68. Disable dangerous side effects in restore drills

Imagine restoring Tenant A into a test environment and then starting all workers.

Danger:

```text
send real emails
call real courier API
attempt real payment reconciliation
send webhooks
```

Recovery drills should isolate or disable external side effects unless a specific controlled verification requires them.

The exact Ferio drill implementation remains to be completed, but this is an important production principle.

---

# 69. Security: exports

Tenant exports can contain sensitive business/customer data.

A safe export process eventually needs:

```text
authorization
tenant binding
bounded scope
secure storage
expiration
audit
safe delivery
```

Never let:

```text
tenantId in browser payload
```

select another organization's export.

The trusted TenantContext/Control Plane authorization rules still apply.

---

# 70. Export and cross-tenant isolation

A powerful export test would use overlapping IDs:

```text
Tenant A order ID = 123
Tenant B order ID = 123
```

Request Tenant A export.

Expected:

```text
only Tenant A's order 123
```

The same database-per-tenant isolation principles from MT-7 continue here.

The export implementation is present; this remains a testing principle for
future export extensions rather than a claim that external side effects are
automatically orchestrated during every closure.

---

# 71. Disaster scenario: one tenant corrupted

Example:

```text
Tenant B bad migration/data corruption
```

Desired incident flow:

```text
isolate B
keep A/C healthy
identify recovery point
restore B to isolated DB
verify schema/data/media/finance
migrate if necessary
reconcile external systems
retire old connection
controlled registry/cutover
invalidate caches
smoke test
resume B
record incident
```

This is the promise database-per-tenant should eventually deliver.

---

# 72. Disaster scenario: Control Plane lost

This is more serious because tenant routing depends on Control Plane truth.

Possible impact:

```text
hostname resolution
tenant registry
subscriptions
entitlements
Platform Admin
support access
migration state
```

The checklist still requires an isolated Control Plane restore test.

A full DR design must establish how the platform recovers this shared dependency without inventing or corrupting tenant registry state.

---

# 73. Disaster scenario: accidental tenant deletion

Suppose an infrastructure operator accidentally destroys Tenant C's database.

A mature system should not depend on:

```text
"Maybe someone has a dump on their laptop."
```

It needs:

```text
known backup evidence
known recovery point
documented restore procedure
isolated restore
verification
measured RTO
audited cutover
```

That is why MT-12 is a production gate, not optional polish.

---

# 74. Disaster scenario: bad data write discovered late

Suppose a bug corrupts orders gradually over two hours.

A simple "latest backup" may already contain corrupted data.

PITR can help choose a point before corruption, but then newer legitimate events may need reconciliation.

Recovery becomes:

```text
choose clean point
restore
identify lost legitimate events
reconcile/replay where possible
verify financial state
```

DR is often a business-data problem, not merely infrastructure restoration.

---

# 75. RPO does not guarantee zero data loss

Ferio's RPO target is:

```text
≤ 1 hour
```

That explicitly means some incidents may allow a bounded amount of recent data loss.

If the business later requires:

```text
near-zero financial loss
```

additional replication/reconciliation architecture may be necessary.

Never translate:

```text
RPO 1 hour
```

into:

```text
zero data can ever be lost
```

Those are different promises.

---

# 76. RTO does not mean every incident resolves in four hours automatically

RTO is an objective.

Meeting it requires:

```text
automation
tested runbooks
permissions
trained operators
fast restore
known dependencies
observability
practice
```

Until Ferio performs restore exercises, the four-hour target is a requirement rather than proven operational performance.

---

# 77. Backup freshness should become a release/operations signal

Imagine:

```text
Tenant A latest recovery point = 20 min old
Tenant B latest recovery point = 6 hours old
```

Tenant B violates the 1-hour objective.

A mature operations system should surface this before an incident.

Centralized evidence and stale-backup alerts are implemented at the
application boundary; external notification routing and provider-side
retention remain deployment work.

---

# 78. Restore evidence should be durable

Just as migrations have durable results, restore drills should eventually preserve evidence.

Conceptually:

```text
RestoreExercise
├── source
├── target
├── tenant
├── recoveryPoint
├── startedAt
├── completedAt
├── schemaVerified
├── mediaVerified
├── financialVerified
└── outcome
```

The exact model is not claimed to exist yet.

The architectural lesson is:

> If restore readiness matters operationally, evidence should survive beyond a terminal session.

---

# 79. Backup evidence vs backup itself

Do not confuse:

```text
BackupEvidence row
```

with:

```text
actual recovery artifact
```

Metadata can say:

```text
lastBackupAt = now
```

while the provider backup could be inaccessible or corrupt.

Strong evidence should be derived from the real provider/recovery system and periodically validated by restore.

This is why "track backup status centrally" and "perform restore exercise" are separate requirements.

---

# 80. Recovery observability

Useful future recovery signals could include:

```text
backup_age_seconds
backup_failure_count
restore_duration_seconds
restore_verification_failure
recovery_point_age
tenant_restore_drill_success
```

Labels must remain bounded to avoid observability-cardinality problems.

Never include secrets in metrics.

The exact MT-12 metric set should follow implementation decisions rather than being invented as already complete.

---

# 81. Closure observability

Operators should be able to answer:

```text
Which tenants are CLOSURE_PENDING?
When does the recovery window end?
Which domains were disabled?
Has DB registry been retired?
Are jobs still queued?
Were integrations revoked?
Is physical deletion pending?
What evidence must be retained?
```

This turns closure from a hidden script into an operable lifecycle.

---

# 82. Recovery should be boring

This is a useful engineering goal.

During a real incident, operators are already under pressure.

Recovery should not require inventing commands in real time.

The desired experience is:

```text
known runbook
known permissions
known recovery source
known isolated target
known verification
known cutover
```

"Exciting" recovery usually means the system was not practiced enough.

---

# 83. A senior concept: backup is a control, restore is the proof

Security/reliability controls often have two layers:

```text
Control:
we create backups

Evidence:
we successfully restore and verify them
```

This is analogous to:

```text
Control:
we enforce tenant isolation

Evidence:
two-tenant overlapping-ID tests prove it
```

Ferio's engineering style should prefer demonstrable evidence over configuration claims.

---

# 84. Another senior concept: recovery has a blast radius

Different recovery actions have different blast radii.

```text
restore one tenant
→ small blast radius

restore Control Plane
→ platform-wide implications

change DNS globally
→ potentially huge blast radius

delete physical tenant DB
→ irreversible tenant impact
```

The higher the blast radius, the stronger the:

```text
authorization
confirmation
backup evidence
audit
verification
```

should be.

---

# 85. Another senior concept: destructive operations should be delayed

Ferio applies this pattern repeatedly:

```text
domain disable before reassignment
closure pending before deletion
registry retirement before physical destruction
expand before contract
restore into new DB before cutover
```

The shared idea is:

> **Prefer reversible intermediate states before irreversible actions.**

That is one of the strongest reliability patterns in the whole Ferio architecture.

---

# 86. Another senior concept: recovery truth crosses systems

A tenant is not only PostgreSQL.

A functioning tenant depends on:

```text
Control Plane registry
Tenant PostgreSQL
object storage
Redis/cache
BullMQ
DNS/TLS
external payment/courier systems
application version
secrets
```

Therefore DR verification must eventually cross system boundaries.

A database can be healthy while the tenant is still unusable.

---

# 87. Another senior concept: recovery is a security boundary

Restore tooling can:

```text
read entire tenant datasets
create database copies
change registry targets
possibly trigger cutover
```

So recovery APIs should not be treated like ordinary CRUD.

They need strong Platform Admin permissions and audit.

The exact final MT-12 control surface remains implementation work, but the risk model is already clear.

---

# 88. What not to do

## Never say:

```text
"We have backups, so DR is done."
```

Managed-provider restore has not been proven. A local PostgreSQL restore drill
is recorded, but it is not evidence of provider scheduling, PITR, or managed
production recovery.

## Never restore over production first

Use an isolated target.

## Never use another tenant's DB as a restore target

Tenant isolation still applies during disaster recovery.

## Never activate a restore only because PostgreSQL starts

Verify schema, data, media, financial state, and application behavior.

## Never physically destroy a tenant before retention policy allows

Closure is staged.

## Never assume stopping new jobs cancels already queued jobs

Queued-job deletion is not required by the current safety contract: targeted
work re-checks organization/registry readiness and fails closed before tenant
database acquisition.

## Never claim a retired registry means physical DB deletion

Physical destruction is still provider-dependent.

## Never treat a raw DB dump as the final customer export contract

Export requirements are separate.

## Never expose backup/restore credentials

Recovery infrastructure contains highly privileged secrets.

---

# 89. MT-12 implementation status

Based strictly on the current Ferio checklist:

## Backup

```text
RESOLVED-DIRECTION managed PostgreSQL backup/PITR strategy
DONE     RPO ≤ 1 hour defined
DONE     RTO ≤ 4 hours defined
DONE     Control Plane backup (local drill)
DONE     every-tenant DB backup tooling
DONE     central backup evidence/status
DONE     stale/failed backup alert emission
DONE     backup credential protection
DONE     initial 30-day retention defined
```

## Restore

```text
DONE     restore Control Plane in isolation (local drill)
DONE     independently restore one tenant from backup (local drill)
DONE     restore helper refuses existing target
DONE     restored schema/migration version verification
DONE     object/media verification tooling
DONE     financial ledger/reconciliation verification tooling
DONE     DNS/domain DR behavior documentation
DONE     performed + recorded local restore exercise
```

## Export / closure

```text
DONE     90-day recoverable closure policy
DONE     define export package
DONE     business-data export
DONE     audit/financial export
DONE     media export where required
DONE     domains safely revoked
DONE     integration credential revocation
DONE     scheduled-job safety / queued-work fail-closed behavior
DONE     DB connection retirement
PARTIAL  archive/delete physical DB
DONE     post-closure domain takeover prevention
DONE     required platform billing/audit preservation
```

---

# 90. MT-12 gate

The current MT-12 gate has two items.

### Still open

```text
[ ] Managed-provider backup/PITR execution and production restore evidence.
```

The application-level independent tenant restore gate is checked by the
recorded local PostgreSQL drill; provider-backed proof remains open.

### Complete

```text
[x] A documented closure flow exists before accepting production tenants.
```

The implemented closure flow covers:

```text
CLOSURE_PENDING
domain revocation
90-day retention-window refusal
explicit finalization acknowledgement
registry retirement
audit evidence
```

Therefore:

> **MT-12 is not complete yet.**

The closure side is substantially implemented, but real backup/restore operations remain a major production-readiness gap.

---

# 91. Baby-level summary

Ferio has many shops.

Each shop has its own database.

Ferio needs safe copies of those databases.

If one shop breaks, Ferio should restore only that shop.

It should first restore the copy somewhere safe, check it carefully, and only then use it.

If a shop closes, Ferio should not immediately destroy everything.

It gives the shop a recovery period, disables access safely, and only later performs final deletion when policy allows.

---

# 92. Junior-level summary

MT-12 covers:

```text
backup
PITR
RPO/RTO
restore
restore verification
tenant export
closure
retention
physical deletion
disaster recovery
```

Ferio's targets are:

```text
RPO ≤ 1 hour
RTO ≤ 4 hours
backup retention initially 30 days
closure recovery window 90 days
```

The production backup provider/PITR execution remains open; the independent
tenant restore proof is checked for the local drill and must be repeated
against the selected managed provider before production launch.

---

# 93. Mid-level summary

Database-per-tenant allows tenant-specific recovery but multiplies backup operations.

Recovery must cover:

```text
Control Plane
N tenant databases
object storage
financial/external reconciliation
routing
caches
queues
connection pools
```

Restore should happen into an isolated target, then pass layered verification before cutover.

Closure is a distributed lifecycle, not one SQL DELETE.

Logical retirement and physical destruction must remain distinct.

---

# 94. Senior-level summary

MT-12 is Ferio's data durability and destructive-lifecycle control layer.

Its key invariants should be:

1. Every critical PostgreSQL plane has a measurable recovery path.
2. Recovery points satisfy defined RPO.
3. Practiced recovery satisfies RTO.
4. Tenant restoration cannot overwrite another tenant.
5. Restore occurs in isolation before cutover.
6. Schema compatibility is verified after restore.
7. Media and external financial truth are reconciled.
8. Backup credentials remain outside normal application/client exposure.
9. Closure is reversible during its approved retention window.
10. Domains and runtime access are revoked before destruction.
11. Physical deletion cannot be confused with logical retirement.
12. Required audit/financial evidence survives according to policy.
13. Destructive operations require explicit authorization and evidence.
14. Recovery capability is proven through drills, not assumed from backup configuration.

At the current checkpoint, several of these remain operational work rather than completed implementation.

---

# 95. How to study MT-12 in the Ferio codebase

Search the repository in this order.

## 1. Policy decisions

Search:

```text
PO-012
PO-013
```

Understand:

```text
RPO
RTO
backup retention
closure retention
deletion conditions
```

## 2. Closure service

Search:

```text
TenantClosureService
```

Trace:

```text
initiateClosure
CLOSURE_PENDING
domain disable
retention enforcement
finalization
registry retirement
audit
```

## 3. Tenant lifecycle enums

Find:

```text
ACTIVE
CLOSURE_PENDING
CLOSED
RETIRED
```

Understand which belongs to organization state and which belongs to database-registry state.

## 4. Domain service/resolver

Trace what happens after closure disables domains.

Prove that a closed tenant cannot still resolve normally.

## 5. TenantDatabaseManager

Trace what happens when a registry becomes:

```text
RETIRED
```

Confirm acquisition is refused and clients are disconnected.

## 6. Restore helper

Search:

```text
restore_drill_
```

Understand:

```text
why new target is required
why existing target is refused
how migration version is verified
```

## 7. `_prisma_migrations`

Understand how the restore helper derives schema evidence.

## 8. Scheduled tenant fan-out

Find jobs that enumerate:

```text
READY databases
ACTIVE organizations
```

Then identify why already-queued job revocation remains incomplete.

## 9. Tests

Read closure tests for:

```text
retention refusal
domain revocation
explicit acknowledgement
registry retirement
domain takeover prevention
audit evidence
```

## 10. Open operations work

Do not confuse the application-side backup/restore helpers and local drill
with managed-provider backup automation; provider scheduling, PITR execution,
and production recovery evidence remain deployment-owned.

That is an important engineering habit:

> **Read implementation status before assuming architecture diagrams are deployed reality.**

---

# 96. Practical exercise: Tenant B corruption

Scenario:

```text
Tenant A healthy
Tenant B corrupted
Tenant C healthy
```

Design the recovery.

A strong answer should include:

```text
1. isolate Tenant B
2. keep A/C unaffected
3. identify trusted recovery point
4. restore B into a new isolated database
5. verify migration/schema version
6. verify tenant identity/data
7. verify object references
8. reconcile financial/external state
9. migrate restored DB if required
10. smoke-test application behavior
11. stop/validate stale queued jobs
12. retire old connection
13. update trusted registry through controlled operation
14. invalidate relevant caches
15. cut over
16. monitor
17. record restore evidence and actual RTO/RPO
```

Do not make "restore backup" the whole answer.

---

# 97. Practical exercise: tenant closure

Tenant owner requests permanent closure.

Design:

```text
ACTIVE
  ↓
authorize request
  ↓
record reason/acknowledgement
  ↓
CLOSURE_PENDING
  ↓
disable domains
  ↓
stop new tenant fan-out
  ↓
revoke queued work when capability exists
  ↓
prepare/export required data
  ↓
revoke integrations
  ↓
wait recovery window
  ↓
legal/financial retention check
  ↓
finalize
  ↓
retire DB registry
  ↓
close connections
  ↓
CLOSED
  ↓
physical destruction under provider policy
  ↓
preserve required platform evidence
```

This is much safer than:

```sql
DROP DATABASE tenant;
```

---

# 98. Self-test

Try answering without looking back:

1. What is the difference between backup and restore?
2. What is Ferio's current RPO?
3. What is Ferio's current RTO?
4. Explain RPO like you are five.
5. Explain RTO like you are five.
6. What is PITR?
7. Has Ferio selected its final managed PostgreSQL backup/PITR strategy?
8. What is the initial backup retention?
9. What is the tenant closure recovery window?
10. Why are those two retention periods different?
11. Why must Control Plane and tenant DBs both be backed up?
12. Why track backup evidence centrally?
13. Why alert on stale backups?
14. Why are backup credentials especially sensitive?
15. Why restore into an isolated database?
16. What protection does `restore_drill_*` provide?
17. Why verify `_prisma_migrations` after restore?
18. Why is schema verification not enough?
19. Why verify object/media references?
20. Why reconcile financial state?
21. Why does DNS/domain behavior matter in DR?
22. Why perform a real restore drill?
23. Why is a raw database dump not automatically a tenant export?
24. What happens when closure reaches `CLOSURE_PENDING`?
25. Why disable domains early?
26. Why is scheduled-job shutdown currently only partial?
27. What happens when a tenant DB registry becomes `RETIRED`?
28. Is physical database destruction fully implemented?
29. Why preserve some platform billing/audit evidence?
30. Why is closure a saga/state machine?
31. What is the difference between logical closure and physical destruction?
32. Why must integration credentials be revoked?
33. Why should restore drills suppress dangerous external side effects?
34. How do MT-11 and MT-12 interact?
35. What MT-12 gate item is still open?

If you can explain all of these clearly, you understand the core of production data recovery.

---

# 99. Five sentences to memorize

> **1. A backup proves that a copy exists; a restore drill proves that recovery works.**

> **2. Ferio targets RPO ≤ 1 hour and RTO ≤ 4 hours.**

> **3. A tenant must be restorable independently without overwriting another tenant.**

> **4. Closure is a staged 90-day recoverable lifecycle, not an immediate database deletion.**

> **5. MT-12 remains open for production operations because managed backup/PITR
> and provider-backed recovery evidence are not yet proven; the local
> independent tenant restore drill is complete.**

---

# 100. Final mental model

Keep this picture in your head:

```text
                    FERIO DATA SAFETY

                ┌──── CONTROL PLANE ────┐
                │                       │
                │  organizations        │
                │  domains              │
                │  subscriptions        │
                │  registry             │
                └──────────┬────────────┘
                           │
                     backup/recovery
                           │
                           ▼

Tenant A DB ────── backup ──────► recovery source
Tenant B DB ────── backup ──────► recovery source
Tenant C DB ────── backup ──────► recovery source
                                      │
                                      ▼
                             isolated restore DB
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                      schema        media       finance
                       check        check        check
                         └────────────┼────────────┘
                                      ▼
                                  smoke test
                                      ▼
                                safe cutover
```

And for intentional closure:

```text
ACTIVE
  ↓
CLOSURE_PENDING
  ↓
domains disabled
  ↓
90-day recovery window
  ↓
retention/legal check
  ↓
registry RETIRED
  ↓
CLOSED
  ↓
physical destruction when policy/provider allow
```

That is MT-12.

---

# 101. Current Ferio MT-12 checkpoint

```text
RPO definition                       DONE
RTO definition                       DONE
30-day initial backup retention      DONE

Managed backup/PITR strategy         SELECTED / PROVIDER SETUP OPEN
Control Plane backups                DONE (local drill)
All-tenant DB backups                DONE (local tooling)
Central backup evidence              DONE
Backup stale/failure alerts          DONE (application boundary)
Backup credential protection         DONE (application boundary)

Safe new restore target              DONE
Restored schema-version check        DONE
Control Plane restore drill          DONE (local drill)
Independent tenant restore           DONE (local drill)
Media verification                   DONE (local tooling)
Financial reconciliation             DONE (local tooling)
DNS/DR documentation                 DONE
Recorded restore exercise            DONE (local drill)

90-day closure policy                DONE
Domain revocation                    DONE
DB connection retirement             DONE
Domain takeover prevention           DONE
Platform billing/audit preservation  DONE

Export package                       DONE
Business-data export                 DONE
Audit/financial export               DONE
Media export                         DONE
Integration credential revocation    DONE
Scheduled-job safety                 DONE
Physical DB archive/delete           PARTIAL

MT-12 independent restore gate       DONE (local drill; managed provider remains open)
MT-12 documented closure gate        DONE
```

So MT-12 should currently be viewed as:

> **Closure safety: substantially implemented. Backup/restore production readiness: still unfinished.**

---

# 102. What comes next

## Document 13 — Observability, Security, Performance & SaaS Hardening (MT-13)

Once Ferio can:

```text
isolate tenants
provision them
route them
bill them
migrate them
recover/close them
```

the next question is:

> **How do we know the entire SaaS is healthy, secure, fast, and behaving correctly under production load?**

Document 13 will cover:

```text
structured tenant-aware logs
metrics
alerts
security hardening
rate limits
secret handling
connection pressure
performance/load testing
cross-tenant attack testing
operational dashboards
production health
```

That is where Ferio starts being treated not merely as an application, but as an operated SaaS platform.
