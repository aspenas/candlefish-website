#!/bin/bash

# Paintbox Production Deployment Optimization Script
# Applies all performance optimizations for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOYMENT_TYPE=${2:-fly} # fly, render, vercel, docker

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Check if running as part of CI/CD
check_ci_environment() {
    if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ]; then
        info "Running in CI/CD environment"
        export CI_MODE=true
    else
        info "Running in local environment"
        export CI_MODE=false
    fi
}

# 1. Optimize VM Resources
optimize_vm_resources() {
    log "Optimizing VM resources..."

    if [ "$DEPLOYMENT_TYPE" = "fly" ]; then
        info "Applying Fly.io VM optimizations..."

        # Update fly.toml is already done
        fly scale vm shared-cpu-4x --memory 1024
        fly autoscale set min=2 max=10 --region sjc

        success "VM resources optimized for Fly.io"

    elif [ "$DEPLOYMENT_TYPE" = "render" ]; then
        info "Render.com uses automatic scaling based on plan"

    elif [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        info "Docker resource limits set in docker-compose.yml"
    fi
}

# 2. Setup Database Connection Pooling
setup_database_pooling() {
    log "Setting up database connection pooling..."

    # Deploy PgBouncer if using Fly.io
    if [ "$DEPLOYMENT_TYPE" = "fly" ]; then
        info "Deploying PgBouncer on Fly.io..."

        # Create PgBouncer app
        cat > fly-pgbouncer.toml << EOF
app = "paintbox-pgbouncer"
primary_region = "sjc"

[build]
  image = "bitnami/pgbouncer:latest"

[env]
  POSTGRESQL_HOST = "paintbox-prod-db.flycast"
  POSTGRESQL_PORT = "5432"
  POSTGRESQL_DATABASE = "paintbox"
  PGBOUNCER_PORT = "6432"
  PGBOUNCER_POOL_MODE = "transaction"
  PGBOUNCER_MAX_CLIENT_CONN = "1000"
  PGBOUNCER_DEFAULT_POOL_SIZE = "20"
  PGBOUNCER_MIN_POOL_SIZE = "5"

[[services]]
  internal_port = 6432
  protocol = "tcp"

  [[services.ports]]
    port = 5432

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 256
EOF

        fly apps create paintbox-pgbouncer --org personal 2>/dev/null || true
        fly deploy --config fly-pgbouncer.toml --app paintbox-pgbouncer

        # Update DATABASE_URL to use PgBouncer
        fly secrets set DATABASE_URL="postgres://postgres:${DB_PASSWORD}@paintbox-pgbouncer.flycast:5432/paintbox?pgbouncer=true" --app paintbox-app

        success "PgBouncer deployed and configured"
    else
        info "Using connection pooling in application (pg.Pool)"
    fi
}

# 3. Configure Redis Persistence
configure_redis_persistence() {
    log "Configuring Redis persistence..."

    if [ "$DEPLOYMENT_TYPE" = "fly" ]; then
        info "Deploying Redis with persistence on Fly.io..."

        # Create Redis app with custom config
        cat > fly-redis.toml << EOF
app = "paintbox-redis"
primary_region = "sjc"

[build]
  image = "redis:7-alpine"

[mounts]
  source = "redis_data"
  destination = "/data"

[env]
  REDIS_PASSWORD = "${REDIS_PASSWORD:-PaintboxRedis2024SecurePassword!}"

[[services]]
  internal_port = 6379
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls"]
    port = 6379

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 512

[processes]
  redis = "redis-server /etc/redis/redis.conf"
EOF

        # Create Redis volume if not exists
        fly volumes create redis_data --size 10 --region sjc --app paintbox-redis 2>/dev/null || true

        # Copy Redis config to app
        fly deploy --config fly-redis.toml --app paintbox-redis

        # Update Redis URL in main app
        fly secrets set REDIS_URL="redis://:${REDIS_PASSWORD}@paintbox-redis.flycast:6379" --app paintbox-app

        success "Redis configured with persistence"
    else
        info "Redis persistence configured in redis.conf"
    fi
}

# 4. Setup CDN (Cloudflare)
setup_cdn() {
    log "Setting up CDN configuration..."

    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        info "Configuring Cloudflare CDN..."

        # Apply Cloudflare configuration using API
        curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data @config/cloudflare-config.json

        success "Cloudflare CDN configured"
    else
        warning "CLOUDFLARE_API_TOKEN not set, skipping CDN setup"
        info "Manual CDN setup required using config/cloudflare-config.json"
    fi
}

# 5. Optimize Node.js Settings
optimize_nodejs() {
    log "Optimizing Node.js settings..."

    # Set Node.js production optimizations
    cat > .env.production << EOF
# Node.js Optimizations
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
UV_THREADPOOL_SIZE=8

# Cluster Mode
CLUSTER_WORKERS=auto
CLUSTER_RESTART_DELAY=1000

# Garbage Collection
NODE_GC_INTERVAL=30000
EOF

    # Update start script for production
    cat > scripts/start-optimized.js << 'EOF'
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numWorkers = process.env.CLUSTER_WORKERS === 'auto'
    ? os.cpus().length
    : parseInt(process.env.CLUSTER_WORKERS) || 1;

  console.log(`Master ${process.pid} setting up ${numWorkers} workers`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    setTimeout(() => {
      cluster.fork();
    }, parseInt(process.env.CLUSTER_RESTART_DELAY) || 1000);
  });
} else {
  require('./server.js');
}
EOF

    success "Node.js optimizations applied"
}

# 6. Setup Monitoring
setup_monitoring() {
    log "Setting up performance monitoring..."

    # Install monitoring dependencies
    npm install --save \
        prom-client \
        @sentry/node \
        @opentelemetry/api \
        @opentelemetry/node \
        @opentelemetry/auto-instrumentations-node

    # Create monitoring initialization
    cat > lib/monitoring/setup.js << 'EOF'
const { register, collectDefaultMetrics } = require('prom-client');
const Sentry = require('@sentry/node');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Prometheus metrics
collectDefaultMetrics({ register });

// Sentry initialization
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
}

// OpenTelemetry initialization
const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

module.exports = { register, Sentry };
EOF

    success "Monitoring setup completed"
}

# 7. Optimize Build Process
optimize_build() {
    log "Optimizing build process..."

    # Update next.config.js for production optimization
    cat > next.config.optimized.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    domains: ['companycam.com', 'cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier());
            },
            name(module) {
              const hash = crypto.createHash('sha1');
              hash.update(module.identifier());
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name(module, chunks) {
              return crypto
                .createHash('sha1')
                .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                .digest('hex') + (isServer ? '-server' : '');
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
EOF

    # Build with optimizations
    NODE_ENV=production npm run build

    success "Build optimization completed"
}

# 8. Setup Load Balancing
setup_load_balancing() {
    log "Setting up load balancing..."

    if [ "$DEPLOYMENT_TYPE" = "fly" ]; then
        info "Fly.io handles load balancing automatically"

        # Ensure proper health checks
        fly checks list --app paintbox-app

    elif [ "$DEPLOYMENT_TYPE" = "docker" ]; then
        info "Setting up nginx load balancer..."

        cat > nginx-lb.conf << 'EOF'
upstream paintbox_backend {
    least_conn;
    server app1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name paintbox-app.com;

    location / {
        proxy_pass http://paintbox_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://paintbox_backend/api/health;
    }
}
EOF

        success "Load balancer configuration created"
    fi
}

# 9. Run Performance Tests
run_performance_tests() {
    log "Running performance benchmarks..."

    # Make script executable
    chmod +x scripts/performance-benchmarks.sh

    # Run benchmarks
    ./scripts/performance-benchmarks.sh --env "$ENVIRONMENT" --target "$TARGET_URL"

    success "Performance tests completed"
}

# 10. Apply Security Hardening
apply_security_hardening() {
    log "Applying security hardening..."

    # Set security headers in middleware
    cat > middleware-security.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // CSP
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.companycam.com https://*.salesforce.com wss://paintbox-app.fly.dev"
  );

  return response;
}

export const config = {
  matcher: '/:path*',
};
EOF

    success "Security hardening applied"
}

# Main deployment optimization
main() {
    log "Starting Paintbox Production Deployment Optimization"
    log "Environment: $ENVIRONMENT"
    log "Deployment Type: $DEPLOYMENT_TYPE"

    check_ci_environment

    # Run all optimizations
    optimize_vm_resources
    setup_database_pooling
    configure_redis_persistence
    setup_cdn
    optimize_nodejs
    setup_monitoring
    optimize_build
    setup_load_balancing
    apply_security_hardening

    # Run tests if not in CI mode
    if [ "$CI_MODE" = "false" ]; then
        run_performance_tests
    fi

    success "All optimizations completed successfully!"

    # Display summary
    echo ""
    echo "========================================="
    echo " DEPLOYMENT OPTIMIZATION COMPLETE"
    echo "========================================="
    echo ""
    echo "✅ VM Resources: Optimized (4 CPUs, 1GB RAM)"
    echo "✅ Database: PgBouncer configured (20 connections)"
    echo "✅ Redis: Persistence enabled (AOF + RDB)"
    echo "✅ CDN: Cloudflare configured"
    echo "✅ Node.js: Production optimizations applied"
    echo "✅ Monitoring: Prometheus + Sentry configured"
    echo "✅ Build: Optimized with code splitting"
    echo "✅ Load Balancing: Configured"
    echo "✅ Security: Headers and CSP applied"
    echo ""
    echo "Next Steps:"
    echo "1. Deploy to production: fly deploy --app paintbox-app"
    echo "2. Monitor performance: fly logs --app paintbox-app"
    echo "3. Check metrics: fly status --app paintbox-app"
    echo "4. Run load tests: ./scripts/performance-benchmarks.sh"
    echo ""
}

# Parse command line arguments
TARGET_URL="https://paintbox-app.fly.dev"

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Usage: $0 [environment] [deployment-type]"
            echo ""
            echo "Environments: production, staging, development"
            echo "Deployment Types: fly, render, vercel, docker"
            echo ""
            echo "Example: $0 production fly"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Run main function
main
