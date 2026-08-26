#!/usr/bin/env bash
# MT-12 restore drill helper — ALWAYS restore into an isolated database.
# Usage: ./scripts/restore-tenant.sh <dump-file> <target-database>
set -euo pipefail
DUMP="${1:?dump file required}"
TARGET="${2:?target database required}"
createdb "$TARGET" 2>/dev/null || true
pg_restore --no-owner --dbname "$TARGET" "$DUMP"
echo "restored $DUMP -> $TARGET"
echo "verify: psql -d $TARGET -c 'SELECT count(*) FROM \"Order\";'"
