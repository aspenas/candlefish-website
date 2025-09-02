#!/bin/bash
set -e

echo "🔧 Running database migration..."

# Get DATABASE_URL from environment or AWS secret
if [ -z "$DATABASE_URL" ]; then
    echo "Getting DATABASE_URL from AWS secrets..."
    export DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id "5470-inventory/database-url" --query "SecretString" --output text)
fi

echo "Database URL: ${DATABASE_URL//:*@*/:***@*}"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    echo "Database not ready (attempt $i/30)"
    sleep 2
done

# Check if tables exist
if psql "$DATABASE_URL" -c "SELECT 1 FROM items LIMIT 1;" >/dev/null 2>&1; then
    echo "✅ Database tables already exist, checking data..."
    ITEM_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM items;" | xargs)
    if [ "$ITEM_COUNT" -gt 0 ]; then
        echo "✅ Database contains $ITEM_COUNT items, migration complete"
        exit 0
    fi
fi

# Create schema
echo "🔧 Creating database schema..."
psql "$DATABASE_URL" -f /app/schema.sql

# Run data import if we have the script and data
if [ -f "/app/scripts/setup-production-db.py" ] && [ -f "/app/scripts/5470_furnishings_inventory.xlsx" ]; then
    echo "📥 Importing inventory data..."
    cd /app/scripts
    python3 setup-production-db.py
else
    echo "⚠️  Data import files not found, database schema created but no data imported"
fi

# Verify
ITEM_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM items;" | xargs)
TOTAL_VALUE=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE(SUM(purchase_price), 0) FROM items;" | xargs)

echo "✅ Migration complete!"
echo "   Items: $ITEM_COUNT"
echo "   Total Value: \$$(printf "%.2f" $TOTAL_VALUE)"
