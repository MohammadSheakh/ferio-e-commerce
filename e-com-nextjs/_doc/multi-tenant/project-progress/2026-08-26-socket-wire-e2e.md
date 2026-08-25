# Project Progress — Multi-Tenant Socket E2E Over the Wire (§10.11 / MT-8 gate)

**Date:** August 26, 2026
**Scope:** Live multi-client proof that realtime paths match HTTP isolation: four simultaneous WebSocket clients across two tenants against the REAL gateway stack.

---

## What landed

`test/socket-isolation.integration-spec.ts` boots a real `socket.io` Server
(ephemeral port, in-memory adapter — no Redis needed) wired to the REAL
`SocketGateway`, REAL `SocketAuthService` (genuine JWT verification with
`JWT_ACCESS_SECRET`) and REAL `SocketRoomService`. Four raw WebSocket
clients speak the Socket.IO v4 protocol directly (engine.io open → `40{auth}`
→ `42[event]` frames), avoiding any client-library dependency:

| Client | Identity | Tenant |
|---|---|---|
| adminA | userId `admin-shared`, role admin | org-a |
| adminB | **same** userId `admin-shared`, role admin | org-b |
| guestA | guest chat ticket | org-a |
| guestB | guest chat ticket | org-b |

Deliberately colliding identifiers make any scoping gap immediately visible.

### Proven on the wire

1. **Connection rooms**: adminA holds only `org:org-a:role::admin`,
   `org:org-a:admin-room`, `org:org-a:admin-shared`; raw `role::admin` is
   gone; zero `org:org-b:*` overlap (and mirrored for B).
2. **Server emissions**: `emitNotificationToUser('admin-shared')` under an
   org-a context reaches ONLY adminA; under org-b ONLY adminB — identical
   userIds can never cross.
3. **Chat relay**: a guest message reaches its own-org admin console via the
   scoped admin broadcast while org-b's admin AND the foreign-org guest stay
   silent; the foreign guest's room join cannot attach it to A's conversation.

Harness notes: handlers are bound explicitly rather than booting Nest's
websocket container (isolation logic lives inside the handlers/services);
`@WebSocketServer()` is wired manually; Redis is a minimal in-memory double;
the prisma double returns null lookups so guests resolve purely from their
tickets.

## Checklist updates

- §10.11 multi-client E2E → `[x]`
- MT-8 gate "Background and realtime paths meet the same isolation standard
  as HTTP" → `[x]` (BullMQ fan-out proofs + this wire-level suite)

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ |
| Unit suite | ✅ 80 suites / 339 tests |
| Integration suite (real PostgreSQL) | ✅ **10 suites / 38 tests** (+3 wire-level) |
| Production build | ✅ clean |

## Remaining actionable work

1. §12.4 remainder: provisioning-retry UI wiring, live DB health probe, rollout pause/resume buttons
2. Load simulations (§16.3)
3. Owner-gated infra decisions (launch blockers)
