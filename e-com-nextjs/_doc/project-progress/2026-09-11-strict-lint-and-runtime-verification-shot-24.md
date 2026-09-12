# Strict Lint and Runtime Verification - Shot 24

Date: 2026-09-11

## Scope

This shot closes the source-lint regression left open by Shot 23 and records
the supported-runtime limitation separately. The audited test covers tenant
scoping for delivery-personnel location writes and online-status updates.

## Correction

The Jest assertion in
`ferio-nest-prisma/src/features/delivery-personnel/tests/
delivery-personnel.tenant-isolation.spec.ts` used a matcher typed as `any`
inside a Prisma update payload. The assertion now narrows the recorded mock
call to the expected update shape and checks the timestamp with
`toBeInstanceOf(Date)`. This preserves the tenant-isolation behavior check
without suppressing or weakening strict ESLint rules.

## Verification

- Focused tenant-isolation Jest suite: 1 suite, 3 tests passed.
- Focused ESLint: passed.
- Full `pnpm run lint:strict:src`: passed.
- `pnpm run typecheck:application`: passed.
- `pnpm run architecture:check`: passed.
- `pnpm run check:tenant-context-boundaries`: passed.
- Shot 23 OpenAPI export check remains passed with project Redis on host port
  `6380`.

## Runtime limitation

The repository declares Node 20 for the web packages, but this workstation
currently provides Node `v24.19.0` and has no Node 20 installation available.
No automatic runtime installation or environment mutation was performed.
The Node 20 compatibility check remains an environment/CI follow-up, not a
source-code pass claim.

## Release interpretation

This closes the repository-level strict-lint regression and strengthens the
OpenAPI one-shot verification evidence. It does not close live Cloudflare
wildcard ingress, positive two-tenant browser SSR/BFF isolation, provider
delivery, queue fairness/failover, managed recovery, pilot, or formal release
acceptance gates.
