#!/usr/bin/env python3
"""
Complete Inventory Merge Script
Combines:
1. Johnson Moving & Storage inventory (basic list)
2. Detailed designer inventory with receipts and brands
3. Bloom & Flourish plant inventory
Priority: Detailed descriptions with verified prices
"""

import sqlite3
import pandas as pd
import uuid
from datetime import datetime
import re
import os

# File paths
DB_PATH = "backend/inventory_master.db"
EXCEL_PATH = "5470_furnishings_inventory_v2_compat.xlsx"
BACKUP_PATH = f"backend/inventory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def backup_database():
    """Create a backup before making changes"""
    if os.path.exists(DB_PATH):
        import shutil
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"✅ Database backed up to {BACKUP_PATH}")

def normalize_item_name(name):
    """Normalize item names for matching"""
    if pd.isna(name):
        return ""
    # Remove extra spaces and convert to lowercase for comparison
    normalized = re.sub(r'\s+', ' ', str(name).strip().lower())
    # Remove common variations
    normalized = normalized.replace('&', 'and')
    normalized = re.sub(r'\([^)]*\)', '', normalized)  # Remove parenthetical content
    return normalized.strip()

def extract_brand(item_name):
    """Extract brand from item name"""
    if pd.isna(item_name):
        return None
    
    brands = {
        'Restoration Hardware': ['RH ', 'Restoration Hardware'],
        'Design Within Reach': ['DWR', 'Design Within Reach', 'Design within Reach'],
        'Herman Miller': ['Herman Miller', 'Eames'],
        'Holly Downs Design': ['Holly Downs'],
        'Bloom & Flourish': ['Bloom & Flourish', 'Bloom&Flourish', 'B&F'],
        'West Elm': ['West Elm'],
        'CB2': ['CB2'],
        'Crate & Barrel': ['Crate & Barrel', 'Crate and Barrel'],
    }
    
    item_upper = str(item_name).upper()
    for brand, patterns in brands.items():
        for pattern in patterns:
            if pattern.upper() in item_upper:
                return brand
    return None

def get_room_mapping():
    """Map room names from Excel to standardized names"""
    return {
        'Upper Level → Master Bedroom': 'Master Bedroom',
        'Upper Level → Master Bathroom': 'Master Bathroom',
        'Upper Level → Guest Suite': 'Guest Suite',
        'Upper Level → Upstairs Office': 'Office',
        'Main Level → Living Room': 'Living Room',
        'Main Level → Dining Room': 'Dining Room',
        'Main Level → Kitchen': 'Kitchen',
        'Main Level → Powder Room': 'Powder Room',
        'Lower Level → Family Room': 'Family Room',
        'Lower Level → Guest Bedroom': 'Guest Bedroom',
        'Lower Level → Lower Bathroom': 'Lower Bathroom',
        'Lower Level → Bar Area': 'Bar Area',
        'Lower Level → Gym': 'Gym',
        'Upper Terrace (Main Level Outdoor)': 'Upper Terrace',
        'Lower Terrace (Lower Level Outdoor)': 'Lower Terrace',
        'Whole Property (Plants)': 'Whole Property',
        'Unassigned (Bloom & Flourish)': 'Unassigned',
        'Hearth Room': 'Hearth Room',
        'Entry': 'Entry',
        'Garage': 'Garage',
        'Storage': 'Storage',
    }

def merge_inventories():
    """Merge all inventory sources into a single comprehensive database"""
    
    print("=" * 60)
    print("COMPREHENSIVE INVENTORY MERGE")
    print("=" * 60)
    
    # Backup existing database
    backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Load Excel inventories
    print("\n📊 Loading Excel inventories...")
    xl = pd.ExcelFile(EXCEL_PATH)
    
    # 1. Load detailed inventory (has brands, invoice refs, verified prices)
    detailed_df = pd.read_excel(xl, sheet_name='Inventory (All Items)')
    print(f"  - Loaded {len(detailed_df)} items from detailed inventory")
    
    # 2. Load Bloom & Flourish plants
    bloom_df = pd.read_excel(xl, sheet_name='Bloom & Flourish')
    print(f"  - Loaded {len(bloom_df)} plants from Bloom & Flourish")
    
    # 3. Get existing Johnson Moving inventory from backup database
    # Use the backup that has all the Johnson items
    backup_db = "backend/inventory_backup_20250828_202145.db"
    if os.path.exists(backup_db):
        backup_conn = sqlite3.connect(backup_db)
        johnson_df = pd.read_sql_query("""
            SELECT i.*, r.name as room_name, c.name as category_name
            FROM items i
            LEFT JOIN rooms r ON i.room_id = r.id
            LEFT JOIN categories c ON i.category_id = c.id
        """, backup_conn)
        backup_conn.close()
        print(f"  - Loaded {len(johnson_df)} items from Johnson Moving backup database")
    else:
        johnson_df = pd.DataFrame()
        print(f"  - No Johnson Moving backup found")
    
    # Prepare room and category mappings
    room_map = get_room_mapping()
    
    # Create rooms and categories tables if needed
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL
        )
    """)
    
    # Get or create room IDs
    rooms = {}
    for room_name in set(list(room_map.values()) + list(detailed_df['Room'].dropna().unique())):
        mapped_name = room_map.get(room_name, room_name)
        cursor.execute("INSERT OR IGNORE INTO rooms (name) VALUES (?)", (mapped_name,))
        cursor.execute("SELECT id FROM rooms WHERE name = ?", (mapped_name,))
        rooms[room_name] = cursor.fetchone()[0]
    
    # Get or create category IDs
    categories = {}
    all_categories = ['Furniture', 'Electronics', 'Art / Decor', 'Lighting', 'Rugs', 
                     'Window Treatments', 'Plants', 'Fixtures', 'Appliances', 'Other']
    for cat in all_categories:
        cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (cat,))
        cursor.execute("SELECT id FROM categories WHERE name = ?", (cat,))
        categories[cat] = cursor.fetchone()[0]
    
    # Clear existing items for fresh import
    print("\n🗑️  Clearing existing inventory...")
    cursor.execute("DELETE FROM items")
    
    # Track merged items
    merged_items = {}
    item_id = 1
    
    print("\n📝 Processing detailed inventory with verified prices...")
    
    # Process detailed inventory first (highest priority)
    for idx, row in detailed_df.iterrows():
        if pd.isna(row['Item']) or row['Item'].strip() == '':
            continue
            
        item_name = row['Item'].strip()
        normalized_name = normalize_item_name(item_name)
        
        # Get price (prefer invoice price over ask price)
        price = 0
        if pd.notna(row['Price (Designer Invoice)']) and row['Price (Designer Invoice)'] > 0:
            price = float(row['Price (Designer Invoice)'])
            price_source = 'Invoice'
        elif pd.notna(row['Price']) and row['Price'] > 0:
            price = float(row['Price'])
            price_source = 'Estimate'
        else:
            price_source = 'Unknown'
        
        # Extract brand
        brand = extract_brand(item_name)
        
        # Get room
        room_id = rooms.get(row['Room'], rooms.get('Unassigned'))
        
        # Get category
        category = row['Category'] if pd.notna(row['Category']) else 'Other'
        category_id = categories.get(category, categories['Other'])
        
        # Determine status - must match database constraint
        sell_status = row['Sell/Keep/Unsure'] if pd.notna(row['Sell/Keep/Unsure']) else 'Unsure'
        status = 'Active'  # Use only valid status values from constraint
        
        # Store in merged items
        merged_items[normalized_name] = {
            'id': item_id,
            'uuid': str(uuid.uuid4()),
            'name': item_name,
            'description': f"{item_name} - {row['Notes']}" if pd.notna(row['Notes']) else item_name,
            'brand': brand,
            'room_id': room_id,
            'category_id': category_id,
            'purchase_price': price if price_source == 'Invoice' else None,
            'estimated_value': price if price_source == 'Estimate' else price,
            'status': status,
            'valuation_source': price_source,
            'invoice_ref': row['Invoice Ref'] if pd.notna(row['Invoice Ref']) else None,
            'is_verified': 1 if price_source == 'Invoice' else 0,
            'data_source': 'Designer Inventory',
            'floor': row['Floor'] if pd.notna(row['Floor']) else None,
        }
        item_id += 1
    
    print(f"  ✅ Processed {len(merged_items)} detailed items")
    
    # Process Bloom & Flourish plants
    print("\n🌿 Processing Bloom & Flourish plants...")
    plants_added = 0
    for idx, row in bloom_df.iterrows():
        if pd.isna(row['Plant/Planter']) or row['Plant/Planter'].strip() == '':
            continue
            
        item_name = f"{row['Plant/Planter']} (Qty: {row['Qty']})" if pd.notna(row['Qty']) and row['Qty'] > 1 else row['Plant/Planter']
        normalized_name = normalize_item_name(item_name)
        
        # Skip if already exists
        if normalized_name in merged_items:
            continue
            
        price = float(row['Line Total']) if pd.notna(row['Line Total']) else 0
        room_id = rooms.get(row['Room'], rooms.get('Unassigned'))
        
        merged_items[normalized_name] = {
            'id': item_id,
            'uuid': str(uuid.uuid4()),
            'name': item_name,
            'description': f"Bloom & Flourish - {item_name}",
            'brand': 'Bloom & Flourish',
            'room_id': room_id,
            'category_id': categories['Plants'],
            'purchase_price': price,
            'estimated_value': price,
            'status': 'Active',
            'valuation_source': 'Invoice',
            'is_verified': 1,
            'data_source': 'Bloom & Flourish',
        }
        item_id += 1
        plants_added += 1
    
    print(f"  ✅ Added {plants_added} Bloom & Flourish plants")
    
    # Process Johnson Moving items (only add if not already in detailed)
    print("\n📦 Processing Johnson Moving inventory...")
    johnson_added = 0
    for idx, row in johnson_df.iterrows():
        normalized_name = normalize_item_name(row['name'])
        
        # Skip if already have a detailed version
        if normalized_name in merged_items:
            continue
            
        # Check for partial matches
        found_match = False
        for existing_name in merged_items.keys():
            if normalized_name in existing_name or existing_name in normalized_name:
                found_match = True
                break
        
        if found_match:
            continue
            
        # Add Johnson item
        merged_items[normalized_name] = {
            'id': item_id,
            'uuid': row['uuid'] if pd.notna(row['uuid']) else str(uuid.uuid4()),
            'name': row['name'],
            'description': row['description'] if pd.notna(row['description']) else row['name'],
            'brand': extract_brand(row['name']),
            'room_id': row['room_id'] if pd.notna(row['room_id']) else rooms.get('Unassigned'),
            'category_id': row['category_id'] if pd.notna(row['category_id']) else categories['Other'],
            'purchase_price': row['purchase_price'] if pd.notna(row['purchase_price']) else None,
            'estimated_value': row['estimated_value'] if pd.notna(row['estimated_value']) else 0,
            'status': row['status'] if pd.notna(row['status']) else 'Active',
            'valuation_source': 'Johnson Moving',
            'moving_company_id': row['moving_company_id'] if pd.notna(row['moving_company_id']) else None,
            'is_verified': 0,
            'data_source': 'Johnson Moving',
        }
        item_id += 1
        johnson_added += 1
    
    print(f"  ✅ Added {johnson_added} unique Johnson Moving items")
    
    # Insert all merged items into database
    print(f"\n💾 Saving {len(merged_items)} total items to database...")
    
    for item_data in merged_items.values():
        cursor.execute("""
            INSERT INTO items (
                id, uuid, name, description, brand, room_id, category_id,
                purchase_price, estimated_value, status, valuation_source,
                is_verified, moving_company_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            item_data['id'],
            item_data['uuid'],
            item_data['name'],
            item_data.get('description', item_data['name']),
            item_data.get('brand'),
            item_data.get('room_id'),
            item_data.get('category_id'),
            item_data.get('purchase_price'),
            item_data.get('estimated_value', 0),
            item_data.get('status', 'Active'),
            item_data.get('valuation_source'),
            item_data.get('is_verified', 0),
            item_data.get('moving_company_id')
        ))
    
    conn.commit()
    
    # Generate summary statistics
    print("\n" + "=" * 60)
    print("MERGE COMPLETE - SUMMARY STATISTICS")
    print("=" * 60)
    
    # Count by brand
    cursor.execute("""
        SELECT brand, COUNT(*) as count, SUM(COALESCE(purchase_price, estimated_value)) as total_value
        FROM items
        WHERE brand IS NOT NULL
        GROUP BY brand
        ORDER BY total_value DESC
    """)
    
    print("\n📊 Items by Brand:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} items, ${row[2]:,.2f}")
    
    # Count by data source
    cursor.execute("""
        SELECT 
            CASE 
                WHEN is_verified = 1 THEN 'Verified (with receipts)'
                WHEN valuation_source = 'Invoice' THEN 'Invoice-based'
                WHEN valuation_source = 'Estimate' THEN 'Estimated'
                ELSE 'Johnson Moving'
            END as source,
            COUNT(*) as count,
            SUM(COALESCE(purchase_price, estimated_value)) as total_value
        FROM items
        GROUP BY source
        ORDER BY total_value DESC
    """)
    
    print("\n💰 Value by Source:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} items, ${row[2]:,.2f}")
    
    # Total value
    cursor.execute("""
        SELECT 
            COUNT(*) as total_items,
            SUM(COALESCE(purchase_price, estimated_value)) as total_value,
            AVG(COALESCE(purchase_price, estimated_value)) as avg_value,
            MAX(COALESCE(purchase_price, estimated_value)) as max_value
        FROM items
    """)
    
    stats = cursor.fetchone()
    print(f"\n📈 Overall Statistics:")
    print(f"  Total Items: {stats[0]:,}")
    print(f"  Total Value: ${stats[1]:,.2f}")
    print(f"  Average Value: ${stats[2]:,.2f}")
    print(f"  Highest Value Item: ${stats[3]:,.2f}")
    
    # Find specific high-value items
    print("\n💎 High-Value Branded Items:")
    cursor.execute("""
        SELECT name, brand, COALESCE(purchase_price, estimated_value) as value
        FROM items
        WHERE brand IS NOT NULL 
        AND COALESCE(purchase_price, estimated_value) > 5000
        ORDER BY value DESC
        LIMIT 10
    """)
    
    for row in cursor.fetchall():
        print(f"  {row[0][:60]}: ${row[2]:,.2f}")
    
    conn.close()
    print("\n✅ MERGE COMPLETE! Database updated successfully.")
    print(f"📁 Backup saved to: {BACKUP_PATH}")

if __name__ == "__main__":
    merge_inventories()