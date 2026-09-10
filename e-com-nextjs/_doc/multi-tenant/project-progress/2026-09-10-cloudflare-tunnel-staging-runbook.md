# Cloudflare Tunnel Tenant-Host Staging Runbook

Status: executable staging procedure; no live DNS or browser evidence captured

This runbook uses the local Docker PostgreSQL tenant databases and the existing
Cloudflare Tunnel to validate public host routing before managed hosting is
chosen. It does not claim production readiness, managed backup/restore, pilot
business onboarding, or million-user capacity.

## Boundary

```text
tenant-a.ferio.sheakh.qzz.io
        -> Cloudflare DNS/proxy and Tunnel
        -> local customer-web
        -> internal customer-web BFF request
        -> local NestJS backend
        -> platform registry host lookup
        -> tenant-a PostgreSQL database
```

The control plane remains the source of truth for hostname-to-organization
mapping. The request body, query string, token claims, and database URL must
not select a tenant.

## Operator Preconditions

1. Create a proxied wildcard DNS record for `*.ferio.sheakh.qzz.io` in
   Cloudflare and route it to the customer-web origin through the existing
   Tunnel. Do not expose PostgreSQL, Redis, or the NestJS port directly to the
   Internet.
2. Register at least three active platform domains, for example:
   `alpha-a.ferio.sheakh.qzz.io`, `alpha-b.ferio.sheakh.qzz.io`, and
   `alpha-c.ferio.sheakh.qzz.io`. Each must point to a different active
   organization and a `READY` tenant database in the platform registry.
3. Set `PLATFORM_PUBLIC_DOMAIN=ferio.sheakh.qzz.io` in the staging shell.
4. Set `CUSTOMER_WEB_TRUSTED_PROXY=true` only when Cloudflare Tunnel is the
   only trusted public edge for customer-web. Never enable it on an origin
   directly reachable by untrusted clients.
5. Set `TENANT_TRUSTED_PROXY_CIDRS` to the narrow peer CIDR that the NestJS
   container actually sees for customer-web BFF requests. The base Compose
   development default is not production evidence; inspect the backend access
   log or container network before choosing the value.
6. Run the overlay without adding or changing any Redis service/configuration:

```sh
cd e-com-nextjs
export PLATFORM_PUBLIC_DOMAIN=ferio.sheakh.qzz.io
export CUSTOMER_WEB_TRUSTED_PROXY=true
export TENANT_TRUSTED_PROXY_CIDRS=172.16.0.0/12 # replace with the observed narrow peer range
docker compose -f docker-compose.yml -f docker-compose.tunnel-staging.yml up -d --build
```

The overlay is checked in at `docker-compose.tunnel-staging.yml`. Tunnel
credentials stay outside the repository.

## DNS and TLS Evidence

Run from a network that can resolve the public zone:

```sh
for host in alpha-a alpha-b alpha-c; do
  dig +short "$host.ferio.sheakh.qzz.io"
  curl --fail --silent --show-error --head \
    "https://$host.ferio.sheakh.qzz.io/"
done
```

Record the date, hostname, DNS answer, HTTP status, certificate hostname, and
Cloudflare/Tunnel response headers. Redact cookies, authorization headers, and
Tunnel identifiers before committing evidence. A wildcard DNS answer alone
does not prove that the hostname is registered to the intended organization.

## Two-Host SSR/BFF Isolation

Use two clean browser profiles or two isolated cookie jars. Do not reuse
authenticated cookies between hosts.

```sh
curl --fail --silent --show-error --include \
  --cookie-jar /tmp/ferio-alpha-a.cookies \
  https://alpha-a.ferio.sheakh.qzz.io/ > /tmp/ferio-alpha-a.html

curl --fail --silent --show-error --include \
  --cookie-jar /tmp/ferio-alpha-b.cookies \
  https://alpha-b.ferio.sheakh.qzz.io/ > /tmp/ferio-alpha-b.html

curl --fail --silent --show-error \
  https://alpha-a.ferio.sheakh.qzz.io/api/store/config > /tmp/ferio-alpha-a.config.json

curl --fail --silent --show-error \
  https://alpha-b.ferio.sheakh.qzz.io/api/store/config > /tmp/ferio-alpha-b.config.json
```

For each response, verify and retain redacted evidence for:

- tenant-specific store name/logo/theme/configuration in SSR output;
- `Cache-Control: private, no-store` and tenant host in `Vary` where the
  backend response is tenant-resolved;
- BFF requests preserve the original host rather than the internal backend
  hostname;
- identical product/customer/order identifiers resolve to different records;
- cart, account, checkout, order, wallet, service, chat, and pickup results do
  not cross hosts;
- an unknown or suspended hostname fails closed and is not indexed;
- switching browser profiles does not reuse the other host's session or
  response cache.

The existing app contract forwards one normalized `x-forwarded-host` value.
The backend accepts it only when the direct TCP peer belongs to the configured
trusted CIDR. It rejects missing trust, comma-separated forwarding chains, and
invalid hosts. Capture those negative results as part of the evidence.

## Negative Proxy Tests

Do these only from a controlled internal test path, not by weakening the public
Tunnel. A public request with a client-supplied forwarding header must not be
able to select another tenant.

```sh
curl --include --silent --show-error \
  -H 'x-forwarded-host: alpha-b.ferio.sheakh.qzz.io, attacker.example' \
  https://alpha-a.ferio.sheakh.qzz.io/api/store/config
```

Expected result: rejection or resolution from the trusted edge-selected host,
never tenant B. Do not mark this test passed if the request reaches NestJS
through an untrusted direct path that bypasses the configured ingress model.

## Evidence and Checklist Mapping

Attach the redacted command output and browser trace to the release evidence
directory. This procedure can support:

- MT-5 wildcard DNS and public TLS/host-routing evidence;
- MT-11 SSR/BFF tenant-host preservation and no-cache-crossover evidence;
- MT-14 internal-alpha two-host validation.

It does not close these gates by itself:

- managed PostgreSQL hosting, PITR, or restore RPO/RTO;
- production Redis or BullMQ dead-letter retention;
- provider-backed malware quarantine or messaging delivery;
- real-business pilot beta;
- formal security acceptance or the complete PRD Release 1 exit review.

## Safety Rules

- Never expose local PostgreSQL or Redis ports through Cloudflare Tunnel.
- Never commit Cloudflare tokens, cookies, JWTs, database URLs, or provider
  credentials.
- Use disposable tenants for destructive tests and preserve backup evidence
  before deletion.
- Do not change Redis implementation/configuration for this validation.
- Do not use `TENANT_DEV_HOST_MAP` or arbitrary host overrides as evidence for
  public DNS or TLS behavior; those are local-development conveniences only.
