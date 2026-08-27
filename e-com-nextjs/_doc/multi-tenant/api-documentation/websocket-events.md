# WebSocket Events Reference

**Transport:** Socket.IO v4 (Engine.IO websocket), same origin as the API
`/socket.io/?EIO=4&transport=websocket`
**Auth:** handshake `auth.token` = JWT issued by `POST /socket-auth/ticket`
(staff/customer) or `/socket-auth/guest-ticket` (guests). Tokens embed the
tenant `organizationId`; **every room and event is org-scoped** — a ticket
can never reach another tenant's channel.
**Multi-instance:** Redis adapter fans frames across backend replicas.

---

## 1. Connection lifecycle

| Direction | Event | Payload | Notes |
|---|---|---|---|
| S→C | `connected` | `{ success:true, userId, socketId }` | Auth OK; auto-joins personal + conv rooms |
| S→C | `io-error` | `{ success:false, message }` | Invalid/expired token → socket is disconnected |
| S→C (raw) | `41` + close | — | Transport-level disconnect after io-error |

Auto-joins on connect (org-prefixed when the ticket carries an organization):

| Room | Who |
|---|---|
| `{org:}<userId>` / `{org:}conv-<userId>` | everyone |
| `{org:}role::admin`, `{org:}role::super-admin`, `{org:}admin-room` | admins (org-bound only; legacy unbound sockets keep raw names) |
| raw `role::<role>` | legacy sockets only |

## 2. Client → Server events

All handlers return an ack object `{ success, message? }` unless noted.

| Event | Payload | Behavior |
|---|---|---|
| `page-view` | `{ page, title? }` | Live visitor tracking (dashboard pages excluded) |
| `request-live-page-stats` | — | Triggers `live-page-visitors-stats` broadcast to admins |
| `join` | `{ conversationId }` | Join conv room (access-checked); ack success |
| `leave` | `{ conversationId }` | Leave + presence cleanup |
| `new-message-received` *(alias: `send-message`)* | `{ conversationId?, text (≤4000) , _messageId?, createdAt? }` | Relay to conversation room(s), linked user/customer rooms, sender-org admin rooms; persists message+conversation |
| `join-task` / `leave-task` | `{ taskId }` | Org-scoped task room join/leave + Redis presence |
| `only-related-online-users` | `{ userId }` | Returns related online users (family/conversations) |
| `get-family-activity-feed` | `{ businessUserId, limit? }` | Activity feed slice |

## 3. Server → Client events (chat)

| Event | Payload | Audience |
|---|---|---|
| `new-message-received` | `{ _messageId, conversationId, text, senderId, senderName, createdAt, isGuest, guestId?, isAdmin }` | Conversation members (scoped rooms), linked identity rooms, sender-org admin consoles. **Foreign tenants never receive it.** |
| `user-joined-chat` / `user-left-chat` | `{ userId, userName }` | Same conversation room |

## 4. Server → Client events (presence & tasks)

| Event | Payload | Audience |
|---|---|---|
| `related-user-online-status::<userId>` | `{ userId, isOnline }` | Related online users only |
| `user-joined-task` / `user-left-task` | `{ userId, userName, taskId, isOnline? }` | Task room members (org-scoped room name) |

## 5. Server → Client events (notifications)

Delivered ONLY inside a resolved tenant context to the org-prefixed
personal room; outside any context the historical raw room is used.

| Event pattern | Payload | Trigger |
|---|---|---|
| `notification::<userId>` | notification object | BullMQ send-notification processor, wallet top-up review outcome, etc. |
| `notification::admin` | notification object | Admin-role broadcast from processors |
| `notification:unread-count::<userId>` | `{ count, hasUnread }` | Inbox unread changes |
| `conversation-list-updated::<participantId>` | `{ conversationId,… }` | Chat participant fan-out worker |

## 6. Live storefront stats

| Event | Payload | Notes |
|---|---|---|
| `live-page-visitors-stats` | `{ totalActive, pageCounts{...}, activeVisitors[], timestamp }` | Broadcast on connect/page-view/leave; tenant-scoped emission when ambient context exists |

## 7. REST-initiated realtime (same scoping rules)

These fire from service calls and arrive in the org-prefixed room of the
ambient context:

| Event | Room | Source |
|---|---|---|
| `message-updated` / `message-deleted` | `…conv-<id>` | Message edit/delete REST |
| `participant-removed` | conversation room | Conversation service |
| `conversation-list-updated::<uid>` | personal rooms via emitToUser | Chat workers |

---

## Tenant isolation guarantees (verified)

1. Connection rooms: org-bound sockets hold ONLY `org:<orgId>:*` rooms;
   raw rooms exist solely for legacy unbound sockets (`socket-isolation`
   wire E2E).
2. Identical userId across two tenants receives disjoint notifications.
3. Chat relay reaches sender-org admins/members only; foreign guest cannot
   even join the conversation room.
4. Server-side emissions resolve the ambient context first — no code path
   emits cross-tenant.
