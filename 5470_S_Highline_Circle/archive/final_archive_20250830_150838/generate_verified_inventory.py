#!/usr/bin/env python3
"""
Generate comprehensive room-by-room inventory with ALL verified prices
"""

import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')
cursor = conn.cursor()

# Get all items with room information
cursor.execute("""
    SELECT 
        i.name,
        COALESCE(i.purchase_price, i.estimated_value, 0) as value,
        i.is_verified,
        i.brand,
        i.valuation_source,
        i.description,
        i.status,
        r.name as room_name,
        c.name as category_name
    FROM items i
    LEFT JOIN rooms r ON i.room_id = r.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY r.name, value DESC
""")

all_items = cursor.fetchall()

# Define floor/level mappings
def get_level_for_room(room_name):
    if not room_name:
        return 'Unknown'
    room_lower = room_name.lower()
    
    # Upper Level
    if any(x in room_lower for x in ['upper level', 'upstairs', 'primary', 'master']):
        if 'terrace' in room_lower:
            return 'Upper Level - Outdoor'
        return 'Upper Level'
    
    # Main Level  
    if any(x in room_lower for x in ['main level', 'living', 'dining', 'kitchen', 'hearth', 'entry', 'foyer', 'powder', 'grand']):
        return 'Main Level'
    
    # Lower Level
    if any(x in room_lower for x in ['lower level', 'basement', 'family', 'rec room', 'bar', 'gym', 'exercise', 'theater', 'wine', 'media', 'guest suite']):
        return 'Lower Level'
    
    # Outdoor
    if any(x in room_lower for x in ['terrace', 'patio', 'deck', 'garden', 'pool', 'outdoor', 'backyard', 'covered porch']):
        if 'upper' in room_lower:
            return 'Upper Level - Outdoor'
        elif 'lower' in room_lower:
            return 'Lower Level - Outdoor'
        return 'Main Level - Outdoor'
    
    # Garage/Storage
    if any(x in room_lower for x in ['garage', 'storage']):
        return 'Garage/Storage'
    
    # Whole Property
    if 'whole property' in room_lower:
        return 'Whole Property'
    
    return 'Other'

# Organize by level and room
inventory = {}
for item in all_items:
    name, value, verified, brand, source, desc, status, room, category = item
    level = get_level_for_room(room)
    
    if level not in inventory:
        inventory[level] = {}
    if room not in inventory[level]:
        inventory[level][room] = []
    
    inventory[level][room].append({
        'name': name,
        'value': value,
        'verified': verified,
        'brand': brand,
        'source': source,
        'description': desc,
        'status': status,
        'category': category
    })

# Generate report
print("=" * 150)
print("5470 S HIGHLINE CIRCLE - COMPLETE INVENTORY WITH VERIFIED PRICES")
print("=" * 150)
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Statistics
cursor.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(is_verified) as verified,
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as branded,
        SUM(COALESCE(purchase_price, estimated_value, 0)) as total_value
    FROM items
""")
stats = cursor.fetchone()
print(f"Total Items: {stats[0]}")
print(f"Verified Items (with receipts): {stats[1]}")
print(f"Branded Items: {stats[2]}")
print(f"Total Value: ${stats[3]:,.2f}")
print("=" * 150)

# Level order
level_order = [
    'Upper Level',
    'Upper Level - Outdoor', 
    'Main Level',
    'Main Level - Outdoor',
    'Lower Level',
    'Lower Level - Outdoor',
    'Garage/Storage',
    'Whole Property',
    'Other'
]

# Print inventory by level
for level in level_order:
    if level not in inventory or not inventory[level]:
        continue
    
    level_total = sum(sum(item['value'] for item in items) for items in inventory[level].values())
    level_items = sum(len(items) for items in inventory[level].values())
    
    print(f"\n{'=' * 150}")
    print(f"{level.upper()} | Items: {level_items} | Total Value: ${level_total:,.2f}")
    print("=" * 150)
    
    # Sort rooms within level
    for room in sorted(inventory[level].keys()):
        items = inventory[level][room]
        room_total = sum(item['value'] for item in items)
        
        print(f"\n{'-' * 150}")
        print(f"ROOM: {room} | Items: {len(items)} | Total: ${room_total:,.2f}")
        print(f"{'-' * 150}")
        print(f"{'Item':<60} | {'Price':>12} | {'Source':<15} | {'✓':<2} | {'Brand':<25} | {'Category':<20}")
        print(f"{'-' * 150}")
        
        # Sort by value
        for item in sorted(items, key=lambda x: x['value'], reverse=True):
            name = item['name'][:59]
            price = item['value']
            
            # Source
            if item['verified']:
                source = "Invoice"
            elif item['source'] == 'Invoice':
                source = "Invoice"
            elif item['source'] == 'Johnson Moving':
                source = "Moving Est."
            elif item['source'] == 'Estimate':
                source = "Estimate"
            elif item['brand'] == 'Bloom & Flourish':
                source = "B&F Invoice"
            else:
                source = item['source'][:14] if item['source'] else "Unknown"
            
            verified = "✓" if item['verified'] else ""
            brand = item['brand'][:24] if item['brand'] else ""
            category = item['category'][:19] if item['category'] else ""
            
            print(f"{name:<60} | ${price:>11,.2f} | {source:<15} | {verified:<2} | {brand:<25} | {category:<20}")

# High-value items
print("\n" + "=" * 150)
print("HIGH-VALUE ITEMS (>$10,000)")
print("=" * 150)

cursor.execute("""
    SELECT 
        i.name,
        COALESCE(i.purchase_price, i.estimated_value) as value,
        i.brand,
        i.is_verified,
        r.name as room
    FROM items i
    LEFT JOIN rooms r ON i.room_id = r.id
    WHERE COALESCE(i.purchase_price, i.estimated_value) > 10000
    ORDER BY value DESC
""")

print(f"{'Item':<60} | {'Room':<30} | {'Price':>12} | {'Brand':<25} | {'Verified':<8}")
print("-" * 150)
for row in cursor.fetchall():
    name, value, brand, verified, room = row
    name_str = name[:59] if name else "Unknown"
    room_str = room[:29] if room else "Unknown"
    brand_str = brand[:24] if brand else ""
    verified_str = "✓ Invoice" if verified else ""
    print(f"{name_str:<60} | {room_str:<30} | ${value:>11,.2f} | {brand_str:<25} | {verified_str:<8}")

# Brand summary
print("\n" + "=" * 150)
print("ITEMS BY BRAND")
print("=" * 150)

cursor.execute("""
    SELECT 
        brand,
        COUNT(*) as count,
        SUM(is_verified) as verified_count,
        SUM(COALESCE(purchase_price, estimated_value)) as total_value
    FROM items
    WHERE brand IS NOT NULL
    GROUP BY brand
    ORDER BY total_value DESC
""")

for brand, count, verified, value in cursor.fetchall():
    print(f"\n{brand}: {count} items (${value:,.2f}) - {verified} verified with invoices")
    
    # Show items for this brand
    cursor.execute("""
        SELECT 
            i.name,
            COALESCE(i.purchase_price, i.estimated_value) as value,
            i.is_verified,
            r.name as room
        FROM items i
        LEFT JOIN rooms r ON i.room_id = r.id
        WHERE i.brand = ?
        ORDER BY value DESC
        LIMIT 10
    """, (brand,))
    
    for name, item_value, item_verified, room in cursor.fetchall():
        v = "✓" if item_verified else " "
        print(f"  {v} {name[:50]:<50} | {room[:25]:<25} | ${item_value:>10,.2f}")

conn.close()

print("\n" + "=" * 150)
print("END OF VERIFIED INVENTORY REPORT")
print("=" * 150)