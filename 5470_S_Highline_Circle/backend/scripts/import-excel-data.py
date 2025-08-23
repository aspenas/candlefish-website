#!/usr/bin/env python3
"""
Import Excel inventory data into PostgreSQL database
"""

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://highline:rtpm_secure_password_123@localhost:5434/highline_inventory",
)


def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(DATABASE_URL)


def import_rooms(conn, df):
    """Import unique rooms from inventory"""
    cursor = conn.cursor()

    # Get unique rooms
    rooms = df["Room"].unique()

    # Map rooms to floors
    floor_mapping = {
        "Lower Level": ["Rec Room", "Wine Room", "Theater", "Exercise Room"],
        "Main Floor": [
            "Foyer",
            "Living Room",
            "Dining Room",
            "Kitchen",
            "Grand Room",
            "Hearth Room",
            "Office",
        ],
        "Upper Floor": ["Primary Bedroom", "Primary Bathroom", "Guest Bedroom", "Kids Room"],
        "Outdoor": ["Deck", "Patio", "Garden", "Pool Area", "Driveway"],
        "Garage": ["Garage"],
    }

    room_to_floor = {}
    for floor, room_list in floor_mapping.items():
        for room in room_list:
            room_to_floor[room] = floor

    # Insert rooms
    for room_name in rooms:
        if pd.notna(room_name):
            room_id = str(uuid.uuid4())
            floor = "Main Floor"  # Default

            # Determine floor based on room name
            for key in room_to_floor:
                if key.lower() in room_name.lower():
                    floor = room_to_floor[key]
                    break

            cursor.execute(
                """
                INSERT INTO rooms (id, name, floor, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE
                SET floor = EXCLUDED.floor
                RETURNING id
                """,
                (room_id, room_name, floor, datetime.now(), datetime.now()),
            )

    conn.commit()
    print(f"✓ Imported {len(rooms)} rooms")


def import_items(conn, inventory_df, bloom_df):
    """Import items from inventory sheets"""
    cursor = conn.cursor()

    # Get room ID mapping
    cursor.execute("SELECT id, name FROM rooms")
    room_map = {row[1]: row[0] for row in cursor.fetchall()}

    # Process main inventory
    items_imported = 0

    for _, row in inventory_df.iterrows():
        if pd.notna(row.get("Room")) and pd.notna(row.get("Item")):
            item_id = str(uuid.uuid4())
            room_id = room_map.get(row["Room"])

            if room_id:
                # Map Sell/Keep/Unsure to decision status
                decision_map = {"Keep": "Keep", "Sell": "Sell", "Unsure": "Unsure", "TBD": "Unsure"}
                decision = decision_map.get(row.get("Sell/Keep/Unsure", "Unsure"), "Unsure")

                # Map category to database enum (use exact enum values)
                category_map = {
                    "Rug / Carpet": "Rug / Carpet",
                    "Furniture": "Furniture",
                    "Plants (Bloom & Flourish)": "Plant (Indoor)",
                    "Art / Decor": "Art / Decor",
                    "Lighting": "Lighting",
                    "Other": "Other",
                    "Electronics": "Electronics",
                    "Plant (Indoor)": "Plant (Indoor)",
                    "Planter (Indoor)": "Planter (Indoor)",
                    "Planter Accessory (Subirrigation)": "Planter Accessory",
                    "Outdoor Planter/Plant": "Outdoor Planter/Plant",
                }
                category = category_map.get(row.get("Category", "Other"), "Other")

                # Use designer invoice price as the main price since that's where the data is
                price = (
                    row.get("Price (Designer Invoice)")
                    if pd.notna(row.get("Price (Designer Invoice)"))
                    else None
                )

                cursor.execute(
                    """
                    INSERT INTO items (
                        id, room_id, name, category, decision,
                        purchase_price, invoice_ref, designer_invoice_price,
                        is_fixture, source, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        item_id,
                        room_id,
                        row["Item"],
                        category,
                        decision,
                        price,  # Use designer invoice price as main price
                        row.get("Invoice Ref") if pd.notna(row.get("Invoice Ref")) else None,
                        price,  # Also store in designer_invoice_price field
                        bool(row.get("Fixture (Exclude)?", False)),
                        row.get("Source") if pd.notna(row.get("Source")) else None,
                        datetime.now(),
                        datetime.now(),
                    ),
                )
                items_imported += 1

    # Process Bloom & Flourish plants
    for _, row in bloom_df.iterrows():
        if pd.notna(row.get("Room")) and pd.notna(row.get("Plant/Planter")):
            item_id = str(uuid.uuid4())
            room_id = room_map.get(row["Room"])

            if room_id:
                # Determine category based on type
                category = (
                    "Plant (Indoor)"
                    if "Indoor" in str(row.get("Indoor/Outdoor", ""))
                    else "Outdoor Planter/Plant"
                )

                cursor.execute(
                    """
                    INSERT INTO items (
                        id, room_id, name, category, decision,
                        purchase_price, quantity, source, placement_notes,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        item_id,
                        room_id,
                        row["Plant/Planter"],
                        category,
                        "Sell",  # All B&F items marked for sale initially
                        row.get("Line Total", 0) / row.get("Qty", 1)
                        if row.get("Qty", 1) > 0
                        else row.get("Line Total", 0),
                        row.get("Qty", 1),
                        "Bloom & Flourish",
                        row.get("Placement") if pd.notna(row.get("Placement")) else None,
                        datetime.now(),
                        datetime.now(),
                    ),
                )

                # Add plant-specific data
                if "Plant" in category:
                    cursor.execute(
                        """
                        INSERT INTO plants (
                            id, item_id, plant_type, indoor_outdoor
                        ) VALUES (%s, %s, %s, %s)
                        """,
                        (
                            str(uuid.uuid4()),
                            item_id,
                            row["Plant/Planter"],
                            row.get("Indoor/Outdoor"),
                        ),
                    )

                items_imported += 1

    conn.commit()
    print(f"✓ Imported {items_imported} items")


def main():
    """Main import function"""
    print("Starting Excel data import...")

    # Read Excel file
    excel_file = "5470_furnishings_inventory.xlsx"

    print(f"Reading {excel_file}...")
    inventory_df = pd.read_excel(excel_file, sheet_name="Inventory (All Items)")
    bloom_df = pd.read_excel(excel_file, sheet_name="Bloom & Flourish")

    # Connect to database
    conn = connect_db()

    try:
        # Import data
        import_rooms(conn, inventory_df)
        # Only import main inventory items (239 items), skip Bloom & Flourish for now
        import_items(conn, inventory_df, pd.DataFrame())

        # Verify import
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT COUNT(*) as count FROM rooms")
        room_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM items")
        item_count = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN decision = 'Keep' THEN 1 ELSE 0 END) as keep_count,
                SUM(CASE WHEN decision = 'Sell' THEN 1 ELSE 0 END) as sell_count,
                SUM(CASE WHEN decision = 'Unsure' THEN 1 ELSE 0 END) as unsure_count,
                SUM(purchase_price) as total_value
            FROM items
        """)
        stats = cursor.fetchone()

        print("\n" + "=" * 50)
        print("Import Summary:")
        print(f"  Rooms: {room_count}")
        print(f"  Total Items: {item_count}")
        print(f"  Keep: {stats['keep_count']}")
        print(f"  Sell: {stats['sell_count']}")
        print(f"  Unsure: {stats['unsure_count']}")
        print(
            f"  Total Value: ${stats['total_value']:,.2f}"
            if stats["total_value"]
            else "  Total Value: N/A"
        )
        print("=" * 50)

        print("\n✅ Import completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during import: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
