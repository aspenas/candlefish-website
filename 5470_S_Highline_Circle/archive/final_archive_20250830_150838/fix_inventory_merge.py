#!/usr/bin/env python3
"""
Fix inventory merge - ensure ALL verified prices and brands are properly included
"""

import sqlite3
import pandas as pd
import uuid
from datetime import datetime

# File paths
DB_PATH = "backend/inventory_master.db"
EXCEL_PATH = "5470_furnishings_inventory_v2_compat.xlsx"
BACKUP_PATH = f"backend/inventory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

def backup_database():
    """Create a backup before making changes"""
    import shutil
    import os
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print(f"✅ Database backed up to {BACKUP_PATH}")

def extract_brand_from_source(source, item_name):
    """Extract brand from source or item name"""
    if pd.isna(source) and pd.isna(item_name):
        return None
    
    source_str = str(source) if pd.notna(source) else ""
    item_str = str(item_name) if pd.notna(item_name) else ""
    combined = f"{source_str} {item_str}".upper()
    
    # Brand mappings
    brands = {
        'Design Within Reach': ['DWR', 'DESIGN WITHIN REACH'],
        'Herman Miller': ['HERMAN MILLER', 'EAMES LOUNGE', 'EAMES CHAIR'],
        'Restoration Hardware': ['RH ', 'RESTORATION HARDWARE'],
        'Bloom & Flourish': ['BLOOM & FLOURISH', 'BLOOM&FLOURISH', 'B&F'],
        'West Elm': ['WEST ELM'],
        'CB2': ['CB2 '],
        'Crate & Barrel': ['CRATE & BARREL', 'CRATE AND BARREL'],
        'LoveSac': ['LOVESAC', 'SACTIONALS'],
        'Samsung': ['SAMSUNG'],
        'Holly Downs Design': ['HOLLY DOWNS'],
    }
    
    for brand, patterns in brands.items():
        for pattern in patterns:
            if pattern in combined:
                return brand
    return None

def main():
    print("="*60)
    print("FIXING INVENTORY MERGE - COMPLETE DATA INTEGRATION")
    print("="*60)
    
    # Backup existing database
    backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Load Excel data
    print("\n📊 Loading Excel inventory...")
    xl = pd.ExcelFile(EXCEL_PATH)
    
    # 1. Load detailed inventory
    df = pd.read_excel(xl, sheet_name='Inventory (All Items)')
    print(f"  Loaded {len(df)} items from detailed inventory")
    print(f"  Items with Invoice prices: {df['Price (Designer Invoice)'].notna().sum()}")
    
    # 2. Load Bloom & Flourish
    bloom_df = pd.read_excel(xl, sheet_name='Bloom & Flourish')
    print(f"  Loaded {len(bloom_df)} Bloom & Flourish items")
    
    # Get room mappings
    cursor.execute("SELECT id, name FROM rooms")
    room_map = {row[1]: row[0] for row in cursor.fetchall()}
    
    # Get category mappings
    cursor.execute("SELECT id, name FROM categories")
    category_map = {row[1]: row[0] for row in cursor.fetchall()}
    
    # Clear existing items to do a clean import
    print("\n🗑️  Clearing existing inventory for clean import...")
    cursor.execute("DELETE FROM items")
    
    items_imported = 0
    verified_count = 0
    branded_count = 0
    total_value = 0
    
    print("\n📝 Importing detailed inventory with full data...")
    
    # Process main inventory
    for idx, row in df.iterrows():
        if pd.isna(row.get('Item')) or str(row['Item']).strip() == '':
            continue
        
        item_name = str(row['Item']).strip()
        room_name = row.get('Room', 'Unassigned')
        
        # Get or create room
        if room_name not in room_map:
            cursor.execute("INSERT INTO rooms (name) VALUES (?)", (room_name,))
            room_map[room_name] = cursor.lastrowid
        room_id = room_map[room_name]
        
        # Get category
        category_name = row.get('Category', 'Other')
        if category_name not in category_map:
            cursor.execute("INSERT INTO categories (name) VALUES (?)", (category_name,))
            category_map[category_name] = cursor.lastrowid
        category_id = category_map[category_name]
        
        # Determine price and verification status
        invoice_price = row.get('Price (Designer Invoice)')
        estimate_price = row.get('Price')
        invoice_ref = row.get('Invoice Ref')
        source = row.get('Source', '')
        
        # Use invoice price if available, otherwise estimate
        if pd.notna(invoice_price) and invoice_price > 0:
            price = float(invoice_price)
            is_verified = 1
            valuation_source = 'Invoice'
            verified_count += 1
        elif pd.notna(estimate_price) and estimate_price > 0:
            price = float(estimate_price)
            is_verified = 0
            valuation_source = 'Estimate'
        else:
            price = 0
            is_verified = 0
            valuation_source = 'Unknown'
        
        # Extract brand
        brand = extract_brand_from_source(source, item_name)
        if brand:
            branded_count += 1
        
        # Determine status
        sell_keep = row.get('Sell/Keep/Unsure', 'Keep')
        status_map = {
            'Keep': 'Active',
            'Sell': 'Active',  
            'Unsure': 'Active',
            'Sold': 'Sold'
        }
        status = status_map.get(sell_keep, 'Active')
        
        # Build description
        notes = row.get('Notes', '')
        description = f"{item_name}"
        if pd.notna(notes) and notes:
            description += f" - {notes}"
        if pd.notna(invoice_ref) and invoice_ref:
            description += f" (Invoice: {invoice_ref})"
        
        # Insert item
        cursor.execute("""
            INSERT INTO items (
                uuid, room_id, name, description, category_id, 
                purchase_price, estimated_value, status, brand,
                valuation_source, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            str(uuid.uuid4()),
            room_id,
            item_name,
            description,
            category_id,
            price if is_verified else None,
            price,
            status,
            brand,
            valuation_source,
            is_verified
        ))
        
        items_imported += 1
        total_value += price
    
    print(f"  ✅ Imported {items_imported} items (${total_value:,.2f})")
    print(f"     - Verified with invoices: {verified_count}")
    print(f"     - Branded items: {branded_count}")
    
    # Process Bloom & Flourish items
    print("\n🌿 Processing Bloom & Flourish plants...")
    bf_items = 0
    bf_value = 0
    
    for idx, row in bloom_df.iterrows():
        if pd.isna(row.get('Plant/Planter')):
            continue
        
        item_name = str(row['Plant/Planter']).strip()
        qty = row.get('Qty', 1)
        if qty > 1:
            item_name += f" (Qty: {qty})"
        
        room_name = row.get('Room', 'Unassigned')
        if room_name not in room_map:
            cursor.execute("INSERT INTO rooms (name) VALUES (?)", (room_name,))
            room_map[room_name] = cursor.lastrowid
        room_id = room_map[room_name]
        
        # Plants category
        category_id = category_map.get('Plants', category_map.get('Other'))
        
        price = float(row.get('Line Total', 0))
        
        cursor.execute("""
            INSERT INTO items (
                uuid, room_id, name, description, category_id,
                purchase_price, estimated_value, status, brand,
                valuation_source, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            str(uuid.uuid4()),
            room_id,
            item_name,
            f"Bloom & Flourish - {item_name}",
            category_id,
            price,
            price,
            'Active',
            'Bloom & Flourish',
            'Invoice',
            1
        ))
        
        bf_items += 1
        bf_value += price
    
    print(f"  ✅ Added {bf_items} Bloom & Flourish items (${bf_value:,.2f})")
    
    # Add any remaining Johnson Moving items not in Excel
    # Load from a backup that has Johnson items
    backup_db = "backend/inventory_backup_20250828_202145.db"
    if os.path.exists(backup_db):
        print("\n📦 Adding Johnson Moving items not in designer inventory...")
        backup_conn = sqlite3.connect(backup_db)
        johnson_items = backup_conn.execute("""
            SELECT name, description, estimated_value, room_id, category_id, moving_company_id
            FROM items
            WHERE moving_company_id IS NOT NULL
        """).fetchall()
        backup_conn.close()
        
        # Get current item names to avoid duplicates
        cursor.execute("SELECT LOWER(name) FROM items")
        existing_names = set(row[0] for row in cursor.fetchall())
        
        johnson_added = 0
        johnson_value = 0
        for name, desc, value, room, cat, moving_id in johnson_items:
            if name.lower() not in existing_names:
                cursor.execute("""
                    INSERT INTO items (
                        uuid, room_id, name, description, category_id,
                        estimated_value, status, valuation_source, 
                        is_verified, moving_company_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """, (
                    str(uuid.uuid4()),
                    room if room else room_map.get('Unassigned'),
                    name,
                    desc if desc else name,
                    cat if cat else category_map.get('Other'),
                    value if value else 0,
                    'Active',
                    'Johnson Moving',
                    0,
                    moving_id
                ))
                johnson_added += 1
                johnson_value += value if value else 0
        
        print(f"  ✅ Added {johnson_added} Johnson Moving items (${johnson_value:,.2f})")
    
    conn.commit()
    
    # Verify the import
    print("\n" + "="*60)
    print("IMPORT COMPLETE - VERIFICATION")
    print("="*60)
    
    cursor.execute("""
        SELECT COUNT(*) as total,
               SUM(is_verified) as verified,
               COUNT(DISTINCT brand) as brands,
               SUM(COALESCE(purchase_price, estimated_value)) as total_value
        FROM items
    """)
    
    stats = cursor.fetchone()
    print(f"Total Items: {stats[0]}")
    print(f"Verified Items: {stats[1]}")
    print(f"Unique Brands: {stats[2]}")
    print(f"Total Value: ${stats[3]:,.2f}")
    
    # Show brand breakdown
    print("\nItems by Brand:")
    cursor.execute("""
        SELECT brand, COUNT(*) as count, 
               SUM(COALESCE(purchase_price, estimated_value)) as value
        FROM items
        WHERE brand IS NOT NULL
        GROUP BY brand
        ORDER BY value DESC
    """)
    
    for brand, count, value in cursor.fetchall():
        print(f"  {brand}: {count} items, ${value:,.2f}")
    
    # Check office specifically
    print("\nOffice Items Check:")
    cursor.execute("""
        SELECT i.name, i.brand, i.estimated_value, i.is_verified
        FROM items i
        JOIN rooms r ON i.room_id = r.id
        WHERE r.name LIKE '%Office%'
        AND i.estimated_value > 1000
        ORDER BY i.estimated_value DESC
    """)
    
    for name, brand, value, verified in cursor.fetchall():
        v = "✓" if verified else ""
        b = f"({brand})" if brand else ""
        print(f"  {name} {b}: ${value:,.2f} {v}")
    
    conn.close()
    print("\n✅ Database successfully updated with complete inventory data!")

if __name__ == "__main__":
    import os
    main()