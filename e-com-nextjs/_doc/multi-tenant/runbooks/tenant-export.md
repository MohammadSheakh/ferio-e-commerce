# Tenant Export Package Runbook

This runbook defines the Release 1 portability package for one tenant. It is
separate from disaster-recovery backups: a backup is optimized for restoring
infrastructure, while this package records its portability scope and schema
version for an owner or controlled support export.

## Package Contract

`ferio-tenant-export-v1` contains:

- `database.dump`: a PostgreSQL custom-format dump of the selected tenant
  database, including tenant business, audit, and financial records;
- `database.dump.sha256`: checksum for the dump;
- `manifest.json`: package format, schema version, scope, timestamp, and media
  inclusion status;
- `README.txt`: human-readable package marker and checksum.

The package does not include media blobs. Media references remain in the
database, while object-storage export requires a separate provider-approved
workflow and is still an open Release 1 operational control.

## Safety Rules

1. Resolve the database name from the trusted platform tenant registry before
   invoking the helper. Never derive it from a browser request, tenant ID, or
   client-provided connection string.
2. Run the helper with a short-lived operator identity and a private output
   directory. The script uses `umask 077` and never prints credentials.
3. Verify the checksum and migration schema version before transferring the
   package.
4. Record the package path, checksum, tenant registry ID, actor, purpose, and
   retention deadline in the platform audit system. Do not put credentials or
   raw customer data in the audit row.
5. Encrypt the package during transfer and at rest. Delete temporary copies
   according to the approved retention policy.

## Command

```bash
./scripts/export-tenant.sh <trusted-database-name> [private-output-dir]
```

The command accepts only a PostgreSQL identifier-shaped database name. It
does not accept a URL, password, or arbitrary schema selector.

The R2 storage strategy separately exposes tenant-prefix listing and batched
deletion for a controlled lifecycle operator. Both operations require the
ambient tenant context and derive `tenants/{organizationId}/` server-side;
they cannot enumerate or delete another tenant's objects or legacy objects.

## Closure Relationship

The package is available before closure, but Release 1 does not yet automate
provider-backed media export, credential revocation, or mandatory export
attestation inside `TenantClosureService`. Those controls remain tracked
separately and must not be inferred from the existence of this helper.
