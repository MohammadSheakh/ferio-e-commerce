# SPEC-0001: Per-Merchant Feature Flagging and Selective Entitlement Gating

**Status:** APPROVED  
**Date:** 2026-11-16  
**Author:** Engineering & Product Architecture  
**Target Systems:** `ferio-platform-admin`, `ferio-nest-prisma`, `ferio-admin-dashboard`, `ferio-customer-web`  
**Related ADRs:** [ADR-0006](../adr/ADR-0006-subscription-entitlement-enforcement.md), [ADR-0010](../adr/ADR-0010-per-tenant-feature-flagging-and-selective-entitlements.md)  
**Design Standard:** [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md)

---

## 1. Problem Statement & Motivation

Ferio operates as a multi-tenant Commerce SaaS serving diverse vertical businesses in Bangladesh (apparel, electronics, grocery/food, cosmetics, home goods).

Each vertical has sharply divergent operational requirements:
- Apparel merchants need fast 1-page checkout, size/color variant matrices, and 3rd-party courier APIs (Steadfast/Pathao). They have zero need for in-house rider fleets or repair services.
- Electronics merchants need warranty claims and serial/IMEI tracking, but rarely need customer wallets.
- Food/grocery merchants require sold-by-weight units and expiry date tracking.

Prior to this specification, 35+ bounded modules (including in-house rider fleets with live GPS maps, customer wallets, service booking, and warranty tracking) were treated as mandatory Release 1 scope. This created severe operational baggage:
1. Massive maintenance and testing overhead across tenant boundaries.
2. Tenant Admin and Storefront UI clutter for merchants who have no use for specialized modules.
3. Delayed time-to-market for the core commerce loop: **Catalog $\rightarrow$ Checkout $\rightarrow$ Courier $\rightarrow$ Delivery $\rightarrow$ Settlement**.

### The Core Objective
Decouple advanced, specialized features from the baseline commercial launch. Retain all existing code and tenant isolation, but place specialized modules under **granular, per-merchant feature flags** that can be toggled on/off by Platform Admins at any time.

---

## 2. Feature Classification Matrix

All platform capabilities are categorized into three operational tiers:

```
┌───────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ Group 1: Core Commercial Baseline │ Group 2: Selective Add-on Flags   │ Group 3: Deferred / Long-Term     │
│ (Always ON for all active tenants)│ (Per-merchant toggles in Console) │ (Frozen / Post-Validation)        │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ • Branded Storefront Web & Mobile │ • Customer Wallet (`wallet`)      │ • AI copy & support automation    │
│ • Catalog (Products & Variants)   │ • Rider Fleet (`delivery-person`) │ • Advanced CRM workflow builder   │
│ • Single-Warehouse Inventory      │ • Live Rider Tracking (GPS/Map)   │ • Predictive recommendations      │
│ • Guest & Phone-First Checkout    │ • Warranty Claims (`warranty`)    │ • Multi-warehouse routing mesh    │
│ • Cash on Delivery (COD)          │ • Service Booking (`services`)    │ • Dedicated analytics data lake   │
│ • Online Payments (bKash/Nagad)   │ • Real-Time Chat (`chatting`)     │ • Algorithmic fraud scoring       │
│ • 3rd-Party Courier (Steadfast)   │ • Store Pickup / Outlets          │                                   │
│ • Returns & RTO Management        │ • Purchase Social Proof Toasts    │                                   │
│ • Basic Delivered-Order Reports   │ • Custom Domain Support           │                                   │
│ • Tenant Admin Workspace          │ • Advanced Merchandising          │                                   │
│ • SaaS Subscription Billing       │ • Multi-Courier Scorecard         │                                   │
└───────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Architecture & Data Flow

```
┌─────────────────────────┐
│  Ferio Platform Admin   │ ── PUT /platform/organizations/:id/entitlement-overrides/:key
└───────────┬─────────────┘
            │ Writes
            ▼
┌────────────────────────────────────────────────────────┐
│     Control Plane PostgreSQL (platform.prisma)         │
│  - PlanEntitlement (Plan-level default)                │
│  - SubscriptionEntitlementOverride (Per-tenant toggle) │
└───────────────────────────┬────────────────────────────┘
                            │ Evaluated by
                            ▼
┌────────────────────────────────────────────────────────┐
│  EntitlementsService (Modular Monolith Backend)        │
│  Rule: Active Override > Plan Entitlement > Fallback   │
└──────────────┬───────────────────────────┬─────────────┘
               │ Gating                    │ Cached summary
               ▼                           ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│  Feature Controllers & Guards │ │ GET /tenancy/plan             │
│  @RequireEntitlement('...')   │ └──────────────┬────────────────┘
│  Returns 403 FEATURE_DISABLED │                │ Consumed by
└───────────────────────────────┘                ▼
                                  ┌───────────────────────────────┐
                                  │ Tenant Admin & Storefront UI  │
                                  │ Dynamically hides tabs/links  │
                                  └───────────────────────────────┘
```

### 3.1 Hierarchy of Entitlement Evaluation
When resolving whether tenant $T$ can access feature $F$:
1. If subscription status is NOT `ACTIVE` or `TRIALING` $\rightarrow$ Deny (`SUBSCRIPTION_INACTIVE`).
2. Search `SubscriptionEntitlementOverride` where `subscription.organizationId == T` and `featureKey == F`:
   - If found, `revokedAt == null`, and `expiresAt > now()`:
     - Return `override.enabled` and `override.limit`. **(Per-merchant override always wins)**.
3. If no active override exists, look up `PlanEntitlement` on the tenant's current plan:
   - If found $\rightarrow$ Return `planEntitlement.enabled` and `planEntitlement.limit`.
4. If not found in plan $\rightarrow$ Deny (`FEATURE_DISABLED`).

---

## 4. Canonical Feature Key Registry

To prevent naming drift between frontend and backend, the following machine keys are canonical:

| Feature Key | Display Name | Category | Default Plan State |
| :--- | :--- | :--- | :--- |
| `storefront` | Branded Storefront | Core | `true` |
| `inventory` | Inventory Management | Core | `true` |
| `online_payments` | Online Payment Gateways | Core | `true` |
| `cod` | Cash on Delivery & Verification | Core | `true` |
| `couriers_basic` | Courier Integration (Steadfast/Pathao) | Core | `true` |
| `returns_rto` | Returns & RTO Management | Core | `true` |
| `basic_reports` | Basic Operational Reporting | Core | `true` |
| `ferio_subdomain` | Default *.ferio.app Subdomain | Core | `true` |
| `customer_wallet` | Customer Stored-Value Wallet | Selective Add-on | `false` (Starter/Business) |
| `rider_management` | In-House Delivery Personnel | Selective Add-on | `false` |
| `live_rider_tracking` | Real-Time Live GPS Rider Map | Selective Add-on | `false` |
| `warranty_management` | Serial Number & Warranty Claims | Selective Add-on | `false` |
| `service_booking` | Service & Repair Slot Booking | Selective Add-on | `false` |
| `realtime_chat` | Real-Time Customer Support Chat | Selective Add-on | `false` |
| `store_pickup` | Physical Store Outlets & In-Store Pickup | Selective Add-on | `false` |
| `purchase_social_proof` | Recent Purchase Activity Notifications | Selective Add-on | `false` |
| `custom_domain` | Custom Branded Domain (Apex/CNAME) | Selective Add-on | `false` (Starter), `true` (Business/Pro) |
| `advanced_reports` | Profitability & Contribution Reports | Selective Add-on | `false` (Starter), `true` (Business/Pro) |
| `crm` | Customer 360 & Consent Profiles | Selective Add-on | `false` (Release 2) |
| `campaigns` | Multichannel Automated Campaigns | Selective Add-on | `false` (Release 2) |

---

## 5. UI & Interaction Specification (`ferio-design`)

Per [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md), all interfaces must follow the restrained grayscale palette with purposeful semantic signals:
- Ink: `#111114`
- Secondary ink: `#6e6e73`
- Hairline divider / border: `#e8e8ea`
- Subtle background surface: `#fafafa`
- Pure paper: `#ffffff`
- Success: `#059669` (Muted emerald)
- Neutral / Disabled: `#8a8a8e`

### 5.1 Platform Admin: Organization Feature Management Component
**Location:** `ferio-platform-admin/app/organizations/[id]/tenant-feature-matrix.tsx`

#### Layout & Hierarchy:
1. **Section Header**:
   - Eyebrow: `COMMERCE CAPABILITIES & ADD-ONS`
   - Title: `Tenant Feature Entitlements`
   - Description: `"Control which commercial modules are active for this merchant. Overrides take precedence over the subscription plan."`
2. **Feature Toggle Grid**:
   - Dense table or clean card list with 1px hairline row dividers (`#e8e8ea`).
   - Columns:
     - `FEATURE`: Title (Weight 500, `#111114`) + machine `featureKey` in monospace micro-text (`#6e6e73`).
     - `STATUS`: Status pill:
       - `ENABLED` (Emerald text on `#ecfdf5` background, 10px radius)
       - `DISABLED` (Gray text on `#f4f4f5` background)
     - `SOURCE`:
       - `Plan default` (`#6e6e73`)
       - `Override active (expires YYYY-MM-DD)` (Muted amber `#b45309` on `#fffbeb`)
     - `ACTION`:
       - A clean toggle pill button. If inherited from plan, clicking switches state and records an explicit override. If already overridden, provides a secondary `"Reset to Plan"` action.
3. **Override Modal / Drawer (Optional details)**:
   - When enabling a selective feature:
     - Reason input (Mandatory, 10-500 characters, e.g. `"Merchant requested electronics warranty add-on"`).
     - Expiry date (Optional, defaults to 1 year; useful for pilot trials).
     - Action button: Solid black pill button (`#111114`, white text, 10px radius).

### 5.2 Tenant Admin: Navigation Gating
**Location:** `ferio-admin-dashboard` (Navigation & Sidebar layout)
- Store admin fetches `/api/tenancy/plan` on session load.
- Sidebar links are filtered dynamically:
  ```typescript
  // Dynamic filtering based on active tenant features
  const navigationItems = [
    { title: "Catalog", href: "/catalog", show: true },
    { title: "Orders", href: "/orders", show: true },
    { title: "Riders", href: "/riders", show: features.rider_management === true },
    { title: "Warranty", href: "/warranty", show: features.warranty_management === true },
    { title: "Services", href: "/services", show: features.service_booking === true },
    { title: "Wallets", href: "/wallets", show: features.customer_wallet === true },
  ];
  ```
- **Direct URL Access Defense**: If a merchant manually types `/admin/warranty` when disabled, the page renders a calm empty state:
  > *"Warranty management is not active for this store. Contact Ferio support to enable this add-on."*

### 5.3 Storefront Web: Component Gating
**Location:** `ferio-customer-web`
- Header / Account dropdown:
  - Wallet balance widget is rendered **only** when `features.customer_wallet === true`.
- Footer / Navbar:
  - "Book a Service" link rendered **only** when `features.service_booking === true`.
  - "Warranty Lookup" link rendered **only** when `features.warranty_management === true`.
- Real-time Support Chat Bubble:
  - Floating chat bubble mounts **only** when `features.realtime_chat === true`.

---

## 6. Backend API & Enforcement Specification

### 6.1 Server-Side Gating: `@RequireEntitlement` Guard
In `ferio-nest-prisma`, client-side hiding is not security. All sensitive feature controllers must be guarded:

```typescript
@Controller('api/warranty')
@UseGuards(TenantAuthGuard, TenantEntitlementGuard)
@RequireEntitlement('warranty_management')
export class WarrantyController {
  // Routes reject with 403 FEATURE_DISABLED if feature is false
}
```

```typescript
@Controller('api/riders')
@UseGuards(TenantAuthGuard, TenantEntitlementGuard)
@RequireEntitlement('rider_management')
export class DeliveryPersonnelController {
  // Routes reject with 403 FEATURE_DISABLED if feature is false
}
```

### 6.2 Platform Admin Endpoints (Already Available)
1. **Set / Update Override:**
   - `PUT /platform/organizations/:id/entitlement-overrides/:featureKey`
   - Headers: `Authorization: Bearer <platform-admin-token>`
   - Payload:
     ```json
     {
       "enabled": true,
       "limit": null,
       "reason": "Merchant approved for beta rider portal",
       "expiresAt": "2027-11-16T00:00:00.000Z"
     }
     ```
   - Auditing: Appends `PlatformAuditLog` row with `action: 'ENTITLEMENT_OVERRIDE_UPSERTED'`.

2. **Revoke Override (Revert to Plan):**
   - `DELETE /platform/organizations/:id/entitlement-overrides/:featureKey`
   - Reverts the merchant back to their plan's baseline entitlement.
   - Auditing: Appends `PlatformAuditLog` row with `action: 'ENTITLEMENT_OVERRIDE_REVOKED'`.

3. **Get Full Effective Feature Map for Tenant:**
   - `GET /platform/organizations/:id/entitlements`
   - Returns a merged dictionary of `{ featureKey: { enabled: boolean, limit: number | null, source: 'PLAN' | 'OVERRIDE' } }`.

---

## 7. Migration & Rollout Strategy

1. **Phase 1: Seed Catalog Alignment**
   - Ensure `PlatformPlanSeedService` defines the default state for all standard plans (`Starter`, `Business`, `Pro`, `Enterprise`).
   - Group 2 features (`wallet`, `rider_management`, `warranty_management`, `service_booking`, `realtime_chat`) default to `enabled: false` on Starter and Business plans.

2. **Phase 2: Controller Guard Wiring**
   - Attach `TenantEntitlementGuard` to:
     - `WarrantyController` (`warranty_management`)
     - `ServiceBookingController` (`service_booking`)
     - `DeliveryPersonnelController` (`rider_management`)
     - `WalletController` (`customer_wallet`)
     - `SocketTicketController` (`realtime_chat`)

3. **Phase 3: Platform Admin UI Enhancement**
   - Replace the single manual input in `ferio-platform-admin` with the structured feature toggle list.

4. **Phase 4: Pilot Tenant Verification**
   - Onboard Tenant #1 with Core Baseline only.
   - Prove the storefront and admin operate cleanly with zero noise from riders/wallet/warranty.
   - Toggle an override ON in Platform Admin and verify the feature lights up instantly in Tenant Admin without restarting services.

---

## 8. Definition of Done
- [ ] Spec approved and registered in `_doc/multi-tenant/specs/`.
- [ ] Companion [ADR-0010](../adr/ADR-0010-per-tenant-feature-flagging-and-selective-entitlements.md) accepted in ADR register.
- [ ] No database migration required (models already exist in `platform.prisma`).
- [ ] Zero single-tenant regression: existing tests remain passing.
- [ ] Platform Admin can toggle every feature per merchant in $\le 2$ clicks.

