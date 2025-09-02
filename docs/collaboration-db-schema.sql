-- Real-Time Collaboration Platform Database Schema
-- Designed for PostgreSQL with existing Candlefish AI infrastructure

-- Core Projects and Organization
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Document Management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}', -- Stores document content in operational transform format
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('text', 'code', 'markdown', 'diagram')),
    file_path VARCHAR(1000),
    parent_folder_id UUID REFERENCES document_folders(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id)
);

CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES document_folders(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Version History and Snapshots
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    content_delta JSONB, -- Stores the operational transform delta
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    commit_message TEXT,
    tags TEXT[],
    UNIQUE(document_id, version_number)
);

-- Real-time Collaboration State
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    cursor_position JSONB,
    selection_range JSONB,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, user_id, session_id)
);

-- Operational Transform Operations Log
CREATE TABLE document_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'insert', 'delete', 'retain', 'format'
    operation_data JSONB NOT NULL,
    sequence_number BIGSERIAL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transform_against TEXT[], -- IDs of operations this was transformed against
    INDEX (document_id, sequence_number),
    INDEX (document_id, applied_at)
);

-- AI-powered Features
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    suggestion_type VARCHAR(50) NOT NULL, -- 'completion', 'correction', 'enhancement', 'translation'
    context_range JSONB NOT NULL, -- Position and content context
    suggestion_content JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    nanda_agent_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Comments and Annotations
CREATE TABLE document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES document_comments(id),
    content TEXT NOT NULL,
    position_reference JSONB, -- Where in the document this comment refers to
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity and Audit Trail
CREATE TABLE collaboration_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    document_id UUID REFERENCES documents(id),
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (project_id, occurred_at),
    INDEX (document_id, occurred_at),
    INDEX (user_id, occurred_at)
);

-- Real-time Presence Tracking
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    document_id UUID REFERENCES documents(id),
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    current_activity JSONB,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks and Integrations
CREATE TABLE collaboration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    events TEXT[] NOT NULL,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_folder ON documents(parent_folder_id);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_collaboration_sessions_doc ON collaboration_sessions(document_id);
CREATE INDEX idx_collaboration_sessions_user ON collaboration_sessions(user_id);
CREATE INDEX idx_document_operations_doc_seq ON document_operations(document_id, sequence_number);
CREATE INDEX idx_ai_suggestions_doc ON ai_suggestions(document_id);
CREATE INDEX idx_ai_suggestions_user ON ai_suggestions(user_id);
CREATE INDEX idx_comments_document ON document_comments(document_id);
CREATE INDEX idx_activities_project_time ON collaboration_activities(project_id, occurred_at DESC);
CREATE INDEX idx_user_presence_project ON user_presence(project_id);
CREATE INDEX idx_user_presence_document ON user_presence(document_id);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON document_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_presence_updated_at BEFORE UPDATE ON user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();