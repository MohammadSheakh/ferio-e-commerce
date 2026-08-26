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

## 2026-08-26: Device Push-Setting Ownership

**Finding:** H-3

**Status:** Fixed.

**Changes:**

- The controller now passes the authenticated user ID to the update operation.
- The service verifies active device ownership before changing push settings.
- Missing, deleted, and another user's devices all return the same not-found
  boundary without performing an update.
- Added service-level ownership regression tests.

**Verification:**

- Device ownership tests: 2/2 passed.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(authz): enforce device setting ownership`

**Residual risk:** user-device storage remains on legacy Prisma until the
tenant-bound identity remediation for C-3 is complete.

## 2026-08-26: Tenant-Aware Transactional Dispatch

**Finding:** C-7

**Status:** Fixed.

**Changes:**

- The dispatcher resolves one tenant database client and uses it for message
  claiming, policy reads, attempt writes, and terminal message updates.
- Strict mode fails closed when dispatcher tenant context is absent.
- Strict-mode worker jobs fail when organization identity is absent instead of
  falling back to legacy Prisma.
- Manual retry jobs now carry organization identity and organization-prefixed
  job IDs.
- Added strict-mode tenant-context regression coverage.

**Verification:**

- Transactional-messaging tests: 12/12 passed across 3 suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(messaging): dispatch through resolved tenant database`

**Residual risk:** order-to-message creation is still post-commit rather than
an atomic transactional outbox. Provider credentials also remain global until
H-6 is remediated.

## 2026-08-26: Tenant-Admin Membership Guard Coverage

**Finding:** H-2

**Status:** Fixed for the current controller surface.

**Changes:**

- Audited every feature controller containing an admin role declaration.
- Added active tenant-membership enforcement to admin conversation listing,
  all private settings operations, and all delivery-personnel admin methods.
- Kept public settings, customer chat, rider, and application endpoints outside
  the staff-membership guard.
- Imported `TenancyModule` into legacy mixed-route modules.
- Added method-level regression coverage for all 14 previously unguarded admin
  operations.

**Verification:**

- Tenant-admin guard coverage tests: 14/14 passed.
- Static controller sweep reports no admin-role controller file without
  `TenantMembershipGuard`.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(tenancy): enforce membership on legacy admin routes`

**Residual risk:** tokens still need organization binding under C-3. New admin
controllers must continue using the established membership guard pattern.

## 2026-08-26: Tenant-Bound Core Authentication

**Finding:** C-3 (core authentication slice)

**Status:** Core auth fixed; auxiliary identity services remain in progress.

**Changes:**

- Login, admin login, registration, verification, refresh, password reset, and
  OAuth now use the resolved tenant DB in strict mode.
- Strict mode fails closed instead of falling back to legacy Prisma when tenant
  identity context is unavailable.
- Access, refresh, and admin 2FA challenge tokens carry `organizationId`.
- Refresh rejects token/resolved-tenant mismatch.
- Tenant middleware exposes the resolved organization to authentication guards.
- `AuthGuard` rejects cross-tenant tokens on private routes and does not attach
  them opportunistically on public routes.
- Legacy mode intentionally preserves legacy token/database behavior.

**Verification:**

- Auth lifecycle and tenant-token binding tests: 8/8 passed across 2 suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(auth): bind core identity to resolved tenant`

**Residual risk:** 2FA management and user/profile/device/OAuth-account services
still need direct-Prisma removal before C-3 is fully closed. Existing strict-mode
sessions must sign in again because legacy tokens have no organization claim.

## 2026-08-26: Tenant-Bound Auxiliary Identity Services

**Finding:** C-3 (remaining identity services)

**Status:** Fixed.

**Changes:**

- Migrated 2FA status, enrollment, recovery-code consumption, and disablement to
  the resolved tenant database.
- Migrated user lookup/profile mutation/statistics to the tenant database.
- Migrated user profile, device registration, device cleanup, and linked OAuth
  account operations to the tenant database.
- Removed inherited legacy `GenericService` delegates from profile, device, and
  OAuth-account services so strict-mode callers cannot bypass tenant resolution.
- Every migrated service fails closed in strict mode and explicitly falls back
  only when tenancy is disabled.
- Added `TenancyModule` to the user-management dependency boundary.

**Verification:**

- Authentication and user-management tests: 22/22 passed across 8 suites.
- Direct-Prisma sweep reports no `this.prisma.*` calls in authentication or
  user-management services.
- No user-management service retains a legacy `GenericService` delegate.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(identity): route auxiliary user data through tenant DB`

**Residual risk:** customer/rider legacy records require an explicit migration
or reprovisioning plan before strict tenancy is enabled on existing data.

## 2026-08-26: Realtime Container Port And URL Wiring

**Finding:** C-4 (deployment slice)

**Status:** Fixed in Docker/Compose configuration.

**Changes:**

- Backend image now exposes REST port 6733 and Socket.IO port 6734.
- Compose publishes port 6734 and configures `SOCKET_PORT` explicitly.
- Browser-facing API/socket URLs are configurable public URLs rather than the
  Docker-only `backend` hostname.
- Customer and admin server-side BFF calls retain the internal backend URL.
- Fixed the admin container's previously missing internal `FERIO_API_URL`.

**Verification:**

- Compose file passed YAML parsing.
- `git diff --check` passed before commit.
- Docker Compose runtime validation could not run because the host's Snap
  confinement service rejects the Docker CLI before execution.

**Commit:** `fix(realtime): publish socket gateway in container stack`

**Residual risk:** ingress must route the public socket URL to port 6734, and a
live Docker smoke test is still required. Tenant-safe socket authentication,
rooms, Redis keys, and persistence remain open under C-4.

## 2026-08-26: Organization-Bound Socket Authentication

**Finding:** C-4 (authentication slice)

**Status:** Fixed.

**Changes:**

- Socket authentication verifies signed ticket organization before DB access.
- Strict mode accepts only organization-bound `chat_socket` tickets.
- Authenticated user/rider lookup executes inside the trusted control-plane
  organization context.
- Guest ticket issuance includes the HTTP-resolved organization.
- Strict-mode connections without a ticket are rejected.
- Invalid tickets, tenant-resolution failures, and DB errors now reject the
  socket instead of silently downgrading to guest.
- Ticket issuance fails closed when strict mode lacks organization context.

**Verification:**

- Socket-auth tests: 7/7 passed.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(realtime): bind socket authentication to tenant`

**Residual risk:** gateway chat persistence, presence/room Redis keys, and live
page statistics still require organization-scoped execution/state.
