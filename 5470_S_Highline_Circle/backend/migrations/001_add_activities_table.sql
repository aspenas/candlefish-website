-- Migration: Add activities table if it doesn't exist
-- This migration ensures the activities table is created in production

-- Check if activities table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activities') THEN
        -- Create activity_action enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_action') THEN
            CREATE TYPE activity_action AS ENUM (
                'viewed',
                'updated',
                'created',
                'deleted',
                'decided',
                'bulk_updated',
                'exported',
                'imported'
            );
        END IF;

        -- Create activities table
        CREATE TABLE activities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            action activity_action NOT NULL,
            item_id UUID REFERENCES items(id) ON DELETE SET NULL,
            item_name VARCHAR(255),
            room_name VARCHAR(100),
            details TEXT,
            old_value VARCHAR(255),
            new_value VARCHAR(255),
            user_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for performance
        CREATE INDEX idx_activities_item ON activities(item_id);
        CREATE INDEX idx_activities_created ON activities(created_at DESC);
        CREATE INDEX idx_activities_action ON activities(action);

        -- Insert initial activity
        INSERT INTO activities (action, details, created_at)
        VALUES ('created', 'Activities table created and tracking enabled', CURRENT_TIMESTAMP);
    END IF;
END $$;