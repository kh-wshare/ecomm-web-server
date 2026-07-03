CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'RESERVED', 'RESERVATION_RELEASED', 'SOLD', 'REFUND_RETURN', 'MANUAL_ADJUSTMENT');

CREATE TABLE "inventory_stocks" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "stockKey" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "safetyBuffer" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_stocks_nonnegative_check" CHECK (
        "totalStock" >= 0 AND
        "reservedStock" >= 0 AND
        "soldStock" >= 0 AND
        "safetyBuffer" >= 0
    ),
    CONSTRAINT "inventory_stocks_balance_check" CHECK (
        "reservedStock" + "soldStock" <= "totalStock"
    )
);

CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "inventoryStockId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "orderId" UUID,
    "checkoutSessionId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "inventoryStockId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_quantity_check" CHECK ("quantity" <> 0)
);

CREATE UNIQUE INDEX "inventory_stocks_merchantId_stockKey_key" ON "inventory_stocks"("merchantId", "stockKey");
CREATE INDEX "inventory_stocks_merchantId_productId_idx" ON "inventory_stocks"("merchantId", "productId");
CREATE INDEX "inventory_stocks_variantId_idx" ON "inventory_stocks"("variantId");
CREATE UNIQUE INDEX "inventory_reservations_checkoutSessionId_inventoryStockId_key" ON "inventory_reservations"("checkoutSessionId", "inventoryStockId");
CREATE INDEX "inventory_reservations_merchantId_status_expiresAt_idx" ON "inventory_reservations"("merchantId", "status", "expiresAt");
CREATE INDEX "inventory_reservations_orderId_idx" ON "inventory_reservations"("orderId");
CREATE INDEX "inventory_movements_merchantId_productId_createdAt_idx" ON "inventory_movements"("merchantId", "productId", "createdAt");
CREATE INDEX "inventory_movements_inventoryStockId_createdAt_idx" ON "inventory_movements"("inventoryStockId", "createdAt");

ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "inventory_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryStockId_fkey" FOREIGN KEY ("inventoryStockId") REFERENCES "inventory_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
