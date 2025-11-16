/*
  Warnings:

  - The values [PROJECT] on the enum `MemoryType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_scores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_benchmarks` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemoryType_new" AS ENUM ('FACT', 'PREFERENCE', 'LOG_EVENT', 'REFERENCE');
ALTER TABLE "public"."memories" ALTER COLUMN "memory_type" DROP DEFAULT;
ALTER TABLE "memories" ALTER COLUMN "memory_type" TYPE "MemoryType_new" USING ("memory_type"::text::"MemoryType_new");
ALTER TYPE "MemoryType" RENAME TO "MemoryType_old";
ALTER TYPE "MemoryType_new" RENAME TO "MemoryType";
DROP TYPE "public"."MemoryType_old";
ALTER TABLE "memories" ALTER COLUMN "memory_type" SET DEFAULT 'LOG_EVENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "achievements" DROP CONSTRAINT "achievements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_scores" DROP CONSTRAINT "knowledge_scores_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_benchmarks" DROP CONSTRAINT "user_benchmarks_user_id_fkey";

-- DropTable
DROP TABLE "achievements";

-- DropTable
DROP TABLE "knowledge_scores";

-- DropTable
DROP TABLE "user_benchmarks";
