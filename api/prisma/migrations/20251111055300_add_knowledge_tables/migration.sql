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
    "updated_at" TIMESTAMP(3) NOT NULL,

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
CREATE UNIQUE INDEX "achievements_user_id_badge_type_key" ON "achievements"("user_id", "badge_type");

-- CreateIndex
CREATE INDEX "achievements_user_id_idx" ON "achievements"("user_id");

-- CreateIndex
CREATE INDEX "achievements_badge_type_idx" ON "achievements"("badge_type");

-- CreateIndex
CREATE INDEX "achievements_user_id_badge_type_idx" ON "achievements"("user_id", "badge_type");

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
ALTER TABLE "knowledge_scores" ADD CONSTRAINT "knowledge_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_benchmarks" ADD CONSTRAINT "user_benchmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

