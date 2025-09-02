-- =====================================================
-- 5470 S Highline Circle - Inventory Management System
-- Single Source of Truth Database Schema
-- =====================================================
-- Purpose: Consolidate 690+ items from multiple sources
-- Prevents data loss through constraints and audit trails
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS item_photos;
DROP TABLE IF EXISTS item_valuations;
DROP TABLE IF EXISTS item_decisions;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS data_sources;
DROP TABLE IF EXISTS migration_log;

-- =====================================================
-- Core Reference Tables
-- =====================================================

-- Data Sources (track where data came from)
CREATE TABLE data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL UNIQUE,
    source_type TEXT CHECK(source_type IN ('sqlite', 'api', 'csv', 'manual', 'moving_company')) NOT NULL,
    original_count INTEGER,
    original_value DECIMAL(10,2),
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    notes TEXT
);

-- Rooms (14 identified rooms)
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    floor INTEGER,
    square_feet INTEGER,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories for better organization
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_category_id INTEGER,
    description TEXT,
    is_valuable BOOLEAN DEFAULT 0, -- Flag high-value categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id)
);

-- =====================================================
-- Main Items Table - Single Source of Truth
-- =====================================================

CREATE TABLE items (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL, -- Global unique identifier
    moving_company_id TEXT, -- ID from Johnson Storage & Moving
    legacy_id INTEGER, -- ID from old databases
    
    -- Basic information
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    room_id INTEGER,
    
    -- Physical attributes
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    color TEXT,
    materials TEXT,
    dimensions TEXT,
    weight_lbs DECIMAL(10,2),
    
    -- Condition and status
    condition TEXT CHECK(condition IN ('New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged')) DEFAULT 'Good',
    condition_notes TEXT,
    is_fragile BOOLEAN DEFAULT 0,
    is_high_value BOOLEAN DEFAULT 0,
    
    -- Tracking
    status TEXT CHECK(status IN ('Active', 'Sold', 'Donated', 'Disposed', 'Lost', 'In Storage')) DEFAULT 'Active',
    location_notes TEXT, -- Specific location within room
    box_number TEXT, -- From moving company
    
    -- Valuation
    purchase_price DECIMAL(10,2),
    purchase_date DATE,
    estimated_value DECIMAL(10,2),
    replacement_cost DECIMAL(10,2),
    valuation_date DATE,
    valuation_source TEXT,
    
    -- Metadata
    data_source_id INTEGER,
    imported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    updated_by TEXT DEFAULT 'system',
    
    -- Data integrity
    checksum TEXT, -- Hash of key fields to detect changes
    is_verified BOOLEAN DEFAULT 0, -- Manual verification flag
    verification_date TIMESTAMP,
    verified_by TEXT,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- =====================================================
-- Supporting Tables
-- =====================================================

-- Item Decisions (Keep/Sell/Donate/Unsure)
CREATE TABLE item_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    decision TEXT CHECK(decision IN ('Keep', 'Sell', 'Donate', 'Unsure', 'Pending')) DEFAULT 'Pending',
    reason TEXT,
    target_price DECIMAL(10,2), -- For sell decisions
    target_date DATE,
    actual_outcome TEXT,
    actual_price DECIMAL(10,2),
    actual_date DATE,
    notes TEXT,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_by TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Valuation History (track value changes over time)
CREATE TABLE item_valuations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    valuation_type TEXT CHECK(valuation_type IN ('Purchase', 'Appraisal', 'Market', 'Insurance', 'Sale')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    source TEXT, -- Who/what provided valuation
    notes TEXT,
    valuation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Photos and Documents
CREATE TABLE item_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT CHECK(file_type IN ('photo', 'receipt', 'appraisal', 'manual', 'other')) DEFAULT 'photo',
    thumbnail_path TEXT,
    caption TEXT,
    is_primary BOOLEAN DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- =====================================================
-- Audit and Migration Tables
-- =====================================================

-- Comprehensive Audit Log
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Migration tracking
CREATE TABLE migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_database TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_count INTEGER,
    migrated_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER,
    status TEXT CHECK(status IN ('Started', 'In Progress', 'Completed', 'Failed')) DEFAULT 'Started',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_log TEXT,
    notes TEXT
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_items_room ON items(room_id);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_uuid ON items(uuid);
CREATE INDEX idx_items_moving_company_id ON items(moving_company_id);
CREATE INDEX idx_items_high_value ON items(is_high_value);
CREATE INDEX idx_items_checksum ON items(checksum);
CREATE INDEX idx_decisions_item ON item_decisions(item_id);
CREATE INDEX idx_valuations_item ON item_valuations(item_id);
CREATE INDEX idx_photos_item ON item_photos(item_id);
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- =====================================================
-- Triggers for Data Integrity
-- =====================================================

-- Auto-update timestamp
CREATE TRIGGER update_items_timestamp 
AFTER UPDATE ON items
BEGIN
    UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Audit trail for items
CREATE TRIGGER audit_items_insert
AFTER INSERT ON items
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, user_name, notes)
    VALUES ('items', NEW.id, 'INSERT', NEW.created_by, 'New item created');
END;

CREATE TRIGGER audit_items_update
AFTER UPDATE ON items
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, user_name)
    SELECT 'items', NEW.id, 'UPDATE', 'name', OLD.name, NEW.name, NEW.updated_by
    WHERE OLD.name != NEW.name;
    
    INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, user_name)
    SELECT 'items', NEW.id, 'UPDATE', 'estimated_value', OLD.estimated_value, NEW.estimated_value, NEW.updated_by
    WHERE OLD.estimated_value != NEW.estimated_value;
    
    INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, user_name)
    SELECT 'items', NEW.id, 'UPDATE', 'status', OLD.status, NEW.status, NEW.updated_by
    WHERE OLD.status != NEW.status;
END;

CREATE TRIGGER audit_items_delete
AFTER DELETE ON items
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, notes)
    VALUES ('items', OLD.id, 'DELETE', 'Item deleted: ' || OLD.name);
END;

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- Complete item view with all related data
CREATE VIEW v_items_complete AS
SELECT 
    i.*,
    r.name as room_name,
    c.name as category_name,
    d.decision as current_decision,
    d.target_price,
    ds.source_name as data_source_name,
    (SELECT COUNT(*) FROM item_photos WHERE item_id = i.id) as photo_count,
    (SELECT MAX(amount) FROM item_valuations WHERE item_id = i.id) as highest_valuation
FROM items i
LEFT JOIN rooms r ON i.room_id = r.id
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN item_decisions d ON i.id = d.item_id AND d.id = (
    SELECT MAX(id) FROM item_decisions WHERE item_id = i.id
)
LEFT JOIN data_sources ds ON i.data_source_id = ds.id;

-- High value items summary
CREATE VIEW v_high_value_items AS
SELECT 
    i.id,
    i.name,
    i.description,
    r.name as room,
    i.estimated_value,
    i.replacement_cost,
    d.decision,
    i.status
FROM items i
LEFT JOIN rooms r ON i.room_id = r.id
LEFT JOIN item_decisions d ON i.id = d.item_id
WHERE i.is_high_value = 1 OR i.estimated_value > 1000
ORDER BY i.estimated_value DESC;

-- Missing items tracking
CREATE VIEW v_missing_items AS
SELECT 
    i.moving_company_id,
    i.name,
    i.description,
    i.estimated_value,
    i.status,
    i.updated_at,
    'Not verified since import' as issue
FROM items i
WHERE i.is_verified = 0
UNION ALL
SELECT 
    NULL as moving_company_id,
    'Unknown Item #' || number as name,
    'Item from moving manifest not in database' as description,
    0 as estimated_value,
    'Missing' as status,
    NULL as updated_at,
    'Not in database' as issue
FROM (
    WITH RECURSIVE cnt(number) AS (
        SELECT 1
        UNION ALL
        SELECT number + 1 FROM cnt WHERE number < 690
    )
    SELECT number FROM cnt
    WHERE number NOT IN (
        SELECT CAST(SUBSTR(moving_company_id, -3) AS INTEGER) 
        FROM items 
        WHERE moving_company_id IS NOT NULL
    )
);

-- =====================================================
-- Initial Data Load
-- =====================================================

-- Insert data sources
INSERT INTO data_sources (source_name, source_type, original_count, original_value) VALUES
('Johnson Storage & Moving PDF', 'moving_company', 690, NULL),
('Local SQLite Database', 'sqlite', 134, 213300.00),
('Production API (Fly.io)', 'api', 239, 374242.00),
('Manual Entry', 'manual', NULL, NULL);

-- Insert rooms (14 identified)
INSERT INTO rooms (name, floor, sort_order) VALUES
('Master Bedroom', 2, 1),
('Master Bathroom', 2, 2),
('Office', 2, 3),
('Guest Bedroom 1', 2, 4),
('Guest Bedroom 2', 2, 5),
('Living Room', 1, 6),
('Dining Room', 1, 7),
('Kitchen', 1, 8),
('Family Room', 1, 9),
('Garage', 1, 10),
('Basement', 0, 11),
('Storage Room', 0, 12),
('Exercise Room', 0, 13),
('Outdoor/Patio', 1, 14);

-- Insert main categories
INSERT INTO categories (name, is_valuable) VALUES
('Furniture', 1),
('Exercise Equipment', 1),
('Electronics', 1),
('Appliances', 0),
('Artwork', 1),
('Clothing', 0),
('Books', 0),
('Kitchen Items', 0),
('Decorative Items', 0),
('Tools', 0),
('Outdoor Equipment', 0),
('Medical Equipment', 1),
('Collectibles', 1),
('Sports Equipment', 1),
('Personal Items', 0),
('Holiday Decor', 0),
('Miscellaneous', 0);

-- Insert sub-categories
INSERT INTO categories (name, parent_category_id, is_valuable) 
SELECT 'Seating', id, 1 FROM categories WHERE name = 'Furniture';
INSERT INTO categories (name, parent_category_id, is_valuable) 
SELECT 'Tables', id, 1 FROM categories WHERE name = 'Furniture';
INSERT INTO categories (name, parent_category_id, is_valuable) 
SELECT 'Beds', id, 1 FROM categories WHERE name = 'Furniture';
INSERT INTO categories (name, parent_category_id, is_valuable) 
SELECT 'Storage', id, 0 FROM categories WHERE name = 'Furniture';

-- =====================================================
-- Data Validation Rules (as comments for application layer)
-- =====================================================

-- VALIDATION RULES TO IMPLEMENT IN APPLICATION:
-- 1. UUID must be generated for every new item (use UUID v4)
-- 2. Checksum should be MD5 hash of: name + description + serial_number + purchase_price
-- 3. Moving company IDs should follow format: JSM-YYYY-###
-- 4. No duplicate serial numbers for items in same category
-- 5. Estimated value cannot be negative
-- 6. If status = 'Sold', must have actual_price in decisions table
-- 7. If is_high_value = true, must have at least one valuation record
-- 8. Photos must be under 10MB each
-- 9. Each item must have at least one decision record (even if 'Pending')
-- 10. Verification requires photo proof