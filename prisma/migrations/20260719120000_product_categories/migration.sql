CREATE TYPE "ProductCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "products" ADD COLUMN "categoryId" UUID;

CREATE UNIQUE INDEX "product_categories_merchantId_slug_key" ON "product_categories"("merchantId", "slug");
CREATE INDEX "product_categories_merchantId_status_deletedAt_idx" ON "product_categories"("merchantId", "status", "deletedAt");
CREATE INDEX "product_categories_merchantId_sortOrder_idx" ON "product_categories"("merchantId", "sortOrder");
CREATE INDEX "products_merchantId_categoryId_idx" ON "products"("merchantId", "categoryId");

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
