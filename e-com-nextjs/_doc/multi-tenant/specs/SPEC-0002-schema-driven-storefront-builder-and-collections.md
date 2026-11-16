# SPEC-0002: Schema-Driven Storefront Builder & Dynamic Product Collections Engine

**Status:** APPROVED  
**Date:** 2026-11-16  
**Author:** Engineering & Product Architecture  
**Target Systems:** `ferio-nest-prisma`, `ferio-customer-web`, `ferio-admin-dashboard`, `ferio-platform-admin`  
**Related ADRs:** [ADR-0001](../adr/ADR-0001-database-per-tenant.md), [ADR-0002](../adr/ADR-0002-tenant-resolution.md), [ADR-0006](../adr/ADR-0006-subscription-entitlement-enforcement.md), [ADR-0010](../adr/ADR-0010-per-tenant-feature-flagging-and-selective-entitlements.md), [ADR-0011](../adr/ADR-0011-schema-driven-storefront-builder-and-collections-engine.md)  
**Design Standard:** [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md)

---

## 1. Executive Summary & Problem Definition

Ferio is a multi-tenant commerce SaaS serving distinct retail verticals in Bangladesh (apparel, consumer electronics, organic grocery, cosmetics, and specialty goods).

Prior to this specification, `ferio-customer-web/app/page.tsx` rendered a single, monolithic, hardcoded homepage:
```
HeroShowcaseV2 ➔ ShopByCategory ➔ FeaturedProducts ➔ ProductRequestBanner ➔ FeedbackBanner ➔ ExclusiveDeals ➔ LatestProducts ➔ BestSellers ➔ FlashSale
```

### The Architectural Flaws
1. **Vertical Rigidity:** Merchants cannot reorder, rename, or suppress sections. An electronics merchant cannot place a "Flash Deals on Smartphones" banner at the top, and a grocery store is forced to show "Product Request" and "Feedback" banners.
2. **Catalog vs. Merchandising Conflation:** Products were grouped purely by taxonomical categories (`CategoryTree`). Merchants had no way to create merchandising groups (e.g., *"Winter Clearance Under ৳1,500"* or *"Top Rated Laptops"*) spanning multiple categories without corrupting the core catalog.
3. **Empty-State Degradation:** When an onboarding merchant had fewer than 4 products, the homepage rendered 5 large empty zones with *"No product found right now"* and *"Products will appear after an administrator publishes them"*, destroying buyer trust.

### The Objective
Deliver an **enterprise-grade, multi-tenant, schema-driven storefront system** that gives merchants complete visual and merchandising control over their storefront while maintaining strict tenant isolation, sub-100ms response times, and adherence to Ferio's grayscale-first design system.

---

## 2. Architectural Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FERIO STOREFRONT ARCHITECTURE                         │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ 1. Storefront Layout Builder  │ Manages section presence, sort order,       │
│                               │ visual settings, and responsive layout.     │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 2. Product Collections Engine │ Curates products via:                       │
│                               │ • Manual product selection & ordering       │
│                               │ • Automatic AST rule evaluation             │
│                               │ • System-generated real-time aggregations   │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 3. Storefront Hydration &     │ Batches product resolution, validates       │
│    Component Registry         │ schemas, suppresses empty states, and       │
│                               │ renders approved React server components.   │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Tenant Database Domain Model (`storefront.prisma`)

In accordance with [ADR-0001](../adr/ADR-0001-database-per-tenant.md) and [ADR-0011](../adr/ADR-0011-schema-driven-storefront-builder-and-collections-engine.md), all layout configurations, section definitions, and collections reside exclusively in each **Tenant Database**.

```prisma
// ============================================================================
// STOREFRONT MODULE SCHEMA
// Location: prisma/schema/storefront.module/storefront.prisma
// ============================================================================

enum StorefrontPageType {
  HOME
  COLLECTION_LANDING
  CUSTOM_PAGE
}

enum SectionType {
  HERO_SHOWCASE
  CATEGORY_GRID
  PRODUCT_GRID
  PRODUCT_CAROUSEL
  PROMOTIONAL_BANNER
  PRODUCT_REQUEST_BANNER
  FEEDBACK_BANNER
  BRAND_SHOWCASE
  TEXT_WITH_IMAGE
}

enum ProductSourceType {
  MANUAL_SELECTION
  COLLECTION
  LATEST_PRODUCTS
  BEST_SELLERS
  FLASH_SALE
  ACTIVE_DISCOUNTS
}

enum CollectionType {
  MANUAL
  AUTOMATIC
}

enum CollectionRuleField {
  TITLE
  CATEGORY_ID
  BRAND_ID
  PRICE
  STOCK_QUANTITY
  TAG
}

enum CollectionRuleOperator {
  EQUALS
  NOT_EQUALS
  GREATER_THAN
  LESS_THAN_OR_EQUAL
  CONTAINS
  IN_LIST
}

model StorefrontPage {
  id                 String             @id @default(cuid())
  type               StorefrontPageType @default(HOME)
  slug               String             @unique @default("home")
  title              String             @default("Home")
  seoTitle           String?
  seoDescription     String?
  
  // Pointers to active versions
  publishedVersionId String?
  publishedVersion   StorefrontPageVersion? @relation("PublishedVersion", fields: [publishedVersionId], references: [id], onDelete: SetNull)
  
  versions           StorefrontPageVersion[] @relation("AllVersions")
  
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([type, slug])
}

model StorefrontPageVersion {
  id              String         @id @default(cuid())
  pageId          String
  page            StorefrontPage @relation("AllVersions", fields: [pageId], references: [id], onDelete: Cascade)
  versionNumber   Int
  isPublished     Boolean        @default(false)
  publishedAt     DateTime?
  publishedById   String?        // Staff ID who published
  changeSummary   String?        // "Updated hero banner and added winter sale"
  
  // Sections configured in this version
  sections        StorefrontSection[]
  
  // Back relation for active pointer
  activeForPages  StorefrontPage[] @relation("PublishedVersion")

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([pageId, versionNumber])
  @@index([pageId, isPublished])
}

model StorefrontSection {
  id              String               @id @default(cuid())
  versionId       String
  version         StorefrontPageVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  
  type            SectionType
  enabled         Boolean              @default(true)
  sortOrder       Int                  @default(0)
  
  // Typeless extensible settings (validated via NestJS Zod Schemas)
  // e.g. { title, subtitle, columns: 4, limit: 8, hideWhenEmpty: true, viewAllLink: "/products" }
  settings        Json
  
  // Data Source Specification
  // e.g. { type: "COLLECTION", collectionId: "...", filters: { minPrice: 500 } }
  dataSource      Json?

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([versionId, sortOrder])
  @@index([versionId, enabled])
}

model ProductCollection {
  id              String                @id @default(cuid())
  name            String
  slug            String                @unique
  description     String?
  bannerImageUrl  String?
  type            CollectionType        @default(MANUAL)
  isActive        Boolean               @default(true)
  seoTitle        String?
  seoDescription  String?

  // Match condition mode for automatic collections: ALL (AND) or ANY (OR)
  matchMode       String                @default("ALL") // "ALL" | "ANY"

  // Relations
  items           ProductCollectionItem[]
  rules           ProductCollectionRule[]

  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([isActive, slug])
  @@index([name])
}

model ProductCollectionItem {
  id           String            @id @default(cuid())
  collectionId String
  collection   ProductCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  
  productId    String
  product      Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  sortOrder    Int               @default(0)

  createdAt    DateTime          @default(now())

  @@unique([collectionId, productId])
  @@index([collectionId, sortOrder])
  @@index([productId])
}

model ProductCollectionRule {
  id           String                 @id @default(cuid())
  collectionId String
  collection   ProductCollection      @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  
  field        CollectionRuleField
  operator     CollectionRuleOperator
  value        String                 // Stored as string, cast safely during AST compilation

  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt

  @@index([collectionId])
}

model StorefrontPublicationAudit {
  id             String   @id @default(cuid())
  pageId         String
  versionNumber  Int
  actorId        String
  actorEmail     String
  action         String   // "PUBLISH" | "ROLLBACK"
  snapshotJson   Json     // Full frozen snapshot for guaranteed recovery
  createdAt      DateTime @default(now())

  @@index([pageId, createdAt])
}
```

---

## 4. The Three Core Engines

### 4.1 Storefront Layout Builder Engine
The Layout Builder governs section definitions and validation. Every section type has a strictly typed JSON Schema validated via `zod` before any draft is committed:

```typescript
// NestJS / Shared Types: Section Schemas
export const ProductGridSettingsSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(255).optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(4),
  productLimit: z.number().int().min(1).max(24).default(8),
  showViewAll: z.boolean().default(true),
  viewAllUrl: z.string().max(255).optional(),
  hideWhenEmpty: z.boolean().default(true),
});

export const DataSourceSchema = z.object({
  type: z.nativeEnum(ProductSourceType),
  collectionId: z.string().cuid().optional(),
  productIds: z.array(z.string().cuid()).optional(),
  categoryId: z.string().cuid().optional(),
  brandId: z.string().cuid().optional(),
  promotionId: z.string().cuid().optional(),
});
```

### 4.2 Product Collections Engine
The Collections Engine resolves product IDs based on the collection's mode:

1. **Manual Collections:** Directly queries `ProductCollectionItem` sorted by `sortOrder ASC`, joining only products with `status = ACTIVE` and `deletedAt = NULL`.
2. **Automatic Collections (AST Rule Evaluator):**
   Rules are compiled safely into a Prisma `where` clause:
   ```typescript
   export function compileCollectionRulesToPrisma(
     rules: ProductCollectionRule[],
     matchMode: "ALL" | "ANY"
   ): Prisma.ProductWhereInput {
     const conditions: Prisma.ProductWhereInput[] = rules.map((rule) => {
       switch (rule.field) {
         case "CATEGORY_ID":
           return rule.operator === "EQUALS" ? { categoryId: rule.value } : { categoryId: { not: rule.value } };
         case "BRAND_ID":
           return { brandId: rule.value };
         case "PRICE": {
           const num = parseFloat(rule.value);
           if (rule.operator === "LESS_THAN_OR_EQUAL") return { variants: { some: { price: { lte: num } } } };
           if (rule.operator === "GREATER_THAN") return { variants: { some: { price: { gt: num } } } };
           return {};
         }
         case "STOCK_QUANTITY": {
           const qty = parseInt(rule.value, 10);
           return { variants: { some: { inventoryItem: { availableStock: { gte: qty } } } } };
         }
         default:
           return {};
       }
     });

     // Base constraints: published, active catalog records only
     const baseConstraint: Prisma.ProductWhereInput = {
       status: "ACTIVE",
     };

     return matchMode === "ALL"
       ? { AND: [baseConstraint, ...conditions] }
       : { AND: [baseConstraint, { OR: conditions }] };
   }
   ```
3. **System-Generated Collections:**
   - `LATEST_PRODUCTS`: `orderBy: { publishedAt: 'desc' }` with limit.
   - `BEST_SELLERS`: Ranked by aggregate sales from `OrderItem` over a rolling 30-day window, cached in Redis with a 4-hour TTL to prevent full-table order scans during traffic spikes.
   - `FLASH_SALE`: Products linked to active promotional campaigns with valid start and end timestamps.

### 4.3 Storefront Hydration Service (Zero N+1 Queries)
When a storefront requests the homepage (`GET /api/v1/storefront/pages/home`), the NestJS backend hydrates all sections in a **single pass**:

```
Step 1: Load published version sections for page 'home'.
Step 2: Collect all distinct data sources across sections:
        - Set of collection IDs
        - System source requirements (latest, best-sellers, flash-sale)
Step 3: Execute batched queries in parallel via Promise.all:
        - Batch 1: Fetch all manual and automatic collections.
        - Batch 2: Fetch latest products.
        - Batch 3: Fetch cached best-seller product IDs.
Step 4: Map hydrated product payloads to their respective sections.
Step 5: Return composite StorefrontPagePayload to Next.js.
```

---

## 5. Storefront Renderer (`ferio-customer-web`)

### 5.1 Component Registry
The Next.js storefront maintains a strict, typed component registry:

```tsx
// ferio-customer-web/components/storefront/registry.ts
import { ComponentType } from "react";
import InteractiveHeroShowcaseV2 from "@/components/InteractiveHeroShowcaseV2";
import CategoryGridSection from "@/components/storefront/CategoryGridSection";
import ProductGridSection from "@/components/storefront/ProductGridSection";
import ProductCarouselSection from "@/components/storefront/ProductCarouselSection";
import FlashSaleSection from "@/components/storefront/FlashSaleSection";
import ProductRequestBanner from "@/components/ProductRequestBanner";
import FeedbackBanner from "@/components/FeedbackBanner";

export interface SectionComponentProps<T = any, D = any> {
  settings: T;
  data?: D;
  tenantSlug: string;
}

export const sectionRegistry: Record<string, ComponentType<SectionComponentProps>> = {
  HERO_SHOWCASE: InteractiveHeroShowcaseV2,
  CATEGORY_GRID: CategoryGridSection,
  PRODUCT_GRID: ProductGridSection,
  PRODUCT_CAROUSEL: ProductCarouselSection,
  FLASH_SALE: FlashSaleSection,
  PRODUCT_REQUEST_BANNER: ProductRequestBanner,
  FEEDBACK_BANNER: FeedbackBanner,
};
```

### 5.2 Server Component Page Implementation
```tsx
// ferio-customer-web/app/page.tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedStorefrontPage } from "@/lib/storefront";
import { sectionRegistry } from "@/components/storefront/registry";

export default async function HomePage() {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  
  const page = await getPublishedStorefrontPage(host, "home");
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-paper">
      {page.sections
        .filter((section) => section.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => {
          const Component = sectionRegistry[section.type];
          if (!Component) return null;

          // Production Grade Empty-State Suppression:
          // If section is configured to hide when empty and has no items, omit it completely.
          const hasNoItems =
            section.data?.items !== undefined && section.data.items.length === 0;
          if (section.settings.hideWhenEmpty && hasNoItems) {
            return null;
          }

          return (
            <Component
              key={section.id}
              settings={section.settings}
              data={section.data}
              tenantSlug={page.tenantSlug}
            />
          );
        })}
    </main>
  );
}
```

---

## 6. Merchant Storefront Studio UI (`ferio-design` Standards)

Per the [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md) skill, the Storefront Studio interface must be **grayscale-first, functional, spacious, and devoid of decorative gimmicks**.

### 6.1 Studio Layout Specification
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FERIO STOREFRONT STUDIO                                    [Discard]  [Save Draft] [Publish] │
├──────────────────────────┬──────────────────────────────────────────┬──────────────────┤
│ HOMEPAGE SECTIONS        │ LIVE STOREFRONT PREVIEW                  │ SECTION SETTINGS │
│ (300px width)            │ (Flexible viewport with desktop/mobile)  │ (340px width)    │
├──────────────────────────┼──────────────────────────────────────────┼──────────────────┤
│ ≡ Hero Showcase      [•] │ ┌──────────────────────────────────────┐ │ Section Title    │
│ ≡ Shop by Category   [•] │ │ INTERACTIVE HERO SHOWCASE            │ │ [Top Products  ] │
│ ≡ Featured Deals     [•] │ └──────────────────────────────────────┘ │                  │
│ ≡ Best Smartphones   [•] │ ┌──────────────────────────────────────┐ │ Data Source      │
│ ≡ Customer Reviews   [○] │ │ SHOP BY CATEGORY                     │ │ [Collection    ▼]│
│                          │ └──────────────────────────────────────┘ │                  │
│ + Add Section            │ ┌──────────────────────────────────────┐ │ Collection       │
│                          │ │ FEATURED DEALS                       │ │ [Smartphones   ▼]│
│                          │ │ [Card] [Card] [Card] [Card]          │ │                  │
│                          │ └──────────────────────────────────────┘ │ Columns: [4]     │
│                          │                                          │ Limit:   [8]     │
│                          │                                          │ ☑ Hide if empty  │
└──────────────────────────┴──────────────────────────────────────────┴──────────────────┘
```

### 6.2 Visual Design System Rules
- **Palette:** Ink `#111114`, secondary ink `#6e6e73`, hairline `#e8e8ea`, surface `#fafafa`, white `#ffffff`. Semantic emerald `#059669` used solely for published status badges.
- **Buttons:** 
  - `Publish`: Solid black pill button `rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85`.
  - `Save Draft`: Hairline bordered button `rounded-full border border-line px-5 py-2 text-[13px] text-ink`.
- **Drag Reordering:** 1.5px line drag handles (`≡`) with smooth subtle opacity transitions. No bouncy physics.
- **Empty States in Studio:** Clear, single-sentence operational messages with an action button:
  > *"This collection contains no published products. [Add products to collection $\rightarrow$]"*

---

## 7. Versioning, Publishing & Rollback Protocol

To prevent half-edited states from impacting public shoppers:

```sequence
sequenceDiagram
    autonumber
    actor Merchant as Merchant Staff
    participant Studio as ferio-admin-dashboard
    participant API as ferio-nest-prisma
    participant TenantDB as Tenant PostgreSQL
    participant Cache as Redis / Next.js ISR

    Merchant->>Studio: Edits title, reorders sections, selects collection
    Studio->>API: PUT /api/v1/storefront/pages/home/draft
    API->>TenantDB: Updates StorefrontSection rows for DRAFT version
    API-->>Studio: 200 OK (Draft Saved)

    Merchant->>Studio: Clicks "Publish"
    Studio->>API: POST /api/v1/storefront/pages/home/publish
    API->>TenantDB: 1. Create immutable snapshot in StorefrontPublicationAudit
    API->>TenantDB: 2. Set isPublished = true on version
    API->>TenantDB: 3. Atomically update StorefrontPage.publishedVersionId
    API->>Cache: Invalidate tag `storefront:${tenantSlug}:home`
    API-->>Studio: 200 OK (Published at Version 7)

    Note over Merchant,API: Instant Rollback Scenario
    Merchant->>Studio: Clicks "Rollback to Version 6"
    Studio->>API: POST /api/v1/storefront/pages/home/rollback?version=6
    API->>TenantDB: Atomically set publishedVersionId = Version 6
    API->>Cache: Invalidate tag `storefront:${tenantSlug}:home`
    API-->>Studio: 200 OK (Reverted to Version 6)
```

---

## 8. Integration with Entitlements & Subscription Tiers

Storefront customization capabilities are governed by [ADR-0010](../adr/ADR-0010-per-tenant-feature-flagging-and-selective-entitlements.md) and [`SPEC-0001`](SPEC-0001-per-merchant-feature-flags-and-entitlements.md):

| Feature / Limit Key | Free / Starter | Professional | Enterprise |
| :--- | :--- | :--- | :--- |
| `storefront_builder` | Standard default template (rename only) | Full section reordering & adding | Full section reordering & adding |
| `max_custom_sections` | 6 sections max | 15 sections max | Unlimited |
| `product_collections` | Manual collections only | Manual + Automatic rule-based | Manual + Automatic + Custom lookups |
| `max_collections` | 5 | 25 | Unlimited |
| `version_history_days`| 3 days | 30 days | Unlimited (Permanent audit) |

---

## 9. Phased Execution Roadmap

```
Phase 1: Database Foundation & Schema Migration
├── Add storefront.prisma to ferio-nest-prisma
├── Run migration across tenant databases
└── Seed default template for all existing tenants

Phase 2: Product Collections Engine
├── Create ProductCollection, Item, and Rule APIs in NestJS
├── Implement AST rule compiler for automatic collections
└── Build Collections management UI in ferio-admin-dashboard

Phase 3: Storefront Hydration & Next.js Dynamic Registry
├── Build StorefrontHydrationService (batched query pipeline)
├── Implement sectionRegistry in ferio-customer-web
├── Refactor existing homepage into reusable components
└── Add empty-state suppression on live storefronts

Phase 4: Storefront Studio Visual Editor
├── Build 3-pane Studio in ferio-admin-dashboard (Sections, Preview, Inspector)
├── Implement Save Draft, Publish, and 1-Click Rollback workflows
└── Wire Next.js on-demand cache tag invalidation
```

---

## 10. Verification & Acceptance Criteria

1. **Zero N+1 Queries:** The homepage hydration endpoint must issue no more than $\mathcal{O}(1)$ batched queries regardless of whether 3 or 12 product sections are enabled.
2. **Tenant Isolation:** A merchant editing their storefront must have zero locks, zero visibility, and zero latency impact on any other tenant database.
3. **Empty-State Verification:** A store with 0 published products must render a clean hero and category bar without showing empty product error placeholders.
4. **Instant Rollback:** Rolling back to a previous page version must complete in under 50ms and invalidate the public Next.js cache immediately.
5. **Design Compliance:** All new interfaces in `ferio-admin-dashboard` and `ferio-customer-web` must pass the [`ferio-design`](../../../.agents/skills/ferio-design/SKILL.md) review checklist.
