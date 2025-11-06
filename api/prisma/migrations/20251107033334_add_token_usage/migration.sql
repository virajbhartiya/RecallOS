-- CreateTable
CREATE TABLE IF NOT EXISTS "token_usage" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation_type" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "model_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_usage_user_id_idx" ON "token_usage"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_usage_created_at_idx" ON "token_usage"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_usage_user_id_created_at_idx" ON "token_usage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "token_usage_operation_type_idx" ON "token_usage"("operation_type");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'token_usage_user_id_fkey'
  ) THEN
    ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

