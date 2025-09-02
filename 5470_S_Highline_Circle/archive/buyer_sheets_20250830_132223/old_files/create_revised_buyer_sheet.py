#!/usr/bin/env python3
"""
Create revised buyer sheet - reframe outdoor plantings appropriately
"""

import sqlite3
from datetime import datetime
from decimal import Decimal

# Connect to database
conn = sqlite3.connect('backend/inventory_master.db')
cursor = conn.cursor()

print("=" * 100)
print("5470 S HIGHLINE CIRCLE - BUYER SHEET")
print("=" * 100)
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# Define all confirmed buyer sheet items from conversation
buyer_sheet_items = {
    # MAIN LEVEL
    "Living Room": [
        ("Custom Blue Velvet Sofas (2) with fabric", 16259.48, "Holly Downs Invoice", True),
        ("Custom Area Rug (22'4\" × 15'2\", cut around corners, serged)", 9442.27, "Holly Downs Invoice", True),
        ("Red Chairs (2)", 9428.52, "Holly Downs Invoice", True),
        ("Black Library Hutch with Mirrored Doors", 8000.00, "Invoice", True),
        ("TV – Samsung QN65QN900C 65\" Neo QLED 8K (2023)", 4999.99, "Samsung Invoice", True),
        ("Custom Green Velvet Chaise Lounge", 4565.15, "Holly Downs Invoice", True),
        ("Coffee Table (Black)", 3262.42, "Holly Downs Invoice", True),
        ("2 Round Urns (33.5\"D x 33.5\"H) with Kentia Palms", 3060.00, "B&F Invoice", True),
        ("Custom Pillows (7 total - mixed colors)", 2814.30, "Holly Downs Invoice", True),
        ("Knoll Side Tables (2)", 1448.00, "Invoice", True),
    ],
    
    "Dining Room": [
        ("Dining Room Custom Grey Oak Table", 5145.77, "Holly Downs Invoice", True),
        ("Dining Chairs (6, cane back)", 7222.70, "Holly Downs Invoice", True),
        ("Red Buffet Cabinet", 9059.20, "Holly Downs Invoice", True),
        ("Circular Art Mirror (RH)", 2500.00, "RH Estimate", False),
    ],
    
    "Entry (Main Level)": [
        ("Ming Aralia Tree in Planter", 650.00, "B&F Invoice", True),
        ("Lady Palm in Planter", 650.00, "B&F Invoice", True),
        ("Custom Carpet for Front Stairs (Grey Chevron)", 11964.01, "Holly Downs Invoice", True),
    ],
    
    "Kitchen": [
        ("Ficus Tree in Large Planter", 750.00, "B&F Invoice", True),
    ],
    
    "Hearth Room": [
        ("RH Maxwell U-Chaise Sectional (Performance Velvet, Graphite)", 12485.00, "Restoration Hardware", True),
    ],
    
    "Bar Area (Main Level)": [
        ("Green Bar Stools (6 total)", 5490.72, "Holly Downs Invoice", True),
    ],
    
    "Main Level Hallway": [
        ("3 Navy Blue Planters with Plants", 2067.15, "B&F Invoice", True),
    ],
    
    # LOWER LEVEL
    "Rec Room (Lower Level)": [
        ("Malibu Pool Table w/ Ping Pong Top", 17376.00, "Invoice", True),
        ("Lovesac Sactionals Modular Sofa", 7698.39, "LoveSac Invoice", True),
        ("FLOR Carpet Tiles - Rec Room Portion", 2180.50, "FLOR Invoice", True),
    ],
    
    "Exercise Room": [
        ("Tonal System", 3898.96, "Tonal Invoice", True),
        ("Ethan Allen King Bed Frame", 2500.00, "Fair Market Value", False),
        ("King Mattress", 800.00, "Fair Market Value", False),
        ("Ethan Allen Dressers (2)", 3000.00, "Fair Market Value", False),
    ],
    
    # UPPER LEVEL
    "Upper Terrace": [
        ("TV – Samsung QN75LST7T 75\" The Terrace", 5199.99, "Samsung Invoice", True),
        ("Arhaus Outdoor Dining Set (Table, 2 Benches, 2 Armchairs)", 2500.00, "Fair Market Value", False),
        ("Outdoor Planters (Pair) - Bronze Metallic with Ferns", 325.00, "Fair Market Value", False),
    ],
    
    "Primary Bedroom": [
        ("TV – Samsung QN65QN900C 65\" Neo QLED 8K (2023)", 4999.99, "Samsung Invoice", True),
        ("Upholstered Lounge Chairs (Pair) - Gray Geometric", 1500.00, "Fair Market Value", False),
        ("Fiddle Leaf Fig (14\") in Terra Cotta Planter", 483.50, "B&F Invoice", True),
    ],
    
    "Primary Bedroom Entry": [
        ("Blue Console", 3771.79, "Holly Downs Invoice", True),
    ],
    
    "Primary Bath": [
        ("Corn Plant (10\" Dracaena) in Decorative Pot", 392.50, "B&F Invoice", True),
    ],
    
    "Upper Level Hallway": [
        ("Blue Runner (30\" × 11', rubber backing)", 307.01, "Holly Downs Invoice", True),
    ],
    
    "East Staircase (Main to Upper)": [
        ("Vestaboard (Smart Display Board)", 3435.33, "Invoice", True),
    ],
    
    "Upstairs Office": [
        ("Barcelona Daybed (black tufted leather, stainless/wood)", 13000.00, "DWR/Knoll Retail Value", False),
        ("Eames Lounge Chair + Ottoman (Tall Version, Walnut)", 7495.00, "DWR Retail Value", False),
        ("TV – Samsung QN65QN900C 65\" Neo QLED 8K (2023)", 4999.99, "Samsung Invoice", True),
        ("DWR Swivel Lounge Chairs (Pair, charcoal wool blend)", 4300.00, "DWR Retail Value", False),
        ("Nelson Platform Bench", 1395.00, "DWR Retail Value", False),
        ("Metallic Cube Side Tables (2)", 1250.00, "Market Value", False),
        ("Tri Arm Floor Lamp", 1165.50, "DWR Invoice", True),
        ("DWR Round Café Table", 1150.00, "DWR Retail Value", False),
        ("Snake Plant & Chinese Evergreen with Planters", 654.50, "B&F Invoice", True),
    ],
    
    "Upper Bedroom A": [
        ("Custom Floating Wood Shelves (2) with Hanging Rod", 1200.00, "Market Value", False),
        ("Queen Bed Frame and Mattress", 500.00, "Fair Market Value", False),
        ("Samsung TV (55\" older model)", 400.00, "Fair Market Value", False),
        ("Area Rug", 200.00, "Fair Market Value", False),
    ],
    
    "Upper Bedroom B": [
        ("2 Corn Plants (9\" Dracaena) with Pots", 480.00, "B&F Invoice", True),
        ("Oak Bed Frame (IKEA style) and Queen Mattress", 750.00, "Fair Market Value", False),
        ("Samsung TV (55\" older model)", 400.00, "Fair Market Value", False),
        ("2 Area Rugs", 400.00, "Fair Market Value", False),
        ("2 Bedside Tables (IKEA style)", 200.00, "Fair Market Value", False),
        ("Desk (IKEA style)", 200.00, "Fair Market Value", False),
        ("Lounge Chair", 200.00, "Fair Market Value", False),
        ("Wall-Mounted Shelves (IKEA style)", 150.00, "Fair Market Value", False),
    ],
    
    # OUTDOOR ADDITIONS
    "Outdoor Nook Patio": [
        ("White Adirondack Chairs (2) with Side Table", 325.00, "Fair Market Value", False),
        ("Wicker Chaise Lounges (2) with Cushions + Red Umbrella", 1000.00, "Fair Market Value", False),
        ("Black Metal Bistro Set (Table + 4 Chairs) with Red Umbrella", 525.00, "Fair Market Value", False),
    ],
    
    # WHOLE PROPERTY - REVISED
    "Interior Plants (Throughout Property)": [
        ("Complete Bloom & Flourish Interior Plant Collection", 15000.00, "B&F Invoice", True),
        ("All Interior Decorative Planters and Containers", 8540.48, "B&F/Holly Downs Invoice", True),
    ],
    
    "Outdoor Plants & Landscaping": [
        ("Permanent Faux Boxwood Installations (Built-in)", 10480.00, "B Gardening Invoice", True),
        ("Premium Outdoor Planter Collection (13 main + window boxes)", 12000.00, "B Gardening Estimate", False),
        ("Current Seasonal Plantings in All Containers", 8000.00, "B Gardening Current Value", False),
        ("Automated Irrigation System for Planters", 3500.00, "B Gardening Estimate", False),
    ],
}

# Calculate and display by room
grand_total = 0
verified_total = 0
estimated_total = 0
item_count = 0

# Define room order for printing
room_order = [
    # Main Level
    "Living Room", "Dining Room", "Entry (Main Level)", "Kitchen", "Hearth Room",
    "Bar Area (Main Level)", "Main Level Hallway",
    # Lower Level
    "Rec Room (Lower Level)", "Exercise Room",
    # Upper Level
    "Primary Bedroom", "Primary Bedroom Entry", "Primary Bath",
    "Upper Level Hallway", "East Staircase (Main to Upper)", "Upstairs Office",
    "Upper Bedroom A", "Upper Bedroom B", "Upper Terrace",
    # Outdoor
    "Outdoor Nook Patio",
    # Plants
    "Interior Plants (Throughout Property)", "Outdoor Plants & Landscaping"
]

print("BUYER SHEET BY LOCATION\n")

for room in room_order:
    if room in buyer_sheet_items:
        items = buyer_sheet_items[room]
        room_total = sum(item[1] for item in items)
        room_verified = sum(item[1] for item in items if item[3])
        
        print(f"\n{room.upper()}")
        print("-" * 80)
        
        for name, price, source, verified in sorted(items, key=lambda x: x[1], reverse=True):
            verified_mark = "✅" if verified else "⚪"
            print(f"{verified_mark} {name}: ${price:,.2f}")
            item_count += 1
            if verified:
                verified_total += price
            else:
                estimated_total += price
        
        print(f"Subtotal: ${room_total:,.2f}")
        grand_total += room_total

# Summary
print("\n" + "=" * 100)
print("BUYER SHEET SUMMARY")
print("=" * 100)
print(f"Total Items on Buyer Sheet: {item_count}")
print(f"Items with Verified Invoices: {sum(1 for room in buyer_sheet_items.values() for item in room if item[3])}")
print(f"Items with Market Estimates: {sum(1 for room in buyer_sheet_items.values() for item in room if not item[3])}")
print(f"\nVerified Items Value: ${verified_total:,.2f} ({verified_total/grand_total*100:.1f}%)")
print(f"Estimated Items Value: ${estimated_total:,.2f} ({estimated_total/grand_total*100:.1f}%)")
print(f"\n{'='*50}")
print(f"BUYER SHEET TOTAL: ${grand_total:,.2f}")
print(f"{'='*50}")

# High-value items summary
print("\n" + "=" * 100)
print("HIGH-VALUE ITEMS (>$5,000)")
print("-" * 80)

high_value = []
for room, items in buyer_sheet_items.items():
    for name, price, source, verified in items:
        if price > 5000:
            high_value.append((name, price, room, verified))

for name, price, room, verified in sorted(high_value, key=lambda x: x[1], reverse=True):
    verified_mark = "✅" if verified else "⚪"
    print(f"{verified_mark} {name} - {room}: ${price:,.2f}")

print("\n" + "=" * 100)
print("IMPORTANT NOTES")
print("-" * 80)
print("• All interior and exterior plants with containers are included as complete collections")
print("• Current seasonal plantings reflect today's installed value (not historical costs)")
print("• If buyer prefers not to include plants/containers, we will remove them before closing")
print("• Permanent installations (faux boxwoods, irrigation) are built-in features that stay")

print("\n" + "=" * 100)
print("BUYER SHEET COMPLETE")
print("=" * 100)
print(f"\nThis buyer sheet includes {item_count} items totaling ${grand_total:,.2f}")
print(f"to be conveyed with the sale of 5470 S Highline Circle.")
print("\nItems marked with ✅ have verified purchase invoices.")
print("Items marked with ⚪ are valued at fair market/resale estimates.")

conn.close()