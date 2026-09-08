ALTER TABLE "CourierProviderConfig"
  ADD COLUMN "credentialsRotatedAt" TIMESTAMP(3);

ALTER TABLE "CommercePaymentProviderConfig"
  ADD COLUMN "credentialsRotatedAt" TIMESTAMP(3);
