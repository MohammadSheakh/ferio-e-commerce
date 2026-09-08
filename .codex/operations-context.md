# Operations Context

Use this document for running, validating, and shipping the monorepo projects.

## References

- [Updated Docker commands](../e-com-nextjs/_doc/multi-tenant/commands/updated_commands.md)
- [Backup and restore runbook](../e-com-nextjs/_doc/multi-tenant/runbooks/backup-restore.md)
- [API documentation](../e-com-nextjs/_doc/multi-tenant/api-documentation/README.md)
- [Git commit and push skill](../e-com-nextjs/.agents/skills/git-commit-push/SKILL.md)

## Rules

- Inspect `.env.example`, compose files, and package scripts before inventing commands.
- Keep platform PostgreSQL and tenant database behavior explicit; never assume the active database.
- Never commit secrets, real credentials, private keys, or local environment files.
- Prefer reproducible Docker and package scripts over ad-hoc commands.
- After meaningful changes, run the narrowest useful checks first, then broader checks for cross-project changes.
- Review `git diff`, `git status`, and the final commit scope before pushing.
- Do not include unrelated user changes in a commit.
