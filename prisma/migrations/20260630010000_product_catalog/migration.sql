CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "ProductVariantStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ProductMediaType" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "SalesChannel" AS ENUM ('POS', 'WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK');

CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "attributes" JSONB NOT NULL,
    "status" "ProductVariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ProductMediaType" NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_channel_visibility" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_channel_visibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_merchantId_sku_key" ON "products"("merchantId", "sku");
CREATE UNIQUE INDEX "products_merchantId_slug_key" ON "products"("merchantId", "slug");
CREATE UNIQUE INDEX "products_id_merchantId_key" ON "products"("id", "merchantId");
CREATE INDEX "products_merchantId_status_deletedAt_idx" ON "products"("merchantId", "status", "deletedAt");
CREATE UNIQUE INDEX "product_variants_merchantId_sku_key" ON "product_variants"("merchantId", "sku");
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");
CREATE INDEX "product_media_productId_sortOrder_idx" ON "product_media"("productId", "sortOrder");
CREATE UNIQUE INDEX "product_channel_visibility_productId_channel_key" ON "product_channel_visibility"("productId", "channel");
CREATE INDEX "product_channel_visibility_productId_idx" ON "product_channel_visibility"("productId");

ALTER TABLE "products" ADD CONSTRAINT "products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_merchantId_fkey" FOREIGN KEY ("productId", "merchantId") REFERENCES "products"("id", "merchantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_channel_visibility" ADD CONSTRAINT "product_channel_visibility_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
