-- Add missing inventory items from moving company list
-- Using correct schema with room_id and asking_price

-- Exercise Equipment (Room ID: 1 - Exercise room basement)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(1, 'Hyperbaric Chamber', 'Exercise Equipment', 20000, 'Keep', datetime('now'), datetime('now')),
(1, 'Power Rack', 'Exercise Equipment', 2000, 'Keep', datetime('now'), datetime('now')),
(1, 'Peloton Bike', 'Exercise Equipment', 2500, 'Keep', datetime('now'), datetime('now')),
(1, 'Elliptical Machine Large', 'Exercise Equipment', 2500, 'Keep', datetime('now'), datetime('now')),
(1, 'Treadmill Peloton', 'Exercise Equipment', 3000, 'Keep', datetime('now'), datetime('now')),
(1, 'Tonal Exercise System', 'Exercise Equipment', 4000, 'Keep', datetime('now'), datetime('now')),
(1, 'Weight Bench 1', 'Exercise Equipment', 500, 'Keep', datetime('now'), datetime('now')),
(1, 'Weight Bench 2', 'Exercise Equipment', 500, 'Keep', datetime('now'), datetime('now')),
(1, '750 lbs Weights', 'Exercise Equipment', 1750, 'Keep', datetime('now'), datetime('now')),
(1, 'Weight Bars', 'Exercise Equipment', 300, 'Keep', datetime('now'), datetime('now')),
(1, 'Weight Rack', 'Exercise Equipment', 400, 'Keep', datetime('now'), datetime('now'));

-- Recreation Items (Room ID: 2 - Basement main)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(2, 'Pool Table - Slate', 'Furniture', 10000, 'Keep', datetime('now'), datetime('now')),
(2, 'Ping Pong Table', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')),
(2, 'Pool Rack', 'Furniture', 150, 'Keep', datetime('now'), datetime('now'));

-- Bedroom Furniture
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(3, 'Sleep Number King Bed', 'Furniture', 5000, 'Keep', datetime('now'), datetime('now')), -- Primary Bedroom
(4, 'Queen Bed - Kendall Room', 'Furniture', 1500, 'Keep', datetime('now'), datetime('now')), -- Bedroom Kendall
(5, 'Queen Bed - Trevor Room', 'Furniture', 1500, 'Keep', datetime('now'), datetime('now')), -- Bedroom Trevor
(6, 'King Bed - Tyler Basement', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')), -- Bedroom basement Tyler
(7, 'King Bed - Guest Basement', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')), -- Bedroom basement guest
(6, 'Double Dresser - Tyler', 'Furniture', 800, 'Unsure', datetime('now'), datetime('now')),
(7, 'Double Dresser - Guest', 'Furniture', 800, 'Unsure', datetime('now'), datetime('now'));

-- LoveSac Sectional Pieces (Room ID: 2 - Basement main)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(2, 'LoveSac Section 1', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 2', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 3', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 4', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 5', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 6', 'Furniture', 600, 'Keep', datetime('now'), datetime('now')),
(2, 'LoveSac Section 7', 'Furniture', 600, 'Keep', datetime('now'), datetime('now'));

-- Office Furniture (Room ID: 8 - Office 2nd floor)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(8, 'Eames Chair', 'Furniture', 5000, 'Keep', datetime('now'), datetime('now')),
(8, 'Eames Ottoman', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')),
(8, 'Desk Table 1', 'Furniture', 1000, 'Keep', datetime('now'), datetime('now')),
(8, 'Desk Table 2', 'Furniture', 1000, 'Keep', datetime('now'), datetime('now')),
(8, 'Chaise Lounge Office', 'Furniture', 1200, 'Keep', datetime('now'), datetime('now')),
(8, 'Printer 1', 'Electronics', 300, 'Keep', datetime('now'), datetime('now')),
(8, 'Printer 2', 'Electronics', 300, 'Keep', datetime('now'), datetime('now'));

-- Living Room (Room ID: 9)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(9, 'Blue Sofa 3 Cushion 1', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')),
(9, 'Blue Sofa 3 Cushion 2', 'Furniture', 2000, 'Keep', datetime('now'), datetime('now')),
(9, 'Coffee Table', 'Furniture', 1500, 'Keep', datetime('now'), datetime('now')),
(9, 'Game Table', 'Furniture', 800, 'Keep', datetime('now'), datetime('now'));

-- Dining Room (Room ID: 10)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(10, 'Dining Table', 'Furniture', 2500, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 1', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 2', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 3', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 4', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 5', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 6', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 7', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Dining Chair 8', 'Furniture', 200, 'Keep', datetime('now'), datetime('now')),
(10, 'Buffet Base', 'Furniture', 1200, 'Keep', datetime('now'), datetime('now')),
(10, 'Marble Table Top 82x24', 'Furniture', 2000, 'Unsure', datetime('now'), datetime('now'));

-- Special Items
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(12, 'Wedding Dress Boxed', 'Personal Items', 3000, 'Keep', datetime('now'), datetime('now')), -- Basement back storage
(13, 'Sauna', 'Furniture', 7000, 'Keep', datetime('now'), datetime('now')), -- Basement sauna room
(11, 'Marble Table Top 46x32', 'Furniture', 1500, 'Unsure', datetime('now'), datetime('now')); -- Sitting area off kitchen

-- Garage/Sports Equipment (Room ID: 14 - Garage, 12 - Basement storage)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(14, 'Bicycle 1', 'Sports Equipment', 500, 'Unsure', datetime('now'), datetime('now')),
(14, 'Bicycle 2', 'Sports Equipment', 500, 'Unsure', datetime('now'), datetime('now')),
(14, 'Bicycle 3', 'Sports Equipment', 500, 'Unsure', datetime('now'), datetime('now')),
(14, 'Golf Bag 1', 'Sports Equipment', 200, 'Unsure', datetime('now'), datetime('now')),
(14, 'Golf Bag 2', 'Sports Equipment', 200, 'Unsure', datetime('now'), datetime('now')),
(14, 'Golf Bag 3', 'Sports Equipment', 200, 'Unsure', datetime('now'), datetime('now')),
(14, 'Golf Bag 4', 'Sports Equipment', 200, 'Unsure', datetime('now'), datetime('now')),
(14, 'Power Washer', 'Tools', 400, 'Keep', datetime('now'), datetime('now')),
(12, 'Ski Poles Set 1', 'Sports Equipment', 150, 'Unsure', datetime('now'), datetime('now')),
(12, 'Ski Poles Set 2', 'Sports Equipment', 150, 'Unsure', datetime('now'), datetime('now'));

-- Christmas Trees (Room ID: 12 - Basement back storage area)
INSERT INTO items (room_id, name, category, asking_price, decision, created_at, updated_at) VALUES
(12, 'Christmas Tree 1', 'Holiday Decor', 300, 'Keep', datetime('now'), datetime('now')),
(12, 'Christmas Tree 2', 'Holiday Decor', 300, 'Keep', datetime('now'), datetime('now')),
(12, 'Christmas Tree 3', 'Holiday Decor', 300, 'Keep', datetime('now'), datetime('now')),
(12, 'Christmas Tree 4', 'Holiday Decor', 300, 'Keep', datetime('now'), datetime('now')),
(12, 'Christmas Tree 5', 'Holiday Decor', 300, 'Keep', datetime('now'), datetime('now'));

-- Update statistics
SELECT 'Total items before: ' || COUNT(*) FROM items;