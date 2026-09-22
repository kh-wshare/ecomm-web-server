-- Staff ownership of POS-built carts and addresses is "owner", not merely
-- "created by". inventory_movements and shipment_events keep created_by_id:
-- those record who performed an action, which is not ownership.

ALTER TABLE "carts" RENAME COLUMN "created_by_id" TO "owner_id";
ALTER TABLE "customer_addresses" RENAME COLUMN "created_by_id" TO "owner_id";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_created_by_id_fkey" TO "carts_owner_id_fkey";

-- RenameForeignKey
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "customer_addresses_created_by_id_fkey" TO "customer_addresses_owner_id_fkey";

-- RenameIndex
ALTER INDEX "carts_created_by_id_created_at_idx" RENAME TO "carts_owner_id_created_at_idx";

-- RenameIndex
ALTER INDEX "customer_addresses_created_by_id_created_at_idx" RENAME TO "customer_addresses_owner_id_created_at_idx";

