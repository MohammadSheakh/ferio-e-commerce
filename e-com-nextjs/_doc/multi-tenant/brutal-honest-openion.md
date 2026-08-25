# Brutal Honest Opinion — Where This Project Will Fail

**Date:** August 26, 2026
**Author:** ox-alpha, after full-project audit
**Scope:** ferio-nest-prisma backend · ferio-customer-web · ferio-admin-dashboard/ferio-admin · ferio-platform-admin
**Method:** Every claim below was verified against source code with file references. No vibes, no filler praise.

---

## TL;DR Verdict

The **architecture is right and the isolation work is real** — database-per-tenant with fail-closed resolution, org-scoped Redis/socket/job namespaces, and negative tests that would catch a cross-tenant leak are things most "SaaS-ified" codebases never get to.

But this project is an **excellent architecture wrapped around several single-machine assumptions**. It will not fail because of design; it will fail at roughly predictable traffic levels because of connection math, in-memory aggregation, unbounded tables, and one missing backup story. Here is exactly where, in what order, and how hard.

---

## The Failure Timeline (what breaks, in order)

### 🔴 Day one of production: you cannot restore anything

MT-12 is owner-blocked, which is fine on paper — but read it plainly:

> There is **no backup implementation** today. No PITR, no tested restore, no evidence tracking. If the managed Postgres instance corrupts or a tenant runs `UPDATE orders SET status='DELIVERED'` by mistake through a bug, the answer is "we lose everything since the last provider snapshot we never configured."

This is the single biggest risk in the repo and it's not code — it's an unmade decision. Everything else in this document is recoverable engineering debt. This isn't.

### 🔴 Week one: platform admin login gets brute-forced

`platform.controller.ts:362` — `POST auth/login` is a public, password-based login on the **most privileged surface in the system**, and there is **no rate limiting anywhere on the platform realm**. The Throttler module exists only inside customer `auth.module.ts`. Customer OTP paths got hardened; the superadmin door did not. FR-AUTH-005 says logins must be rate limited. This one isn't. One internet scanner finds `/api/v1/platform/auth/login` and starts guessing.

Fix is ~20 lines. It should have existed before MT-1 shipped.

### 🟠 ~20 active tenants: connection exhaustion (the math)

`tenant-database.manager.ts:82` — every cached tenant client holds a pg Pool of **`max: 5` connections**. Default `TENANT_DB_MAX_CLIENTS=25`, so full LRU = **125 tenant connections**, plus control-plane pool, plus BullMQ workers (separate processes, own pools), plus migrations, plus your psql session. Postgres ships with `max_connections=100`.

Do the arithmetic: **~18–20 simultaneously-active tenants on default settings = connection refused errors across the fleet**, presented to users as random 500s that "go away" (LRU evicts someone). And PO-009 decided *shared managed cluster initially* — meaning these connections compete for the same Postgres instance's memory and locks.

Worse: `evictForCapacity()` does `void this.disconnect(oldestKey)` — fire-and-forget teardown while immediately building the next client. Under burst churn you transiently hold more sockets than configured and leak pools that are mid-disconnect.

### 🟠 First big catalog: search falls over (sequential scans)

`catalog.service.ts:1088-1090` — product search is Prisma `contains + mode:'insensitive'`, which compiles to `ILIKE '%term%'`. A leading wildcard **cannot use a B-tree index — ever**. Every storefront search is a full sequential scan over products+variants+joins. Fine at 5k products. At 50–100k products × concurrent shoppers on the shared cluster, search alone saturates CPU and drags checkout queries down with it (noisy neighbor, same instance).

PRD FR-SRCH-007 anticipated this ("dedicated search only after Postgres no longer meets goals") — but the cheap intermediate step (`pg_trgm` GIN index) was never taken. That's a one-migration fix buying you another year of headroom.

### 🟠 First big merchant: reports eat the process (in-memory OLAP)

`reports.service.ts:85-118` — overview/export do `db.order.findMany(...)` for the **entire period with no pagination**, then `summarize()` filters/reduces in JavaScript. A tenant with 300k orders/year pulling "last 12 months" loads every row into Node memory, serializes it, and reduces it — hundreds of MB RSS, multi-second event-loop blockage, on the API process serving live checkout.

This is the classic "works until a customer succeeds" bug. Your best tenant will be the one that kills you.

### 🟡 Month one: multi-instance deployment silently degrades

Several correctness mechanisms are **per-process memory**:

- `tenant-membership.guard.ts:39-43` — staff roster cache is a local Map, TTL 60s, and `invalidate()` clears **only this process**. Deactivate a fired employee on node A; node B keeps authorizing them for up to 60s. Single instance = fine. Two instances = a security-relevant staleness window nobody documented.
- Observability counters (`TenantMetrics`) are in-process. With N instances, each emits partial snapshots; nothing aggregates them. You will under-count every incident by N×.
- Socket presence maps, page-view stats — same story.

The moment docker-compose becomes `scale=2`, these become bugs. Nothing in CI catches them.

### 🟡 Ongoing forever: unbounded growth tables

No cleanup/pruning exists for:
- `CommerceMessage` (outbox + attempts) — grows with every order/notification forever;
- `AuditLog` — append-only by design, also forever;
- `InventoryMovement`, GPS history, storefront analytics events.

Each lives in the **tenant's own database** (good — blast radius is per tenant), but database-per-tenant means *you also need per-tenant disk management*, and there is none: no partitioning, no retention jobs, no storage quotas. A hoarder tenant fills the shared cluster's disk and every tenant on that box pays for it.

### 🟡 CSV settlement import: O(n²)-ish parser, O(n) memory

`settlement-report-parser.service.ts:193` parses courier CSVs **character-by-character** with string accumulation, holding all rows in memory before classification. Courier reports reach tens of MB. Expect multi-second parses blocking the event loop and OOM risk on large files — inside the API process again.

---

## Frontend brutalities

### ferio-customer-web: zero caching strategy

- `lib/backend.ts:54` — every server fetch is `cache: 'no-store'`; homepage is `export const dynamic = "force-dynamic"`. **Every page view is a fresh SSR round-trip through the backend**, which resolves tenancy (Redis), hits Postgres, renders. There is no ISR, no route cache, no CDN benefit. Product pages of a *static-by-nature catalog* are dynamic. At any real traffic, origin load = 100% of views.
- This is the correct *default* for correctness (no cross-tenant leakage via caches!) — but the missing half is deliberate, tenant-keyed caching (e.g., short revalidate keyed on host), not "no caching exists."

### Contract drift by hand

All three frontends hand-write TypeScript interfaces mirroring Nest DTOs. There is no OpenAPI export → codegen step, despite PRD Release-0 explicitly listing "typed API contracts." Every backend DTO change is a silent runtime shape change in three apps. Today they match because one person keeps them matched.

### Platform admin console is metadata-only by necessity

Fine per PRD (§8.13 support operators shouldn't see tenant PII), but know the operational consequence: when a merchant calls saying "orders disappeared," the console shows registry rows, not reality. Debugging requires DB access — which contradicts the MT-9 gate ("operators manage lifecycle without direct DB shell"). That gate is currently aspirational.

---

## Architecture-level truths

1. **Control plane is a total-outage SPOF.** Resolver needs the platform DB on cold lookups; fail-closed means platform DB down (+ Redis down/expired caches) = **every storefront down**, by design. Correct security. Brutal availability. No multi-region story, no read replica for the resolver path.
2. **One Redis is load-bearing for too much**: OTP, rate limits, settings cache, resolver cache, socket adapter, ALL BullMQ queues. Redis blips break login (OTP), stall notifications/payment-expiry sweeps, and split-brain socket rooms. No HA decision recorded anywhere.
3. **Sequential fan-out is a latency floor**: `forEachTenant` processes tenants one-by-one *by design*. With 100 tenants × polling sweeps every minute, sweep duration = Σ(per-tenant time). Failure isolation works (proven), but throughput is linear-at-best and one slow tenant DB stretches every sweep tail.
4. **Migrations run each file inside BEGIN/COMMIT** (`tenant-schema.bootstrapper`). Two future landmines: (a) `CREATE INDEX CONCURRENTLY` cannot run in a transaction — a legitimate optimization will simply fail; (b) no `lock_timeout`/`statement_timeout` is set, so one bad migration can hold locks on a live tenant DB indefinitely during fleet rollout.
5. **Identity plane is still per-tenant legacy** (PO-015 deferral): same human = separate accounts per store. Fine for R1; the eventual global-identity migration will be the hardest data migration of the whole program and nobody has scoped it.
6. **Object storage BLOCKED** = uploads currently ride strategies that don't survive horizontal scaling or satisfy §11.4 (no tenant key namespacing, no signed access). Media is functionally pinned to whatever this currently writes to.
7. **Fleet migration runner is PARTIAL** — orchestrator + batches exist behind an API; scaling schema changes to dozens of tenants means hand-driving endpoints. Fine at 10 tenants; misery at 100.
8. **SSLCommerz/courier adapters are built but launch-unverified** — PRD requires ≥1 courier + billing to pass live verification. Sandbox credentials are an owner task sitting between you and "this works with real money/parcels."
9. **CI is genuinely good** (strict tsc incl. specs, 80 suites/339 unit, 11 integration suites on real PG incl. wire-level socket E2E and perf baselines) — but there is **zero browser E2E**, no k6/load gate, and the perf suite bounds are deliberately generous. Numbers exist; regression *trends* don't (no benchmark history).
10. **Observability is honest but primitive**: counters are real, snapshots are logs — but without a metrics stack (owner decision pending) alerting = "grep the logs." §16.1's PARTIAL note says this plainly; it remains true.

---

## Scalability ceilings — concrete numbers

| Resource | Ceiling | Hits at |
|---|---|---|
| Tenant DB connections | 25 clients × 5 conns vs PG max_connections=100 | ~18–20 hot tenants |
| Product search | ILIKE seq-scan | ~50k products under load |
| Reports | Full-period findMany → JS reduce | ~100k+ orders/requested period |
| Settlement CSV parse | char-loop, all-in-memory | ~tens-of-MB files |
| Resolver | Redis-cached, ~130k ops/s measured | Not a bottleneck ✅ |
| Cold tenant connect | ~105ms first hit per tenant per instance | First request after eviction/deploy |
| Bootstrap | 43 migrations ≈ 1.9s/tenant | Provisioning storms (fine) |
| Fan-out sweeps | sequential Σ(tenants) | meaningful at ~100 tenants |
| Disk | shared cluster, no quotas/retention | whenever your biggest tenant decides |

---

## What is genuinely good (so this doesn't read as pure doom)

- **Isolation is enforced, not decorative**: fail-closed resolver, manager keyed only on registry IDs, HMAC callback binding, org-prefixed everything — with negative tests over real Postgres and even wire-level socket proofs. Most teams fake this layer; here it's the strongest part.
- **Money handling discipline**: minor-unit integers, idempotent ledgers, exactly-once credits, refund-over-debit guard, wallet isolation proven across two real databases.
- **Test culture**: 339 unit + 44 integration tests that run against real infrastructure, including concurrency races and outage paths.
- **Honest documentation**: the checklist doesn't lie to itself — PARTIAL/BLOCKED markers mostly match reality (I found only stale lines, now fixed).
- **Design language adherence** in the newer console surfaces is disciplined.

---

## If I were paid to make this survive, priority order

1. **Backups/PITR + one rehearsed restore** (unblocks the only unrecoverable risk). Owner decision, one day of ops.
2. **Rate-limit platform login** + audit all unauthenticated surfaces. Hours.
3. **Connection budget**: cut pool `max` to 2–3, size `max_connections` deliberately, add PgBouncer decision trigger at ~30 tenants. Half a day.
4. **pg_trgm GIN index on product name/sku** — one migration, defers search infra a year.
5. **SQL-aggregate the reports overview** (GROUP BY, not findMany+JS); keep JS only for shaping. Days.
6. **Distributed membership invalidation** (pub/sub on existing Redis) before any second backend instance. Half a day.
7. **Retention jobs**: CommerceMessage/AuditLog/analytics pruning per plan tier. Days.
8. **OpenAPI → typed client codegen** for all three frontends. Kills the drift class permanently.
9. Streaming/chunked CSV parse + size caps. A day.
10. Fix `evictForCapacity` to await disconnects under pressure. An hour.

Everything above is days of work — the architecture won't fight you. The backups item is the only one where the codebase can't save you.

---

## One-paragraph verdict

This is a well-engineered single-node SaaS wearing a multi-tenant suit that actually fits. The isolation core — the part everyone gets wrong — is done properly and proven with tests. What remains is the boring, unglamorous productionization layer: backups that were never chosen, connection budgets that were never counted, caches that stop being true at instance #2, and aggregation that stops fitting in memory when a merchant wins. None of it is architectural regret; all of it is scheduled honesty. Ship internal alpha now, but do items 1–4 before you let a single real business point their domain at this.
