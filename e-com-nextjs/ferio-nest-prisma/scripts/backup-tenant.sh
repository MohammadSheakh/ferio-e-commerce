#!/usr/bin/env bash
# MT-12 backup runbook helper (PO-012: RPO<=1h, 30d retention).
# Usage: ./scripts/backup-tenant.sh <database-name> [output-dir]
set -euo pipefail
DB="${1:?database name required}"
OUT="${2:-./backups}"
mkdir -p "$OUT"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT/${DB}_${STAMP}.dump"
pg_dump --format=custom --no-owner "$DB" > "$FILE"
echo "backup_written $FILE $(stat -c%s "$FILE")"
