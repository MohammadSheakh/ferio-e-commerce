# ADR-0006 — Centralized Subscription/Entitlement Enforcement

**Status:** ACCEPTED (plan catalog owner-blocked) · **Date:** 2026-08-24

## Context

SaaS monetization requires that plan limits and feature gates are enforced where they cannot be bypassed. The failure mode to avoid is `if (user.role === 'admin')`-style scattered checks, or worse, plan-name string comparisons sprinkled through services (`if (tenant.plan === 'pro')`), which rot the moment plans are renamed or bundled.

## Decision

1. **Plans carry structured entitlements**, not names-with-meaning: each plan defines a set of `featureKey → { enabled, limit?, period? }` entries (e.g., `custom_domain`, `advanced_reports`, `staff_seats: 10`, `orders_per_month: 1000`).
2. **A single EntitlementsService** evaluates requests against (a) the subscription's active plan version, (b) explicit per-organization overrides with expiry/reason, and (c) usage counters. It returns allow/deny plus a stable machine code (`ENTITLEMENT_REQUIRED`, `PLAN_LIMIT_REACHED`).
3. Enforcement happens server-side in guards/services before business logic; frontend hiding of controls is UX only.
4. Usage metering writes idempotent counters in the control plane; limit checks may consult counters; periodic reconciliation compares counters against tenant-DB facts.
5. Subscription state (trialing/active/past-due/suspended/cancelled) gates at the same layer — suspension policy (read-only vs checkout-hidden vs storefront-down) is an owner-blocked product decision applied uniformly, not per-feature improvisation.
6. SaaS billing lives entirely in the control plane (`SaasInvoice`, `SaasPaymentAttempt`). It must never write into tenant commerce payment/wallet/COD records.

## Consequences

**Positive:** adding a plan or changing limits is data, not code; audits can answer "why was this denied?"; upgrade/downgrade flows cannot orphan logic.
**Negative/obligations:** every plan-gated capability must register its `featureKey` and call the evaluator; concurrent-limit enforcement needs atomic counter updates; entitlement test matrix becomes mandatory CI coverage.

## Alternatives rejected

- Plan-name conditionals in services: rejected — unmaintainable, untestable, audit-hostile.
- Frontend-only gating: rejected outright per PRD principle.
