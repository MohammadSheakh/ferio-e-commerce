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

## 2026-08-26: Tenant Database Pool Concurrency

**Finding:** H-4

**Status:** Fixed for cold-client creation and bounded-capacity eviction.

**Changes:**

- Added per-tenant single-flight creation so concurrent cold requests share one
  Prisma client/pool.
- Added serialized slot reservation so different concurrent cold tenants cannot
  oversubscribe the configured client budget.
- Added pending-client metrics.
- Capacity pressure now fails closed instead of disconnecting a client used
  within the eviction grace window; the safe default is the full idle TTL.
- Half-created PostgreSQL pools are closed when connection setup fails.
- Shutdown rejects new acquisitions, drains in-flight creations, and then closes
  every resulting client and pool.
- Added concurrent cold-acquisition regression coverage.

**Verification:**

- Tenant database manager tests: 6/6 passed.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(tenancy): serialize tenant database pool creation`

**Residual risk:** total connection budgets still multiply by backend replica
count and must be enforced in deployment capacity planning. Queries exceeding
the configured idle/grace window need database statement timeouts and tracing.

## 2026-08-26: Bounded Tenant Fleet Fan-Out

**Finding:** H-5 (execution and connection-pressure slice)

**Status:** Partially fixed.

**Changes:**

- READY tenant registry enumeration now uses stable cursor pagination instead
  of loading the full fleet into process memory.
- Fleet work uses configurable bounded concurrency (`TENANT_FANOUT_CONCURRENCY`,
  default 4, hard cap 16) instead of serializing every tenant behind one slow
  database.
- Added transient tenant-client leases. Cold pools opened only for fleet work
  are released after the final overlapping operation, preventing large fleets
  from filling the request-serving client cache.
- A pool already used by an external request is retained, and transient leases
  are protected from capacity and idle eviction.
- Added pagination, concurrency, cold-release, shared-request, and overlapping
  lease regression coverage.

**Verification:**

- Tenant database manager and fan-out tests: 14/14 passed across 2 suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(tenancy): bound tenant fleet fanout`

**Residual risk:** fleet sweeps still execute all tenants within one parent job.
Durable per-tenant/partition jobs, a distributed non-overlap lease, due-work
indexes, and per-tenant lag metrics remain required before thousand-tenant
operation.

## 2026-08-26: Tenant-Scoped Realtime Presence

**Finding:** C-4 (presence and relay-room slice)

**Status:** Partially fixed.

**Changes:**

- Redis online-user, user-socket, socket-user, and status keys now include the
  signed socket-ticket organization.
- Presence now stores a set of sockets per user instead of replacing an older
  tab/device connection.
- Disconnect cleanup is atomic in Redis and reports offline only when the last
  socket leaves, preventing one tab from marking all other tabs offline.
- Removed the incorrect cleanup rule that treated every connection older than
  five minutes as stale even while it remained healthy.
- Conversation authorization and related-user lookup re-enter the trusted
  organization context after socket authentication rather than relying on
  request-local context that no longer exists.
- Related-user requests use the authenticated socket identity instead of a
  caller-supplied user ID.
- Chat relay targets and conversation leave operations no longer emit to raw
  global rooms when an organization binding is present.

**Verification:**

- Socket authentication/presence and Redis collision tests: 19/19 passed
  across 2 suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(realtime): isolate tenant presence state`

**Residual risk:** room-membership/activity Redis keys still need complete
organization scoping. Process-crash stale presence needs heartbeat/TTL cleanup,
live visitor statistics remain process-local, and gateway chat persistence
still uses the legacy Prisma client.

## 2026-08-26: Tenant-Scoped Realtime Room State

**Finding:** C-4 (Redis room-state slice)

**Status:** Fixed.

**Changes:**

- Conversation, task, family/group, and activity-feed Redis keys now include
  the resolved organization in strict tenancy mode.
- Every room-state method fails closed when strict mode has neither an explicit
  organization nor an ambient trusted tenant context.
- Gateway conversation/task joins, leaves, and membership reads pass the
  organization authenticated from the socket ticket.
- Family auto-join re-enters `TenantFanoutService.forOrganization` before its
  user lookup, removing the legacy Prisma fallback from strict socket startup.
- Family Socket.IO rooms use the same organization-prefixed naming contract as
  conversation and task rooms.
- Added collision coverage for identical conversation, task, group, activity,
  user, and family identifiers across two organizations.

**Verification:**

- Socket room/authentication and Redis collision tests: 23/23 passed across 3
  suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(realtime): scope tenant room state`

**Residual risk:** gateway visitor statistics and stale-presence recovery still
need Redis-backed replica-safe state. Chat message lookup/persistence remains on
the legacy Prisma client, and event-level authorization needs a final sweep.

## 2026-08-26: Tenant-Bound Socket Chat Persistence

**Finding:** C-4 (chat database slice)

**Status:** Fixed for database selection and sender attribution.

**Changes:**

- `SocketAuthService.databaseForSocket` resolves the Prisma client only through
  the organization signed into the verified socket ticket.
- Removed the legacy `PrismaService` dependency and every direct Prisma call
  from `SocketGateway`.
- User/customer target lookup, cross-lookup, conversation mutation, dedupe, and
  message creation now all execute on the resolved tenant client.
- Authenticated message persistence requires the exact authenticated user ID.
- Removed fallback logic that could attribute a message to the first available
  user in the database.
- Guests use only the tenant-local system guest identity; they cannot fall back
  to an unrelated tenant user.

**Verification:**

- Socket room/authentication and Redis collision tests: 24/24 passed across 3
  suites.
- Static sweep found no `this.prisma` calls in `SocketGateway`.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(realtime): persist chat in tenant database`

**Residual risk:** the gateway emits before persistence, so a database failure
can produce a message visible in realtime but absent after reload. Durable chat
delivery needs persistence-first acknowledgement or an outbox, and the fixed
guest system identity should be provisioned explicitly to avoid email conflicts.

## 2026-08-26: Tenant-Isolated Live Visitor Statistics

**Finding:** C-4 (visitor-data authorization slice)

**Status:** Fixed for authorization and cross-tenant exposure.

**Changes:**

- Active page-view records now carry the organization authenticated from the
  socket ticket.
- Live-stat payloads filter records by organization before counting or exposing
  visitor details.
- `request-live-page-stats` now requires a database-verified administrator role;
  guest/customer sockets receive no visitor payload.
- Tenant-bound visitor broadcasts target only that organization's admin rooms
  and no longer include the raw global admin room.
- Dashboard navigation removes a previously recorded storefront page view so
  counts do not remain stale within the process.
- Added tests proving tenant filtering, non-admin denial, and scoped-only admin
  broadcast behavior.

**Verification:**

- Gateway, socket room/authentication, and Redis collision tests: 31/31 passed
  across 4 suites.
- Backend production build passed.
- `git diff --check` passed before commit.

**Commit:** `fix(realtime): authorize tenant visitor stats`

**Residual risk:** active page views remain process-local, so each backend
replica reports only its own sockets. Move this state to organization-scoped
Redis records with heartbeat-based expiry before relying on it operationally.

## 2026-08-26: Trusted Proxy Tenant Resolution

**Finding:** H-1

**Status:** Fixed at the application boundary and documented for deployment.

**Changes:**

- Tenant resolution accepts `x-forwarded-host` only when the direct TCP peer
  (`request.socket.remoteAddress`) belongs to `TENANT_TRUSTED_PROXY_CIDRS`.
- Production has no implicit trusted proxies; an omitted allowlist fails closed.
- Development/test defaults trust loopback only.
- Rejects comma-appended forwarded-host chains and multi-value headers instead
  of selecting an attacker-controlled first value.
- IPv4, IPv4-mapped IPv6, exact IPv4 addresses, and exact IPv6 ingress addresses
  are supported by the allowlist parser.
- Both global tenant middleware and the public tenancy-status endpoint use the
  same resolver-owned host-selection policy.
- Added a stable `TENANT_FORWARDED_HOST_UNTRUSTED` response code.
- Docker Compose configures its private container network as the development
  proxy boundary; `.env.example` documents the production override requirement.

**Verification:**

- Tenant resolver/controller tests: 29/29 passed across 2 suites, including
  untrusted-client spoofing, ambiguous chains, mapped addresses, and production
  fail-closed behavior.
- Backend production build passed.
- Compose file passed YAML parsing.
- `git diff --check` passed before commit.

**Commit:** `fix(tenancy): enforce trusted proxy host forwarding`

**Residual risk:** production ingress must strip and overwrite forwarding
headers and configure a narrower CIDR than the broad Docker development range.
The deployment smoke-test gate should send a spoofed direct request and assert
`TENANT_FORWARDED_HOST_UNTRUSTED` before enabling strict tenancy.

## 2026-08-26: Measured Storefront Analytics

**Finding:** H-8

**Status:** Fixed.

**Changes:**

- Added a tenant-schema migration for the measured `CHECKOUT_BEGIN` event and
  structured nullable `searchResultCount` evidence.
- Search ingestion stores result counts as bounded non-negative integers and
  event-version 2 records.
- The tenant migration enforces the same result-count range at the database
  layer, and non-search events cannot carry search-result evidence.
- Zero-result reporting now queries only `searchResultCount = 0`; when there is
  no measured evidence it returns an empty list instead of relabeling popular
  searches as failures.
- Funnel checkout starts now count persisted `CHECKOUT_BEGIN` events instead of
  multiplying add-to-cart events by an invented 65 percent factor.
- Product search pages emit their actual server-returned result count.
- Checkout emits a session-deduplicated begin event and mirrors it to GA4.
- Updated Prisma source/canonical schemas, migration, DTO validation, Swagger
  contract metadata, and the committed OpenAPI event contract.

**Verification:**

- Analytics service/sanitization tests: 7/7 passed across 2 suites.
- Regression coverage proves structured evidence persistence, honest empty
  zero-result output, and measured checkout-funnel counts.
- Prisma schema synchronization and validation passed.
- Backend and customer-web production builds passed.
- `git diff --check` passed before commit.

**Commit:** `fix(analytics): replace invented metrics with measured events`

**Residual risk:** events produced before this migration have no result-count
evidence and are intentionally excluded from zero-result reporting. H-7 still
tracks the unbounded order read and Node-side dashboard aggregation; this fix
corrects truthfulness, not analytics workload scalability.
