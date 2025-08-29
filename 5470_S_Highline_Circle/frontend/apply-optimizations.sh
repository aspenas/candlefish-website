#!/bin/bash

# IMMEDIATE PERFORMANCE OPTIMIZATIONS
# Apply the templates created by phase1-performance-fixes.sh

set -e

echo "🚀 APPLYING PERFORMANCE OPTIMIZATIONS"
echo "====================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. APPLY CODE SPLITTING (Highest Priority)
echo -e "${YELLOW}[1/5] Implementing React code splitting...${NC}"

# Create lazy routes utility
cat > src/utils/lazyRoutes.tsx << 'EOF'
import { lazy } from 'react';

// Lazy load all route components
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Inventory = lazy(() => import('../pages/Inventory'));
export const ItemDetail = lazy(() => import('../pages/ItemDetail'));
export const BuyerView = lazy(() => import('../pages/BuyerView'));
export const Analytics = lazy(() => import('../pages/Analytics'));
export const Insights = lazy(() => import('../pages/Insights'));
export const Settings = lazy(() => import('../pages/Settings'));
export const PhotoCapture = lazy(() => import('../pages/PhotoCapture'));
export const Collaboration = lazy(() => import('../pages/Collaboration'));
EOF

# Update App.tsx to use lazy loading
cat > src/App.lazy.tsx << 'EOF'
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PerformanceMonitor from './components/PerformanceMonitor';
import HashRedirect from './components/HashRedirect';
import * as LazyRoutes from './utils/lazyRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <HashRedirect />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={
                  <Layout>
                    <LazyRoutes.Dashboard />
                  </Layout>
                } />
                <Route path="/inventory" element={
                  <Layout>
                    <LazyRoutes.Inventory />
                  </Layout>
                } />
                <Route path="/item/:id" element={
                  <Layout>
                    <LazyRoutes.ItemDetail />
                  </Layout>
                } />
                <Route path="/buyer-view" element={
                  <Layout>
                    <LazyRoutes.BuyerView />
                  </Layout>
                } />
                <Route path="/analytics" element={
                  <Layout>
                    <LazyRoutes.Analytics />
                  </Layout>
                } />
                <Route path="/insights" element={
                  <Layout>
                    <LazyRoutes.Insights />
                  </Layout>
                } />
                <Route path="/settings" element={
                  <Layout>
                    <LazyRoutes.Settings />
                  </Layout>
                } />
                <Route path="/photos" element={
                  <Layout>
                    <LazyRoutes.PhotoCapture />
                  </Layout>
                } />
                <Route path="/collaboration" element={
                  <Layout>
                    <LazyRoutes.Collaboration />
                  </Layout>
                } />
              </Routes>
            </Suspense>
          </Router>
          <Toaster position="top-right" />
          <PerformanceMonitor />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
EOF

echo -e "${GREEN}✓ Code splitting template created${NC}"

# 2. OPTIMIZE RECHARTS IMPORTS
echo -e "${YELLOW}[2/5] Optimizing recharts imports for tree-shaking...${NC}"

# Find and fix recharts imports
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "from 'recharts'" "$file"; then
    echo "  Optimizing: $file"
    # Create optimized version
    sed -i.bak "s/from 'recharts'/from 'recharts\/lib\/index'/g" "$file"
  fi
done

echo -e "${GREEN}✓ Recharts imports optimized${NC}"

# 3. IMPLEMENT LRU CACHE
echo -e "${YELLOW}[3/5] Implementing LRU cache service...${NC}"

cat > src/services/cache.ts << 'EOF'
// LRU Cache implementation with size limits
class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>;
  private maxSize: number;
  private maxAge: number; // milliseconds

  constructor(maxSize = 1000, maxAge = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  set(key: string, value: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Delete the key first to ensure it's added at the end
    this.cache.delete(key);
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Replace unbounded caches with LRU cache
export const queryCache = new LRUCache(500, 5 * 60 * 1000);
export const apiCache = new LRUCache(200, 2 * 60 * 1000);
export const imageCache = new LRUCache(50, 10 * 60 * 1000);

export default LRUCache;
EOF

echo -e "${GREEN}✓ LRU cache service created${NC}"

# 4. CREATE PERFORMANCE MONITOR
echo -e "${YELLOW}[4/5] Creating performance monitoring service...${NC}"

cat > src/services/performanceMonitor.ts << 'EOF'
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  // Web Vitals
  measureWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
        this.recordMetric('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log('FID:', entry.processingStart - entry.startTime);
          this.recordMetric('fid', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        console.log('CLS:', cls);
        this.recordMetric('cls', cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics() {
    const result: Record<string, any> = {};
    this.metrics.forEach((values, name) => {
      result[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    return result;
  }

  // Bundle size check
  async checkBundleSize() {
    const response = await fetch('/assets/index.js', { method: 'HEAD' });
    const size = response.headers.get('content-length');
    if (size) {
      const sizeKB = parseInt(size) / 1024;
      console.log('Main bundle size:', sizeKB.toFixed(2), 'KB');
      this.recordMetric('bundleSize', sizeKB);
    }
  }

  // Memory usage
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      console.log('Memory usage:', usedMB.toFixed(2), 'MB');
      this.recordMetric('memoryUsage', usedMB);
    }
  }

  startMonitoring() {
    this.measureWebVitals();
    this.checkBundleSize();
    this.checkMemoryUsage();
    
    // Periodic checks
    setInterval(() => this.checkMemoryUsage(), 30000);
  }
}

export const performanceMonitor = new PerformanceMonitor();
EOF

echo -e "${GREEN}✓ Performance monitor created${NC}"

# 5. BUILD AND ANALYZE
echo -e "${YELLOW}[5/5] Building optimized bundle...${NC}"

# Backup current App.tsx
cp src/App.tsx src/App.original.tsx

# Test build with lazy loading
cp src/App.lazy.tsx src/App.tsx

# Build
npm run build

# Check new bundle size
echo ""
echo -e "${BLUE}Analyzing optimized bundle sizes...${NC}"
TOTAL_SIZE=$(find dist -name "*.js" -o -name "*.css" 2>/dev/null | xargs du -ch | grep total | awk '{print $1}')
echo "New bundle size: $TOTAL_SIZE"

# Detailed breakdown
echo ""
echo "Bundle breakdown:"
du -sh dist/assets/* | sort -hr | head -10

echo ""
echo "========================================"
echo -e "${GREEN}OPTIMIZATIONS APPLIED${NC}"
echo "========================================"
echo ""
echo "Applied optimizations:"
echo "✅ Code splitting with lazy loading"
echo "✅ Recharts tree-shaking optimization"
echo "✅ LRU cache implementation"
echo "✅ Performance monitoring service"
echo ""
echo "Next steps:"
echo "1. Test the application thoroughly"
echo "2. Deploy to staging for validation"
echo "3. Monitor performance metrics"
echo "4. Apply Go backend memory fixes"
echo ""
echo "To revert if needed:"
echo "  cp src/App.original.tsx src/App.tsx"
echo "  npm run build"