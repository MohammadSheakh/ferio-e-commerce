# Project Progress — MT-8 Complete: Courier/Reconciliation Fan-Out + Socket Namespacing

**Date:** August 24, 2026 (tenth increment)
**Scope:** Finishes Release MT-8 — every background sweep now runs per tenant, and WebSocket channels are tenant-namespaced from ticket claims.

---

## What landed

### 1. Remaining workers onto the fan-out runner

| Worker | Change |
|---|---|
| Courier polling | `enqueueDue` fans out per READY tenant; poll jobs carry org envelopes; IDs prefixed `t:{orgId}:…`; processor resolves via `forOrganization` |
| Courier callback retry | Recoverable-callback sweep fans out; retry jobs capture the enqueueing context's organization; processor resolves envelope before `retryWebhookLog` |
| Reconciliation | Scheduled scan fans out per tenant with isolated failures (`processedTenants` / `tenantFailures` evidence); manual retries carry the run's organization captured at enqueue |

### 2. Socket tenant binding (§11.3)

- **Tickets**: minted inside tenant-resolved requests embed `organizationId` into the JWT claim (authenticated, guest, and rider paths).
- **`SocketUser`** propagates the claim through socket authentication.
- **`scopedSocketRoom(user, room)`** centralizes namespacing (`org:{id}:{room}`); applied to:
  - connection-time personal/conversation/role/admin joins;
  - conversation join/leave emissions;
  - message-send target rooms and linked-user fan-out rooms (sender's binding scopes every emission);
  - live-page stats broadcast (org-scoped rooms added alongside legacy names during client migration).
- Cross-tenant room joins are unreachable by construction: a ticket only reveals its own org's prefixed room names.

### 3. Strict-tsc debt surfaced and cleared

The incremental build cache had been hiding real defects behind stale state. After clearing it, this pass fixed every non-spec error introduced by scripted edits: missing module import in the payments module, widened `respond()` result union, optional-fanout guards (`TENANT_FANOUT_UNAVAILABLE`) across all queues, non-null narrowings after type-guard branches, corrupted union-type formatting from regex edits, and wrong relative import depth in the gateway. **Reference check going forward: cacheless strict tsc over non-spec sources must stay at zero errors** — now true.

## Verification

- Clean incremental-cache-free production build.
- **72 suites / 293 tests passing**, including all processor/queue suites that exercise the new envelopes' legacy paths.

## Checklist movement

§11.2 fully done except durable dead-letter retention + metrics storage (recorded as PARTIAL, tied to §22). §11.1 key prefixing remains PARTIAL pending full key inventory. §11.3 marked complete.

## Flag-on readiness summary

Remaining before flipping `TENANCY_ENABLED=true` in any environment:
1. Integration credential vault (§11.5) — owner-blocked on secret-storage decision.
2. Full Redis key inventory sweep beyond OTP/settings (§11.1).
3. Membership guard applied across all admin controllers (MT-10).
4. CI runner with disposable PostgreSQL to execute the gated cross-tenant integration suites on every push.

## Next

1. MT-9 Platform Admin console (organization/provisioning/migration/billing UI) over the existing control-plane API.
2. MT-10 tenant-owner onboarding UX + membership guard sweep.
3. MT-11 migration orchestrator wiring onto the fan-out/envelope infrastructure delivered here.
