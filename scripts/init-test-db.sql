-- Test database initialization script for inventory management system
-- This script sets up the inventory test database schema and initial data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Drop tables if they exist (for clean test runs)
DROP TABLE IF EXISTS item_images CASCADE;
DROP TABLE IF EXISTS item_activities CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    floor_level INTEGER DEFAULT 1,
    room_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    current_value DECIMAL(10,2),
    condition VARCHAR(50),
    location_details TEXT,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    barcode VARCHAR(255),
    qr_code VARCHAR(255),
    notes TEXT,
    tags TEXT[],
    dimensions JSONB,
    weight DECIMAL(8,2),
    color VARCHAR(100),
    material VARCHAR(100),
    warranty_expiry DATE,
    insurance_value DECIMAL(10,2),
    replacement_cost DECIMAL(10,2),
    depreciation_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create item_images table
CREATE TABLE item_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    image_path VARCHAR(500),
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create item_activities table for audit trail
CREATE TABLE item_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_items_room_id ON items(room_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_qr_code ON items(qr_code);
CREATE INDEX idx_items_created_at ON items(created_at);
CREATE INDEX idx_item_images_item_id ON item_images(item_id);
CREATE INDEX idx_item_images_is_primary ON item_images(is_primary);
CREATE INDEX idx_item_activities_item_id ON item_activities(item_id);
CREATE INDEX idx_item_activities_created_at ON item_activities(created_at);

-- Full-text search index
CREATE INDEX idx_items_search ON items USING gin(to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(model, '') || ' ' ||
    coalesce(notes, '')
));

-- Insert test data for rooms
INSERT INTO rooms (id, name, description, floor_level, room_type) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Living Room', 'Main living area', 1, 'living'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Kitchen', 'Main kitchen area', 1, 'kitchen'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Master Bedroom', 'Primary bedroom', 2, 'bedroom'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Guest Bedroom', 'Secondary bedroom', 2, 'bedroom'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Office', 'Home office space', 1, 'office'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Garage', 'Storage and parking', 1, 'garage');

-- Insert test user
INSERT INTO users (id, email, name, password_hash, role) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User', '$2b$10$test.hash.value', 'admin');

-- Insert test items
INSERT INTO items (
    id, name, description, category, subcategory, brand, model,
    purchase_date, purchase_price, current_value, condition,
    room_id, barcode, tags, status
) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440010',
        'Samsung 65" 4K TV',
        'Large screen smart TV for entertainment',
        'Electronics',
        'Television',
        'Samsung',
        'QN65Q90T',
        '2023-01-15',
        1299.99,
        1100.00,
        'excellent',
        '550e8400-e29b-41d4-a716-446655440001',
        '1234567890123',
        ARRAY['entertainment', 'smart-tv', '4k'],
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440011',
        'KitchenAid Stand Mixer',
        'Professional grade stand mixer',
        'Appliances',
        'Kitchen',
        'KitchenAid',
        'KSM150PS',
        '2022-12-01',
        349.99,
        300.00,
        'good',
        '550e8400-e29b-41d4-a716-446655440002',
        '2345678901234',
        ARRAY['kitchen', 'baking', 'appliance'],
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440012',
        'IKEA MALM Bed Frame',
        'Queen size bed frame with headboard',
        'Furniture',
        'Bedroom',
        'IKEA',
        'MALM',
        '2023-03-10',
        179.00,
        150.00,
        'good',
        '550e8400-e29b-41d4-a716-446655440003',
        '3456789012345',
        ARRAY['furniture', 'bedroom', 'queen'],
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440013',
        'MacBook Pro 16"',
        'Professional laptop for work',
        'Electronics',
        'Computer',
        'Apple',
        'MacBook Pro',
        '2023-06-20',
        2399.99,
        2100.00,
        'excellent',
        '550e8400-e29b-41d4-a716-446655440005',
        '4567890123456',
        ARRAY['computer', 'work', 'laptop'],
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440014',
        'Weber Gas Grill',
        'Outdoor propane gas grill',
        'Outdoor',
        'Grill',
        'Weber',
        'Genesis II E-335',
        '2022-05-01',
        899.00,
        650.00,
        'good',
        '550e8400-e29b-41d4-a716-446655440006',
        '5678901234567',
        ARRAY['outdoor', 'grill', 'propane'],
        'active'
    );

-- Insert test item images
INSERT INTO item_images (item_id, image_url, alt_text, is_primary) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', 'https://example.com/tv.jpg', 'Samsung 65 inch TV', true),
    ('550e8400-e29b-41d4-a716-446655440011', 'https://example.com/mixer.jpg', 'KitchenAid stand mixer', true),
    ('550e8400-e29b-41d4-a716-446655440012', 'https://example.com/bed.jpg', 'IKEA MALM bed frame', true);

-- Insert test activities
INSERT INTO item_activities (item_id, user_id, action, details) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'created', '{"message": "Item added to inventory"}'),
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'created', '{"message": "Item added to inventory"}'),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'created', '{"message": "Item added to inventory"}');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for test user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;

-- Analyze tables for query optimization
ANALYZE rooms;
ANALYZE items;
ANALYZE item_images;
ANALYZE item_activities;
ANALYZE users;
