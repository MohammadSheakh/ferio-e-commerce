# 9. Backend Study Lab

Use a disposable local profile. The goal is to learn the runtime behavior
without weakening tenant isolation or changing valuable data.

## 1. Static boundary checks

```bash
cd ferio-nest-prisma
pnpm typecheck:application
pnpm architecture:check
pnpm check:tenant-context-boundaries
pnpm check:migrations
pnpm check:migration-compatibility
```

Read the scripts before changing them. They encode architectural rules that
are part of the multi-tenant implementation checklist, not just convenience
linting.

## 2. Run focused tests first

```bash
pnpm test -- --runInBand src/tenancy/tests/tenant-resolver.service.spec.ts
pnpm test -- --runInBand src/tenancy/tests/tenant-db.service.spec.ts
pnpm test -- --runInBand src/tenancy/tests/tenant-membership.guard.spec.ts
pnpm test -- --runInBand src/features/cart/tests/cart.tenant-isolation.spec.ts
pnpm test -- --runInBand src/features/wallet/tests/wallet.tenant-isolation.spec.ts
```

Then move to the integration matrix:

```bash
pnpm test:integration:local
pnpm test:e2e
```

Only run integration/E2E commands after confirming the environment variables,
Docker services, database profile, and Redis profile in the command docs.

## 3. Trace one request

Choose a catalog request and trace it in this order:

```text
customer-web BFF
  -> backend route in catalog.controller.ts
  -> tenant middleware/resolver
  -> auth or public guard
  -> catalog service
  -> TenantDbService
  -> Prisma query
  -> response interceptor
```

Repeat the exercise with a platform organization request and note precisely
where the path changes to `PlatformPrismaService`.

## 4. Trace one async job

Choose a shipping webhook or payment recovery job. Follow:

```text
controller/webhook
  -> signature validation
  -> durable state or queue enqueue
  -> processor
  -> trusted organization envelope
  -> lifecycle/registry check
  -> tenant DB transaction
  -> retry/idempotency outcome
```

The worker cannot assume HTTP request context. This is a key distinction from
the synchronous request path.

## 5. Security exercises

For two disposable tenants, verify:

- host A cannot select host B's database with a body/query/header value;
- an untrusted forwarded host is rejected;
- unknown hosts fail closed;
- suspended tenants cannot perform commerce mutations;
- a worker envelope for A cannot acquire B's registry entry;
- socket rooms and Redis keys do not collide;
- logs contain correlation/tenant references but no credentials.

## 6. Release mapping

Map observations back to:

- PRD sections 12.22 through 12.29 for SaaS behavior;
- checklist MT-2 and MT-3 for resolution and database routing;
- MT-4 for provisioning/lifecycle;
- MT-7 and MT-8 for commerce and infrastructure isolation;
- MT-10 for owner/admin experience;
- MT-11 and MT-12 for migration/recovery;
- MT-13 and MT-14 for hardening and launch evidence.

Record whether each result is source, automated test, local Docker, public
staging, provider, or human-pilot evidence. Never label local evidence as
production proof.
