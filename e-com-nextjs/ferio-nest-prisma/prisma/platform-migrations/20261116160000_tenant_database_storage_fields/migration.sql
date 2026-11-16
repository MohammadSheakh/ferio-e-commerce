-- AlterTable: Add on-demand physical storage measurement fields to TenantDatabase
ALTER TABLE "TenantDatabase" ADD COLUMN IF NOT EXISTS "diskSizeBytes" BIGINT;
ALTER TABLE "TenantDatabase" ADD COLUMN IF NOT EXISTS "diskSizeRecordedAt" TIMESTAMP(3);

