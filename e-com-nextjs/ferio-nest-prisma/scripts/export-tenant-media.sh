#!/usr/bin/env bash
# MT-12 tenant media portability sidecar.
# Usage: ./scripts/export-tenant-media.sh <organization-id> <output-dir>
#
# The organization ID must come from the trusted platform tenant registry. The
# script never accepts a client-selected object prefix or arbitrary URI.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <organization-id> <output-dir>" >&2
  exit 64
fi

ORGANIZATION_ID="$1"
OUT="$2"
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

umask 077
PACKAGE="$OUT/tenant-media-export"
MEDIA_DIR="$PACKAGE/media"
if [[ -e "$PACKAGE" ]]; then
  echo "refusing to overwrite an existing media export directory" >&2
  exit 73
fi
mkdir -p -- "$MEDIA_DIR"

PREFIX="tenants/${ORGANIZATION_ID}/"
AWS_PAGER="" aws --endpoint-url "$R2_ENDPOINT_URL" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" \
  --prefix "$PREFIX" \
  --output json > "$PACKAGE/object-keys.json"

AWS_PAGER="" aws --endpoint-url "$R2_ENDPOINT_URL" s3 sync \
  "s3://${R2_BUCKET}/${PREFIX}" "$MEDIA_DIR/" \
  --only-show-errors

if find "$MEDIA_DIR" -type f -print -quit | grep -q .; then
  while IFS= read -r -d '' file; do
    sha256sum -- "$file"
  done < <(find "$MEDIA_DIR" -type f -print0 | sort -z) \
    > "$PACKAGE/media.sha256"
else
  : > "$PACKAGE/media.sha256"
fi

FILE_COUNT="$(find "$MEDIA_DIR" -type f | wc -l | tr -d ' ')"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
cat > "$PACKAGE/manifest.json" <<EOF
{
  "format": "ferio-tenant-media-export-v1",
  "organizationId": "$ORGANIZATION_ID",
  "createdAt": "$STAMP",
  "objectPrefix": "$PREFIX",
  "fileCount": $FILE_COUNT,
  "objectKeys": "object-keys.json",
  "mediaChecksums": "media.sha256"
}
EOF

echo "tenant_media_export_written $PACKAGE"
echo "manifest_written $PACKAGE/manifest.json"
