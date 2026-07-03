CREATE TABLE "merchant_themes" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "liveConfig" JSONB NOT NULL,
    "draftConfig" JSONB NOT NULL,
    "customDomain" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_themes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_themes_merchantId_key" ON "merchant_themes"("merchantId");
CREATE UNIQUE INDEX "merchant_themes_customDomain_key" ON "merchant_themes"("customDomain");

ALTER TABLE "merchant_themes" ADD CONSTRAINT "merchant_themes_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "merchants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
