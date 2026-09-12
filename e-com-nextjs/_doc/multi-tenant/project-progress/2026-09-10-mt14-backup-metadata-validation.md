# MT-14 Backup Metadata Validation

Date: 2026-09-10

The platform backup, tenant backup, tenant export, restore, and restore
verification helpers now validate the completed Prisma migration head before
including it in metadata or reporting it as restore evidence. Accepted values
must match a 14-digit migration timestamp followed by an ASCII migration name
containing only letters, digits, underscores, or hyphens.

Malformed, empty, or control-character values fail closed with the existing
verification error code. This prevents malformed metadata from being treated
as schema evidence.

Focused backup/restore contract tests and shell parsing checks cover the
boundary. Secret-manager integration, managed-provider scheduling/PITR, and
live restore execution remain separate Release 1 work.
