/*
  Warnings:

  - You are about to drop the `avail_commits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."avail_commits" DROP CONSTRAINT "avail_commits_memory_id_fkey";

-- DropTable
DROP TABLE "public"."avail_commits";

-- CreateTable
CREATE TABLE "memory_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "raw_text" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "summary_hash" TEXT NOT NULL,
    "nexus_commit_hash" TEXT,
    "cross_chain_proofs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memory_snapshots_summary_hash_key" ON "memory_snapshots"("summary_hash");

-- AddForeignKey
ALTER TABLE "memory_snapshots" ADD CONSTRAINT "memory_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
