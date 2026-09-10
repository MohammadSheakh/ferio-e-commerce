#!/usr/bin/env bash
# Configure private R2 object retention for tenant media (PO-012/PO-013).
# Credentials must come from the AWS CLI environment or a configured profile.
# Usage: ./scripts/configure-r2-lifecycle.sh [retention-days]
set -euo pipefail

RETENTION_DAYS="${1:-30}"
if [[ ! "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]]; then
  echo "retention days must be a positive integer" >&2
  exit 64
fi
if [[ "$RETENTION_DAYS" -gt 3650 ]]; then
  echo "retention days exceeds the supported ten-year safety bound" >&2
  exit 64
fi
if [[ -z "${R2_BUCKET:-}" || -z "${R2_ENDPOINT_URL:-}" ]]; then
  echo "R2_BUCKET and R2_ENDPOINT_URL are required" >&2
  exit 64
fi

CONFIG=$(cat <<EOF
{
  "Rules": [
    {
      "ID": "ferio-tenant-media-retention",
      "Status": "Enabled",
      "Filter": {"Prefix": "tenants/"},
      "Expiration": {"Days": $RETENTION_DAYS}
    }
  ]
}
EOF
)

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$R2_BUCKET" \
  --endpoint-url "$R2_ENDPOINT_URL" \
  --lifecycle-configuration "$CONFIG"
echo "r2_lifecycle_configured bucket=$R2_BUCKET prefix=tenants/ retention_days=$RETENTION_DAYS"
