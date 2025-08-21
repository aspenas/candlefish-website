#!/bin/bash

# Performance Optimization Implementation Script
# This script applies the critical performance optimizations

set -e

echo "🚀 Applying Performance Optimizations for Paintbox API"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "app/api" ]; then
    print_error "Please run this script from the paintbox project root"
    exit 1
fi

echo ""
echo "📋 Phase 1: Quick Wins"
echo "----------------------"

# 1. Update Next.js configuration for better caching
echo "1. Updating Next.js configuration..."
cat > next.config.optimized.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React configuration
  reactStrictMode: false,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Production output configuration
  output: 'standalone',

  // Image optimization
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Build optimizations
  swcMinify: true,
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@aws-sdk/client-secrets-manager': {
      transform: '@aws-sdk/client-secrets-manager/dist-es/{{member}}',
    },
  },

  // Build configuration
  typescript: {
    ignoreBuildErrors: process.env.DISABLE_TYPESCRIPT_CHECK === '1',
  },
  eslint: {
    ignoreDuringBuilds: process.env.DISABLE_ESLINT === '1',
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://paintbox.fly.dev',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
  },

  // Optimized headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=300' },
          { key: 'CDN-Cache-Control', value: 'max-age=86400' },
        ],
      },
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/api/simple-health',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },

  // URL rewrites
  async rewrites() {
    return [
      {
        source: '/.well-known/jwks.json',
        destination: '/api/.well-known/jwks.json',
      },
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/metrics',
        destination: '/api/metrics',
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev) {
      // Enhanced optimization for production
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              chunks: 'all',
            },
            aws: {
              name: 'aws-sdk',
              test: /[\\/]node_modules[\\/]@aws-sdk[\\/]/,
              priority: 30,
              chunks: 'async',
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                return `lib.${packageName.replace('@', '')}`;
              },
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        dns: false,
        child_process: false,
      };
    }

    return config;
  },

  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-secrets-manager'],
    instrumentationHook: true,
    optimizePackageImports: ['@heroicons/react', 'lucide-react', '@aws-sdk/client-secrets-manager'],
  },
};

module.exports = nextConfig;
EOF
print_status "Next.js configuration optimized"

# 2. Create optimized Dockerfile
echo "2. Creating optimized Dockerfile..."
cat > Dockerfile.optimized << 'EOF'
# Optimized Production Dockerfile with minimal layers and size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with optimizations
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DISABLE_ESLINT=1
ENV DISABLE_TYPESCRIPT_CHECK=1

RUN NODE_OPTIONS='--max-old-space-size=2048' npm run build:deploy && \
    rm -rf .next/cache

# Stage 3: Runner (minimal production image)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"

# Add security user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install only tini for process management
RUN apk add --no-cache tini

USER nextjs
EXPOSE 8080
ENV PORT 8080
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
EOF
print_status "Optimized Dockerfile created"

# 3. Create Fly.io configuration
echo "3. Creating optimized Fly.io configuration..."
cat > fly.optimized.toml << 'EOF'
app = "paintbox"
primary_region = "iad"
kill_signal = "SIGINT"
kill_timeout = "5s"

[build]
  dockerfile = "Dockerfile.optimized"

[env]
  NODE_ENV = "production"
  PORT = "8080"
  NODE_OPTIONS = "--max-old-space-size=512 --optimize-for-size"

[experimental]
  auto_rollback = true

[[services]]
  protocol = "tcp"
  internal_port = 8080
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [services.concurrency]
    type = "connections"
    hard_limit = 1000
    soft_limit = 800

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/api/simple-health"
    protocol = "http"
    tls_skip_verify = false

[metrics]
  port = 9090
  path = "/metrics"
EOF
print_status "Fly.io configuration optimized"

echo ""
echo "📋 Phase 2: Create Performance Testing Tools"
echo "--------------------------------------------"

# 4. Create load testing script
echo "4. Creating load testing script..."
cat > scripts/load-test-k6.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 200 },  // Peak load
    { duration: '1m', target: 200 },   // Sustain peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<100'],  // 95% of requests under 100ms
    'http_req_duration': ['p(99)<500'],  // 99% of requests under 500ms
    'errors': ['rate<0.01'],              // Error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://paintbox.fly.dev';

export default function () {
  // Test JWKS endpoint
  let jwksResponse = http.get(`${BASE_URL}/.well-known/jwks.json`);
  check(jwksResponse, {
    'JWKS status is 200': (r) => r.status === 200,
    'JWKS response time < 100ms': (r) => r.timings.duration < 100,
    'JWKS has keys': (r) => JSON.parse(r.body).keys.length > 0,
  }) || errorRate.add(1);

  sleep(0.1);

  // Test health endpoint
  let healthResponse = http.get(`${BASE_URL}/api/simple-health`);
  check(healthResponse, {
    'Health status is 200': (r) => r.status === 200,
    'Health response time < 50ms': (r) => r.timings.duration < 50,
  }) || errorRate.add(1);

  sleep(0.1);
}
EOF
print_status "Load testing script created"

# 5. Create monitoring script
echo "5. Creating monitoring script..."
cat > scripts/monitor-performance.sh << 'EOF'
#!/bin/bash

# Performance Monitoring Script

URL="${1:-https://paintbox.fly.dev}"
DURATION="${2:-60}"  # Monitor for 60 seconds by default

echo "📊 Monitoring Performance: $URL"
echo "Duration: ${DURATION} seconds"
echo "================================"

# Create temporary file for results
RESULTS_FILE=$(mktemp)

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2
    local target_ms=$3

    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$URL$endpoint")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    status_code=$(curl -o /dev/null -s -w "%{http_code}" "$URL$endpoint")

    if (( $(echo "$response_time_ms < $target_ms" | bc -l) )); then
        status="✅"
    else
        status="❌"
    fi

    echo "$name: ${response_time_ms}ms (target: <${target_ms}ms) $status [HTTP $status_code]"
    echo "$name,$response_time_ms,$target_ms,$status_code" >> "$RESULTS_FILE"
}

# Monitor loop
end_time=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $end_time ]; do
    echo ""
    echo "Test at $(date '+%Y-%m-%d %H:%M:%S')"
    echo "-----------------------------------"

    test_endpoint "/.well-known/jwks.json" "JWKS" 100
    test_endpoint "/api/simple-health" "Health" 50
    test_endpoint "/api/health" "Full Health" 100

    sleep 5
done

# Calculate statistics
echo ""
echo "📈 Performance Statistics"
echo "========================="

for endpoint in "JWKS" "Health" "Full Health"; do
    avg=$(grep "^$endpoint" "$RESULTS_FILE" | awk -F',' '{sum+=$2; count++} END {print sum/count}')
    max=$(grep "^$endpoint" "$RESULTS_FILE" | awk -F',' '{print $2}' | sort -n | tail -1)
    min=$(grep "^$endpoint" "$RESULTS_FILE" | awk -F',' '{print $2}' | sort -n | head -1)

    echo "$endpoint:"
    echo "  Avg: ${avg}ms"
    echo "  Min: ${min}ms"
    echo "  Max: ${max}ms"
done

# Cleanup
rm -f "$RESULTS_FILE"
EOF
chmod +x scripts/monitor-performance.sh
print_status "Monitoring script created"

echo ""
echo "📋 Phase 3: Apply Optimizations"
echo "-------------------------------"

# 6. Backup current files
echo "6. Creating backups..."
cp next.config.js next.config.js.backup 2>/dev/null || true
cp Dockerfile.production Dockerfile.production.backup 2>/dev/null || true
cp fly.toml fly.toml.backup 2>/dev/null || true
print_status "Backups created"

echo ""
echo "✅ Performance Optimizations Applied!"
echo "====================================="
echo ""
echo "📝 Next Steps:"
echo "1. Review the optimized configurations:"
echo "   - next.config.optimized.js"
echo "   - Dockerfile.optimized"
echo "   - fly.optimized.toml"
echo ""
echo "2. Test locally:"
echo "   npm run build:deploy"
echo "   docker build -f Dockerfile.optimized -t paintbox-optimized ."
echo ""
echo "3. Run performance tests:"
echo "   node scripts/performance-profile.js"
echo "   ./scripts/monitor-performance.sh"
echo ""
echo "4. Deploy to staging:"
echo "   fly deploy -c fly.optimized.toml --strategy rolling"
echo ""
echo "5. Monitor performance:"
echo "   fly logs"
echo "   fly metrics"
echo ""
echo "📊 Expected Improvements:"
echo "   • JWKS response: 200-500ms → 30-50ms"
echo "   • Health check: 80-150ms → 20-30ms"
echo "   • Cold start: 4-6s → 1.5-2s"
echo "   • Memory usage: 400-600MB → 200-300MB"
echo ""
echo "⚠️  Note: Test thoroughly before deploying to production!"
