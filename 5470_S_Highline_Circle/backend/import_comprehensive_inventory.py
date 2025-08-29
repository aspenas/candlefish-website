#!/usr/bin/env python3
"""
Comprehensive Inventory Import Script
Combines designer inventory (Excel) with moving company manifest
Creates the complete $500k+ inventory database
"""

import sqlite3
import pandas as pd
import uuid
from datetime import datetime
import shutil
import os

# File paths
DB_PATH = "inventory_master.db"
EXCEL_PATH = "../5470_furnishings_inventory_v2_compat.xlsx"
BACKUP_PATH = f"inventory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def backup_database():
    """Create a backup before making changes"""
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"✅ Database backed up to {BACKUP_PATH}")

def get_or_create_room(conn, room_name):
    """Get or create room ID"""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM rooms WHERE name = ?", (room_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        cursor.execute("INSERT INTO rooms (name) VALUES (?)", (room_name,))
        return cursor.lastrowid

def get_or_create_category(conn, category_name):
    """Get or create category ID"""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        cursor.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
        return cursor.lastrowid

def import_excel_inventory(conn):
    """Import high-value designer inventory from Excel"""
    print("\n📊 Importing Designer Inventory from Excel...")
    
    # Load the Excel data
    df = pd.read_excel(EXCEL_PATH, sheet_name='Inventory (All Items)')
    
    # Clean and prepare data
    df['value'] = pd.to_numeric(df['Price (Designer Invoice)'], errors='coerce').fillna(0)
    df['Room'] = df['Room'].fillna('Unassigned')
    df['Category'] = df['Category'].fillna('Miscellaneous')
    df['Item'] = df['Item'].fillna('Unknown Item')
    df['Sell/Keep/Unsure'] = df['Sell/Keep/Unsure'].fillna('Keep')
    
    cursor = conn.cursor()
    items_imported = 0
    total_value = 0
    
    for idx, row in df.iterrows():
        if row['value'] > 0:  # Only import items with value
            room_id = get_or_create_room(conn, row['Room'])
            category_id = get_or_create_category(conn, row['Category'])
            
            # Map status
            status_map = {
                'Keep': 'Active',
                'Sell': 'Active',
                'Unsure': 'Active',
                'Sold': 'Sold'
            }
            status = status_map.get(row['Sell/Keep/Unsure'], 'Active')
            
            # Generate UUID
            item_uuid = str(uuid.uuid4())
            
            # Check if item already exists by name to avoid duplicates
            cursor.execute("SELECT id FROM items WHERE name = ? AND room_id = ?", 
                          (row['Item'], room_id))
            if cursor.fetchone():
                # Update existing item
                cursor.execute("""
                    UPDATE items 
                    SET estimated_value = ?, 
                        description = ?,
                        updated_at = datetime('now')
                    WHERE name = ? AND room_id = ?
                """, (row['value'], row.get('Notes', ''), row['Item'], room_id))
            else:
                # Insert new item
                cursor.execute("""
                    INSERT INTO items (
                        uuid, room_id, name, category_id, estimated_value,
                        status, description, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """, (item_uuid, room_id, row['Item'], category_id, row['value'],
                      status, row.get('Notes', '')))
                items_imported += 1
                total_value += row['value']
    
    conn.commit()
    print(f"✅ Imported {items_imported} designer items worth ${total_value:,.2f}")
    return items_imported, total_value

def add_moving_company_items(conn):
    """Add items from moving company that aren't in Excel"""
    print("\n📦 Adding Moving Company Items...")
    
    cursor = conn.cursor()
    
    # High-value items from moving company not in designer inventory
    moving_items = [
        # Exercise equipment (not designer furnished)
        ("Exercise room basement", "Hyperbaric Chamber", "Exercise Equipment", 25000),
        ("Exercise room basement", "Tonal Exercise System", "Exercise Equipment", 4000),
        ("Exercise room basement", "Peloton Bike", "Exercise Equipment", 2500),
        ("Exercise room basement", "Peloton Treadmill", "Exercise Equipment", 3000),
        ("Exercise room basement", "Elliptical Machine Large", "Exercise Equipment", 2500),
        ("Exercise room basement", "Power Rack", "Exercise Equipment", 2000),
        ("Exercise room basement", "750 lbs Weights", "Exercise Equipment", 1750),
        ("Exercise room basement", "Weight Bench #1", "Exercise Equipment", 500),
        ("Exercise room basement", "Weight Bench #2", "Exercise Equipment", 500),
        ("Exercise room basement", "Weight Bars", "Exercise Equipment", 300),
        ("Exercise room basement", "Weight Rack", "Exercise Equipment", 400),
        
        # Bedroom furniture (likely owner's, not designer)
        ("Primary Bedroom", "Sleep Number King Bed", "Furniture", 5000),
        ("Primary Bedroom", "Custom Closet System", "Furniture", 8000),
        
        # Office (if not in designer inventory)
        ("Office 2nd floor", "Eames Chair", "Furniture", 5000),
        ("Office 2nd floor", "Eames Ottoman", "Furniture", 2000),
        ("Office 2nd floor", "Standing Desk #1", "Furniture", 1500),
        ("Office 2nd floor", "Standing Desk #2", "Furniture", 1500),
        
        # Basement specialty items
        ("Basement sauna room", "Infrared Sauna", "Furniture", 7000),
        ("Basement back storage area", "Wedding Dress (Preserved)", "Personal Items", 3000),
        ("Basement back storage area", "Wine Collection", "Personal Items", 10000),
        
        # Garage/Tools
        ("Garage", "Tesla Charging Station", "Electronics", 2000),
        ("Garage", "Tool Collection", "Tools", 5000),
        ("Garage", "Golf Clubs (4 sets)", "Sports Equipment", 3000),
        
        # Electronics throughout house
        ("Living Room", "85\" OLED TV", "Electronics", 4000),
        ("Theater room", "Home Theater System", "Electronics", 8000),
        ("Theater room", "Projector", "Electronics", 3000),
        
        # Kitchen appliances (high-end)
        ("Kitchen", "Sub-Zero Refrigerator", "Appliances", 12000),
        ("Kitchen", "Wolf Range", "Appliances", 8000),
        ("Kitchen", "Miele Dishwasher", "Appliances", 2000),
        ("Kitchen", "Wine Refrigerator", "Appliances", 3000),
        
        # Additional valuable items
        ("Dining Room", "Crystal Chandelier", "Lighting", 5000),
        ("Foyer / Main Entry", "Custom Light Fixture", "Lighting", 3000),
        ("Living Room", "Fireplace Insert", "Fixtures", 4000),
        
        # Outdoor equipment
        ("Patio backyard", "Outdoor Kitchen", "Outdoor", 15000),
        ("Patio backyard", "Fire Pit Table", "Outdoor", 2000),
        ("Garage", "Lawn Equipment", "Tools", 3000),
    ]
    
    items_added = 0
    value_added = 0
    
    for room_name, item_name, category_name, value in moving_items:
        room_id = get_or_create_room(conn, room_name)
        category_id = get_or_create_category(conn, category_name)
        
        # Check if item exists
        cursor.execute("SELECT id FROM items WHERE name = ? AND room_id = ?", 
                      (item_name, room_id))
        if not cursor.fetchone():
            item_uuid = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO items (
                    uuid, room_id, name, category_id, estimated_value,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
            """, (item_uuid, room_id, item_name, category_id, value))
            items_added += 1
            value_added += value
    
    conn.commit()
    print(f"✅ Added {items_added} moving company items worth ${value_added:,.2f}")
    return items_added, value_added

def add_storage_and_boxes(conn):
    """Add all the packed boxes and storage items"""
    print("\n📦 Adding Storage Items and Boxes...")
    
    cursor = conn.cursor()
    room_id = get_or_create_room(conn, "Various Storage")
    category_id = get_or_create_category(conn, "Storage")
    
    # Storage items with estimated contents value
    storage_items = [
        ("Dishpack", 43, 100),  # Dishes/fragile items
        ("Book Carton", 22, 50),  # Books
        ("1.5 Cu. Carton", 57, 30),
        ("3.0 Cu. Carton", 75, 40),
        ("4.5 Cu. Carton", 55, 50),
        ("6.0 Cu. Carton", 13, 60),
        ("Wardrobe Carton", 21, 100),  # Clothes
        ("Corr Mirror Carton", 35, 75),  # Mirrors/art
        ("Tote - Plastic", 30, 25),
    ]
    
    items_added = 0
    value_added = 0
    
    for item_type, quantity, unit_value in storage_items:
        for i in range(quantity):
            item_name = f"{item_type} #{i+1}"
            item_uuid = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO items (
                    uuid, room_id, name, category_id, estimated_value,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
            """, (item_uuid, room_id, item_name, category_id, unit_value))
            items_added += 1
            value_added += unit_value
    
    conn.commit()
    print(f"✅ Added {items_added} storage items worth ${value_added:,.2f}")
    return items_added, value_added

def verify_comprehensive_inventory(conn):
    """Verify the comprehensive import"""
    cursor = conn.cursor()
    
    # Get totals
    cursor.execute("SELECT COUNT(*), SUM(estimated_value) FROM items")
    total_items, total_value = cursor.fetchone()
    
    # Get by category
    cursor.execute("""
        SELECT c.name, COUNT(*), SUM(i.estimated_value)
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        GROUP BY c.name
        ORDER BY SUM(i.estimated_value) DESC
        LIMIT 10
    """)
    categories = cursor.fetchall()
    
    # Get by room
    cursor.execute("""
        SELECT r.name, COUNT(*), SUM(i.estimated_value)
        FROM items i
        LEFT JOIN rooms r ON i.room_id = r.id
        GROUP BY r.name
        ORDER BY SUM(i.estimated_value) DESC
        LIMIT 10
    """)
    rooms = cursor.fetchall()
    
    # Get top items
    cursor.execute("""
        SELECT name, estimated_value
        FROM items
        WHERE estimated_value > 10000
        ORDER BY estimated_value DESC
    """)
    top_items = cursor.fetchall()
    
    print("\n" + "="*60)
    print("COMPREHENSIVE INVENTORY REPORT")
    print("="*60)
    print(f"Total Items: {total_items:,}")
    print(f"Total Value: ${total_value:,.2f}")
    
    print("\nTop Categories by Value:")
    for cat_name, count, value in categories:
        if value:
            print(f"  {cat_name}: {count} items, ${value:,.2f}")
    
    print("\nTop Rooms by Value:")
    for room_name, count, value in rooms[:10]:
        if value:
            print(f"  {room_name}: {count} items, ${value:,.2f}")
    
    print("\nItems Over $10,000:")
    for item_name, value in top_items:
        print(f"  {item_name}: ${value:,.2f}")
    
    return total_items, total_value

def main():
    """Main execution"""
    print("🔧 COMPREHENSIVE INVENTORY IMPORT")
    print("="*60)
    
    # Backup existing database
    backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # Clear existing items for clean import
        cursor = conn.cursor()
        cursor.execute("DELETE FROM items")
        conn.commit()
        print("✅ Cleared existing items")
        
        # Import from multiple sources
        excel_items, excel_value = import_excel_inventory(conn)
        moving_items, moving_value = add_moving_company_items(conn)
        storage_items, storage_value = add_storage_and_boxes(conn)
        
        # Verify the comprehensive inventory
        total_items, total_value = verify_comprehensive_inventory(conn)
        
        print("\n" + "="*60)
        print("✅ COMPREHENSIVE IMPORT COMPLETE!")
        print(f"Total Items: {total_items:,}")
        print(f"Total Value: ${total_value:,.2f}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()