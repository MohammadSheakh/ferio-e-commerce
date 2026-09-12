# Customer Account and Wallet API Integration - Shot 59

**Date:** 2026-09-11
**Scope:** Customer profile, addresses, order history/reorder, notifications,
and wallet

## Findings and change

- Profile GET/PUT and guest-order linking match
  `/account/commerce` and `/account/commerce/profile`.
- Address create/update/delete callers match the customer account controller;
  ownership remains server-side through the authenticated session.
- Order history uses the account commerce projection, while reorder calls the
  ownership-checked `/cart/reorder/:orderId` BFF. Store-pickup scheduling uses
  the authenticated order action.
- Notifications list, unread-count badge, mark-read, mark-all-read, and delete
  all have browser callers and session-backed BFF forwarding.
- Wallet top-up submission forwards the backend idempotency key and uses minor
  units. Wallet checkout remains the authenticated atomic order path.
- Fixed the wallet history gap: the screen now sends `page` and `limit` to the
  wallet BFF and renders navigation from the server's `totalPages` response.

## Validation

- Customer API contract was compared with account, notification, wallet, and
  order controllers.
- Customer `pnpm api:check`: passed.
- `git diff --check`: passed.
- Redis was not changed.

## Remaining runtime evidence

Live customer ownership denial, refresh rotation/replay, wallet top-up
idempotency and exactly-once credit, browser cookie behavior, and
cross-tenant isolation still require runtime evidence.
