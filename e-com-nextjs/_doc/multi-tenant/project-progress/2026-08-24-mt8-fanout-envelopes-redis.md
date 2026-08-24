# Project Progress — MT-8 Core: Worker Fan-Out, Job Envelopes, Redis Scoping

**Date:** August 24, 2026 (ninth increment)
**Scope:** The unblocking release for `TENANCY_ENABLED` — background sweeps now execute per tenant with failure isolation, job envelopes carry trusted tenant identity, and worker-side database resolution comes exclusively from the control plane.

---

## What landed

### 1. `TenantFanoutService` — the per-tenant sweep primitive

Background work can't read request context, so tenancy needs an explicit executor:

- Enumerates ACTIVE organizations with READY tenant databases from the control plane.
- Resolves each client through the bounded manager (ADR-0003 — pool pressure stays constant) and runs the handler inside that tenant's frozen context.
- **Failure isolation by design**: one broken tenant is recorded (`{organizationId, error}`) and skipped; it cannot starve another tenant's jobs or crash the sweep. Sequential execution keeps connection pressure bounded; parallelism deferred until measured need.
- LEGACY mode runs the handler exactly once without context — byte-for-byte current behavior.

Unit-tested: legacy single-run, per-tenant context fan-out, and injected-failing-database isolation (`org-bad` fails → `org-good` still processes).

### 2. Both financial workers converted to fan-out + envelopes

| Worker | Scheduler (`enqueueDue`) | Processor |
|---|---|---|
| Transactional message dispatch | Per-tenant eligible-message sweep; jobs stamped `organizationId`; job IDs prefixed `t:{orgId}:…` so identical message IDs across tenants can't deduplicate each other away | Resolves envelope via `forOrganization` before dispatching |
| Payment expiry recovery | Same pattern for expired-attempt sweeps and expiry jobs | Same envelope resolution before `expireAttempt` |

**Security property**: processors accept only `organizationId` and re-resolve everything else through the control-plane registry — a poisoned/forged job payload cannot select an arbitrary database URL (checklist §11.2).

### 3. Redis scoping begins

New pure helper `scopedRedisKey(...parts)` → `t:{orgId}:{parts}` inside tenant contexts, historical shape outside. Applied to OTP keys first: the same email at two different storefronts now receives independent verification codes. Settings cache was already org-keyed (MT-7 slice 2). Rate-limit keys intentionally stay IP-scoped global.

## Verification

- Build clean; **72 suites / 293 tests passing** (+3 fan-out cases).
- Import-hygiene regression from slice 5 did not recur: fan-out service has zero heavy runtime deps; queue/processor wiring verified via full build + suite after two import-block repairs (regex-inserted multi-line imports mangled once — repaired by hand and noted as the cost of scripted edits without AST tooling).

## Checklist movement

§11.2: envelope ✔, registry validation + worker-side resolution ✔, scoped job IDs ✔, forged-job safety ✔, starvation proof ✔. §11.1: key prefixing PARTIAL (OTP done), OTP scope PARTIAL-complete. §10.4A constraint rewritten: remaining flag-on blockers are now **courier polling/callback-retry sweeps, reconciliation schedule, socket room namespacing (§11.3), credential vault (§11.5)**.

## Next

1. Finish MT-8: courier polling/callback-retry + reconciliation sweeps onto the fan-out runner; socket ticket claims carry organizationId and rooms get tenant prefixes (§11.3).
2. Then the flag-on readiness review: every worker converted, cross-tenant negative suites green in CI, membership guard swept across admin controllers.
