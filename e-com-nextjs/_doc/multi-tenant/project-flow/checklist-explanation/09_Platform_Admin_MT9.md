# Ferio Engineering Learning Series

## Document 09 --- Ferio Platform Admin: Operating the SaaS Control Plane Safely (MT-9)

**Level:** Child-simple → senior/industry-level\
**Project:** Ferio Commerce SaaS\
**Release slice:** MT-9\
**Main question:** How can Ferio's operators manage the entire SaaS
fleet without becoming unrestricted superusers of every tenant's private
commerce data?

------------------------------------------------------------------------

# 1. Where We Are

So far, we learned how Ferio creates and isolates tenants.

``` text
MT-1 → Control Plane
MT-2 → Trusted Tenant Resolution
MT-3 → Tenant Database Router
MT-4 → Provisioning
MT-5 → Domains
MT-6 → Plans / Billing / Entitlements
MT-7 → Tenant-safe commerce
MT-8 → Redis / Jobs / Sockets / Files / Integrations
```

Now somebody must operate all of this.

Who can:

``` text
create a business?
see provisioning failures?
suspend an organization?
retry provisioning?
see database schema drift?
run tenant migrations?
manage plans?
inspect SaaS invoices?
diagnose domains?
grant temporary support access?
```

That is the job of:

``` text
FERIO PLATFORM ADMIN
```

------------------------------------------------------------------------

# 2. Baby Analogy --- Shopping Mall Management Office

Imagine Ferio is a shopping mall.

Each tenant is a shop:

``` text
Shop A
Shop B
Shop C
```

Each shop has its own:

``` text
products
customers
orders
money
employees
```

The mall management office needs to manage:

``` text
which shops exist
which shops pay rent
which shops are open
building health
shop registration
maintenance
```

But the mall manager should **not automatically own every shop's cash
register**.

That is the key idea behind MT-9.

------------------------------------------------------------------------

# 3. Platform Admin Is Not Tenant Admin

These are different security realms.

``` text
PLATFORM ADMIN
works for Ferio

TENANT ADMIN
works for one merchant
```

Platform Admin manages SaaS infrastructure and lifecycle.

Tenant Admin manages commerce inside an organization.

Never merge these concepts mentally.

------------------------------------------------------------------------

# 4. Two Administrative Worlds

``` text
FERIO PLATFORM ADMIN
        │
        ▼
   CONTROL PLANE
        │
        ├── organizations
        ├── subscriptions
        ├── plans
        ├── SaaS billing
        ├── tenant DB registry
        ├── domains
        ├── provisioning
        ├── migrations
        ├── system health
        └── support grants


TENANT ADMIN
        │
        ▼
     TENANT DB
        │
        ├── products
        ├── customers
        ├── orders
        ├── inventory
        ├── wallet
        ├── returns
        └── commerce settings
```

------------------------------------------------------------------------

# 5. The Most Important MT-9 Security Rule

> **Being a Ferio Platform Admin does not automatically authorize direct
> access to tenant commerce data.**

The tracker explicitly says tenant membership rejects platform-realm
principals by default.

Tenant-data access requires the explicit support-access workflow.

This is one of the strongest architectural decisions in Ferio.

------------------------------------------------------------------------

# 6. Why Not Make Platform Admin a Universal Superuser?

It sounds convenient:

``` text
SUPERADMIN
→ access every tenant
```

But that creates enormous risk.

One compromised platform account could immediately expose:

``` text
all customers
all orders
all wallets
all chats
all tenant secrets
```

Instead, Ferio separates:

``` text
platform authority
```

from:

``` text
tenant commerce authority
```

------------------------------------------------------------------------

# 7. Platform Authentication Realm

Ferio has separate Platform Admin guards.

The tracker identifies:

``` text
PlatformAuthGuard
realm = platform
role → permission map
```

Tenant staff tokens cannot invoke Platform Admin APIs because the realm
does not match.

Likewise, a platform token does not automatically satisfy Tenant Admin
membership.

------------------------------------------------------------------------

# 8. Realm

Think of a realm as:

``` text
"What kind of identity is this token representing?"
```

Examples:

``` text
tenant realm
platform realm
```

Even if two accounts happen to share an email address:

``` text
platform identity
≠
tenant membership
```

Authority comes from the correct security realm and permissions.

------------------------------------------------------------------------

# 9. Platform Permissions

The tracker says Ferio defines platform permissions for:

``` text
organization
subscription
billing
domain
provisioning
migration
support access
platform health
```

This is better than:

``` text
if SUPERADMIN → allow everything
```

Fine-grained permissions allow least privilege.

------------------------------------------------------------------------

# 10. Least Privilege

Imagine a Ferio finance operator.

They may need:

``` text
view SaaS invoices
initiate approved billing operation
```

They may not need:

``` text
run tenant migrations
grant support access
change domains
```

A permission model allows roles to receive only the authority needed for
their work.

------------------------------------------------------------------------

# 11. Platform Dashboard

The MT-9 dashboard gives Ferio a fleet-level view.

The tracker marks all of these complete:

``` text
organization lifecycle counts
subscription-state counts
provisioning failures
tenant migration fleet status
domain health
tenant DB health/schema state
platform billing outcomes
usage/limit alerts
queue/system health
backup evidence
security/support-access alerts
```

This is an **operations dashboard**, not a tenant commerce dashboard.

------------------------------------------------------------------------

# 12. Data Minimization on the Dashboard

A Platform Admin dashboard usually needs:

``` text
10 ACTIVE organizations
2 SUSPENDED
1 provisioning failure
3 DBs behind schema head
```

It does not normally need:

``` text
Rahim's phone number
customer order lines
wallet balance
private chat
```

Ferio's broader tracker says platform aggregate metrics use approved
Control Plane metadata and reject tenant PII by default.

------------------------------------------------------------------------

# 13. Organization Lifecycle Counts

The platform dashboard can summarize:

``` text
PROVISIONING
ACTIVE
SUSPENDED
PROVISIONING_FAILED
CLOSURE_PENDING
CLOSED
ARCHIVED
```

This answers:

> "What is happening across the Ferio fleet?"

without opening each tenant's commerce database.

------------------------------------------------------------------------

# 14. Subscription Counts

The dashboard also summarizes states such as:

``` text
TRIALING
ACTIVE
PAST_DUE
SUSPENDED
```

This belongs to the Control Plane because it describes:

``` text
merchant ↔ Ferio
```

not:

``` text
customer ↔ merchant
```

------------------------------------------------------------------------

# 15. Provisioning Failure Visibility

If a new tenant fails during provisioning, Platform Admin needs to know.

Example:

``` text
Organization created
   ↓
domain reserved
   ↓
database created
   ↓
migration FAILED
```

Without a platform operations UI, somebody might need to inspect logs or
manually use SQL.

MT-9 turns this into a managed operational workflow.

------------------------------------------------------------------------

# 16. Organization Management

The tracker says Platform Admin can:

``` text
create organization
view organization metadata
view owner/members at platform metadata level
view plan/subscription
view domains
view tenant DB registration/schema version
view provisioning timeline
suspend/reactivate
start/finalize closure
```

And importantly:

``` text
raw tenant DB passwords are never displayed
```

------------------------------------------------------------------------

# 17. Organization Detail Page

Conceptually:

``` text
Baby Shop
├── lifecycle: ACTIVE
├── owner/member metadata
├── subscription: Business
├── usage
├── domains
├── tenant database registry
├── schema version
├── provisioning runs
└── operational actions
```

Notice:

``` text
tenant database registry metadata
```

is not the same as:

``` text
browse arbitrary tenant tables
```

------------------------------------------------------------------------

# 18. Database Registry View

Platform operators may need:

``` text
database registered?
status?
schema version?
ready?
migration behind?
```

They do not need:

``` text
postgres://username:password@...
```

The tracker says registry views are credential-free by construction.

------------------------------------------------------------------------

# 19. Secret-Safe Operations

This is a production principle:

> Operators should receive enough information to diagnose the system
> without receiving unnecessary secrets.

Good:

``` text
DB status = READY
schemaVersion = 20260901_xyz
backup = CURRENT
```

Bad:

``` text
database password = ...
encryption master key = ...
provider secret = ...
```

------------------------------------------------------------------------

# 20. Provisioning Timeline

Platform Admin can view provisioning runs and their individual steps.

Conceptually:

``` text
Provisioning Run #42

1. organization metadata    ✓
2. reserve domain           ✓
3. create database          ✓
4. register database        ✓
5. migrate schema           ✗
6. seed baseline            waiting
7. create owner             waiting
8. verify readiness         waiting
9. activate                 waiting
```

This makes failures diagnosable.

------------------------------------------------------------------------

# 21. Provisioning Retry

The console's "Run provisioning" action replays the resumable
orchestrator.

It does not blindly rebuild everything.

From MT-4 we learned:

``` text
completed steps
→ reused/skipped safely

incomplete step
→ continue
```

This is why idempotency matters operationally.

------------------------------------------------------------------------

# 22. No Manual SQL for Normal Lifecycle Operations

The MT-9 gate explicitly says Ferio operators can manage tenant
lifecycle without direct DB shell access for normal operations.

That is a major maturity milestone.

Why?

Because manual production SQL is:

``` text
hard to audit
easy to mistype
hard to reproduce
difficult to permission safely
```

Normal operations should be represented as guarded application
workflows.

------------------------------------------------------------------------

# 23. Suspend Organization

Platform Admin can transition an organization according to the state
machine.

Conceptually:

``` text
ACTIVE
   ↓
SUSPENDED
```

The action is audited.

The exact storefront behavior follows previously approved policy.

Remember:

``` text
organization lifecycle
```

and:

``` text
subscription lifecycle
```

are related but distinct concepts.

------------------------------------------------------------------------

# 24. Reactivation

If policy conditions are satisfied:

``` text
SUSPENDED
   ↓
ACTIVE
```

The operation should be:

``` text
authorized
validated
state-machine controlled
audited
```

not:

``` sql
UPDATE organization SET status='ACTIVE';
```

from an operator shell.

------------------------------------------------------------------------

# 25. Closure

The tracker says the Platform Admin organization actions include:

``` text
Start closure
Finalize closure
```

Start closure:

``` text
capture reason
→ CLOSURE_PENDING
→ disable domains
```

Finalize closure:

``` text
respect retention confirmation
→ retire registry according to policy
```

------------------------------------------------------------------------

# 26. Closure Is Not "Delete Now"

Ferio's organization lifecycle includes a recoverable retention policy.

The tracker elsewhere records a 90-day closure retention gate with an
explicit audited override.

So:

``` text
click closure
```

does not mean:

``` text
DROP DATABASE immediately
```

This protects against:

``` text
mistakes
financial retention issues
legal requirements
recovery needs
```

------------------------------------------------------------------------

# 27. Export-before-Closure Nuance

Earlier provisioning/lifecycle sections of the supplied tracker still
contain an open item for an export-before-closure workflow "if
required."

MT-9's console does implement closure initiation/finalization according
to current policy.

So distinguish:

``` text
closure lifecycle controls → implemented
```

from:

``` text
full tenant export-before-closure capability → not necessarily complete
```

Do not silently combine them.

------------------------------------------------------------------------

# 28. Plan Administration

Platform Admin can safely manage plans.

The tracker marks:

``` text
create/list plan
plan versioning
entitlement/limit configuration
subscription directory
```

complete.

Plan administration is a Control Plane operation.

------------------------------------------------------------------------

# 29. Why Plan Versioning Matters

Suppose:

``` text
Business v1
products_max = 5,000
```

Later Ferio changes:

``` text
Business v2
products_max = 10,000
```

Historical billing/support questions may require knowing what policy
existed earlier.

The tracker says plan versions increment atomically on Platform Admin
edits and audit snapshots preserve normalized entitlement evidence.

------------------------------------------------------------------------

# 30. Entitlement Configuration

The console supports feature/limit configuration.

Conceptually:

``` text
custom_domain = enabled
products_max = 5000
staff_seats = 10
```

Platform Admin is editing SaaS policy.

Tenant business services later consume that policy through
`EntitlementsService`.

------------------------------------------------------------------------

# 31. Subscription Directory

Platform Admin can view subscriptions across organizations.

Example:

``` text
ABC      Business   ACTIVE
Perfect  Pro        ACTIVE
Baby     Starter    PAST_DUE
```

This is fleet-level SaaS management.

It should not require querying tenant commerce ledgers.

------------------------------------------------------------------------

# 32. Platform Billing Console

Ferio's Platform Admin can view:

``` text
SaaS invoices
SaaS payment attempts
PAID / OPEN states
```

Remember:

``` text
merchant → Ferio
```

not:

``` text
customer → merchant
```

The billing console operates on Control Plane financial records.

------------------------------------------------------------------------

# 33. Manual Billing Operations

Sensitive billing mutations require:

``` text
saas_billing:write
+
reason
+
audit
```

The tracker specifies bounded reason DTOs of 10--500 characters for
invoice creation/payment initiation operations.

This is an example of a **high-friction intentional control**.

For sensitive actions, a little friction is good.

------------------------------------------------------------------------

# 34. Why Require a Reason?

Imagine six months later an auditor sees:

``` text
manual invoice created
```

Without context:

``` text
Why?
Who requested it?
Was it accidental?
```

With reason-bound audit:

``` text
actor
organization
operation
reason
time
```

the action becomes explainable.

------------------------------------------------------------------------

# 35. Internal Plan

The approved internal/free state is not a hidden bypass.

Ferio uses the seeded:

``` text
internal
```

plan and an audited:

``` text
SubscriptionsService.startInternal()
```

flow.

This means internal treatment remains:

``` text
explicit
visible
revocable
auditable
```

------------------------------------------------------------------------

# 36. Tenant-Specific Entitlement Overrides

Sometimes a tenant needs a temporary exception.

Example:

``` text
Business plan:
staff_seats = 10

Special pilot agreement:
staff_seats = 15
until date X
```

The tracker says Platform Admin supports tenant-specific entitlement
overrides with:

``` text
feature key
expiry
reason
actor
revocation
audit
```

------------------------------------------------------------------------

# 37. Why Overrides Need Expiry

Bad:

``` text
temporary exception
→ forgotten forever
```

Better:

``` text
override
├── reason
├── actor
├── expiresAt
└── revocable
```

Temporary policy should naturally return to normal policy.

------------------------------------------------------------------------

# 38. Override Evaluation

The tracker says active, unrevoked tenant overrides are applied before
normal plan entitlements.

Conceptually:

``` text
organization action
   ↓
active override?
   ├── yes → apply bounded override
   └── no  → use plan entitlement
```

This avoids hardcoding one-off customer exceptions into commerce code.

------------------------------------------------------------------------

# 39. Tenant Operations --- Migrations

Platform Admin controls tenant migration rollout.

The console/orchestrator supports:

``` text
requested canary
bounded concurrency
ordered per-tenant results
pause
resume
retry failed tenant
```

This is fleet operations.

------------------------------------------------------------------------

# 40. Canary Migration

Suppose Ferio has 500 tenant databases.

Dangerous:

``` text
migrate all 500 immediately
```

Safer:

``` text
choose canary tenant
   ↓
migrate
   ↓
validate
   ↓
bounded batches
   ↓
fleet
```

The tracker says the requested canary organization is persisted in
`TenantMigrationRun.canaryOrganizationId`.

------------------------------------------------------------------------

# 41. Why Persist the Canary?

If the migration worker restarts, the rollout should not forget:

``` text
which tenant was selected as canary?
```

Durable orchestration state makes the operation resumable and
explainable.

------------------------------------------------------------------------

# 42. Pause Rollout

Platform Admin can pause migration rollout.

A subtle race exists:

``` text
operator clicks PAUSE
while jobs are already queued
```

The tracker says queued workers re-check durable run status before
touching any tenant database.

So the durable pause wins against already-enqueued work.

This is excellent distributed-systems thinking.

------------------------------------------------------------------------

# 43. Retry Failed Tenant

Suppose:

``` text
ABC ✓
Perfect ✗
Baby ✓
```

A resume should not blindly re-run successful tenants.

The tracker says failed result rows remain retryable while successful
tenants are skipped.

That is resumable fleet orchestration.

------------------------------------------------------------------------

# 44. Schema Drift View

Platform Admin can see:

``` text
canonical schema head
```

versus:

``` text
tenant database schemaVersion
```

Example:

``` text
ABC      HEAD ✓
Perfect  behind by 1 ✗
Baby     HEAD ✓
```

This turns invisible schema drift into an operational signal.

------------------------------------------------------------------------

# 45. Database Health

The Platform Admin database-health view surfaces:

``` text
registry status
schema version
fleet behind count
```

while system health probes the Control Plane database and exposes
bounded pool/runtime metrics.

Do not confuse:

``` text
Control Plane DB health
```

with:

``` text
individual tenant DB readiness/schema health
```

------------------------------------------------------------------------

# 46. Backup Evidence

The tracker says Platform system health exposes:

``` text
current
stale
missing
```

backup/restore evidence from deployment metadata.

Important limitation:

> The tracker explicitly says this does not claim a backup-provider
> integration.

The console can show evidence.

That is not the same as proving the backup provider itself is fully
integrated and tested.

------------------------------------------------------------------------

# 47. Restore Status

Platform health also exposes bounded:

``` text
restoreStatus
lastRestoreVerifiedAt
```

But actual provider restore execution and live restore drills remain
separate controls.

This is another example of precise engineering language:

``` text
status visibility
≠
restore proven in production
```

------------------------------------------------------------------------

# 48. Domain Diagnostics

Platform Admin has:

``` text
GET /platform/domain-health
```

It exposes credential-free information such as:

``` text
domain status
organization status
verification failures
routing issues
```

without returning verification tokens.

Operators get actionable diagnostics without unnecessary secrets.

------------------------------------------------------------------------

# 49. Safe Cache Invalidation

Platform Admin can invalidate tenant domain cache safely.

The API:

``` text
POST /platform/organizations/:id/domain-cache/invalidate
```

does not accept arbitrary:

``` text
Redis key
database URL
```

from the operator.

Instead, the server enumerates trusted Control Plane hostnames and
invokes the tenancy invalidation hook.

This is a subtle but excellent safety design.

------------------------------------------------------------------------

# 50. Why Not Accept Raw Cache Keys?

Bad API:

``` json
{
  "cacheKey": "whatever-the-user-types"
}
```

Now an operator endpoint becomes an arbitrary cache mutation tool.

Better:

``` text
organizationId
→ trusted Control Plane records
→ derive safe hostnames
→ invalidate known tenant resolver entries
```

Give operators **business operations**, not low-level infrastructure
weapons.

------------------------------------------------------------------------

# 51. Support Access

This is the most security-sensitive MT-9 concept.

Platform Admin normally cannot directly access tenant commerce data.

When support genuinely needs tenant data:

``` text
request support grant
→ reason
→ exact organization
→ exact operator
→ bounded scope
→ expiry
→ audit
```

Only then can the support workflow enter tenant data.

------------------------------------------------------------------------

# 52. Support Grant Properties

The tracker marks complete:

``` text
reason required
tenant/org binding
operator binding
expiry
bounded scope/permissions
usage audit
immediate revoke
active-session visibility
```

This is a classic **break-glass / just-in-time access** style pattern,
though Ferio's normal support grants are policy-controlled rather than
unrestricted emergency access.

------------------------------------------------------------------------

# 53. Reason Requirement

The tracker requires at least:

``` text
10 characters
```

for support-access reason.

Why not allow:

``` text
"test"
```

Because the reason should provide meaningful operational evidence.

------------------------------------------------------------------------

# 54. Time Limit

Support grants are clamped to:

``` text
5 minutes minimum
8 hours maximum
```

according to the tracker.

So a support session cannot accidentally become:

``` text
permanent tenant superuser access
```

------------------------------------------------------------------------

# 55. Scope

Support grants accept bounded:

``` text
resource/action
```

pairs.

Unknown or wildcard scopes are rejected.

Conceptually:

``` text
orders:read
customers:read
```

rather than:

``` text
*:*
```

The exact resource catalog should be read from the implementation when
modifying this area.

------------------------------------------------------------------------

# 56. Write May Satisfy Read

The tracker says write grants may satisfy read operations.

That follows the typical relationship:

``` text
write authority
⊇
read authority
```

for the same bounded resource.

But unrelated resources remain separate.

------------------------------------------------------------------------

# 57. Exact Organization and Operator

A support grant for:

``` text
Operator Alice
Organization ABC
```

must not authorize:

``` text
Alice → Perfect
Bob → ABC
```

The tracker says `SupportAccessService.assertActive` checks the exact
organization/platform-user pairing.

------------------------------------------------------------------------

# 58. Support Usage Audit

The tracker records:

``` text
SUPPORT_ACCESS_GRANTED
SUPPORT_ACCESS_USED
SUPPORT_ACCESS_REVOKED
```

as append-only audit events.

This gives a lifecycle:

``` text
grant
→ use
→ use
→ revoke/expire
```

------------------------------------------------------------------------

# 59. Audit Failure Fails Closed

A particularly strong rule in the tracker:

> Tenant data access fails closed if the support usage audit cannot be
> written.

Why?

Because otherwise a support operator could access sensitive tenant data
during an audit outage and leave no evidence.

For this sensitive path:

``` text
cannot record access
→ do not allow access
```

------------------------------------------------------------------------

# 60. Immediate Revocation

Platform Admin has a revoke action.

Once revoked:

``` text
future support use
→ denied
```

A time-limited grant must still be revocable before its natural expiry.

------------------------------------------------------------------------

# 61. Active Support Sessions

The dashboard exposes the active-grant count.

The Support Access console lists active grants with:

``` text
organization/operator
scope
expiry
revoke action
```

Raw reasons/secrets are excluded from bounded system-health output.

This gives operators visibility into elevated access currently in force.

------------------------------------------------------------------------

# 62. Normal Platform Operation vs Support Access

Memorize this split:

``` text
NORMAL PLATFORM OPERATION

Platform Admin
→ Control Plane
→ organization/subscription/domain/migration/etc.


SUPPORT TENANT-DATA OPERATION

Platform Admin
→ explicit support grant
→ reason/scope/expiry
→ audit
→ selected tenant boundary
→ tenant data
```

Do not merge them.

------------------------------------------------------------------------

# 63. Platform Admin Should Use Business APIs

Good:

``` text
Suspend organization
Retry provisioning
Pause migration
Revoke support grant
Invalidate tenant domain cache
```

Bad:

``` text
run arbitrary SQL
choose arbitrary Redis key
provide arbitrary DB URL
edit hidden tables manually
```

The application should encode safe operational intent.

------------------------------------------------------------------------

# 64. Audit Logs

The Control Plane has an append-only platform audit service.

Sensitive lifecycle actions should leave evidence.

Examples:

``` text
organization suspended
plan edited
billing operation initiated
support grant created
support access used
migration paused
closure started
```

Append-only history makes later reconstruction possible.

------------------------------------------------------------------------

# 65. Why Append-Only?

Bad audit design:

``` text
update previous audit row
```

Now history can disappear.

Append-only means:

``` text
event 1
event 2
event 3
```

You add new evidence rather than rewriting old evidence.

------------------------------------------------------------------------

# 66. Audit Is Not Application Logging

Logs answer:

``` text
"What happened technically?"
```

Audit answers:

``` text
"Who performed this sensitive business/security action,
on what target, when, and under what authority/reason?"
```

They overlap, but they are not interchangeable.

------------------------------------------------------------------------

# 67. DTO Validation

The tracker says Platform Admin mutation boundaries use dedicated DTOs
for:

``` text
organization lifecycle
provisioning idempotency
closure
plans
subscriptions
billing
migration controls
```

Why?

Because powerful operator endpoints need strong runtime input
validation.

------------------------------------------------------------------------

# 68. Financial Input Invariants

Platform services also enforce financial invariants.

Examples from the tracker:

``` text
invoice periods must be finite
invoice period ordering must be valid
plan keys normalized/validated
amounts validated
entitlement limits validated
duplicate features rejected
```

Authorization alone does not make malformed input safe.

------------------------------------------------------------------------

# 69. Migration Input Validation

Migration controls can include dangerous parameters such as:

``` text
canary
concurrency
failure threshold
```

These must be bounded.

Otherwise an operator typo such as:

``` text
concurrency = 100000
```

could become an incident.

------------------------------------------------------------------------

# 70. Stable Operational Errors

Platform UI should receive bounded, meaningful error codes rather than
raw infrastructure exceptions.

Examples conceptually:

``` text
INVALID_STATE_TRANSITION
PROVISIONING_CONFLICT
MIGRATION_PAUSED
SUPPORT_ACCESS_REQUIRED
SUPPORT_SCOPE_DENIED
```

The exact codes should be taken from implementation contracts when
building UI behavior.

------------------------------------------------------------------------

# 71. Organization State Machine

A state machine protects lifecycle invariants.

Instead of:

``` text
status = any string
```

Ferio controls valid transitions.

Conceptually:

``` text
PROVISIONING
   ├──→ ACTIVE
   └──→ PROVISIONING_FAILED

ACTIVE
   ├──→ SUSPENDED
   └──→ CLOSURE_PENDING
```

Not every transition should be legal.

------------------------------------------------------------------------

# 72. Why State Machines Matter to Platform Admin

A UI button is not the security rule.

Even if the frontend hides:

``` text
"Activate"
```

the backend must reject an illegal transition.

Platform Admin is powerful enough that server-side invariants are
especially important.

------------------------------------------------------------------------

# 73. Platform Admin Is a Control Plane Client

A useful mental model:

``` text
ferio-platform-admin
```

is simply a privileged client of:

``` text
Control Plane APIs
```

It should not contain the real authorization policy itself.

Backend guards/services/state machines remain authoritative.

------------------------------------------------------------------------

# 74. UI Is Not Authorization

Bad:

``` text
hide migration button for Viewer
```

and assume security is solved.

A Viewer could manually call the endpoint.

Correct:

``` text
UI hides/disables
+
PlatformAuthGuard
+
permission check
+
service invariant
```

------------------------------------------------------------------------

# 75. Platform Health Permission

The tracker specifically notes:

``` text
platform_health:read
```

for health diagnostics.

Even operational telemetry can contain sensitive infrastructure
information.

Health visibility should be permissioned.

------------------------------------------------------------------------

# 76. System Health Should Be Bounded

Health output can include useful information:

``` text
queue status
runtime status
DB pool metrics
backup freshness
restore evidence
active support count
isolation metrics
```

But should avoid:

``` text
credentials
raw support reasons
DB URLs
secrets
unbounded tenant PII
```

------------------------------------------------------------------------

# 77. Platform Admin Failure Scenario --- Compromised Finance User

Suppose a finance operator account is compromised.

With least privilege, attacker may have:

``` text
billing permissions
```

but not automatically:

``` text
migration permissions
support access
tenant commerce membership
```

Fine-grained authorization limits blast radius.

------------------------------------------------------------------------

# 78. Failure Scenario --- Mistyped Closure

Operator selects wrong organization.

Safety layers include:

``` text
explicit target
reason
state machine
domain disable step
retention window
audit
finalization confirmation
```

The system avoids instant destructive database deletion.

------------------------------------------------------------------------

# 79. Failure Scenario --- Migration Problem

Canary fails.

Expected:

``` text
failure persisted
rollout does not blindly continue
operator sees result
pause/recovery available
healthy completed tenants not repeatedly rerun
```

This is why migration orchestration belongs in Platform Admin rather
than ad hoc shell scripts.

------------------------------------------------------------------------

# 80. Failure Scenario --- Audit Database Problem During Support

Support operator attempts tenant-data access.

Audit write fails.

Expected:

``` text
tenant access denied
```

not:

``` text
"we'll log it later"
```

That is fail-closed privileged access.

------------------------------------------------------------------------

# 81. Failure Scenario --- Raw Cache Manipulation

Operator wants to clear ABC domain cache.

Unsafe:

``` text
enter Redis key manually
```

Safe Ferio design:

``` text
select ABC
→ backend derives ABC hostnames
→ bounded invalidation
→ audit
```

This is an example of designing a **safe control surface**.

------------------------------------------------------------------------

# 82. Testing Platform Authorization

Test:

``` text
tenant staff token
→ /platform/*
→ rejected
```

Then:

``` text
platform token without required permission
→ sensitive platform endpoint
→ rejected
```

Then:

``` text
authorized platform token
→ allowed operation
```

------------------------------------------------------------------------

# 83. Testing Tenant Access Boundary

Test:

``` text
valid Platform Admin token
+
no support grant
+
tenant commerce endpoint
```

Expected:

``` text
denied
```

This proves Platform Admin is not a universal tenant superuser.

------------------------------------------------------------------------

# 84. Testing Support Grant

Create:

``` text
Alice
→ ABC
→ orders:read
→ 30 minutes
```

Verify:

``` text
Alice reads ABC orders ✓
Alice writes ABC orders ✗
Alice reads Perfect orders ✗
Bob reads ABC orders ✗
```

Then revoke.

Verify:

``` text
Alice reads ABC orders ✗
```

------------------------------------------------------------------------

# 85. Testing Support Audit Failure

Simulate audit failure.

Attempt support data access.

Expected:

``` text
access fails closed
```

This is an important negative test.

------------------------------------------------------------------------

# 86. Testing Plan Override

Create an expiring tenant override.

Verify:

``` text
before expiry
→ override applies

after expiry
→ normal plan entitlement applies

after revoke
→ normal plan entitlement applies
```

Audit should identify actor/reason.

------------------------------------------------------------------------

# 87. Testing Migration Pause Race

Scenario:

``` text
jobs already queued
operator pauses run
worker wakes up
```

Expected:

``` text
worker re-checks durable run state
→ does not touch next tenant DB
```

The tracker says this behavior is implemented.

------------------------------------------------------------------------

# 88. Testing Secret-Safe Diagnostics

Inspect:

``` text
organization detail
database health
domain health
system health
billing views
```

Assert they do not expose:

``` text
tenant DB password
database URL if sensitive
verification token
provider secret
encryption key
raw support reason where not needed
```

------------------------------------------------------------------------

# 89. Testing Closure

Verify:

``` text
Start closure
→ reason captured
→ CLOSURE_PENDING
→ domains disabled
```

Then verify retention rules prevent premature destructive finalization
unless the explicit policy path permits it.

------------------------------------------------------------------------

# 90. Testing Platform Dashboard

Dashboard tests should prove:

``` text
counts correct
health states bounded
no tenant PII by default
permissions enforced
```

A platform dashboard is not a backdoor analytics query across tenant
commerce databases.

------------------------------------------------------------------------

# 91. Educational Platform Controller

Teaching pseudocode:

``` ts
@UseGuards(PlatformAuthGuard)
@Controller("platform/organizations")
export class PlatformOrganizationsController {
  @Post(":id/suspend")
  @RequirePlatformPermission("organization:write")
  suspend(
    @Param("id") id: string,
    @Body() dto: SuspendOrganizationDto,
    @PlatformActor() actor: PlatformActor,
  ) {
    return this.organizations.suspend({
      organizationId: id,
      reason: dto.reason,
      actor,
    });
  }
}
```

The UI does not decide authorization.

------------------------------------------------------------------------

# 92. Educational Support Access

``` ts
await supportAccess.assertActive({
  platformUserId: actor.id,
  organizationId,
  resource: "orders",
  action: "read",
});

// SUPPORT_ACCESS_USED must be recorded.
// Only then enter the bounded tenant-data workflow.
```

Teaching pseudocode only.

------------------------------------------------------------------------

# 93. Educational Safe Cache Invalidation

Bad:

``` ts
invalidate(req.body.redisKey);
```

Better concept:

``` ts
const domains =
  await controlPlane.getOrganizationDomains(orgId);

for (const domain of domains) {
  await tenantResolver.invalidate(domain.hostname);
}
```

The operator chooses the business target.

The server chooses the infrastructure keys.

------------------------------------------------------------------------

# 94. Educational Migration Control

``` text
Platform Admin
   ↓
create migration run
   ↓
choose canary + bounded concurrency
   ↓
persist run
   ↓
canary
   ↓
validate
   ↓
batch
   ↓
pause/resume/retry as needed
```

This converts a risky infrastructure procedure into a controlled product
workflow.

------------------------------------------------------------------------

# 95. Senior Security Principle --- Privilege Separation

Ferio separates:

``` text
platform administration
tenant administration
support tenant-data access
```

These are three different authorities.

That is stronger than a single hierarchy:

``` text
SUPERADMIN > ADMIN > USER
```

because authority is contextual, not merely "higher role means
everything."

------------------------------------------------------------------------

# 96. Senior Operations Principle --- Control Surfaces

Good operational tooling exposes:

``` text
intent
```

rather than:

``` text
raw mechanism
```

Examples:

``` text
GOOD:
Retry provisioning

BAD:
Run arbitrary provisioning SQL


GOOD:
Invalidate organization domain cache

BAD:
Delete arbitrary Redis key


GOOD:
Pause migration run

BAD:
SSH to worker and kill random process
```

This is a major industry-level design principle.

------------------------------------------------------------------------

# 97. Senior Audit Principle --- Explainability

For sensitive actions, Ferio should be able to answer:

``` text
Who?
What?
Which organization?
Why?
When?
Under which permission?
What happened?
Was it revoked/expired?
```

If the system cannot answer those questions, privileged operations
become difficult to govern.

------------------------------------------------------------------------

# 98. Senior Reliability Principle --- Durable Operations

Long-running operations such as:

``` text
provisioning
fleet migrations
closure
```

should not depend on one browser tab remaining open.

Their state belongs in durable backend records.

The Platform Admin UI observes and controls those records.

------------------------------------------------------------------------

# 99. Senior Data Principle --- Metadata Before Tenant Data

For normal fleet management, prefer:

``` text
Control Plane metadata
```

over:

``` text
opening tenant commerce databases
```

Use tenant data only when the operational purpose genuinely requires it
and the correct access workflow exists.

This minimizes exposure.

------------------------------------------------------------------------

# 100. Current MT-9 Status

The supplied tracker marks the MT-9 gate complete.

It says:

``` text
✓ Ferio operators can manage tenant lifecycle
  without direct DB shell access for normal operations.

✓ Platform Admin is not an unrestricted
  universal tenant superuser.
```

The Platform Admin slice includes completed dashboard, organization
management, plan/billing administration, tenant operations and
support-access controls.

------------------------------------------------------------------------

# 101. Important Caveats Outside the MT-9 Gate

Do not interpret MT-9 completion as:

``` text
all production operations for Ferio are finished
```

The broader tracker still has later release gates for areas such as:

``` text
backup/restore proof
critical SaaS metrics/alerts
full security review
pilot tenants
production launch
```

MT-9 means the **Platform Admin control surface and its stated security
gate are complete**, not that the entire SaaS launch is complete.

------------------------------------------------------------------------

# 102. Explain It Like You Are Five

> Ferio has a special office for the people who run Ferio. They can
> create shops, see if a shop's database is healthy, fix provisioning,
> manage plans, pause upgrades and check Ferio bills. But having the
> office key does not automatically give them the key to every shop's
> private room. If support really needs to enter one shop, Ferio gives a
> temporary key for that exact shop, for a specific reason and job,
> records its use, and can take it away immediately.

------------------------------------------------------------------------

# 103. Junior Engineer Answer

> MT-9 provides the Ferio Platform Admin console and APIs for
> fleet-level SaaS operations such as organization lifecycle,
> provisioning, plans, subscriptions, platform billing, domains,
> database health and migrations. Platform identities use a separate
> realm and permissions, and they do not automatically receive tenant
> commerce access.

------------------------------------------------------------------------

# 104. Mid-Level Engineer Answer

> Platform Admin is a privileged Control Plane client rather than a
> universal tenant administrator. Operational workflows are exposed as
> bounded, validated and audited business actions instead of raw
> SQL/cache/database controls. Tenant lifecycle, provisioning recovery,
> plan/version administration, billing, schema drift, migration rollout
> and diagnostics remain in the Control Plane, while tenant-data support
> access requires an exact operator/organization grant with bounded
> scope, reason, TTL, usage audit and revocation.

------------------------------------------------------------------------

# 105. Senior Engineer Answer

> MT-9 establishes Ferio's operational control surface while preserving
> privilege separation between platform authority and tenant commerce
> authority. The platform console manages fleet metadata and durable
> lifecycle orchestrators through permissioned Control Plane APIs,
> minimizing direct tenant-data access and secret exposure. High-impact
> actions are state-machine controlled, DTO-validated and append-only
> audited; migration and provisioning controls operate on durable
> resumable state; infrastructure operations derive low-level targets
> server-side rather than accepting arbitrary keys or connection
> selectors. Tenant-data access is exceptional and just-in-time:
> organization/operator-bound, reasoned, scoped, time-limited, revocable
> and fail-closed on audit failure.

------------------------------------------------------------------------

# 106. Your Codebase Exercise

Trace five flows.

### A. Suspend organization

``` text
Platform Admin UI
→ platform auth
→ permission
→ DTO
→ OrganizationService
→ state transition
→ audit
```

### B. Retry provisioning

``` text
organization detail
→ Run provisioning
→ existing durable run/steps
→ resumable orchestrator
→ tenant activation/readiness
```

### C. Pause migration

``` text
migration console
→ platform permission
→ durable run PAUSED
→ queued worker wakes
→ re-check run
→ stop before tenant DB
```

### D. Support access

``` text
platform operator
→ grant request
→ reason/scope/expiry
→ grant
→ tenant-data operation
→ assert exact org/operator/scope
→ SUPPORT_ACCESS_USED
→ tenant boundary
```

### E. Domain cache invalidation

``` text
operator selects organization
→ backend reads trusted hostnames
→ tenant resolver invalidation
→ audit
```

For each flow, ask:

``` text
Who is authenticated?
Which realm?
Which permission?
What input is client-controlled?
What is re-derived server-side?
What state machine/invariant applies?
What is audited?
Could this expose tenant secrets?
Could it touch the wrong tenant?
What happens on partial failure?
```

------------------------------------------------------------------------

# 107. The Sentence to Memorize

> **Platform Admin controls Ferio's SaaS fleet through guarded Control
> Plane workflows; it manages organizations, plans, billing,
> provisioning, migrations and health, but tenant commerce access
> remains an explicit, scoped, temporary and audited exception rather
> than an automatic superuser privilege.**

------------------------------------------------------------------------

# 108. Next Document

## Document 10 --- Tenant Admin & Storefront SaaS Experience (MT-10)

Next we move from Ferio's internal operators back to the merchant and
customer experience.

We will study:

``` text
tenant owner onboarding
store setup wizard
branding
plan/usage visibility
domain readiness
suspension UX
storefront tenant context
SEO
SSR/BFF behavior
unknown/suspended domains
tenant-safe public rendering
```

The central question will be:

> **How does all of Ferio's multi-tenant architecture become a clean,
> understandable experience for the merchant and their customers?**

------------------------------------------------------------------------

**End of Document 09**