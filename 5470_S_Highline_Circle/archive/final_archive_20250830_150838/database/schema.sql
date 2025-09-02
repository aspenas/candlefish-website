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

-- Create indexes for performance
CREATE INDEX idx_items_room ON items(room_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_decision ON items(decision);
CREATE INDEX idx_items_search ON items USING GIN(search_vector);
CREATE INDEX idx_items_price_range ON items(asking_price);
CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);

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

CREATE VIEW buyer_view AS
SELECT
    r.name as room,
    i.name as item,
    i.category,
    i.asking_price as price,
    i.designer_invoice_price,
    i.placement_notes as notes,
    i.invoice_ref,
    i.source
FROM items i
JOIN rooms r ON i.room_id = r.id
WHERE i.decision = 'Sell'
ORDER BY r.name, i.category, i.name;
