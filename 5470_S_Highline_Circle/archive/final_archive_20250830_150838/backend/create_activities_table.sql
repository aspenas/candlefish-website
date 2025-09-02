-- SQLite-compatible Activities table creation
-- Run this directly on the database to enable activities tracking

-- Create activities table (SQLite compatible)
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL CHECK (action IN ('viewed', 'updated', 'created', 'deleted', 'decided', 'bulk_updated', 'exported', 'imported')),
    item_id TEXT,
    item_name TEXT,
    room_name TEXT,
    details TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_item ON activities(item_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);

-- Insert a sample activity
INSERT OR IGNORE INTO activities (action, details, created_at)
VALUES ('created', 'Activities table created and tracking enabled', CURRENT_TIMESTAMP);

-- Verify the table was created and show count
SELECT 'Activities table created successfully. Row count: ' || COUNT(*) as result FROM activities;