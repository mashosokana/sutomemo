-- CreateTable
CREATE TABLE IF NOT EXISTS "reels_outputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "postLocalId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reels_outputs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reels_outputs_postLocalId_key" UNIQUE ("postLocalId")
);
