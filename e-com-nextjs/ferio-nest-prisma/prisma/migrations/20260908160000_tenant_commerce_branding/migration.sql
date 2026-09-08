ALTER TABLE "CommerceSettings"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "facebookUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "whatsappUrl" TEXT,
  ADD COLUMN "themePreset" TEXT NOT NULL DEFAULT 'default';
