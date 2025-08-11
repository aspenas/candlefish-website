#!/bin/bash
# Connection strings and secrets management for Candlefish AI Collaboration System
# This script configures all database connections and sets up secrets in Fly.io

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐠 Candlefish AI - Connection Configuration${NC}"
echo "=============================================="

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ Error: flyctl is not installed or not in PATH${NC}"
    echo "Please install flyctl: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

# Configuration variables
POSTGRES_APP="candlefish-postgres"
REDIS_APP="candlefish-redis"
API_APP="rtpm-api-candlefish"
POSTGRES_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

echo -e "${YELLOW}🔐 Setting up PostgreSQL secrets...${NC}"

# Set PostgreSQL secrets
flyctl secrets set \
    --app "$POSTGRES_APP" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    POSTGRES_USER="candlefish" \
    POSTGRES_DB="candlefish_collaboration" \
    POSTGRES_HOST="candlefish-postgres.internal" \
    POSTGRES_PORT="5432"

echo -e "${GREEN}✅ PostgreSQL secrets configured${NC}"

echo -e "${YELLOW}🔐 Setting up Redis secrets...${NC}"

# Set Redis secrets
flyctl secrets set \
    --app "$REDIS_APP" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    REDIS_HOST="candlefish-redis.internal" \
    REDIS_PORT="6379"

echo -e "${GREEN}✅ Redis secrets configured${NC}"

echo -e "${YELLOW}🔐 Setting up API application secrets...${NC}"

# Create connection strings
DATABASE_URL="postgresql://candlefish:${POSTGRES_PASSWORD}@candlefish-postgres.internal:5432/candlefish_collaboration?sslmode=require"
REDIS_URL="redis://:${REDIS_PASSWORD}@candlefish-redis.internal:6379/0"

# Set API application secrets
flyctl secrets set \
    --app "$API_APP" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    JWT_SECRET="$JWT_SECRET" \
    ENCRYPTION_KEY="$ENCRYPTION_KEY" \
    POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    REDIS_PASSWORD="$REDIS_PASSWORD" \
    DATABASE_HOST="candlefish-postgres.internal" \
    DATABASE_PORT="5432" \
    DATABASE_NAME="candlefish_collaboration" \
    DATABASE_USER="candlefish" \
    REDIS_HOST="candlefish-redis.internal" \
    REDIS_PORT="6379"

echo -e "${GREEN}✅ API application secrets configured${NC}"

# Store secrets locally for backup (these should be stored in a secure location)
SECRETS_DIR="/tmp/candlefish-secrets-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SECRETS_DIR"

cat > "$SECRETS_DIR/database-connections.env" << EOF
# Candlefish AI Database Connection Strings
# Generated on: $(date)
# WARNING: Keep these secrets secure and delete this file after copying to secure storage

# PostgreSQL Configuration
DATABASE_URL="$DATABASE_URL"
POSTGRES_HOST="candlefish-postgres.internal"
POSTGRES_PORT="5432"
POSTGRES_DB="candlefish_collaboration"
POSTGRES_USER="candlefish"
POSTGRES_PASSWORD="$POSTGRES_PASSWORD"

# Redis Configuration
REDIS_URL="$REDIS_URL"
REDIS_HOST="candlefish-redis.internal"
REDIS_PORT="6379"
REDIS_PASSWORD="$REDIS_PASSWORD"

# Application Secrets
JWT_SECRET="$JWT_SECRET"
ENCRYPTION_KEY="$ENCRYPTION_KEY"

# Connection Pool Settings (recommended)
DATABASE_POOL_SIZE="20"
DATABASE_MAX_OVERFLOW="10"
DATABASE_POOL_TIMEOUT="30"
DATABASE_POOL_RECYCLE="3600"

# Redis Connection Settings
REDIS_MAX_CONNECTIONS="50"
REDIS_CONNECTION_TIMEOUT="10"
REDIS_SOCKET_TIMEOUT="10"
REDIS_RETRY_ON_TIMEOUT="true"
EOF

# Create application-specific environment files
cat > "$SECRETS_DIR/rtpm-api.env" << EOF
# RTPM API Environment Configuration
DATABASE_URL="$DATABASE_URL"
REDIS_URL="$REDIS_URL"
JWT_SECRET="$JWT_SECRET"
ENCRYPTION_KEY="$ENCRYPTION_KEY"

# Feature flags
ENABLE_COLLABORATION="true"
ENABLE_REAL_TIME="true"
ENABLE_ANALYTICS="true"
ENABLE_INTEGRATIONS="true"

# Performance settings
MAX_QUERY_COMPLEXITY="1000"
QUERY_TIMEOUT="30"
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60"
EOF

# Create connection test script
cat > "$SECRETS_DIR/test-connections.sh" << EOF
#!/bin/bash
# Test database connections
set -e

echo "Testing PostgreSQL connection..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h candlefish-postgres.internal -p 5432 -U candlefish -d candlefish_collaboration -c "SELECT version();"

echo "Testing Redis connection..."
redis-cli -h candlefish-redis.internal -p 6379 -a "$REDIS_PASSWORD" ping

echo "All connections successful!"
EOF

chmod +x "$SECRETS_DIR/test-connections.sh"

# Create backup configuration
cat > "$SECRETS_DIR/backup-config.yml" << EOF
# Candlefish AI Backup Configuration
postgresql:
  host: candlefish-postgres.internal
  port: 5432
  database: candlefish_collaboration
  username: candlefish
  password: "$POSTGRES_PASSWORD"
  backup_schedule: "0 2 * * *"  # Daily at 2 AM
  retention_days: 30
  backup_location: "s3://candlefish-backups/postgresql/"

redis:
  host: candlefish-redis.internal
  port: 6379
  password: "$REDIS_PASSWORD"
  backup_schedule: "0 3 * * *"  # Daily at 3 AM
  retention_days: 7
  backup_location: "s3://candlefish-backups/redis/"
EOF

# Create monitoring configuration
cat > "$SECRETS_DIR/monitoring-config.yml" << EOF
# Candlefish AI Monitoring Configuration
databases:
  postgresql:
    connection: "$DATABASE_URL"
    metrics_interval: 30
    alerts:
      - connection_count > 80%
      - query_time > 5s
      - disk_usage > 85%

  redis:
    connection: "$REDIS_URL"
    metrics_interval: 15
    alerts:
      - memory_usage > 90%
      - connection_count > 80%
      - response_time > 100ms

healthchecks:
  - name: "database-connectivity"
    interval: "60s"
    timeout: "10s"

  - name: "redis-connectivity"
    interval: "30s"
    timeout: "5s"

  - name: "application-health"
    interval: "30s"
    timeout: "10s"
    url: "https://rtpm-api-candlefish.fly.dev/health"
EOF

# Create deployment scripts
cat > "$SECRETS_DIR/deploy-postgresql.sh" << 'EOF'
#!/bin/bash
set -e

echo "🐘 Deploying PostgreSQL to Fly.io..."

cd /Users/patricksmith/candlefish-ai/deployment/fly/postgresql

# Create the app if it doesn't exist
flyctl apps create candlefish-postgres --org personal || true

# Create volume for persistent data
flyctl volumes create postgres_data --app candlefish-postgres --region sjc --size 10 || true

# Deploy PostgreSQL
flyctl deploy --app candlefish-postgres

# Wait for deployment
flyctl status --app candlefish-postgres

echo "✅ PostgreSQL deployed successfully!"
EOF

cat > "$SECRETS_DIR/deploy-redis.sh" << 'EOF'
#!/bin/bash
set -e

echo "🔴 Deploying Redis to Fly.io..."

cd /Users/patricksmith/candlefish-ai/deployment/fly/redis

# Create the app if it doesn't exist
flyctl apps create candlefish-redis --org personal || true

# Create volume for persistent data
flyctl volumes create redis_data --app candlefish-redis --region sjc --size 2 || true

# Deploy Redis
flyctl deploy --app candlefish-redis

# Wait for deployment
flyctl status --app candlefish-redis

echo "✅ Redis deployed successfully!"
EOF

chmod +x "$SECRETS_DIR/deploy-postgresql.sh"
chmod +x "$SECRETS_DIR/deploy-redis.sh"

echo -e "${GREEN}🎉 Connection configuration completed!${NC}"
echo ""
echo "Configuration Details:"
echo "  PostgreSQL App: $POSTGRES_APP"
echo "  Redis App: $REDIS_APP"
echo "  API App: $API_APP"
echo ""
echo "Secret files created in: $SECRETS_DIR"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "1. Copy secrets to secure password manager"
echo "2. Delete local secret files after secure storage"
echo "3. Rotate passwords regularly"
echo "4. Monitor access logs"
echo ""
echo "Next Steps:"
echo "1. Deploy PostgreSQL: $SECRETS_DIR/deploy-postgresql.sh"
echo "2. Deploy Redis: $SECRETS_DIR/deploy-redis.sh"
echo "3. Initialize databases: run init scripts"
echo "4. Test connections: $SECRETS_DIR/test-connections.sh"
echo "5. Set up monitoring and backups"
echo ""
echo -e "${RED}🔒 Remember to delete: rm -rf $SECRETS_DIR${NC}"
