/*
  Warnings:

  - The `vector` column on the `embeddings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "embeddings" ADD COLUMN     "embedding_type" TEXT NOT NULL DEFAULT 'content',
DROP COLUMN "vector",
ADD COLUMN     "vector" DOUBLE PRECISION[];

-- AlterTable
ALTER TABLE "memories" ADD COLUMN     "access_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "importance_score" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "memory_relations" (
    "id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "related_memory_id" UUID NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "relation_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memory_relations_memory_id_related_memory_id_key" ON "memory_relations"("memory_id", "related_memory_id");

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_related_memory_id_fkey" FOREIGN KEY ("related_memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
