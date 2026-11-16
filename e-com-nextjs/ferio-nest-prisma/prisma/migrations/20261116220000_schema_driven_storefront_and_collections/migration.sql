-- CreateEnum
CREATE TYPE "StorefrontPageType" AS ENUM ('HOME', 'COLLECTION_LANDING', 'CUSTOM_PAGE');

-- CreateEnum
CREATE TYPE "StorefrontSectionType" AS ENUM ('HERO_SHOWCASE', 'CATEGORY_GRID', 'PRODUCT_GRID', 'PRODUCT_CAROUSEL', 'PROMOTIONAL_BANNER', 'PRODUCT_REQUEST_BANNER', 'FEEDBACK_BANNER', 'BRAND_SHOWCASE', 'TEXT_WITH_IMAGE', 'FLASH_SALE');

-- CreateEnum
CREATE TYPE "ProductSourceType" AS ENUM ('MANUAL_SELECTION', 'COLLECTION', 'LATEST_PRODUCTS', 'BEST_SELLERS', 'FLASH_SALE', 'ACTIVE_DISCOUNTS');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "CollectionRuleField" AS ENUM ('TITLE', 'CATEGORY_ID', 'BRAND_ID', 'PRICE', 'STOCK_QUANTITY', 'TAG');

-- CreateEnum
CREATE TYPE "CollectionRuleOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN_OR_EQUAL', 'CONTAINS', 'IN_LIST');

-- CreateTable
CREATE TABLE "StorefrontPage" (
    "id" TEXT NOT NULL,
    "type" "StorefrontPageType" NOT NULL DEFAULT 'HOME',
    "slug" TEXT NOT NULL DEFAULT 'home',
    "title" TEXT NOT NULL DEFAULT 'Home',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontPageVersion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontSection" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" "StorefrontSectionType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL,
    "dataSource" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "bannerImageUrl" TEXT,
    "type" "CollectionType" NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "matchMode" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCollectionRule" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "field" "CollectionRuleField" NOT NULL,
    "operator" "CollectionRuleOperator" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontPublicationAudit" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorefrontPublicationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontPage_slug_key" ON "StorefrontPage"("slug");

-- CreateIndex
CREATE INDEX "StorefrontPage_type_slug_idx" ON "StorefrontPage"("type", "slug");

-- CreateIndex
CREATE INDEX "StorefrontPageVersion_pageId_isPublished_idx" ON "StorefrontPageVersion"("pageId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontPageVersion_pageId_versionNumber_key" ON "StorefrontPageVersion"("pageId", "versionNumber");

-- CreateIndex
CREATE INDEX "StorefrontSection_versionId_sortOrder_idx" ON "StorefrontSection"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "StorefrontSection_versionId_enabled_idx" ON "StorefrontSection"("versionId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_slug_key" ON "ProductCollection"("slug");

-- CreateIndex
CREATE INDEX "ProductCollection_isActive_slug_idx" ON "ProductCollection"("isActive", "slug");

-- CreateIndex
CREATE INDEX "ProductCollection_name_idx" ON "ProductCollection"("name");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_collectionId_sortOrder_idx" ON "ProductCollectionItem"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductCollectionItem_productId_idx" ON "ProductCollectionItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollectionItem_collectionId_productId_key" ON "ProductCollectionItem"("collectionId", "productId");

-- CreateIndex
CREATE INDEX "ProductCollectionRule_collectionId_idx" ON "ProductCollectionRule"("collectionId");

-- CreateIndex
CREATE INDEX "StorefrontPublicationAudit_pageId_createdAt_idx" ON "StorefrontPublicationAudit"("pageId", "createdAt");

-- AddForeignKey
ALTER TABLE "StorefrontPage" ADD CONSTRAINT "StorefrontPage_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "StorefrontPageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontPageVersion" ADD CONSTRAINT "StorefrontPageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "StorefrontPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontSection" ADD CONSTRAINT "StorefrontSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "StorefrontPageVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionItem" ADD CONSTRAINT "ProductCollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollectionRule" ADD CONSTRAINT "ProductCollectionRule_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

