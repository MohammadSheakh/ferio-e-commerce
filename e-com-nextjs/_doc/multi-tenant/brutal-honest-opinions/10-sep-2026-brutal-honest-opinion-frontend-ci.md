# Brutal Honest Opinion: Frontend, Contracts, and CI

## Verdict

The backend gates are materially stronger than the frontend quality gates. The web applications can build and typecheck, but Release 1 still lacks enough browser-level proof for auth, tenancy, checkout, admin workflows, and failure states.

## P1 findings

### No browser E2E or UX regression layer

The customer web, admin dashboard, and platform admin currently have build/type/API-drift checks but no complete browser test matrix. This leaves the most important user-visible claims dependent on manual testing: tenant host selection, SSR hydration, auth transitions, checkout, admin permissions, loading/error states, and recovery after backend/provider failures.

### API access is repeated across applications

The audit found approximately 101 customer-web and 162 admin-dashboard `fetch` call sites, alongside separate generated schema/client artifacts in the web applications. This is a substantial consistency risk for credentials, cache policy, forwarded-host preservation, response parsing, retries, and error UX. A shared typed transport boundary should become a Release 1 follow-up, even if the existing generated schemas remain temporarily separate.

### Contract drift is detected, not eliminated

OpenAPI drift checks are valuable, but generated artifacts and hand-written fetch wrappers still create multiple places where a contract can diverge. CI should make regeneration deterministic and review generated changes as first-class artifacts.

## P2 findings

- Accessibility and responsive behavior are not demonstrated by repository-level checks.
- Loading, empty, unauthorized, tenant-suspended, rate-limited, and provider-failure states need a deliberate matrix rather than scattered ad hoc handling.
- Frontend tests must run against the same host/tenant model used by the staging tunnel, not only a single default origin.

## Frontend/CI release decision

Internal alpha is possible with a documented manual test script. Public production should wait for a minimum browser matrix covering two tenant hosts, auth, catalog/cart/checkout, admin permissions, SSR/BFF behavior, and the major failure states.
