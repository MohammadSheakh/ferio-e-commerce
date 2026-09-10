#!/usr/bin/env bash
# MT-12 restore drill helper — ALWAYS restore into a new isolated database.
# Usage: ./scripts/restore-tenant.sh <dump-file> <target-database>
set -euo pipefail
umask 077
if [[ $# -ne 2 ]]; then
  echo "usage: $0 <dump-file> <restore_drill_database>" >&2
  exit 64
fi

DUMP="$1"
TARGET="$2"

if [[ ! -f "$DUMP" ]]; then
  echo "dump file does not exist: $DUMP" >&2
  exit 66
fi
if [[ ! "$TARGET" =~ ^restore_drill_[A-Za-z0-9_]+$ ]]; then
  echo "target database must use the isolated restore_drill_<name> format" >&2
  exit 64
fi

CHECKSUM="$DUMP.sha256"
if [[ ! -f "$CHECKSUM" ]]; then
  echo "checksum sidecar is required: $CHECKSUM" >&2
  exit 65
fi

expected="$(awk '{print $1}' "$CHECKSUM")"
actual="$(sha256sum -- "$DUMP" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  echo "checksum verification failed: $DUMP" >&2
  exit 65
fi

pg_restore --list "$DUMP" >/dev/null
if psql --dbname="${PGMAINTENANCE_DB:-postgres}" --tuples-only --no-align \
  --command="SELECT 1 FROM pg_database WHERE datname = '$TARGET'" | grep -qx '1'; then
  echo "refusing to restore into an existing database: $TARGET" >&2
  exit 73
fi
createdb "$TARGET"
# Render SQL before execution so the helper can remove session settings added
# by a newer pg_dump client than the target PostgreSQL server supports.
RESTORE_SQL="$(mktemp)"
trap 'rm -f -- "$RESTORE_SQL"' EXIT
pg_restore --no-owner --no-privileges --file="$RESTORE_SQL" "$DUMP"
sed -i '/^SET transaction_timeout = 0;$/d' "$RESTORE_SQL"
psql --dbname "$TARGET" --set ON_ERROR_STOP=1 --file="$RESTORE_SQL"
schema_version="$(psql --dbname "$TARGET" --tuples-only --no-align \
  --command='SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1' | xargs)"
if [[ ! "$schema_version" =~ ^[0-9]{14}_[A-Za-z0-9_-]+$ ]]; then
  echo "restore verification failed: no completed Prisma migration found" >&2
  exit 74
fi
echo "restored $DUMP -> $TARGET"
echo "schema_version $schema_version"
echo "verify: psql -d $TARGET -c 'SELECT count(*) FROM \"Order\";'"
