#!/bin/bash
# Database initialization script for Candlefish AI Collaboration System
# This script sets up the database, runs migrations, and creates initial data

set -e

# Configuration
DB_HOST=${DATABASE_HOST:-"candlefish-postgres.internal"}
DB_PORT=${DATABASE_PORT:-"5432"}
DB_NAME=${POSTGRES_DB:-"candlefish_collaboration"}
DB_USER=${POSTGRES_USER:-"candlefish"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐠 Candlefish AI - Database Initialization${NC}"
echo "========================================"

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
    echo "  Database is not ready yet, waiting 2 seconds..."
    sleep 2
done

echo -e "${GREEN}✅ Database is ready!${NC}"

# Run the main schema
echo -e "${YELLOW}📊 Creating collaboration schema...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f /app/schema/collaboration-schema.sql

# Create database roles and permissions
echo -e "${YELLOW}👥 Setting up database roles...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Application user role
CREATE ROLE app_user;
GRANT CONNECT ON DATABASE candlefish_collaboration TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Read-only user for analytics
CREATE ROLE analytics_user;
GRANT CONNECT ON DATABASE candlefish_collaboration TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Backup user
CREATE ROLE backup_user;
GRANT CONNECT ON DATABASE candlefish_collaboration TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT pg_read_all_data TO backup_user;
EOF

# Insert seed data
echo -e "${YELLOW}🌱 Inserting seed data...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Default system organization
INSERT INTO organizations (id, name, slug, subscription_tier, settings) VALUES
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Candlefish AI',
    'candlefish-ai',
    'enterprise',
    '{"features": ["collaboration", "integrations", "analytics", "api_access"]}'
) ON CONFLICT (id) DO NOTHING;

-- System admin user
INSERT INTO users (id, email, name, preferences) VALUES
(
    'ffffffff-ffff-ffff-ffff-fffffffffffe',
    'admin@candlefish.ai',
    'System Administrator',
    '{"theme": "system", "notifications": {"email": true, "push": true}}'
) ON CONFLICT (id) DO NOTHING;

-- Add admin to organization
INSERT INTO organization_members (organization_id, user_id, role, permissions) VALUES
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'ffffffff-ffff-ffff-ffff-fffffffffffe',
    'owner',
    '{"all": true}'
) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Default collection for shared documents
INSERT INTO collections (id, organization_id, name, description, created_by) VALUES
(
    'ffffffff-ffff-ffff-ffff-ffffffffffe0',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Shared Documents',
    'Default collection for shared documents',
    'ffffffff-ffff-ffff-ffff-fffffffffffe'
) ON CONFLICT (id) DO NOTHING;
EOF

# Create performance monitoring views
echo -e "${YELLOW}📈 Creating monitoring views...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Active collaboration sessions view
CREATE OR REPLACE VIEW v_active_collaborations AS
SELECT
    d.id as document_id,
    d.title,
    d.organization_id,
    COUNT(ps.id) as active_users,
    MAX(ps.last_ping) as last_activity,
    string_agg(u.name, ', ') as active_user_names
FROM documents d
LEFT JOIN presence_sessions ps ON d.id = ps.document_id AND ps.ended_at IS NULL
LEFT JOIN users u ON ps.user_id = u.id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.title, d.organization_id
HAVING COUNT(ps.id) > 0;

-- Document activity summary view
CREATE OR REPLACE VIEW v_document_activity_summary AS
SELECT
    d.id as document_id,
    d.title,
    d.organization_id,
    COUNT(DISTINCT da.user_id) as unique_contributors,
    COUNT(da.id) as total_activities,
    MAX(da.created_at) as last_activity,
    COUNT(CASE WHEN da.activity_type = 'updated' THEN 1 END) as content_updates,
    COUNT(CASE WHEN da.activity_type = 'commented' THEN 1 END) as comments
FROM documents d
LEFT JOIN document_activities da ON d.id = da.document_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.title, d.organization_id;

-- Comment resolution rate view
CREATE OR REPLACE VIEW v_comment_resolution_stats AS
SELECT
    d.organization_id,
    COUNT(*) as total_comments,
    COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) as resolved_comments,
    ROUND(
        COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as resolution_rate_percent
FROM comments c
JOIN documents d ON c.document_id = d.id
WHERE c.deleted_at IS NULL AND d.deleted_at IS NULL
GROUP BY d.organization_id;
EOF

# Set up automated cleanup job
echo -e "${YELLOW}🧹 Setting up cleanup procedures...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create a function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Clean up old presence sessions (older than 1 hour)
    UPDATE presence_sessions
    SET ended_at = NOW()
    WHERE ended_at IS NULL
    AND last_ping < NOW() - INTERVAL '1 hour';

    -- Clean up old CRDT operations (older than 30 days, but keep recent ones)
    DELETE FROM crdt_operations
    WHERE applied_at < NOW() - INTERVAL '30 days'
    AND document_id NOT IN (
        SELECT DISTINCT document_id
        FROM crdt_operations
        WHERE applied_at >= NOW() - INTERVAL '7 days'
    );

    -- Clean up old notifications (older than 90 days and read)
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND read_at IS NOT NULL;

    -- Update document metrics for yesterday if not exists
    INSERT INTO document_metrics (document_id, date)
    SELECT DISTINCT id, CURRENT_DATE - 1
    FROM documents
    WHERE deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM document_metrics dm
        WHERE dm.document_id = documents.id
        AND dm.date = CURRENT_DATE - 1
    );

    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO app_user;
EOF

# Create performance indexes if they don't exist
echo -e "${YELLOW}⚡ Optimizing performance...${NC}"
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_status
    ON documents(organization_id, status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crdt_operations_doc_sequence
    ON crdt_operations(document_id, sequence_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_presence_active_by_doc
    ON presence_sessions(document_id) WHERE ended_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_unresolved
    ON comments(document_id, status) WHERE status != 'resolved' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_activities_recent
    ON document_activities(document_id, created_at DESC)
    WHERE created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Analyze tables for query planner
ANALYZE organizations;
ANALYZE users;
ANALYZE organization_members;
ANALYZE documents;
ANALYZE document_versions;
ANALYZE crdt_operations;
ANALYZE presence_sessions;
ANALYZE comments;
ANALYZE document_activities;
ANALYZE notifications;
EOF

echo -e "${GREEN}🎉 Database initialization completed successfully!${NC}"
echo ""
echo "Database Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Next Steps:"
echo "  1. Update your application connection strings"
echo "  2. Set up automated backups"
echo "  3. Configure monitoring and alerting"
echo "  4. Test the RTPM API integration"
echo ""
echo -e "${YELLOW}💡 Remember to run 'SELECT cleanup_old_data();' periodically via cron job${NC}"
