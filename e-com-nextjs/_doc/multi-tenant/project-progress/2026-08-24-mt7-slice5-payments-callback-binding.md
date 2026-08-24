# Project Progress — MT-7 Slice 5: Payments Tenancy via Signed Callback Binding

**Date:** August 24, 2026 (eighth increment)
**Scope:** The hardest isolation problem in commerce payments — routing asynchronous provider callbacks to the correct tenant database without trusting anything the provider or browser echoes back.

---

## What landed

### 1. HMAC-signed callback tenant binding (`callback-tenant.util.ts`)

The core insight: gateways echo **our own callback URLs** verbatim, so at initiation time we embed a tamper-proof marker — `orgId.<HMAC_SHA256(orgId, PLATFORM_CALLBACK_SECRET)>` — in all four URLs (success/fail/cancel/IPN). At callback time the token is verified timing-safe server-side; forgery, cross-org substitution, or secret mismatch all fail closed with `PAYMENT_CALLBACK_TENANT_INVALID` before any database is touched.

This satisfies §10.6's two scariest items:
- *Resolve webhook/callback tenant without trusting customer browser input* ✔
- *Verify callback cannot mutate another tenant's payment* ✔ — processing runs inside `TenantCallbackRunner.runForOrganization(...)`, which resolves the registry row, warms the bounded pool, and wraps execution in the immutable `TenantContext`; there is no resolution path from a foreign token to another tenant's data.

### 2. `CommercePaymentsService` tenancy (8 methods)

Initiate/retry/processCallback/ledger/attempt-detail/expiry all resolve through the explicit `db()` helper. Merchant transaction IDs and idempotency keys become per-tenant by construction. Initiation mints and embeds the `cbt` token only when both tenant context and `PLATFORM_CALLBACK_SECRET` exist.

### 3. Two more sweep lessons (caught before shipping)

1. **Decorator metadata imports classes for real**: adding the runner as a constructor param made ts-jest load its whole dependency chain (platform client + `pg`) inside payment specs — "unexpected token" parse failures. Fix: the service doesn't need the runner at all; only the controller does (it owns the HTTP boundary). Removed; chain broken.
2. **Async-check discipline held**: one sync method (`eligibleExpiredAttempts`) received an await insertion; caught by re-running the async audit on this file before commit — its two queue callers were already awaiting, so the signature flip was safe.

## Verification

- Build clean; **71 suites / 290 tests passing** (+8: token mint/verify, wrong-secret rejection, five tamper/forgery cases, missing-secret refusal).
- Full payments spec suites green including amount/currency/risk validation and duplicate-callback behavior — confirming the tenancy wrapper didn't weaken any existing fraud posture.

## Checklist movement

§10.6: merchant references ✔, callback resolution ✔, cross-tenant mutation impossibility ✔. Explicitly still pending in this slice: per-tenant provider credentials + recovery/reconciliation sweeps (next), plus the worker-side constraint documented in §10.4A.

## Next

**MT-8 begins**: Redis key inventory/namespacing, BullMQ job envelopes with worker-side tenant resolution (unblocks `TENANCY_ENABLED` for messaging dispatch), socket room namespacing — then payments recovery/reconciliation sweeps ride the same envelope.
