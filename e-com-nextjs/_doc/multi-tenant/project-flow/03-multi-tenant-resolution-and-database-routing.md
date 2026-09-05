# 3. Multi-Tenant Resolution And Database Routing

This is the most important flow in the project. Every tenant request must end
with exactly one trusted organization and one tenant database.

## Resolution Flow

```text
Request host
  -> effective host selection
  -> normalizeTenantHost()
  -> Redis positive/negative cache
  -> control-plane TenantDomain lookup
  -> Organization status check
  -> TenantDatabase registry lookup
  -> immutable TenantContext
  -> TenantDatabaseManager client
```

## Step 1: Select The Host

`TenantResolverService.effectiveHostFrom()` uses the request hostname. An
`x-forwarded-host` value is accepted only when the request came from a trusted
proxy CIDR. Forwarded host chains and ambiguous values are rejected.

The browser cannot choose a tenant using a body field, query parameter,
organization ID, or database URL.

## Step 2: Normalize The Host

`normalizeTenantHost()` lowercases the hostname, strips an allowed port, and
rejects malformed values and unsafe IP-literal use. The normalized hostname is
the lookup key.

## Step 3: Resolve From Cache Or Control Plane

The resolver checks Redis:

- positive host mapping: about 60 seconds;
- negative unknown-host result: about 15 seconds;
- Redis failure: bypass cache and query the control plane.

The control-plane query joins the active domain, organization, and subscription.
Then it loads the tenant database registry. The registry must be ready and not
retired or migration-required.

## Step 4: Apply Lifecycle Rules

The resolver fails closed for unknown, inactive, closed, archived,
provisioning-failed, unavailable, or migration-required tenants. A suspended
organization may remain browsable according to product policy, but commerce
mutations are later rejected by `assertTenantCommerceWritable()`.

No resolver failure falls back to the original single-tenant database.

## Step 5: Create Immutable Context

`runWithTenantContext()` stores a frozen context in Node.js
`AsyncLocalStorage`. It contains:

- `organizationId`;
- `tenantDatabaseId`;
- encrypted database connection material;
- domain ID and normalized hostname;
- subscription status.

Downstream code reads this context. It must not mutate it or replace it with a
client-provided identity.

## Step 6: Obtain A Tenant Prisma Client

`TenantDbService.get()` reads the context and asks `TenantDatabaseManager` for
the client. The manager decrypts credentials only when creating the bounded
client/pool, reuses clients, evicts idle entries, and applies acquisition and
circuit-breaker limits.

`get()` fails loudly without context. `tryGet()` exists only for explicit
migration compatibility paths and must not become an invisible fallback.

## Tenant Isolation Rules

- Every tenant query uses the resolved tenant Prisma client.
- Every ownership lookup is scoped to the tenant database and actor.
- Redis keys, object keys, queue envelopes, and socket rooms carry tenant
  identity where cross-tenant collision is possible.
- Tenant DBs do not use foreign keys to control-plane tables.
- A platform service may inspect registry metadata, but it does not silently
  become a tenant commerce service.

## What Happens When Something Fails

| Failure | Result |
|---|---|
| Unknown hostname | Stable tenant-resolution error; short negative cache |
| Untrusted forwarded host | Bad request; no database lookup |
| Control plane unavailable | Fail closed; do not negative-cache outage |
| Tenant DB not ready | Tenant unavailable response |
| Migration required | Migration-required response |
| Tenant suspended | Browse policy may allow reads; commerce writes are blocked |
| Tenant DB circuit open | Tenant dependency unavailable; other tenants remain isolated |

