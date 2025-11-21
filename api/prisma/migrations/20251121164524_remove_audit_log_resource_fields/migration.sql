/*
  Warnings:

  - You are about to drop the column `resource_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource_type` on the `audit_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "resource_id",
DROP COLUMN "resource_type";
