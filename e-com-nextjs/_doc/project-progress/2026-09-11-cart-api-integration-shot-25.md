# Cart API Integration Shot 25

Date: 2026-09-11

## Scope

Audited customer cart mutations, validation, save/share/import, saved-cart
management, and reorder against the customer BFF routes and NestJS
`CartController`.

## Findings and changes

- Anonymous cart mutations use `ferio_cart` on the BFF and `X-Cart-Token`
  upstream, matching the NestJS controller. Quantity updates support the
  backend's optional `replacementVariantId`.
- Saved-cart sharing/import routes and reorder route matched the backend paths
  and methods. Reorder remains authenticated and forwards the active cart token.
- Fixed an ownership/error-boundary bug in the authenticated save-cart path:
  any non-2xx authenticated response previously fell through to an anonymous
  save request. The BFF now returns the authenticated upstream response and
  only uses the guest path when there is no customer session.
- Fixed the same status handling for saved-cart list, delete, and
  save-to-account routes. Upstream `403`, `404`, `409`, and `5xx` responses now
  retain their status/code/correlation data instead of being mislabeled as
  `401`.
- Corrected the cart API documentation from the stale `cart_token` cookie name
  to `ferio_cart`, documented `X-Cart-Token`, and recorded that guest save is a
  supported share-link flow.

## Verification

From `ferio-customer-web`:

```text
pnpm api:check  PASS
pnpm exec tsc --noEmit  PASS
pnpm lint  PASS (existing @next/next/no-img-element warnings only)
```

## Remaining runtime proof

Live proof still requires the local application/PostgreSQL stack. The next
runtime checks should cover tenant-cookie separation, cart mutation races,
saved-cart authorization, share-token abuse limits, reorder ownership, and
cart-to-checkout idempotency across two tenant hosts.
