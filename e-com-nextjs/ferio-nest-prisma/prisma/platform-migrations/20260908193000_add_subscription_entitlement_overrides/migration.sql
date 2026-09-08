CREATE TABLE "SubscriptionEntitlementOverride" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit" INTEGER,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEntitlementOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionEntitlementOverride_subscriptionId_featureKey_key"
ON "SubscriptionEntitlementOverride"("subscriptionId", "featureKey");

CREATE INDEX "SubscriptionEntitlementOverride_subscriptionId_expiresAt_idx"
ON "SubscriptionEntitlementOverride"("subscriptionId", "expiresAt");

CREATE INDEX "SubscriptionEntitlementOverride_expiresAt_idx"
ON "SubscriptionEntitlementOverride"("expiresAt");

ALTER TABLE "SubscriptionEntitlementOverride"
ADD CONSTRAINT "SubscriptionEntitlementOverride_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
