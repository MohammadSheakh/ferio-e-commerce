# Tenant Admin — Catalog & Inventory

**Frontend:** `app/products/*`, `app/categories`, `app/brands`,
`app/inventory`, `app/hero-showcase`
**Verified against:** `catalog.controller.ts` (`@Controller('admin/catalog')`),
settings controller (hero showcase type)

---

## Products
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/catalog/products?page&search&status&category` | Paginated list (name trigram search) |
| 2 | POST | `/admin/catalog/products` `{ name, slug?, description, categoryId, price, compareAtPrice?, variants:[{sku,name,price}], status }` | Create (enforces products_max via live count) |
| 3 | GET/PATCH | `/admin/catalog/products/:id` | Read/update |
| 4 | PATCH | `/admin/catalog/products/:id/status` `{ status: ACTIVE\|DRAFT\|ARCHIVED }` | Publish/unpublish/archive (audited) |

## Categories / Brands
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET/POST | `/admin/catalog/categories` | List/create |
| 2 | PATCH/DELETE | `/admin/catalog/categories/:id` | Update/remove |
| 3 | GET/POST | `/admin/catalog/brands` · `/admin/catalog/brands/:id` | Brand CRUD (slug uniqueness is tenant-local) |

## Inventory (single warehouse)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/admin/catalog/inventory?lowStock=` | On-hand/reserved/damaged per variant + low-stock flags |
| 2 | PATCH | `/admin/catalog/inventory/:variantId` `{ quantityDelta, adjustmentReason, reason }` | Manual adjustment; every change writes an immutable movement (FR-INV-004) |

## Hero Showcase
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET `/settings?type=…` (public read) · admin CRUD via `/settings` POST + `/settings/all` + `/settings/paginate[v2]` | Tenant-local settings documents incl. hero showcase type; Redis cache keys are org-scoped |
