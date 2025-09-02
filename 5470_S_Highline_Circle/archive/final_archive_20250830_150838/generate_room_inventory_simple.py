#!/usr/bin/env python3
"""
Generate comprehensive room-by-room inventory list
Sorted by Level (Upper, Main, Lower) then by room
"""

import json
from datetime import datetime

# Load the JSON data
with open('inventory_full.json', 'r') as f:
    data = json.load(f)

items = data['items']

# Define floor/level mappings based on room names
def get_level_for_room(room_name):
    room_lower = room_name.lower() if room_name else ""
    
    # Upper Level
    if any(x in room_lower for x in ['master', 'primary', 'guest suite', 'office 2nd', 'upstairs', 'upper']):
        if 'lower' not in room_lower:  # Exclude "Guest Bedroom (Lower)"
            return 'Upper Level'
    
    # Main Level
    if any(x in room_lower for x in ['living', 'dining', 'kitchen', 'hearth', 'entry', 'foyer', 'powder', 'grand room', 'main']):
        return 'Main Level'
    
    # Lower Level
    if any(x in room_lower for x in ['family', 'rec room', 'bar', 'gym', 'exercise', 'theater', 'wine', 'lower', 'basement', 'sauna']):
        return 'Lower Level'
    
    # Outdoor
    if any(x in room_lower for x in ['terrace', 'patio', 'deck', 'garden', 'pool', 'driveway', 'outdoor', 'backyard']):
        return 'Outdoor'
    
    # Garage/Storage
    if any(x in room_lower for x in ['garage', 'storage']):
        return 'Garage/Storage'
    
    # Various/Unassigned
    if any(x in room_lower for x in ['various', 'unassigned']):
        return 'Storage/Unassigned'
    
    # Whole Property
    if 'whole property' in room_lower:
        return 'Whole Property'
    
    return 'Unknown'

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
    level = get_level_for_room(room)
    
    if level not in inventory_by_level:
        level = 'Unknown'
    
    if room not in inventory_by_level[level]:
        inventory_by_level[level][room] = []
    
    inventory_by_level[level][room].append(item)

# Sort levels
level_order = ['Upper Level', 'Main Level', 'Lower Level', 'Outdoor', 'Garage/Storage', 'Storage/Unassigned', 'Whole Property', 'Unknown']

# Generate the report
print("=" * 140)
print("5470 S HIGHLINE CIRCLE - COMPLETE INVENTORY BY ROOM")
print("=" * 140)
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Total Items: {len(items)}")
print(f"Total Value: ${sum(item.get('value', 0) for item in items):,.2f}")
print("=" * 140)
print()

# Summary by level
print("SUMMARY BY LEVEL:")
print("-" * 40)
for level in level_order:
    if level in inventory_by_level and inventory_by_level[level]:
        total_items = sum(len(items) for items in inventory_by_level[level].values())
        total_value = sum(sum(item.get('value', 0) for item in items) for items in inventory_by_level[level].values())
        if total_items > 0:
            print(f"{level:25} | Items: {total_items:4} | Value: ${total_value:12,.2f}")
print()
print("=" * 140)

# Detailed listing by level and room
for level in level_order:
    if level not in inventory_by_level or not inventory_by_level[level]:
        continue
    
    # Skip empty levels
    if not any(inventory_by_level[level].values()):
        continue
    
    print()
    print(f"\n{'=' * 140}")
    print(f"{level.upper()}")
    print(f"{'=' * 140}")
    
    # Sort rooms alphabetically within each level
    for room in sorted(inventory_by_level[level].keys()):
        items_in_room = inventory_by_level[level][room]
        if not items_in_room:
            continue
            
        room_total = sum(item.get('value', 0) for item in items_in_room)
        
        print(f"\n{'-' * 140}")
        print(f"ROOM: {room} | Items: {len(items_in_room)} | Total Value: ${room_total:,.2f}")
        print(f"{'-' * 140}")
        print(f"{'Item Name':<55} | {'Price':>10} | {'Source':<18} | {'Verified':<8} | {'Brand':<22} | {'Decision':<8} | {'Notes':<20}")
        print(f"{'-' * 140}")
        
        # Sort items by value (highest first)
        for item in sorted(items_in_room, key=lambda x: x.get('value', 0), reverse=True):
            name = item.get('name', 'Unknown')[:54]
            price = item.get('value', 0)
            
            # Determine source
            source = item.get('valuation_source', 'Unknown')
            if item.get('is_verified'):
                source = "Invoice/Receipt"
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
            
            verified = "✓" if item.get('is_verified') else ""
            brand = item.get('brand', '')[:21] if item.get('brand') else ""
            decision = item.get('decision', 'Keep')[:7]
            
            # Build notes
            notes = []
            if price > 10000:
                notes.append("HIGH VALUE")
            elif price > 5000:
                notes.append("Valuable")
            
            # Add quantity if > 1
            qty = item.get('quantity', 1)
            if qty > 1:
                notes.append(f"Qty: {qty}")
            
            notes_str = ", ".join(notes)[:19]
            
            print(f"{name:<55} | ${price:>9,.2f} | {source:<18} | {verified:<8} | {brand:<22} | {decision:<8} | {notes_str:<20}")

print()
print("=" * 140)
print("LEGEND:")
print("  Source: Invoice/Receipt = Verified purchase | Designer Inv. = Designer inventory | Johnson Est. = Moving company estimate")
print("  Verified: ✓ = Has purchase receipt/invoice")
print("  Decision: Keep = Keep item | Sell = For sale | Unsure = Review needed")
print("  Notes: HIGH VALUE = >$10,000 | Valuable = >$5,000")
print("=" * 140)

# High-value items summary
print("\n" + "=" * 140)
print("HIGH-VALUE ITEMS (>$10,000) - FOR QUICK REVIEW")
print("=" * 140)
high_value = [item for item in items if item.get('value', 0) > 10000]
high_value.sort(key=lambda x: x.get('value', 0), reverse=True)

print(f"{'Item Name':<55} | {'Room':<25} | {'Price':>12} | {'Source':<18} | {'Brand':<22} | {'Decision':<8}")
print("-" * 140)
for item in high_value:
    name = item.get('name', 'Unknown')[:54]
    room = item.get('room', 'Unknown')[:24]
    price = item.get('value', 0)
    source = "Invoice/Receipt" if item.get('is_verified') else item.get('valuation_source', 'Estimate')[:17]
    brand = item.get('brand', '')[:21] if item.get('brand') else ""
    decision = item.get('decision', 'Keep')[:7]
    print(f"{name:<55} | {room:<25} | ${price:>11,.2f} | {source:<18} | {brand:<22} | {decision:<8}")

print()
print("=" * 140)
print("BRANDED ITEMS - FOR QUICK REVIEW")
print("=" * 140)
branded = [item for item in items if item.get('brand')]
branded.sort(key=lambda x: (x.get('brand', ''), -x.get('value', 0)))

current_brand = None
for item in branded:
    if item.get('brand') != current_brand:
        current_brand = item.get('brand')
        print(f"\n{current_brand}:")
        print("-" * 100)
    
    name = item.get('name', 'Unknown')[:54]
    room = item.get('room', 'Unknown')[:24]
    price = item.get('value', 0)
    decision = item.get('decision', 'Keep')[:7]
    verified = "✓" if item.get('is_verified') else " "
    print(f"  {verified} {name:<52} | {room:<24} | ${price:>10,.2f} | {decision:<8}")

print()
print("=" * 140)
print("END OF INVENTORY REPORT")
print("=" * 140)