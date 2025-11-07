-- CreateIndex
CREATE INDEX "memories_canonical_hash_idx" ON "memories"("canonical_hash");

-- CreateIndex
CREATE INDEX "memories_url_idx" ON "memories"("url");

-- CreateIndex
CREATE INDEX "memory_relations_related_memory_id_idx" ON "memory_relations"("related_memory_id");

-- CreateIndex
CREATE INDEX "memory_relations_memory_id_related_memory_id_idx" ON "memory_relations"("memory_id", "related_memory_id");

-- CreateIndex
CREATE INDEX "query_events_user_id_idx" ON "query_events"("user_id");

-- CreateIndex
CREATE INDEX "query_events_user_id_created_at_idx" ON "query_events"("user_id", "created_at");
