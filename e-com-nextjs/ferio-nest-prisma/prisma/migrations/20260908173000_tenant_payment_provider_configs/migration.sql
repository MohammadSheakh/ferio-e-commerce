CREATE TABLE "CommercePaymentProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "CommercePaymentProvider" NOT NULL,
    "credentialCipher" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercePaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercePaymentProviderConfig_provider_key" ON "CommercePaymentProviderConfig"("provider");
