# Project-Flow Runtime Validation — Shot 21

Date: 2026-09-11

## Scope

Attempt the public Cloudflare/tunnel boundary, then run the strongest local
two-host cookie/BFF checks available without browser automation.

## Evidence

- `ferio.sheakh.qzz.io` resolves to Cloudflare, but HTTPS returns HTTP 502.
- `audit-beta-20260911.ferio.sheakh.qzz.io` and
  `audit-gamma-20260911.ferio.sheakh.qzz.io` have no public DNS records.
- No `cloudflared` process is running in this workspace. The repository tunnel
  overlay intentionally leaves `cloudflared` operator-managed and does not
  contain a tunnel token.
- The local backend returns HTTP 200 for both forwarded tenant hosts, with
  distinct active store identities: Audit Beta and Audit Gamma.
- The customer BFF cart request through the direct published port does not
  produce a false positive: it fails closed with `TENANT_HOST_INVALID`. The
  direct port is not the trusted tunnel edge, and the customer container is
  running the default untrusted-forwarded-host policy.
- No Playwright, Puppeteer, or Cypress runner is installed in the audited
  workspaces, so authenticated browser cookie/cart/order separation was not
  claimed.

## Assessment

The public two-host browser gate remains open because DNS/tunnel ingress is not
configured or running. The local backend host-resolution proof remains valid;
the BFF rejection demonstrates that the fail-closed proxy policy is active
rather than proving cookie isolation.

## Required next action

Run the operator-managed `cloudflared` tunnel with wildcard DNS for the two
disposable hosts, set the tunnel overlay's trusted proxy policy only at that
edge, then execute a real browser test with separate Beta and Gamma profiles.
Verify SSR, refresh-cookie rotation, cart, checkout/order ownership, cache
keys, and negative cross-host access before claiming the live isolation gate.

