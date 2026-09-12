# Tenant-admin chat API integration shot 31

Date: 2026-09-11

## Scope

Audited the tenant-admin live chat dashboard, conversation/message-history
BFFs, Socket.IO ticket flow, conversation/message controllers, and tenant-scoped
gateway events.

## Finding and change

- The conversation-list and message-history BFF handlers manually read the
  short-lived `ferio_admin_access` cookie. Unlike the socket-ticket route and
  the rest of the admin BFF, they did not use the shared `adminApi` refresh
  path. Chat history could therefore fail after access expiry despite a valid
  admin refresh cookie.
- Both handlers now use `adminApi`, preserving centralized admin refresh,
  tenant-host forwarding, correlation IDs, envelope parsing, and error mapping.
- Verified the dashboard's websocket ticket, room join, history, and reply
  event names against the NestJS controllers/gateway. The gateway persists
  socket messages and scopes rooms by organization.
- Corrected chat documentation to the actual `/conversations/all` and
  `/conversations/:id/messages` contracts and marked REST edit/delete and
  participant endpoints as not used by the current dashboard.

## Verification

- Tenant-admin `pnpm api:check`: passed.
- Tenant-admin `pnpm exec tsc --noEmit`: passed.
- Tenant-admin `pnpm lint`: passed with existing hook-dependency and image
  warnings only.

## Remaining runtime proof

Access-token refresh, admin permission denial, WebSocket reconnect, tenant room
isolation, message persistence, and multi-tenant live chat behavior still need
runtime evidence with the Docker/application stack or staging tunnel. Redis and
mobile code were not changed.
