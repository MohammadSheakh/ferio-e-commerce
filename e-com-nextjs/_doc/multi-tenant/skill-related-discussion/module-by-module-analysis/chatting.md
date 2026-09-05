# Chatting Module

## Scope

Conversations, participants, messages, read status, notifications, and
transactional chat queue work.

## Architecture Score

**61%**. Authorization intent and tenant-aware service migration are visible,
but this module carries the largest confirmed scalability and worker risks.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /conversations/all` | 65% | Requires strict membership and bounded pagination. |
| `POST /conversations` | 58% | Conversation/participants/initial message must be atomic and duplicate-safe. |
| `GET /conversations/my` | 68% | Ownership/membership intent is good; verify cursor indexes. |
| `POST /conversations/participants/add` | 65% | Must enforce admin/member policy and duplicate constraints. |
| `POST /conversations/participants/remove` | 65% | Protect owner/admin invariants and audit membership changes. |
| `GET /conversations/participants` | 70% | Scope by conversation membership and bound results. |
| `POST /conversations/:conversationId/read` | 72% | Good state mutation candidate; test idempotency. |
| `GET /conversations/:conversationId/messages` | 55% | Legacy pagination path lacks strong numeric bounds. |
| `GET /conversations/:conversationId/messages/cursor` | 65% | Better direction, but DTO validation and indexes must be verified. |
| `POST /conversations/:conversationId/messages` | 62% | Must atomically persist message and enqueue tenant-stamped work. |
| `PUT /conversations/messages/:messageId` | 62% | Ownership/edit window and tenant scope require tests. |
| `DELETE /conversations/messages/:messageId` | 62% | Soft-delete/audit semantics need explicit contract. |
| `GET /conversations/messages/:messageId/unread-count` | 68% | Bound and authorize message lookup before counting. |

## Confirmed Issues

- Historical unbounded direct-conversation lookup and race-prone creation.
- Queue envelopes historically lacked organization identity.
- Legacy processors compete with active Prisma/BullMQ paths.
- Dynamic socket/message types remain excluded from strict checks.

## Tasks

1. Enforce tenant-stamped queue envelopes and active processor ownership.
2. Add a database-backed direct-conversation uniqueness strategy.
3. Use cursor pagination with composite conversation/time indexes.
4. Add concurrency, cross-tenant, membership, and queue retry tests.
