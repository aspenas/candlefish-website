#!/usr/bin/env python3

import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')

# Query to get all rooms with their items and categories
query = '''
SELECT 
    r.name as room_name,
    r.floor_level,
    COUNT(DISTINCT i.id) as item_count,
    COUNT(DISTINCT i.category) as category_count,
    GROUP_CONCAT(DISTINCT i.category) as categories,
    ROUND(SUM(CASE WHEN i.is_verified = 1 THEN i.price ELSE 0 END), 2) as verified_value,
    ROUND(SUM(CASE WHEN i.is_verified = 0 THEN i.price ELSE 0 END), 2) as estimated_value,
    ROUND(SUM(i.price), 2) as total_value
FROM rooms r
LEFT JOIN items i ON r.id = i.room_id
GROUP BY r.id, r.name, r.floor_level
ORDER BY 
    CASE 
        WHEN r.floor_level = 'Main Level' THEN 1
        WHEN r.floor_level = 'Upper Level' THEN 2
        WHEN r.floor_level = 'Lower Level' THEN 3
        WHEN r.floor_level = 'Outdoor' THEN 4
        ELSE 5
    END,
    r.name
'''

df = pd.read_sql_query(query, conn)

# Display room summary
print('='*120)
print('ROOM INVENTORY SUMMARY - 5470 S HIGHLINE CIRCLE')
print('='*120)
print()

current_floor = None
for _, row in df.iterrows():
    if row['floor_level'] != current_floor:
        current_floor = row['floor_level']
        print(f'\n{"-"*80}')
        print(f'{current_floor.upper()}')
        print(f'{"-"*80}')
    
    print(f'\n{row["room_name"]}')
    print(f'  Items: {int(row["item_count"]) if row["item_count"] else 0}')
    if row['categories']:
        print(f'  Categories: {row["categories"]}')
    if row['total_value'] and row['total_value'] > 0:
        print(f'  Verified Value: ${row["verified_value"]:,.2f}')
        print(f'  Estimated Value: ${row["estimated_value"]:,.2f}')
        print(f'  Total Value: ${row["total_value"]:,.2f}')

# Get detailed breakdown by category
print('\n')
print('='*120)
print('CATEGORIES BY ROOM')
print('='*120)

query2 = '''
SELECT 
    r.floor_level,
    r.name as room_name,
    i.category,
    COUNT(*) as item_count,
    ROUND(SUM(i.price), 2) as category_value
FROM items i
JOIN rooms r ON i.room_id = r.id
WHERE i.category IS NOT NULL
GROUP BY r.floor_level, r.name, i.category
ORDER BY 
    CASE 
        WHEN r.floor_level = 'Main Level' THEN 1
        WHEN r.floor_level = 'Upper Level' THEN 2
        WHEN r.floor_level = 'Lower Level' THEN 3
        WHEN r.floor_level = 'Outdoor' THEN 4
        ELSE 5
    END,
    r.name, i.category
'''

df2 = pd.read_sql_query(query2, conn)

current_room = None
for _, row in df2.iterrows():
    if row['room_name'] != current_room:
        current_room = row['room_name']
        print(f'\n{row["floor_level"]} - {row["room_name"]}:')
    print(f'  • {row["category"]}: {int(row["item_count"])} items (${row["category_value"]:,.2f})')

# Get totals
print('\n')
print('='*120)
print('GRAND TOTALS')
print('='*120)

query3 = '''
SELECT 
    COUNT(DISTINCT r.id) as total_rooms,
    COUNT(DISTINCT i.id) as total_items,
    COUNT(DISTINCT i.category) as total_categories,
    ROUND(SUM(CASE WHEN i.is_verified = 1 THEN i.price ELSE 0 END), 2) as total_verified,
    ROUND(SUM(CASE WHEN i.is_verified = 0 THEN i.price ELSE 0 END), 2) as total_estimated,
    ROUND(SUM(i.price), 2) as grand_total
FROM rooms r
LEFT JOIN items i ON r.id = i.room_id
'''

totals = pd.read_sql_query(query3, conn).iloc[0]
print(f'Total Rooms: {int(totals["total_rooms"])}')
print(f'Total Items: {int(totals["total_items"])}')
print(f'Total Categories: {int(totals["total_categories"])}')
print(f'Verified Value: ${totals["total_verified"]:,.2f}')
print(f'Estimated Value: ${totals["total_estimated"]:,.2f}')
print(f'Grand Total: ${totals["grand_total"]:,.2f}')

conn.close()