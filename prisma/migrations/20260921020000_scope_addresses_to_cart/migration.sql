-- Track which cart saved an address, so a guest cart linked to a customer
-- only by a matching email/phone can read back what it saved itself
-- rather than that customer's entire address book.

-- AlterTable
ALTER TABLE "customer_addresses" ADD COLUMN     "cart_id" UUID;

-- CreateIndex
CREATE INDEX "customer_addresses_cart_id_idx" ON "customer_addresses"("cart_id");

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

