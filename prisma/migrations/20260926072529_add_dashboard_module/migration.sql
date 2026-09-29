-- CreateEnum
CREATE TYPE "ReportExportStatus" AS ENUM ('READY', 'FAILED');

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "setup_dismissed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "settlement_accounts" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "report" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),
    "branch_id" UUID,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'READY',
    "row_count" INTEGER,
    "file_key" TEXT,
    "download_url" TEXT,
    "error" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlement_accounts_merchant_id_key" ON "settlement_accounts"("merchant_id");

-- CreateIndex
CREATE INDEX "report_exports_merchant_id_created_at_idx" ON "report_exports"("merchant_id", "created_at");

-- AddForeignKey
ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
