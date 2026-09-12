# Public Tenant Cache Boundary - Shot 28

Date: 2026-09-12

## Verified boundary

The live Cloudflare staging hosts were queried independently:

| Host | Store-config response | SSR identity | Cloudflare cache |
| --- | --- | --- | --- |
| `stage-alpha-20260912.sheakh.qzz.io` | `Stage Alpha 2026-09-12` | Alpha title | `DYNAMIC` |
| `stage-beta-20260912.sheakh.qzz.io` | `Stage Beta 2026-09-12` | Beta title | `DYNAMIC` |

The BFF response headers include `cf-cache-status: DYNAMIC`. No shared edge
cache hit was observed, and no cross-host `Set-Cookie` header was emitted by
the public store-config request. The previous Shot 27 fix remains deployed.

## What remains blocked

The disposable Alpha and Beta tenant databases have no active product variants,
so a guest-cart mutation cannot be performed without first creating catalog
fixtures through the supported authenticated tenant-admin workflow. Direct SQL
fixture insertion was intentionally not used because it would bypass the
provisioning and authorization paths under test.

This shot therefore does not claim authenticated session, cart, order,
WebSocket, or cross-tenant negative isolation. It only confirms the public
host-dependent SSR/BFF/cache boundary.

## Next action

Use a disposable tenant-admin session to create one distinct active product in
each tenant, then run two independent browser/cookie-jar flows for login,
guest cart, checkout draft, order creation, refresh-cookie rotation, and chat
socket ticket issuance. Reuse each credential only on its originating host and
assert the opposite host rejects it or sees an empty tenant-local state.
