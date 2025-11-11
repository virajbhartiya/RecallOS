-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "external_id" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "canonical_text" TEXT,
    "canonical_hash" TEXT,
    "timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "full_content" TEXT,
    "page_metadata" JSONB,
    "importance_score" DOUBLE PRECISION DEFAULT 0.0,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "token_usage" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation_type" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "model_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "static_profile_json" JSONB,
    "static_profile_text" TEXT,
    "dynamic_profile_json" JSONB,
    "dynamic_profile_text" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_memory_analyzed" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browsing_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "wow_facts" JSONB,
    "narrative_summary" TEXT,
    "domain_stats" JSONB,
    "topics_explored" JSONB,
    "categories_explored" JSONB,
    "time_estimates" JSONB,
    "key_insights" JSONB,
    "memory_ids" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browsing_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_scores" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "velocity_score" DOUBLE PRECISION NOT NULL,
    "impact_score" DOUBLE PRECISION NOT NULL,
    "topic_rate" DOUBLE PRECISION NOT NULL,
    "diversity_index" DOUBLE PRECISION NOT NULL,
    "consistency_score" DOUBLE PRECISION NOT NULL,
    "depth_balance" DOUBLE PRECISION NOT NULL,
    "search_frequency" DOUBLE PRECISION NOT NULL,
    "recall_efficiency" DOUBLE PRECISION NOT NULL,
    "connection_strength" DOUBLE PRECISION NOT NULL,
    "access_quality" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_type" TEXT NOT NULL,
    "badge_name" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "recommendations" JSONB NOT NULL,
    "knowledge_gaps" JSONB,
    "trending_topics" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_benchmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "velocity_percentile" DOUBLE PRECISION,
    "impact_percentile" DOUBLE PRECISION,
    "connection_percentile" DOUBLE PRECISION,
    "diversity_percentile" DOUBLE PRECISION,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opt_in" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memories_user_id_idx" ON "memories"("user_id");

-- CreateIndex
CREATE INDEX "memories_created_at_idx" ON "memories"("created_at");

-- CreateIndex
CREATE INDEX "memories_user_id_created_at_idx" ON "memories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "memories_canonical_hash_idx" ON "memories"("canonical_hash");

-- CreateIndex
CREATE INDEX "memories_url_idx" ON "memories"("url");

-- CreateIndex
CREATE UNIQUE INDEX "memories_user_id_canonical_hash_key" ON "memories"("user_id", "canonical_hash");

-- CreateIndex
CREATE INDEX "memory_relations_memory_id_idx" ON "memory_relations"("memory_id");

-- CreateIndex
CREATE INDEX "memory_relations_related_memory_id_idx" ON "memory_relations"("related_memory_id");

-- CreateIndex
CREATE INDEX "memory_relations_memory_id_related_memory_id_idx" ON "memory_relations"("memory_id", "related_memory_id");

-- CreateIndex
CREATE INDEX "memory_relations_similarity_score_idx" ON "memory_relations"("similarity_score");

-- CreateIndex
CREATE UNIQUE INDEX "memory_relations_memory_id_related_memory_id_key" ON "memory_relations"("memory_id", "related_memory_id");

-- CreateIndex
CREATE UNIQUE INDEX "memory_snapshots_summary_hash_key" ON "memory_snapshots"("summary_hash");

-- CreateIndex
CREATE INDEX "memory_snapshots_user_id_idx" ON "memory_snapshots"("user_id");

-- CreateIndex
CREATE INDEX "memory_snapshots_user_id_created_at_idx" ON "memory_snapshots"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "query_events_user_id_idx" ON "query_events"("user_id");

-- CreateIndex
CREATE INDEX "query_events_user_id_created_at_idx" ON "query_events"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "query_related_memories_query_event_id_memory_id_key" ON "query_related_memories"("query_event_id", "memory_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_cache_query_hash_key" ON "search_cache"("query_hash");

-- CreateIndex
CREATE INDEX "token_usage_user_id_idx" ON "token_usage"("user_id");

-- CreateIndex
CREATE INDEX "token_usage_created_at_idx" ON "token_usage"("created_at");

-- CreateIndex
CREATE INDEX "token_usage_user_id_created_at_idx" ON "token_usage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "token_usage_operation_type_idx" ON "token_usage"("operation_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_last_updated_idx" ON "user_profiles"("last_updated");

-- CreateIndex
CREATE INDEX "browsing_summaries_user_id_idx" ON "browsing_summaries"("user_id");

-- CreateIndex
CREATE INDEX "browsing_summaries_period_type_idx" ON "browsing_summaries"("period_type");

-- CreateIndex
CREATE INDEX "browsing_summaries_period_start_idx" ON "browsing_summaries"("period_start");

-- CreateIndex
CREATE INDEX "browsing_summaries_period_end_idx" ON "browsing_summaries"("period_end");

-- CreateIndex
CREATE INDEX "browsing_summaries_user_id_period_type_idx" ON "browsing_summaries"("user_id", "period_type");

-- CreateIndex
CREATE INDEX "browsing_summaries_user_id_period_type_period_start_idx" ON "browsing_summaries"("user_id", "period_type", "period_start");

-- CreateIndex
CREATE INDEX "knowledge_scores_user_id_idx" ON "knowledge_scores"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_scores_period_type_idx" ON "knowledge_scores"("period_type");

-- CreateIndex
CREATE INDEX "knowledge_scores_period_start_idx" ON "knowledge_scores"("period_start");

-- CreateIndex
CREATE INDEX "knowledge_scores_user_id_period_type_idx" ON "knowledge_scores"("user_id", "period_type");

-- CreateIndex
CREATE INDEX "knowledge_scores_user_id_period_type_period_start_idx" ON "knowledge_scores"("user_id", "period_type", "period_start");

-- CreateIndex
CREATE INDEX "achievements_user_id_idx" ON "achievements"("user_id");

-- CreateIndex
CREATE INDEX "achievements_badge_type_idx" ON "achievements"("badge_type");

-- CreateIndex
CREATE INDEX "achievements_user_id_badge_type_idx" ON "achievements"("user_id", "badge_type");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_user_id_badge_type_key" ON "achievements"("user_id", "badge_type");

-- CreateIndex
CREATE INDEX "learning_paths_user_id_idx" ON "learning_paths"("user_id");

-- CreateIndex
CREATE INDEX "learning_paths_generated_at_idx" ON "learning_paths"("generated_at");

-- CreateIndex
CREATE INDEX "learning_paths_user_id_generated_at_idx" ON "learning_paths"("user_id", "generated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_benchmarks_user_id_key" ON "user_benchmarks"("user_id");

-- CreateIndex
CREATE INDEX "user_benchmarks_user_id_idx" ON "user_benchmarks"("user_id");

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_relations" ADD CONSTRAINT "memory_relations_related_memory_id_fkey" FOREIGN KEY ("related_memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_snapshots" ADD CONSTRAINT "memory_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_query_event_id_fkey" FOREIGN KEY ("query_event_id") REFERENCES "query_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_related_memories" ADD CONSTRAINT "query_related_memories_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browsing_summaries" ADD CONSTRAINT "browsing_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_scores" ADD CONSTRAINT "knowledge_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_benchmarks" ADD CONSTRAINT "user_benchmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
