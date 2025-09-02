#!/usr/bin/env python3

import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')

# First, let's see what rooms we have and their location info
query_rooms = '''
SELECT 
    r.id,
    r.name as room_name,
    i.location as item_location,
    COUNT(*) as item_count
FROM rooms r
LEFT JOIN items i ON r.id = i.room_id
GROUP BY r.id, r.name, i.location
ORDER BY r.name, i.location
'''

print("="*80)
print("ANALYZING ROOM STRUCTURE")
print("="*80)

df_rooms = pd.read_sql_query(query_rooms, conn)
print("\nRooms and locations found:")
print(df_rooms)

# Now let's get all items with categories and prices
query = '''
SELECT 
    r.name as room_name,
    i.location,
    i.category,
    i.name as item_name,
    i.brand,
    COALESCE(i.price, i.estimated_value, i.purchase_price, 0) as item_price,
    i.is_verified,
    i.valuation_source
FROM items i
JOIN rooms r ON i.room_id = r.id
ORDER BY r.name, i.category, i.name
'''

df = pd.read_sql_query(query, conn)

# Categorize rooms by floor level based on location field
def get_floor_level(location):
    if not location:
        return 'Unknown'
    loc_lower = str(location).lower()
    if 'lower' in loc_lower or 'basement' in loc_lower or 'rec room' in loc_lower or 'exercise' in loc_lower or 'theater' in loc_lower:
        return 'Lower Level'
    elif 'upper' in loc_lower or 'primary' in loc_lower or 'upstairs' in loc_lower or 'terrace' in loc_lower and 'upper' in loc_lower:
        return 'Upper Level'
    elif 'outdoor' in loc_lower or 'patio' in loc_lower or 'exterior' in loc_lower:
        return 'Outdoor'
    elif 'main' in loc_lower or 'living' in loc_lower or 'dining' in loc_lower or 'kitchen' in loc_lower or 'entry' in loc_lower or 'hearth' in loc_lower or 'bar' in loc_lower:
        return 'Main Level'
    else:
        # Default categorization by room name
        room_name_lower = str(location).lower() if location else ''
        if any(x in room_name_lower for x in ['rec', 'exercise', 'theater', 'guest bedroom (lower']):
            return 'Lower Level'
        elif any(x in room_name_lower for x in ['primary', 'office', 'upper', 'bedroom a', 'bedroom b']):
            return 'Upper Level'
        elif any(x in room_name_lower for x in ['outdoor', 'patio', 'terrace']):
            return 'Outdoor'
        else:
            return 'Main Level'

# Add floor level
df['floor_level'] = df.apply(lambda row: get_floor_level(row['location'] or row['room_name']), axis=1)

# Group by floor and room
summary = df.groupby(['floor_level', 'room_name']).agg({
    'item_name': 'count',
    'category': lambda x: ', '.join(sorted(set([str(c) for c in x if c]))),
    'item_price': 'sum',
    'is_verified': 'sum'
}).rename(columns={
    'item_name': 'item_count',
    'category': 'categories',
    'item_price': 'total_value',
    'is_verified': 'verified_items'
})

print("\n" + "="*80)
print("ROOM INVENTORY BY FLOOR LEVEL")
print("="*80)

for floor in ['Main Level', 'Upper Level', 'Lower Level', 'Outdoor', 'Unknown']:
    if floor in summary.index.get_level_values(0):
        print(f"\n{'-'*60}")
        print(f"{floor.upper()}")
        print(f"{'-'*60}")
        floor_data = summary.loc[floor]
        for room_name, row in floor_data.iterrows():
            print(f"\n{room_name}")
            print(f"  Items: {int(row['item_count'])}")
            if row['categories']:
                print(f"  Categories: {row['categories']}")
            print(f"  Total Value: ${row['total_value']:,.2f}")
            print(f"  Verified Items: {int(row['verified_items'])}/{int(row['item_count'])}")

# Category breakdown
print("\n" + "="*80)
print("CATEGORIES BY ROOM")
print("="*80)

category_summary = df.groupby(['floor_level', 'room_name', 'category']).agg({
    'item_name': 'count',
    'item_price': 'sum'
}).rename(columns={'item_name': 'count', 'item_price': 'value'})

current_floor = None
current_room = None
for (floor, room, category), row in category_summary.iterrows():
    if floor != current_floor:
        current_floor = floor
        print(f"\n{floor.upper()}")
        print("-" * 40)
    if room != current_room:
        current_room = room
        print(f"\n  {room}:")
    if category:
        print(f"    • {category}: {int(row['count'])} items (${row['value']:,.2f})")

# Grand totals
print("\n" + "="*80)
print("GRAND TOTALS")
print("="*80)

total_items = len(df)
total_value = df['item_price'].sum()
verified_value = df[df['is_verified'] == 1]['item_price'].sum()
estimated_value = df[df['is_verified'] != 1]['item_price'].sum()
unique_rooms = df['room_name'].nunique()
unique_categories = df['category'].nunique()

print(f"Total Rooms: {unique_rooms}")
print(f"Total Items: {total_items}")
print(f"Total Categories: {unique_categories}")
print(f"Verified Value: ${verified_value:,.2f}")
print(f"Estimated Value: ${estimated_value:,.2f}")
print(f"Grand Total: ${total_value:,.2f}")

conn.close()