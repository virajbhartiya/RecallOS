-- Convert all PROJECT memories to LOG_EVENT before removing the enum value
UPDATE "memories" SET "memory_type" = 'LOG_EVENT' WHERE "memory_type" = 'PROJECT';

-- Remove PROJECT from the MemoryType enum
-- Note: PostgreSQL doesn't support removing enum values directly, so we need to recreate the enum
-- First, create a new enum without PROJECT
CREATE TYPE "MemoryType_new" AS ENUM ('FACT', 'PREFERENCE', 'LOG_EVENT', 'REFERENCE');

-- Drop the default constraint temporarily
ALTER TABLE "memories" ALTER COLUMN "memory_type" DROP DEFAULT;

-- Update the column to use the new enum
ALTER TABLE "memories" ALTER COLUMN "memory_type" TYPE "MemoryType_new" USING ("memory_type"::text::"MemoryType_new");

-- Restore the default value with the new enum type
ALTER TABLE "memories" ALTER COLUMN "memory_type" SET DEFAULT 'LOG_EVENT'::"MemoryType_new";

-- Drop the old enum
DROP TYPE "MemoryType";

-- Rename the new enum to the original name
ALTER TYPE "MemoryType_new" RENAME TO "MemoryType";

