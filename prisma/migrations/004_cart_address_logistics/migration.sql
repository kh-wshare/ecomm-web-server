-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- CreateEnum
CREATE TYPE "DeliveryMethodType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "DeliveryMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');

-- AlterTable
ALTER TABLE "checkout_sessions"
    ADD COLUMN "shippingAmount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "deliveryMethodId"   UUID,
    ADD COLUMN "deliveryMethodName" TEXT,
    ADD COLUMN "shippingAddress"    JSONB,
    ADD COLUMN "billingAddress"     JSONB;

-- AlterTable
ALTER TABLE "orders"
    ADD COLUMN "shippingAmount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "deliveryMethodId"   UUID,
    ADD COLUMN "deliveryMethodName" TEXT,
    ADD COLUMN "shippingAddress"    JSONB,
    ADD COLUMN "billingAddress"     JSONB;

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id"                UUID NOT NULL,
    "merchantId"        UUID NOT NULL,
    "customerId"        UUID NOT NULL,
    "label"             TEXT,
    "recipientName"     TEXT NOT NULL,
    "phone"             TEXT,
    "email"             TEXT,
    "line1"             TEXT NOT NULL,
    "line2"             TEXT,
    "city"              TEXT,
    "province"          TEXT,
    "postalCode"        TEXT,
    "country"           CHAR(2) NOT NULL,
    "latitude"          DECIMAL(10,7),
    "longitude"         DECIMAL(10,7),
    "note"              TEXT,
    "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultBilling"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    "deletedAt"         TIMESTAMP(3),

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_methods" (
    "id"          UUID NOT NULL,
    "merchantId"  UUID NOT NULL,
    "branchId"    UUID,
    "name"        TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "description" TEXT,
    "type"        "DeliveryMethodType" NOT NULL DEFAULT 'DELIVERY',
    "status"      "DeliveryMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault"   BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "delivery_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id"               UUID NOT NULL,
    "merchantId"       UUID NOT NULL,
    "deliveryMethodId" UUID NOT NULL,
    "name"             TEXT NOT NULL,
    "countries"        TEXT[],
    "provinces"        TEXT[],
    "cities"           TEXT[],
    "postalCodes"      TEXT[],
    "baseFee"          DECIMAL(12,2) NOT NULL DEFAULT 0,
    "perItemFee"       DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freeOverSubtotal" DECIMAL(12,2),
    "minSubtotal"      DECIMAL(12,2),
    "maxSubtotal"      DECIMAL(12,2),
    "estimatedMinDays" INTEGER,
    "estimatedMaxDays" INTEGER,
    "isFallback"       BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id"                UUID NOT NULL,
    "merchantId"        UUID NOT NULL,
    "customerId"        UUID,
    "checkoutSessionId" UUID,
    "accessTokenHash"   TEXT NOT NULL,
    "status"            "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceChannel"     "SalesChannel" NOT NULL DEFAULT 'WEBSITE',
    "customerName"      TEXT,
    "customerEmail"     TEXT,
    "customerPhone"     TEXT,
    "note"              TEXT,
    "shippingAddressId" UUID,
    "billingAddressId"  UUID,
    "deliveryMethodId"  UUID,
    "deliveryZoneId"    UUID,
    "expiresAt"         TIMESTAMP(3) NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id"        UUID NOT NULL,
    "cartId"    UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "lineKey"   TEXT NOT NULL,
    "quantity"  INTEGER NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id"               UUID NOT NULL,
    "merchantId"       UUID NOT NULL,
    "orderId"          UUID NOT NULL,
    "deliveryMethodId" UUID,
    "shipmentNumber"   TEXT NOT NULL,
    "status"           "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "carrierName"      TEXT,
    "trackingNumber"   TEXT,
    "trackingUrl"      TEXT,
    "recipientName"    TEXT,
    "phone"            TEXT,
    "address"          JSONB,
    "shippingCost"     DECIMAL(12,2),
    "note"             TEXT,
    "shippedAt"        TIMESTAMP(3),
    "deliveredAt"      TIMESTAMP(3),
    "cancelledAt"      TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id"          UUID NOT NULL,
    "shipmentId"  UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity"    INTEGER NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id"          UUID NOT NULL,
    "shipmentId"  UUID NOT NULL,
    "status"      "ShipmentStatus" NOT NULL,
    "message"     TEXT,
    "location"    TEXT,
    "occurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_addresses_merchantId_customerId_deletedAt_idx" ON "customer_addresses"("merchantId", "customerId", "deletedAt");
CREATE INDEX "customer_addresses_customerId_isDefaultShipping_idx" ON "customer_addresses"("customerId", "isDefaultShipping");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_methods_merchantId_code_key" ON "delivery_methods"("merchantId", "code");
CREATE INDEX "delivery_methods_merchantId_status_deletedAt_idx" ON "delivery_methods"("merchantId", "status", "deletedAt");
CREATE INDEX "delivery_methods_merchantId_sortOrder_idx" ON "delivery_methods"("merchantId", "sortOrder");

-- CreateIndex
CREATE INDEX "delivery_zones_deliveryMethodId_deletedAt_sortOrder_idx" ON "delivery_zones"("deliveryMethodId", "deletedAt", "sortOrder");
CREATE INDEX "delivery_zones_merchantId_idx" ON "delivery_zones"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_checkoutSessionId_key" ON "carts"("checkoutSessionId");
CREATE UNIQUE INDEX "carts_accessTokenHash_key" ON "carts"("accessTokenHash");
CREATE INDEX "carts_merchantId_status_expiresAt_idx" ON "carts"("merchantId", "status", "expiresAt");
CREATE INDEX "carts_merchantId_customerId_idx" ON "carts"("merchantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_lineKey_key" ON "cart_items"("cartId", "lineKey");
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");
CREATE INDEX "cart_items_variantId_idx" ON "cart_items"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_merchantId_shipmentNumber_key" ON "shipments"("merchantId", "shipmentNumber");
CREATE INDEX "shipments_merchantId_status_createdAt_idx" ON "shipments"("merchantId", "status", "createdAt");
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_shipmentId_orderItemId_key" ON "shipment_items"("shipmentId", "orderItemId");
CREATE INDEX "shipment_items_orderItemId_idx" ON "shipment_items"("orderItemId");

-- CreateIndex
CREATE INDEX "shipment_events_shipmentId_occurredAt_idx" ON "shipment_events"("shipmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_methods" ADD CONSTRAINT "delivery_methods_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_methods" ADD CONSTRAINT "delivery_methods_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carts" ADD CONSTRAINT "carts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deliveryMethodId_fkey" FOREIGN KEY ("deliveryMethodId") REFERENCES "delivery_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
