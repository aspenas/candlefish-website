-- Valuation and Pricing System Database Extensions
-- Migration 003: Add valuation tables

-- Valuation method enum
CREATE TYPE valuation_method AS ENUM (
    'purchase_price',
    'market_lookup',
    'depreciation_model',
    'comparable_sales',
    'professional_appraisal',
    'manual_override'
);

-- Market data source enum
CREATE TYPE market_source AS ENUM (
    'ebay',
    'facebook_marketplace',
    'chairish',
    'article',
    'west_elm',
    'restoration_hardware',
    'pottery_barn',
    'manual_entry'
);

-- Item valuations table - tracks current and historical valuations
CREATE TABLE item_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    valuation_method valuation_method NOT NULL,
    estimated_value DECIMAL(10,2) NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    depreciation_rate DECIMAL(5,4), -- Annual depreciation rate (e.g., 0.15 for 15%)
    estimated_age_months INTEGER,
    condition_factor DECIMAL(3,2) DEFAULT 1.0, -- Multiplier based on condition
    notes TEXT,
    valuer_type VARCHAR(50), -- 'system', 'professional', 'owner'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- When this valuation becomes stale
);

-- Market comparisons table - store comparable items found online
CREATE TABLE market_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    source market_source NOT NULL,
    source_url VARCHAR(1000),
    title VARCHAR(500) NOT NULL,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2), -- If on sale
    condition VARCHAR(100),
    location VARCHAR(200),
    similarity_score DECIMAL(3,2), -- How similar to our item (0-1)
    listing_date DATE,
    sold_date DATE, -- If it sold
    shipping_cost DECIMAL(10,2),
    taxes_fees DECIMAL(10,2),
    image_urls TEXT[], -- Array of image URLs
    description TEXT,
    seller_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price history table - track price changes over time
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    price_type VARCHAR(50) NOT NULL, -- 'asking', 'valuation', 'market_avg'
    price DECIMAL(10,2) NOT NULL,
    change_reason VARCHAR(200), -- Why price changed
    source_type VARCHAR(50), -- 'owner', 'system', 'market_update'
    metadata JSONB, -- Additional context
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depreciation models table - define depreciation curves by category/brand
CREATE TABLE depreciation_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category item_category,
    brand VARCHAR(100),
    initial_depreciation DECIMAL(5,4) DEFAULT 0.20, -- Year 1 depreciation
    annual_depreciation DECIMAL(5,4) DEFAULT 0.10, -- Subsequent years
    min_value_ratio DECIMAL(3,2) DEFAULT 0.10, -- Minimum % of original value
    max_age_years INTEGER DEFAULT 20,
    condition_multipliers JSONB, -- {"excellent": 1.0, "good": 0.85, "fair": 0.65}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, brand)
);

-- Market trends table - track category/brand value trends
CREATE TABLE market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category item_category,
    brand VARCHAR(100),
    time_period VARCHAR(20), -- 'weekly', 'monthly', 'quarterly'
    avg_price DECIMAL(10,2),
    median_price DECIMAL(10,2),
    price_change_percent DECIMAL(5,2),
    sample_size INTEGER,
    trend_direction VARCHAR(20), -- 'rising', 'falling', 'stable'
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Valuation requests table - track manual valuation requests
CREATE TABLE valuation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    requested_by user_role DEFAULT 'owner',
    request_type VARCHAR(50), -- 'full_analysis', 'quick_estimate', 'market_check'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    priority INTEGER DEFAULT 5, -- 1-10, 1 is highest priority
    estimated_completion TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    results JSONB, -- Store the valuation results
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_item_valuations_item ON item_valuations(item_id);
CREATE INDEX idx_item_valuations_method ON item_valuations(valuation_method);
CREATE INDEX idx_item_valuations_updated ON item_valuations(updated_at DESC);
CREATE INDEX idx_item_valuations_expires ON item_valuations(expires_at);

CREATE INDEX idx_market_comparisons_item ON market_comparisons(item_id);
CREATE INDEX idx_market_comparisons_source ON market_comparisons(source);
CREATE INDEX idx_market_comparisons_similarity ON market_comparisons(similarity_score DESC);
CREATE INDEX idx_market_comparisons_price ON market_comparisons(price);

CREATE INDEX idx_price_history_item ON price_history(item_id);
CREATE INDEX idx_price_history_date ON price_history(effective_date DESC);
CREATE INDEX idx_price_history_type ON price_history(price_type);

CREATE INDEX idx_depreciation_models_category ON depreciation_models(category);
CREATE INDEX idx_depreciation_models_brand ON depreciation_models(brand);

CREATE INDEX idx_market_trends_category ON market_trends(category);
CREATE INDEX idx_market_trends_period ON market_trends(period_start, period_end);

CREATE INDEX idx_valuation_requests_status ON valuation_requests(status);
CREATE INDEX idx_valuation_requests_priority ON valuation_requests(priority DESC);

-- Update triggers
CREATE TRIGGER update_item_valuations_updated_at BEFORE UPDATE ON item_valuations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_market_comparisons_updated_at BEFORE UPDATE ON market_comparisons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_depreciation_models_updated_at BEFORE UPDATE ON depreciation_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_valuation_requests_updated_at BEFORE UPDATE ON valuation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Views for reporting and analytics

-- Current valuations view - latest valuation for each item
CREATE VIEW current_valuations AS
SELECT DISTINCT ON (v.item_id)
    v.item_id,
    v.id as valuation_id,
    v.valuation_method,
    v.estimated_value,
    v.confidence_score,
    v.created_at as valuation_date,
    v.expires_at,
    i.name as item_name,
    i.purchase_price,
    i.asking_price,
    CASE 
        WHEN i.purchase_price > 0 AND v.estimated_value > 0 
        THEN ((v.estimated_value - i.purchase_price) / i.purchase_price * 100)
        ELSE NULL 
    END as value_change_percent
FROM item_valuations v
JOIN items i ON v.item_id = i.id
WHERE v.expires_at IS NULL OR v.expires_at > CURRENT_TIMESTAMP
ORDER BY v.item_id, v.created_at DESC;

-- Valuation summary by room
CREATE VIEW room_valuation_summary AS
SELECT
    r.id as room_id,
    r.name as room_name,
    r.floor,
    COUNT(cv.item_id) as items_with_valuations,
    SUM(i.purchase_price) as total_purchase_value,
    SUM(cv.estimated_value) as total_estimated_value,
    AVG(cv.confidence_score) as avg_confidence,
    SUM(cv.estimated_value - i.purchase_price) as total_appreciation,
    CASE 
        WHEN SUM(i.purchase_price) > 0 
        THEN (SUM(cv.estimated_value - i.purchase_price) / SUM(i.purchase_price) * 100)
        ELSE 0 
    END as appreciation_percent
FROM rooms r
LEFT JOIN items i ON r.id = i.room_id
LEFT JOIN current_valuations cv ON i.id = cv.item_id
WHERE i.purchase_price IS NOT NULL
GROUP BY r.id, r.name, r.floor
ORDER BY total_estimated_value DESC;

-- Market insights view - top performing categories/brands
CREATE VIEW market_insights AS
SELECT
    i.category,
    COALESCE(i.source, 'Unknown') as brand,
    COUNT(*) as item_count,
    AVG(cv.estimated_value) as avg_current_value,
    AVG(i.purchase_price) as avg_purchase_price,
    AVG(cv.confidence_score) as avg_confidence,
    CASE 
        WHEN AVG(i.purchase_price) > 0 
        THEN (AVG(cv.estimated_value) / AVG(i.purchase_price) * 100)
        ELSE 100 
    END as retention_percent,
    COUNT(mc.id) as market_comparisons_available
FROM items i
LEFT JOIN current_valuations cv ON i.id = cv.item_id
LEFT JOIN market_comparisons mc ON i.id = mc.item_id
WHERE i.purchase_price IS NOT NULL
GROUP BY i.category, i.source
HAVING COUNT(*) >= 3
ORDER BY retention_percent DESC;