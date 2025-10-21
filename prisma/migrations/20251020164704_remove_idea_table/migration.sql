-- DropForeignKey (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Idea') THEN
        ALTER TABLE "Idea" DROP CONSTRAINT IF EXISTS "Idea_userId_fkey";
    END IF;
END $$;

-- DropTable (only if exists)
DROP TABLE IF EXISTS "Idea";
