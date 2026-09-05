# Cart Module

## Scope

Guest and authenticated carts, item mutations, validation, saved carts,
sharing/import, deletion, and reorder behavior.

## Architecture Score

**78%**. Cart revalidation, ownership checks, tenant routing, and suspension
protection are strong. Serialization remains complex and needs stronger type
and concurrency coverage.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /cart` | 82% | Guest token boundary and revalidation are useful; bound item expansion. |
| `POST /cart/items` | 80% | Validates/rechecks product state; test concurrent stock changes. |
| `PATCH /cart/items/:variantId` | 80% | Ownership and quantity policy should be explicit. |
| `DELETE /cart/items/:variantId` | 82% | Simple mutation; preserve idempotency. |
| `POST /cart/validate` | 82% | Good server-side revalidation boundary. |
| `POST /cart/merge` | 78% | Conflict semantics and repeated merge behavior need tests. |
| `POST /cart/save` | 78% | Requires ownership and bounded saved-cart size. |
| `GET /cart/saved` | 82% | Authenticated ownership route. |
| `GET /cart/saved/share/:shareToken` | 75% | Share token must be high entropy, revocable, and rate limited. |
| `POST /cart/saved/share/:shareToken/import` | 75% | Validate token scope and destination ownership. |
| `POST /cart/saved/share/:shareToken/save-to-account` | 75% | Must be idempotent and ownership-safe. |
| `DELETE /cart/saved/:id` | 82% | Good typed owner boundary. |
| `POST /cart/reorder/:orderId` | 78% | Revalidates items; test canceled/closed orders and stock races. |
| `GET /admin/abandoned-carts/eligible` | 75% | Admin query needs explicit bounds and permission review. |

## Tasks

1. Replace remaining saved-cart serialization `any` with Prisma payload types.
2. Add concurrency tests for merge, reorder, and inventory changes.
3. Add indexes and bounded cleanup/abandoned-cart processing.
