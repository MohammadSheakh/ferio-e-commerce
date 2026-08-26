ALTER TYPE "StorefrontAnalyticsEventType" ADD VALUE 'CHECKOUT_BEGIN';

ALTER TABLE "StorefrontAnalyticsEvent"
ADD COLUMN "searchResultCount" INTEGER;

ALTER TABLE "StorefrontAnalyticsEvent"
ADD CONSTRAINT "StorefrontAnalyticsEvent_searchResultCount_check"
CHECK ("searchResultCount" IS NULL OR "searchResultCount" BETWEEN 0 AND 1000000);

CREATE INDEX "StorefrontAnalyticsEvent_type_searchResultCount_createdAt_idx"
ON "StorefrontAnalyticsEvent"("type", "searchResultCount", "createdAt");
