#!/usr/bin/env python3
"""Check detailed inventory from Excel"""

import pandas as pd
import sqlite3

# Load Excel data
print("Loading Excel inventory data...")
xl = pd.ExcelFile('5470_furnishings_inventory_v2_compat.xlsx')
df = pd.read_excel(xl, sheet_name='Inventory (All Items)')

print(f"\nTotal items in Excel: {len(df)}")
print(f"Items with Designer Invoice price: {df['Price (Designer Invoice)'].notna().sum()}")
print(f"Items with Invoice Ref: {df['Invoice Ref'].notna().sum()}")

# Check Office items specifically
print("\n" + "="*60)
print("OFFICE ITEMS IN EXCEL:")
print("="*60)
office_items = df[df['Room'].str.contains('Office|office', na=False, case=False)]
print(f"Total office items: {len(office_items)}")

for idx, row in office_items.iterrows():
    price_invoice = row.get('Price (Designer Invoice)')
    price_est = row.get('Price')
    price = price_invoice if pd.notna(price_invoice) else price_est
    invoice_ref = row.get('Invoice Ref', '')
    source = row.get('Source', '')
    
    if pd.notna(price) and price > 0:
        price_str = f"${price:,.2f}"
        if pd.notna(invoice_ref):
            price_str += f" (Invoice: {invoice_ref})"
        print(f"  {row['Item']}: {price_str}")
        if source:
            print(f"    Source: {source}")

# Check for Design Within Reach items
print("\n" + "="*60)
print("DESIGN WITHIN REACH ITEMS:")
print("="*60)
dwr_items = df[df['Item'].str.contains('DWR|Design Within Reach|Eames', na=False, case=False) | 
               df['Source'].str.contains('Design Within Reach|DWR', na=False, case=False)]
print(f"Total DWR items: {len(dwr_items)}")

for idx, row in dwr_items.iterrows():
    price_invoice = row.get('Price (Designer Invoice)')
    price_est = row.get('Price')
    price = price_invoice if pd.notna(price_invoice) else price_est
    room = row.get('Room', 'Unknown')
    
    if pd.notna(price) and price > 0:
        print(f"  {row['Item']} (Room: {room}): ${price:,.2f}")

# Check current database
print("\n" + "="*60)
print("CHECKING DATABASE FOR OFFICE ITEMS:")
print("="*60)
conn = sqlite3.connect('backend/inventory_master.db')
cursor = conn.cursor()

# Check office items in database
cursor.execute("""
    SELECT i.name, i.estimated_value, i.purchase_price, i.brand, i.is_verified, r.name as room
    FROM items i
    LEFT JOIN rooms r ON i.room_id = r.id
    WHERE r.name LIKE '%Office%' OR r.name LIKE '%office%'
    ORDER BY COALESCE(i.estimated_value, i.purchase_price) DESC
""")

db_office_items = cursor.fetchall()
print(f"Office items in database: {len(db_office_items)}")
for item in db_office_items[:20]:
    name, est_val, purch_price, brand, verified, room = item
    value = est_val if est_val else purch_price
    if value and value > 0:
        verified_str = "✓" if verified else ""
        brand_str = f" ({brand})" if brand else ""
        print(f"  {name}{brand_str}: ${value:,.2f} {verified_str}")

# Check for missing high-value items
print("\n" + "="*60)
print("HIGH-VALUE ITEMS IN EXCEL NOT IN DATABASE:")
print("="*60)

# Get all high-value items from Excel
high_value_excel = df[df['Price (Designer Invoice)'] > 3000]
print(f"Items over $3000 in Excel: {len(high_value_excel)}")

# Get item names from database
cursor.execute("SELECT name FROM items")
db_item_names = [row[0].lower() for row in cursor.fetchall()]

missing_items = []
for idx, row in high_value_excel.iterrows():
    item_name = row['Item']
    if pd.notna(item_name):
        # Check if this item exists in database
        if item_name.lower() not in db_item_names:
            price = row['Price (Designer Invoice)']
            room = row.get('Room', 'Unknown')
            missing_items.append((item_name, price, room))

if missing_items:
    print(f"\nMissing {len(missing_items)} high-value items from database:")
    for name, price, room in sorted(missing_items, key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {name} (Room: {room}): ${price:,.2f}")
else:
    print("All high-value items are in database")

conn.close()

# Check Bloom & Flourish sheet
print("\n" + "="*60)
print("BLOOM & FLOURISH ITEMS:")
print("="*60)
if 'Bloom & Flourish' in xl.sheet_names:
    bloom_df = pd.read_excel(xl, sheet_name='Bloom & Flourish')
    print(f"Total B&F items: {len(bloom_df)}")
    total_bf_value = bloom_df['Line Total'].sum()
    print(f"Total B&F value: ${total_bf_value:,.2f}")