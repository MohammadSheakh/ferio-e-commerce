# Customer account API integration shot 28

Date: 2026-09-11

## Scope

Audited the customer account profile/address, commerce order projection, reorder,
store-pickup scheduling, notifications, and wallet/top-up surfaces against the
NestJS controllers, DTOs, and customer BFF routes.

## Findings and changes

- Confirmed the shipped order-history screen uses the authenticated
  `GET /account/commerce` projection, not generic customer `GET /orders` or
  `GET /orders/:id` endpoints. Updated `auth-and-account.md` to document the
  actual integration and the separate reorder/link/pickup actions.
- Confirmed profile, address, account-link, reorder, and store-pickup methods
  match their backend contracts.
- Hardened notifications loading and mark-read/read-all actions. Failed or
  malformed responses now remain visible as errors and do not mutate local
  unread state optimistically.
- Hardened wallet loading and top-up submission. Network/malformed responses
  now produce bounded error feedback, and the submitting state is released in
  `finally`; the existing `Idempotency-Key` header and minor-unit amount
  conversion remain intact.
- Hardened account-order projection loading with safe response parsing and a
  guaranteed loading-state reset.

## Verification

- Customer `pnpm api:check`: passed.
- Customer `pnpm exec tsc --noEmit`: passed.
- Customer `pnpm lint`: passed with the repository's existing
  `@next/next/no-img-element` warnings only.

## Remaining runtime proof

This source-level shot does not claim live authentication, cookie rotation,
tenant-host isolation, notification authorization, wallet idempotency replay,
provider settlement, or PostgreSQL/Redis operational evidence. Those require
the local Docker stack and live staging hosts to be available.
