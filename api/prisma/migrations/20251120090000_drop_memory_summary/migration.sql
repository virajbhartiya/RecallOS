-- DropIndex
DROP INDEX "memory_snapshots_summary_hash_key";

-- AlterTable
ALTER TABLE "memories" DROP COLUMN "summary";

-- AlterTable
ALTER TABLE "memory_snapshots" DROP COLUMN "summary",
DROP COLUMN "summary_hash";

