# MT-12 Restored Media Reference Verification

## Reconciled control

Added `scripts/verify-tenant-media.sh` for provider-backed restore checks:

- It accepts only an isolated `restore_drill_*` database and a trusted
  organization identifier.
- It reads `ProductMedia.url` and `Attachment.attachment` references without
  mutating the restore database.
- Every reference must resolve to the tenant namespace
  `tenants/{organizationId}/`; legacy or foreign references fail closed.
- Each derived key is checked with a read-only R2 `s3api head-object` call.

The script requires operator-managed `R2_BUCKET` and `R2_ENDPOINT_URL`
configuration and never accepts credentials as positional arguments. It does
not delete or rewrite objects.
