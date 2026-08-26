# Tenant Admin — Chat / Support inbox

**Frontend:** `app/chat`, `app/messages`
**Verified against:** chatting controllers (`conversations`,`messages`),
socket gateway + `/socket-auth/ticket`

---

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/socket-auth/ticket` | 5-min org-bound socket ticket for realtime |
| 2 | GET | `/conversations?folder=&search=` | Conversation list (tenant-scoped) |
| 3 | GET/POST | `/conversations/:id/messages` | History / send message |
| 4 | PATCH | `/messages/:id` `{ text }` · DELETE same | Edit/delete (emits scoped room events) |
| 5 | POST | `/conversations/:id/participants` … | Participant management events |

Realtime delivery uses org-prefixed rooms; cross-tenant reachability is
impossible from any ticket (wire-level E2E proof).
