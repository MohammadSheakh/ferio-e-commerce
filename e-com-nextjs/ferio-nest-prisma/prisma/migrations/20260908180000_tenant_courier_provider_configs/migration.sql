CREATE TABLE "CourierProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "ShipmentProviderCode" NOT NULL,
    "credentialCipher" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourierProviderConfig_provider_key" ON "CourierProviderConfig"("provider");
