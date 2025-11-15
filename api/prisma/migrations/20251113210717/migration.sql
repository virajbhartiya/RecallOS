-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('FACT', 'PREFERENCE', 'PROJECT', 'LOG_EVENT', 'REFERENCE');

-- AlterTable
ALTER TABLE "memories" ADD COLUMN     "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "memory_type" "MemoryType" NOT NULL DEFAULT 'LOG_EVENT',
ADD COLUMN     "source_app" TEXT;

-- CreateIndex
CREATE INDEX "memories_memory_type_idx" ON "memories"("memory_type");
