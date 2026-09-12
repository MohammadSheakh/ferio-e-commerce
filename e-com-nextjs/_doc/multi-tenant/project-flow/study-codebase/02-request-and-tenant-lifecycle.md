# 2. Request And Tenant Lifecycle

## HTTP path

```text
HTTP request
  -> correlation middleware
  -> tenant middleware when the route is tenant-scoped
  -> DTO validation
  -> auth/role/permission/membership guards
  -> controller
  -> application service
  -> tenant or platform database boundary
  -> response interceptor or stable error filter
```

Read `src/main.ts` for global behavior and
`src/tenancy/services/tenant-resolver.service.ts` for the middleware and host
rules. Read `src/tenancy/context/tenant-context.ts` to understand the
AsyncLocalStorage contract.

## Tenant selection

`TenantResolverService` selects the effective host, rejects ambiguous or
untrusted forwarded-host chains, normalizes it, checks Redis, then reads the
control-plane domain and tenant database registry. A resolved context contains
organization ID, registry ID, hostname, domain ID, subscription status, and
encrypted database material. It is frozen before downstream code sees it.

`TenantDbService` accepts no organization ID or database URL from a caller. A
missing context fails loudly. `getOrLegacy()` is an explicit migration-window
escape hatch and requires a reason; it is not a hidden fallback.

## Platform exception

`/platform/*` requests skip tenant middleware and use
`src/platform/platform-prisma.service.ts`. Platform authentication and
permissions are handled by `src/platform/guards/platform-auth.guard.ts` and
the platform controllers. This is the control-plane path, not a tenant
commerce shortcut.

## Web and BFF study

For the public web path, compare backend resolution with:

- `ferio-customer-web/app/api/store/config/route.ts`
- `ferio-customer-web/lib/backend.ts`
- `ferio-customer-web/lib/tenancy.ts`
- `ferio-customer-web/app/layout.tsx`

The BFF must preserve the incoming tenant host to the backend. The public
staging proof in `_doc/project-progress/2026-09-12-public-ssr-bff-tenant-isolation-shot-27.md`
shows distinct Alpha/Beta SSR and store-config responses; it is staging
evidence, not production availability evidence.
