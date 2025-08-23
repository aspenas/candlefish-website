-- 5470 S Highline Circle Furnishings Inventory Database Schema
-- PostgreSQL 15+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Categories enum
CREATE TYPE item_category AS ENUM (
    'Furniture',
    'Art / Decor',
    'Electronics',
    'Lighting',
    'Rug / Carpet',
    'Plant (Indoor)',
    'Planter (Indoor)',
    'Outdoor Planter/Plant',
    'Planter Accessory',
    'Other'
);

-- Decision status enum
CREATE TYPE decision_status AS ENUM (
    'Keep',
    'Sell',
    'Unsure',
    'Sold',
    'Donated'
);

-- Floors enum
CREATE TYPE floor_level AS ENUM (
    'Lower Level',
    'Main Floor',
    'Upper Floor',
    'Outdoor',
    'Garage'
);

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    floor floor_level,
    square_footage INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table (main inventory)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category item_category NOT NULL,
    decision decision_status DEFAULT 'Unsure',

    -- Pricing fields
    purchase_price DECIMAL(10,2),
    invoice_ref VARCHAR(100),
    designer_invoice_price DECIMAL(10,2),
    asking_price DECIMAL(10,2),
    sold_price DECIMAL(10,2),

    -- Additional attributes
    quantity INTEGER DEFAULT 1,
    is_fixture BOOLEAN DEFAULT FALSE,
    source VARCHAR(100),
    placement_notes TEXT,
    condition VARCHAR(50),
    purchase_date DATE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Full text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(placement_notes, '')), 'C')
    ) STORED
);

-- Images table
CREATE TABLE item_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    caption VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (buy/sell history)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'donation')),
    amount DECIMAL(10,2),
    transaction_date DATE NOT NULL,
    party_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bloom & Flourish plants table
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    plant_type VARCHAR(100),
    planter_type VARCHAR(100),
    indoor_outdoor VARCHAR(20),
    care_instructions TEXT,
    last_maintenance DATE,
    next_maintenance DATE
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities enum for user-friendly activity tracking
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

-- Activities table for user-friendly activity feed
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
CREATE INDEX idx_items_room ON items(room_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_decision ON items(decision);
CREATE INDEX idx_items_search ON items USING GIN(search_vector);
CREATE INDEX idx_items_price_range ON items(asking_price);
CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_activities_item ON activities(item_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);
CREATE INDEX idx_activities_action ON activities(action);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Views for reporting
CREATE VIEW room_summary AS
SELECT
    r.id,
    r.name,
    r.floor,
    COUNT(i.id) as item_count,
    SUM(CASE WHEN i.decision = 'Keep' THEN 1 ELSE 0 END) as keep_count,
    SUM(CASE WHEN i.decision = 'Sell' THEN 1 ELSE 0 END) as sell_count,
    SUM(CASE WHEN i.decision = 'Unsure' THEN 1 ELSE 0 END) as unsure_count,
    SUM(i.purchase_price) as total_purchase_value,
    SUM(i.asking_price) as total_asking_value
FROM rooms r
LEFT JOIN items i ON r.id = i.room_id
GROUP BY r.id, r.name, r.floor;

CREATE VIEW category_summary AS
SELECT
    category,
    COUNT(*) as item_count,
    SUM(purchase_price) as total_purchase_value,
    SUM(asking_price) as total_asking_value,
    AVG(purchase_price) as avg_purchase_price,
    AVG(asking_price) as avg_asking_price
FROM items
GROUP BY category;

-- Collaboration tables for buyer-owner communication

-- Interest levels enum
CREATE TYPE interest_level AS ENUM (
    'high',
    'medium',
    'low',
    'none'
);

-- Bundle proposal status enum
CREATE TYPE bundle_status AS ENUM (
    'draft',
    'proposed',
    'accepted',
    'rejected',
    'withdrawn'
);

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'owner',
    'buyer'
);

-- Item notes/comments for collaboration
CREATE TABLE item_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    author user_role NOT NULL,
    note TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE, -- Owner-only notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buyer interests for items
CREATE TABLE buyer_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    interest_level interest_level NOT NULL DEFAULT 'none',
    max_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id)
);

-- Bundle proposals for grouped item sales
CREATE TABLE bundle_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    proposed_by user_role NOT NULL,
    total_price DECIMAL(10,2),
    status bundle_status DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for bundle items
CREATE TABLE bundle_items (
    bundle_id UUID REFERENCES bundle_proposals(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    PRIMARY KEY (bundle_id, item_id)
);

-- Indexes for collaboration tables
CREATE INDEX idx_item_notes_item ON item_notes(item_id);
CREATE INDEX idx_item_notes_author ON item_notes(author);
CREATE INDEX idx_item_notes_created ON item_notes(created_at DESC);
CREATE INDEX idx_buyer_interests_item ON buyer_interests(item_id);
CREATE INDEX idx_buyer_interests_level ON buyer_interests(interest_level);
CREATE INDEX idx_bundle_proposals_status ON bundle_proposals(status);
CREATE INDEX idx_bundle_proposals_proposed_by ON bundle_proposals(proposed_by);
CREATE INDEX idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_item ON bundle_items(item_id);

-- Update triggers for collaboration tables
CREATE TRIGGER update_item_notes_updated_at BEFORE UPDATE ON item_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_buyer_interests_updated_at BEFORE UPDATE ON buyer_interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bundle_proposals_updated_at BEFORE UPDATE ON bundle_proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enhanced buyer view with collaboration data
CREATE VIEW buyer_view AS
SELECT
    r.name as room,
    i.name as item,
    i.category,
    i.asking_price as price,
    i.designer_invoice_price,
    i.placement_notes as notes,
    i.invoice_ref,
    i.source,
    bi.interest_level,
    bi.max_price as buyer_max_price,
    bi.notes as buyer_notes,
    (SELECT COUNT(*) FROM item_notes WHERE item_id = i.id AND is_private = false) as public_note_count,
    (SELECT COUNT(*) FROM bundle_items WHERE item_id = i.id) as bundle_count
FROM items i
JOIN rooms r ON i.room_id = r.id
LEFT JOIN buyer_interests bi ON i.id = bi.item_id
WHERE i.decision = 'Sell'
ORDER BY r.name, i.category, i.name;

-- Collaboration overview view
CREATE VIEW collaboration_overview AS
SELECT
    i.id as item_id,
    i.name as item_name,
    r.name as room_name,
    i.category,
    i.decision,
    i.asking_price,
    bi.interest_level,
    bi.max_price as buyer_max_price,
    (SELECT COUNT(*) FROM item_notes WHERE item_id = i.id AND is_private = false) as public_notes,
    (SELECT COUNT(*) FROM item_notes WHERE item_id = i.id AND is_private = true) as private_notes,
    (SELECT COUNT(*) FROM bundle_items WHERE item_id = i.id) as in_bundles,
    i.updated_at as item_updated,
    bi.updated_at as interest_updated
FROM items i
JOIN rooms r ON i.room_id = r.id
LEFT JOIN buyer_interests bi ON i.id = bi.item_id
WHERE i.decision IN ('Sell', 'Unsure')
ORDER BY
    CASE
        WHEN bi.interest_level = 'high' THEN 1
        WHEN bi.interest_level = 'medium' THEN 2
        WHEN bi.interest_level = 'low' THEN 3
        ELSE 4
    END,
    i.asking_price DESC;
