# Ferio SaaS — Product Owner Decision Log

**Status:** APPROVED by product owner (source: `_doc/multi-tenant/20-product-owner-decision-checklist.md`, recorded verbatim-in-substance August 24, 2026)
**Effect:** These decisions supersede every `BLOCKED` marker in the implementation tracker that cites them. Engineering follows them as normative.

| ID | Decision | Engineering consequence |
|---|---|---|
| PO-001 | Plans: **Starter / Business / Pro / Enterprise**. Prices stay pilot-dependent. | Seed catalog with entitlement sets below; no prices encoded in code. |
| PO-002 | **14-day trial**, no card. Internal tenants use an explicit `INTERNAL` entitlement — never faked as paid. | `startTrial` defaults to 14d; seed an `internal` plan (all features, ৳0) for Ferio-owned tenants. |
| PO-003 | **Monthly** billing initially; annual later. | `billingInterval=MONTHLY` default; YEARLY supported in schema. |
| PO-004 | **7-day grace** after payment due before suspension. | `PAST_DUE → SUSPENDED` transition refused inside the 7-day window (computed from the latest `PAST_DUE` event). |
| PO-005 | Suspension: storefront browsable, tracking works, **checkout disabled**; admin can log in, view, export, renew — commerce mutation restricted. No automatic data deletion. | Resolver resolves suspended tenants (context marks status); checkout denies with stable code; storefront state pages only for closure/closed. |
| PO-006 | SaaS billing via provider abstraction, **SSLCOMMERZ first**. | Platform billing adapter interface; SSLC adapter is the first implementation (follows commerce gateway pattern). |
| PO-007 | Hostname `{slug}.{FERIO_PUBLIC_DOMAIN}`. | Matches shipped `DomainsService`. |
| PO-008 | Custom domains **deferred from alpha**; Business/Pro entitlement later. | Verification lifecycle stays built-but-dormant; entitlement key `custom_domain` gates activation. |
| PO-009 | **One managed PostgreSQL cluster**, database-per-tenant (`ferio_control` + `tenant_*`). | Matches the default provisioning executor; dedicated infrastructure later is transparent via registry. |
| PO-010 | Credentials AES-256-GCM encrypted; production master secret external (KMS/Secret Manager). | Matches shipped `secret-box`; production key injection documented. |
| PO-011 | Bounded LRU client manager now; **PgBouncer when production scale requires**. | Matches ADR-0003 escalation path. |
| PO-012 | DR: **RPO ≤ 1h, RTO ≤ 4h, 30-day backup retention, per-tenant restore mandatory**, control-plane backup mandatory. | MT-12 acceptance targets recorded; backup evidence views keyed to these numbers. |
| PO-013 | Closure: **90-day recoverable period**, then deletion subject to legal/financial retention. | `finalizeClosure` refuses before day 90 unless explicitly overridden by an operator with audit trail. |
| PO-014 | Business identity: **one global identity may hold memberships in multiple organizations.** | Matches `PlatformUser` + `OrganizationMember`; membership switcher becomes possible without schema change. |
| PO-015 | Customer identity **tenant-local for Release 1**. Cross-store Ferio account deferred. | Matches current database-per-tenant customer isolation. |
| PO-016 | Support access: reason-required, explicit, time-limited, permission-scoped, audited, revocable. | Matches shipped `SupportAccessService`; scope field enforced at use sites. |
| PO-017 | Object storage: S3-compatible abstraction; keys namespaced `tenants/{organizationId}/…`. | New `tenantObjectKey` util; storage strategies build keys through it. |
| PO-018 | Onboarding: **Platform Admin / sales-assisted initially**; self-service after maturity (~20–50 proven provisionings). | Console-driven creation/provisioning is the sanctioned path; no public signup endpoint will ship for launch. |
| PO-019 | Migrations: expand/migrate/contract; canary → bounded batches → fleet; risky operations in maintenance windows. | Matches orchestrator; maintenance-window execution is an operator procedure. |
| PO-020 | Bangladesh-first policy; **no geographic residency guarantee** until infrastructure guarantees it. | Marketing/docs language constraint only. |

## Entitlement catalog (engineering encoding of PO-001)

| featureKey | Starter | Business | Pro | Enterprise |
|---|---|---|---|---|
| `staff_seats` | 2 | 10 | 30 | null (negotiated) |
| `products_max` | 500 | 5000 | 25000 | null |
| `warehouses_max` | 1 | 3 | 10 | null |
| `custom_domain` | — | ✔ | ✔ | ✔ |
| `advanced_reports` | — | ✔ | ✔ | ✔ |
| `crm` | — | ✔ | ✔ | ✔ |
| `campaigns` | — | ✔ | ✔ | ✔ |
| `basic_reports` / `cod` / `couriers_basic` / `ferio_subdomain` | ✔ | ✔ | ✔ | ✔ |

Plus seeded `internal` plan: every feature enabled, no limits, ৳0 — assigned only through the audited internal-entitlement workflow (PO-002).
