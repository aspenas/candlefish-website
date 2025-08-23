import pandas as pd
import numpy as np

# Read the Excel file
df = pd.read_excel("5470_furnishings_inventory.xlsx", sheet_name="Inventory (All Items)")

# Check price columns
print("=== Price Analysis ===")
print("Price columns in Excel:")
for col in df.columns:
    if "Price" in col or "price" in col or "$" in col:
        print(f"  {col}")
print()

# Analyze Price column
if "Price" in df.columns:
    print(f'Items with Price values: {df["Price"].notna().sum()} out of {len(df)}')
    print(f'Total from Price column: ${df["Price"].sum():,.2f}')
print()

# Analyze Designer Invoice Price
if "Price (Designer Invoice)" in df.columns:
    print(
        f'Items with Designer Invoice Price: {df["Price (Designer Invoice)"].notna().sum()} out of {len(df)}'
    )
    print(f'Total from Designer Invoice: ${df["Price (Designer Invoice)"].sum():,.2f}')
print()

# Check both price columns
price_col = df["Price"].fillna(0) if "Price" in df.columns else 0
designer_price_col = (
    df["Price (Designer Invoice)"].fillna(0) if "Price (Designer Invoice)" in df.columns else 0
)

# Use designer invoice price when available, otherwise use regular price
combined_prices = np.where(designer_price_col > 0, designer_price_col, price_col)
total_value = np.sum(combined_prices)

print("=== TOTAL VALUE ===")
print("Expected: $374,242.59")
print(f"Calculated from Excel: ${total_value:,.2f}")

# Check Bloom & Flourish sheet too
bloom_df = pd.read_excel("5470_furnishings_inventory.xlsx", sheet_name="Bloom & Flourish")
if "Line Total" in bloom_df.columns:
    bloom_total = bloom_df["Line Total"].sum()
    print(f"Bloom & Flourish total: ${bloom_total:,.2f}")
    print(f"Combined total: ${total_value + bloom_total:,.2f}")
