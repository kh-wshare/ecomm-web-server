-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "customer_addresses" ADD COLUMN     "createdById" UUID;

-- CreateIndex
CREATE INDEX "carts_createdById_createdAt_idx" ON "carts"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "customer_addresses_createdById_createdAt_idx" ON "customer_addresses"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
