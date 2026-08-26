# Ferio Commerce SaaS Audit Remediation Log

**Started:** 2026-08-26

**Source audit:** `codex-brutal-honest-openion.md`

**Branch:** `ox-alpha-saas`

This is an append-only implementation log. A finding is marked fixed only when
the implementation and focused verification are committed. Residual risks are
recorded explicitly rather than hidden behind a completed label.

## Delivery Rules

1. Each independently verifiable remediation receives a focused commit.
2. The commit includes its matching log entry whenever practical.
3. Every remediation commit is pushed to `origin/ox-alpha-saas` before the next
   remediation is considered delivered.
4. Passing unit/build checks do not replace strict-mode, two-tenant isolation
   evidence.

## Baseline

- Audit verdict: **NO-GO for strict multi-tenant production**.
- Backend baseline: 82 suites and 345 tests passing.
- Build baseline: backend, tenant admin, customer web, and platform admin pass.
- Mobile baseline: TypeScript check passes.
- Remediation status: started; no audit finding is closed by this baseline entry.

## 2026-08-26: Tenant Host Propagation

**Findings:** C-1 and C-5

**Status:** Fixed at the tenant-admin and customer-web application boundaries.

**Changes:**

- Added strict single-host normalization before relaying `x-forwarded-host`.
- Tenant admin now forwards tenant host for login, 2FA, refresh middleware,
  server-side refresh, authenticated API calls, and direct BFF routes.
- Customer BFF request helpers now forward tenant host consistently.
- Customer authentication and post-login cart merge preserve tenant host.
- Guest saved-cart calls preserve tenant host.
- Storefront analytics now uses the canonical `/api/v1` backend URL instead of
  the customer Next.js server and preserves tenant host.

**Verification:**

- Tenant-admin Next.js production build passed.
- Customer-web Next.js production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(tenancy): propagate tenant host across web BFFs`

**Residual risk:** trusted-proxy enforcement (H-1) and native mobile tenant
bootstrap (C-2) remain open. This fix intentionally does not accept arbitrary
organization IDs from clients.

## 2026-08-26: Product-Request Authorization

**Finding:** C-6

**Status:** Fixed.

**Changes:**

- Split public submission and administrative operations into separate
  controllers.
- Administrative reads require `product-requests.read`, an admin/staff role,
  authentication, and active tenant membership.
- Status changes and deletion require `product-requests.manage`.
- Added bounded requester fields and auth-grade sliding-window rate limiting to
  public submissions.
- Added authorization metadata regression tests.

**Verification:**

- Product-request authorization tests: 3/3 passed.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(authz): secure product-request administration`

**Residual risk:** general tenant-membership guard coverage is tracked under
H-2 and remains open until the centralized guard sweep is completed.
