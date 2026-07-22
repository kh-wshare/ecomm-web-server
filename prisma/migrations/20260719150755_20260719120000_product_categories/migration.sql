-- AlterTable
ALTER TABLE "auth_identities" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "merchant_branches" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_categories" ALTER COLUMN "id" DROP DEFAULT;
