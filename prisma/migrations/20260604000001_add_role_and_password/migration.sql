-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '',
                    ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- Remove the default after adding the column (it was only needed for existing rows)
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;
