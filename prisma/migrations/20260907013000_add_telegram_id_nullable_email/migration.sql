-- Make email nullable: identity providers such as Telegram don't supply a real email address
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Denormalized, unique Telegram user id for fast lookups, kept in sync with auth_identities
ALTER TABLE "users" ADD COLUMN "telegramId" TEXT;
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- Backfill telegramId for users who already have a linked Telegram identity
UPDATE "users" u
SET "telegramId" = ai."providerUserId"
FROM "auth_identities" ai
WHERE ai."userId" = u."id"
  AND ai."provider" = 'telegram'
  AND u."telegramId" IS NULL;

-- Clear the synthetic placeholder email that Telegram-only signups received before this migration
UPDATE "users"
SET "email" = NULL
WHERE "telegramId" IS NOT NULL
  AND "email" LIKE 'telegram-%@social.local';
