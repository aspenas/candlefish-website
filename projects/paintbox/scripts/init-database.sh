#!/bin/bash
# Initialize SQLite database for production
# Part of Eggshell - fixing in-memory database issue

set -e

DB_PATH="/data/eggshell.db"
DB_DIR="/data"
LOCAL_DB_PATH="./dev.db"

echo "🗄️  Initializing Eggshell database..."
echo "Environment: ${NODE_ENV:-development}"

# Determine database path based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Using production database path: $DB_PATH"
else
    DB_PATH="$LOCAL_DB_PATH"
    DB_DIR="."
    echo "Using local database path: $DB_PATH"
fi

# Create data directory if it doesn't exist
if [ ! -d "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
    mkdir -p "$DB_DIR"
    echo "✓ Created data directory: $DB_DIR"
fi

# Check if database exists
if [ -f "$DB_PATH" ]; then
    echo "✓ Database already exists: $DB_PATH"

    # Enable WAL mode if not already enabled
    if command -v sqlite3 &> /dev/null; then
        current_mode=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null || echo "unknown")
        if [ "$current_mode" != "wal" ]; then
            sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null || true
            echo "✓ WAL mode enabled (was: $current_mode)"
        else
            echo "✓ WAL mode already enabled"
        fi

        # Show database stats
        table_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "📊 Database contains $table_count tables"
    fi
else
    echo "Creating new database at $DB_PATH..."

    # Ensure Prisma schema is compatible
    if [ -f "prisma/schema.prisma" ]; then
        # Check if we need to switch provider
        current_provider=$(grep "provider =" prisma/schema.prisma | head -1 | cut -d'"' -f2)
        if [ "$current_provider" != "sqlite" ]; then
            echo "⚠️  Warning: Prisma schema uses provider '$current_provider', but we're using SQLite"
            echo "   You may need to update prisma/schema.prisma"
        fi
    fi

    # Run Prisma migrations
    if [ "$NODE_ENV" = "production" ]; then
        echo "Running production migrations..."
        npx prisma migrate deploy
    else
        echo "Running development migrations..."
        npx prisma migrate dev --name init
    fi
    echo "✓ Database created and migrations applied"
fi

# Set permissions (production only)
if [ "$NODE_ENV" = "production" ] && [ -f "$DB_PATH" ]; then
    chmod 644 "$DB_PATH" 2>/dev/null || true
    chmod 755 "$DB_DIR" 2>/dev/null || true
    echo "✓ Permissions set"
fi

# Create backup if in production
if [ "$NODE_ENV" = "production" ] && [ -f "$DB_PATH" ]; then
    BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_PATH" "$BACKUP_PATH" 2>/dev/null || true
    echo "✓ Backup created: $BACKUP_PATH"
fi

echo "✅ Database initialization complete!"
echo ""
echo "Database details:"
echo "  Path: $DB_PATH"
echo "  Journal mode: WAL"
echo "  Environment: ${NODE_ENV:-development}"

# Health check
if [ -f "$DB_PATH" ]; then
    size=$(du -h "$DB_PATH" | cut -f1)
    echo "  Size: $size"
else
    echo "  ⚠️  Warning: Database file not found after initialization"
    exit 1
fi
