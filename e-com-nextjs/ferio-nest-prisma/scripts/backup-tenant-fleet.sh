#!/usr/bin/env bash
# MT-12 tenant fleet backup helper (PO-012: RPO<=1h, 30d retention).
# Usage: PLATFORM_DATABASE_URL=... PGSERVICE=... ./scripts/backup-tenant-fleet.sh [output-dir]
set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "usage: PLATFORM_DATABASE_URL=... PGSERVICE=... $0 [output-dir]" >&2
  exit 64
fi
if [[ -z "${PLATFORM_DATABASE_URL:-}" ]]; then
  echo "PLATFORM_DATABASE_URL is required" >&2
  exit 64
fi
if [[ -z "${PGSERVICE:-}" ]]; then
  echo "PGSERVICE is required for tenant database dumps" >&2
  exit 64
fi

OUT="${1:-./backups}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REGISTRY_FILE="$(mktemp)"
trap 'rm -f -- "$REGISTRY_FILE"' EXIT

umask 077
mkdir -p -- "$OUT"
psql --dbname="$PLATFORM_DATABASE_URL" --tuples-only --no-align \
  --field-separator=$'\t' \
  --command='SELECT o.id, t."databaseName"
    FROM "TenantDatabase" t
    JOIN "Organization" o ON o.id = t."organizationId"
    WHERE t.status = '\''READY'\'' AND o.status = '\''ACTIVE'\''
    ORDER BY o.id' > "$REGISTRY_FILE"

backed_up=0
while IFS=$'\t' read -r organization_id database_name; do
  [[ -z "$organization_id" && -z "$database_name" ]] && continue
  if [[ ! "$organization_id" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "invalid organization id from tenant registry" >&2
    exit 65
  fi
  if [[ ! "$database_name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "invalid database name from tenant registry: $database_name" >&2
    exit 65
  fi
  "$SCRIPT_DIR/backup-tenant.sh" "$database_name" "$OUT/$organization_id"
  backed_up=$((backed_up + 1))
done < "$REGISTRY_FILE"

if (( backed_up == 0 )); then
  echo "no active READY tenant databases found" >&2
  exit 66
fi

echo "tenant_backups_written $backed_up"
