# Ferio Project Progress 04

**Checkpoint date:** August 6, 2026  
**Milestone:** Release 1 — Persistent guest cart  
**Status:** Guest cart persistence and server revalidation completed

## Delivered

### Backend

- Added `Cart`, `CartItem`, and `CartStatus` Prisma models.
- Added a dedicated persistent guest-cart migration.
- Added opaque 256-bit guest cart tokens stored only as SHA-256 hashes.
- Added 30-day cart expiry refreshed by successful mutations.
- Added public APIs to read, add, update, remove, and revalidate cart lines.
- Added transactional creation of the first cart and its first item.
- Stored the unit price observed when each line was added or intentionally updated.
- Recalculated current prices and subtotal from PostgreSQL on every cart read.
- Revalidated product publication, category state, variant state, computed available stock, and quantity.
- Added warning issues for price changes and blocking issues for unavailable products, variants, stock, or quantity.
- Kept cart storage separate from inventory reservation; reservation begins only after the checkout policy is approved.

### Customer Web

- Added a server-side cart bridge using an HTTP-only `ferio_cart` cookie.
- Kept the opaque backend token unavailable to browser JavaScript.
- Replaced the in-memory cart context with API-backed persistent cart state.
- Connected add, remove, quantity update, load, and explicit revalidation operations.
- Added loading and safe backend-error states.
- Added line-level price-change, stock, quantity, publication, and variant messages.
- Disabled checkout navigation while blocking cart issues exist.
- Labelled subtotal as an estimate and removed the hardcoded delivery fee from cart totals.
- Removed random fake-order creation and fake success references from checkout.
- Kept the checkout scaffold visibly disabled until customer, address, pricing, and order APIs exist.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed; 27 schema fragments |
| Backend | Unit tests | Passed; 3 suites and 11 tests |
| Backend | Production build | Passed |
| Customer Web | TypeScript check | Passed |
| Customer Web | Production build | Passed; 4 cart API routes generated |

## Still Open

- Cart migrations have not been applied to a disposable or live PostgreSQL database.
- Live persistence across browser restarts has not been browser-tested with a running backend and database.
- Authenticated customer cart merge remains deferred until verified customer accounts exist.
- Abandoned-cart eligibility remains deferred until customer identity and consent exist.
- Customer profiles, Bangladesh phone normalization, and addresses remain.
- Delivery fees, coupons, promotional consent, and checkout totals remain.
- Inventory reservation, idempotent order placement, COD workflow, and real order confirmation remain.
- Checkout no longer fakes success, but it is intentionally not operational yet.

## Recommended Next Work

1. Model commerce customers separately from staff authentication users.
2. Add normalized Bangladesh phone handling while preserving original input.
3. Add reusable addresses and immutable checkout address snapshots.
4. Add configurable delivery regions, fees, and free-delivery thresholds.
5. Add server-calculated checkout preview before order creation.
