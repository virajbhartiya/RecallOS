-- Add canonical fields and unique composite index for exact duplicate prevention per user
ALTER TABLE "memories"
  ADD COLUMN IF NOT EXISTS "canonical_text" TEXT,
  ADD COLUMN IF NOT EXISTS "canonical_hash" TEXT;

-- Create unique index on (user_id, canonical_hash) to prevent exact duplicates after normalization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'memories_user_id_canonical_hash_key'
  ) THEN
    CREATE UNIQUE INDEX "memories_user_id_canonical_hash_key" ON "memories"("user_id", "canonical_hash");
  END IF;
END
$$;


