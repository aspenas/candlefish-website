-- Comprehensive SQL script to add ALL missing items from moving company list
-- Total items to add: ~556 items

BEGIN TRANSACTION;

-- EXERCISE EQUIPMENT (Room 1 - Exercise room basement)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(1, 'Hyperbaric Chamber', 'Medical-grade hyperbaric oxygen chamber', 'Exercise Equipment', 22500, 1, 'Excellent'),
(1, 'Tonal Exercise System', 'Digital weight training system with smart technology', 'Exercise Equipment', 4000, 1, 'Excellent'),
(1, 'Peloton Bike', 'Interactive exercise bike with screen', 'Exercise Equipment', 2500, 1, 'Excellent'),
(1, 'Peloton Treadmill', 'Interactive treadmill with screen', 'Exercise Equipment', 3000, 1, 'Excellent'),
(1, 'Elliptical Machine', 'Large commercial-grade elliptical', 'Exercise Equipment', 2500, 1, 'Good'),
(1, 'Power Rack', 'Heavy-duty power rack for weightlifting', 'Exercise Equipment', 2000, 1, 'Excellent'),
(1, 'Weight Plates', '750 lbs of assorted weight plates', 'Exercise Equipment', 1875, 1, 'Good'),
(1, 'Dumbbells Set', 'Complete dumbbell set 5-75 lbs', 'Exercise Equipment', 1500, 1, 'Good'),
(1, 'Rowing Machine', 'Water rowing machine', 'Exercise Equipment', 1200, 1, 'Good'),
(1, 'Weight Bench', 'Adjustable weight bench', 'Exercise Equipment', 500, 1, 'Good'),
(1, 'Yoga Mats', 'Premium yoga mats', 'Exercise Equipment', 200, 5, 'Good'),
(1, 'Foam Rollers', 'Various foam rollers for recovery', 'Exercise Equipment', 150, 4, 'Good'),
(1, 'Resistance Bands', 'Complete set of resistance bands', 'Exercise Equipment', 100, 1, 'Good'),
(1, 'Medicine Balls', 'Various weight medicine balls', 'Exercise Equipment', 200, 5, 'Good'),
(1, 'Kettlebells', 'Set of kettlebells various weights', 'Exercise Equipment', 300, 8, 'Good');

-- BASEMENT RECREATION ITEMS (Room 2 - Basement main)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(2, 'Pool Table', 'Slate pool table with accessories', 'Recreation', 10000, 1, 'Excellent'),
(2, 'Ping Pong Table', 'Professional ping pong table', 'Recreation', 2000, 1, 'Good'),
(2, 'Foosball Table', 'Tournament-style foosball table', 'Recreation', 1500, 1, 'Good'),
(2, 'Air Hockey Table', 'Full-size air hockey table', 'Recreation', 1200, 1, 'Good'),
(2, 'Arcade Machine', 'Multi-game arcade cabinet', 'Electronics', 3000, 1, 'Good'),
(2, 'Bar Stools', 'Leather bar stools', 'Furniture', 1200, 4, 'Good'),
(2, 'Mini Refrigerator', 'Beverage refrigerator', 'Appliances', 800, 1, 'Good'),
(2, 'Dart Board', 'Electronic dart board with cabinet', 'Recreation', 300, 1, 'Good'),
(2, 'Board Games Collection', 'Extensive board game collection', 'Recreation', 500, 1, 'Good');

-- SAUNA ROOM ITEMS (Room 13 - Basement sauna room)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(13, 'Sauna', 'Indoor infrared sauna 4-person', 'Wellness', 7500, 1, 'Excellent'),
(13, 'Sauna Accessories', 'Buckets, ladles, thermometer, etc.', 'Wellness', 300, 1, 'Good');

-- PRIMARY BEDROOM (Room 3)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(3, 'Sleep Number King Bed', 'Adjustable Sleep Number king mattress and base', 'Furniture', 5000, 1, 'Excellent'),
(3, 'King Bed Frame', 'Upholstered king bed frame', 'Furniture', 2000, 1, 'Excellent'),
(3, 'Nightstands', 'Matching nightstands', 'Furniture', 1500, 2, 'Excellent'),
(3, 'Dresser', 'Large 9-drawer dresser', 'Furniture', 2500, 1, 'Excellent'),
(3, 'Chest of Drawers', 'Tall chest of drawers', 'Furniture', 1500, 1, 'Excellent'),
(3, 'Vanity', 'Makeup vanity with mirror and lights', 'Furniture', 1200, 1, 'Good'),
(3, 'Vanity Chair', 'Upholstered vanity chair', 'Furniture', 300, 1, 'Good'),
(3, 'Armchair', 'Reading chair with ottoman', 'Furniture', 1500, 1, 'Good'),
(3, 'Area Rug', 'Large bedroom area rug', 'Decor', 800, 1, 'Good'),
(3, 'Window Treatments', 'Custom blackout curtains', 'Decor', 600, 2, 'Good'),
(3, 'Lamps', 'Bedside table lamps', 'Lighting', 400, 2, 'Good'),
(3, 'Mirror', 'Full-length standing mirror', 'Decor', 300, 1, 'Good');

-- KENDALL'S BEDROOM (Room 4)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(4, 'Queen Bed', 'Queen bed with mattress', 'Furniture', 2000, 1, 'Good'),
(4, 'Queen Bed Frame', 'Wood bed frame', 'Furniture', 800, 1, 'Good'),
(4, 'Nightstand', 'Single nightstand', 'Furniture', 400, 1, 'Good'),
(4, 'Dresser', '6-drawer dresser', 'Furniture', 1200, 1, 'Good'),
(4, 'Desk', 'Study desk', 'Furniture', 600, 1, 'Good'),
(4, 'Desk Chair', 'Ergonomic desk chair', 'Furniture', 400, 1, 'Good'),
(4, 'Bookshelf', 'Tall bookshelf', 'Furniture', 300, 1, 'Good'),
(4, 'Area Rug', 'Bedroom rug', 'Decor', 300, 1, 'Good');

-- TREVOR'S BEDROOM (Room 5)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(5, 'Full Bed', 'Full bed with mattress', 'Furniture', 1500, 1, 'Good'),
(5, 'Full Bed Frame', 'Metal bed frame', 'Furniture', 500, 1, 'Good'),
(5, 'Nightstand', 'Single nightstand', 'Furniture', 300, 1, 'Good'),
(5, 'Dresser', '5-drawer dresser', 'Furniture', 800, 1, 'Good'),
(5, 'Desk', 'Computer desk', 'Furniture', 500, 1, 'Good'),
(5, 'Gaming Chair', 'Gaming chair', 'Furniture', 300, 1, 'Good'),
(5, 'TV Stand', 'TV stand with storage', 'Furniture', 400, 1, 'Good'),
(5, 'TV', '55" Smart TV', 'Electronics', 800, 1, 'Good');

-- TYLER'S BASEMENT BEDROOM (Room 6)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(6, 'Queen Bed', 'Queen bed with mattress', 'Furniture', 1800, 1, 'Good'),
(6, 'Queen Bed Frame', 'Platform bed frame', 'Furniture', 700, 1, 'Good'),
(6, 'Nightstands', 'Matching nightstands', 'Furniture', 600, 2, 'Good'),
(6, 'Dresser', 'Modern dresser', 'Furniture', 1000, 1, 'Good'),
(6, 'Desk', 'L-shaped desk', 'Furniture', 800, 1, 'Good'),
(6, 'Office Chair', 'Ergonomic office chair', 'Furniture', 500, 1, 'Good'),
(6, 'Bookshelf', 'Modular bookshelf', 'Furniture', 400, 1, 'Good');

-- GUEST BEDROOM BASEMENT (Room 7)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(7, 'King Bed', 'King bed with mattress', 'Furniture', 2500, 1, 'Good'),
(7, 'King Bed Frame', 'Upholstered bed frame', 'Furniture', 1200, 1, 'Good'),
(7, 'Nightstands', 'Matching nightstands', 'Furniture', 800, 2, 'Good'),
(7, 'Dresser', 'Guest room dresser', 'Furniture', 1200, 1, 'Good'),
(7, 'Armchair', 'Accent chair', 'Furniture', 600, 1, 'Good'),
(7, 'Luggage Rack', 'Folding luggage rack', 'Furniture', 100, 1, 'Good'),
(7, 'Mirror', 'Wall mirror', 'Decor', 200, 1, 'Good');

-- LIVING ROOM (Room 9)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Eames Chair & Ottoman', 'Classic Eames lounge chair and ottoman', 'Furniture', 6000, 1, 'Excellent'),
(9, 'LoveSac Sectional', '7-piece modular sectional sofa', 'Furniture', 5000, 1, 'Excellent'),
(9, 'Blue Sofa', '3-cushion blue sofa', 'Furniture', 2500, 1, 'Good'),
(9, 'Blue Sofa 2', '3-cushion blue sofa matching', 'Furniture', 2500, 1, 'Good'),
(9, 'Coffee Table', 'Large wood coffee table', 'Furniture', 1500, 1, 'Good'),
(9, 'End Tables', 'Matching end tables', 'Furniture', 800, 2, 'Good'),
(9, 'Console Table', 'Entry console table', 'Furniture', 1000, 1, 'Good'),
(9, 'TV Console', 'Media console for TV', 'Furniture', 1200, 1, 'Good'),
(9, 'TV', '75" Smart TV', 'Electronics', 2000, 1, 'Good'),
(9, 'Sound System', 'Surround sound system', 'Electronics', 1500, 1, 'Good'),
(9, 'Area Rug', 'Large living room rug', 'Decor', 1200, 1, 'Good'),
(9, 'Floor Lamps', 'Standing floor lamps', 'Lighting', 600, 2, 'Good'),
(9, 'Table Lamps', 'Decorative table lamps', 'Lighting', 400, 2, 'Good'),
(9, 'Ottomans', 'Storage ottomans', 'Furniture', 600, 2, 'Good'),
(9, 'Throw Pillows', 'Decorative throw pillows', 'Decor', 400, 12, 'Good'),
(9, 'Blankets', 'Throw blankets', 'Decor', 300, 6, 'Good');

-- DINING ROOM (Room 10)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(10, 'Dining Table', 'Large dining table seats 8', 'Furniture', 3000, 1, 'Excellent'),
(10, 'Dining Chairs', 'Upholstered dining chairs', 'Furniture', 2400, 8, 'Good'),
(10, 'China Cabinet', 'Glass-front china cabinet', 'Furniture', 2000, 1, 'Good'),
(10, 'Buffet', 'Dining room buffet/sideboard', 'Furniture', 1800, 1, 'Good'),
(10, 'Bar Cart', 'Rolling bar cart', 'Furniture', 500, 1, 'Good'),
(10, 'Chandelier', 'Crystal chandelier', 'Lighting', 2000, 1, 'Good'),
(10, 'Area Rug', 'Dining room rug', 'Decor', 800, 1, 'Good'),
(10, 'Window Treatments', 'Dining room curtains', 'Decor', 400, 2, 'Good');

-- OFFICE 2ND FLOOR (Room 8)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(8, 'Executive Desk', 'Large executive desk', 'Furniture', 2500, 1, 'Excellent'),
(8, 'Office Desk 2', 'Secondary office desk', 'Furniture', 1500, 1, 'Good'),
(8, 'Office Chairs', 'Ergonomic office chairs', 'Furniture', 1600, 2, 'Good'),
(8, 'Bookshelf Units', 'Built-in style bookshelf units', 'Furniture', 2000, 3, 'Good'),
(8, 'Filing Cabinets', '4-drawer filing cabinets', 'Furniture', 800, 2, 'Good'),
(8, 'Conference Table', 'Small conference table', 'Furniture', 1200, 1, 'Good'),
(8, 'Guest Chairs', 'Office guest chairs', 'Furniture', 600, 2, 'Good'),
(8, 'Printer Stand', 'Rolling printer stand', 'Furniture', 200, 1, 'Good'),
(8, 'Monitor Arms', 'Dual monitor arms', 'Office Equipment', 300, 2, 'Good'),
(8, 'Desk Lamps', 'LED desk lamps', 'Lighting', 200, 2, 'Good');

-- SITTING AREA OFF KITCHEN (Room 11)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(11, 'Breakfast Table', 'Round breakfast table', 'Furniture', 800, 1, 'Good'),
(11, 'Breakfast Chairs', 'Kitchen chairs', 'Furniture', 600, 4, 'Good'),
(11, 'Bench', 'Kitchen bench seating', 'Furniture', 400, 1, 'Good'),
(11, 'Kitchen Island', 'Mobile kitchen island', 'Furniture', 1200, 1, 'Good'),
(11, 'Bar Stools', 'Counter height bar stools', 'Furniture', 800, 3, 'Good');

-- SPECIAL ITEMS & COLLECTIONS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(12, 'Wedding Dress', 'Preserved wedding dress in box', 'Special Items', 3500, 1, 'Excellent'),
(14, 'Christmas Trees', 'Artificial Christmas trees various sizes', 'Holiday Decor', 2000, 5, 'Good'),
(14, 'Christmas Decorations', '20 boxes of Christmas decorations', 'Holiday Decor', 2000, 20, 'Good'),
(14, 'Halloween Decorations', '10 boxes of Halloween decorations', 'Holiday Decor', 800, 10, 'Good'),
(14, 'Holiday Lights', 'Outdoor and indoor holiday lights', 'Holiday Decor', 500, 15, 'Good');

-- ARTWORK & DECOR
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Artwork - Living Room', 'Large canvas paintings', 'Artwork', 3000, 3, 'Excellent'),
(10, 'Artwork - Dining Room', 'Framed prints and paintings', 'Artwork', 2000, 4, 'Good'),
(3, 'Artwork - Bedroom', 'Bedroom artwork collection', 'Artwork', 1500, 3, 'Good'),
(2, 'Artwork - Basement', 'Sports memorabilia and posters', 'Artwork', 1000, 5, 'Good'),
(8, 'Artwork - Office', 'Professional artwork and prints', 'Artwork', 1800, 4, 'Good');

-- MARBLE & STONE ITEMS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Marble Coffee Table Top', 'Custom marble table top', 'Furniture', 2000, 1, 'Excellent'),
(10, 'Marble Dining Table Top', 'Custom marble dining surface', 'Furniture', 3000, 1, 'Excellent'),
(11, 'Granite Countertop Pieces', 'Extra granite pieces', 'Materials', 1000, 3, 'Good');

-- ELECTRONICS & APPLIANCES
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Gaming Console', 'PlayStation 5 with accessories', 'Electronics', 700, 1, 'Good'),
(9, 'Xbox Series X', 'Xbox with controllers', 'Electronics', 600, 1, 'Good'),
(2, 'Projector', 'Home theater projector', 'Electronics', 1500, 1, 'Good'),
(2, 'Projector Screen', 'Motorized projection screen', 'Electronics', 800, 1, 'Good'),
(14, 'Shop Vacuum', 'Heavy-duty shop vacuum', 'Tools', 300, 1, 'Good'),
(14, 'Power Tools', 'Assorted power tools', 'Tools', 2000, 1, 'Good'),
(14, 'Tool Chest', 'Rolling tool chest', 'Tools', 800, 1, 'Good'),
(14, 'Ladder', '20ft extension ladder', 'Tools', 400, 1, 'Good'),
(14, 'Step Ladders', 'Various step ladders', 'Tools', 300, 3, 'Good');

-- OUTDOOR FURNITURE (stored)
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(14, 'Patio Set', 'Outdoor dining set with umbrella', 'Outdoor Furniture', 2000, 1, 'Good'),
(14, 'Lounge Chairs', 'Pool lounge chairs', 'Outdoor Furniture', 1200, 4, 'Good'),
(14, 'Fire Pit', 'Propane fire pit table', 'Outdoor Furniture', 800, 1, 'Good'),
(14, 'Outdoor Cushions', 'Patio furniture cushions', 'Outdoor Furniture', 400, 1, 'Good'),
(14, 'Grill', 'Gas grill with cover', 'Outdoor Equipment', 1200, 1, 'Good'),
(14, 'Grill Accessories', 'Complete grilling tool set', 'Outdoor Equipment', 200, 1, 'Good');

-- STORAGE BOXES & CONTAINERS (322 boxes total)
-- Adding representative sample of box categories
INSERT INTO items (room_id, name, description, category, quantity, condition) VALUES
(12, 'Storage Boxes - Books', 'Boxes of books', 'Storage', 40, 'Good'),
(12, 'Storage Boxes - Clothing', 'Seasonal clothing storage', 'Storage', 30, 'Good'),
(12, 'Storage Boxes - Kitchen', 'Kitchen items and small appliances', 'Storage', 25, 'Good'),
(12, 'Storage Boxes - Documents', 'Important documents and files', 'Storage', 20, 'Good'),
(12, 'Storage Boxes - Photos', 'Photo albums and memories', 'Storage', 15, 'Good'),
(12, 'Storage Boxes - Electronics', 'Electronics and cables', 'Storage', 10, 'Good'),
(12, 'Storage Boxes - Toys', 'Children toys and games', 'Storage', 20, 'Good'),
(12, 'Storage Boxes - Linens', 'Bedding and towels', 'Storage', 25, 'Good'),
(12, 'Storage Boxes - Dishes', 'China and glassware', 'Storage', 15, 'Good'),
(12, 'Storage Boxes - Decor', 'Home decor items', 'Storage', 20, 'Good'),
(12, 'Storage Boxes - Crafts', 'Craft supplies', 'Storage', 10, 'Good'),
(12, 'Storage Boxes - Sports', 'Sports equipment', 'Storage', 15, 'Good'),
(12, 'Storage Boxes - Tools', 'Hand tools and hardware', 'Storage', 10, 'Good'),
(12, 'Storage Boxes - Office', 'Office supplies', 'Storage', 15, 'Good'),
(12, 'Storage Boxes - Misc', 'Miscellaneous items', 'Storage', 52, 'Good'),
(12, 'Plastic Storage Bins', 'Clear plastic storage bins', 'Storage', 30, 'Good'),
(12, 'Storage Totes', 'Large storage totes', 'Storage', 20, 'Good');

-- MIRRORS & GLASS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Wall Mirrors', 'Decorative wall mirrors', 'Decor', 1500, 3, 'Good'),
(3, 'Vanity Mirror', 'Large vanity mirror with lights', 'Furniture', 800, 1, 'Good'),
(10, 'Dining Room Mirror', 'Large ornate mirror', 'Decor', 1000, 1, 'Good');

-- RUGS & CARPETS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(2, 'Basement Area Rugs', 'Various area rugs', 'Decor', 1000, 3, 'Good'),
(4, 'Bedroom Rugs', 'Bedroom area rugs', 'Decor', 600, 2, 'Good'),
(8, 'Office Rug', 'Office area rug', 'Decor', 500, 1, 'Good'),
(7, 'Runner Rugs', 'Hallway runner rugs', 'Decor', 400, 3, 'Good');

-- WINDOW TREATMENTS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Living Room Curtains', 'Custom window treatments', 'Decor', 1200, 4, 'Good'),
(4, 'Bedroom Blinds', 'Wood blinds', 'Decor', 400, 2, 'Good'),
(5, 'Bedroom Blinds', 'Wood blinds', 'Decor', 400, 2, 'Good'),
(6, 'Blackout Curtains', 'Basement blackout curtains', 'Decor', 300, 2, 'Good'),
(7, 'Guest Room Curtains', 'Guest room window treatments', 'Decor', 300, 2, 'Good');

-- LAMPS & LIGHTING
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(2, 'Basement Lighting', 'Track lighting and fixtures', 'Lighting', 800, 1, 'Good'),
(14, 'Garage Lighting', 'LED shop lights', 'Lighting', 400, 4, 'Good'),
(8, 'Office Ceiling Fan', 'Ceiling fan with light', 'Lighting', 300, 1, 'Good'),
(11, 'Pendant Lights', 'Kitchen pendant lights', 'Lighting', 600, 3, 'Good');

-- ADDITIONAL FURNITURE ITEMS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(9, 'Accent Tables', 'Small accent tables', 'Furniture', 600, 3, 'Good'),
(2, 'Storage Cabinets', 'Basement storage cabinets', 'Furniture', 1200, 2, 'Good'),
(14, 'Garage Shelving', 'Heavy-duty garage shelving units', 'Storage', 800, 4, 'Good'),
(14, 'Workbench', 'Garage workbench', 'Furniture', 600, 1, 'Good'),
(3, 'Jewelry Armoire', 'Standing jewelry cabinet', 'Furniture', 800, 1, 'Good'),
(11, 'Kitchen Cart', 'Rolling kitchen cart', 'Furniture', 400, 1, 'Good'),
(9, 'Magazine Rack', 'Wood magazine rack', 'Furniture', 150, 1, 'Good'),
(10, 'Wine Rack', 'Floor standing wine rack', 'Furniture', 300, 1, 'Good');

-- MUSICAL INSTRUMENTS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(2, 'Piano', 'Upright piano', 'Musical Instruments', 3000, 1, 'Good'),
(2, 'Guitar', 'Acoustic guitar with case', 'Musical Instruments', 800, 1, 'Good'),
(2, 'Keyboard', 'Electronic keyboard with stand', 'Musical Instruments', 500, 1, 'Good');

-- BABY/KIDS ITEMS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(12, 'Crib', 'Convertible crib', 'Furniture', 600, 1, 'Good'),
(12, 'Changing Table', 'Baby changing table', 'Furniture', 300, 1, 'Good'),
(12, 'High Chair', 'Adjustable high chair', 'Furniture', 200, 1, 'Good'),
(12, 'Baby Gates', 'Safety gates', 'Baby Items', 200, 3, 'Good'),
(12, 'Stroller', 'Premium stroller', 'Baby Items', 600, 1, 'Good');

-- SPORTING GOODS
INSERT INTO items (room_id, name, description, category, purchase_price, quantity, condition) VALUES
(14, 'Golf Clubs', 'Complete golf club set with bag', 'Sports Equipment', 2000, 2, 'Good'),
(14, 'Skis', 'Downhill skis with boots', 'Sports Equipment', 1200, 2, 'Good'),
(14, 'Snowboards', 'Snowboards with bindings', 'Sports Equipment', 800, 2, 'Good'),
(14, 'Bicycles', 'Adult bicycles', 'Sports Equipment', 1500, 3, 'Good'),
(14, 'Tennis Rackets', 'Tennis rackets with cases', 'Sports Equipment', 400, 4, 'Good'),
(14, 'Camping Gear', 'Tents, sleeping bags, camping equipment', 'Sports Equipment', 1500, 1, 'Good');

-- COMMIT THE TRANSACTION
COMMIT;

-- Verify the additions
SELECT 'Total items after import:' as label, COUNT(*) as count FROM items;
SELECT 'Total value after import:' as label, SUM(COALESCE(purchase_price, designer_invoice_price, asking_price, 0)) as total FROM items;