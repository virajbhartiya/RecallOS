-- Initialize RecallOS Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a dedicated user for the application (optional, using postgres for simplicity)
-- CREATE USER recall_user WITH PASSWORD 'postgres';
-- GRANT ALL PRIVILEGES ON DATABASE recallos TO recall_user;
-- GRANT ALL PRIVILEGES ON SCHEMA public TO recall_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO recall_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO recall_user;

-- Set timezone
SET timezone = 'UTC';
