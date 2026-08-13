# Ferio Project Progress 37

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Authenticated full-stack settlement import proof  
**Status:** The built Admin Web and NestJS backend completed the canonical CSV settlement path against disposable PostgreSQL and local Redis, with persisted financial, parser, idempotency, and audit evidence

## Delivered

### Production startup repairs

- Declares `dotenv` as a direct backend dependency so the documented Prisma seed command compiles in a strict pnpm installation.
- Points `start:prod` to the actual Nest build entry at `dist/src/main`, allowing compiled application imports to resolve compiled shared libraries under `dist/libs`.
- Rebuilt the backend and verified the production artifact starts with PostgreSQL, Redis, BullMQ, authentication, settlement, and reconciliation modules initialized.

### Disposable full-stack fixture

- Created a dedicated `ferio_fullstack_test_20260813` PostgreSQL database on the configured server.
- Applied all 21 migrations and seeded one isolated admin, three delivery zones, and Pathao plus Steadfast providers.
- Seeded one delivered Steadfast COD shipment for BDT 1,500.00 with an expected, unsettled COD collection and unpaid order.
- Used isolated JWT secrets, disabled scheduled reconciliation, and left the configured application database untouched.

### Authenticated Admin workflow

- Built and started the Admin production application on an alternate local port because port 3001 was already occupied.
- Logged in through `/api/auth/login` and received the Admin HTTP-only session cookies.
- Downloaded the protected canonical v1 template through the Admin proxy.
- Preflighted one valid UTF-8 CSV row and received ready state, normalized minor-unit amounts, source checksum, normalized-row checksum, and parser version.
- Applied the exact preflighted CSV through the Admin proxy and loaded immutable protected import history.
- Replayed the same request and idempotency key, receiving the original import without a second settlement or import record.

### Persisted financial evidence

- Recorded one `APPLIED` import with one applied row and zero exceptions.
- Recorded one `MATCHED` settlement: gross BDT 1,500.00, courier fee BDT 50.00, expected/remitted BDT 1,450.00, and zero variance.
- Transitioned the COD collection to `SETTLED` and the order payment state to `PAID`.
- Persisted canonical parser v1, source-file checksum, and normalized-row checksum evidence.
- Persisted one `COURIER_SETTLEMENT_RECORDED` and one `COURIER_SETTLEMENT_REPORT_IMPORTED` Admin API audit event.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma migration deployment | Passed; 21 of 21 migrations |
| Backend | Seed command | Passed after direct `dotenv` dependency repair |
| Backend | Production build and launch | Passed from `dist/src/main` |
| Backend | Redis connectivity | Passed; main, pub, and sub clients connected |
| Admin Web | Production build | Passed; 43 of 43 static pages generated |
| Full stack | Authenticated login, template, preflight, import, and history | Passed; all Admin proxy responses HTTP 200 |
| Full stack | Idempotent import replay | Passed; same import ID, one import, and one settlement |
| PostgreSQL | Settlement and payment invariants | Passed; matched/settled/paid with zero variance |
| PostgreSQL | Parser and audit evidence | Passed; both checksums, parser v1, and two expected audit actions |
| Cleanup | Disposable database removal | Passed; zero matching databases remain |

## Still Open

- Provider-native Pathao and Steadfast report column mappings remain pending real sample reports.
- Provider settlement report API retrieval remains pending credentials and provider contracts.
- Courier callback authentication, replay, retry, and provider-sandbox proof remain incomplete.
- Port 3001 was occupied by a pre-existing local process; the isolated Admin smoke used port 3011 without altering that process.
- Local Redis 6.0.16 works for this proof, but BullMQ recommends Redis 6.2 or newer.

## Recommended Next Work

1. Inspect the current courier webhook authentication and deduplication boundary for both providers.
2. Add deterministic callback fixtures for valid, invalid, duplicate, and out-of-order events.
3. Prove callback persistence, normalized shipment transitions, replay safety, and audit/exception evidence against disposable infrastructure.
4. Keep provider-native payload details isolated behind adapters until real sandbox contracts and credentials are available.
