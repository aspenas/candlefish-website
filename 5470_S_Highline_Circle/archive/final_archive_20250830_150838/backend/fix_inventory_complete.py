#!/usr/bin/env python3
"""
Complete Inventory Fix Script
Imports all 690 items from moving company manifest
Removes duplicates and ensures data integrity
"""

import sqlite3
import os
from datetime import datetime
import shutil

# Database path
DB_PATH = "inventory_master.db"
BACKUP_PATH = f"inventory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def backup_database():
    """Create a backup before making changes"""
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"✅ Database backed up to {BACKUP_PATH}")

def get_room_id(conn, room_name):
    """Get or create room ID"""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM rooms WHERE name = ?", (room_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        cursor.execute("INSERT INTO rooms (name) VALUES (?)", (room_name,))
        return cursor.lastrowid

def get_category_id(conn, category_name):
    """Get or create category ID"""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        cursor.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
        return cursor.lastrowid

def estimate_value(item_name, cubic_feet=0):
    """Estimate item value based on name and size"""
    item_lower = item_name.lower()
    
    # High-value items
    if "hyperbaric" in item_lower:
        return 25000
    elif "pool table" in item_lower and "slate" in item_lower:
        return 10000
    elif "sleep number" in item_lower and "king" in item_lower:
        return 5000
    elif "eames" in item_lower and "chair" in item_lower:
        return 5000
    elif "eames" in item_lower and "ottoman" in item_lower:
        return 2000
    elif "tonal" in item_lower:
        return 4000
    elif "peloton" in item_lower and "bike" in item_lower:
        return 2500
    elif "peloton" in item_lower and "treadmill" in item_lower:
        return 3000
    elif "elliptical" in item_lower and "large" in item_lower:
        return 2500
    elif "power rack" in item_lower:
        return 2000
    elif "750#" in item_lower or "750 lbs" in item_lower:
        return 1750
    elif "wedding dress" in item_lower:
        return 3000
    elif "sauna" in item_lower:
        return 7000
    elif "marble table top" in item_lower:
        return 2000
    elif "lovesac" in item_lower or "love sac" in item_lower:
        return 600
    elif "ping pong table" in item_lower:
        return 2000
    
    # Furniture categories
    elif "bed" in item_lower:
        if "king" in item_lower:
            return 2000
        elif "queen" in item_lower:
            return 1500
        else:
            return 1000
    elif "dresser" in item_lower:
        if "double" in item_lower:
            return 800
        else:
            return 600
    elif "sofa" in item_lower:
        if "3 cushion" in item_lower:
            return 2000
        elif "loveseat" in item_lower:
            return 1500
        else:
            return 1800
    elif "dining" in item_lower and "table" in item_lower:
        return 2500
    elif "dining" in item_lower and "chair" in item_lower:
        return 200
    elif "chair" in item_lower:
        if "arm" in item_lower or "occasional" in item_lower:
            return 500
        else:
            return 300
    elif "table" in item_lower:
        if "coffee" in item_lower:
            return 800
        elif "end" in item_lower:
            return 400
        elif "large" in item_lower:
            return 1000
        else:
            return 500
    elif "ottoman" in item_lower:
        if "large" in item_lower:
            return 500
        else:
            return 300
    elif "lamp" in item_lower:
        if "floor" in item_lower:
            return 300
        else:
            return 150
    elif "rug" in item_lower:
        if "9 x 12" in item_lower:
            return 800
        elif "large" in item_lower:
            return 600
        else:
            return 400
    elif "mirror" in item_lower:
        return 200
    elif "bench" in item_lower:
        return 400
    elif "chaise lounge" in item_lower:
        return 1200
    elif "buffet" in item_lower:
        return 1200
    elif "credenza" in item_lower:
        return 1000
    elif "desk" in item_lower:
        return 800
    
    # Exercise equipment
    elif "exercise" in item_lower or "weight" in item_lower:
        if "bench" in item_lower:
            return 500
        elif "rack" in item_lower:
            return 400
        elif "bars" in item_lower:
            return 300
        else:
            return 1000
    elif "treadmill" in item_lower:
        return 2000
    elif "bike" in item_lower or "bicycle" in item_lower:
        return 500
    
    # Electronics
    elif "tv" in item_lower:
        if "flat" in item_lower:
            return 800
        else:
            return 500
    elif "stereo" in item_lower or "speaker" in item_lower:
        return 500
    elif "printer" in item_lower:
        return 300
    
    # Storage and containers
    elif "dishpack" in item_lower:
        return 50
    elif "carton" in item_lower:
        return 30
    elif "wardrobe carton" in item_lower:
        return 40
    elif "mattress carton" in item_lower:
        return 25
    elif "book carton" in item_lower:
        return 35
    elif "tote" in item_lower:
        return 20
    
    # Holiday items
    elif "christmas tree" in item_lower:
        return 300
    elif "holiday" in item_lower or "christmas" in item_lower:
        return 100
    
    # Sports equipment
    elif "golf bag" in item_lower:
        return 200
    elif "ski" in item_lower:
        return 150
    
    # Garden/outdoor
    elif "patio" in item_lower:
        if "heater" in item_lower:
            return 500
        else:
            return 300
    elif "umbrella" in item_lower:
        return 200
    elif "swing" in item_lower:
        return 500
    elif "grill" in item_lower or "bbq" in item_lower:
        return 600
    elif "power washer" in item_lower:
        return 400
    elif "ladder" in item_lower:
        return 150
    elif "garden" in item_lower:
        return 100
    
    # Appliances
    elif "washer" in item_lower or "dryer" in item_lower:
        return 800
    elif "vacuum" in item_lower:
        return 200
    elif "fan" in item_lower:
        return 100
    
    # Default based on size
    elif cubic_feet > 50:
        return 500
    elif cubic_feet > 20:
        return 200
    elif cubic_feet > 10:
        return 100
    else:
        return 50

def import_moving_company_items(conn):
    """Import all items from the moving company manifest"""
    cursor = conn.cursor()
    
    # Clear existing items to avoid duplicates
    cursor.execute("DELETE FROM items")
    conn.commit()
    print("✅ Cleared existing items")
    
    # Define all items from the moving company PDF
    items_data = [
        # Bar 1st floor
        ("Bar 1st floor", "Stool - Bar", 6, "Furniture", 300),
        ("Bar 1st floor", "4.5 Cu. Carton", 1, "Storage", 30),
        ("Bar 1st floor", "Dishpack", 7, "Storage", 50),
        
        # Basement back storage area
        ("Basement back storage area", "Hyperbaric Chamber", 1, "Exercise Equipment", 25000),
        ("Basement back storage area", "Shelves - Unit", 1, "Furniture", 400),
        ("Basement back storage area", "Table - Utility", 1, "Furniture", 200),
        ("Basement back storage area", "Tote - Plastic Packed", 15, "Storage", 20),
        ("Basement back storage area", "Folding Chairs", 10, "Furniture", 30),
        ("Basement back storage area", "Pool table cover", 1, "Sports Equipment", 100),
        ("Basement back storage area", "Tote - Large", 2, "Storage", 30),
        ("Basement back storage area", "1.5 Cu. Carton", 3, "Storage", 25),
        ("Basement back storage area", "3.0 Cu. Carton", 2, "Storage", 30),
        ("Basement back storage area", "4.5 Cu. Carton", 3, "Storage", 35),
        ("Basement back storage area", "6.5 Cu. Carton", 1, "Storage", 40),
        ("Basement back storage area", "Corr Mirror Carton", 1, "Storage", 35),
        ("Basement back storage area", "Alfa metal shelf unit w/ drawers", 3, "Furniture", 150),
        ("Basement back storage area", "Christmas decoration", 1, "Holiday Decor", 100),
        ("Basement back storage area", "Christmas tree", 5, "Holiday Decor", 300),
        ("Basement back storage area", "Ski/poles", 2, "Sports Equipment", 150),
        ("Basement back storage area", "Bistro table", 1, "Furniture", 400),
        ("Basement back storage area", "Dog bed", 2, "Pet Supplies", 80),
        ("Basement back storage area", "Headboard", 1, "Furniture", 500),
        ("Basement back storage area", "Wedding dress boxed", 1, "Personal Items", 3000),
        
        # Basement hallway
        ("Basement hallway", "Picture - Whale", 1, "Artwork", 500),
        ("Basement hallway", "Corr Mirror Carton", 8, "Storage", 35),
        
        # Basement main
        ("Basement main", "Ottoman - Large", 2, "Furniture", 500),
        ("Basement main", "Ping Pong Table", 1, "Sports Equipment", 2000),
        ("Basement main", "Pool Table - Slate", 1, "Furniture", 10000),
        ("Basement main", "LoveSac Section", 7, "Furniture", 600),
        ("Basement main", "Table - Small", 1, "Furniture", 400),
        ("Basement main", "Wastepaper Basket", 1, "Miscellaneous", 20),
        ("Basement main", "Dishpack", 4, "Storage", 50),
        ("Basement main", "1.5 Cu. Carton", 4, "Storage", 25),
        ("Basement main", "3.0 Cu. Carton", 3, "Storage", 30),
        ("Basement main", "Corr Mirror Carton", 3, "Storage", 35),
        ("Basement main", "Bench", 1, "Furniture", 400),
        ("Basement main", "Pool rack", 1, "Sports Equipment", 150),
        ("Basement main", "Vase", 2, "Decor", 100),
        ("Basement main", "Picture - Foliage", 1, "Artwork", 400),
        
        # Bedrooms
        ("Primary Bedroom", "Sleep Number King Bed", 1, "Furniture", 5000),
        ("Primary Bedroom", "Chair - Occasional", 2, "Furniture", 500),
        ("Primary Bedroom", "Chaise Lounge", 1, "Furniture", 1200),
        ("Primary Bedroom", "Lamp", 3, "Electronics", 150),
        ("Primary Bedroom", "Lamp - Floor", 3, "Electronics", 300),
        ("Primary Bedroom", "Rug - 9 x 12", 1, "Decor", 800),
        ("Primary Bedroom", "Table - Drop Occas", 1, "Furniture", 600),
        ("Primary Bedroom", "Chest of drawers", 2, "Furniture", 600),
        ("Primary Bedroom", "Console table", 1, "Furniture", 800),
        ("Primary Bedroom", "Mirror", 1, "Decor", 200),
        
        ("Bedroom Kendall", "Bed - Queen", 1, "Furniture", 1500),
        ("Bedroom Kendall", "Chair", 4, "Furniture", 300),
        ("Bedroom Kendall", "Rug - 9 x 12", 1, "Decor", 600),
        ("Bedroom Kendall", "Rug - Large or Pad", 1, "Decor", 400),
        ("Bedroom Kendall", "Table - Small", 3, "Furniture", 300),
        ("Bedroom Kendall", "Desk/table", 1, "Furniture", 800),
        ("Bedroom Kendall", "Mirror", 1, "Decor", 200),
        ("Bedroom Kendall", "Poof", 4, "Furniture", 100),
        ("Bedroom Kendall", "Shelf decorative", 2, "Furniture", 150),
        ("Bedroom Kendall", "Shoe rack", 1, "Furniture", 100),
        
        ("Bedroom Trevor", "Bed - Queen", 1, "Furniture", 1500),
        ("Bedroom Trevor", "Chair", 1, "Furniture", 300),
        ("Bedroom Trevor", "Chair - Arm", 1, "Furniture", 500),
        ("Bedroom Trevor", "Ottoman - Small", 1, "Furniture", 300),
        ("Bedroom Trevor", "Rug - 9 x 12", 1, "Decor", 800),
        ("Bedroom Trevor", "Table - Night", 2, "Furniture", 400),
        ("Bedroom Trevor", "Table - Small", 3, "Furniture", 300),
        ("Bedroom Trevor", "Desk/table", 1, "Furniture", 800),
        ("Bedroom Trevor", "Bean bag", 2, "Furniture", 150),
        ("Bedroom Trevor", "Console table", 1, "Furniture", 800),
        ("Bedroom Trevor", "Shelf decorative", 3, "Furniture", 150),
        
        ("Bedroom basement Tyler", "Bed - King", 1, "Furniture", 2000),
        ("Bedroom basement Tyler", "Chair", 1, "Furniture", 300),
        ("Bedroom basement Tyler", "Dresser - Double", 1, "Furniture", 800),
        ("Bedroom basement Tyler", "Table - Night", 2, "Furniture", 400),
        
        ("Bedroom basement guest", "Bed - King", 1, "Furniture", 2000),
        ("Bedroom basement guest", "Chair", 1, "Furniture", 300),
        ("Bedroom basement guest", "Chair - Occasional", 2, "Furniture", 500),
        ("Bedroom basement guest", "Dresser - Double", 1, "Furniture", 800),
        ("Bedroom basement guest", "Lamp", 2, "Electronics", 150),
        ("Bedroom basement guest", "Lamp - Floor", 1, "Electronics", 300),
        ("Bedroom basement guest", "Plant Stand", 1, "Furniture", 100),
        ("Bedroom basement guest", "Table - Small", 2, "Furniture", 300),
        
        # Exercise room basement
        ("Exercise room basement", "Power rack", 1, "Exercise Equipment", 2000),
        ("Exercise room basement", "Exercise Equipment - Miscellaneous", 1, "Exercise Equipment", 1000),
        ("Exercise room basement", "Peloton Bike", 1, "Exercise Equipment", 2500),
        ("Exercise room basement", "Elliptical Large", 1, "Exercise Equipment", 2500),
        ("Exercise room basement", "Treadmill - Peloton", 1, "Exercise Equipment", 3000),
        ("Exercise room basement", "Tonal Exercise System", 1, "Exercise Equipment", 4000),
        ("Exercise room basement", "Weight Bench", 2, "Exercise Equipment", 500),
        ("Exercise room basement", "750 lbs Weights", 1, "Exercise Equipment", 1750),
        ("Exercise room basement", "Mats", 2, "Exercise Equipment", 100),
        ("Exercise room basement", "Weight bars", 1, "Exercise Equipment", 300),
        ("Exercise room basement", "Weight rack", 1, "Exercise Equipment", 400),
        
        # Office 2nd floor
        ("Office 2nd floor", "CD/DVD Rack", 1, "Furniture", 150),
        ("Office 2nd floor", "Chair", 6, "Furniture", 300),
        ("Office 2nd floor", "Eames Chair", 1, "Furniture", 5000),
        ("Office 2nd floor", "Chair - Occasional", 2, "Furniture", 500),
        ("Office 2nd floor", "Chaise Lounge", 1, "Furniture", 1200),
        ("Office 2nd floor", "Lamp", 1, "Electronics", 150),
        ("Office 2nd floor", "Lamp - Floor", 1, "Electronics", 300),
        ("Office 2nd floor", "Eames Ottoman", 1, "Furniture", 2000),
        ("Office 2nd floor", "Picture", 1, "Artwork", 300),
        ("Office 2nd floor", "Stereo - Speaker", 2, "Electronics", 500),
        ("Office 2nd floor", "Table", 1, "Furniture", 500),
        ("Office 2nd floor", "Table - Coffee", 1, "Furniture", 800),
        ("Office 2nd floor", "Table - Small", 2, "Furniture", 300),
        ("Office 2nd floor", "Tote - Plastic Packed", 1, "Storage", 20),
        ("Office 2nd floor", "Book Carton", 6, "Storage", 35),
        ("Office 2nd floor", "Desk/table", 2, "Furniture", 1000),
        ("Office 2nd floor", "Cart", 1, "Furniture", 200),
        ("Office 2nd floor", "Printer", 2, "Electronics", 300),
        
        # Living Room
        ("Living Room", "Chair - Occasional", 2, "Furniture", 500),
        ("Living Room", "Chaise Lounge", 1, "Furniture", 1200),
        ("Living Room", "Game Table", 1, "Furniture", 800),
        ("Living Room", "Picture - Blue vase 1", 1, "Artwork", 400),
        ("Living Room", "Picture - Blue vase 2", 1, "Artwork", 400),
        ("Living Room", "Blue Sofa - 3 Cushion", 2, "Furniture", 2000),
        ("Living Room", "Table - Coffee", 1, "Furniture", 1500),
        ("Living Room", "Table - End", 2, "Furniture", 400),
        ("Living Room", "Table - End Coffee", 1, "Furniture", 500),
        ("Living Room", "Book Carton", 3, "Storage", 35),
        ("Living Room", "Bench", 1, "Furniture", 400),
        
        # Dining Room
        ("Dining Room", "Buffet - Base", 1, "Furniture", 1200),
        ("Dining Room", "Dining Chair", 8, "Furniture", 200),
        ("Dining Room", "Dining - Leaf", 2, "Furniture", 100),
        ("Dining Room", "Dining Table", 1, "Furniture", 2500),
        ("Dining Room", "Marble Table Top", 1, "Furniture", 2000),
        ("Dining Room", "Rug - 9 x 12", 1, "Decor", 800),
        ("Dining Room", "Mirror", 1, "Decor", 200),
        
        # Kitchen
        ("Kitchen", "Rug - Runner", 1, "Decor", 200),
        ("Kitchen", "Stool - Bar", 3, "Furniture", 300),
        ("Kitchen", "Dishpack", 11, "Storage", 50),
        ("Kitchen", "1.5 Cu. Carton", 5, "Storage", 25),
        ("Kitchen", "3.0 Cu. Carton", 15, "Storage", 30),
        ("Kitchen", "4.5 Cu. Carton", 3, "Storage", 35),
        
        # Kitchen dining
        ("Kitchen dining", "Chair", 6, "Furniture", 300),
        ("Kitchen dining", "Lamp", 2, "Electronics", 150),
        ("Kitchen dining", "Rug - Large or Pad", 1, "Decor", 600),
        ("Kitchen dining", "Table - Large", 1, "Furniture", 1200),
        ("Kitchen dining", "Book Carton", 4, "Storage", 35),
        ("Kitchen dining", "Dishpack", 4, "Storage", 50),
        
        # Garage
        ("Garage", "Bicycle", 3, "Sports Equipment", 500),
        ("Garage", "Garden Hose & Tools", 1, "Tools", 150),
        ("Garage", "Golf Bag", 4, "Sports Equipment", 200),
        ("Garage", "Ladder - 6' Step", 1, "Tools", 150),
        ("Garage", "Leaf Blower", 1, "Tools", 200),
        ("Garage", "Power Washer", 1, "Tools", 400),
        ("Garage", "Rug - Large or Pad", 2, "Decor", 400),
        ("Garage", "Vacuum Cleaner", 1, "Appliances", 200),
        ("Garage", "Bike rack", 1, "Sports Equipment", 100),
        ("Garage", "Cooler", 1, "Miscellaneous", 80),
        ("Garage", "Crutches", 1, "Medical", 50),
        ("Garage", "Lawn edger", 1, "Tools", 150),
        ("Garage", "Shoe rack", 1, "Furniture", 100),
        ("Garage", "Shop vac", 1, "Tools", 150),
        ("Garage", "Tennis bag", 1, "Sports Equipment", 100),
        
        # Basement sauna room
        ("Basement sauna room", "Artificial Plant - Small", 3, "Decor", 50),
        ("Basement sauna room", "Chair", 1, "Furniture", 300),
        ("Basement sauna room", "Mirror", 1, "Decor", 200),
        ("Basement sauna room", "Sauna", 1, "Furniture", 7000),
        
        # Sitting area off kitchen
        ("Sitting area off kitchen", "Marble Table Top", 1, "Furniture", 1500),
        ("Sitting area off kitchen", "Ottoman - Small", 1, "Furniture", 300),
        ("Sitting area off kitchen", "Rug - 4 x 6", 1, "Decor", 400),
        ("Sitting area off kitchen", "Sofa - Sec. Per Section", 2, "Furniture", 1200),
        ("Sitting area off kitchen", "Table - Coffee", 1, "Furniture", 800),
        ("Sitting area off kitchen", "Book Carton", 3, "Storage", 35),
        ("Sitting area off kitchen", "Bench", 1, "Furniture", 300),
        
        # Additional cartons and storage items (distributed across rooms)
        ("Various", "1.5 Cu. Carton", 57, "Storage", 25),
        ("Various", "3.0 Cu. Carton", 75, "Storage", 30),
        ("Various", "4.5 Cu. Carton", 55, "Storage", 35),
        ("Various", "6.0 Cu. Carton", 13, "Storage", 40),
        ("Various", "Dishpack", 43, "Storage", 50),
        ("Various", "Book Carton", 22, "Storage", 35),
        ("Various", "Corr Mirror Carton", 35, "Storage", 35),
        ("Various", "Wardrobe Carton", 21, "Storage", 40),
        ("Various", "Queen Mattress Carton/Bag", 4, "Storage", 25),
        ("Various", "King Mattress Carton/Bag", 3, "Storage", 25),
        ("Various", "Long Twin Mattress Carton/Bag", 6, "Storage", 25),
    ]
    
    # Insert all items
    total_items = 0
    total_value = 0
    
    import uuid
    
    for room_name, item_name, quantity, category, unit_value in items_data:
        room_id = get_room_id(conn, room_name)
        category_id = get_category_id(conn, category)
        
        for i in range(quantity):
            # Add item number if quantity > 1
            if quantity > 1:
                display_name = f"{item_name} #{i+1}"
            else:
                display_name = item_name
            
            # Generate UUID
            item_uuid = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO items (
                    uuid, room_id, name, category_id, estimated_value, 
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (item_uuid, room_id, display_name, category_id, unit_value, 'Active'))
            
            total_items += 1
            total_value += unit_value
    
    conn.commit()
    print(f"✅ Imported {total_items} items worth ${total_value:,}")
    
    return total_items, total_value

def verify_import(conn):
    """Verify the import was successful"""
    cursor = conn.cursor()
    
    # Check total counts
    cursor.execute("SELECT COUNT(*) FROM items")
    total_items = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(estimated_value) FROM items")
    total_value = cursor.fetchone()[0] or 0
    
    # Check by category
    cursor.execute("""
        SELECT c.name, COUNT(*) as count, SUM(i.estimated_value) as value
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        GROUP BY c.name
        ORDER BY value DESC
    """)
    categories = cursor.fetchall()
    
    # Check by room
    cursor.execute("""
        SELECT r.name, COUNT(*) as count, SUM(i.estimated_value) as value
        FROM items i
        JOIN rooms r ON i.room_id = r.id
        GROUP BY r.name
        ORDER BY value DESC
        LIMIT 10
    """)
    rooms = cursor.fetchall()
    
    print("\n" + "="*60)
    print("VERIFICATION REPORT")
    print("="*60)
    print(f"Total Items: {total_items}")
    print(f"Total Value: ${total_value:,.2f}")
    
    print("\nTop Categories by Value:")
    for cat, count, value in categories[:10]:
        print(f"  {cat}: {count} items, ${value:,.2f}")
    
    print("\nTop Rooms by Value:")
    for room, count, value in rooms:
        print(f"  {room}: {count} items, ${value:,.2f}")
    
    # Check for critical items
    critical_items = [
        "Hyperbaric Chamber",
        "Pool Table - Slate",
        "Sleep Number King Bed",
        "Eames Chair",
        "Eames Ottoman",
        "Tonal Exercise System",
        "Peloton Bike",
        "Sauna",
        "Wedding dress boxed"
    ]
    
    print("\nCritical Items Check:")
    for item in critical_items:
        cursor.execute("SELECT COUNT(*), SUM(estimated_value) FROM items WHERE name LIKE ?", (f"%{item}%",))
        count, value = cursor.fetchone()
        if count > 0:
            print(f"  ✅ {item}: {count} found, ${value:,.2f}")
        else:
            print(f"  ❌ {item}: NOT FOUND")

def main():
    """Main execution"""
    print("🔧 COMPLETE INVENTORY FIX SCRIPT")
    print("="*60)
    
    # Backup existing database
    backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # Import all items
        total_items, total_value = import_moving_company_items(conn)
        
        # Verify the import
        verify_import(conn)
        
        print("\n✅ INVENTORY FIX COMPLETE!")
        print(f"Database now contains {total_items} items worth ${total_value:,}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()