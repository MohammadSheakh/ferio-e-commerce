# Ferio Engineering Learning Series
# Document 14 — Internal Alpha, Pilot Tenants & Production Launch (MT-14)

> **Goal:** Understand how Ferio moves from “the SaaS architecture exists” to “we have enough real evidence to launch Release 1 safely.”

---

# 1. This is the final Release 1 lesson

MT-14 is different from almost every earlier release.

Earlier documents mostly asked:

```text
Did we design it?
Did we implement it?
Did we test the component?
```

MT-14 asks:

```text
Can the whole system operate as one real SaaS?
```

This is the difference between **building a car** and **proving the complete car can safely drive on a real road**.

The checklist divides MT-14 into three stages:

```text
17.1 Internal alpha
17.2 Pilot beta
17.3 Production launch gate
```

The progression is deliberate:

```text
engineering-controlled tenants
        ↓
small number of controlled real businesses
        ↓
production launch
```

Do not jump directly from unit tests to unrestricted production.

---

# 2. Baby analogy: opening a new shopping mall

Imagine Ferio is a new shopping mall.

During construction you tested:

```text
locks
elevators
electricity
fire alarms
security cameras
billing
backup systems
```

But before opening to the whole city, the mall should first let its own staff use it.

That is:

```text
INTERNAL ALPHA
```

Then invite a few carefully selected real shop owners:

```text
PILOT BETA
```

Only after learning from them and proving the operational systems:

```text
PRODUCTION LAUNCH
```

MT-14 is therefore not “one more feature.”

It is **evidence that all previous features work together**.

---

# 3. The Release 1 dependency chain

Think of MT-14 as sitting on top of everything:

```text
                    MT-14
              Production Readiness
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      MT-13         MT-12         MT-11
   Hardening       Recovery      Migrations
        │             │             │
        └─────────────┼─────────────┘
                      │
             MT-1 ... MT-10
                      │
        Tenant-safe SaaS foundation
```

If backup/restore is not proven, MT-14 cannot simply pretend it is.

If the cross-tenant negative suite is incomplete, MT-14 cannot call isolation proven.

A release gate is supposed to stop wishful thinking.

---

# PART I — INTERNAL ALPHA

# 4. What is internal alpha?

Internal alpha means Ferio creates multiple realistic tenants controlled by the Ferio team and runs the system like real merchants/customers/operators would.

The checklist requires:

```text
at least 3 internal tenants
```

Why three rather than one?

One tenant proves:

```text
commerce works
```

Multiple tenants begin proving:

```text
SaaS isolation works
```

With three, you can also create different states:

```text
Tenant A → normal active shop
Tenant B → different plan/configuration
Tenant C → suspended/migration/recovery scenario
```

---

# 5. Provision three independent tenants

Each internal tenant should go through the actual provisioning path.

Conceptually:

```text
Platform Admin
    ↓
Create Organization A
    ↓
Provision DB A
    ↓
Migrate
    ↓
Seed baseline
    ↓
Activate domain
    ↓
ACTIVE

Repeat independently for B and C.
```

Do not create “test tenants” by manually wiring databases in ways real customers will never use.

The alpha should exercise the same machinery production onboarding depends on.

---

# 6. Intentionally overlapping identifiers

The checklist explicitly requires overlapping customer/product/order identifiers.

Example:

```text
Tenant A
customer ID = 100
product ID  = 500
order ID    = 900

Tenant B
customer ID = 100
product ID  = 500
order ID    = 900
```

This is intentional.

Why?

Because if every tenant accidentally has different IDs, broken routing can hide.

With overlapping IDs:

```text
ID alone cannot identify the correct record.
```

Only the trusted tenant boundary can.

This turns alpha usage into a real isolation drill.

---

# 7. Full commerce journey

Internal alpha must run:

```text
browse
  ↓
checkout
  ↓
order
  ↓
payment or COD
  ↓
fulfillment
  ↓
rider/courier
  ↓
return/refund
```

This is important because module-level tests do not prove the complete workflow.

For example:

```text
Catalog works       ✓
Order works         ✓
Payment works       ✓
Courier works       ✓
Refund works        ✓
```

does not automatically prove:

```text
Catalog → Order → Payment → Courier → Refund
```

works correctly as one stateful journey.

---

# 8. What to inspect during browse

For each tenant:

```text
correct hostname?
correct logo/store identity?
correct catalog?
correct published products?
correct Hero content?
correct support information?
correct SEO metadata?
correct cart cookie?
```

Then deliberately visit another tenant.

Nothing should carry over.

A strong test uses similar/overlapping data so visual differences do not rely only on obvious IDs.

---

# 9. Checkout evidence

During checkout verify:

```text
tenant-local cart
tenant-local prices
tenant-local coupon
tenant-local delivery zone/fee
tenant-local COD policy
tenant-local payment-provider readiness
tenant-local CommerceSettings
```

The browser must never be able to choose:

```text
organizationId
tenantDatabaseId
databaseUrl
```

as a routing mechanism.

Trusted hostname/context still decides **WHERE**.

---

# 10. Payment and COD

Run both kinds of payment flow where configured:

```text
COD
```

and:

```text
prepaid provider
```

Remember the two financial worlds:

```text
Customer → Merchant
= tenant commerce payment
= tenant DB

Merchant → Ferio
= SaaS billing
= Control Plane
```

Alpha should make sure these never become mixed.

A customer payment must never create/update a Ferio SaaS invoice.

A Ferio subscription payment must never appear as a merchant commerce payment.

---

# 11. Fulfillment and rider/courier

Continue the same order through:

```text
confirmation
stock/reservation
fulfillment
courier/rider assignment
tracking
delivery
```

Verify every asynchronous path still knows the correct organization.

This tests more than HTTP.

It touches:

```text
BullMQ
integration credentials
rider identity
tracking
possibly WebSockets
tenant DB context re-entry
```

A system can be safe during the original HTTP request but leak later if a background job loses tenant identity.

---

# 12. Return/refund

Complete a real return/refund flow.

Check:

```text
correct original order
correct tenant
correct payment/wallet effects
correct inventory effect
correct audit/history
correct asynchronous follow-up
```

Use overlapping order/customer identifiers in another tenant and confirm nothing there changes.

Financial isolation deserves explicit evidence.

---

# 13. Wallet flow

The checklist separately requires a wallet flow.

Why separate it from the ordinary order flow?

Because wallet is a ledger-like financial subsystem.

Test:

```text
credit
debit/use
balance
ledger/history
refund interaction if applicable
```

Then prove the same customer ID in another tenant has an independent wallet.

Never assume:

```text
customerId = globally unique
```

in a database-per-tenant architecture.

---

# 14. Warranty, service, chat and pickup

Alpha must also run:

```text
warranty
service
chat
pickup
```

These are valuable because they exercise less-obvious access paths.

Cross-tenant bugs often survive in “secondary” modules after developers correctly migrate the main order/catalog paths.

Chat also exercises realtime boundaries.

Pickup/service flows may involve different staff, states, and background behavior.

The lesson:

> **Isolation must apply to boring side features too, not only checkout.**

---

# 15. Suspension and reactivation

Run:

```text
ACTIVE
   ↓
SUSPENDED
   ↓
ACTIVE
```

Expected Ferio policy includes:

```text
storefront browsing/read paths may remain available
checkout and non-read commerce mutation blocked
billing/recovery paths remain possible according to policy
```

The important test is not just that a “Suspended” badge appears.

The backend must enforce the state.

Try:

```text
POST order
update product
other commerce mutation
```

and verify the stable denial behavior.

Then reactivate and verify normal operation returns without corrupting tenant data.

---

# 16. Plan upgrade/downgrade

Run a real plan lifecycle.

Example:

```text
Starter
   ↓
Business
   ↓
Starter
```

Verify:

```text
entitlements change
limits change
usage display changes
historical commerce records remain
downgrade does not delete products/orders/customers
```

Plan state is Control Plane configuration.

It should control permission/capability, not destructively rewrite tenant history.

---

# 17. Provisioning retry

Intentionally create or simulate a recoverable provisioning failure.

Then use the supported retry/resume path.

Expected:

```text
completed steps are not blindly duplicated
existing resources are reused safely
first incomplete/retryable step resumes
run history remains diagnosable
```

This validates MT-4 under realistic operations.

Idempotency is most valuable when something goes wrong.

---

# 18. Migration canary and batch

Internal alpha must execute the fleet migration process.

Conceptually:

```text
canonical migration
      ↓
canary tenant
      ↓
verify
      ↓
bounded batch
      ↓
remaining tenants
```

Test:

```text
success
one tenant failure
pause
retry
resume
already-successful tenant not re-run unnecessarily
```

Do not test fleet migrations for the first time on paying production customers.

---

# 19. Backup and restore

The checklist explicitly requires:

```text
Run tenant backup/restore.
```

This is crucial because the production launch gate also says backup and restore must be proven.

A backup that has never been restored is only a claim.

The drill should establish evidence such as:

```text
backup exists
correct tenant identified
restore procedure works
restored data is verified
tenant isolation preserved
RPO/RTO evidence recorded
```

Because MT-12 still contains open production recovery work, this is one of the reasons MT-14 cannot currently be considered complete.

---

# 20. Support-access workflow

Run the complete privileged support lifecycle:

```text
operator requests/granted access
        ↓
exact organization
bounded reason
bounded TTL
bounded resource/action scope
        ↓
support access used
        ↓
audit event
        ↓
revoke/expire
        ↓
future access denied
```

Verify:

```text
wrong org → deny
expired → deny
revoked → deny
wrong operator → deny
wrong scope → deny
audit failure → fail closed
```

This proves Platform Admin is not secretly a universal tenant superuser.

---

# 21. Internal alpha evidence package

Do not finish alpha with:

```text
"we clicked around and it looked okay"
```

Create evidence.

For every scenario record:

```text
scenario
tenant(s)
build/commit
date
operator
expected result
actual result
pass/fail
logs/metrics reference
incident/bug reference
follow-up
```

A release decision needs reproducible evidence, not memory.

---

# PART II — PILOT BETA

# 22. What changes in pilot beta?

Internal staff know the product too well.

They already understand:

```text
what Ferio means
where settings are
which values are required
how provisioning works
what an error probably means
```

A real merchant does not.

Pilot beta tests the product with:

```text
2–5 controlled real businesses
```

according to the checklist.

The purpose is not maximum growth.

It is **controlled learning**.

---

# 23. Why only 2–5 businesses?

Early SaaS operations are still learning:

```text
onboarding friction
provider setup
domain issues
merchant expectations
support load
real catalog behavior
usage patterns
plan fit
```

If you onboard 500 businesses before understanding these, every small product problem becomes a large operational problem.

A controlled pilot limits blast radius.

---

# 24. Select pilot businesses deliberately

Choose businesses that can cooperate closely.

Useful characteristics may include:

```text
responsive owner
real products/orders
willing to report problems
different operational patterns
manageable initial volume
```

The checklist itself only mandates selecting 2–5 controlled real businesses; selection details should be treated as pilot planning, not hardcoded product requirements.

Avoid pretending a pilot is a statistically complete market study.

Its job is operational learning and validation.

---

# 25. Provision each independently

Every pilot merchant should use the real provisioning workflow.

Do not create shortcuts such as:

```text
copy Tenant A DB
rename it Tenant B
manually patch domain
```

unless the production provisioning product itself intentionally supports such a workflow.

The pilot should validate what future customers will actually experience.

---

# 26. Owner onboarding

Validate the owner's first experience:

```text
invitation
login
organization context
Store Setup checklist
identity/branding
delivery
COD/payment
courier
domain
catalog
plan/usage
```

Measure confusion.

If an engineer must explain every field on a call, the code may technically work while onboarding is still weak.

---

# 27. Real domains and subdomains

Pilot beta requires validation of real:

```text
subdomains
domains
```

This exercises production infrastructure beyond localhost.

Verify:

```text
DNS
TLS
Host forwarding
trusted proxy
tenant resolver
SSR/BFF
SEO/canonical behavior
cache isolation
domain lifecycle
```

Custom-domain DNS/TLS readiness must be evaluated against the actual implementation/operations state rather than assumed from the existence of a domain record.

---

# 28. Tenant-specific provider configuration

Real businesses may use different:

```text
payment credentials
courier credentials
notification configuration
```

The pilot must prove configuration stays tenant-specific.

Example:

```text
Tenant A SSLCommerz credentials
must never be used for
Tenant B payment.
```

Provider callbacks and background reconciliation must re-establish the correct tenant context without trusting browser-supplied tenant selection.

---

# 29. Monitor database pools and tenant latency

During pilot, watch:

```text
active tenant clients
pool pressure
acquisition latency
breaker events
tenant-specific slowdowns
overall API latency
```

The question is not only:

```text
"Is the server CPU okay?"
```

You also need:

```text
"Is one tenant consuming shared DB capacity?"
```

MT-13's connection-budget model now meets real usage.

---

# 30. Monitor queue fairness

Watch asynchronous workloads:

```text
notifications
courier polling
reconciliation
payment expiry
other tenant fan-out
```

Ask:

```text
Does one busy tenant delay everyone?
Do failures remain isolated?
Does retry create storms?
Are dead-letter/failure signals understandable?
```

Queue fairness is part of SaaS quality.

---

# 31. Monitor support volume

Pilot support tells you what the product still forces humans to do.

Track categories such as:

```text
onboarding
domain
payment configuration
courier
catalog import/setup
orders
billing
permissions
bugs
```

The checklist requires monitoring support volume.

Do not interpret every support request as a code defect. Some reveal documentation or UX problems.

But high support volume can make a technically working SaaS economically difficult to operate.

---

# 32. Collect onboarding friction

Ask where merchants get stuck.

Examples:

```text
unclear terminology
too many required fields
domain setup confusing
payment readiness unclear
plan limits surprising
catalog setup slow
owner invitation unclear
```

Record concrete friction rather than vague feedback like:

```text
"UI could be better."
```

Good pilot evidence identifies:

```text
step
problem
frequency
severity
workaround
candidate fix
```

---

# 33. Collect plan and limit feedback

The current Ferio plan architecture supports entitlements and limits, but early pricing/limits are partly pilot-dependent.

Pilot feedback can reveal:

```text
500 products too low/high?
2 staff seats realistic?
warehouse limits appropriate?
which growth features matter?
which limit causes unexpected friction?
```

Do not rewrite plan logic for every single merchant request.

Look for patterns.

---

# 34. Freeze destructive schema changes

The checklist says:

> Freeze destructive schema changes during pilot unless required.

Why?

During a pilot you want:

```text
stable data
safe migrations
easy diagnosis
low recovery risk
```

Destructive migrations such as immediate column/table deletion make rollback and mixed-version compatibility harder.

Prefer the migration principle from MT-11:

```text
EXPAND
  ↓
MIGRATE
  ↓
CONTRACT later
```

Pilot is not the time for casual destructive database cleanup.

---

# PART III — PRODUCTION LAUNCH GATE

# 35. What is a launch gate?

A launch gate is a set of conditions that must be satisfied before declaring Release 1 production-ready.

It is not:

```text
a progress percentage
a manager feeling confident
the app looking finished
```

It is:

```text
explicit evidence
against explicit criteria
```

If a mandatory criterion is open, the honest status is:

```text
NOT YET READY
```

---

# 36. Gate: every Release 1 SaaS exit criterion passes

Current status:

```text
OPEN
```

This is intentionally broad.

MT-14 depends on previous releases.

If earlier mandatory gates remain open, Release 1 cannot be declared complete simply because MT-14 code exists.

Think of this as the top-level AND condition:

```text
MT-1 ready
AND MT-2 ready
AND ...
AND required Release 1 criteria ready
→ launch eligibility
```

---

# 37. Gate: two independent organizations with isolated DBs and domains

Current status:

```text
OPEN
```

The production gate needs real evidence that at least two organizations operate with:

```text
independent organization records
independent tenant DBs
independent domains
```

and remain isolated.

This is the minimum practical proof that the product is actually multi-tenant rather than a single-tenant app with SaaS-looking metadata.

---

# 38. Gate: cross-tenant negative suite passes

Current status:

```text
OPEN
```

MT-13 already contains extensive isolation tests.

But the production gate still explicitly requires the cross-tenant negative suite to pass.

This should include the remaining important open coverage, especially live SSR/BFF tenant-confusion evidence.

A production gate should consume the final verified suite, not assume it will pass later.

---

# 39. Gate: provisioning is idempotent

Current status:

```text
DONE
```

The checklist points to tests covering:

```text
concurrent replay
completed replay
cross-organization idempotency-key conflict
```

This means retrying provisioning does not blindly duplicate tenant resources.

That is essential for safe onboarding operations.

---

# 40. Gate: migration orchestration is proven

Current status:

```text
DONE
```

Evidence covers:

```text
canary progression
batch progression
isolated tenant failure
threshold pause
queued resume
successful tenants not unnecessarily re-run
```

This is important because database-per-tenant turns one schema migration into a fleet operation.

---

# 41. Gate: subscription and entitlement enforcement

Current status:

```text
DONE
```

The checklist cites integration coverage for:

```text
plan limits
activation
usage enforcement
lifecycle transitions
```

plus focused entitlement override tests.

This proves plan restrictions are not only visual UI controls.

The server is authoritative.

---

# 42. Gate: SaaS billing separated from commerce billing

Current status:

```text
DONE
```

Control Plane:

```text
SaasInvoice
SaasPaymentAttempt
Ferio subscription billing
```

Tenant plane:

```text
customer payment attempts
merchant payment configuration
wallet/commerce financial data
```

This financial separation is a core architecture invariant.

---

# 43. Gate: backup and restore proven

Current status:

```text
OPEN
```

This is one of the most important blockers.

A backup system is not proven because:

```text
backup job says success
```

It is proven when restore is exercised and verified.

Production launch needs real evidence that a tenant can be recovered according to the intended recovery process.

This directly connects to MT-12.

---

# 44. Gate: unknown and suspended domain behavior

Current status:

```text
DONE
```

The resolver, middleware and Customer Web behavior prove unknown/suspended/closed domains fail closed or render safe unavailable/noindex behavior.

This prevents a lifecycle/routing problem from falling into another tenant or legacy store.

---

# 45. Gate: Redis, BullMQ, WebSocket and file isolation

Current status:

```text
DONE at application isolation level
```

Evidence includes tenant-prefixed job/socket/object identifiers and two-tenant collision/isolation suites.

The checklist also notes external Redis deployment/capacity evidence is separate operational work.

This distinction matters:

```text
code isolation proof
≠
all production infrastructure capacity proof
```

---

# 46. Gate: Platform Admin support access constrained

Current status:

```text
DONE
```

Support access is:

```text
reason-bound
time-bound
organization/user-scoped
revocable
usage-audited
```

Platform Admin therefore does not automatically become an unrestricted tenant superuser.

---

# 47. Gate: no production fallback to original DB

Current status:

```text
DONE
```

This is a huge milestone.

Production configuration requires tenancy and the shared resolver rejects missing tenant context rather than silently returning the legacy Prisma client.

Why is this important?

Imagine:

```text
tenant resolution bug
        ↓
fallback to original DB
        ↓
request still "works"
```

That can hide routing errors and potentially create data exposure/corruption.

Correct:

```text
cannot establish trusted tenant
        ↓
FAIL CLOSED
```

---

# 48. Gate: critical/high security findings

Current status:

```text
OPEN
```

Before launch:

```text
critical/high findings
```

must either be:

```text
closed
```

or:

```text
formally accepted
```

Formal acceptance should mean an explicit risk decision, not:

```text
"we know about it but forgot."
```

A useful risk record normally identifies:

```text
finding
severity
affected boundary
likelihood/impact
mitigation
owner
decision
expiry/review date if applicable
```

Exact governance format is an operational decision unless defined elsewhere.

---

# 49. Gate: operational runbooks

Current status:

```text
OPEN
```

A runbook tells operators what to do when a known class of incident happens.

Examples Ferio should be prepared for include:

```text
tenant cannot resolve
tenant DB unavailable
pool capacity exhausted
provisioning stuck
migration paused
payment callback problem
queue backlog
domain/TLS issue
tenant suspension
support-access emergency
backup failure
restore request
security isolation alert
```

A production system is not only code.

It is code plus people plus procedures.

---

# 50. What a useful runbook contains

A practical structure:

```text
TITLE
Tenant DB unavailable

SYMPTOMS
TENANT_UNAVAILABLE
db_acquire_failure spike
breaker opened

IMPACT
One tenant / multiple tenants?

CHECKS
resolver state
TenantDatabase registry
DB provider health
pool/capacity
migration readiness

SAFE ACTIONS
bounded retry
provider investigation
approved recovery path

DO NOT
switch to another tenant DB
use legacy fallback
log credentials

ESCALATION
when/who

RECOVERY VERIFICATION
tenant read/write health
no cross-tenant impact

POST-INCIDENT
timeline
root cause
follow-up
```

The exact runbooks should match actual Ferio deployment infrastructure.

Do not write fictional production commands before that infrastructure is known.

---

# PART IV — RELEASE EVIDENCE

# 51. A checklist tick needs evidence

Bad release management:

```text
[x] backup works
```

because somebody remembers testing it last month.

Better:

```text
criterion: tenant restore proven
evidence:
- backup ID/reference
- tenant
- restore environment
- timestamp
- verification queries/tests
- measured duration
- operator
- result
```

The checklist should point to reproducible evidence.

---

# 52. Build a release evidence matrix

Conceptual example:

| Criterion | Status | Evidence | Owner | Blocker |
|---|---|---|---|---|
| Provisioning idempotency | PASS | automated tests | Backend | — |
| Migration orchestration | PASS | orchestration suite | Backend | — |
| Cross-tenant suite | OPEN | final suite pending | Security/Backend | SSR/BFF |
| Backup/restore | OPEN | restore drill needed | Ops | provider workflow |
| Runbooks | OPEN | incomplete | Ops | deployment specifics |

Do not copy this table blindly as the official tracker; use the actual checklist and project evidence as source of truth.

---

# 53. Alpha vs beta vs production evidence

Different stages answer different questions.

### Internal alpha

```text
Can our own team make the whole SaaS work?
```

### Pilot beta

```text
Can real merchants use it under controlled conditions?
```

### Production gate

```text
Do we have enough technical, security, recovery and operational evidence to launch?
```

Passing one stage does not automatically pass the next.

---

# PART V — INCIDENT THINKING BEFORE LAUNCH

# 54. Scenario: Tenant A sees Tenant B data

This is the highest-severity class of SaaS failure.

Immediate priorities conceptually:

```text
contain affected path
preserve evidence
identify affected tenants/data
stop unsafe access
investigate trust boundary
verify other paths
follow incident/security process
```

Do not “fix” the symptom by deleting logs or data.

This scenario is why the launch gate requires cross-tenant security evidence.

---

# 55. Scenario: one tenant database fails

Desired architecture:

```text
Tenant A DB down
        ↓
A fails safely
breaker/metrics visible

Tenant B/C
        ↓
continue
```

Runbook should help distinguish:

```text
tenant-local DB problem
vs
Control Plane/shared provider outage
vs
connection-budget problem
```

---

# 56. Scenario: provisioning partially fails

Do not manually recreate random resources first.

Use the durable provisioning timeline.

Determine:

```text
which step completed?
which step failed?
is retry safe?
did provider outcome become ambiguous?
does the resource already exist?
```

Then use supported retry/recovery behavior.

This is exactly why provisioning was designed as an idempotent state machine.

---

# 57. Scenario: migration batch fails

Desired:

```text
canary/batch failure
        ↓
threshold/policy
        ↓
pause
        ↓
inspect affected tenants
        ↓
fix/forward migration
        ↓
retry failed
        ↓
resume
```

Do not repeatedly rerun successful tenants without reason.

Fleet migration state must be durable.

---

# 58. Scenario: backup exists but restore fails

This should block a claim that recovery is proven.

Investigate:

```text
backup integrity
credentials/access
provider process
schema compatibility
restore target
verification procedure
RPO/RTO
```

The correct response is not:

```text
"backup dashboard was green, so we're okay."
```

Restore is the proof.

---

# 59. Scenario: pilot merchant cannot configure payment

Possible causes:

```text
bad credentials
missing required fields
provider account not ready
wrong tenant configuration
callback/domain issue
entitlement disabled
```

The UI should expose bounded readiness information without revealing secrets.

Support should have a runbook that diagnoses the correct tenant without copying credentials into logs/chat.

---

# 60. Scenario: one pilot creates huge queue load

Watch:

```text
queue depth
tenant failure metrics
job latency
retry rate
fairness
worker concurrency
```

Do not solve the problem by making concurrency unbounded.

Scale while preserving resource budgets and tenant fairness.

---

# PART VI — GO / NO-GO THINKING

# 61. Green does not mean perfect

Production software always has risk.

A GO decision means:

```text
known mandatory criteria passed
remaining accepted risks understood
recovery capability exists
operators know what to do
monitoring can detect critical failures
```

It does not mean:

```text
zero bugs forever
```

---

# 62. Red means do not hide it

If a mandatory gate is open, keep it open.

Examples currently open in MT-14 include:

```text
internal alpha execution
pilot beta execution
all Release 1 exit criteria
two-org isolated production proof
cross-tenant negative suite
backup/restore proof
critical/high security disposition
operational runbooks
```

A checklist is valuable only if unchecked items remain visibly unchecked.

---

# 63. Yellow means explicit risk

Some issues may be non-blocking if formally accepted according to project governance.

But do not silently reinterpret:

```text
OPEN
```

as:

```text
probably fine
```

For a launch decision, each unresolved issue should have:

```text
severity
impact
mitigation
owner
decision
```

Critical/high security findings receive special attention in the explicit production gate.

---

# 64. Why "works on my machine" is not launch evidence

Local development cannot fully prove:

```text
real DNS
real TLS
real ingress
real provider callbacks
production pooling
real queue topology
production backup
restore procedure
alert routing
operator response
```

MT-14 intentionally moves from code correctness toward system operations.

---

# 65. Why real merchants reveal different problems

Engineers often know hidden rules:

```text
which field format works
which button to click
which provider account is required
which error is harmless
```

Real merchants expose assumptions.

That is why pilot beta explicitly collects:

```text
onboarding friction
support volume
plan/limit feedback
```

These are product-operability signals.

---

# PART VII — HOW THE PREVIOUS 13 DOCUMENTS CONNECT

# 66. MT-1/MT-2: trusted tenant identity

Alpha asks:

```text
Do real requests consistently resolve the right tenant?
```

Negative tests ask:

```text
Can host/token manipulation confuse it?
```

---

# 67. MT-3: database routing

Alpha proves:

```text
A → DB A
B → DB B
C → DB C
```

under real end-to-end flows.

Pilot monitoring then watches pool pressure and latency.

---

# 68. MT-4: provisioning

Internal alpha runs provisioning and retry.

Pilot beta provisions each real merchant independently.

Production gate already has automated idempotency proof.

---

# 69. MT-5: domains

Pilot validates real subdomains/domains, DNS/TLS behavior, SSR/BFF forwarding and tenant-safe storefront rendering.

---

# 70. MT-6: plans and billing

Alpha runs upgrade/downgrade.

Pilot collects plan/limit feedback.

Production gate already recognizes subscription/entitlement enforcement and SaaS-vs-commerce billing separation as proven.

---

# 71. MT-7: commerce

Internal alpha runs the complete commerce journey and secondary workflows.

This is the real vertical-slice proof that individual tenant-safe modules compose correctly.

---

# 72. MT-8: async infrastructure

Fulfillment, notifications, payments, chat, courier and other async work prove jobs/sockets/files/integrations remain tenant-scoped.

The production gate marks Redis/BullMQ/WebSocket/file application isolation proven.

---

# 73. MT-9: Platform Admin

Alpha exercises provisioning, lifecycle, migration, diagnostics and support access through supported operator surfaces instead of direct database shells.

---

# 74. MT-10: tenant experience

Pilot owner onboarding validates whether the SaaS is usable by actual merchants rather than only by Ferio developers.

---

# 75. MT-11: migrations

Alpha runs canary/batch migration.

Production gate marks orchestration proof complete.

---

# 76. MT-12: recovery

Alpha must run backup/restore.

Production gate keeps recovery open until it is actually proven.

This is one of the most important remaining dependencies.

---

# 77. MT-13: hardening

Alpha/pilot traffic feeds real logs and metrics.

The final cross-tenant/security review and operational alerting must be completed rather than inferred from code-level instrumentation.

---

# PART VIII — SENIOR ENGINEERING CONCEPTS

# 78. Release readiness is a system property

You cannot prove launch readiness by looking only at NestJS.

It depends on:

```text
backend
storefront
admin apps
Control Plane
tenant DBs
Redis
workers
WebSockets
object storage
DNS
TLS
payment/courier providers
backups
monitoring
people/runbooks
```

Production is the composition of all these systems.

---

# 79. Evidence hierarchy

Not all evidence has equal strength.

Conceptually:

```text
"I think it works"
        ↓
manual local test
        ↓
automated unit test
        ↓
real integration test
        ↓
multi-tenant E2E
        ↓
controlled production-like drill
        ↓
real pilot operational evidence
```

Different criteria need different evidence.

For example, a mocked backup unit test cannot prove real restore capability.

---

# 80. Isolation must survive composition

Suppose every component looks tenant-safe individually:

```text
HTTP safe
DB safe
queue safe
storage safe
```

But an end-to-end workflow could still pass the wrong organization ID from one layer to another.

Therefore MT-14's full journeys matter.

Security is not only a property of individual classes.

It is a property of their composition.

---

# 81. Operational maturity

A system becomes operationally mature when failure is expected and prepared for.

Instead of:

```text
"What if the DB goes down?"
```

the team has:

```text
signal
alert
owner
runbook
safe action
recovery verification
post-incident learning
```

MT-14's runbook gate is therefore an engineering requirement, not paperwork.

---

# 82. Blast radius

Ask for every operation:

```text
If this fails, how many tenants are affected?
```

Good database-per-tenant design aims for:

```text
tenant-local DB failure
→ tenant-local impact
```

Shared Control Plane/Redis/ingress failures may have broader blast radius and deserve stronger operational controls.

Pilot beta is a safe time to measure these assumptions.

---

# 83. Reversibility

Before launch, prefer changes that are easy to reverse.

Examples:

```text
feature flag
configuration change
expand migration
bounded rollout
canary
```

Be more cautious with:

```text
destructive migration
mass data rewrite
irreversible provider action
bulk tenant lifecycle mutation
```

This is why destructive schema changes are frozen during pilot unless required.

---

# 84. Stop conditions

Production rollout should have explicit reasons to stop.

Examples:

```text
cross-tenant isolation failure
critical security finding
restore failure
unexplained data corruption
migration fleet instability
severe shared-capacity exhaustion
```

Do not continue rollout merely because a launch date was announced.

---

# 85. Pilot success criteria

Before pilot starts, define what success means.

Useful categories:

```text
onboarding completion
domain readiness
provider readiness
full order completion
support burden
latency/capacity
queue fairness
tenant isolation
incident count/severity
plan/limit fit
```

The exact numeric thresholds should come from project/business decisions, not be invented in this teaching document.

---

# PART IX — PRACTICAL EXECUTION PLAN

# 86. Alpha Tenant A

Use as a normal active commerce tenant.

Exercise:

```text
catalog
cart
checkout
COD/prepaid
fulfillment
delivery
return/refund
wallet
```

Record evidence.

---

# 87. Alpha Tenant B

Use intentionally overlapping IDs/data shapes.

Exercise the same flows while Tenant A remains active.

Purpose:

```text
concurrent isolation
```

not merely sequential testing.

---

# 88. Alpha Tenant C

Use for lifecycle/operations drills:

```text
suspend/reactivate
plan changes
provisioning retry
migration canary/batch
backup/restore
support access
```

Do not restrict every drill permanently to C; critical isolation operations should still prove behavior across more than one tenant where relevant.

---

# 89. Run concurrent traffic

Sequential testing can hide shared-state bugs.

Try:

```text
Tenant A checkout
while
Tenant B admin updates product
while
Tenant C job/migration activity runs
```

Then inspect:

```text
DB routing
Redis keys
queue jobs
socket delivery
logs
metrics
connection pressure
```

This more closely resembles real SaaS behavior.

---

# 90. Create an alpha issue log

For every failure:

```text
ID
tenant
scenario
severity
reproduction
expected
actual
evidence
root cause
fix
regression test
status
```

A bug fixed without a regression test may return later.

For isolation bugs, add a negative test whenever practical.

---

# 91. Pilot onboarding checklist

For each business:

```text
organization provisioned
owner invited
owner login successful
store identity configured
domain/subdomain ready
delivery configured
COD configured
payment configured if used
courier configured if used
catalog ready
test order completed
real order monitored
plan/usage understood
support contact established
```

Adapt this to the actual product workflow.

---

# 92. Pilot daily review

During a small controlled pilot, review:

```text
new incidents
support requests
DB/pool health
tenant latency
queue fairness
payment/courier failures
domain problems
onboarding blockers
security signals
backup evidence
```

The exact cadence is an operational decision, but early pilots benefit from tight feedback loops.

---

# 93. Pre-launch security review

Map trust boundaries:

```text
hostname
JWT/session
platform auth
support grant
tenant DB routing
jobs
callbacks
WebSockets
Redis
storage
provider configuration
SSR/BFF
```

For each:

```text
What input is untrusted?
Where is it verified?
What trusted context is produced?
Can client input select another tenant?
What negative test proves it?
```

Close or formally disposition findings according to the launch gate.

---

# 94. Pre-launch restore drill

A meaningful drill should answer:

```text
Can we identify the correct tenant backup?
Can we restore without touching another tenant?
Can we verify schema/data?
Can we measure recovery time?
Can we identify lost-data window?
Can we return the tenant to a safe service state?
```

Do not use the production launch as the first restore experiment.

---

# 95. Pre-launch runbook review

For each critical incident, ask a developer/operator who did not write the feature to follow the runbook.

If the runbook only works because the author remembers undocumented steps, it is incomplete.

Good operational documentation reduces dependence on one person's memory.

---

# PART X — CURRENT MT-14 STATUS

# 96. Internal alpha status

Every listed internal-alpha item is currently unchecked:

```text
OPEN provision ≥3 internal tenants
OPEN intentionally overlapping identifiers
OPEN full commerce flow
OPEN wallet flow
OPEN warranty/service/chat/pickup
OPEN suspension/reactivation
OPEN plan upgrade/downgrade
OPEN provisioning retry
OPEN migration canary/batch
OPEN backup/restore
OPEN support-access workflow
```

So internal alpha has not yet been recorded as complete in the source checklist.

---

# 97. Pilot beta status

Every listed pilot item is currently unchecked:

```text
OPEN select 2–5 controlled real businesses
OPEN independent provisioning
OPEN owner onboarding
OPEN real domains/subdomains
OPEN tenant-specific provider configuration
OPEN DB pool/tenant latency monitoring
OPEN queue fairness monitoring
OPEN support volume monitoring
OPEN onboarding-friction collection
OPEN plan/limit feedback
OPEN destructive-schema freeze during pilot
```

So the pilot stage is also still ahead.

---

# 98. Production gate — completed items

The checklist currently marks these complete:

```text
DONE provisioning idempotency
DONE migration orchestration
DONE subscription/entitlement enforcement
DONE Platform SaaS billing separated from tenant commerce billing
DONE unknown/suspended-domain behavior
DONE Redis/BullMQ/WebSocket/file application isolation
DONE Platform Admin support access constrained/audited
DONE no production request path falls back to original single-tenant DB
```

These are significant Release 1 achievements.

---

# 99. Production gate — open items

Still open:

```text
OPEN every PRD Release 1 SaaS exit criterion
OPEN ≥2 independent organizations with isolated DBs/domains
OPEN cross-tenant negative suite
OPEN backup and restore proof
OPEN critical/high security findings closed/formally accepted
OPEN operational runbooks
```

Therefore the correct status is:

> **Ferio Release 1 is not yet production-launch complete according to the current checklist.**

This is not a criticism. It is exactly what a useful release checklist is supposed to show.

---

# 100. Why you should not tick these early

Suppose:

```text
backup code exists
```

but restore has not been run.

Do not tick:

```text
[x] Backup and restore are proven
```

Suppose most isolation tests pass but SSR/BFF E2E is missing.

Do not tick:

```text
[x] Cross-tenant negative test suite passes
```

Suppose the application emits alert events but nobody receives them.

Do not tick:

```text
[x] Critical metrics and alerts operational
```

A checkbox should describe reality.

---

# 101. What happens after MT-14?

The source checklist continues into:

```text
Release 2 — Multi-Tenant CRM, Retention, and Growth
```

But it explicitly says Release 2 should begin only after SaaS isolation and operations are stable.

That means Release 2 is **not part of the MT-1 → MT-14 Release 1 foundation series** we have been studying.

The next phase adds growth/CRM capabilities on top of a proven SaaS foundation.

---

# 102. Release 2 preview

The next source section begins with Tenant Customer 360 and then tenant consent/communications.

Examples include:

```text
tenant-local customer timeline
duplicate-profile review within a tenant
delivered/cancelled/returned/spend/source/risk indicators
support context
cohort/lifetime-value views
channel-specific consent
revocation/suppression
frequency caps
quiet hours
tenant marketing kill switch
explainable eligibility
```

A particularly important rule remains:

```text
Customer 360 stays tenant-local
```

unless a separate privacy-reviewed platform product is explicitly approved.

That shows the same isolation philosophy continues into growth features.

---

# 103. Self-test

Answer these without looking back:

1. What are the three stages of MT-14?
2. Why does internal alpha require at least three tenants?
3. Why intentionally overlap IDs?
4. Why run the complete commerce journey instead of only module tests?
5. Why test COD and prepaid separately?
6. What is the difference between commerce payment and SaaS billing?
7. Why do fulfillment/courier flows test more than HTTP?
8. Why is wallet tested separately?
9. Why include warranty/service/chat/pickup?
10. What must suspension block?
11. Why must downgrade preserve historical records?
12. What does provisioning retry prove?
13. Why run canary/batch migration during alpha?
14. Why does backup require a restore drill?
15. Why exercise support access during alpha?
16. What is the purpose of pilot beta?
17. Why only 2–5 controlled businesses initially?
18. Why independently provision each pilot?
19. What does real-domain validation test?
20. Why monitor DB pools per tenant?
21. What is queue fairness?
22. Why collect support volume?
23. What is onboarding friction?
24. Why collect plan/limit feedback?
25. Why freeze destructive migrations during pilot?
26. What is a production launch gate?
27. Which production-gate items are already complete?
28. Which production-gate items remain open?
29. Why is “backup job succeeded” insufficient?
30. Why are runbooks engineering artifacts?
31. What is blast radius?
32. Why is reversibility valuable before launch?
33. Why does composition need E2E testing?
34. Why should checklist evidence be reproducible?
35. Why must open gates stay open?
36. When should Release 2 begin?

---

# 104. Ten sentences to memorize

> **1. MT-14 proves the whole SaaS, not another isolated component.**

> **2. Internal alpha tests Ferio with multiple controlled tenants before real merchants depend on it.**

> **3. Overlapping identifiers force tenant isolation to do the real work.**

> **4. A full commerce journey proves that individually safe modules compose safely.**

> **5. Pilot beta is controlled learning with 2–5 real businesses, not unrestricted growth.**

> **6. A backup is not proven until a restore is successfully exercised and verified.**

> **7. Production readiness includes DNS, databases, queues, providers, monitoring, recovery, people, and runbooks—not only application code.**

> **8. A release checkbox must represent evidence, not confidence.**

> **9. Ferio Release 1 remains open while mandatory launch criteria remain unchecked.**

> **10. Release 2 should begin only after SaaS isolation and operations are stable.**

---

# 105. Baby → junior → senior

### Baby

First Ferio staff test three shops. Then a few real shops try it. Only then should everybody be invited.

### Junior

Run complete workflows, record bugs, verify domains/providers, monitor the system, and keep launch blockers visible.

### Mid-level

Use multi-tenant E2E evidence, pilot telemetry, restore drills, migration drills, security review, and operational runbooks to prove release readiness.

### Senior

Treat launch as a risk/evidence decision across software, tenant isolation, distributed infrastructure, capacity, recovery, security, merchant usability, operational processes, and reversibility. Never convert an unproven assumption into a green release gate.

---

# 106. Final Release 1 mental model

```text
                    FERIO RELEASE 1
                           │
             ┌─────────────┴─────────────┐
             │                           │
       TECHNICAL PROOF              REAL USE PROOF
             │                           │
      isolation tests               internal alpha
      provisioning                  pilot merchants
      migrations                    onboarding
      entitlements                   domains/providers
      async isolation                support feedback
      capacity                       real workloads
             │                           │
             └─────────────┬─────────────┘
                           ▼
                    OPERATIONS PROOF
                           │
                     monitoring
                       alerts
                      runbooks
                   backup/restore
                   security review
                           │
                           ▼
                    PRODUCTION GATE
                           │
                 all mandatory criteria?
                     /           \
                   NO             YES
                   │               │
              DO NOT CLAIM       LAUNCH
               COMPLETE        WITH EVIDENCE
```

---

# 107. Current final checkpoint

```text
Documents completed in this learning series:
01 Multi-Tenancy Fundamentals
02 Request Journey & Trusted Tenant Resolution
03 Tenant DB Router & Connection Management
04 Tenant Provisioning & Lifecycle
05 Domain, DNS, TLS & Storefront Routing
06 Plans, Subscriptions, Entitlements & SaaS Billing
07 Tenant-Safe Commerce
08 Jobs, Redis, WebSockets, Files & Integrations
09 Platform Admin
10 Tenant Admin & Storefront SaaS Experience
11 Tenant Migration Orchestration
12 Backup, Restore, Export, Closure & DR
13 Observability, Security, Performance & Hardening
14 Internal Alpha, Pilot & Production Launch

Release 1 learning series:
COMPLETE

Actual Ferio production-launch checklist:
NOT YET COMPLETE
```

That distinction is the final lesson.

You now have the full conceptual path from:

```text
"What is a tenant?"
```

to:

```text
"How do we decide whether a database-per-tenant SaaS is genuinely ready to launch?"
```

The learning series is finished, but the real engineering checklist should remain honest until its open operational and launch evidence is completed.