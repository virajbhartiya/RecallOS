CREATE EXTENSION IF NOT EXISTS vector;
-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "hash" TEXT,
    "timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "full_content" TEXT,
    "page_metadata" JSONB,
    "importance_score" DOUBLE PRECISION DEFAULT 0.0,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tx_hash" TEXT,
    "block_number" BIGINT,
    "gas_used" TEXT,
    "tx_status" TEXT DEFAULT 'pending',
    "blockchain_network" TEXT DEFAULT 'sepolia',
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "vector" DOUBLE PRECISION[],
    "model_name" TEXT NOT NULL,
    "embedding_type" TEXT NOT NULL DEFAULT 'content',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "memory_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "raw_text" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "summary_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockscout_transactions" (
    "id" UUID NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "block_number" BIGINT,
    "gas_used" TEXT,
    "gas_price" TEXT,
    "from_address" TEXT,
    "to_address" TEXT,
    "value" TEXT,
    "timestamp" BIGINT,
    "finality_reached" BOOLEAN NOT NULL DEFAULT false,
    "finality_confirmed_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "blockscout_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_embeddings" (
    "id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "embedding" vector NOT NULL,
    "dim" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_events" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "embedding_hash" TEXT NOT NULL,
    "meta_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_related_memories" (
    "id" UUID NOT NULL,
    "query_event_id" UUID NOT NULL,
    "memory_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_related_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_cache" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "meta_summary" TEXT,
    "answer" TEXT,
    "citations" JSONB,
    "job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "memories_hash_key" ON "memories"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "memories_tx_hash_key" ON "memories"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "memory_relations_memory_id_related_memory_id_key" ON "memory_relations"("memory_id", "related_memory_id");

-- CreateIndex
CREATE UNIQUE INDEX "memory_snapshots_summary_hash_key" ON "memory_snapshots"("summary_hash");

-- CreateIndex
CREATE UNIQUE INDEX "blockscout_transactions_tx_hash_key" ON "blockscout_transactions"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "query_related_memories_query_event_id_memory_id_key" ON "query_related_memories"("query_event_id", "memory_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_cache_query_hash_key" ON "search_cache"("query_hash");

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_related_memory_id_fkey" FOREIGN KEY ("related_memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_snapshots" ADD CONSTRAINT "memory_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_query_event_id_fkey" FOREIGN KEY ("query_event_id") REFERENCES "query_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
