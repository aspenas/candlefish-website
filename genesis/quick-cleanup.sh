#!/bin/bash
# Quick Candlefish Cleanup Script - Immediate optimizations

echo "🧹 CANDLEFISH QUICK CLEANUP"
echo "=========================="

CANDLEFISH_ROOT="/Users/patricksmith/candlefish-ai"
cd "$CANDLEFISH_ROOT"

# Check initial size
echo "📊 Initial size:"
du -sh .

# Clean Python caches (safe to remove)
echo -e "\n🐍 Cleaning Python caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
echo "✅ Python caches cleaned"

# Clean npm/yarn caches (safe to remove)
echo -e "\n📦 Cleaning npm caches..."
rm -rf ~/.npm/_cacache 2>/dev/null
rm -rf ./.npm 2>/dev/null
rm -rf ./.yarn/cache 2>/dev/null
echo "✅ npm caches cleaned"

# Remove .DS_Store files (Mac specific)
echo -e "\n🍎 Removing .DS_Store files..."
find . -name ".DS_Store" -delete 2>/dev/null
echo "✅ .DS_Store files removed"

# Clean old log files
echo -e "\n📝 Cleaning old logs..."
find . -name "*.log" -mtime +30 -delete 2>/dev/null
find . -name "npm-debug.log*" -delete 2>/dev/null
echo "✅ Old logs cleaned"

# Remove empty directories
echo -e "\n📁 Removing empty directories..."
find . -type d -empty -delete 2>/dev/null
echo "✅ Empty directories removed"

# Final size
echo -e "\n📊 Final size:"
du -sh .

echo -e "\n✅ Quick cleanup complete!"
echo "Note: Run 'npm install' in project directories if needed"