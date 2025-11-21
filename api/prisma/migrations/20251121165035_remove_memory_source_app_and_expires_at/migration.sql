/*
  Warnings:

  - You are about to drop the column `expires_at` on the `memories` table. All the data in the column will be lost.
  - You are about to drop the column `source_app` on the `memories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "memories" DROP COLUMN "expires_at",
DROP COLUMN "source_app";
