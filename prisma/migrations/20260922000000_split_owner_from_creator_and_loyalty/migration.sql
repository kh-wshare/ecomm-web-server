-- Splits the overloaded `owner_id` into two distinct concepts, and adds the
-- loyalty ledger.
--
-- `owner_id` had come to mean "the signed-in shopper" on the storefront and
-- "the staff member who built this" in POS. CustomerDirectoryService reads it
-- as the former, so a staff member who had ever saved an address for a walk-in
-- customer resolved to THAT customer when they later shopped the storefront —
-- their cart, orders and address book attached to someone else's record.
--
-- After this migration: `owner_id` is only ever a shopper's own account, and
-- `created_by_id` is only ever the staff member who acted on their behalf.

-- ---------------------------------------------------------------- carts

ALTER TABLE "carts" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "carts" ADD COLUMN "merged_into_cart_id" UUID;

-- A POS cart's owner_id was always the staff member who built it.
UPDATE "carts"
   SET "created_by_id" = "owner_id",
       "owner_id"      = NULL
 WHERE "owner_id" IS NOT NULL
   AND "source_channel" = 'POS';

ALTER TABLE "carts" ADD CONSTRAINT "carts_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_merged_into_cart_id_fkey"
  FOREIGN KEY ("merged_into_cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "carts_created_by_id_created_at_idx" ON "carts"("created_by_id", "created_at");

-- ------------------------------------------------------ customer_addresses

ALTER TABLE "customer_addresses" ADD COLUMN "created_by_id" UUID;

-- Staff authorship is exactly "the user holds a membership in this address's
-- merchant, and the address did not come through a shopper's cart". A shopper
-- account has no membership in the store they buy from, so this separates the
-- two populations without guessing.
UPDATE "customer_addresses" AS a
   SET "created_by_id" = a."owner_id",
       "owner_id"      = NULL
 WHERE a."owner_id" IS NOT NULL
   AND a."cart_id" IS NULL
   AND EXISTS (
     SELECT 1 FROM "merchant_users" m
      WHERE m."user_id" = a."owner_id"
        AND m."merchant_id" = a."merchant_id"
   );

ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------- statuses

ALTER TYPE "CartStatus" ADD VALUE 'MERGED';

CREATE TYPE "LoyaltyEntryType" AS ENUM ('EARNED', 'REVERSED', 'ADJUSTED');

-- ------------------------------------------------ order/checkout ownership

ALTER TABLE "checkout_sessions" ADD COLUMN "owner_id" UUID;
ALTER TABLE "orders" ADD COLUMN "owner_id" UUID;

-- ---------------------------------------------------------------- loyalty

ALTER TABLE "merchants" ADD COLUMN "loyalty_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "merchants" ADD COLUMN "loyalty_points_per_unit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "customers" ADD COLUMN "loyalty_points" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "loyalty_ledger_entries" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "type" "LoyaltyEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- Makes earning idempotent under webhook redelivery: a second grant for the
-- same order conflicts instead of doubling the balance.
CREATE UNIQUE INDEX "loyalty_ledger_entries_order_id_type_key"
  ON "loyalty_ledger_entries"("order_id", "type");
CREATE INDEX "loyalty_ledger_entries_merchant_id_customer_id_created_at_idx"
  ON "loyalty_ledger_entries"("merchant_id", "customer_id", "created_at");

ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_ledger_entries" ADD CONSTRAINT "loyalty_ledger_entries_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
