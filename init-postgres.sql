-- Initialize PromoterOS database
-- This file is run when the PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create read-only user for monitoring
CREATE USER promoteros_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE promoteros_dev TO promoteros_readonly;
GRANT USAGE ON SCHEMA public TO promoteros_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO promoteros_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO promoteros_readonly;
