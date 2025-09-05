#!/bin/bash

# Simplified Candlefish AI Local Secrets Management Deployment
# Using curl for Vault API - No CLI dependencies

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Candlefish AI - Local Secrets Management Deployment (Curl)${NC}"
echo

# Check if Docker is running
if ! docker info &>/dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Create basic docker-compose configuration
echo -e "${BLUE}📝 Creating Docker Compose configuration...${NC}"

cat > docker-compose.local.yml <<'EOF'
version: '3.8'

services:
  vault:
    image: hashicorp/vault:latest
    container_name: candlefish-vault
    cap_add:
      - IPC_LOCK
    ports:
      - "8201:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: "candlefish-dev-token"
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
      VAULT_ADDR: "http://0.0.0.0:8200"
    command: vault server -dev -dev-root-token-id="candlefish-dev-token"
    networks:
      - candlefish-secrets

  redis:
    image: redis:7-alpine
    container_name: candlefish-redis
    ports:
      - "6380:6379"
    command: redis-server --requirepass JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd
    networks:
      - candlefish-secrets

  postgres:
    image: postgres:15-alpine
    container_name: candlefish-postgres
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: candlefish
      POSTGRES_USER: candlefish
      POSTGRES_PASSWORD: "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2"
    networks:
      - candlefish-secrets

networks:
  candlefish-secrets:
    driver: bridge
EOF

echo -e "${GREEN}✅ Docker Compose configuration created${NC}"

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose -f docker-compose.local.yml up -d

# Wait for services
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

# Check Vault health
echo -e "${BLUE}🔍 Checking Vault health...${NC}"
if curl -s http://localhost:8201/v1/sys/health > /dev/null; then
    echo -e "${GREEN}✅ Vault is running and healthy${NC}"
else
    echo -e "${RED}❌ Vault health check failed${NC}"
    exit 1
fi

# Initialize secrets in Vault using curl
echo -e "${BLUE}🔐 Initializing secrets via Vault API...${NC}"
VAULT_TOKEN="candlefish-dev-token"

# Enable KV secrets engine
echo -e "${BLUE}📦 Enabling KV secrets engine...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{"type": "kv-v2"}' \
    http://localhost:8201/v1/sys/mounts/secret || echo "KV engine might already be enabled"

# Wait a moment for the engine to be ready
sleep 2

# Add MongoDB secret
echo -e "${BLUE}🍃 Adding MongoDB secret...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "uri": "mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority",
        "username": "candlefish_admin_20250904",
        "password": "vr3UWJROhpYo511uDQu7IxyIMkauoH0k"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/mongodb/connection

# Add Smithery API secret
echo -e "${BLUE}🔧 Adding Smithery API secret...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "key": "55f3f737-0a09-49e8-a2f7-d1fd035bf7b7"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/api/smithery

# Add JWT secret
echo -e "${BLUE}🔐 Adding JWT secret...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "value": "5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/jwt/secret

# Add encryption key
echo -e "${BLUE}🔑 Adding encryption key...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "value": "A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/encryption/key

# Add PostgreSQL secret
echo -e "${BLUE}🐘 Adding PostgreSQL secret...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "value": "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/postgres/password

# Add Redis secret
echo -e "${BLUE}🔴 Adding Redis secret...${NC}"
curl -s -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    -d '{
      "data": {
        "value": "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd"
      }
    }' \
    http://localhost:8201/v1/secret/data/candlefish/redis/password

echo -e "${GREEN}✅ Secrets initialized in Vault${NC}"

# Create environment file
echo -e "${BLUE}📝 Creating environment configuration...${NC}"

cat > .env.local <<EOF
# Candlefish AI Local Secrets Management Configuration
VAULT_ADDR=http://localhost:8201
VAULT_TOKEN=candlefish-dev-token
REDIS_URL=redis://:JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd@localhost:6380
POSTGRES_URL=postgresql://candlefish:H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2@localhost:5433/candlefish

# Application Secrets
MONGODB_URI=mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority
SMITHERY_API_KEY=55f3f737-0a09-49e8-a2f7-d1fd035bf7b7
JWT_SECRET=5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf
ENCRYPTION_KEY=A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1

NODE_ENV=development
LOG_LEVEL=info
EOF

# Copy to project root
cp .env.local /Users/patricksmith/candlefish-ai/.env.local

echo -e "${GREEN}✅ Environment configuration created${NC}"

# Final health checks
echo -e "${BLUE}🏥 Running final health checks...${NC}"

# Test secret retrieval via API
if curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
    http://localhost:8201/v1/secret/data/candlefish/jwt/secret | jq -e '.data.data.value' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Secret retrieval test passed${NC}"
else
    echo -e "${YELLOW}⚠️  Secret retrieval test failed (might still be initializing)${NC}"
fi

# Test Redis
if redis-cli -h localhost -p 6380 -a "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd" ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis connectivity test passed${NC}"
else
    echo -e "${YELLOW}⚠️  Redis test failed (might still be starting)${NC}"
fi

echo
echo -e "${GREEN}🎉 Local Secrets Management Deployment Complete!${NC}"
echo
echo -e "${BLUE}Access Information:${NC}"
echo -e "  • Vault UI: http://localhost:8201/ui (token: candlefish-dev-token)"
echo -e "  • Redis: localhost:6380"
echo -e "  • PostgreSQL: localhost:5433"
echo -e "  • Environment: .env.local"
echo
echo -e "${BLUE}Test Commands:${NC}"
echo -e "  # Get secret via API:"
echo -e "  curl -H \"X-Vault-Token: candlefish-dev-token\" http://localhost:8201/v1/secret/data/candlefish/jwt/secret"
echo -e "  # Test Redis:"
echo -e "  redis-cli -h localhost -p 6380 -a \"JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd\" ping"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Open Vault UI and explore secrets"
echo -e "  2. Integrate SDK with applications"  
echo -e "  3. For AWS deployment, update credentials and run terraform"
echo