-- Add PROJECT back to the enum temporarily to allow querying
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PROJECT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MemoryType')
    ) THEN
        ALTER TYPE "MemoryType" ADD VALUE 'PROJECT';
    END IF;
END $$;
