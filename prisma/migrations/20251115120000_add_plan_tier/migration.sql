-- Create enum type for plan tier
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- Add planTier column to users table with default FREE
ALTER TABLE "User"
  ADD COLUMN "planTier" "PlanTier" NOT NULL DEFAULT 'FREE';

