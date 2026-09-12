# Cloudflare Wildcard DNS and Tunnel Ingress

This runbook publishes the local Docker-backed Ferio staging stack through a
named Cloudflare Tunnel. It is for staging and internal-alpha validation only.
It is not production hosting, managed PostgreSQL recovery, or an availability
guarantee.

Request path:

    tenant-a.sheakh.qzz.io
        -> Cloudflare DNS and TLS
        -> named cloudflared tunnel
        -> local customer-web on port 3000
        -> internal backend on port 6733
        -> tenant resolver
        -> tenant PostgreSQL database

Keep tunnel credentials and Cloudflare API tokens outside Git. Never put them
in Docker Compose, env examples, Docker images, or this document.

## 1. Prerequisites

Install cloudflared on the machine that can reach local customer-web and log in
to the zone owner:

    cloudflared version
    cloudflared tunnel login

Select the Cloudflare zone that owns ferio.sheakh.qzz.io. Confirm the account
can create tunnel routes and DNS records.

Start Ferio and verify the origin first:

    cd /home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs
    docker compose up -d --build
    docker compose ps
    curl -fsS http://127.0.0.1:6733/api/v1/health
    curl -fsS http://127.0.0.1:3000/ >/dev/null

Expose customer-web only. Do not tunnel PostgreSQL, Redis, MinIO, platform
admin, tenant admin, or the backend port directly.

## 2. Create a named tunnel

    cloudflared tunnel list
    cloudflared tunnel create ferio-local-staging
    cloudflared tunnel list

Copy the tunnel UUID. The credential file is normally:

    ~/.cloudflared/<TUNNEL_UUID>.json

Protect it and never copy it into the repository:

    chmod 600 "$HOME/.cloudflared/<TUNNEL_UUID>.json"

## 3. Create the no-cost one-level wildcard published application

For the existing remotely managed tunnel shown in the Cloudflare dashboard,
use the dashboard route editor. This is the preferred path because it creates
the published application and its tunnel-side ingress together:

1. Open **Zero Trust -> Networks -> Tunnels**.
2. Select the `sheakh` tunnel and open **Routes**.
3. Edit the existing exact route for `ferio.sheakh.qzz.io`.
4. Set its service to **HTTP** `http://localhost:3000`. The current Ferio
   Compose stack exposes customer-web on host port `3000`; do not leave this
   route pointed at `localhost:3002`.
5. Select **Add route -> Published application**.
6. Set the subdomain field to `*` and select `sheakh.qzz.io` as the domain.
   The preview must show `*.sheakh.qzz.io`.
7. Set the service type to **HTTP** and the URL to `http://localhost:3000`.
8. Save the route and confirm both routes belong to tunnel `sheakh`.

Set the staging environment value below before reserving tenant subdomains:

    PLATFORM_PUBLIC_DOMAIN=sheakh.qzz.io

Ferio will then provision the following browser-valid one-level hostnames:

```text
tenant-a.sheakh.qzz.io
tenant-b.sheakh.qzz.io
```

This uses Universal SSL without purchasing Advanced Certificate Manager.

### Optional future deep hostname

The product's preferred shape is `tenant-a.ferio.sheakh.qzz.io`, but that is a
multi-level hostname relative to the `sheakh.qzz.io` zone. Universal SSL does
not cover it by default. Do not use `*.ferio` in the dashboard unless you have
first enabled Advanced Certificate Manager or uploaded a custom certificate
covering `*.ferio.sheakh.qzz.io`. That future route would still use
`http://localhost:3000`.

The exact base route should remain separate from the wildcard route. Do not
route the wildcard to `6733`, `3001`, `3100`, PostgreSQL, Redis, or MinIO.
The wildcard is for customer-web only; backend and admin hostnames remain
separate published applications.

If the dashboard does not create the DNS record automatically, create the
Cloudflare DNS record through **Websites -> sheakh.qzz.io -> DNS -> Records**:

1. Create a proxied CNAME record with name `*`.
2. Set its target to `<TUNNEL_UUID>.cfargotunnel.com`.
3. Remove conflicting A, AAAA, or old CNAME records for the wildcard name.

For a locally managed named tunnel, the equivalent DNS commands are:

    cloudflared tunnel route dns sheakh ferio.sheakh.qzz.io
    cloudflared tunnel route dns sheakh '*.sheakh.qzz.io'

The DNS command alone is not enough for a remotely managed tunnel: the
published application route must still target customer-web on port `3000`.

Verify:

    dig +short ferio.sheakh.qzz.io CNAME
    dig +short audit-beta-20260911.sheakh.qzz.io CNAME
    dig +short audit-gamma-20260911.sheakh.qzz.io CNAME

Also verify the public edge before provisioning tenant domains:

    curl -fsS -D /tmp/ferio-public.headers \
      -o /tmp/ferio-public.html \
      https://ferio.sheakh.qzz.io/
    grep -E 'HTTP/|location:|strict-transport-security' \
      /tmp/ferio-public.headers

The wildcard routes traffic only. Each hostname still needs an active
TenantDomain row created through Ferio provisioning.

## 4. Configure tunnel ingress for a locally managed tunnel

Skip this section when the `sheakh` tunnel is managed in the Cloudflare
dashboard. In that case, the published application routes in Section 3 are
the source of truth. Do not configure both dashboard ingress and a competing
local ingress file for the same tunnel.

Create this file outside the repository:
$HOME/.cloudflared/ferio-local-staging.yml

    tunnel: <TUNNEL_UUID>
    credentials-file: /home/<LINUX_USER>/.cloudflared/<TUNNEL_UUID>.json

    ingress:
      - hostname: ferio.sheakh.qzz.io
        service: http://127.0.0.1:3000
      - hostname: '*.sheakh.qzz.io'
        service: http://127.0.0.1:3000
      - service: http_status:404

The final 404 rule prevents unmatched hostnames from falling through to
another local service. Validate the file:

    cloudflared tunnel ingress validate \
      --config "$HOME/.cloudflared/ferio-local-staging.yml"

    cloudflared tunnel ingress rule \
      --config "$HOME/.cloudflared/ferio-local-staging.yml" \
      https://audit-beta-20260911.sheakh.qzz.io

The rule command should select the wildcard customer-web rule. Do not set a
static origin Host header that replaces the tenant hostname.

## 5. Configure Ferio trusted-edge policy

The repository overlay is docker-compose.tunnel-staging.yml. Create an
untracked env file:

    cd /home/chillpc/MohammadSheakh/projects/26/e-commerce/e-com-nextjs
    umask 077
    touch .env.tunnel-staging.local

Set these values in that file:

    PLATFORM_PUBLIC_DOMAIN=sheakh.qzz.io
    CUSTOMER_WEB_TRUSTED_PROXY=true
    TENANT_TRUSTED_PROXY_CIDRS=<CUSTOMER_WEB_CONTAINER_IP>/32

The backend must trust the narrow peer that connects to it, not the Internet
or an unrestricted Docker range. Discover the customer-web address:

    docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
      ferio-customer-web

For the current `e-com-nextjs_default` network the result is
`172.18.0.7`, so the active local value is:
TENANT_TRUSTED_PROXY_CIDRS=172.18.0.7/32

If Docker recreates the container and changes its IP, update this value and
recreate the backend. Never use 0.0.0.0/0.

Bring up the overlay:

    docker compose \
      --env-file .env.tunnel-staging.local \
      -f docker-compose.yml \
      -f docker-compose.tunnel-staging.yml \
      up -d --build backend customer-web

Confirm only non-secret values:

    docker inspect ferio-backend --format '{{range .Config.Env}}{{println .}}{{end}}' \
      | grep -E '^(TENANCY_ENABLED|PLATFORM_PUBLIC_DOMAIN|TENANT_TRUSTED_PROXY_CIDRS)='

    docker inspect ferio-customer-web --format '{{range .Config.Env}}{{println .}}{{end}}' \
      | grep '^CUSTOMER_WEB_TRUSTED_PROXY='

Set CUSTOMER_WEB_TRUSTED_PROXY=true only when the tunnel is the trusted edge
and overwrites, rather than appends, the forwarded host. Ferio intentionally
fails closed when that contract is not met.

## 6. Start the tunnel

Run it interactively for first validation:

    cloudflared tunnel run \
      --config "$HOME/.cloudflared/ferio-local-staging.yml" \
      ferio-local-staging

Keep logs visible and confirm connected tunnel connections and successful
origin requests. Install a service only after the interactive run is healthy:

    sudo cloudflared service install \
      "$HOME/.cloudflared/ferio-local-staging.yml"
    sudo systemctl enable --now cloudflared
    sudo journalctl -u cloudflared -f

Use the service configuration path expected by the installed package. On some
Linux packages it is /etc/cloudflared/config.yml. Use root-only permissions
for that file and its credentials.

## 7. Provision disposable tenant domains

Wildcard DNS does not create tenants. Create disposable organizations and
register active domains through the supported platform provisioning flow. Do
not hand-edit tenant credentials or bypass provisioning.

Use names such as:

    audit-beta-20260911.sheakh.qzz.io
    audit-gamma-20260911.sheakh.qzz.io

Require both organizations to be ACTIVE, their TenantDomain rows active, and
their tenant databases ready before browser testing.

## 8. Verify DNS, TLS, SSR, and tenant resolution

With the tunnel running:

    dig +short audit-beta-20260911.sheakh.qzz.io
    dig +short audit-gamma-20260911.sheakh.qzz.io

    curl -fsS -D /tmp/beta.headers \
      -o /tmp/beta.html \
      https://audit-beta-20260911.sheakh.qzz.io/
    curl -fsS -D /tmp/gamma.headers \
      -o /tmp/gamma.html \
      https://audit-gamma-20260911.sheakh.qzz.io/

    grep -E 'HTTP/|strict-transport-security|location:' /tmp/beta.headers
    grep -E 'HTTP/|strict-transport-security|location:' /tmp/gamma.headers
    grep -Eo 'Audit (Beta|Gamma) 2026-09-11|Store unavailable' /tmp/beta.html | sort -u
    grep -Eo 'Audit (Beta|Gamma) 2026-09-11|Store unavailable' /tmp/gamma.html | sort -u

Each response must use HTTPS, show the expected store identity, and never show
the other tenant identity. An unprovisioned hostname must fail closed rather
than select a default tenant.

## 9. Browser isolation gate

Use two separate browser profiles or private browser contexts. Do not reuse
cookies between hosts.

For Beta and Gamma separately verify:

1. SSR identity is correct after a hard refresh.
2. Login and refresh-cookie rotation stay on the same hostname.
3. A cart created on Beta is absent on Gamma.
4. An order created on Beta cannot be read or mutated from Gamma.
5. Saved carts, wallet/account data, notifications, service bookings, and
   warranty claims do not cross hosts.
6. Browser cache and Next.js/RSC responses never show the other store.
7. Switching hosts does not carry a tenant cookie or server session.

Record status, correlation IDs, screenshots, or HAR files without recording
tokens, passwords, payment data, or database credentials. A passing curl
request is not a substitute for this browser gate.

## 10. Troubleshooting

For a Cloudflare 502:

    docker compose ps customer-web
    curl -v http://127.0.0.1:3000/
    cloudflared tunnel list
    cloudflared tunnel info ferio-local-staging

Confirm the tunnel process can reach 127.0.0.1:3000 from its machine and
inspect its logs.

For TENANT_RESOLUTION_FAILED, confirm the exact hostname is an active
TenantDomain, its organization is active, its tenant database is ready, and
the exact hostname arrives at the backend. Do not add a default tenant.

For TENANT_HOST_INVALID, confirm the tunnel overwrites the forwarded host,
customer-web uses CUSTOMER_WEB_TRUSTED_PROXY=true, and the backend trusts only
the customer-web peer CIDR. If uncertain, set the trust flag to false and
investigate instead of loosening policy.

If the base domain works but wildcard hosts do not, check conflicting DNS
records and the wildcard CNAME target. DNS does not replace provisioning.

## 11. Stop and rollback

Stop an interactive tunnel with Ctrl-C, or stop its service:

    sudo systemctl disable --now cloudflared

Remove only staging DNS routes through controlled Cloudflare DNS change
management. Do not delete a shared production tunnel or zone record without
confirming the tunnel UUID and ownership.

After disabling the public edge, restore the local stack without the overlay:

    docker compose up -d --build backend customer-web

Keep fail-closed settings and never expose backend, PostgreSQL, Redis, or MinIO
ports to the public Internet.
