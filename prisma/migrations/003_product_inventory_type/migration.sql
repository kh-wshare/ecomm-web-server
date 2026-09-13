-- CreateEnum
CREATE TYPE "ProductInventoryType" AS ENUM ('STOCKED', 'NON_STOCKED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "inventoryType" "ProductInventoryType" NOT NULL DEFAULT 'NON_STOCKED',
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT false;

