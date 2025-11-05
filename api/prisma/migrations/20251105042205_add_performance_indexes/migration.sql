-- CreateIndex
CREATE INDEX "memories_user_id_idx" ON "memories"("user_id");

-- CreateIndex
CREATE INDEX "memories_created_at_idx" ON "memories"("created_at");

-- CreateIndex
CREATE INDEX "memories_user_id_created_at_idx" ON "memories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "memory_relations_memory_id_idx" ON "memory_relations"("memory_id");

-- CreateIndex
CREATE INDEX "memory_relations_similarity_score_idx" ON "memory_relations"("similarity_score");

-- CreateIndex (GIN index for JSONB array operations)
CREATE INDEX "memories_page_metadata_gin_idx" ON "memories" USING GIN ("page_metadata");
