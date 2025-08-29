#!/bin/bash
set -e

echo "🏭 Building for production deployment..."
echo ""

# Run fixes first
./scripts/fix-production-issues.sh

# Run enhanced static export
./scripts/static-export-enhanced.sh

echo ""
echo "✅ Production build complete!"
echo "📁 Static files are in the 'out' directory"
echo ""
echo "To deploy to Netlify:"
echo "  1. Commit these changes"
echo "  2. Push to main branch"
echo "  3. Netlify will auto-deploy from the 'out' directory"
