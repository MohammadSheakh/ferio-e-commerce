# Ferio Commerce SaaS: Codex Brutal-Honest Architecture Audit

**Audit date:** 2026-08-26

**Scope:** NestJS backend, tenant control plane, Prisma schemas/migrations, queues, Socket.IO, Docker deployment, tenant admin, customer web, platform admin, and Expo mobile app.

**Documents reconciled:** `Ferio-Commerce-SaaS-PRD-v2.1.md`, `implementation-checklist-and-schedule-multitenant.md`, `brutal-honest-openion.md`, and `fixed-brutal-honest-log.md`.

## Executive Verdict

**Production decision: NO-GO for multi-tenant SaaS.**

The repository contains serious, thoughtful work: database-per-tenant isolation, host resolution, encrypted tenant credentials, bounded client pools, serializable inventory transactions, idempotency, queue fanout, reconciliation, retention, platform RBAC, and broad unit coverage. This is not a toy backend.

However, the system is currently caught between two architectures:

1. New commerce modules use the request-scoped tenant database.
2. Authentication, user identity, realtime messaging, audit, and other older modules still use the legacy global Prisma client.
3. The web and mobile clients do not consistently transmit the host identity required to select a tenant.

That is worse than simply being unfinished. With `TENANCY_ENABLED=true`, some requests select the tenant database, some silently use the legacy database, and many never resolve a tenant at all. The result is split-brain identity, missing or misplaced data, cross-tenant authorization risk, and frontends that fail feature-by-feature.

**Brutal summary:** the code compiles, the test suite is green, and legacy single-tenant mode can support a controlled pilot. Strict multi-tenant mode is not a safe launch candidate. Adding replicas or larger databases will not fix it because the first failures are routing and correctness failures, not raw capacity failures.

## Confidence And Method

This was a repository-wide static audit with deeper tracing through high-risk paths: tenant resolution, authentication, authorization, DB client selection, checkout/order/inventory, payment and courier callbacks, queue execution, realtime state, reporting, retention, storage, and all four client applications. I also ran the available automated checks.

I did not have production telemetry, realistic tenant data, provider sandboxes, a Kubernetes/ingress deployment, or a load-test environment. Exact traffic thresholds below are therefore directional. Confirmed code-path defects are marked separately from capacity estimates.

## Release Blockers

### C-1. Tenant admin does not preserve the tenant host

**Evidence**

- `ferio-admin-dashboard/ferio-admin/lib/admin-api.ts:20-81` calls the central backend URL and forwards auth/correlation headers only.
- `ferio-admin-dashboard/ferio-admin/lib/bff-response.ts:6-16` does not forward `Host` or `x-forwarded-host`.
- `ferio-admin-dashboard/ferio-admin/middleware.ts:24-35` refreshes against the central API without tenant identity.

**Failure:** the backend resolves the API hostname rather than the tenant storefront/admin hostname. Under strict tenancy, login, refresh, dashboard reads, and mutations fail tenant resolution. The tenant admin is effectively unusable unless an external proxy injects a valid tenant host, and that contract is neither implemented by this app nor enforced in deployment.

**Required fix:** create one server-side backend client that derives the validated incoming tenant hostname and forwards it on every admin request, including login and refresh. Do not let individual routes opt out. Add an end-to-end test using two hosts.

### C-2. Mobile has no tenant selection or tenant transport contract

**Evidence**

- `ferio-mobile-expo54/lib/api.ts:1` uses one static `EXPO_PUBLIC_FERIO_API_URL`.
- `ferio-mobile-expo54/lib/socket.ts` uses the same global endpoint.
- The app has no organization/domain/store selection or tenant-bound session model.

**Failure:** a native request arrives with the central API host. It cannot participate in host-based tenant resolution and cannot bind authentication, cart, or sockets to a store. In strict mode the app is a legacy single-store client, not a SaaS client.

**Required fix:** define a native tenant bootstrap contract, for example a signed store identifier resolved by the control plane, then issue tenant-bound sessions. Namespace local auth/cart state by tenant. Do not trust an arbitrary raw database or organization header.

### C-3. Authentication and user identity still use the legacy database

**Evidence**

- `ferio-nest-prisma/src/features/authentication/auth/auth.service.ts:63-730` uses `PrismaService` directly for login, admin login, registration, refresh, reset, OAuth, and token generation.
- `authentication/two-factor/two-factor.service.ts`, `user-management/user/user.service.ts`, `oauthAccount/oauthAccount.service.ts`, `userDevices/userDevices.service.ts`, and `userProfile/userProfile.service.ts` also directly use legacy Prisma.
- Normal access-token generation does not bind the token to `organizationId`.

**Failure:** a customer can be registered in the legacy DB while their cart/order lives in a tenant DB. A user present in a tenant DB may be impossible to authenticate. Refresh and 2FA can look in a different database than commerce. This violates the PRD decision that customer identity is tenant-local.

**Required fix:** make the identity boundary explicit and complete. Either migrate all customer/staff identity to the resolved tenant client, or adopt a deliberately global identity service with explicit tenant memberships everywhere. The current half-global, half-local state must not ship. Bind tokens to tenant and reject host/token mismatches.

### C-4. Realtime is not tenant-safe and is not exposed by the container

**Evidence**

- `socket.gateway.ts:38` listens on port `6734`; `Dockerfile:50` exposes only `6733`; `docker-compose.yml:133-134` publishes only `6733`.
- `socket-auth.service.ts` tries request-local tenant context inside WebSocket callbacks, then falls back to legacy Prisma.
- `socket.gateway.ts` directly uses legacy `PrismaService` for chat persistence.
- Redis keys such as `chat:online_users` and user/socket maps are global rather than organization-prefixed.
- `activePageViews` is process-local; the Redis Socket.IO adapter does not make that map shared across replicas.
- Guest socket tickets omit organization identity.
- Socket authentication errors can downgrade to a guest session.

**Failure:** in the supplied container deployment, sockets are unreachable. If port routing is repaired, authentication and message persistence can still use the wrong DB. Presence keys can collide between tenants, live-page statistics are partial per replica, and global admin broadcasts can expose another tenant's visitor data. A DB/auth failure becoming guest access is unsafe fail-open behavior.

**Additional correctness defects:** presence cleanup treats old connections as stale based on connection age rather than a maintained heartbeat; the design assumes one socket per user, so multi-tab and multi-device disconnects produce incorrect online state; guest clients can request sensitive live visitor statistics without an adequate role boundary.

**Required fix:** carry a signed tenant ID in every socket ticket, resolve the tenant explicitly before DB access, remove all legacy fallbacks, prefix every room/Redis key with organization ID, require admin authorization for visitor data, use Redis for shared live state, model multiple sockets per user, and publish/route the socket port. Prefer serving Socket.IO through the same public ingress and origin policy.

### C-5. Customer BFF tenant forwarding is inconsistent

**Evidence**

- Some shared server helpers correctly preserve tenant host.
- `ferio-customer-web/lib/bff-response.ts:11-21` forwards correlation only.
- Many route handlers using that helper include product requests, service booking, tracking, store locations, rider routes, account registration/resend, chat, and wallet top-up.
- `ferio-customer-web/app/api/storefront-analytics/events/route.ts:3-11` defaults to `http://localhost:3000`, omits `/api/v1`, and sends no tenant host.

**Failure:** storefront pages can appear healthy while individual forms and mutations fail tenant resolution. Analytics likely calls the wrong server/path and fails silently. This creates a deceptive, intermittent product experience.

**Required fix:** one mandatory BFF transport wrapper for all routes, with validated tenant-host forwarding, API prefix handling, correlation, timeouts, and consistent error decoding. Add a static rule preventing raw backend `fetch` calls outside that wrapper.

### C-6. Product-request admin operations have no admin authorization

**Evidence:** `product-request.controller.ts:21-78` applies only `AuthGuard`. `GET`, status `PATCH`, and `DELETE` are labelled admin operations but have no role, permission, or tenant-membership guard.

**Failure:** any authenticated customer can list all product requests, including names/phone/email, change statuses, and delete requests in the selected database.

**Required fix:** split public and admin controllers. Apply `AuthGuard`, `RolesGuard`, `PermissionsGuard`, and `TenantMembershipGuard` to the admin controller and add negative authorization tests.

### C-7. Transactional message workers enqueue in tenant DB but dispatch in legacy DB

**Evidence**

- `transactional-messaging.service.ts` is tenant-aware and queue jobs can carry `organizationId`.
- `transactional-message.processor.ts:32-36` enters the tenant context.
- `transactional-message-dispatcher.ts:11-166` ignores that context and performs every operation through injected `PrismaService`.

**Failure:** tenant messages are created in one database, then workers claim/search/update the legacy database. Notifications remain queued, or an ID collision mutates an unrelated legacy record. Order confirmations and operational messaging cannot be trusted.

**Required fix:** inject `TenantDbService` into the dispatcher and fail closed when an organization-stamped job has no tenant client. Make `organizationId` mandatory in strict mode and include it in job IDs.

### C-8. Backup/restore objectives are documentation, not an operational capability

**Evidence:** the repository has `scripts/backup-tenant.sh`, `scripts/restore-tenant.sh`, runbooks, and health checks driven by environment timestamps. It does not contain a scheduled fleet backup system, immutable evidence store, retention enforcement, restore orchestration, or a proven tenant restore drill. The implementation checklist still leaves this incomplete.

**Failure:** the PRD's RPO <= 1 hour and RTO <= 4 hours are unproven. A tenant database loss is likely a manual incident with unknown recovery time. Database-per-tenant increases the number of databases that operations must reliably protect.

**Required fix:** implement and operate automated backups, off-cluster retention, per-tenant restore tooling, regular restore drills, and evidence emitted by the backup platform rather than manually supplied environment values. No paid launch before one full drill meets RPO/RTO.

## High-Severity Findings

### H-1. Tenant selection trusts `x-forwarded-host` without enforcing a trusted proxy

`tenant-resolver.service.ts:43-51` gives `x-forwarded-host` precedence. If ingress does not strip and overwrite client-supplied values, a direct client can choose a tenant host. Admin membership guards reduce impact where present, but customer tokens are not tenant-bound and several controllers omit membership guards.

**Fix:** enforce trusted proxies at ingress and application level, reject multiple/invalid forwarded hosts, and bind JWT/session tenant to resolved tenant. Treat proxy configuration as a tested release gate.

### H-2. Guard coverage is inconsistent

The newer admin modules usually apply `TenantMembershipGuard`; older controllers do not. Confirmed examples include delivery-personnel admin routes and the general settings controller. Because role claims are not tenant-bound, an admin token from tenant A can target tenant B's host wherever membership validation is absent.

**Fix:** make tenant membership a global policy for all non-platform staff endpoints, with explicit opt-out metadata only for truly public/global endpoints. A manually maintained per-controller pattern will regress again.

### H-3. Device push-setting IDOR

`userDevices.controller.ts:98-103` receives the authenticated user but calls `updatePushEnabled(deviceId, enabled)`. `userDevices.service.ts:157-161` updates by device ID only.

**Failure:** any authenticated user who obtains another device ID can change its push setting. The service is also on the legacy DB, compounding tenancy confusion.

### H-4. Tenant database manager has concurrency and connection-budget risks

`tenant-database.manager.ts:48-99` has no single-flight lock for a cold tenant. Concurrent first requests can each create a pool/client, overwrite the same cache entry, and leak the losing pool. Capacity eviction is also not synchronized. Entries have last-use timestamps but no active lease/refcount, so tenant churn can disconnect an LRU client while a request is still using it.

Default tenant connection ceiling per backend replica is approximately:

`TENANT_DB_MAX_CLIENTS (25) * TENANT_DB_POOL_MAX (3) = 75 connections`

That excludes platform, legacy, queue, migration, and administrative connections. Replica count multiplies it. Four replicas can approach 300 tenant connections before the other pools are counted.

**Fix:** add per-database single-flight creation, synchronized capacity decisions, active leases or safe delayed eviction, validated configuration, and a deployment-level connection budget. Consider PgBouncer in transaction mode only after validating Prisma behavior.

### H-5. Fleet jobs are O(number of tenants), repeated, and sequential

`tenant-fanout.service.ts:47-85` loads every READY tenant without pagination and processes them sequentially. Payment recovery, courier polling/callbacks, reconciliation, usage reconciliation, retention, and messaging can each perform their own fleet sweep.

At 10 tenants this is reasonable. At hundreds, schedule duration and connection churn become operationally important. At thousands, a single periodic job can run longer than its interval, overlap, evict hot storefront pools, and delay later tenants. One slow tenant does not crash the sweep, which is good, but it still consumes its place in a serial queue.

**Fix:** partition tenants into durable jobs, page registry reads, apply bounded concurrency, prevent overlapping scheduler runs with distributed leases, prioritize due work rather than polling every tenant, and expose lag per tenant/job type.

### H-6. Payment and courier credentials are global, not per tenant

Commerce payment and courier adapters read process environment variables for SSLCommerz, aamarPay, Pathao, RedX, Steadfast, Carrybee, eCourier, and Paperfly. Coupon configuration is also globally environment-backed.

**Failure:** all tenants share merchant/courier accounts and provider settings. Independent merchants cannot use their own settlement accounts. Callback ownership, reconciliation, and financial liability become ambiguous. Changing one tenant's provider configuration requires changing the whole deployment.

`CommercePaymentController` also redirects to one global `CUSTOMER_WEB_URL`, so a successful payment can return the buyer to the default storefront rather than the originating tenant domain.

**Fix:** implement an encrypted per-tenant credential vault and tenant-specific return URLs validated against active domains. Keep platform subscription billing credentials separate, as they are now.

### H-7. Reports and analytics will compete with checkout workloads

`reports.service.ts:65-184` fetches orders in 5,000-row pages, but stores four arrays containing per-order totals. It therefore remains O(all matching orders) in memory despite the bounded-aggregation comment. It also loads multiple relations and scans the full period on each request.

`storefront-analytics.service.ts:251-280` performs an unbounded `order.findMany` for the selected period and aggregates in Node. Each tenant DB is both OLTP database and analytics engine; expensive dashboards can interfere with checkout for that same tenant.

**Fix:** use SQL aggregates for bounded views, async exports, daily fact tables/read models, statement timeouts, and report workload controls. Stream exports rather than building complete CSV strings in memory.

### H-8. Analytics presents invented or misleading business data

- `storefront-analytics.service.ts:302` calculates checkout starts as `addToCartCount * 0.65`; this is not measured behavior.
- `getZeroResultSearches():153-155` labels top searches as zero-result searches when no zero-result data exists.
- Zero-result detection is encoded as a substring in `path` rather than a structured event field.

**Failure:** merchants can make purchasing or merchandising decisions based on fabricated metrics. This is a product-integrity failure, not merely a technical shortcut.

**Fix:** remove unmeasured metrics or clearly label estimates. Record structured `CHECKOUT_BEGIN` and search-result-count events. Never substitute a different metric under the requested label.

### H-9. Retention deletes are unbatched and incomplete

`retention-sweep.service.ts` runs one `deleteMany` per configured table. On a mature tenant DB, large deletes can cause lock pressure, WAL spikes, table bloat, and checkout latency. Only commerce messages, analytics, GPS history, and optionally audit logs are covered. Callback logs, webhook logs, attempts, notifications, inventory history, carts, and other append-only data have no complete archive/retention strategy.

**Fix:** batch by primary key/time range, schedule during low traffic, monitor rows/WAL/duration, vacuum appropriately, and create an explicit legal/operational retention matrix for every growth table.

## Module-By-Module Backend Audit

| Module | What is solid | Where it fails or scales badly | Verdict |
|---|---|---|---|
| Platform/control plane | Separate schema/client, domain registry, lifecycle states, audit, permissions | Provisioning defaults to a local PostgreSQL implementation; backups are not integrated; several list operations use fixed limits; real provider-grade provisioning is absent | Good foundation, not production operations |
| Tenant resolution | Fail-closed statuses, positive/negative cache, encrypted credential material | Forwarded-host trust depends on ingress; clients do not consistently supply tenant host; host-only model excludes native clients | Correct core with an incomplete edge contract |
| Tenant DB manager | Bounded LRU, low per-tenant pool, shutdown cleanup, acquire breaker | Cold-start race, unsafe active eviction, per-replica connection multiplication, breaker only observes connection creation rather than failures on warm clients | Will become unstable under tenant churn |
| Authentication | Rate limiting, token revocation work, OAuth verification, 2FA flow | Legacy DB, no tenant claim, split identity, no strict-tenant integration coverage | Release blocker |
| User/profile/devices | User-scoped reads in several methods | Legacy DB throughout; push-settings IDOR; identity ownership does not match PRD | Release blocker/high risk |
| Staff access | Permission registry and many protected admin controllers | Tenant membership is not globally enforced; quota checks can race if implemented as count-then-create | Needs centralized policy and atomic limits |
| Catalog/product content | Rich model, indexes, inventory movements, tenant-aware services | Very large service (`catalog.service.ts` about 1,457 lines), offset pagination on deep lists, plan-limit race, search/index behavior depends on raw migrations | Functional but hard to evolve safely |
| Cart | Tenant-aware cart tokens and validations | Public bot-created carts can grow indefinitely; no robust global cart retention; mobile rebuilds carts item-by-item | Fine at pilot scale, growth/UX debt |
| Checkout/order | Serializable stock reservation, idempotency, duplicate recovery, audit trail | Long transaction with sequential item/reservation/movement writes; no automatic retry for serializable conflicts; post-commit message enqueue is not an atomic outbox | Sound core, flash-sale and side-effect risk |
| Inventory | Reservation and movement records are materially better than naive decrement logic | High-contention variants force transaction conflicts; retries are pushed to clients; large carts lengthen lock duration | Safe-ish, not high-contention optimized |
| Commerce payments | HMAC tenant callback context, attempt states, reconciliation concepts | Global tenant credentials, global return URL, callback/redirect deployment complexity | Cannot support independent SaaS merchants yet |
| Wallet/refunds | Ledger-like concepts and guarded admin endpoints | Provider/account model inherits global credentials; financial correctness needs real sandbox and concurrency tests | Promising, unproven operationally |
| Shipping/couriers | Multiple adapters, webhook verification paths, polling/retry queues | Global credentials, repeated tenant polling, provider rate limits multiplied by fleet sweeps, callback ownership complexity | Pilot-capable for one merchant account |
| Delivery personnel | Broad operational model, rate-limited public application | Admin routes omit tenant-membership guard; service is very large; realtime/location depends on broken socket/tenant paths | High authorization risk |
| Returns/RTO | Inventory inspection and restoration logic, status controls, tests | Financial/provider consequences depend on the payment and settlement gaps; operational load not tested | One of the stronger domain areas |
| Settlements/reconciliation | Persistent findings, retries, explicit exception concepts | Heavy DB scans and repeated fleet scheduling; correctness cannot compensate for shared merchant credentials | Strong design, scale and ownership gaps |
| Transactional messaging | Durable message/attempt models, dedupe, cautious unknown-outcome handling | Dispatcher uses legacy DB; provider configuration is global; no atomic order outbox | Release blocker |
| Chat/Socket.IO | Redis adapter and socket-ticket concept | Legacy DB fallback, global Redis keys, process-local stats, guest downgrade, weak event authorization, unexposed port | Rewrite the tenant boundary before launch |
| Reports | Rich operational/financial views, export cap | O(order count) memory and DB reads, synchronous CSV assembly, workload shares checkout DB | Fails with order history growth |
| Storefront analytics | Structured event table and some database grouping | Broken frontend route, invented funnel metric, false zero-result fallback, unbounded order reads | Do not expose as trustworthy analytics yet |
| Settings | Tenant-aware commerce settings and caching in newer path | General settings controller lacks membership guard; some JSON settings have weak schema; global coupon/provider config bypasses tenant settings | Consolidate settings ownership |
| Storage/attachments | Tenant-prefixed object namespace and presigned upload direction | `GET presign-get` uses a request body, ownership error can become 500, no clear byte quota/content policy/malware pipeline; legacy attachment service uses global DB/cache patterns | Abuse and tenant-consistency risk |
| Audit | Domain transactions can pass a transaction client | Default writes and reads use legacy Prisma, splitting the compliance trail | Not a reliable tenant audit record |
| Operations health | Surfaces queues/providers/backup evidence | Backup/restore health is based on supplied timestamps, not direct backup-system proof; service itself is on legacy Prisma | Useful dashboard, not assurance |
| Product requests | Tenant-aware service and pagination | Any authenticated user can perform admin operations; public endpoint has no dedicated abuse control | Critical auth flaw |
| Service booking | Tenant-aware and admin guard stack is stronger | Public booking has no explicit anti-spam rate limit; abuse creates unbounded operational records | Add abuse controls before marketing traffic |
| Store locations/warranty/customer account | Mostly coherent tenant-aware feature modules | Depend on inconsistent BFF host forwarding; identity mismatch can make ownership checks fail unexpectedly | Backend logic cannot rescue client routing |

## Order And Inventory Failure Point

The order path is substantially better than the old audit implied. It uses serializable transactions and handles Prisma conflict codes. Overselling is therefore not the most immediate concern.

The likely failure under a flash sale is availability, not silent stock corruption:

1. Many checkouts contend on the same inventory row.
2. Serializable transactions abort.
3. The service translates conflict to a failure but does not perform bounded jittered retries.
4. Large carts execute many operations inside the transaction, increasing contention time.
5. Users see failed order placement even while stock may remain.

At ordinary SME traffic this may be acceptable. For hot SKUs, use short transactions, deterministic lock order, bounded server retries, and load tests that assert both no oversell and acceptable success/latency rates.

The post-commit notification path is not a true transactional outbox. If the process dies after order commit and before enqueue, the order exists but its message may never be created. Queue retries cannot recover a message record that was never inserted.

## Frontend Audit

### Tenant Admin

The UI is broad and builds successfully, but strict tenancy breaks its shared API layer. This is the worst kind of frontend readiness gap: 99 generated routes/pages give the appearance of feature completeness while the common backend transport omits the one header the SaaS backend requires.

The admin middleware decodes JWT expiry but does not verify the signature. That is acceptable only as a UX redirect optimization because the backend still verifies requests; it must never be treated as authorization. Admin BFF write routes also lack a strong centralized Origin/CSRF policy. `SameSite=Lax` helps but is not a complete policy, particularly with many same-site tenant subdomains.

### Customer Web

The customer app builds and several server helpers correctly preserve host context. The implementation is inconsistent rather than absent. Consolidating transport is feasible, but every route must move to it. Direct browser calls to a central API will also run into strict CORS/origin and tenant-host limitations.

The analytics proxy is a confirmed wrong-URL/prefix defect and fails silently from the customer's perspective.

### Platform Admin

The platform console builds and covers organizations, plans, subscriptions, billing, migrations, DB health, and support access. Platform RBAC is materially better than the earlier audit suggested: `PlatformAuthGuard` derives permissions from platform roles rather than making every user an implicit superadmin.

It remains an operational console over incomplete operations. A green database-health page cannot replace real backup evidence, fleet observability, provider credential ownership, or restore orchestration. Fixed-size API lists will need pagination as tenant count grows.

### Expo Mobile

The app type-checks, but it has no SaaS tenant model. Its local cart and auth storage are global to the app installation. If tenant switching is added later without namespacing, one store's cart/session can appear in another store.

Checkout reconstructs server cart state through sequential item requests. A 20-item cart means roughly 20 writes before preview/order, increasing latency and partial-failure probability on mobile networks. Clearing/replacing the cart token before the sequence completes makes retries messy. Add a bulk cart synchronization endpoint after defining the tenant bootstrap contract.

## CORS, Domains, And Deployment

The backend CORS and socket-origin configuration is based on a small fixed list of environment origins. Custom tenant domains do not fit that model. A newly activated domain can render through Next.js BFF paths, but direct browser API or Socket.IO access fails until the backend configuration is changed/restarted.

Use the active-domain registry for dynamic, cached origin validation. Never allow arbitrary wildcard origins with credentials. The same registry must drive payment return URLs and socket ticket audience checks.

The supplied backend Docker deployment does not publish socket port 6734. Health checks only verify REST; the deployment can be "healthy" while realtime is completely unavailable. Add a realtime readiness probe and ingress route, or host Socket.IO on the REST server.

## Capacity Failure Forecast

These are directional triggers, not measured guarantees.

| Trigger | First likely failure |
|---|---|
| Turn on `TENANCY_ENABLED=true` now | Admin login/API, mobile, mixed customer BFF routes, auth identity, chat/messages |
| Two real tenants with different staff/users | Split identity and missing membership guards become visible; wrong DB records and cross-host authorization attempts |
| Tenants require independent payment/courier accounts | Global credential model becomes a commercial blocker |
| More than one backend replica | Socket live stats diverge; DB connection budget multiplies; local scheduler duplication requires distributed overlap controls |
| 25+ concurrently hot tenant DBs per replica | LRU churn begins under defaults; active-client eviction and cold-pool races become more likely |
| Hundreds of tenants | Sequential full-fleet sweeps accumulate lag and churn connections; fixed console lists hide tenants |
| Thousands of tenants | Poll-every-tenant scheduling and per-tenant schema migration/backup operations dominate the control plane |
| 100k+ orders in one tenant and broad report dates | Synchronous relation-heavy reports and analytics create slow queries/memory pressure |
| Flash sale on one SKU | Serializable conflicts produce customer-visible checkout failures before oversell |
| Mature event/log tables | Unbatched retention causes WAL/lock/bloat spikes; uncovered tables grow indefinitely |

## Testing Reality

Checks run during this audit:

- Backend unit suite: **82/82 suites passed, 345/345 tests passed**.
- Backend production build: **passed**.
- Tenant admin production build: **passed**.
- Customer web production build: **passed**.
- Platform admin production build: **passed**.
- Expo mobile TypeScript check: **passed**.

This is good engineering hygiene, but it should not be mistaken for multi-tenant proof. The green suite did not catch:

- Admin BFF missing tenant host.
- Mobile having no tenant contract.
- Auth/user modules using legacy DB in strict mode.
- Transactional dispatcher ignoring tenant context.
- Product-request authorization bypass.
- Device-setting IDOR.
- Socket port not being published.
- Cross-tenant socket/Redis/state behavior.

The missing test layer is a deployed, strict-mode matrix with at least two tenants, distinct users, distinct domains, separate DBs, Redis, queues, and multiple backend replicas. Tests must assert both positive behavior and that tenant A can never read/write tenant B through host, token, socket, queue job, callback, cache key, or export.

## Prioritized Recovery Plan

### P0: Before any multi-tenant demo or production traffic

1. Freeze `TENANCY_ENABLED=true` rollout.
2. Choose and finish the identity architecture; remove legacy Prisma from tenant identity paths.
3. Bind all sessions/tokens to organization and reject host mismatch.
4. Centralize host forwarding in tenant admin and customer BFF; design native tenant bootstrap.
5. Fix product-request authorization and device IDOR.
6. Make transactional dispatcher tenant-aware and organization mandatory in strict-mode jobs.
7. Repair Socket.IO tenant tickets, DB resolution, key/room namespaces, authorization, shared state, and deployment port routing.
8. Add two-tenant end-to-end isolation tests for REST, BFF, socket, queues, and callbacks.

### P1: Before paid tenants

1. Build per-tenant encrypted provider credentials and validated per-domain payment return URLs.
2. Automate backups and complete a measured per-tenant restore drill.
3. Add tenant DB pool single-flight, safe eviction, and a total connection budget.
4. Replace fleet polling loops with paged, partitioned, leased jobs and lag metrics.
5. Replace invented analytics metrics and move heavy aggregation to SQL/read models.
6. Batch retention and define retention/archive rules for every growth table.
7. Add dynamic domain-registry CORS/socket origin validation.

### P2: Before scale claims

1. Load-test hot-SKU checkout, large carts, reporting, socket fanout, callback bursts, and tenant churn.
2. Break the largest services into explicit domain/application components after behavior is protected by tests.
3. Introduce async report exports and daily facts.
4. Prove canary tenant migrations, rollback/forward-fix, backup-before-migrate, and schema-fleet observability.
5. Run chaos tests for Redis loss, one tenant DB outage, control-plane outage, provider timeout, worker restart, and process death after order commit.

## What Should Not Be Rewritten

Do not throw away the modular monolith or database-per-tenant decision. The strongest work is reusable:

- Tenant lifecycle and domain registry.
- Encrypted tenant DB credentials.
- Fail-closed tenant resolution states.
- Serializable inventory reservation and idempotent order placement.
- Payment/courier callback verification direction.
- Durable reconciliation findings.
- Platform permission model.
- Broad domain-level test suite.

The correct move is not microservices. Microservices would multiply the unresolved tenant-context problem. First make one tenant identity/context contract universal across HTTP, BFF, native, socket, queue, callback, cache, storage, and audit. Then measure where process separation is actually justified.

## Final Brutal-Honest Opinion

Ferio has the beginnings of a credible commerce platform and a credible SaaS control plane, but they are not yet one coherent multi-tenant system.

In legacy mode, it can be piloted cautiously as one merchant with controlled traffic, provider accounts, and manual operations. In strict SaaS mode, it will fail at the seams: the admin cannot identify its tenant, mobile has no tenant concept, authentication and realtime use the wrong database, queue dispatch can lose its tenant, some authorization boundaries are missing, and operational recovery is unproven.

The biggest risk is not PostgreSQL scale or NestJS performance. It is believing that database-per-tenant isolation is complete because the new commerce services use `TenantDbService`. Isolation is only as strong as the least tenant-aware path, and today several of the most sensitive paths are that weak link.

**Recommended status:** keep multi-tenant production launch blocked, preserve the architecture, and execute the P0 boundary-convergence work before adding features. Once P0 is complete and proven with two-tenant adversarial tests, the project moves from "impressive but unsafe" to a defensible SaaS beta.
