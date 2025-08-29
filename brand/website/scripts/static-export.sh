#!/bin/bash

# Static Export Script for Netlify
# This script temporarily moves problematic routes to allow static export

set -e

echo "🚀 Starting static export build..."

# Backup problematic directories
echo "📁 Backing up complex pages for static export..."

# Array of directories to temporarily move
PROBLEM_DIRS=("api" "dashboard" "alerts" "incidents" "analytics" "settings")

for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d "app/$dir" ]; then
        mv "app/$dir" ".${dir}_backup"
        echo "✅ Moved app/$dir to .${dir}_backup"
    fi
done

# Clean any existing .next build cache to ensure fresh build
echo "🧹 Cleaning build cache..."
rm -rf .next

# Run the static export
echo "🏗️ Building static export..."
NODE_ENV=production STATIC_EXPORT=true next build

# Restore all backed up directories
echo "🔄 Restoring all backed up directories..."
for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d ".${dir}_backup" ]; then
        mv ".${dir}_backup" "app/$dir"
        echo "✅ Restored app/$dir"
    fi
done

echo "✨ Static export completed successfully!"
echo "📦 Static files are available in the 'out' directory"