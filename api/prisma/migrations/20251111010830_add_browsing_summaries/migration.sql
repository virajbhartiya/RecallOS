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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browsing_summaries_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "browsing_summaries" ADD CONSTRAINT "browsing_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

