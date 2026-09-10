DO $$
BEGIN
  IF to_regclass('"CourierProviderConfig"') IS NOT NULL THEN
    ALTER TABLE "CourierProviderConfig"
      ADD COLUMN IF NOT EXISTS "credentialsRotatedAt" TIMESTAMP(3);
  END IF;

  IF to_regclass('"CommercePaymentProviderConfig"') IS NOT NULL THEN
    ALTER TABLE "CommercePaymentProviderConfig"
      ADD COLUMN IF NOT EXISTS "credentialsRotatedAt" TIMESTAMP(3);
  END IF;
END
$$;
