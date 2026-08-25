# Project Progress — MT-2/MT-8 Gate Proofs + Wallet Checklist Closure

**Date:** August 25, 2026
**Scope:** Negative-test matrix expansion — deterministic two-host resolution (MT-2 gate), Redis/cache collision proofs for identical record identifiers across tenants (§11.1), and checklist truthing for wallet isolation (§10.7).

---

## What landed

### 1. `src/tenancy/redis-collision.spec.ts` (7 tests)

**MT-2 gate — two hosts → two organizations:**
- `tenant-a.ferio.test` / `tenant-b.ferio.test` resolve to their own organizations through mocked control-plane rows;
- repeat resolution stays deterministic including the positive-cache path;
- interleaved A/B/A/B resolutions never leak one org into the other.

**§11.1 — identical identifiers cannot collide in two tenants:**
- `scopedRedisKey('otp','login',same-email)` yields `t:org-a:…` vs `t:org-b:…`;
- OTP service keys isolate the same email per storefront organization;
- settings cache keys isolate the same settings type (`settings:{orgId}:{type}`);
- legacy key shape is preserved verbatim outside tenant contexts.

### 2. Checklist truthing

- **§10.7 Wallet — all seven lines flipped `[x]`.** The sweep landed earlier; `test/wallet-isolation.integration-spec.ts` now supplies the missing negative proofs: identical user/customer/order IDs across two REAL databases, debit consumes only its own balance, cross-tenant refund replay fails closed with ConflictException, idempotency keys are tenant-local, ledger visibility verified per database.
- §10.13 inventory note corrected: socket identity/room services were swept with MT-8 (previously listed as pending).
- MT-2 gate first line flipped; §11.1 collision-tests line flipped.
- §9.3 invoice line annotated separately (invoice records + paid lifecycle + history exist; receipt rendering is UI polish).

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ 0 errors |
| Unit suite | ✅ 79 suites / 331 tests (+7) |
| Integration suite (real PostgreSQL) | ✅ 8 suites / 34 tests |
| Production build | ✅ clean |

## Next candidates

1. Platform Admin secondary views (billing/invoices, migration fleet tiles — §12.1/12.3/12.4)
2. Usage-metering hardening: warning thresholds, period reset behavior, owner-facing usage views (§9.4)
3. Multi-client two-tenant socket E2E (needs CI Redis + harness — MT-14 prep)
4. Owner-gated: managed Postgres executor, wildcard DNS/TLS, SSLCommerz merchant account, object storage
