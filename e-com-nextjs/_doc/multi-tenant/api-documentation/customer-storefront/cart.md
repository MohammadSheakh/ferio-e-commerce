# Storefront — Cart (guest cart is the primary flow)

**Frontend:** `lib/cart.ts` + `app/cart/page.tsx`
**Verified against:** `cart.controller.ts` (`@Controller('cart')`)

Cookie: host-only `cart_token` (opaque; hashed server-side). Because the
cookie carries no Domain attribute, each tenant subdomain owns a separate
cart automatically.

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/cart/items` `{ variantId, quantity }` | Add line (server revalidates price/publication/stock) |
| 2 | GET | `/cart` | Current cart with estimates + per-line issues |
| 3 | PATCH | `/cart/items/:variantId` `{ quantity }` | Change quantity (keyed by variant) |
| 4 | DELETE | `/cart/items/:variantId` | Remove line |
| 5 | POST | `/cart/save` | Save cart to account (auth) |
| 6 | GET | `/cart/saved` | List saved carts |
| 7 | POST | `/cart/reorder/:orderId` | Reorder past order into cart |
| 8 | GET | `/cart/validate` | Pre-checkout validation (invalid/repriced lines flagged) |
| 9 | POST | `/cart/merge` | Merge guest cart into customer cart on login |

Totals shown in UI are estimates; the server recalculates at checkout
(FR-CHK-002).
