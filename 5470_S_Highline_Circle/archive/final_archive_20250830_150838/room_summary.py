#!/usr/bin/env python3

import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')

# Get all items with their rooms
query = '''
SELECT 
    r.name as room_name,
    COUNT(DISTINCT i.id) as item_count,
    COUNT(DISTINCT i.category_id) as category_count,
    SUM(CASE WHEN i.is_verified = 1 THEN 1 ELSE 0 END) as verified_items,
    ROUND(SUM(CASE WHEN i.is_verified = 1 THEN COALESCE(i.purchase_price, i.estimated_value, 0) ELSE 0 END), 2) as verified_value,
    ROUND(SUM(CASE WHEN i.is_verified != 1 THEN COALESCE(i.purchase_price, i.estimated_value, 0) ELSE 0 END), 2) as estimated_value,
    ROUND(SUM(COALESCE(i.purchase_price, i.estimated_value, 0)), 2) as total_value
FROM items i
JOIN rooms r ON i.room_id = r.id
WHERE i.status = 'Active'
GROUP BY r.id, r.name
ORDER BY r.name
'''

df = pd.read_sql_query(query, conn)

# Categorize rooms by floor level
def get_floor_level(room_name):
    room_lower = str(room_name).lower()
    
    # Lower Level
    if any(x in room_lower for x in ['rec room', 'exercise', 'theater', 'guest bedroom (lower', 'hot tub']):
        return 'Lower Level'
    # Upper Level
    elif any(x in room_lower for x in ['primary', 'upstairs', 'upper bedroom', 'upper terrace', 'upper level', 'east staircase']):
        return 'Upper Level'
    # Outdoor
    elif any(x in room_lower for x in ['outdoor', 'patio', 'lower terrace', 'whole property']):
        return 'Outdoor/Property'
    # Main Level
    else:
        return 'Main Level'

df['floor_level'] = df['room_name'].apply(get_floor_level)

# Print formatted summary
print("="*100)
print(" " * 30 + "5470 S HIGHLINE CIRCLE")
print(" " * 25 + "ROOM INVENTORY CATEGORIZATION")
print("="*100)

floor_order = ['Main Level', 'Upper Level', 'Lower Level', 'Outdoor/Property']

for floor in floor_order:
    floor_data = df[df['floor_level'] == floor]
    if len(floor_data) > 0:
        print(f"\n{floor.upper()}")
        print("-"*100)
        print(f"{'Room':<30} {'Items':>8} {'Verified':>10} {'Verified $':>15} {'Estimated $':>15} {'Total $':>15}")
        print("-"*100)
        
        floor_total_items = 0
        floor_verified_value = 0
        floor_estimated_value = 0
        floor_total_value = 0
        
        for _, row in floor_data.iterrows():
            print(f"{row['room_name']:<30} {int(row['item_count']):>8} {int(row['verified_items']):>10} "
                  f"${row['verified_value']:>14,.2f} ${row['estimated_value']:>14,.2f} ${row['total_value']:>14,.2f}")
            
            floor_total_items += row['item_count']
            floor_verified_value += row['verified_value']
            floor_estimated_value += row['estimated_value']
            floor_total_value += row['total_value']
        
        print("-"*100)
        print(f"{'FLOOR SUBTOTAL':<30} {int(floor_total_items):>8} {' ':>10} "
              f"${floor_verified_value:>14,.2f} ${floor_estimated_value:>14,.2f} ${floor_total_value:>14,.2f}")

# Grand totals
print("\n" + "="*100)
print("PROPERTY TOTALS")
print("="*100)

total_rooms = len(df)
total_items = df['item_count'].sum()
total_verified = df['verified_items'].sum()
total_verified_value = df['verified_value'].sum()
total_estimated_value = df['estimated_value'].sum()
grand_total = df['total_value'].sum()

print(f"\nTotal Rooms: {int(total_rooms)}")
print(f"Total Items: {int(total_items)}")
print(f"Verified Items: {int(total_verified)} ({int(total_verified/total_items*100)}%)")
print(f"\nVerified Value:  ${total_verified_value:>14,.2f}")
print(f"Estimated Value: ${total_estimated_value:>14,.2f}")
print("-"*40)
print(f"GRAND TOTAL:     ${grand_total:>14,.2f}")
print("="*100)

conn.close()