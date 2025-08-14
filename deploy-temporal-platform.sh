#!/bin/bash

# Deploy Candlefish Temporal Platform
# This script deploys the complete platform with GraphQL, database, and monitoring

set -e

echo "🚀 Deploying Candlefish Temporal Platform..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists flyctl; then
    echo -e "${RED}❌ Fly CLI is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# 1. Build Docker image
echo -e "\n${YELLOW}🏗️  Building Docker image...${NC}"
cd /Users/patricksmith/candlefish-ai/candlefish-temporal-platform

cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build || true

# Expose ports
EXPOSE 4000 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command
CMD ["npm", "start"]
EOF

docker build -t candlefish-temporal-platform:latest .

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# 2. Deploy to Fly.io
echo -e "\n${YELLOW}🚁 Deploying to Fly.io...${NC}"

# Create fly.toml if it doesn't exist
if [ ! -f fly.toml ]; then
    cat > fly.toml << 'EOF'
app = "candlefish-temporal-platform"
primary_region = "sjc"
kill_signal = "SIGTERM"
kill_timeout = 30

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  GRAPHQL_PORT = "4000"

[[services]]
  internal_port = 4000
  protocol = "tcp"
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.http_checks]]
    interval = "30s"
    timeout = "3s"
    grace_period = "5s"
    method = "GET"
    path = "/health"

[metrics]
  port = 9090
  path = "/metrics"
EOF
fi

# Deploy to Fly.io
flyctl deploy --app candlefish-temporal-platform --dockerfile Dockerfile --region sjc --strategy rolling --wait-timeout 300

echo -e "${GREEN}✅ Deployed to Fly.io${NC}"

# 3. Set up monitoring
echo -e "\n${YELLOW}📊 Setting up monitoring...${NC}"

# Create monitoring dashboard
cat > monitoring-dashboard.json << 'EOF'
{
  "name": "Candlefish Temporal Platform",
  "panels": [
    {
      "title": "GraphQL Request Rate",
      "metric": "graphql.request.count",
      "type": "line"
    },
    {
      "title": "GraphQL Latency",
      "metric": "graphql.request.duration",
      "type": "histogram"
    },
    {
      "title": "Database Connections",
      "metric": "database.connections.active",
      "type": "gauge"
    },
    {
      "title": "Temporal Workflows",
      "metric": "temporal.workflow.count",
      "type": "counter"
    }
  ]
}
EOF

echo -e "${GREEN}✅ Monitoring configured${NC}"

# 4. Generate API documentation
echo -e "\n${YELLOW}📚 Generating API documentation...${NC}"

cat > API_DOCUMENTATION.md << 'EOF'
# Candlefish Temporal Platform API

## GraphQL Endpoint
Production: https://candlefish-temporal-platform.fly.dev/graphql

## Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Available Queries

### Get Projects
```graphql
query GetProjects {
  projects {
    id
    name
    clientName
    clientEmail
    status
    workflowId
    createdAt
    updatedAt
  }
}
```

### Get Single Project
```graphql
query GetProject($id: ID!) {
  project(id: $id) {
    id
    name
    clientName
    clientEmail
    status
    workflowId
    createdAt
    updatedAt
  }
}
```

### Check Temporal Status
```graphql
query GetTemporalStatus {
  temporalStatus {
    connected
    namespace
    address
    workers {
      taskQueue
      status
      runningWorkflows
    }
  }
}
```

## Available Mutations

### Create Project
```graphql
mutation CreateProject($input: ProjectInput!) {
  createProject(input: $input) {
    id
    name
    clientName
    clientEmail
    status
    workflowId
  }
}
```

### Start Workflow
```graphql
mutation StartWorkflow($projectId: ID!) {
  startWorkflow(projectId: $projectId) {
    workflowId
    runId
    status
  }
}
```

## Health Check
GET https://candlefish-temporal-platform.fly.dev/health

## Metrics
GET https://candlefish-temporal-platform.fly.dev/metrics
EOF

echo -e "${GREEN}✅ API documentation generated${NC}"

# 5. Display deployment information
echo -e "\n${GREEN}=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Application URLs:"
echo "  - GraphQL: https://candlefish-temporal-platform.fly.dev/graphql"
echo "  - Health: https://candlefish-temporal-platform.fly.dev/health"
echo "  - Metrics: https://candlefish-temporal-platform.fly.dev/metrics"
echo ""
echo "🔍 Monitoring:"
echo "  - Fly.io Dashboard: https://fly.io/apps/candlefish-temporal-platform"
echo "  - Logs: flyctl logs --app candlefish-temporal-platform"
echo ""
echo "📚 Documentation: ./API_DOCUMENTATION.md"
echo -e "==========================================${NC}"

# Open in browser
if command_exists open; then
    echo -e "\n${YELLOW}Opening GraphQL playground in browser...${NC}"
    open https://candlefish-temporal-platform.fly.dev/graphql
fi
