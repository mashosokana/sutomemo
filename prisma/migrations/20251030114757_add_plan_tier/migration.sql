/*
  Warnings:

  - You are about to drop the column `hookKey` on the `reels_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."reels_logs" DROP COLUMN "hookKey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "durationSecs" SET DEFAULT 15,
ALTER COLUMN "postedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."reels_outputs" ALTER COLUMN "id" DROP DEFAULT;
