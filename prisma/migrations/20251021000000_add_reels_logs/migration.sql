-- CreateTable
CREATE TABLE IF NOT EXISTS "reels_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "postLocalId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "hookKey" TEXT NOT NULL,
    "durationSecs" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "postedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reels_logs_pkey" PRIMARY KEY ("id")
);
