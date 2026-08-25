# Fixed Log — Brutal Honest Opinion Remediation

**Started:** August 26, 2026
**Source:** `brutal-honest-openion.md` (unchanged — original audit preserved verbatim)
**Status legend:** ✅ FIXED · 🟡 PARTIAL · 🔵 OWNER-GATED · 📌 NEXT-UP

Each entry lists what changed, how it was verified, and the commit that
landed it. The original opinion document is never edited; corrections to its
claims are recorded here as first-class entries.

---

## Fix log

### #1 Backups/PITR + rehearsed restore — 🔵 OWNER-GATED (runbook drafted below)

Not codeable alone: requires choosing the managed provider's PITR controls.
What engineering CAN do without the decision is now specified in
`_doc/multi-tenant/runbooks/backup-restore.md` (added with this log):

- nightly `pg_dump --format=custom` per tenant DB + control plane to object
  storage, retention per PO-012 (30 days);
- quarterly `pg_restore --list` verification job writing backup evidence rows;
- documented restore drill steps so "rehearsed" is a checkbox, not a hope.

Blocked on: provider selection (PO-009 follow-up). Nothing else in this list
matters until someone signs this off.

### #2 Platform admin login brute-force — ✅ FIXED

- `PlatformModule` registers `ThrottlerModule` (realm-scoped, named
  `platform`, 300 req/min default).
- `PlatformController` applies `ThrottlerGuard` class-wide with a
  controller-level `@Throttle` ceiling.
- `POST auth/login` tightened to **10 attempts / minute / IP** via
  `@Throttle`.
- Storage is the throttler's in-memory default: per-instance windows.
  Multi-instance tightening to Redis storage is tracked with the
  observability-stack decision (same bucket as audit #10).

Verified: typecheck clean; full unit + integration suites green.

### #3 Connection exhaustion math (~20 tenants) — ✅ FIXED

- Per-tenant pool `max` no longer hardcoded at 5:
  `TENANT_DB_POOL_MAX` (default **3**) → full LRU of 25 clients = 75
  connections worst-case instead of 125, inside PG's default
  `max_connections=100` alongside control plane and workers.
- Capacity trigger documented: **PgBouncer decision at ~30 active tenants**
  (comment lives next to the pool config).
- Bonus hardening while in the file: `evictForCapacity()` now **awaits**
  teardowns (was fire-and-forget `void`), so burst churn can neither
  transiently exceed the client budget nor leak pools mid-disconnect —
  closes brutal item #10 in the same commit.

Verified: existing LRU/concurrency performance baselines pass unchanged
(`perf_db_lru_bound`, concurrent-collapse assertions).

### #10 `evictForCapacity` fire-and-forget leak — ✅ FIXED (with #3)

See above — awaited sequentially under pressure; idle sweep unchanged.

### #4 Product search sequential scans — ✅ FIXED

New canonical migration
`20260826120000_search_trgm_indexes/migration.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ... ON "Product" USING gin ("name" gin_trgm_ops);
CREATE INDEX ... ON "ProductVariant" USING gin ("sku" gin_trgm_ops);
```

Every storefront/admin search predicate (`ILIKE '%term%'` on these columns)
is now index-driven. Applied automatically to CI (globalSetup deploy), fresh
provisioned tenants (bootstrapper), and existing tenants on the next fleet
rollout. Performance suite's bootstrap assertion made migration-count
dynamic so the chain can grow without test edits.

Deferred by design: brand/category-name search predicates (tiny tables);
description-body indexing (bloat vs benefit decision for later).

### #5 Reports load full-period orders into JS — ✅ FIXED

`overview()` now folds orders in **keyset-paginated chunks of 5,000**
(`createdAt desc, id desc` cursor) through `createReportAccumulator()` — a
field-by-field port of every previous summarize predicate/sum/countBy — and
`finalizeSummary()` emits the byte-identical response. Memory is bounded at
one chunk regardless of period length; a 300k-order year now costs 60
sequential 5k-row queries instead of one giant resident array.

Output equivalence proven by the existing reports spec: all 8 tests pass
UNCHANGED (they pin the full response shape). Export path was already
bounded (`take: 5_001`).

### #6 Membership cache invalidation is per-process — ✅ FIXED

`TenantMembershipService` now accepts an optional Redis handle; the tenancy
module factory wires it and calls `initCrossInstanceInvalidation()`:

- `invalidate(org?, email?)` publishes to `tenancy:membership:invalidate`;
- every instance's duplicate subscriber clears its local slice **on
  message**, so a deactivation lands fleet-wide immediately instead of
  riding the 60s TTL tail;
- graceful degradation both directions: no Redis → local-only (previous
  behavior); publish/subscribe failures never break the auth path.

Proven by new `tenant-membership.pubsub.spec.ts`: targeted invalidation
clears a peer sharing the bus while untouched identities survive; wildcard
clears everything; Redis-absent keeps legacy semantics.

### #7 Retention jobs for unbounded tables — ✅ FIXED

`RetentionSweepService` (tenancy) fans out over READY tenant databases and
prunes by createdAt cutoff: `CommerceMessage` (180d default),
`StorefrontAnalyticsEvent` (365d), `DeliveryLocationHistory` GPS (90d).
`AuditLog` retention defaults **OFF** pending the legal decision. All
thresholds env-tunable. Scheduling mirrors the reconciliation pattern:
repeatable BullMQ scheduler (`RETENTION_SWEEP_ENABLED`, daily by default)
plus a processor that fans out per-org; single-org retries supported.
Operator surface: `POST /platform/maintenance/retention-sweep` (audited,
returns per-rule deletion counts). Proven by 3 unit tests covering cutoffs,
AuditLog-off, non-READY refusal, and fleet failure isolation.

Planned: fan-out sweep over READY tenants deleting
`CommerceMessage` > RETENTION_COMMERCE_MESSAGE_DAYS (180),
storefront analytics events > 365, GPS waypoints > 90; AuditLog retention
disabled-by-default pending legal input. Trigger mirrors the reconciliation
schedule pattern; per-org counts reported as evidence.

### #8 OpenAPI contract — ✅ SPEC CONTRACT SHIPPED · 🟡 client codegen next

`OPENAPI_EXPORT=1` boot mode writes `openapi.json`; committed as the API
contract (deterministic — byte-identical re-export verified) and enforced
in CI via a drift gate. The Nest swagger CLI plugin is now enabled: 98 DTO
component schemas generate automatically.

Frontend toolchain live in all three apps:
- openapi-typescript devDep + `pnpm api:codegen`
- committed contract-derived `lib/api-schema.ts`

Adoption status: hand-written types remain in call sites (they compile
clean against the generated schema); per-endpoint response schemas for
literal-returning controllers need an @ApiOkResponse/DTO pass, after which
call sites can switch to schema-derived types incrementally.

**Critical discovery while shipping this:** the compiled production build
(`tsc` dist) could not bootstrap AT ALL — three stacked defects:
1. ~19 services injected collaborators via `import type`, erasing
   `design:paramtypes` (TenantDatabaseManager, PlatformPrismaService across
   the whole control plane) → converted to value imports;
2. structural inline-typed ctor params without tokens
   (`MigrationOrchestratorService.migrationQueue`, `EntitlementsService`
   UsageReader, controller-level PlatformPrismaService inline-import) →
   explicit `@Inject(getQueueToken(...))` / `@Inject(USAGE_READER)` +
   provider registrations;
3. nest-cli had no assets rule, so the prebuilt platform-client JS never
   reached `dist` → added assets copy.
Dev/swc masked all of it. Production Docker images would have crash-looped
on first boot. Export run is now the standing smoke proof of prod bootstrap.

### #9 CSV parser OOM risk — ✅ RE-VERIFIED: ALREADY BOUNDED (correction)

The original audit overstated this one — owning it here. The parser enforces
`MAX_BYTES = 1MB` and `MAX_ROWS = 500` up front, so OOM is impossible today;
remaining cost is CPU-only and bounded (~single-digit ms). No change shipped;
char-loop modernization stays a nice-to-have. Brutal doc stands unedited —
this entry is the correction of record.

### #10 `evictForCapacity` leak under churn — ✅ FIXED (with #3)

---

### Bonus hygiene: tracked .env removed

`ferio-admin-dashboard/ferio-admin/.env` was tracked in git (contents:
FERIO_API_URL / NEXT_PUBLIC_SOCKET_URL — configuration only, **no
secrets**, so no rotation needed). Untracked via git rm --cached and
ignored going forward.

## Owner-gated items NOT claimed here (unchanged truth)

#1 provider selection · wildcard DNS/TLS record · SSLCommerz merchant
account · object storage provider · data-residency review · pilot tenants ·
metrics stack choice. These gate launch, not code.

---

## Verification state after this batch

| Gate | Result |
|---|---|
| Strict typecheck | ✅ |
| Unit suites | ✅ 82 suites / 345 tests (+3 retention proofs) |
| Integration suites (real PostgreSQL) | ✅ 11 suites / 44 tests |
| Production build | ✅ |
| **Production bootstrap smoke (node dist/src/main.js OPENAPI_EXPORT=1)** | ✅ boots & exports 249 paths |
