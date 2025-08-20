-- Initial schema for Candlefish Website
-- Version: 001
-- Created: 2025-01-20

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'analyst');
CREATE TYPE assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_metadata_gin ON users USING gin(metadata);

-- Assessments table
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status assessment_status DEFAULT 'draft',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for assessments
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_created_at ON assessments(created_at);
CREATE INDEX idx_assessments_score ON assessments(score);
CREATE INDEX idx_assessments_data_gin ON assessments USING gin(data);
CREATE INDEX idx_assessments_results_gin ON assessments USING gin(results);

-- Case studies table
CREATE TABLE case_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    metrics JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_published BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for case studies
CREATE INDEX idx_case_studies_published ON case_studies(is_published, published_at);
CREATE INDEX idx_case_studies_featured ON case_studies(featured, created_at);
CREATE INDEX idx_case_studies_industry ON case_studies(industry);
CREATE INDEX idx_case_studies_tags_gin ON case_studies USING gin(tags);
CREATE INDEX idx_case_studies_metrics_gin ON case_studies USING gin(metrics);

-- Insights table
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    data JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for insights
CREATE INDEX idx_insights_published ON insights(is_published, published_at);
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_insights_tags_gin ON insights USING gin(tags);
CREATE INDEX idx_insights_view_count ON insights(view_count);

-- Contact form submissions table
CREATE TABLE contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    message TEXT NOT NULL,
    phone VARCHAR(50),
    source VARCHAR(100) DEFAULT 'website',
    status VARCHAR(50) DEFAULT 'new',
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for contact submissions
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at);
CREATE INDEX idx_contact_submissions_source ON contact_submissions(source);

-- Analytics events table for tracking user interactions
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics events
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_properties_gin ON analytics_events USING gin(properties);

-- API usage tracking table
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER,
    response_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for API usage
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_status_code ON api_usage(status_code);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- Add updated_at triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON case_studies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies for multi-tenancy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::uuid);

-- Users can only see their own assessments
CREATE POLICY assessments_own_data ON assessments
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Create materialized view for analytics
CREATE MATERIALIZED VIEW daily_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), event_type
ORDER BY date DESC, event_type;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_daily_analytics_date_type ON daily_analytics(date, event_type);

-- Create a function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_daily_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics;
END;
$$ LANGUAGE plpgsql;

-- Insert initial admin user (update email/name as needed)
INSERT INTO users (email, name, role) VALUES 
('admin@candlefish.ai', 'Candlefish Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample case studies
INSERT INTO case_studies (title, summary, content, industry, company_size, is_published, featured, published_at) VALUES 
(
    'AI-Driven Customer Service Transformation',
    'How a Fortune 500 company reduced response times by 70% using AI-powered customer service.',
    'This comprehensive case study details the implementation of an AI-driven customer service platform that transformed customer interactions for a leading technology company...',
    'Technology',
    'Enterprise',
    true,
    true,
    NOW()
),
(
    'Predictive Analytics for Supply Chain Optimization',
    'Manufacturing company achieves 30% cost reduction through predictive analytics.',
    'Learn how advanced predictive analytics helped optimize supply chain operations, reduce waste, and improve delivery times...',
    'Manufacturing',
    'Large',
    true,
    false,
    NOW()
),
(
    'Machine Learning for Fraud Detection',
    'Financial services firm implements ML-based fraud detection with 99.5% accuracy.',
    'Discover how machine learning algorithms transformed fraud detection capabilities, reducing false positives and improving security...',
    'Financial Services',
    'Enterprise',
    true,
    true,
    NOW()
)
ON CONFLICT DO NOTHING;

-- Insert sample insights
INSERT INTO insights (title, content, summary, category, tags, is_published, published_at) VALUES 
(
    'The Future of AI in Business Operations',
    'Artificial Intelligence continues to reshape how businesses operate, from automating routine tasks to providing sophisticated analytics...',
    'Exploring the transformative impact of AI on modern business operations.',
    'AI Strategy',
    ARRAY['AI', 'Business Strategy', 'Automation'],
    true,
    NOW()
),
(
    'Data Privacy in the Age of AI',
    'As AI systems become more sophisticated, ensuring data privacy and compliance becomes increasingly critical...',
    'Best practices for maintaining data privacy while leveraging AI capabilities.',
    'Data Privacy',
    ARRAY['Privacy', 'Compliance', 'AI Ethics'],
    true,
    NOW()
),
(
    'ROI Measurement for AI Initiatives',
    'Measuring the return on investment for AI projects requires a comprehensive approach that goes beyond traditional metrics...',
    'A framework for accurately measuring AI project ROI.',
    'Business Value',
    ARRAY['ROI', 'Metrics', 'AI Strategy'],
    true,
    NOW()
)
ON CONFLICT DO NOTHING;

-- Create database version tracking
CREATE TABLE schema_versions (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial version
INSERT INTO schema_versions (version, description) VALUES 
(1, 'Initial schema with users, assessments, case studies, insights, and analytics');

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO candlefish_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO candlefish_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO candlefish_app;