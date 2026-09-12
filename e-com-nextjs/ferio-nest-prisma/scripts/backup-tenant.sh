#!/usr/bin/env bash
# MT-12 backup runbook helper (PO-012: RPO<=1h, 30d retention).
# Usage: ./scripts/backup-tenant.sh <database-name> [output-dir]
set -euo pipefail
if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <database-name> [output-dir]" >&2
  exit 64
fi

DB="$1"
OUT="${2:-./backups}"

if [[ ! "$DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "database name must be a simple PostgreSQL identifier" >&2
  exit 64
fi

umask 077
mkdir -p -- "$OUT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT/${DB}_${STAMP}.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" --dbname="$DB"
pg_restore --list "$FILE" >/dev/null
CHECKSUM="$(sha256sum -- "$FILE" | awk '{print $1}')"
SCHEMA_VERSION="$(psql --dbname="$DB" --tuples-only --no-align \
  --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1' | xargs)"
if [[ ! "$SCHEMA_VERSION" =~ ^[0-9]{14}_[A-Za-z0-9_-]+$ ]]; then
  echo "backup verification failed: no completed Prisma migration found" >&2
  exit 74
fi
printf '%s  %s\n' "$CHECKSUM" "$(basename -- "$FILE")" > "$FILE.sha256"
cat > "$FILE.metadata.json" <<EOF
{
  "database": "$DB",
  "createdAt": "$STAMP",
  "format": "custom",
  "sha256": "$CHECKSUM",
  "schemaVersion": "$SCHEMA_VERSION",
  "sizeBytes": $(stat -c%s -- "$FILE")
}
EOF
echo "backup_written $FILE $(stat -c%s -- "$FILE")"
echo "checksum_written $FILE.sha256"
echo "metadata_written $FILE.metadata.json"
