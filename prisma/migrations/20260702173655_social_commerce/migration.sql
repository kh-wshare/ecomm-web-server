-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialPublishStatus" AS ENUM ('PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "targetPlatforms" "SocialPlatform"[],
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoppable_hotspots" (
    "id" UUID NOT NULL,
    "socialPostId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "xPercent" DECIMAL(5,2) NOT NULL,
    "yPercent" DECIMAL(5,2) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shoppable_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_publish_logs" (
    "id" UUID NOT NULL,
    "socialPostId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "SocialPublishStatus" NOT NULL,
    "externalPostId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_articles" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "socialPostId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_posts_merchantId_status_createdAt_idx" ON "social_posts"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_merchantId_slug_key" ON "social_posts"("merchantId", "slug");

-- CreateIndex
CREATE INDEX "shoppable_hotspots_socialPostId_idx" ON "shoppable_hotspots"("socialPostId");

-- CreateIndex
CREATE INDEX "shoppable_hotspots_productId_idx" ON "shoppable_hotspots"("productId");

-- CreateIndex
CREATE INDEX "shoppable_hotspots_variantId_idx" ON "shoppable_hotspots"("variantId");

-- CreateIndex
CREATE INDEX "social_post_publish_logs_socialPostId_platform_createdAt_idx" ON "social_post_publish_logs"("socialPostId", "platform", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "website_articles_socialPostId_key" ON "website_articles"("socialPostId");

-- CreateIndex
CREATE INDEX "website_articles_merchantId_publishedAt_idx" ON "website_articles"("merchantId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "website_articles_merchantId_slug_key" ON "website_articles"("merchantId", "slug");

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoppable_hotspots" ADD CONSTRAINT "shoppable_hotspots_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoppable_hotspots" ADD CONSTRAINT "shoppable_hotspots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoppable_hotspots" ADD CONSTRAINT "shoppable_hotspots_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_publish_logs" ADD CONSTRAINT "social_post_publish_logs_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_articles" ADD CONSTRAINT "website_articles_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_articles" ADD CONSTRAINT "website_articles_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "shoppable_hotspots_post_product_no_variant_key"
ON "shoppable_hotspots"("socialPostId", "productId")
WHERE "variantId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "shoppable_hotspots_post_product_variant_key"
ON "shoppable_hotspots"("socialPostId", "productId", "variantId")
WHERE "variantId" IS NOT NULL;

-- CheckConstraint
ALTER TABLE "social_posts"
ADD CONSTRAINT "social_posts_content_check"
CHECK (length(btrim("title")) > 0 AND length(btrim("content")) > 0);

-- CheckConstraint
ALTER TABLE "shoppable_hotspots"
ADD CONSTRAINT "shoppable_hotspots_coordinates_check"
CHECK (
  "xPercent" >= 0
  AND "xPercent" <= 100
  AND "yPercent" >= 0
  AND "yPercent" <= 100
);
