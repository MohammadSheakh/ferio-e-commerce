#!/usr/bin/env bash
# MT-12 provider-backed media verification helper.
# Usage: R2_BUCKET=... R2_ENDPOINT_URL=... ./scripts/verify-tenant-media.sh <restore-db> <organization-id>
set -euo pipefail
umask 077

if [[ $# -ne 2 ]]; then
  echo "usage: R2_BUCKET=... R2_ENDPOINT_URL=... $0 <restore_drill_database> <organization-id>" >&2
  exit 64
fi

DB="$1"
ORGANIZATION_ID="$2"
if [[ ! "$DB" =~ ^restore_drill_[A-Za-z0-9_]+$ ]]; then
  echo "database must use the isolated restore_drill_<name> format" >&2
  exit 64
fi
if [[ ! "$ORGANIZATION_ID" =~ ^[A-Za-z0-9_-]{1,128}$ ]]; then
  echo "organization ID must be a simple trusted identifier" >&2
  exit 64
fi
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ENDPOINT_URL:?R2_ENDPOINT_URL is required}"
command -v aws >/dev/null || {
  echo "aws CLI is required" >&2
  exit 69
}

PSQL=(psql --dbname="$DB" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1)
references_file="$(mktemp)"
trap 'rm -f -- "$references_file"' EXIT

"${PSQL[@]}" --command='SELECT "url" FROM "ProductMedia" UNION ALL SELECT "attachment" FROM "Attachment"' \
  > "$references_file"

checked=0
while IFS= read -r reference; do
  reference="${reference//$'\r'/}"
  [[ -z "$reference" ]] && continue
  prefix="tenants/${ORGANIZATION_ID}/"
  case "$reference" in
    *"$prefix"*)
      key="${reference#*"$prefix"}"
      key="$prefix${key%%\?*}"
      ;;
    *)
      echo "media reference is outside the tenant object namespace: $reference" >&2
      exit 74
      ;;
  esac
  [[ "$key" == "$prefix" ]] && {
    echo "media reference has no object key: $reference" >&2
    exit 74
  }
  AWS_PAGER="" aws --endpoint-url "$R2_ENDPOINT_URL" s3api head-object \
    --bucket "$R2_BUCKET" --key "$key" >/dev/null
  checked=$((checked + 1))
done < "$references_file"

echo "media_references_verified $checked"
