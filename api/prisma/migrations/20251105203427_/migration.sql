/*
  Warnings:

  - You are about to drop the column `block_number` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `blockchain_network` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed_at` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `gas_used` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `tx_hash` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `tx_status` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the `blockscout_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "public"."memories_hash_key";

-- DropIndex
DROP INDEX "public"."memories_tx_hash_key";

-- AlterTable
ALTER TABLE "memories" DROP COLUMN "block_number",
DROP COLUMN "blockchain_network",
DROP COLUMN "confirmed_at",
DROP COLUMN "gas_used",
DROP COLUMN "hash",
DROP COLUMN "tx_hash",
DROP COLUMN "tx_status";

-- DropTable
DROP TABLE "public"."blockscout_transactions";

-- CreateIndex
CREATE INDEX "memory_snapshots_user_id_idx" ON "memory_snapshots"("user_id");

-- CreateIndex
CREATE INDEX "memory_snapshots_user_id_created_at_idx" ON "memory_snapshots"("user_id", "created_at");
