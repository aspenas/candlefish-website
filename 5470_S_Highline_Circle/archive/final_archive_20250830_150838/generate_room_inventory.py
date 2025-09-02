#!/usr/bin/env python3
"""
Generate comprehensive room-by-room inventory list
Sorted by Level (Upper, Main, Lower) then by room
"""

import json
import sqlite3
from datetime import datetime

# Load the JSON data
with open('inventory_full.json', 'r') as f:
    data = json.load(f)

items = data['items']

# Connect to database to get additional details
conn = sqlite3.connect('backend/inventory_master.db')
cursor = conn.cursor()

# Get room floor mappings
cursor.execute("""
    SELECT DISTINCT r.name, r.id 
    FROM rooms r
""")
room_info = {row[0]: row[1] for row in cursor.fetchall()}

# Define floor/level mappings
room_to_level = {
    # Upper Level
    'Master Bedroom': 'Upper Level',
    'Master Bathroom': 'Upper Level', 
    'Guest Suite': 'Upper Level',
    'Guest Bedroom': 'Upper Level',
    'Office': 'Upper Level',
    'Upstairs Office': 'Upper Level',
    'Primary Bedroom': 'Upper Level',
    'Primary Bathroom': 'Upper Level',
    
    # Main Level
    'Living Room': 'Main Level',
    'Dining Room': 'Main Level',
    'Kitchen': 'Main Level',
    'Hearth Room': 'Main Level',
    'Entry': 'Main Level',
    'Foyer': 'Main Level',
    'Powder Room': 'Main Level',
    'Grand Room': 'Main Level',
    
    # Lower Level
    'Family Room': 'Lower Level',
    'Rec Room': 'Lower Level',
    'Bar Area': 'Lower Level',
    'Gym': 'Lower Level',
    'Exercise Room': 'Lower Level',
    'Theater': 'Lower Level',
    'Wine Room': 'Lower Level',
    'Lower Bathroom': 'Lower Level',
    'Guest Bedroom (Lower)': 'Lower Level',
    
    # Outdoor
    'Upper Terrace': 'Outdoor',
    'Lower Terrace': 'Outdoor',
    'Patio': 'Outdoor',
    'Deck': 'Outdoor',
    'Garden': 'Outdoor',
    'Pool Area': 'Outdoor',
    'Driveway': 'Outdoor',
    
    # Other
    'Garage': 'Garage/Storage',
    'Storage': 'Garage/Storage',
    'Various': 'Storage/Unassigned',
    'Various Storage': 'Storage/Unassigned',
    'Unassigned': 'Storage/Unassigned',
    'Whole Property': 'Whole Property'
}

# Organize items by level and room
inventory_by_level = {
    'Upper Level': {},
    'Main Level': {},
    'Lower Level': {},
    'Outdoor': {},
    'Garage/Storage': {},
    'Storage/Unassigned': {},
    'Whole Property': {},
    'Unknown': {}
}

# Process each item
for item in items:
    room = item.get('room', 'Unknown')
    level = room_to_level.get(room, 'Unknown')
    
    if level not in inventory_by_level:
        level = 'Unknown'
    
    if room not in inventory_by_level[level]:
        inventory_by_level[level][room] = []
    
    # Get additional item details from database
    item_id = item.get('id')
    if item_id:
        cursor.execute("""
            SELECT 
                i.invoice_ref,
                i.moving_company_id,
                i.created_at,
                i.floor,
                i.data_source
            FROM items i
            WHERE i.id = ?
        """, (item_id,))
        db_row = cursor.fetchone()
        if db_row:
            item['invoice_ref'] = db_row[0]
            item['moving_id'] = db_row[1]
            item['created_date'] = db_row[2]
            item['floor'] = db_row[3]
            item['data_source'] = db_row[4]
    
    inventory_by_level[level][room].append(item)

# Sort levels
level_order = ['Upper Level', 'Main Level', 'Lower Level', 'Outdoor', 'Garage/Storage', 'Storage/Unassigned', 'Whole Property', 'Unknown']

# Generate the report
print("=" * 120)
print("5470 S HIGHLINE CIRCLE - COMPLETE INVENTORY BY ROOM")
print("=" * 120)
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Total Items: {len(items)}")
print(f"Total Value: ${sum(item.get('value', 0) for item in items):,.2f}")
print("=" * 120)
print()

# Summary by level
print("SUMMARY BY LEVEL:")
print("-" * 40)
for level in level_order:
    if level in inventory_by_level and inventory_by_level[level]:
        total_items = sum(len(items) for items in inventory_by_level[level].values())
        total_value = sum(sum(item.get('value', 0) for item in items) for items in inventory_by_level[level].values())
        print(f"{level:25} | Items: {total_items:4} | Value: ${total_value:12,.2f}")
print()
print("=" * 120)

# Detailed listing by level and room
for level in level_order:
    if level not in inventory_by_level or not inventory_by_level[level]:
        continue
    
    print()
    print(f"\n{'=' * 120}")
    print(f"{level.upper()}")
    print(f"{'=' * 120}")
    
    # Sort rooms alphabetically within each level
    for room in sorted(inventory_by_level[level].keys()):
        items_in_room = inventory_by_level[level][room]
        if not items_in_room:
            continue
            
        room_total = sum(item.get('value', 0) for item in items_in_room)
        
        print(f"\n{'-' * 120}")
        print(f"ROOM: {room} | Items: {len(items_in_room)} | Total Value: ${room_total:,.2f}")
        print(f"{'-' * 120}")
        print(f"{'Item Name':<50} | {'Price':>10} | {'Source':<20} | {'Verified':<8} | {'Brand':<20} | {'Notes':<30}")
        print(f"{'-' * 120}")
        
        # Sort items by value (highest first)
        for item in sorted(items_in_room, key=lambda x: x.get('value', 0), reverse=True):
            name = item.get('name', 'Unknown')[:49]
            price = item.get('value', 0)
            
            # Determine source and date
            source = item.get('valuation_source', 'Unknown')
            if item.get('is_verified'):
                source = "Invoice"
            elif source == 'Johnson Moving':
                source = "Johnson Est."
            elif source == 'Bloom & Flourish':
                source = "B&F Invoice"
            elif source == 'Designer Inventory':
                source = "Designer Inv."
            elif source == 'Invoice':
                source = "Invoice"
            else:
                source = "Estimate"
            
            # Add invoice reference if available
            invoice_ref = item.get('invoice_ref', '')
            if invoice_ref and invoice_ref != 'None':
                source = f"{source[:10]} ({invoice_ref[:8]})"
            
            verified = "✓" if item.get('is_verified') else ""
            brand = item.get('brand', '')[:19] if item.get('brand') else ""
            
            # Build notes
            notes = []
            if item.get('decision') == 'Sell':
                notes.append("FOR SALE")
            elif item.get('decision') == 'Unsure':
                notes.append("REVIEW")
            
            # Add description snippet if available
            desc = item.get('description', '')
            if desc and desc != name and desc != f"Johnson Moving - {name}":
                # Extract meaningful part of description
                if ' - ' in desc:
                    desc = desc.split(' - ', 1)[1]
                notes.append(desc[:20])
            
            notes_str = ", ".join(notes)[:29]
            
            print(f"{name:<50} | ${price:>9,.2f} | {source:<20} | {verified:<8} | {brand:<20} | {notes_str:<30}")

print()
print("=" * 120)
print("LEGEND:")
print("  Source: Invoice = Verified with receipt | Designer Inv. = Designer inventory | Johnson Est. = Moving company estimate")
print("  Verified: ✓ = Has purchase receipt/invoice")
print("  Notes: FOR SALE = Marked for sale | REVIEW = Decision pending")
print("=" * 120)

# High-value items summary
print("\n" + "=" * 120)
print("HIGH-VALUE ITEMS (>$10,000)")
print("=" * 120)
high_value = [item for item in items if item.get('value', 0) > 10000]
high_value.sort(key=lambda x: x.get('value', 0), reverse=True)

print(f"{'Item Name':<50} | {'Room':<25} | {'Price':>12} | {'Source':<20} | {'Brand':<20}")
print("-" * 120)
for item in high_value:
    name = item.get('name', 'Unknown')[:49]
    room = item.get('room', 'Unknown')[:24]
    price = item.get('value', 0)
    source = "Invoice" if item.get('is_verified') else item.get('valuation_source', 'Estimate')[:19]
    brand = item.get('brand', '')[:19] if item.get('brand') else ""
    print(f"{name:<50} | {room:<25} | ${price:>11,.2f} | {source:<20} | {brand:<20}")

conn.close()