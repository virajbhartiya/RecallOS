-- CreateTable
CREATE TABLE "search_cache" (
    "id" UUID NOT NULL,
    "wallet" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "search_cache_query_hash_key" ON "search_cache"("query_hash");
