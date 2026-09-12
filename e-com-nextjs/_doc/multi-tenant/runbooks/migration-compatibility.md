# Migration Compatibility Contract

The tenant migration fleet may contain adjacent schema versions during a
rolling deployment. Every migration created after the compatibility baseline
must declare one of these SQL markers on its first comment line:

- `-- FERIO: EXPAND` — additive schema only; old and new application versions
  can continue to operate during the transition.
- `-- FERIO: COMPATIBLE` — a reviewed change with an explicit compatibility
  rationale in the migration or release notes.
- `-- FERIO: CONTRACT` — destructive cleanup after the old application and
  transition data are no longer served.

`pnpm check:migration-compatibility` enforces the marker and rejects known
destructive SQL without the `CONTRACT` marker. This is a prevention gate, not
proof of a live mixed-version deployment. Before a breaking rollout, run the
old-app/new-schema and new-app/transition-schema integration matrix against
disposable tenant databases and attach the results to the release record.

## Pilot schema freeze

During a controlled pilot, run the compatibility check with
`PILOT_SCHEMA_FREEZE=true`. Any migration containing destructive SQL fails
closed. If a destructive change is genuinely required, the operator must set
`PILOT_SCHEMA_OVERRIDE=true` and provide a specific
`PILOT_SCHEMA_OVERRIDE_REASON` of at least 20 characters; the migration still
requires the `-- FERIO: CONTRACT` marker. The override is an auditable release
decision, not a bypass of migration validation.
