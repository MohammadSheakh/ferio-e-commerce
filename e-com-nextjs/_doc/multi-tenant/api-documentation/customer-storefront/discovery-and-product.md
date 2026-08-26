# Storefront — Discovery & Product (Guest + Customer)

**Frontend:** `ferio-customer-web` (`app/page.tsx`, `app/products/*`)
**Verified against:** `catalog.controller.ts` (`@Controller('catalog')`), `store-config`, `settings`

---

## Screen 1: Home / Hero
**Reference:** storefront home renders hero showcase, categories, featured products

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/settings?type=hero_showcase` | Hero slides for this tenant (public, rate-limited) |
| 2 | GET | `/catalog/categories` | Active category tree |
| 3 | GET | `/store/config` | Public store identity/contacts/policies |

## Screen 2: Product Listing + Search + Filters
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/catalog/products?page=&limit=&search=&category=&brand=&minPrice=&maxPrice=&sort=` | Paginated published products; search covers name/sku (trigram-indexed) |
| 2 | GET | `/catalog/categories` | Filter rail |
| 3 | GET | `/catalog/brands` | Brand filter |

Unpublished/out-of-stock handling is server-side: listing never returns
drafts or hidden variants regardless of direct URL.

## Screen 3: Product Detail
**Reference:** `app/products/[slug]/page.tsx`

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/catalog/products/:slug` | Full product: variants+stock messaging, media order, reviews(banners), youtube reviews, Q&A if enabled |
| 2 | GET | `/purchase-activity?productId=` | Consented social-proof ticker (configurable visibility) |

Variant add-to-cart uses `variant.id`; stock messaging reflects
on-hand − reserved − damaged per FR-INV-002.
