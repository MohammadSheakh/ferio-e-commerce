ALTER TABLE "TenantMigrationRun"
ADD COLUMN "canaryOrganizationId" TEXT;

CREATE INDEX "TenantMigrationRun_canaryOrganizationId_idx"
ON "TenantMigrationRun"("canaryOrganizationId");
