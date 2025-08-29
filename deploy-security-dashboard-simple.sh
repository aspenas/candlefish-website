#!/bin/bash

echo "🚀 Deploying Security Dashboard (Simplified Version)"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}✓ Starting core services...${NC}"

# Create network if it doesn't exist
docker network create security-dashboard 2>/dev/null || true

# Deploy PostgreSQL with TimescaleDB
echo -e "${YELLOW}→ Starting PostgreSQL with TimescaleDB...${NC}"
docker run -d \
  --name security-postgres \
  --network security-dashboard \
  -e POSTGRES_DB=security_dashboard \
  -e POSTGRES_USER=dashboard_user \
  -e POSTGRES_PASSWORD=secure_password_2024 \
  -p 5433:5432 \
  --restart unless-stopped \
  timescale/timescaledb:latest-pg15 2>/dev/null || echo "PostgreSQL already running"

# Deploy Redis
echo -e "${YELLOW}→ Starting Redis cache...${NC}"
docker run -d \
  --name security-redis \
  --network security-dashboard \
  -p 6380:6379 \
  --restart unless-stopped \
  redis:7-alpine 2>/dev/null || echo "Redis already running"

# Deploy Neo4j
echo -e "${YELLOW}→ Starting Neo4j graph database...${NC}"
docker run -d \
  --name security-neo4j \
  --network security-dashboard \
  -e NEO4J_AUTH=neo4j/secure_password_2024 \
  -p 7475:7474 \
  -p 7688:7687 \
  --restart unless-stopped \
  neo4j:5.12 2>/dev/null || echo "Neo4j already running"

# Check services
echo -e "\n${GREEN}✓ Checking service status...${NC}"
sleep 5

echo -e "\n${GREEN}📊 Security Dashboard Services Status:${NC}"
echo "======================================"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "security-|NAMES"

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo "======================================"
echo "Services available at:"
echo "  • PostgreSQL: localhost:5433"
echo "  • Redis: localhost:6380"
echo "  • Neo4j: http://localhost:7475"
echo ""
echo "Default credentials:"
echo "  • PostgreSQL: dashboard_user / secure_password_2024"
echo "  • Neo4j: neo4j / secure_password_2024"
echo ""
echo "To stop services: docker stop security-postgres security-redis security-neo4j"
echo "To remove services: docker rm security-postgres security-redis security-neo4j"
