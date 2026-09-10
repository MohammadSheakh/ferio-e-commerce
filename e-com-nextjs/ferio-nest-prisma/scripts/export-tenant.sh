#!/usr/bin/env bash
# MT-12 tenant export package helper.
# Usage: ./scripts/export-tenant.sh <database-name> [output-dir]
#
# The package is a database-native export of one tenant's business, audit, and
# financial records. It never accepts a connection string, credentials, or
# organization ID as a routing input. Media blobs are intentionally separate.
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <database-name> [output-dir]" >&2
  exit 64
fi

DB="$1"
OUT="${2:-./exports}"

if [[ ! "$DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "database name must be a simple PostgreSQL identifier" >&2
  exit 64
fi

umask 077
mkdir -p -- "$OUT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PACKAGE="$OUT/${DB}_${STAMP}.tenant-export"
mkdir -p -- "$PACKAGE"

FILE="$PACKAGE/database.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" --dbname="$DB"
pg_restore --list "$FILE" >/dev/null

CHECKSUM="$(sha256sum -- "$FILE" | awk '{print $1}')"
SCHEMA_VERSION="$(psql --dbname="$DB" --tuples-only --no-align \
  --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1' | xargs)"
if [[ -z "$SCHEMA_VERSION" ]]; then
  echo "export verification failed: no completed Prisma migration found" >&2
  exit 74
fi

cat > "$PACKAGE/manifest.json" <<EOF
{
  "format": "ferio-tenant-export-v1",
  "purpose": "tenant-data-portability",
  "database": "$DB",
  "createdAt": "$STAMP",
  "schemaVersion": "$SCHEMA_VERSION",
  "databaseDump": "database.dump",
  "databaseDumpSha256": "$CHECKSUM",
  "scope": ["tenant-business-data", "tenant-audit-data", "tenant-financial-data"],
  "media": "not-included"
}
EOF

printf '%s  %s\n' "$CHECKSUM" "database.dump" > "$PACKAGE/database.dump.sha256"
printf 'ferio-tenant-export-v1\n%s\n' "$CHECKSUM" > "$PACKAGE/README.txt"

echo "tenant_export_written $PACKAGE"
echo "manifest_written $PACKAGE/manifest.json"
