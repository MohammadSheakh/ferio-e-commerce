#!/usr/bin/env bash
# MT-12 restore drill helper — ALWAYS restore into an isolated database.
# Usage: ./scripts/restore-tenant.sh <dump-file> <target-database>
set -euo pipefail
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
if [[ -f "$CHECKSUM" ]]; then
  expected="$(awk '{print $1}' "$CHECKSUM")"
  actual="$(sha256sum -- "$DUMP" | awk '{print $1}')"
  if [[ "$expected" != "$actual" ]]; then
    echo "checksum verification failed: $DUMP" >&2
    exit 65
  fi
else
  echo "warning: checksum sidecar is missing: $CHECKSUM" >&2
fi

pg_restore --list "$DUMP" >/dev/null
if ! createdb "$TARGET"; then
  psql --dbname "$TARGET" --command 'SELECT 1' >/dev/null
fi
pg_restore --exit-on-error --no-owner --no-privileges --dbname "$TARGET" "$DUMP"
echo "restored $DUMP -> $TARGET"
echo "verify: psql -d $TARGET -c 'SELECT count(*) FROM \"Order\";'"
