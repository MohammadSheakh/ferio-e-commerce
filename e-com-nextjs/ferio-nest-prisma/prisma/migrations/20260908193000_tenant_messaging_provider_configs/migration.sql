CREATE TABLE "CommerceMessagingProviderConfig" (
    "id" TEXT NOT NULL,
    "channel" "CommerceMessageChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "credentialCipher" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceMessagingProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommerceMessagingProviderConfig_channel_key" ON "CommerceMessagingProviderConfig"("channel");
