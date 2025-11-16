-- Convert any remaining PROJECT values to LOG_EVENT
UPDATE "memories" SET "memory_type" = 'LOG_EVENT' WHERE "memory_type" = 'PROJECT';