-- PromoterOS Initial Database Schema
-- PostgreSQL 15 with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE platform_type AS ENUM ('tiktok', 'instagram', 'spotify', 'youtube', 'soundcloud');
CREATE TYPE metric_type AS ENUM ('followers', 'likes', 'comments', 'shares', 'views', 'streams', 'monthly_listeners');
CREATE TYPE prediction_model_type AS ENUM ('xgboost', 'neural_network', 'ensemble');

-- Artists table
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    platform_ids JSONB NOT NULL DEFAULT '{}',
    genres TEXT[],
    location GEOGRAPHY(POINT, 4326),
    location_name VARCHAR(255),
    bio TEXT,
    image_url VARCHAR(500),
    website VARCHAR(500),
    embedding vector(768),  -- For ML similarity search
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for artists
CREATE INDEX idx_artists_name_gin ON artists USING gin(name gin_trgm_ops);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_embedding ON artists USING ivfflat (embedding vector_l2_ops);
CREATE INDEX idx_artists_location ON artists USING GIST(location);
CREATE INDEX idx_artists_genres ON artists USING GIN(genres);
CREATE INDEX idx_artists_platform_ids ON artists USING GIN(platform_ids);
CREATE INDEX idx_artists_deleted_at ON artists(deleted_at) WHERE deleted_at IS NULL;

-- Venues table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    amenities JSONB DEFAULT '{}',
    technical_specs JSONB DEFAULT '{}',
    booking_policy JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for venues
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_venues_city_state ON venues(city, state);

-- Metrics table (partitioned by time)
CREATE TABLE metrics (
    id UUID DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    metric_type metric_type NOT NULL,
    value NUMERIC NOT NULL,
    change_24h NUMERIC,
    change_7d NUMERIC,
    change_30d NUMERIC,
    metadata JSONB DEFAULT '{}',
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, collected_at)
) PARTITION BY RANGE (collected_at);

-- Create partitions for metrics (monthly)
CREATE TABLE metrics_2025_01 PARTITION OF metrics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE metrics_2025_02 PARTITION OF metrics
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE metrics_2025_03 PARTITION OF metrics
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
-- Add more partitions as needed

-- Indexes for metrics
CREATE INDEX idx_metrics_artist_platform ON metrics(artist_id, platform, collected_at DESC);
CREATE INDEX idx_metrics_collected_at ON metrics(collected_at DESC);
CREATE INDEX idx_metrics_type_value ON metrics(metric_type, value);

-- Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    model_type prediction_model_type NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    predicted_demand INTEGER NOT NULL CHECK (predicted_demand >= 0),
    demand_range_min INTEGER CHECK (demand_range_min >= 0),
    demand_range_max INTEGER CHECK (demand_range_max >= 0),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    price_recommendation DECIMAL(10,2) CHECK (price_recommendation >= 0),
    optimal_price DECIMAL(10,2) CHECK (optimal_price >= 0),
    breakeven_price DECIMAL(10,2) CHECK (breakeven_price >= 0),
    risk_score DECIMAL(3,2) CHECK (risk_score BETWEEN 0 AND 1),
    risk_factors JSONB DEFAULT '[]',
    features JSONB NOT NULL,
    similar_events JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Indexes for predictions
CREATE INDEX idx_predictions_artist_venue ON predictions(artist_id, venue_id, event_date);
CREATE INDEX idx_predictions_confidence ON predictions(confidence_score DESC);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_expires_at ON predictions(expires_at);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    artist_id UUID NOT NULL REFERENCES artists(id),
    venue_id UUID NOT NULL REFERENCES venues(id),
    prediction_id UUID REFERENCES predictions(id),
    status booking_status NOT NULL DEFAULT 'pending',
    event_date DATE NOT NULL,
    doors_time TIME,
    show_time TIME,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    tickets_available INTEGER CHECK (tickets_available >= 0),
    tickets_sold INTEGER DEFAULT 0 CHECK (tickets_sold >= 0),
    ticket_price DECIMAL(10,2) CHECK (ticket_price >= 0),
    gross_revenue DECIMAL(12,2),
    artist_fee DECIMAL(12,2),
    venue_fee DECIMAL(12,2),
    contract_terms JSONB DEFAULT '{}',
    rider_requirements JSONB DEFAULT '{}',
    marketing_assets JSONB DEFAULT '{}',
    notes TEXT,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for bookings
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_artist ON bookings(artist_id);
CREATE INDEX idx_bookings_venue ON bookings(venue_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Scraper jobs table for tracking
CREATE TABLE scraper_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL,
    platform platform_type NOT NULL,
    target_id VARCHAR(255),
    target_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    proxy_used VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    result JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraper jobs
CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status, priority DESC, created_at);
CREATE INDEX idx_scraper_jobs_platform ON scraper_jobs(platform, status);
CREATE INDEX idx_scraper_jobs_created_at ON scraper_jobs(created_at DESC);

-- ML model registry
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type prediction_model_type NOT NULL,
    artifact_url TEXT NOT NULL,
    endpoint_url TEXT,
    metrics JSONB NOT NULL,
    hyperparameters JSONB,
    feature_importance JSONB,
    training_data JSONB,
    validation_results JSONB,
    is_active BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, version)
);

-- Indexes for ML models
CREATE INDEX idx_ml_models_active ON ml_models(is_active) WHERE is_active = true;
CREATE INDEX idx_ml_models_type ON ml_models(model_type);
CREATE INDEX idx_ml_models_created_at ON ml_models(created_at DESC);

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security policies
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create application user and grant permissions
CREATE USER promoteros_app WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';
GRANT CONNECT ON DATABASE postgres TO promoteros_app;
GRANT USAGE ON SCHEMA public TO promoteros_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO promoteros_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO promoteros_app;
