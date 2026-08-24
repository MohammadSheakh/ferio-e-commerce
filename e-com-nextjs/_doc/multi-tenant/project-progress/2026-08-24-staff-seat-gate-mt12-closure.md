# Project Progress — Staff-Seat Gate + MT-12 Closure Workflow

**Date:** August 24, 2026 (fourteenth increment)
**Scope:** Completes §13.2A enforcement (staff seats) and lands the code half of Release MT-12's closure workflow per ADR-0007.

---

## What landed

### 1. Staff-seat entitlement gate (§13.2A complete)

`StaffAccessService.invite()` now enforces the `staff_seats` plan limit inside tenant contexts:

- Active control-plane `OrganizationMember` count feeds the evaluation via a properly registered `'ORG_MEMBERS_COUNTER'` factory in the global platform module.
- The gate itself is the exported `'PLAN_GATE'` token (`useExisting: PlanGateService`) — one evaluation implementation, no duplicated limit logic.
- Both dependencies are `@Optional() @Inject(...)` — legacy deployments construct the service unchanged, and the gate is unreachable without a resolved tenant.
- Over-the-limit invitations throw stable `PLAN_LIMIT_REACHED`.

### 2. Tenant closure workflow (`TenantClosureService`, MT-12 §15.3)

- **`initiateClosure(organizationId, {actorId, reason})`**: transitions ACTIVE/SUSPENDED → CLOSURE_PENDING through the audited state machine, then **disables every domain immediately** — a lapsed business's hostname cannot be re-pointed at Ferio mid-closure. Audit records the initiated event with revoked-domain count.
- **`finalizeClosure(orgId, {retentionAcknowledged})`**: refuses to run without explicit retention acknowledgement; retires every database registration (the connection manager refuses retired registries ⇒ the tenant becomes platform-wide unreachable), transitions to CLOSED, and audits each retirement step.
- Physical destruction deliberately stays out of code — hosting/retention decisions are owner-blocked; registry retirement + connection refusal make the tenant gone from every request path today.

Platform API: `POST /platform/organizations/:id/closure/initiate` and `/closure/finalize` under `organization:write`, both audited.

## Verification

- Cacheless strict tsc over non-spec sources: zero errors.
- Build clean; **73 suites / 297 tests passing**.
- Sweep-integrity catches this pass: duplicate `providers` key from scripted module edit, missing `tryGetTenantContext` import, and an over-eager heredoc artifact — all surfaced by build/tsc gates before push.

## Checklist movement

§15.3: domain revocation ✔, connection close ✔, billing/audit preservation ✔; scheduled-job stop and physical archive PARTIAL with named gaps.

## Program status

Remaining before flag-on: full Redis key inventory (§11.1) · credential vault decision (§11.5, owner) · CI disposable-PG runner for gated suites · onboarding wizard consolidation + nav labels (§13.1/13.2 polish).
