# ADR-0011 — Schema-Driven Storefront Builder and Dynamic Product Collections Engine

**Status:** ACCEPTED · **Date:** 2026-11-16  
**Deciders:** Engineering, Product Architecture, Product Owner  
**Related ADRs:** [ADR-0001](ADR-0001-database-per-tenant.md), [ADR-0002](ADR-0002-tenant-resolution.md), [ADR-0006](ADR-0006-subscription-entitlement-enforcement.md), [ADR-0010](ADR-0010-per-tenant-feature-flagging-and-selective-entitlements.md)  
**Related Specs:** [`SPEC-0002`](../specs/SPEC-0002-schema-driven-storefront-builder-and-collections.md)  
**Design Standard:** [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md)

---

## Context

Ferio serves multiple merchant verticals (electronics, fashion/apparel, grocery, cosmetics, general retail) across Bangladesh under a multi-tenant SaaS model. 

Prior to this decision, the public customer-facing storefront (`ferio-customer-web/app/page.tsx`) rendered a hardcoded sequence of sections:
$$\text{Hero} \rightarrow \text{Shop by Category} \rightarrow \text{Featured Products} \rightarrow \text{Product Request} \rightarrow \text{Feedback} \rightarrow \text{Exclusive Deals} \rightarrow \text{Latest Products} \rightarrow \text{Best Sellers} \rightarrow \text{Flash Sale}$$

This legacy implementation produced three critical production failures:
1. **Vertical Incompatibility:** An electronics merchant requires brand showcases, flash deals, and smartphone specs; a fashion merchant requires seasonal lookbooks, new arrivals, and category sliders; a grocery merchant requires delivery location pickers, daily staples, and perishables. Replicating the same static layout across all tenants crippled merchant adoption.
2. **Catalog vs. Merchandising Confusion:** The catalog grouped products solely by hierarchical taxonomy (`CategoryTree`). Merchants had no mechanism to curate promotional groupings (e.g., *"Winter Clearance Under ৳1,500"*) that span multiple categories without duplicating product records.
3. **Storefront Pollution from Empty Sections:** For merchants with emerging catalogs, the public storefront displayed multiple empty sections with apologetic messages (*"No product found right now"*), degrading conversion rates and brand credibility.

We evaluated three potential architectural remedies:
- **Alternative A (Full Unconstrained Visual Page Builder like Webflow/GrapesJS):** Allows dragging raw HTML elements, arbitrary containers, and inline CSS. Rejected because it breaks mobile responsiveness, invites severe XSS vulnerabilities, creates massive rendering overhead, and violates Ferio's design consistency.
- **Alternative B (Per-Tenant Next.js Code Repositories):** Forking or templating Next.js frontends per merchant. Rejected because it destroys SaaS economics, requiring separate CI/CD pipelines and manual code maintenance across thousands of tenants.
- **Alternative C (Multi-Tenant Schema-Driven Section Engine + Collections Engine):** Standardized, reusable React components registered in Next.js, whose presence, ordering, configuration, and product data sources are stored as JSON schemas in the tenant database and configured through a merchant studio.

---

## Decision

We adopt **Alternative C**: An enterprise-grade, schema-driven storefront architecture consisting of three strictly decoupled subsystems:

### 1. Separation of Concerns: Layout Builder vs. Collections Engine vs. Renderer
- **Storefront Layout Builder:** Manages *what* sections exist, their sequence (`sortOrder`), visual presentation settings (grid vs. carousel, columns, limits, titles), and enabled state.
- **Product Collections Engine:** Manages *which* products belong together. Strictly decoupled from taxonomical categories. Supports three sourcing mechanisms:
  1. *Manual:* Explicit merchant curation with custom sort ordering.
  2. *Automatic:* AST-based declarative condition engine (`Category IN [...] AND Price <= 20000 AND Stock > 0`).
  3. *System-Generated:* Algorithmic pipelines (`LATEST_PRODUCTS`, `BEST_SELLERS` via completed sales aggregation, `FLASH_SALE` tied to active promotional periods).
- **Storefront Renderer:** A pure Next.js Server Component registry (`sectionRegistry`) in `ferio-customer-web` that resolves the tenant's published configuration and renders vetted components.

### 2. Tenant Database Placement
All layout definitions, section configurations, collection rules, and publication histories are stored inside the **Tenant Database** (`prisma/schema/storefront.module/storefront.prisma`), **not** in the platform control-plane database.
- Guarantees strict multi-tenant isolation (ADR-0001).
- Allows atomic per-tenant database backups, migrations, and point-in-time recovery.
- Prevents noisy-neighbor query locks during merchant editing.

### 3. Atomic Versioning and 1-Click Rollback
Merchants do not edit the live storefront directly:
- Editing operates on an active `DRAFT` version of `StorefrontPage`.
- Publishing generates an immutable snapshot record in `StorefrontPageVersion` and atomically swaps the `publishedVersionId` on `StorefrontPage`.
- Rollbacks are instantaneous by repointing `publishedVersionId` to any prior historical version with an audit entry.

### 4. Smart Empty-State Suppression
- In the **Merchant Studio**: Empty sections are displayed with actionable configuration prompts per [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md).
- On the **Live Storefront**: If a merchandising section returns 0 eligible products and `hideWhenEmpty == true` (default), the renderer silently omits the section entirely, preventing unsightly placeholder text.

### 5. Server Hydration & Zero N+1 Queries
Homepage product fetching is centralized into a NestJS `StorefrontHydrationService`:
- Discovers all required product sources across all enabled sections for a page.
- Batches and dedupes database queries (e.g., if two sections reference the same collection or latest items).
- Enforces published, in-stock, and tenant-boundary constraints authoritatively on the backend.

---

## Consequences

### Positive
- **Complete Vertical Flexibility:** Any merchant can tailor their homepage (hero, collections, flash sales, grids) without writing code.
- **Strict Brand Integrity:** Standardized component registry ensures high aesthetic quality complying with [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md).
- **Sub-100ms Hydration:** Batched queries and Next.js tag-based ISR (`revalidateTag`) provide instantaneous storefront page loads.
- **Safe Merchandising:** Automatic collections recalculate dynamically based on stock and price without manual catalog maintenance.

### Negative / Trade-Offs
- **Tenant DB Schema Expansion:** Requires introducing 6 new Prisma models across all tenant databases.
- **Condition Engine Maintenance:** Automatic collection rules require strict AST validation to prevent unbounded or dangerous SQL queries.
- **Cache Invalidation Coordination:** Publishing in `ferio-admin-dashboard` requires an authenticated purge event to `ferio-customer-web`.

---

## Rejection of Alternatives
- **Arbitrary Code/Block Injection:** Permanently rejected due to XSS attack vectors in multi-tenant environments.
- **Shared Platform Storefront DB:** Storing merchant layouts in the central control plane was rejected because it violates tenant data classification boundaries and creates a single point of failure.
