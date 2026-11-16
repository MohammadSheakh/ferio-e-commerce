# ADR-0010 — Per-Tenant Feature Flagging and Commercial Scope Decoupling

**Status:** ACCEPTED · **Date:** 2026-11-16  
**Deciders:** Engineering, Product Architecture, Product Owner  
**Related ADRs:** [ADR-0006](ADR-0006-subscription-entitlement-enforcement.md), [ADR-0008](ADR-0008-platform-admin-app-boundary.md)  
**Related Specs:** [`SPEC-0001`](../specs/SPEC-0001-per-merchant-feature-flags-and-entitlements.md)

---

## Context

During single-tenant development, Ferio built 35+ bounded modules, including deep domain capabilities such as:
- Proprietary delivery workforce management with real-time GPS tracking (`delivery-personnel`, `socket-gateway`);
- Customer stored-value recharge wallets with staff ledger audits (`wallet`);
- Electronics warranty registration and claim evidence workflows (`warranty`);
- Service booking and technician scheduling (`service-booking`);
- Real-time customer-to-staff live chat (`chatting`).

When transitioning to multi-tenant Commerce SaaS (PRD v2.1), these capabilities were initially inherited into the mandatory commercial launch scope. 

However, Bangladeshi commerce merchants operate across highly divergent verticals (fashion, electronics, grocery/food, cosmetics, home decor). A fashion brand requires fast 1-page checkout, size/color variant matrices, and 3rd-party courier integration (Steadfast/Pathao), with zero use for in-house riders, repair services, or wallets. Conversely, an electronics merchant requires warranty claims and serial tracking.

Treating all 35+ modules as required launch gates introduces three critical failure modes:
1. **Commercial launch delay:** Engineering spends cycles stabilizing and isolating complex modules that 90% of early paying customers will not use.
2. **Cognitive overload:** Merchants are presented with complex admin interfaces filled with irrelevant operational surfaces.
3. **Loss of agility:** The team lacks capacity to build core vertical necessities (sold-by-weight units, expiry tracking, custom checkout fields) because maintenance is spread across too many active modules.

We need a policy to substantially reduce what must be active for the baseline commercial launch without throwing away or deleting already-developed, high-value code.

---

## Decision

1. **Classify Platform Features into Three Distinct Tiers:**
   - **Tier 1 (Core Commercial Baseline):** Always enabled for all active merchants. Includes Storefront, Catalog & Variants, Inventory, Checkout, COD, Online Payments, 3rd-Party Courier Adapters, Returns/RTO, Basic Reports, and Tenant Admin.
   - **Tier 2 (Selective Add-ons):** Fully developed modules (`wallet`, `riders`, `live_tracking`, `warranty`, `service_booking`, `realtime_chat`, `store_pickup`, `social_proof`) are preserved, but **disabled by default** on standard commercial plans.
   - **Tier 3 (Deferred):** Advanced optimization capabilities (AI generation, CRM automation engines, predictive dispatch, analytics data warehouse) are frozen until data volume and merchant demand warrant them.

2. **Per-Merchant Granular Flagging via Entitlement Overrides:**
   - Platform Admins can toggle any individual feature ON or OFF for any specific merchant at any time via the Control Plane API (`PUT /platform/organizations/:id/entitlement-overrides/:featureKey`).
   - The evaluation priority is strictly:
     $$\text{Active Merchant Override} > \text{Plan Baseline Entitlement} > \text{System Default (Disabled)}$$
   - All overrides require an audit trail (operator `actorId`, reason, and expiration timestamp).

3. **Dual-Layer Enforcement (Server-Side + UX Cleanliness):**
   - **Server-Side Security:** Backend controllers for selective features enforce `@RequireEntitlement(featureKey)`. Requests from tenants without the active entitlement fail closed with `403 FEATURE_DISABLED`.
   - **Client-Side Restraint:** Tenant Admin Web and Customer Storefront Web query the tenant's effective entitlement map (`GET /tenancy/plan`) and dynamically hide navigation links, buttons, and widgets for disabled features per [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md).

4. **Launch Milestone Definition:**
   - The immediate exit criteria for commercial readiness is simplified: Prove that 1 merchant can run a real retail business reliably every day on the Core Commercial Baseline, scale to 5 merchants, then 20 paying merchants, before expanding the default feature surface.

---

## Consequences

### Positive
- **Rapid Time to Commercial Launch:** Shrinks the critical path for onboarding paying merchants.
- **Tailored Merchant Experience:** Apparel merchants see a clean, simple e-commerce admin; electronics merchants get warranty capabilities with a single click in Platform Admin.
- **Zero Sunk Cost:** All previously written code, database tables, and multi-tenant isolation tests for wallets, riders, warranty, and bookings remain intact and ready to monetize as premium add-ons.
- **No Database Schema Migrations Needed:** The control-plane schema (`SubscriptionEntitlementOverride`, `PlanEntitlement`) and `EntitlementsService` already support this model natively.

### Negative / Operational Obligations
- **Guard Coverage:** Every gated controller must be protected by server-side entitlement checks; relying on frontend hiding alone is strictly prohibited.
- **Cache Invalidation:** Toggling an override in Platform Admin must immediately invalidate or bypass the tenant's cached entitlement payload so the change reflects without restarting services.
- **CI Test Invariant:** Negative cross-tenant tests must verify that tenant A with an active override cannot leak functionality or data to tenant B on the baseline tier.

---

## Alternatives Rejected

1. **Deleting or Reverting Developed Code:**
   - *Rejected:* Features like wallet, rider fleet, and warranty are high-value differentiators for specific verticals. Deleting them throws away months of engineering. Gating them behind flags preserves their value without paying a maintenance penalty.
2. **Hardcoded Plan Name Conditionals (`if (plan === 'pro')`):**
   - *Rejected per ADR-0006:* Hardcoded strings rot quickly and prevent per-merchant custom pricing or trial negotiations.
3. **Frontend-Only Hiding:**
   - *Rejected:* Disabling links in the admin sidebar while leaving API endpoints unguarded violates tenant security and fails to enforce billing limits.

