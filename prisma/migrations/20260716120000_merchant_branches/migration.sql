CREATE TYPE "MerchantBranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "merchant_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "registerName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "MerchantBranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "merchant_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_branches_merchantId_code_key" ON "merchant_branches"("merchantId", "code");
CREATE INDEX "merchant_branches_merchantId_status_deletedAt_idx" ON "merchant_branches"("merchantId", "status", "deletedAt");
CREATE INDEX "merchant_branches_merchantId_isDefault_idx" ON "merchant_branches"("merchantId", "isDefault");
CREATE UNIQUE INDEX "merchant_branches_one_default_active_idx" ON "merchant_branches"("merchantId") WHERE "isDefault" = true AND "deletedAt" IS NULL;

ALTER TABLE "merchant_branches" ADD CONSTRAINT "merchant_branches_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
