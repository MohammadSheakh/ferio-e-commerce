#!/usr/bin/env bash
# MT-12 control-plane backup helper (PO-012: RPO<=1h, 30d retention).
# Usage: PLATFORM_DATABASE_URL=... ./scripts/backup-platform.sh [output-dir]
set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "usage: PLATFORM_DATABASE_URL=... $0 [output-dir]" >&2
  exit 64
fi
if [[ -z "${PLATFORM_DATABASE_URL:-}" ]]; then
  echo "PLATFORM_DATABASE_URL is required" >&2
  exit 64
fi

OUT="${1:-./backups}"
umask 077
mkdir -p -- "$OUT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT/platform_control_plane_${STAMP}.dump"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" \
  --dbname="$PLATFORM_DATABASE_URL"
pg_restore --list "$FILE" >/dev/null
CHECKSUM="$(sha256sum -- "$FILE" | awk '{print $1}')"
SCHEMA_VERSION="$(psql --dbname="$PLATFORM_DATABASE_URL" --tuples-only --no-align \
  --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1' | xargs)"
if [[ ! "$SCHEMA_VERSION" =~ ^[0-9]{14}_[A-Za-z0-9_-]+$ ]]; then
  echo "backup verification failed: no completed Prisma migration found" >&2
  exit 74
fi
printf '%s  %s\n' "$CHECKSUM" "$(basename -- "$FILE")" > "$FILE.sha256"
cat > "$FILE.metadata.json" <<EOF
{
  "database": "platform-control-plane",
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
