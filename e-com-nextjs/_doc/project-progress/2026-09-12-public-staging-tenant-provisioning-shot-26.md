# Public Staging Tenant Provisioning - Shot 26

Date: 2026-09-12

## Scope

This shot validates the operator-managed Cloudflare Tunnel fallback using the
no-cost one-level wildcard shape:

```text
*.sheakh.qzz.io -> local customer-web on http://localhost:3000
```

The two disposable organizations were created and provisioned through the
platform API, not by editing control-plane tables directly:

| Organization slug | Tenant hostname | Domain status |
| --- | --- | --- |
| `stage-alpha-20260912` | `stage-alpha-20260912.sheakh.qzz.io` | `ACTIVE` |
| `stage-beta-20260912` | `stage-beta-20260912.sheakh.qzz.io` | `ACTIVE` |

Each provisioning run completed the tenant database bootstrap and created its
active `TenantDomain` using `PLATFORM_PUBLIC_DOMAIN=sheakh.qzz.io`.

## Runtime configuration

The local-only staging environment loaded:

```ini
PLATFORM_PUBLIC_DOMAIN=sheakh.qzz.io
CUSTOMER_WEB_TRUSTED_PROXY=true
TENANT_TRUSTED_PROXY_CIDRS=172.18.0.7/32
```

The CIDR is the current `ferio-customer-web` container address on the
`e-com-nextjs_default` network. It is intentionally restricted to the BFF
container instead of trusting the whole Docker network. Container addresses
must be rechecked after recreation; this value is not a portable production
configuration.

Project Redis remains reachable internally as `redis:6379` and is published
locally on host port `6380` because an unrelated host Redis process owns
`6379`. The host Redis process was not stopped or modified.

## Public probes

The following probes passed after the proxy CIDR correction:

| Host | `GET /` | SSR result | `GET /api/store/config` |
| --- | --- | --- | --- |
| `stage-alpha-20260912.sheakh.qzz.io` | `HTTP/2 200` | `Ferio - Shop Online` | `HTTP/2 200` |
| `stage-beta-20260912.sheakh.qzz.io` | `HTTP/2 200` | `Ferio - Shop Online` | `HTTP/2 200` |

Before the correction, the backend returned
`TENANT_FORWARDED_HOST_UNTRUSTED`, which correctly demonstrated that the
resolver was fail-closed. The correction allowed only the actual customer-web
BFF address and did not weaken forwarded-host validation.

## What this proves

- Cloudflare DNS and Tunnel reach both one-level tenant hostnames.
- The corrected route reaches the local customer-web service.
- Next.js SSR preserves the active tenant state instead of rendering the
  unavailable page.
- The customer-web `/api/store/config` BFF responds over both public hosts.
- Tenant provisioning creates active domain records through the supported
  platform workflow.

## What this does not prove

- The two stores currently use the default seeded `Ferio` configuration, so
  identical branding is expected and is not an isolation assertion.
- No authenticated browser cookie, cart, order, customer, WebSocket, or
  cross-tenant negative test was run in this shot.
- This is local Docker plus Cloudflare staging, not managed production
  hosting, failover, PITR, provider delivery, or pilot evidence.

## Next action

Use two browser profiles against the two active hosts. Create deliberately
different tenant-visible data, then verify that SSR, BFF requests, cookies,
cart/order state, authenticated sessions, and WebSocket tickets cannot cross
between Alpha and Beta. Keep the browser matrix as separate evidence from
this infrastructure probe.
