# Patterns 6-10: Tenant Context And Database Routing

## 6. Trusted forwarded host

Template: `src/tenancy/services/tenant-resolver.service.ts`. Only configured
proxy CIDRs may supply `x-forwarded-host`; chains and ambiguous values fail
closed. Compare the public Cloudflare/BFF path with local development mapping.

## 7. Host normalization

Template: `src/tenancy/errors/tenant-errors.ts`. Normalization is a security
boundary: lowercasing, port handling, malformed host rejection, and safe IP
rules must produce one canonical lookup key.

## 8. Positive/negative resolver cache

Template: resolver cache methods and `src/tenancy/tests/tenant-resolver.service.spec.ts`.
Study positive TTLs, short unknown-host TTLs, outage behavior, in-flight
deduplication, and domain invalidation.

## 9. Immutable AsyncLocalStorage context

Template: `src/tenancy/context/tenant-context.ts`. The resolver creates the
context from control-plane data; downstream services read it but cannot replace
it with request body, query, or header identity.

## 10. Fail-loud tenant DB access

Template: `src/tenancy/services/tenant-db.service.ts` and
`tenant-database.manager.ts`. `get()` requires context, `tryGet()` is explicit,
and legacy fallback requires a written reason. Read its unit tests before
touching a feature service.

### Senior questions

- What happens if Redis is down during resolution?
- Can an unknown host reach a legacy database?
- When are credentials decrypted and who owns pooling?
- Which code paths are allowed to run without a tenant context?
