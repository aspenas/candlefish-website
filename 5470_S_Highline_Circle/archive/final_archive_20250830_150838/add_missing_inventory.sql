-- Add missing inventory items from moving company list
-- Total items to add: 65 critical items identified in cross-check

-- Exercise Equipment (High Priority)
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('ex001', 'Hyperbaric Chamber', 'Exercise Equipment', 'Exercise room basement', 20000, 'Keep', datetime('now'), datetime('now')),
('ex002', 'Power Rack', 'Exercise Equipment', 'Exercise room basement', 2000, 'Keep', datetime('now'), datetime('now')),
('ex003', 'Peloton Bike', 'Exercise Equipment', 'Exercise room basement', 2500, 'Keep', datetime('now'), datetime('now')),
('ex004', 'Elliptical Machine Large', 'Exercise Equipment', 'Exercise room basement', 2500, 'Keep', datetime('now'), datetime('now')),
('ex005', 'Treadmill Peloton', 'Exercise Equipment', 'Exercise room basement', 3000, 'Keep', datetime('now'), datetime('now')),
('ex006', 'Tonal Exercise System', 'Exercise Equipment', 'Exercise room basement', 4000, 'Keep', datetime('now'), datetime('now')),
('ex007', 'Weight Bench 1', 'Exercise Equipment', 'Exercise room basement', 500, 'Keep', datetime('now'), datetime('now')),
('ex008', 'Weight Bench 2', 'Exercise Equipment', 'Exercise room basement', 500, 'Keep', datetime('now'), datetime('now')),
('ex009', '750 lbs Weights', 'Exercise Equipment', 'Exercise room basement', 1750, 'Keep', datetime('now'), datetime('now')),
('ex010', 'Weight Bars', 'Exercise Equipment', 'Exercise room basement', 300, 'Keep', datetime('now'), datetime('now')),
('ex011', 'Weight Rack', 'Exercise Equipment', 'Exercise room basement', 400, 'Keep', datetime('now'), datetime('now'));

-- Recreation Items
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('rec001', 'Pool Table - Slate', 'Furniture', 'Basement main', 10000, 'Keep', datetime('now'), datetime('now')),
('rec002', 'Ping Pong Table', 'Furniture', 'Basement main', 2000, 'Keep', datetime('now'), datetime('now')),
('rec003', 'Pool Rack', 'Furniture', 'Basement main', 150, 'Keep', datetime('now'), datetime('now'));

-- Bedroom Furniture
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('bed001', 'Sleep Number King Bed', 'Furniture', 'Primary Bedroom', 5000, 'Keep', datetime('now'), datetime('now')),
('bed002', 'Queen Bed - Kendall Room', 'Furniture', 'Bedroom Kendall', 1500, 'Keep', datetime('now'), datetime('now')),
('bed003', 'Queen Bed - Trevor Room', 'Furniture', 'Bedroom Trevor', 1500, 'Keep', datetime('now'), datetime('now')),
('bed004', 'King Bed - Tyler Basement', 'Furniture', 'Bedroom basement Tyler', 2000, 'Keep', datetime('now'), datetime('now')),
('bed005', 'King Bed - Guest Basement', 'Furniture', 'Bedroom basement guest', 2000, 'Keep', datetime('now'), datetime('now')),
('bed006', 'Double Dresser - Tyler', 'Furniture', 'Bedroom basement Tyler', 800, 'Unsure', datetime('now'), datetime('now')),
('bed007', 'Double Dresser - Guest', 'Furniture', 'Bedroom basement guest', 800, 'Unsure', datetime('now'), datetime('now'));

-- LoveSac Sectional Pieces
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('ls001', 'LoveSac Section 1', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls002', 'LoveSac Section 2', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls003', 'LoveSac Section 3', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls004', 'LoveSac Section 4', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls005', 'LoveSac Section 5', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls006', 'LoveSac Section 6', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now')),
('ls007', 'LoveSac Section 7', 'Furniture', 'Basement main', 600, 'Keep', datetime('now'), datetime('now'));

-- Office Furniture
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('off001', 'Eames Chair', 'Furniture', 'Office 2nd floor', 5000, 'Keep', datetime('now'), datetime('now')),
('off002', 'Eames Ottoman', 'Furniture', 'Office 2nd floor', 2000, 'Keep', datetime('now'), datetime('now')),
('off003', 'Desk Table 1', 'Furniture', 'Office 2nd floor', 1000, 'Keep', datetime('now'), datetime('now')),
('off004', 'Desk Table 2', 'Furniture', 'Office 2nd floor', 1000, 'Keep', datetime('now'), datetime('now')),
('off005', 'Chaise Lounge Office', 'Furniture', 'Office 2nd floor', 1200, 'Keep', datetime('now'), datetime('now')),
('off006', 'Printer 1', 'Electronics', 'Office 2nd floor', 300, 'Keep', datetime('now'), datetime('now')),
('off007', 'Printer 2', 'Electronics', 'Office 2nd floor', 300, 'Keep', datetime('now'), datetime('now'));

-- Living Room
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('liv001', 'Blue Sofa 3 Cushion 1', 'Furniture', 'Living Room', 2000, 'Keep', datetime('now'), datetime('now')),
('liv002', 'Blue Sofa 3 Cushion 2', 'Furniture', 'Living Room', 2000, 'Keep', datetime('now'), datetime('now')),
('liv003', 'Coffee Table', 'Furniture', 'Living Room', 1500, 'Keep', datetime('now'), datetime('now')),
('liv004', 'Game Table', 'Furniture', 'Living Room', 800, 'Keep', datetime('now'), datetime('now'));

-- Dining Room
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('din001', 'Dining Table', 'Furniture', 'Dining Room', 2500, 'Keep', datetime('now'), datetime('now')),
('din002', 'Dining Chair 1', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din003', 'Dining Chair 2', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din004', 'Dining Chair 3', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din005', 'Dining Chair 4', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din006', 'Dining Chair 5', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din007', 'Dining Chair 6', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din008', 'Dining Chair 7', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din009', 'Dining Chair 8', 'Furniture', 'Dining Room', 200, 'Keep', datetime('now'), datetime('now')),
('din010', 'Buffet Base', 'Furniture', 'Dining Room', 1200, 'Keep', datetime('now'), datetime('now')),
('din011', 'Marble Table Top 82x24', 'Furniture', 'Dining Room', 2000, 'Unsure', datetime('now'), datetime('now'));

-- Special Items
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('sp001', 'Wedding Dress Boxed', 'Personal Items', 'Basement back storage area', 3000, 'Keep', datetime('now'), datetime('now')),
('sp002', 'Sauna', 'Furniture', 'basement sauna room', 7000, 'Keep', datetime('now'), datetime('now')),
('sp003', 'Marble Table Top 46x32', 'Furniture', 'Sitting area off kitchen', 1500, 'Unsure', datetime('now'), datetime('now'));

-- Garage/Sports Equipment
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('gar001', 'Bicycle 1', 'Sports Equipment', 'Garage', 500, 'Unsure', datetime('now'), datetime('now')),
('gar002', 'Bicycle 2', 'Sports Equipment', 'Garage', 500, 'Unsure', datetime('now'), datetime('now')),
('gar003', 'Bicycle 3', 'Sports Equipment', 'Garage', 500, 'Unsure', datetime('now'), datetime('now')),
('gar004', 'Golf Bag 1', 'Sports Equipment', 'Garage', 200, 'Unsure', datetime('now'), datetime('now')),
('gar005', 'Golf Bag 2', 'Sports Equipment', 'Garage', 200, 'Unsure', datetime('now'), datetime('now')),
('gar006', 'Golf Bag 3', 'Sports Equipment', 'Garage', 200, 'Unsure', datetime('now'), datetime('now')),
('gar007', 'Golf Bag 4', 'Sports Equipment', 'Garage', 200, 'Unsure', datetime('now'), datetime('now')),
('gar008', 'Power Washer', 'Tools', 'Garage', 400, 'Keep', datetime('now'), datetime('now')),
('gar009', 'Ski Poles Set 1', 'Sports Equipment', 'Basement back storage area', 150, 'Unsure', datetime('now'), datetime('now')),
('gar010', 'Ski Poles Set 2', 'Sports Equipment', 'Basement back storage area', 150, 'Unsure', datetime('now'), datetime('now'));

-- Christmas Trees
INSERT INTO items (id, name, category, room, value, decision, created_at, updated_at) VALUES
('xmas01', 'Christmas Tree 1', 'Holiday Decor', 'Basement back storage area', 300, 'Keep', datetime('now'), datetime('now')),
('xmas02', 'Christmas Tree 2', 'Holiday Decor', 'Basement back storage area', 300, 'Keep', datetime('now'), datetime('now')),
('xmas03', 'Christmas Tree 3', 'Holiday Decor', 'Basement back storage area', 300, 'Keep', datetime('now'), datetime('now')),
('xmas04', 'Christmas Tree 4', 'Holiday Decor', 'Basement back storage area', 300, 'Keep', datetime('now'), datetime('now')),
('xmas05', 'Christmas Tree 5', 'Holiday Decor', 'Basement back storage area', 300, 'Keep', datetime('now'), datetime('now'));

-- Update statistics
SELECT 'Added ' || COUNT(*) || ' new items' FROM items WHERE id LIKE 'ex%' OR id LIKE 'rec%' OR id LIKE 'bed%' OR id LIKE 'ls%' OR id LIKE 'off%' OR id LIKE 'liv%' OR id LIKE 'din%' OR id LIKE 'sp%' OR id LIKE 'gar%' OR id LIKE 'xmas%';
SELECT 'Total items now: ' || COUNT(*) FROM items;
SELECT 'Total value now: $' || printf('%.2f', SUM(value)) FROM items;