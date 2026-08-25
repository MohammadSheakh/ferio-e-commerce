# Project Progress — MT-8 WebSocket Isolation Completed

**Date:** August 25, 2026
**Scope:** Closes the remaining §11.3 WebSocket slice — admin chat, task rooms, and all server-side emission paths are now tenant-scoped; socket services swept behind `TenantDbService`.

---

## Cross-tenant leak found and fixed

**Every admin socket joined raw `role::admin` / `admin-room` even when org-bound, and the chat relay broadcast to those raw rooms unconditionally.** A customer message in tenant A reached every admin console connected under any tenant. Fixed at both ends:

1. **Connection time** (`handleConnection`): org-bound sockets join ONLY org-prefixed role/admin rooms; raw role rooms are now legacy-only (unbound sockets).
2. **Relay time** (`handleNewMessage`): the admin broadcast is scoped by the sender's tenant binding — tenant senders reach only their own tenant's admins; legacy senders keep historical rooms.

## Server-side emissions made tenant-aware

`emitNotificationToUser`, `emitUnreadCountUpdate`, `broadcastToRole`, `emitToUser`, `emitToRoom`, `isUserOnline` resolve the ambient `tryGetTenantContext()`:

- Inside a resolved context → emit ONLY to the `org:{orgId}:…` room (tenant events can never reach legacy or foreign-tenant sockets).
- Outside any context → historical raw room (legacy behavior preserved).

This automatically scopes REST-initiated chat mutations (`message.service`, `conversation.service`) and BullMQ notification workers that run inside fan-out-resolved contexts (§11.2).

## Additional scoping

- **Task rooms**: joins/leaves/presence/emissions wrapped in `scopedSocketRoom(user, taskId)`; Redis presence lists inherit the scoped name so identical task IDs across tenants no longer merge.
- **Socket services swept**: `SocketAuthService` (7 refs) and `SocketRoomService` (1 ref) now resolve user/rider/conversation lookups through the tenant client with explicit legacy fallback; `TenancyModule` imported by `SocketModule`.

## Rider live map

No server-side WebSocket live-map emitter exists today (location surfaces are poll-based). Checklist §10.8/§11.3 annotated PARTIAL — scope the room family when realtime rider tracking lands.

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ 0 errors |
| Unit suite | ✅ 77 suites / 318 tests — incl. new `socket.gateway.spec.ts`: broadcast/notification/chat emissions target only `org:org-a:…` under a resolved tenant, only raw rooms without one, and two tenants can never share an emission room |
| Integration suite (real PostgreSQL) | ✅ 7 suites / 33 tests |
| Production build | ✅ clean |

## Checklist updates

- §11.3: "Tenant-scope Admin chat" → `[x]`; "Tenant-scope customer notifications if realtime" → `[x]`; rider live map annotated (no server-side emitter exists)
- §10.11: "Tenant-scope rooms/channels" → `[x]`
- §10.8: WebSocket/live-map rooms annotated PARTIAL

## Remaining for MT-8 gate

- Multi-client E2E with two tenants connected simultaneously (needs the CI Redis service + socket harness — candidate for MT-13 negative-test expansion)
- Object storage strategy selection (owner-gated), integration credential vault UI surfaces
