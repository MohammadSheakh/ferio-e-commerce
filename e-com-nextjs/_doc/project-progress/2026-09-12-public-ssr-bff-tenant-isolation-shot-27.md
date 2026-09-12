# Public SSR and BFF Tenant Isolation - Shot 27

Date: 2026-09-12

## Finding and fix

The first public two-tenant probe found that the backend returned distinct
store configurations when called from the customer-web network with an
explicit `x-forwarded-host`, but the public customer `/api/store/config` BFF
returned the generic `Ferio` fallback. The server-rendered document also used
the generic fallback store name.

The root issue was a host-forwarding boundary: the route handler depended on a
server-component host provider, while this BFF must forward the host from its
own incoming `Request`. The fix:

- made `GET /api/store/config` explicitly request-aware and forwarded the
  resolved host using the shared `forwardedHeaders()` helper;
- marked the route `dynamic = "force-dynamic"` so one tenant cannot become a
  build-time/static response for every host;
- made layout SSR store and category fetches pass the resolved tenant host
  explicitly to shared API calls;
- changed transport failures to a typed `503 SERVICE_UNAVAILABLE` response
  instead of silently returning a successful generic fallback from the BFF.

The customer-web typecheck passed before the image rebuild. The existing
non-blocking Next image optimization warnings remain unchanged.

## Clean public regression

After rebuilding customer-web through the tunnel-aware Compose stack:

| Host | SSR document title | BFF `storeName` | Result |
| --- | --- | --- | --- |
| `stage-alpha-20260912.sheakh.qzz.io` | `Stage Alpha 2026-09-12 - Shop Online` | `Stage Alpha 2026-09-12` | PASS |
| `stage-beta-20260912.sheakh.qzz.io` | `Stage Beta 2026-09-12 - Shop Online` | `Stage Beta 2026-09-12` | PASS |

Both public requests returned `HTTP/2 200`. The unavailable marker was absent.
The temporary staging header probe used during diagnosis was removed from the
source and rebuilt image; requesting it returns `HTTP/2 404`.

## Isolation meaning

This proves host-to-tenant selection for public SSR and the store-config BFF
against two active tenant domains backed by separate tenant databases. It does
not yet prove authenticated cookie, guest-cart, order, WebSocket, customer
account, or cross-tenant negative behavior.

## Next action

Run the authenticated two-browser matrix: log in or create disposable users on
Alpha and Beta, create distinct carts/orders, refresh sessions, and attempt
cross-host reuse. Then verify chat socket tickets and all BFF responses remain
bound to the originating tenant host.
