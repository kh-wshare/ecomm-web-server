-- CreateEnum
CREATE TYPE "PosDeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PosShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED');

-- CreateEnum
CREATE TYPE "KitchenOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentRefundStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyKeyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "PaymentProviderCode" ADD VALUE 'CASH';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'UNKNOWN';

-- DropIndex
DROP INDEX "payments_orderId_key";

-- AlterTable
ALTER TABLE "checkout_sessions" ADD COLUMN     "branchId" UUID,
ADD COLUMN     "posDeviceId" UUID;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "cancelledQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "preparedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentToKitchenQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "branchId" UUID,
ADD COLUMN     "localId" TEXT,
ADD COLUMN     "posDeviceId" UUID,
ADD COLUMN     "posShiftId" UUID,
ADD COLUMN     "tableId" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "posShiftId" UUID;

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "PaymentRefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerRefundTransactionId" TEXT,
    "idempotencyKey" TEXT,
    "returnedStock" BOOLEAN NOT NULL DEFAULT false,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_devices" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT,
    "appVersion" TEXT,
    "status" "PosDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),
    "registeredById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_shifts" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "posDeviceId" UUID NOT NULL,
    "openedById" UUID NOT NULL,
    "closedById" UUID,
    "status" "PosShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingCash" DECIMAL(12,2) NOT NULL,
    "closingCash" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2),
    "cashDifference" DECIMAL(12,2),
    "note" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tables" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "seats" INTEGER,
    "status" "PosTableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pos_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_orders" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "posShiftId" UUID,
    "tableId" UUID,
    "status" "KitchenOrderStatus" NOT NULL DEFAULT 'PENDING',
    "sentById" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_order_items" (
    "id" UUID NOT NULL,
    "kitchenOrderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "KitchenOrderStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "merchantId" UUID,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT,
    "status" "IdempotencyKeyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_providerRefundTransactionId_key" ON "payment_refunds"("providerRefundTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_idempotencyKey_key" ON "payment_refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_refunds_merchantId_paymentId_idx" ON "payment_refunds"("merchantId", "paymentId");

-- CreateIndex
CREATE INDEX "payment_refunds_orderId_idx" ON "payment_refunds"("orderId");

-- CreateIndex
CREATE INDEX "pos_devices_merchantId_branchId_status_idx" ON "pos_devices"("merchantId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_devices_merchantId_deviceId_key" ON "pos_devices"("merchantId", "deviceId");

-- CreateIndex
CREATE INDEX "pos_shifts_merchantId_branchId_status_idx" ON "pos_shifts"("merchantId", "branchId", "status");

-- CreateIndex
CREATE INDEX "pos_shifts_posDeviceId_status_idx" ON "pos_shifts"("posDeviceId", "status");

-- CreateIndex
CREATE INDEX "pos_tables_merchantId_branchId_status_idx" ON "pos_tables"("merchantId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_tables_merchantId_branchId_name_key" ON "pos_tables"("merchantId", "branchId", "name");

-- CreateIndex
CREATE INDEX "customers_merchantId_phone_idx" ON "customers"("merchantId", "phone");

-- CreateIndex
CREATE INDEX "customers_merchantId_email_idx" ON "customers"("merchantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_orders_idempotencyKey_key" ON "kitchen_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "kitchen_orders_merchantId_branchId_status_createdAt_idx" ON "kitchen_orders"("merchantId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "kitchen_orders_orderId_idx" ON "kitchen_orders"("orderId");

-- CreateIndex
CREATE INDEX "kitchen_order_items_kitchenOrderId_idx" ON "kitchen_order_items"("kitchenOrderId");

-- CreateIndex
CREATE INDEX "kitchen_order_items_orderItemId_idx" ON "kitchen_order_items"("orderItemId");

-- CreateIndex
CREATE INDEX "outbox_events_status_availableAt_idx" ON "outbox_events"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_events_merchantId_createdAt_idx" ON "outbox_events"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_merchantId_scope_key_key" ON "idempotency_keys"("merchantId", "scope", "key");

-- CreateIndex
CREATE INDEX "checkout_sessions_branchId_idx" ON "checkout_sessions"("branchId");

-- CreateIndex
CREATE INDEX "checkout_sessions_posDeviceId_idx" ON "checkout_sessions"("posDeviceId");

-- CreateIndex
CREATE INDEX "orders_branchId_idx" ON "orders"("branchId");

-- CreateIndex
CREATE INDEX "orders_posShiftId_idx" ON "orders"("posShiftId");

-- CreateIndex
CREATE INDEX "orders_tableId_idx" ON "orders"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_merchantId_posDeviceId_localId_key" ON "orders"("merchantId", "posDeviceId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_posShiftId_idx" ON "payments"("posShiftId");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_posDeviceId_fkey" FOREIGN KEY ("posDeviceId") REFERENCES "pos_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_posDeviceId_fkey" FOREIGN KEY ("posDeviceId") REFERENCES "pos_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_posShiftId_fkey" FOREIGN KEY ("posShiftId") REFERENCES "pos_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "pos_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_posShiftId_fkey" FOREIGN KEY ("posShiftId") REFERENCES "pos_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_posDeviceId_fkey" FOREIGN KEY ("posDeviceId") REFERENCES "pos_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_tables" ADD CONSTRAINT "pos_tables_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_tables" ADD CONSTRAINT "pos_tables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "merchant_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_posShiftId_fkey" FOREIGN KEY ("posShiftId") REFERENCES "pos_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_kitchenOrderId_fkey" FOREIGN KEY ("kitchenOrderId") REFERENCES "kitchen_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (hand-written: Prisma's schema DSL cannot express partial indexes)
-- Enforces at most one OPEN shift per POS device at a time.
CREATE UNIQUE INDEX "pos_shifts_one_open_per_device" ON "pos_shifts"("posDeviceId") WHERE "status" = 'OPEN';

