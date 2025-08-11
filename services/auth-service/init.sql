-- Initialize database for Candlefish Auth Service
-- This file is used by docker-compose for local development

-- Create the auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant permissions to the candlefish user
GRANT ALL PRIVILEGES ON SCHEMA auth TO candlefish;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO candlefish;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO candlefish;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO candlefish;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO candlefish;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: Prisma will create the actual tables via migrations
