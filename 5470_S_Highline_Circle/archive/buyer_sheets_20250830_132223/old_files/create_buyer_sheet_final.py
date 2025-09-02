#!/usr/bin/env python3
"""
Create final buyer sheet based on conversation history
All items go to buyer sheet except those explicitly marked as "Keep" by owners
"""

import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')
cursor = conn.cursor()

print("=" * 100)
print("5470 S HIGHLINE CIRCLE - COMPREHENSIVE BUYER SHEET")
print("=" * 100)
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# Define items to KEEP (not on buyer sheet) based on conversation
keep_items = [
    # Primary Bedroom
    "Avalon X motorized roller blades",
    
    # Office
    "Desk - standing",
    "Office chair",
    "Monitor",
    "Computer setup",
    
    # Living Room
    "Upright Piano",
    
    # Kitchen
    "Appliances",  # Built-in
    
    # Rec Room Bar
    "All items in rec room bar area",
    
    # Garage
    "Hot tub (moved to lower terrace)",
    "Cold plunge (moved to lower terrace)",
    
    # Exercise Room
    "Elliptical machine",
    
    # Various indoor plants the owners are keeping
    "Indoor plant (by window - owners keeping)",
]

# Get all items with their values
cursor.execute("""
    SELECT 
        i.id,
        i.name,
        r.name as room,
        COALESCE(i.purchase_price, i.estimated_value, 0) as value,
        i.is_verified,
        i.brand,
        i.valuation_source
    FROM items i
    LEFT JOIN rooms r ON i.room_id = r.id
    WHERE COALESCE(i.purchase_price, i.estimated_value, 0) > 0
    ORDER BY r.name, value DESC
""")

all_items = cursor.fetchall()

# Organize by room, excluding keep items
buyer_sheet = {}
for item_id, name, room, value, verified, brand, source in all_items:
    # Skip items owners are keeping
    is_keep = False
    for keep_pattern in keep_items:
        if keep_pattern.lower() in name.lower():
            is_keep = True
            break
    
    # Skip built-in appliances
    if room and "kitchen" in room.lower() and any(x in name.lower() for x in ["refrigerator", "dishwasher", "oven", "microwave", "range"]):
        is_keep = True
    
    # Skip rec room bar items
    if room and "rec room" in room.lower() and "bar" in name.lower():
        is_keep = True
    
    if not is_keep:
        if room not in buyer_sheet:
            buyer_sheet[room] = []
        buyer_sheet[room].append({
            'id': item_id,
            'name': name,
            'value': value,
            'verified': verified,
            'brand': brand,
            'source': source
        })

# Define room order by level
room_order = [
    # Upper Level
    'Primary Bedroom', 'Primary Bath', 'Office (2nd Floor)', 'Office',
    'Guest Suite (Upper Level)', 'Upper Terrace',
    'Upper Hallway', 'Bedroom A', 'Bedroom B', 'Upper Bath',
    
    # Main Level
    'Living Room', 'Dining Room', 'Kitchen', 'Hearth Room',
    'Foyer / Main Entry', 'Entry', 'Powder Room', 'Bar Area',
    'Main Level Hallway', 'Covered Porch (Main Level Outdoor)',
    'Nook',
    
    # Lower Level
    'Rec Room (Lower Level)', 'Rec Room', 'Lower Level Bar', 'Exercise Room',
    'Lower Level Theater', 'Theater', 'Guest Bedroom (Lower East)',
    'Guest Bedroom (Lower West)', 'Wine Room', 'Guest Bath (Lower)',
    'Lower Terrace Patio (Below)', 'Lower Terrace', 'Hot Tub Area (Covered, Lower)',
    
    # Outdoor
    'Whole Property (Plants)', 'Outdoor', 'Backyard', 'Driveway',
    
    # Other
    'Garage', 'Storage/Closet', 'Various', 'Unassigned', 'Unassigned (Bloom & Flourish)'
]

# Print buyer sheet
grand_total = 0
items_on_sheet = 0

print("BUYER SHEET BY ROOM\n")
print("=" * 100)

for room_name in room_order:
    if room_name in buyer_sheet:
        room_items = buyer_sheet[room_name]
        room_total = sum(item['value'] for item in room_items)
        
        if room_total > 0:
            print(f"\n{room_name.upper()}")
            print("-" * 80)
            
            for item in sorted(room_items, key=lambda x: x['value'], reverse=True):
                verified_mark = "✅" if item['verified'] else "⚪"
                brand_str = f" ({item['brand']})" if item['brand'] else ""
                print(f"{verified_mark} {item['name']}{brand_str}: ${item['value']:,.2f}")
                items_on_sheet += 1
            
            print(f"Subtotal: ${room_total:,.2f}")
            grand_total += room_total

# Add comprehensive B Gardening outdoor installations
print("\n" + "=" * 100)
print("B GARDENING - COMPREHENSIVE OUTDOOR INSTALLATIONS")
print("-" * 80)

b_gardening_comprehensive = {
    'Permanent Faux Boxwood Installations (full property)': 10480.00,
    'Annual Plant Rotations 2024-2025 (documented)': 34561.00,
    'Container Collection - 13 Main Planters': 8000.00,
    'Window Box Planters': 2000.00,
    'Fireplace Area Planters': 1500.00,
    'Irrigation System for Planters': 3500.00,
}

b_gardening_total = 0
for item, value in b_gardening_comprehensive.items():
    print(f"✅ {item}: ${value:,.2f}")
    b_gardening_total += value
    items_on_sheet += len(b_gardening_comprehensive)

print(f"B Gardening Total: ${b_gardening_total:,.2f}")
grand_total += b_gardening_total

# Summary
print("\n" + "=" * 100)
print(f"BUYER SHEET GRAND TOTAL: ${grand_total:,.2f}")
print("=" * 100)

print(f"\nSummary:")
print(f"- Total Items on Buyer Sheet: {items_on_sheet}")
print(f"- Total Value: ${grand_total:,.2f}")

# List high-value items
print("\n" + "=" * 100)
print("HIGH-VALUE ITEMS (>$5,000) ON BUYER SHEET")
print("-" * 80)

high_value_items = []
for room_name, items in buyer_sheet.items():
    for item in items:
        if item['value'] > 5000:
            high_value_items.append((item['name'], room_name, item['value'], item['brand'], item['verified']))

for name, room, value, brand, verified in sorted(high_value_items, key=lambda x: x[2], reverse=True)[:20]:
    verified_mark = "✅" if verified else "⚪"
    brand_str = f" ({brand})" if brand else ""
    print(f"{verified_mark} {name}{brand_str} - {room}: ${value:,.2f}")

# Save buyer sheet IDs to database
print("\n" + "=" * 100)
print("UPDATING DATABASE WITH BUYER SHEET DECISIONS")
print("-" * 80)

# Clear old decisions
cursor.execute("DELETE FROM item_decisions")

# Insert new decisions
for room_name, items in buyer_sheet.items():
    for item in items:
        cursor.execute("""
            INSERT INTO item_decisions (item_id, decision, reason, decided_by, decided_at)
            VALUES (?, 'Sell', 'Included in home sale - buyer sheet', 'system', datetime('now'))
        """, (item['id'],))

# Mark keep items
cursor.execute("""
    INSERT INTO item_decisions (item_id, decision, reason, decided_by, decided_at)
    SELECT id, 'Keep', 'Owner keeping', 'system', datetime('now')
    FROM items
    WHERE id NOT IN (SELECT item_id FROM item_decisions)
""")

conn.commit()
conn.close()

print("✅ Database updated with buyer sheet decisions")
print("\n" + "=" * 100)
print("BUYER SHEET COMPLETE")
print("=" * 100)