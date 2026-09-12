# Tenant Admin — Chat / Support inbox

**Frontend:** `app/chat`, `app/messages`
**Verified against:** chatting controllers (`conversations`,`messages`),
socket gateway + `/socket-auth/ticket`

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/socket-auth/ticket` | 5-min org-bound socket ticket for realtime |
| 2 | GET | `/conversations/all?page=&limit=` | Conversation list (tenant-scoped) |
| 3 | GET | `/conversations/:id/messages?limit=` | Message history used by the admin dashboard |
| 4 | POST | `/socket-auth/ticket` | Authenticates the Socket.IO dashboard connection |
| 5 | WS event | `new-message-received` | Admin reply relay and persistence through the org-scoped gateway |

The tenant-admin BFF uses the shared admin session client for conversation and
history requests. A 401 triggers access-token refresh through the httpOnly
admin refresh cookie before retrying; tenant host forwarding and correlation
IDs are applied centrally. The current dashboard does not call REST message
edit/delete or participant-management endpoints.

Realtime delivery uses org-prefixed rooms; cross-tenant reachability is
impossible from any ticket (wire-level E2E proof).
