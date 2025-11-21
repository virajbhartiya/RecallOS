/*
  Warnings:

  - You are about to drop the column `meta_summary` on the `query_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "query_events" DROP COLUMN "meta_summary";
