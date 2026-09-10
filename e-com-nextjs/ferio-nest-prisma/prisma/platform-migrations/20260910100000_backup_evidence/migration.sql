-- Durable, secret-free evidence for operator backup and restore runs.
CREATE TYPE "BackupEvidenceScope" AS ENUM ('CONTROL_PLANE', 'TENANT');
CREATE TYPE "BackupEvidenceStatus" AS ENUM ('VERIFIED', 'FAILED');

CREATE TABLE "BackupEvidence" (
    "id" TEXT NOT NULL,
    "scope" "BackupEvidenceScope" NOT NULL,
    "organizationId" TEXT,
    "databaseName" TEXT NOT NULL,
    "artifactName" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "schemaVersion" TEXT,
    "status" "BackupEvidenceStatus" NOT NULL DEFAULT 'VERIFIED',
    "completedAt" TIMESTAMP(3) NOT NULL,
    "restoreVerifiedAt" TIMESTAMP(3),
    "protectedAt" TIMESTAMP(3),
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupEvidence_scope_status_completedAt_idx"
ON "BackupEvidence"("scope", "status", "completedAt");

CREATE INDEX "BackupEvidence_organizationId_completedAt_idx"
ON "BackupEvidence"("organizationId", "completedAt");
