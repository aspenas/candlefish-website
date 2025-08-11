#!/bin/bash
# Verify Candlefish AI Database Deployment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐠 Candlefish AI - Database Deployment Verification${NC}"
echo "========================================================"

# Check PostgreSQL
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
POSTGRES_STATUS=$(flyctl status --app candlefish-postgres | grep "started" | wc -l)
if [ "$POSTGRES_STATUS" -eq 1 ]; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    exit 1
fi

# Test PostgreSQL connection
echo -e "${YELLOW}Testing PostgreSQL connection...${NC}"
POSTGRES_CONN_TEST=$(flyctl ssh console --app candlefish-postgres --command "pg_isready -h localhost -p 5432 -U candlefish" | grep "accepting connections" | wc -l)
if [ "$POSTGRES_CONN_TEST" -eq 1 ]; then
    echo -e "${GREEN}✅ PostgreSQL accepting connections${NC}"
else
    echo -e "${RED}❌ PostgreSQL connection test failed${NC}"
    exit 1
fi

# Check Redis
echo -e "${YELLOW}Checking Redis...${NC}"
REDIS_STATUS=$(flyctl status --app candlefish-redis | grep "started" | wc -l)
if [ "$REDIS_STATUS" -eq 1 ]; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running${NC}"
    exit 1
fi

# Test Redis connection
echo -e "${YELLOW}Testing Redis connection...${NC}"
REDIS_CONN_TEST=$(flyctl ssh console --app candlefish-redis --command "redis-cli ping" | grep "PONG" | wc -l)
if [ "$REDIS_CONN_TEST" -eq 1 ]; then
    echo -e "${GREEN}✅ Redis responding to ping${NC}"
else
    echo -e "${RED}❌ Redis connection test failed${NC}"
    exit 1
fi

# Check volumes
echo -e "${YELLOW}Checking volumes...${NC}"
POSTGRES_VOLUME=$(flyctl volumes list --app candlefish-postgres | grep "postgres_data" | wc -l)
REDIS_VOLUME=$(flyctl volumes list --app candlefish-redis | grep "redis_data" | wc -l)

if [ "$POSTGRES_VOLUME" -eq 1 ] && [ "$REDIS_VOLUME" -eq 1 ]; then
    echo -e "${GREEN}✅ All volumes are attached${NC}"
else
    echo -e "${RED}❌ Volume configuration issue${NC}"
    exit 1
fi

# Check secrets
echo -e "${YELLOW}Checking secrets configuration...${NC}"
POSTGRES_SECRETS=$(flyctl secrets list --app candlefish-postgres | grep "POSTGRES_PASSWORD" | wc -l)
REDIS_SECRETS=$(flyctl secrets list --app candlefish-redis | grep "REDIS_PASSWORD" | wc -l)

if [ "$POSTGRES_SECRETS" -eq 1 ] && [ "$REDIS_SECRETS" -eq 1 ]; then
    echo -e "${GREEN}✅ All secrets are configured${NC}"
else
    echo -e "${RED}❌ Secrets configuration issue${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All verification checks passed!${NC}"
echo ""
echo "Database Summary:"
echo "  📊 PostgreSQL: candlefish-postgres.internal:5432"
echo "  🔴 Redis: candlefish-redis.internal:6379"
echo "  💾 Total storage: 12GB (10GB + 2GB)"
echo "  💻 Total memory: 1.5GB (1GB + 512MB)"
echo ""
echo "Ready for application deployment!"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL and REDIS_URL in your app secrets"
echo "2. Initialize database schema"
echo "3. Deploy your application"
echo "4. Set up monitoring and alerts"
