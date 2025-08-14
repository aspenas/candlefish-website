# Apollo GraphOS Federation - Database Schemas and Data Models

## Overview
This document defines the database schemas, data models, and relationships for all subgraphs in the Apollo GraphOS federation. The architecture uses PostgreSQL as the primary database with appropriate indexing strategies for optimal performance.

## Database Architecture

### 1. Multi-Database Strategy
Each subgraph maintains its own dedicated database to ensure proper service boundaries and independent scaling:

- **paintbox_customers**: Customer and Salesforce integration data  
- **paintbox_projects**: Project management and Company Cam integration
- **paintbox_estimates**: Estimate calculations and pricing (existing)
- **paintbox_integrations**: Integration logs, sync status, and external API metadata

### 2. Shared Reference Data
Common lookup tables replicated across databases for performance:
- Countries, states, cities
- Industry classifications  
- User roles and permissions

## Customers Database Schema

### Core Tables

```sql
-- customers schema
CREATE SCHEMA IF NOT EXISTS customers;

-- Main customer entity
CREATE TABLE customers.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesforce_id VARCHAR(18) UNIQUE, -- Salesforce ID format
    
    -- Basic Information
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE, -- RFC 5321 max length
    phone VARCHAR(20),
    company VARCHAR(255),
    
    -- Address Information (denormalized for performance)
    mailing_street TEXT,
    mailing_city VARCHAR(255),
    mailing_state VARCHAR(50),
    mailing_postal_code VARCHAR(20),
    mailing_country VARCHAR(2) NOT NULL DEFAULT 'US',
    mailing_latitude DECIMAL(10, 8),
    mailing_longitude DECIMAL(11, 8),
    
    billing_street TEXT,
    billing_city VARCHAR(255), 
    billing_state VARCHAR(50),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2) NOT NULL DEFAULT 'US',
    billing_latitude DECIMAL(10, 8),
    billing_longitude DECIMAL(11, 8),
    
    service_street TEXT,
    service_city VARCHAR(255),
    service_state VARCHAR(50), 
    service_postal_code VARCHAR(20),
    service_country VARCHAR(2) NOT NULL DEFAULT 'US',
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(11, 8),
    
    -- Business Information
    account_type customers.account_type_enum NOT NULL,
    lead_source VARCHAR(100),
    industry VARCHAR(100),
    website VARCHAR(500),
    
    -- Financial Information
    credit_limit DECIMAL(12, 2),
    payment_terms VARCHAR(50),
    tax_exempt BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Salesforce Integration
    salesforce_owner_id VARCHAR(18),
    territory VARCHAR(100),
    account_number VARCHAR(50),
    
    -- Status and Metadata
    status customers.customer_status_enum NOT NULL DEFAULT 'PROSPECT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    
    -- Audit fields
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Search
    search_vector TSVECTOR,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[\d\s\-\(\)\.]+$')
);

-- Customer sync status tracking
CREATE TABLE customers.customer_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers.customers(id) ON DELETE CASCADE,
    salesforce_id VARCHAR(18),
    
    -- Sync Details
    sync_type customers.sync_type_enum NOT NULL,
    status customers.sync_status_enum NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    sync_version VARCHAR(20),
    payload JSONB,
    external_references JSONB,
    
    -- Indexes for performance
    INDEX idx_customer_sync_logs_customer_id ON customers.customer_sync_logs(customer_id),
    INDEX idx_customer_sync_logs_status ON customers.customer_sync_logs(status),
    INDEX idx_customer_sync_logs_started_at ON customers.customer_sync_logs(started_at DESC)
);

-- Salesforce user cache
CREATE TABLE customers.salesforce_users (
    id VARCHAR(18) PRIMARY KEY, -- Salesforce User ID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    username VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    user_role VARCHAR(100),
    territory VARCHAR(100),
    profile VARCHAR(100),
    custom_fields JSONB,
    
    -- Cache metadata
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    INDEX idx_salesforce_users_email ON customers.salesforce_users(email),
    INDEX idx_salesforce_users_territory ON customers.salesforce_users(territory),
    INDEX idx_salesforce_users_cached_at ON customers.salesforce_users(cached_at)
);

-- Create enums
CREATE TYPE customers.account_type_enum AS ENUM (
    'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT', 'NON_PROFIT'
);

CREATE TYPE customers.customer_status_enum AS ENUM (
    'ACTIVE', 'INACTIVE', 'PROSPECT', 'QUALIFIED_LEAD', 'CONVERTED', 'CHURNED', 'SUSPENDED'
);

CREATE TYPE customers.sync_type_enum AS ENUM (
    'MANUAL', 'SCHEDULED', 'WEBHOOK', 'BULK', 'INITIAL'
);

CREATE TYPE customers.sync_status_enum AS ENUM (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING'
);
```

### Indexes and Constraints

```sql
-- Primary indexes for customers
CREATE INDEX idx_customers_email ON customers.customers(email);
CREATE INDEX idx_customers_salesforce_id ON customers.customers(salesforce_id) WHERE salesforce_id IS NOT NULL;
CREATE INDEX idx_customers_account_type ON customers.customers(account_type);
CREATE INDEX idx_customers_status ON customers.customers(status);
CREATE INDEX idx_customers_created_at ON customers.customers(created_at DESC);
CREATE INDEX idx_customers_updated_at ON customers.customers(updated_at DESC);
CREATE INDEX idx_customers_territory ON customers.customers(territory) WHERE territory IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_customers_status_type ON customers.customers(status, account_type);
CREATE INDEX idx_customers_territory_status ON customers.customers(territory, status) WHERE territory IS NOT NULL;

-- Geographic indexes for location-based queries
CREATE INDEX idx_customers_mailing_location ON customers.customers USING GIST(
    point(mailing_longitude, mailing_latitude)
) WHERE mailing_latitude IS NOT NULL AND mailing_longitude IS NOT NULL;

CREATE INDEX idx_customers_service_location ON customers.customers USING GIST(
    point(service_longitude, service_latitude)  
) WHERE service_latitude IS NOT NULL AND service_longitude IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_customers_search_vector ON customers.customers USING GIN(search_vector);

-- Update search vector trigger
CREATE OR REPLACE FUNCTION customers.update_customer_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_search_vector
    BEFORE INSERT OR UPDATE ON customers.customers
    FOR EACH ROW EXECUTE FUNCTION customers.update_customer_search_vector();
```

## Projects Database Schema

### Core Tables

```sql
-- projects schema
CREATE SCHEMA IF NOT EXISTS projects;

-- Main project entity
CREATE TABLE projects.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL, -- Foreign key to customers DB (federated)
    company_cam_id VARCHAR(50) UNIQUE,
    
    -- Basic Information
    name VARCHAR(500) NOT NULL,
    description TEXT,
    type projects.project_type_enum NOT NULL,
    priority projects.project_priority_enum NOT NULL DEFAULT 'NORMAL',
    
    -- Timeline & Scheduling
    status projects.project_status_enum NOT NULL DEFAULT 'PLANNING',
    scheduled_start_date DATE,
    actual_start_date DATE,
    scheduled_end_date DATE,
    actual_end_date DATE,
    estimated_duration INTEGER, -- in days
    
    -- Service Address (required for all projects)
    service_street TEXT NOT NULL,
    service_city VARCHAR(255) NOT NULL,
    service_state VARCHAR(50) NOT NULL,
    service_postal_code VARCHAR(20) NOT NULL,
    service_country VARCHAR(2) NOT NULL DEFAULT 'US',
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(11, 8),
    
    -- Financial Information
    budget_amount DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    profit_margin DECIMAL(5, 2), -- percentage
    
    -- Weather & Environmental
    weather_restrictions JSONB, -- Array of weather restriction objects
    optimal_conditions JSONB,   -- Optimal weather conditions object
    
    -- Documentation
    notes TEXT,
    specifications JSONB,
    
    -- Photo Management
    photo_count INTEGER NOT NULL DEFAULT 0,
    last_photo_sync TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Search
    search_vector TSVECTOR,
    
    -- Computed columns
    is_overdue BOOLEAN GENERATED ALWAYS AS (
        status IN ('SCHEDULED', 'IN_PROGRESS') AND 
        scheduled_end_date IS NOT NULL AND 
        scheduled_end_date < CURRENT_DATE
    ) STORED,
    
    days_until_deadline INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN scheduled_end_date IS NULL THEN NULL
            ELSE (scheduled_end_date - CURRENT_DATE)
        END
    ) STORED
);

-- Project photos
CREATE TABLE projects.project_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    company_cam_id VARCHAR(50) UNIQUE,
    
    -- Photo Details
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    original_filename VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    
    -- Metadata
    category projects.photo_category_enum NOT NULL,
    tags TEXT[], -- Array of tags
    description TEXT,
    captured_at TIMESTAMPTZ NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_description TEXT,
    
    -- Organization
    phase projects.project_phase_enum,
    room VARCHAR(200),
    surface VARCHAR(200),
    
    -- Company Cam Integration
    company_cam_metadata JSONB,
    sync_status projects.photo_sync_status_enum NOT NULL DEFAULT 'PENDING',
    last_sync_at TIMESTAMPTZ,
    
    -- AI Analysis (if available)
    ai_analysis JSONB,
    
    -- Audit
    captured_by UUID,
    uploaded_by UUID NOT NULL,
    
    INDEX idx_project_photos_project_id ON projects.project_photos(project_id),
    INDEX idx_project_photos_category ON projects.project_photos(category),
    INDEX idx_project_photos_captured_at ON projects.project_photos(captured_at DESC),
    INDEX idx_project_photos_company_cam_id ON projects.project_photos(company_cam_id) WHERE company_cam_id IS NOT NULL,
    INDEX idx_project_photos_sync_status ON projects.project_photos(sync_status),
    INDEX idx_project_photos_tags ON projects.project_photos USING GIN(tags),
    
    -- Geographic index for photos
    INDEX idx_project_photos_location ON projects.project_photos USING GIST(
        point(longitude, latitude)
    ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL
);

-- Project crew assignments
CREATE TABLE projects.project_crew_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    crew_member_id UUID NOT NULL,
    
    -- Assignment Details
    role projects.crew_role_enum NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Financial
    hourly_rate DECIMAL(8, 2),
    estimated_hours DECIMAL(6, 2),
    
    -- Metadata
    assigned_by UUID NOT NULL,
    notes TEXT,
    
    UNIQUE(project_id, crew_member_id, role, start_date),
    INDEX idx_project_crew_project_id ON projects.project_crew_assignments(project_id),
    INDEX idx_project_crew_member_id ON projects.project_crew_assignments(crew_member_id),
    INDEX idx_project_crew_active ON projects.project_crew_assignments(is_active) WHERE is_active = TRUE
);

-- Crew members master table
CREATE TABLE projects.crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320),
    phone VARCHAR(20),
    skill_level projects.skill_level_enum NOT NULL DEFAULT 'APPRENTICE',
    default_hourly_rate DECIMAL(8, 2),
    
    -- Availability
    available_from DATE,
    available_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_crew_members_skill_level ON projects.crew_members(skill_level),
    INDEX idx_crew_members_active ON projects.crew_members(is_active) WHERE is_active = TRUE
);

-- Project timeline events
CREATE TABLE projects.project_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type projects.timeline_event_type_enum NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User and System
    user_id UUID,
    system_generated BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB,
    
    INDEX idx_timeline_events_project_id ON projects.project_timeline_events(project_id),
    INDEX idx_timeline_events_type ON projects.project_timeline_events(event_type),
    INDEX idx_timeline_events_timestamp ON projects.project_timeline_events(event_timestamp DESC)
);

-- Project permits
CREATE TABLE projects.project_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    
    -- Permit Information
    permit_type projects.permit_type_enum NOT NULL,
    permit_number VARCHAR(100) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    issued_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status projects.permit_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Financial
    cost DECIMAL(10, 2),
    
    -- Documentation
    document_url TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    UNIQUE(project_id, permit_type, permit_number),
    INDEX idx_project_permits_project_id ON projects.project_permits(project_id),
    INDEX idx_project_permits_status ON projects.project_permits(status),
    INDEX idx_project_permits_expiration ON projects.project_permits(expiration_date)
);

-- Project enums
CREATE TYPE projects.project_status_enum AS ENUM (
    'PLANNING', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'REVIEW', 'COMPLETED', 'CANCELLED', 'ARCHIVED'
);

CREATE TYPE projects.project_type_enum AS ENUM (
    'INTERIOR_PAINTING', 'EXTERIOR_PAINTING', 'CABINET_REFINISHING', 
    'DECK_STAINING', 'PRESSURE_WASHING', 'DRYWALL_REPAIR', 
    'WALLPAPER_REMOVAL', 'TOUCH_UP', 'MAINTENANCE'
);

CREATE TYPE projects.project_priority_enum AS ENUM (
    'LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY'
);

CREATE TYPE projects.project_phase_enum AS ENUM (
    'PREPARATION', 'PRIMER', 'BASE_COAT', 'FINAL_COAT', 'TOUCH_UP', 'CLEANUP', 'COMPLETION'
);

CREATE TYPE projects.photo_category_enum AS ENUM (
    'BEFORE', 'PROGRESS', 'AFTER', 'DAMAGE', 'PREPARATION', 
    'MATERIALS', 'TEAM', 'SITE_CONDITIONS', 'QUALITY_CONTROL'
);

CREATE TYPE projects.photo_sync_status_enum AS ENUM (
    'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'DELETED'
);

CREATE TYPE projects.crew_role_enum AS ENUM (
    'LEAD_PAINTER', 'PAINTER', 'PREP_WORKER', 'HELPER', 'SUPERVISOR', 'SPECIALIST'
);

CREATE TYPE projects.skill_level_enum AS ENUM (
    'TRAINEE', 'APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER'
);

CREATE TYPE projects.permit_type_enum AS ENUM (
    'BUILDING', 'ELECTRICAL', 'PLUMBING', 'ENVIRONMENTAL', 'SAFETY', 'PARKING'
);

CREATE TYPE projects.permit_status_enum AS ENUM (
    'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'
);

CREATE TYPE projects.timeline_event_type_enum AS ENUM (
    'CREATED', 'STATUS_CHANGED', 'CREW_ASSIGNED', 'PHOTO_UPLOADED', 
    'NOTE_ADDED', 'PERMIT_OBTAINED', 'WEATHER_DELAY', 'CUSTOMER_CONTACT',
    'QUALITY_CHECK', 'COMPLETION'
);
```

### Project Indexes and Performance

```sql
-- Core project indexes
CREATE INDEX idx_projects_customer_id ON projects.projects(customer_id);
CREATE INDEX idx_projects_status ON projects.projects(status);
CREATE INDEX idx_projects_type ON projects.projects(type);
CREATE INDEX idx_projects_priority ON projects.projects(priority);
CREATE INDEX idx_projects_scheduled_dates ON projects.projects(scheduled_start_date, scheduled_end_date);
CREATE INDEX idx_projects_created_at ON projects.projects(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_projects_customer_status ON projects.projects(customer_id, status);
CREATE INDEX idx_projects_status_priority ON projects.projects(status, priority);
CREATE INDEX idx_projects_overdue ON projects.projects(is_overdue) WHERE is_overdue = TRUE;

-- Company Cam integration index
CREATE INDEX idx_projects_company_cam_id ON projects.projects(company_cam_id) WHERE company_cam_id IS NOT NULL;

-- Geographic index for service locations
CREATE INDEX idx_projects_service_location ON projects.projects USING GIST(
    point(service_longitude, service_latitude)
) WHERE service_latitude IS NOT NULL AND service_longitude IS NOT NULL;

-- Search index
CREATE INDEX idx_projects_search_vector ON projects.projects USING GIN(search_vector);

-- Search vector update function
CREATE OR REPLACE FUNCTION projects.update_project_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.service_city, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.service_state, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_search_vector
    BEFORE INSERT OR UPDATE ON projects.projects
    FOR EACH ROW EXECUTE FUNCTION projects.update_project_search_vector();

-- Photo count maintenance trigger
CREATE OR REPLACE FUNCTION projects.maintain_project_photo_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projects.projects 
        SET photo_count = photo_count + 1,
            last_photo_sync = NEW.uploaded_at
        WHERE id = NEW.project_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projects.projects 
        SET photo_count = GREATEST(0, photo_count - 1)
        WHERE id = OLD.project_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_photo_count_insert
    AFTER INSERT ON projects.project_photos
    FOR EACH ROW EXECUTE FUNCTION projects.maintain_project_photo_count();

CREATE TRIGGER trigger_project_photo_count_delete
    AFTER DELETE ON projects.project_photos
    FOR EACH ROW EXECUTE FUNCTION projects.maintain_project_photo_count();
```

## Integrations Database Schema

### Integration Metadata and Logs

```sql
-- integrations schema
CREATE SCHEMA IF NOT EXISTS integrations;

-- Integration service configurations
CREATE TABLE integrations.integration_configs (
    service integrations.integration_service_enum PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Configuration
    config JSONB NOT NULL,
    api_version VARCHAR(20),
    base_url TEXT,
    
    -- Rate Limiting
    rate_limit_per_hour INTEGER,
    rate_limit_per_minute INTEGER,
    concurrent_requests INTEGER DEFAULT 5,
    
    -- Timeouts and Retries
    timeout_seconds INTEGER DEFAULT 30,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    
    -- Health Monitoring
    health_check_url TEXT,
    health_check_interval_minutes INTEGER DEFAULT 5,
    last_health_check TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    
    -- Security
    requires_auth BOOLEAN NOT NULL DEFAULT TRUE,
    auth_type VARCHAR(50), -- 'oauth2', 'api_key', 'jwt'
    token_expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL
);

-- Sync operation logs
CREATE TABLE integrations.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service integrations.integration_service_enum NOT NULL,
    
    -- Operation Details
    operation integrations.sync_operation_enum NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    external_id VARCHAR(100), -- ID in external system
    
    -- Status and Timing
    status integrations.sync_status_enum NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Error Handling
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_code VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    
    -- Payload Tracking
    request_payload JSONB,
    response_payload JSONB,
    response_size INTEGER,
    
    -- Metadata
    triggered_by VARCHAR(50), -- 'user', 'webhook', 'scheduler', 'api'
    user_id UUID,
    correlation_id UUID, -- For tracing related operations
    metadata JSONB,
    
    -- Indexes for performance
    INDEX idx_sync_logs_service ON integrations.sync_logs(service),
    INDEX idx_sync_logs_status ON integrations.sync_logs(status),
    INDEX idx_sync_logs_entity ON integrations.sync_logs(entity_type, entity_id),
    INDEX idx_sync_logs_started_at ON integrations.sync_logs(started_at DESC),
    INDEX idx_sync_logs_correlation ON integrations.sync_logs(correlation_id) WHERE correlation_id IS NOT NULL
);

-- Bulk sync operations
CREATE TABLE integrations.bulk_sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service integrations.integration_service_enum NOT NULL,
    
    -- Operation Details
    operation_type VARCHAR(100) NOT NULL,
    filter_criteria JSONB,
    
    -- Progress Tracking
    status integrations.bulk_sync_status_enum NOT NULL DEFAULT 'QUEUED',
    total_items INTEGER,
    processed_items INTEGER NOT NULL DEFAULT 0,
    successful_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    estimated_completion_at TIMESTAMPTZ,
    
    -- Error Aggregation
    error_summary JSONB,
    failed_entity_ids TEXT[], -- Array of failed IDs
    
    -- Metadata
    triggered_by VARCHAR(50),
    user_id UUID,
    configuration JSONB,
    
    INDEX idx_bulk_sync_operations_service ON integrations.bulk_sync_operations(service),
    INDEX idx_bulk_sync_operations_status ON integrations.bulk_sync_operations(status),
    INDEX idx_bulk_sync_operations_started_at ON integrations.bulk_sync_operations(started_at DESC)
);

-- External system data cache
CREATE TABLE integrations.external_entity_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service integrations.integration_service_enum NOT NULL,
    
    -- Entity Identification
    external_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    
    -- Cached Data
    data JSONB NOT NULL,
    data_hash VARCHAR(64), -- SHA-256 hash for change detection
    
    -- Cache Management
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Validation
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_errors JSONB,
    
    UNIQUE(service, entity_type, external_id),
    INDEX idx_external_cache_service ON integrations.external_entity_cache(service),
    INDEX idx_external_cache_type ON integrations.external_entity_cache(entity_type),
    INDEX idx_external_cache_expires ON integrations.external_entity_cache(expires_at),
    INDEX idx_external_cache_accessed ON integrations.external_entity_cache(last_accessed_at DESC)
);

-- Webhook event log
CREATE TABLE integrations.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service integrations.integration_service_enum NOT NULL,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100), -- External event ID if provided
    
    -- Payload
    headers JSONB,
    payload JSONB NOT NULL,
    signature VARCHAR(500), -- Webhook signature for verification
    
    -- Processing
    status integrations.webhook_status_enum NOT NULL DEFAULT 'RECEIVED',
    processed_at TIMESTAMPTZ,
    processing_duration_ms INTEGER,
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_ip INET,
    user_agent TEXT,
    
    INDEX idx_webhook_events_service ON integrations.webhook_events(service),
    INDEX idx_webhook_events_type ON integrations.webhook_events(event_type),
    INDEX idx_webhook_events_status ON integrations.webhook_events(status),
    INDEX idx_webhook_events_received_at ON integrations.webhook_events(received_at DESC)
);

-- Rate limit tracking
CREATE TABLE integrations.rate_limit_tracking (
    service integrations.integration_service_enum NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    
    -- Counters
    request_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN request_count > 0 THEN total_duration_ms / request_count 
            ELSE 0 
        END
    ) STORED,
    
    -- Limits
    is_throttled BOOLEAN NOT NULL DEFAULT FALSE,
    throttle_until TIMESTAMPTZ,
    
    PRIMARY KEY (service, endpoint, window_start),
    INDEX idx_rate_limit_throttled ON integrations.rate_limit_tracking(is_throttled) WHERE is_throttled = TRUE
);

-- Integration enums
CREATE TYPE integrations.integration_service_enum AS ENUM (
    'SALESFORCE', 'COMPANY_CAM', 'WEATHER_API', 'GEOCODING_API', 
    'EMAIL_SERVICE', 'SMS_SERVICE', 'PAYMENT_PROCESSOR', 'ACCOUNTING_SYSTEM'
);

CREATE TYPE integrations.sync_operation_enum AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'SYNC', 'BULK_SYNC', 'WEBHOOK'
);

CREATE TYPE integrations.sync_status_enum AS ENUM (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING'
);

CREATE TYPE integrations.bulk_sync_status_enum AS ENUM (
    'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED', 'CANCELLED'
);

CREATE TYPE integrations.webhook_status_enum AS ENUM (
    'RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED'
);
```

## Cross-Database Relationships and Federation

### Federation Keys and External References

```sql
-- Add federation tracking tables to each database

-- In customers database
CREATE TABLE customers.federation_keys (
    local_id UUID NOT NULL,
    local_table VARCHAR(100) NOT NULL,
    external_service VARCHAR(50) NOT NULL,
    external_id UUID NOT NULL,
    external_table VARCHAR(100) NOT NULL,
    
    -- Relationship metadata
    relationship_type VARCHAR(50) NOT NULL, -- 'one_to_one', 'one_to_many', 'many_to_many'
    is_owner BOOLEAN NOT NULL DEFAULT FALSE, -- This service owns the relationship
    
    -- Sync tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    
    PRIMARY KEY (local_id, local_table, external_service, external_id),
    INDEX idx_federation_keys_local ON customers.federation_keys(local_id, local_table),
    INDEX idx_federation_keys_external ON customers.federation_keys(external_service, external_id)
);

-- In projects database
CREATE TABLE projects.federation_keys (
    local_id UUID NOT NULL,
    local_table VARCHAR(100) NOT NULL,
    external_service VARCHAR(50) NOT NULL,
    external_id UUID NOT NULL,
    external_table VARCHAR(100) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    
    PRIMARY KEY (local_id, local_table, external_service, external_id),
    INDEX idx_federation_keys_local ON projects.federation_keys(local_id, local_table),
    INDEX idx_federation_keys_external ON projects.federation_keys(external_service, external_id)
);

-- In estimates database (extend existing)
CREATE TABLE estimates.federation_keys (
    local_id UUID NOT NULL,
    local_table VARCHAR(100) NOT NULL,
    external_service VARCHAR(50) NOT NULL,
    external_id UUID NOT NULL,
    external_table VARCHAR(100) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    
    PRIMARY KEY (local_id, local_table, external_service, external_id),
    INDEX idx_federation_keys_local ON estimates.federation_keys(local_id, local_table),
    INDEX idx_federation_keys_external ON estimates.federation_keys(external_service, external_id)
);
```

### Data Consistency and Validation

```sql
-- Cross-service data validation function (to be deployed on each database)
CREATE OR REPLACE FUNCTION validate_federation_references() RETURNS TABLE (
    service VARCHAR(50),
    table_name VARCHAR(100),
    local_id UUID,
    external_service VARCHAR(50),
    external_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    -- This function would be implemented to validate that federated references
    -- still exist and are accessible across services
    -- Implementation would use HTTP calls to other services' health check endpoints
    RETURN QUERY
    SELECT 
        'customers'::VARCHAR(50) as service,
        fk.local_table,
        fk.local_id,
        fk.external_service,
        fk.external_id,
        fk.is_valid,
        CASE WHEN NOT fk.is_valid THEN 'Reference validation failed' ELSE NULL END::TEXT
    FROM customers.federation_keys fk
    WHERE fk.last_validated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

## Performance Optimization Strategies

### Partitioning Strategy

```sql
-- Partition large log tables by time for better performance
-- Example for sync logs (implement across all log tables)

-- Partition sync_logs by month
CREATE TABLE integrations.sync_logs_y2024m01 PARTITION OF integrations.sync_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE integrations.sync_logs_y2024m02 PARTITION OF integrations.sync_logs  
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automated partition management function
CREATE OR REPLACE FUNCTION integrations.create_monthly_partitions(
    table_name TEXT,
    start_date DATE DEFAULT CURRENT_DATE,
    months_ahead INTEGER DEFAULT 3
) RETURNS VOID AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    next_partition_date DATE;
BEGIN
    FOR i IN 0..months_ahead LOOP
        partition_date := date_trunc('month', start_date) + (i || ' months')::INTERVAL;
        next_partition_date := partition_date + '1 month'::INTERVAL;
        partition_name := table_name || '_y' || EXTRACT(YEAR FROM partition_date) || 'm' || 
                         LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS integrations.%I PARTITION OF integrations.%I
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, table_name, partition_date, next_partition_date
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly partition creation
SELECT integrations.create_monthly_partitions('sync_logs');
SELECT integrations.create_monthly_partitions('webhook_events');
```

### Materialized Views for Analytics

```sql
-- Customer summary materialized view
CREATE MATERIALIZED VIEW customers.customer_summary AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.company,
    c.account_type,
    c.status,
    c.created_at,
    
    -- Computed aggregations (would come from federated queries in real implementation)
    COALESCE(est_stats.estimate_count, 0) as estimate_count,
    COALESCE(est_stats.total_estimate_value, 0) as total_estimate_value,
    COALESCE(proj_stats.project_count, 0) as project_count,
    COALESCE(proj_stats.active_project_count, 0) as active_project_count,
    
    -- Last activity
    GREATEST(
        c.updated_at,
        COALESCE(est_stats.last_estimate_date, '1970-01-01'::TIMESTAMPTZ),
        COALESCE(proj_stats.last_project_date, '1970-01-01'::TIMESTAMPTZ)
    ) as last_activity_date

FROM customers.customers c
LEFT JOIN (
    -- This would be populated by federated queries or ETL processes
    SELECT 
        customer_id,
        COUNT(*) as estimate_count,
        SUM(CASE selected_tier 
            WHEN 'GOOD' THEN good_price 
            WHEN 'BETTER' THEN better_price 
            ELSE best_price 
        END) as total_estimate_value,
        MAX(created_at) as last_estimate_date
    FROM estimates.estimates 
    GROUP BY customer_id
) est_stats ON c.id = est_stats.customer_id
LEFT JOIN (
    -- This would be populated by federated queries or ETL processes  
    SELECT
        customer_id,
        COUNT(*) as project_count,
        COUNT(*) FILTER (WHERE status IN ('SCHEDULED', 'IN_PROGRESS')) as active_project_count,
        MAX(created_at) as last_project_date
    FROM projects.projects
    GROUP BY customer_id  
) proj_stats ON c.id = proj_stats.customer_id;

-- Create indexes on materialized view
CREATE INDEX idx_customer_summary_account_type ON customers.customer_summary(account_type);
CREATE INDEX idx_customer_summary_status ON customers.customer_summary(status);
CREATE INDEX idx_customer_summary_last_activity ON customers.customer_summary(last_activity_date DESC);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION customers.refresh_customer_summary() RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customers.customer_summary;
END;
$$ LANGUAGE plpgsql;
```

## Data Migration and Seeding

### Initial Data Setup

```sql
-- Sample data seeding for development/testing
-- This would be part of database initialization scripts

-- Insert sample customers
INSERT INTO customers.customers (
    id, first_name, last_name, email, company, account_type,
    mailing_street, mailing_city, mailing_state, mailing_postal_code,
    created_by
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'John', 'Smith', 'john.smith@example.com', 'Smith Enterprises', 'COMMERCIAL',
    '123 Business Ave', 'Portland', 'OR', '97201',
    '550e8400-e29b-41d4-a716-446655440000'::UUID
),
(
    '550e8400-e29b-41d4-a716-446655440002'::UUID,  
    'Jane', 'Doe', 'jane.doe@homeowner.com', NULL, 'RESIDENTIAL',
    '456 Residential St', 'Portland', 'OR', '97202',
    '550e8400-e29b-41d4-a716-446655440000'::UUID
);

-- Insert sample projects
INSERT INTO projects.projects (
    id, customer_id, name, type, priority, status,
    service_street, service_city, service_state, service_postal_code,
    scheduled_start_date, scheduled_end_date, budget_amount,
    created_by
) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001'::UUID,
    '550e8400-e29b-41d4-a716-446655440001'::UUID,
    'Office Building Exterior Painting', 'EXTERIOR_PAINTING', 'HIGH', 'SCHEDULED',
    '123 Business Ave', 'Portland', 'OR', '97201',
    '2024-03-01', '2024-03-15', 25000.00,
    '550e8400-e29b-41d4-a716-446655440000'::UUID
),
(
    '660e8400-e29b-41d4-a716-446655440002'::UUID,
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'Living Room Interior Paint', 'INTERIOR_PAINTING', 'NORMAL', 'PLANNING',
    '456 Residential St', 'Portland', 'OR', '97202',  
    '2024-03-10', '2024-03-12', 3500.00,
    '550e8400-e29b-41d4-a716-446655440000'::UUID
);

-- Insert sample crew members
INSERT INTO projects.crew_members (
    id, name, email, skill_level, default_hourly_rate
) VALUES
(
    '770e8400-e29b-41d4-a716-446655440001'::UUID,
    'Mike Johnson', 'mike.johnson@paintbox.com', 'EXPERT', 35.00
),
(
    '770e8400-e29b-41d4-a716-446655440002'::UUID,
    'Sarah Wilson', 'sarah.wilson@paintbox.com', 'JOURNEYMAN', 28.00
);
```

This database architecture provides a solid foundation for the Apollo GraphOS federation with proper separation of concerns, optimized performance through strategic indexing and partitioning, and robust data integrity through constraints and validation. The schema supports the complex relationships needed for a paint contractor management system while maintaining scalability for 100 concurrent users.
