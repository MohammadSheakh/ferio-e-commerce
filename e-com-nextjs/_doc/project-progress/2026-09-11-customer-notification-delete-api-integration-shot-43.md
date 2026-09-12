# Customer notification deletion API integration shot 43

Date: 2026-09-11

## Scope

Audited the customer notification inbox, header unread-count badge, BFF route
handlers, session transport, NestJS notification controller/service, generated
OpenAPI contract, and account API documentation.

## Finding and change

- The authenticated backend and BFF already exposed
  `DELETE /account/notifications/:id`, but the notification inbox had no
  browser action for it.
- Added a delete action that waits for the server response before removing the
  item and adjusts total/unread pagination state safely.
- Confirmed unread-count is already integrated by `HeaderAccountNav`; mark-one,
  mark-all, list pagination, refresh retry, and tenant-host forwarding remain
  routed through the existing customer-session BFF boundary.

## Verification

- Customer OpenAPI drift check passed.
- Customer TypeScript check passed.
- Customer lint passed with existing image warnings and the existing Node
  engine warning.

## Remaining runtime proof

Live authenticated deletion, ownership denial for another customer's
notification ID, refresh-cookie replay, tenant-host forwarding, unread-count
consistency across tabs, and browser evidence remain open until the local
PostgreSQL and application stack is running. No mobile or Redis code was
changed.
