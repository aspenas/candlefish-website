#!/bin/bash
# Generate consistent lock files across all services
# Operational Design Atelier Standard: Precision in every build

set -euo pipefail

echo "🔧 Generating consistent lock files for all services..."

# Find all package.json files excluding unwanted directories
PACKAGE_FILES=$(find . -maxdepth 3 -name "package.json" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.next/*" \
  -not -path "*/ARCHIVE/*" \
  -not -path "*/venv/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" | sort)

TOTAL_COUNT=$(echo "$PACKAGE_FILES" | wc -l)
PROCESSED=0
FAILED=0

echo "📦 Found $TOTAL_COUNT package.json files to process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for PACKAGE_FILE in $PACKAGE_FILES; do
  DIR=$(dirname "$PACKAGE_FILE")
  PACKAGE_NAME=$(basename "$DIR")
  PROCESSED=$((PROCESSED + 1))
  
  echo -n "[$PROCESSED/$TOTAL_COUNT] Processing $PACKAGE_NAME... "
  
  # Check if lock file exists
  if [ -f "$DIR/package-lock.json" ] || [ -f "$DIR/yarn.lock" ] || [ -f "$DIR/pnpm-lock.yaml" ]; then
    echo "✅ Lock file exists"
    continue
  fi
  
  # Generate package-lock.json
  (cd "$DIR" && npm install --package-lock-only --legacy-peer-deps --silent 2>/dev/null) || {
    echo "⚠️  Failed to generate lock file"
    FAILED=$((FAILED + 1))
    continue
  }
  
  echo "✅ Generated package-lock.json"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "   • Total processed: $PROCESSED"
echo "   • Successful: $((PROCESSED - FAILED))"
echo "   • Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo "✅ All lock files generated successfully!"
else
  echo "⚠️  Some lock files failed. Review the output above."
fi