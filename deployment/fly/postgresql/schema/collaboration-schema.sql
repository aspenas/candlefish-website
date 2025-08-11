-- Candlefish AI Collaboration System Database Schema
-- PostgreSQL 15+ with CRDT support and real-time collaboration
--
-- Core Features:
-- - Multi-tenant organization support
-- - Real-time document collaboration with CRDT
-- - Versioning and conflict resolution
-- - Comments and activity tracking
-- - Paintbox and Brand Portal integration
-- - Performance optimizations with proper indexes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Users with multi-org support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Organization memberships
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Document collections/folders
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Core documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'rich_text', -- rich_text, markdown, json, structured
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- CRDT state for collaborative editing
    crdt_type VARCHAR(50) NOT NULL DEFAULT 'yjs', -- yjs, json_crdt, rga, lseq
    crdt_state JSONB NOT NULL DEFAULT '{}',
    vector_clock JSONB NOT NULL DEFAULT '{}',

    -- Permissions and sharing
    visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- private, organization, public
    permissions JSONB DEFAULT '{}',
    share_token UUID UNIQUE DEFAULT uuid_generate_v4(),

    -- Workflow state
    status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, published, archived
    locked_by UUID REFERENCES users(id),
    locked_until TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,

    -- Search
    search_vector tsvector,

    -- Integration fields
    paintbox_estimate_id VARCHAR(255),
    brand_portal_theme_id UUID
);

-- Document versions for version control
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL,
    crdt_state JSONB NOT NULL,
    vector_clock JSONB NOT NULL,
    changes_summary TEXT,

    -- Branching support
    parent_version_id UUID REFERENCES document_versions(id),
    branch_name VARCHAR(100) DEFAULT 'main',
    is_merged BOOLEAN DEFAULT FALSE,
    merge_commit_id UUID,

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, version_number)
);

-- CRDT operation log for conflict resolution
CREATE TABLE crdt_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- insert, delete, retain, format
    operation_data JSONB NOT NULL,
    vector_clock JSONB NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- For ordering operations
    sequence_number BIGSERIAL,

    -- Index for fast lookups
    INDEX (document_id, applied_at),
    INDEX (document_id, sequence_number)
);

-- Real-time presence sessions
CREATE TABLE presence_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL DEFAULT '{}', -- cursor position, selection, typing status
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,

    -- Automatic cleanup of old sessions
    INDEX (last_ping) WHERE ended_at IS NULL
);

-- Comment system with threading
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_format VARCHAR(50) DEFAULT 'markdown',

    -- Position in document (for inline comments)
    position_start INTEGER,
    position_end INTEGER,
    position_context TEXT, -- text around the comment for context

    -- Status tracking
    status VARCHAR(50) DEFAULT 'open', -- open, resolved, archived
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Comment reactions
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL, -- like, love, laugh, confused, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(comment_id, user_id, reaction_type)
);

-- Mentions in comments
CREATE TABLE comment_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity feed for documents
CREATE TABLE document_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- created, updated, commented, shared, etc.
    activity_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- For efficient querying
    INDEX (document_id, created_at DESC),
    INDEX (user_id, created_at DESC)
);

-- Document sharing and permissions
CREATE TABLE document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(255),
    permission_level VARCHAR(50) NOT NULL DEFAULT 'view', -- view, comment, edit, admin
    expires_at TIMESTAMP WITH TIME ZONE,

    shared_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Either user_id or email should be set, not both
    CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_email IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_email IS NOT NULL)
    )
);

-- Integration with Paintbox estimates
CREATE TABLE paintbox_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    estimate_id VARCHAR(255) NOT NULL,
    project_name VARCHAR(500),
    estimate_status VARCHAR(100),
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, error
    sync_data JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, estimate_id)
);

-- Integration with Brand Portal themes
CREATE TABLE brand_portal_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL,
    theme_name VARCHAR(255),
    brand_colors JSONB DEFAULT '{}',
    brand_fonts JSONB DEFAULT '{}',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',

    -- Reference to the source object
    reference_type VARCHAR(100), -- document, comment, etc.
    reference_id UUID,

    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX (user_id, created_at DESC),
    INDEX (user_id, read_at) WHERE read_at IS NULL
);

-- Document analytics and metrics
CREATE TABLE document_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- View metrics
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,

    -- Collaboration metrics
    collaboration_time_minutes INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,

    -- Comment metrics
    comments_added INTEGER DEFAULT 0,
    comments_resolved INTEGER DEFAULT 0,

    -- Update metrics
    content_changes INTEGER DEFAULT 0,
    version_saves INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, date)
);

-- Search indexes for full-text search
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_org_title ON documents(organization_id, title);
CREATE INDEX idx_documents_created_by ON documents(created_by, created_at DESC);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC) WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX idx_collections_org_parent ON collections(organization_id, parent_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_comments_document ON comments(document_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_presence_sessions_active ON presence_sessions(document_id, last_ping DESC) WHERE ended_at IS NULL;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_shares_updated_at BEFORE UPDATE ON document_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector trigger for documents
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content::text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_search_vector_trigger
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (these will be set by the application based on current user context)
-- Example policy for documents (actual policies will be created by the application)
-- CREATE POLICY documents_org_isolation ON documents
--     FOR ALL TO app_user
--     USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Cleanup function for old presence sessions
CREATE OR REPLACE FUNCTION cleanup_old_presence_sessions()
RETURNS void AS $$
BEGIN
    UPDATE presence_sessions
    SET ended_at = NOW()
    WHERE ended_at IS NULL
    AND last_ping < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
