# MT-14 Restore Verifier

Date: 2026-09-10

## Delivered

Added `ferio-nest-prisma/scripts/verify-tenant-restore.sh`, a read-only
verification step for an isolated `restore_drill_*` database. It checks:

- required migration, commerce, media, wallet, payment, and reconciliation
  tables;
- non-empty product-media and attachment references;
- relational reachability for order items, payment users, and wallet
  transactions;
- arithmetic consistency for completed wallet credit, debit, and withdrawal
  entries;
- completed migration head and reconciliation-run presence.

The backup/restore runbook now requires this helper and a separate provider
check for external object existence. The helper never writes to the target
database and rejects non-isolated database names.

## Verification

- `bash -n scripts/verify-tenant-restore.sh`: passed;
- invalid target-name rejection: passed;
- live restore execution: not rerun because local PostgreSQL was unavailable on
  the configured development port during this pass.

No restore checklist percentage was claimed from the new helper alone.
