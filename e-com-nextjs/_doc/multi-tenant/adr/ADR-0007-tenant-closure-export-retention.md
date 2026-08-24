# ADR-0007 — Tenant Closure, Export, and Retention

**Status:** PROPOSED (policy owner-blocked) · **Date:** 2026-08-24

## Context

Database-per-tenant makes tenant lifecycle operations concrete: a business may cancel, request its data, stop paying, or demand deletion. Bangladesh data-protection expectations and basic SaaS hygiene require that closure is deliberate, reversible until it isn't, and leaves no orphaned attack surface (domains, credentials, jobs).

## Decision (proposed — requires owner sign-off on retention windows)

Closure proceeds as a staged state machine on the organization:

1. **CLOSURE_PENDING** — owner-requested or triggered by billing terminal state. Storefront behavior per approved suspension policy; no new subscriptions; exports allowed.
2. **Export** — platform generates the tenant export package (business data + audit/financial records per policy + media manifest) and delivers it to the owner before destructive steps.
3. **Quiesce** — revoke domains (preventing takeover/reassignment), disable integration credentials, stop scheduled BullMQ jobs for the org, close pooled connections via the connection manager.
4. **Retention window** — database retained per legal/financial policy (owner to set; proposal: 90 days) with backups following the same expiry. Access restricted to platform recovery tooling with audit.
5. **Destruction** — archive-or-delete per policy choice; record destruction evidence in platform audit. Platform billing/audit evidence outlives tenant data.

Rules:
- Destructive deletion is blocked while retention obligations apply.
- Domain names return to the reservable pool only after verification cleanup, never during retention.
- Support-access grants auto-expire at closure.

## Consequences

**Positive:** offboarding becomes an operational workflow rather than a manual SQL ritual; takeover of lapsed domains/credentials is designed out.
**Negative/obligations:** retention decisions are legal/commercial (owner-blocked); export package format must be defined before first real customer; closure must integrate with backup lifecycle so deleted tenants don't linger in backups past policy.

## Alternatives rejected

- Immediate hard delete on cancellation: rejected — destroys dispute/legal evidence and prevents mistaken-cancellation recovery.
- Indefinite retention of closed tenants: rejected — cost and privacy liability.
