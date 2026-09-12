# Cloudflare Tunnel Route Audit - Shot 25

Date: 2026-09-12

## Evidence reviewed

The operator-provided Cloudflare Tunnel dashboard screenshot for tunnel
`sheakh` shows four published applications:

| Hostname | Current origin |
| --- | --- |
| `mohammad.sheakh.qzz.io` | `http://localhost:3000` |
| `ferio.sheakh.qzz.io` | `http://localhost:3002` |
| `apiferio.sheakh.qzz.io` | `http://localhost:6733` |
| `adminf.sheakh.qzz.io` | `http://localhost:3001` |

The current local Compose stack exposes customer-web on host port `3000`,
backend on `6733`, tenant-admin on `3001`, and platform-admin on `3100`.
There is no wildcard `*.ferio.sheakh.qzz.io` published application in the
screenshot.

The follow-up dashboard form screenshot shows the attempted subdomain
`*.ferio` marked **Invalid subdomain format**, with service URL
`http://localhost:3003`. The form also warns that multi-level subdomains
require Advanced Certificate Manager. The correct service URL for this stack
is `http://localhost:3000`; the deep wildcard requires certificate coverage
for `*.ferio.sheakh.qzz.io`.

## Runtime probes

- `cloudflared version`: `2026.8.3`; the named tunnel `sheakh` is online with
  three connectors.
- `ferio.sheakh.qzz.io` resolves through Cloudflare but returns HTTP `502`.
- `alpha-a.ferio.sheakh.qzz.io` and `alpha-b.ferio.sheakh.qzz.io` have no DNS
  records and do not resolve.
- Local customer-web is healthy on port `3000`; local backend health returns
  HTTP `200`.
- The public tunnel routes observed in the screenshot do not yet represent
  Ferio's required wildcard tenant ingress.

## Operator correction required

In Cloudflare Tunnel Routes, update the Ferio customer route to:

```text
ferio.sheakh.qzz.io -> http://localhost:3000
```

Then add a published application for:

```text
*.ferio.sheakh.qzz.io -> http://localhost:3000
```

Keep `apiferio.sheakh.qzz.io -> http://localhost:6733` and the admin route
separate. Do not publish PostgreSQL, Redis, MinIO, or internal container
ports. After the route changes, register active `TenantDomain` rows through
Ferio provisioning before testing tenant hosts.

If Advanced Certificate Manager is not enabled, use a one-level wildcard
(`*.sheakh.qzz.io`) for staging or enable Advanced Certificate Manager before
using the required deep hostname shape. Do not treat the one-level fallback as
proof of the final `*.ferio.sheakh.qzz.io` routing contract.

## Gate status

**Blocked: operator Cloudflare configuration.** No application code or proxy
trust policy was changed in this shot. The positive two-tenant SSR/BFF and
browser-isolation gate cannot be claimed until the corrected origin and
wildcard route exist, disposable tenant domains resolve, and two independent
browser profiles pass the isolation matrix.
