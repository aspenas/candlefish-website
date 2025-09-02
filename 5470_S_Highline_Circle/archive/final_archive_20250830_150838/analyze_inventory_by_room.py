#!/usr/bin/env python3

import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')

# First get the room structure with categories
query_categories = '''
SELECT id, name FROM categories
'''
categories_df = pd.read_sql_query(query_categories, conn)
category_map = dict(zip(categories_df['id'], categories_df['name']))

# Get all items with their rooms
query = '''
SELECT 
    r.name as room_name,
    r.floor as floor_number,
    i.name as item_name,
    i.category_id,
    i.brand,
    i.description,
    i.location_notes,
    COALESCE(i.purchase_price, i.estimated_value, 0) as price,
    i.is_verified,
    i.valuation_source,
    i.status
FROM items i
JOIN rooms r ON i.room_id = r.id
WHERE i.status = 'Active'
ORDER BY r.name, i.category_id, i.name
'''

df = pd.read_sql_query(query, conn)

# Map category IDs to names
df['category'] = df['category_id'].map(category_map)

# Determine floor level based on room name and location notes
def get_floor_level(row):
    room_lower = str(row['room_name']).lower()
    location_lower = str(row['location_notes']).lower() if row['location_notes'] else ''
    
    # Check for specific floor indicators
    if any(x in room_lower for x in ['rec room', 'exercise', 'theater', 'lower level', 'hot tub area']):
        return 'Lower Level'
    elif any(x in room_lower for x in ['guest bedroom (lower']):
        return 'Lower Level'
    elif any(x in room_lower for x in ['primary', 'upstairs', 'upper bedroom', 'upper terrace', 'upper level']):
        return 'Upper Level'
    elif any(x in room_lower for x in ['outdoor', 'patio', 'lower terrace']):
        return 'Outdoor'
    elif any(x in room_lower for x in ['living', 'dining', 'kitchen', 'entry', 'hearth', 'bar', 'main level', 'hallway']):
        return 'Main Level'
    elif 'staircase' in room_lower:
        if 'upper' in location_lower or 'east' in room_lower:
            return 'Upper Level'
        else:
            return 'Main Level'
    else:
        # Default based on floor number if available
        if row['floor_number'] == 0:
            return 'Lower Level'
        elif row['floor_number'] == 1:
            return 'Main Level'
        elif row['floor_number'] == 2:
            return 'Upper Level'
        else:
            return 'Main Level'

df['floor_level'] = df.apply(get_floor_level, axis=1)

# Print summary by floor and room
print("="*120)
print("5470 S HIGHLINE CIRCLE - INVENTORY BY ROOM")
print("="*120)

floor_order = ['Main Level', 'Upper Level', 'Lower Level', 'Outdoor']

for floor in floor_order:
    floor_data = df[df['floor_level'] == floor]
    if len(floor_data) > 0:
        print(f"\n{'='*80}")
        print(f"{floor.upper()}")
        print(f"{'='*80}")
        
        rooms = floor_data.groupby('room_name')
        for room_name, room_items in rooms:
            print(f"\n{room_name}")
            print("-" * 60)
            
            # Group by category
            categories = room_items.groupby('category')
            for category, cat_items in categories:
                if category:
                    print(f"\n  {category}:")
                    for _, item in cat_items.iterrows():
                        price_str = f"${item['price']:,.2f}" if item['price'] > 0 else "No price"
                        verified = "✓" if item['is_verified'] else "○"
                        brand_str = f" ({item['brand']})" if item['brand'] else ""
                        print(f"    {verified} {item['item_name']}{brand_str} - {price_str}")
                        if item['description'] and len(str(item['description'])) > 0:
                            print(f"      {item['description'][:80]}")
            
            # Room totals
            room_total = room_items['price'].sum()
            verified_total = room_items[room_items['is_verified'] == 1]['price'].sum()
            estimated_total = room_items[room_items['is_verified'] != 1]['price'].sum()
            
            print(f"\n  Room Summary:")
            print(f"    Total Items: {len(room_items)}")
            print(f"    Verified Value: ${verified_total:,.2f}")
            print(f"    Estimated Value: ${estimated_total:,.2f}")
            print(f"    Room Total: ${room_total:,.2f}")

# Grand totals
print("\n" + "="*120)
print("GRAND TOTALS")
print("="*120)

total_items = len(df)
total_value = df['price'].sum()
verified_value = df[df['is_verified'] == 1]['price'].sum()
estimated_value = df[df['is_verified'] != 1]['price'].sum()
unique_rooms = df['room_name'].nunique()
unique_categories = df['category'].nunique()

print(f"\nTotal Rooms: {unique_rooms}")
print(f"Total Items: {total_items}")
print(f"Total Categories: {unique_categories}")
print(f"Verified Value: ${verified_value:,.2f}")
print(f"Estimated Value: ${estimated_value:,.2f}")
print(f"Grand Total: ${total_value:,.2f}")

# Category summary
print("\n" + "="*120)
print("SUMMARY BY CATEGORY")
print("="*120)

category_summary = df.groupby('category').agg({
    'item_name': 'count',
    'price': 'sum'
}).sort_values('price', ascending=False)

for category, row in category_summary.iterrows():
    if category:
        print(f"{category}: {int(row['item_name'])} items - ${row['price']:,.2f}")

conn.close()