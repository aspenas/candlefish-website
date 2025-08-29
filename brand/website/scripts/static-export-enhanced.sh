#!/bin/bash
set -e

echo "🚀 Enhanced static export for Netlify..."

# Backup problematic directories that can't be statically exported
PROBLEM_DIRS=("api" "dashboard" "alerts" "incidents" "analytics" "settings")

echo "📁 Temporarily moving dynamic routes..."
for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d "app/$dir" ]; then
        mv "app/$dir" ".${dir}_backup"
        echo "  Moved app/$dir"
    fi
done

# Clean build cache
echo "🧹 Cleaning build cache..."
rm -rf .next out

# Build with static export
echo "🏗️ Building static site..."
NODE_ENV=production STATIC_EXPORT=true npx next build

# Restore directories
echo "🔄 Restoring dynamic routes..."
for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d ".${dir}_backup" ]; then
        mv ".${dir}_backup" "app/$dir"
        echo "  Restored app/$dir"
    fi
done

# Add Netlify redirects
if [ -d "out" ]; then
  cat > out/_redirects << 'EOF'
/maturity-map /assessment 301
/workshop-notes /workshop 301
EOF
  echo "✅ Added Netlify redirects"
fi

echo "✨ Static export complete!"
