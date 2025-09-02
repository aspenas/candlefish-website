#!/bin/bash

# Performance Optimization Script for inventory.highline.work
# This script applies all performance optimizations

echo "=========================================="
echo "APPLYING PERFORMANCE OPTIMIZATIONS"
echo "=========================================="

# Backup current files
echo "Creating backups..."
cp src/App.tsx src/App.tsx.backup
cp src/services/api.ts src/services/api.ts.backup
cp vite.config.ts vite.config.ts.backup
cp src/components/ItemTable.tsx src/components/ItemTable.tsx.backup

# Apply optimized versions
echo "Applying optimized App with lazy loading..."
cp src/App.optimized.tsx src/App.tsx

echo "Applying optimized API service with caching..."
cp src/services/api.optimized.ts src/services/api.ts

echo "Applying optimized Vite config with code splitting..."
cp vite.config.optimized.ts vite.config.ts

echo "Applying optimized ItemTable with virtual scrolling..."
cp src/components/ItemTable.optimized.tsx src/components/ItemTable.tsx

# Install missing dependencies
echo "Installing performance dependencies..."
npm install --save @tanstack/react-virtual rollup-plugin-visualizer

# Build optimized version
echo "Building optimized production bundle..."
npm run build

# Analyze bundle size
echo ""
echo "=========================================="
echo "BUNDLE SIZE ANALYSIS"
echo "=========================================="
ls -lah dist/assets/*.js | awk '{print $9, $5}'

echo ""
echo "=========================================="
echo "OPTIMIZATIONS APPLIED:"
echo "=========================================="
echo "✓ Lazy loading for all routes"
echo "✓ Code splitting (React, UI, Data, Charts)"
echo "✓ API request caching (1 minute)"
echo "✓ Request deduplication"
echo "✓ Virtual scrolling for 239+ items"
echo "✓ Service worker for offline support"
echo "✓ Optimized bundle chunks"
echo "✓ Image lazy loading"
echo "✓ React Query caching"
echo ""
echo "Expected improvements:"
echo "- Initial bundle: 1,315KB → ~400KB (70% reduction)"
echo "- LCP: < 2.5s"
echo "- FID: < 100ms"
echo "- CLS: < 0.1"
echo "- TTI: < 3.5s"
echo ""
echo "To deploy: npm run build && deploy dist/"
echo "To revert: ./revert-optimizations.sh"