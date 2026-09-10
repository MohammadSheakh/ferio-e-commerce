# MT-14 Release Gate Reconciliation

Date: 2026-09-10

## Compatibility matrix gate

The current compatibility baseline is `20260910100000`. The only
post-baseline migration currently present is the additive
`20260910100000_backup_evidence` migration, marked `-- FERIO: EXPAND`.
There is no breaking transition-schema rollout in the current Release 1
artifact set that requires an old-app/new-schema runtime matrix today.

The prevention gate remains mandatory through:

- `pnpm run check:migration-compatibility`;
- expand/compatible/contract markers on post-baseline migration artifacts;
- the migration rollback/forward-fix runbook, which requires a disposable
  mixed-version matrix before any future breaking rollout.

## Internal-alpha tenant restore exercise

The recorded 2026-09-10 local PostgreSQL drill backed up `ferio_test_runner`,
verified its checksum and schema head, restored it into isolated
`restore_drill_20260910`, and verified the restored migration ledger and
representative tenant counts. The target database was new and isolated from
the source.

This satisfies the internal-alpha tenant backup/restore exercise. It does not
claim managed-provider scheduling, PITR, production secret management, or the
full production launch gate.
