# Ferio Project Progress 83

**Checkpoint date:** August 21, 2026  
**Milestone:** Versioned transactional notification templates  
**Status:** Admin-managed Release 1 message templates and immutable outbox snapshots are complete; real provider activation remains credential-gated.

## Delivered

### Versioned template contract

- Added one managed template for every supported order and shipment event.
- Added strict, event-specific placeholder allowlists instead of arbitrary template execution.
- Rejects malformed or unknown placeholders and empty message bodies.
- Supports independently enabling or disabling each transactional event.

### Immutable message evidence

- Copies the template version, rendered subject, and rendered body into each durable outbox row when queued.
- Keeps historical queued and sent content unchanged when an Admin edits the current template.
- Passes the rendered snapshot and version to provider-neutral channel adapters.
- Records the template version in each provider-attempt request evidence record.

### Admin and governance

- Added read and update endpoints behind `messaging.read` and `messaging.manage` permissions.
- Audits each template update with actor and safe previous/new values.
- Added a restrained template editor to the Messages workspace with event selection, approved placeholders, enable control, and explicit versioning.
- Shows the immutable template version and rendered message evidence in the outbox table.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Template renderer, validation, versioning, snapshot, and dispatcher suites | Passed; 10 tests |
| Backend | Prisma schema generation | Passed |
| Backend | Complete NestJS application and library build | Passed |
| Admin Web | Next.js production build and type validation | Passed; 90 routes generated |

## Remaining Boundary

- Apply the new Prisma migration during deployment.
- Production WhatsApp, SMS, and email dispatch stays disabled until an approved provider adapter and credentials pass sandbox verification.
