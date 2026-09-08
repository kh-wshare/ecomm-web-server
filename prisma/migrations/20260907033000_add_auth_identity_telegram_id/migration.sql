-- Explicit, queryable raw Telegram user id on the identity row itself
ALTER TABLE "auth_identities" ADD COLUMN "telegramId" TEXT;
CREATE UNIQUE INDEX "auth_identities_telegramId_key" ON "auth_identities"("telegramId");

-- Backfill from providerUserId for existing Telegram identities (current best-known value)
UPDATE "auth_identities"
SET "telegramId" = "providerUserId"
WHERE "provider" = 'telegram'
  AND "telegramId" IS NULL;
