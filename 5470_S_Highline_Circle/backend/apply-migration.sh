#!/bin/bash

# Apply migration to production database
# This script runs the activities table migration on Fly.io PostgreSQL

echo "Applying migration to create activities table..."

# Connect to Fly.io database and run migration
fly postgres connect -a highline-inventory-db <<EOF
-- Migration: Add activities table if it doesn't exist
DO \$\$
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
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

        RAISE NOTICE 'Activities table created successfully';
    ELSE
        RAISE NOTICE 'Activities table already exists';
    END IF;
END \$\$;

-- Verify the table was created
SELECT COUNT(*) as activity_count FROM activities;
EOF

echo "Migration completed!"
