-- DropForeignKey
ALTER TABLE "public"."memory_embeddings" DROP CONSTRAINT "fk_memory_embeddings_memory";

-- DropForeignKey
ALTER TABLE "public"."query_related_memories" DROP CONSTRAINT "fk_qrm_memory";

-- DropForeignKey
ALTER TABLE "public"."query_related_memories" DROP CONSTRAINT "fk_qrm_query_event";

-- DropIndex
DROP INDEX "public"."memory_embeddings_embedding_ivfflat";

-- AlterTable
ALTER TABLE "memory_embeddings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "query_events" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "query_related_memories" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_query_event_id_fkey" FOREIGN KEY ("query_event_id") REFERENCES "query_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_qrm" RENAME TO "query_related_memories_query_event_id_memory_id_key";
