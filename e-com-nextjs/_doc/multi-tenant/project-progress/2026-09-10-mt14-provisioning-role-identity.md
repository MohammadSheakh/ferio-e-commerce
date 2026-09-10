# MT-14 Provisioning Role Identity

Date: 2026-09-10

`LocalPostgresProvisioner` now derives tenant role names from the full
organization ID using a deterministic 24-hex SHA-256 suffix:

```text
tenant_<24 hex characters>
```

This keeps PostgreSQL identifiers short and safe while avoiding the previous
collision domain created by using only the final eight organization-ID
characters. Retries still reconcile an already-existing role password before
registering credentials.

This is local-executor hardening. Managed-provider provisioning, orphan-role
cleanup, and production hosting evidence remain separate Release 1 gates.
