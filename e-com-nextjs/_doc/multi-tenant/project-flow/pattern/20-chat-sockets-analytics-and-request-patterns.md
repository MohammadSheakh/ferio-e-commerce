# Chat, Sockets, Analytics, and Request Patterns

This chapter is based on the focused source and test pass for `chatting`,
`socket-gateway`, `storefront-analytics`, `purchase-activity`, and
`product-request`. It is a source-backed learning guide; realtime scale and
analytics accuracy still require runtime evidence.

## 219. Conversation participant authorization

Conversation operations first resolve the conversation and verify active
membership. Participant addition/removal rules distinguish administrators from
ordinary members, while a member can leave their own conversation.

- Source: `chatting/conversation/conversation.service.ts`
- Test: `conversation.service.spec.ts`
- Failure mode: any authenticated user guessing a conversation id.

## 220. Transaction then participant notification

Message creation and conversation last-message updates happen inside one
transaction. Participant notification is dispatched after the durable message
exists, so consumers can safely fetch the source row.

- Source: `message.service.ts` and conversation service
- Failure mode: a notification referencing a message that rolled back.

## 221. Cursor message pagination

Message history exposes cursor-based navigation for long conversations. The
cursor is tied to message ordering rather than relying on increasingly expensive
offset scans.

- Source: `message.controller.ts`, `message.dto.ts`, and message service
- Failure mode: missing messages or duplicate pages during active chat.

## 222. Message ownership mutation

Update and delete operations include the authenticated sender in their lookup
or mutation predicate. Reading a conversation and mutating another user's
message are separate authorization decisions.

- Source: `MessageService.updateMessage/deleteMessage`
- Failure mode: participant status being mistaken for message ownership.

## 223. Durable chat notification queue

Participant notifications are handed to a queue processor rather than making
the HTTP request synchronously deliver every notification. The queue payload
contains the conversation/message identity needed for retry.

- Source: `chatting.module.ts` and `chat-notification.processor.ts`
- Failure mode: slow provider work extending the message request or blocking it.

## 224. Signed socket organization context

Socket authentication verifies the token and derives organization context from
trusted claims/database state. Handshake-supplied role or organization fields
are not treated as authority.

- Source: `socket-auth.service.ts` and `ws-jwt.guard.ts`
- Tests: `socket-auth.service.spec.ts`
- Failure mode: a client joining another organization's socket context.

## 225. Tenant-prefixed socket rooms

Room names include the trusted organization namespace. Identical conversation,
task, or activity ids in two organizations therefore map to different rooms.

- Source: `socket-room.service.ts` and `socket.gateway.ts`
- Test: `socket-room.service.spec.ts`
- Failure mode: broadcast crossover caused by globally named rooms.

## 226. Strict unscoped-room rejection

In strict tenancy mode, room state and tenant-sensitive emissions are rejected
when no organization context exists. Legacy raw rooms are retained only for
explicit non-tenant compatibility mode.

- Source: socket room/gateway services
- Tests: strict-mode socket cases
- Failure mode: silently falling back to a global room in a tenant request.

## 227. Multi-socket presence accounting

Presence tracks multiple sockets per user and marks a user offline only after
the final socket disconnects. Presence keys are organization-scoped.

- Source: `socket-auth.service.ts`
- Test: multi-socket and tenant namespace cases
- Failure mode: false offline events or cross-tenant presence collisions.

## 228. Socket role derived from database

Socket authorization checks the database-backed role and membership instead of
trusting a role field supplied during the handshake. Admin-only visitor data is
therefore protected at the gateway boundary.

- Source: `socket-auth.service.ts` and `socket.gateway.ts`
- Test: claimed-role rejection and database-role cases
- Failure mode: a customer claiming an admin role over WebSocket.

## 229. Tenant-safe REST-to-socket emission

REST service mutations emit through the gateway using the ambient tenant room
namespace. A REST request cannot broadcast an event into another tenant's room
by supplying a raw room name.

- Source: chat services and `SocketGateway.emitToRoom`
- Test: `socket.gateway.spec.ts`
- Failure mode: HTTP and WebSocket isolation disagreeing.

## 230. Analytics field sanitization

Search terms, filters, and paths are normalized and restricted to safe scalar
values. Likely contact information and query strings are removed before event
storage.

- Source: `storefront-analytics.util.ts`
- Test: `storefront-analytics.util.spec.ts`
- Failure mode: analytics becoming a PII or arbitrary JSON ingestion channel.

## 231. Structured analytics event contract

Analytics ingestion uses an event id, event type, path, optional product, and
bounded metadata rather than accepting arbitrary event documents. The service
can validate event-specific evidence before using it in reports.

- Source: `storefront-analytics.dto.ts` and service
- Failure mode: impossible funnel metrics generated by malformed events.

## 232. Tenant-isolated analytics aggregation

Search, funnel, revenue, and order metrics aggregate through the resolved tenant
database. Identical event ids or search terms remain independent between stores.

- Source: `storefront-analytics.service.ts`
- Test: `storefront-analytics.tenant-isolation.spec.ts`
- Failure mode: dashboard data leaking or combining tenants.

## 233. Measured-evidence funnel

Funnel metrics use measured checkout-begin and related events, not assumptions
derived from page views. Missing evidence produces an honest empty/zero result.

- Source: `StorefrontAnalyticsService`
- Test: measured funnel and no-evidence cases
- Failure mode: presenting guessed conversion rates as business facts.

## 234. Bounded daily analytics aggregate

Revenue and order totals are built from bounded daily database aggregates rather
than loading an unbounded event stream into application memory.

- Source: analytics service aggregation paths
- Test: bounded daily aggregate case
- Failure mode: reporting requests becoming unbounded scans.

## 235. Privacy-safe purchase activity projection

Public purchase activity exposes only delivered/completed orders and masks the
customer name to a minimal Unicode-safe representation. Sensitive address and
contact fields are not part of the public projection.

- Source: `purchase-activity.service.ts` and utility
- Test: `purchase-activity.util.spec.ts`
- Failure mode: public social proof exposing customer identity.

## 236. Purchase activity pagination envelope

Purchase activity uses bounded page and limit values, performs count and page
queries together, and returns activity-enabled state with the result envelope.

- Source: `purchase-activity.service.ts` and DTO
- Failure mode: frontend showing public activity when the tenant setting is off.

## 237. Public/admin product-request boundary

Public product-request submission is separated from admin list, status, and
delete operations. Admin routes require role, permission, and tenant membership.

- Source: `product-request.controller.ts`
- Test: `product-request.controller.spec.ts`
- Failure mode: public callers mutating or enumerating internal requests.

## 238. Bounded product-request pagination

Admin request queries normalize page and limit, apply an allowed status filter,
and return a stable count-plus-page envelope. Raw query values do not control
unbounded database work.

- Source: `product-request.service.ts` and DTO
- Failure mode: a public-facing request feature becoming an admin table scan.

## Evidence boundary

Focused tests provide source and unit evidence for these patterns. WebSocket
load/fanout behavior, queue fairness, analytics correctness over production
traffic, and cross-browser SSR integration still require `LOCAL` or `STAGING`
evidence in `FULL-AUDIT-MATRIX.md`.
