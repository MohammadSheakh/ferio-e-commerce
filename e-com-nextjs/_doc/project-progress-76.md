# Ferio Project Progress 76

**Checkpoint date:** August 21, 2026  
**Milestone:** Verified customer guest-cart merge  
**Status:** Release 1 guest-cart merge is complete across password, OAuth, and email-verification session creation.

## Delivered

### Cart ownership

- Added an optional authenticated `User` owner to persistent carts and an index for active account-cart lookup.
- Added migration `20260821203000_customer_cart_ownership`.
- Kept the existing cryptographically opaque cart token as the browser capability for guests.
- Prevented a cart already claimed by one account from being claimed by a different account.

### Deterministic merge

- Added an authenticated Backend merge endpoint.
- Uses the current browser guest cart as the target so its existing HTTP-only token remains valid after authentication.
- Finds the signed-in user's other active, unexpired carts and combines matching variant quantities.
- Caps merged quantity at current available stock and snapshots the current variant price.
- Invalidates any target checkout draft because cart contents may have changed.
- Marks source carts `ABANDONED` after a successful transaction instead of deleting evidence.
- Refreshes the target cart expiry and returns the canonical revalidated cart.

### Authentication integration

- Runs merge after a verified Customer Web session is issued through the shared authentication proxy.
- Covers password login, Google OAuth, and email verification without duplicating merge code in individual routes.
- Does not fail authentication if the cart service is temporarily unavailable.
- Clears the browser cart cookie when the Backend reports that the token belongs to another account.
- Existing full-page post-auth navigation reloads Cart Context and the header count from the merged server cart.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Cart ownership, cross-account rejection, stock cap, draft invalidation, source abandonment, and existing cart behavior | Passed; 6 tests |
| Backend | Prisma client generation | Passed |
| Backend | Complete NestJS application and library build | Passed |
| Customer Web | Next.js production build and type validation | Passed; 60 routes generated |
| Workspace | `git diff --check` | Passed |

## Data Safety

- Merge never trusts email or phone similarity; ownership comes from the verified JWT user ID.
- Raw cart tokens remain absent from database storage and logs; only SHA-256 token hashes are persisted.
- An account session can succeed independently of a transient cart merge failure, preventing cart infrastructure from becoming an authentication outage.
