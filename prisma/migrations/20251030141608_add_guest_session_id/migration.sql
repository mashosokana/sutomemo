-- AlterTable
ALTER TABLE "Post" ADD COLUMN "guestSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Post_guestSessionId_idx" ON "Post"("guestSessionId");
