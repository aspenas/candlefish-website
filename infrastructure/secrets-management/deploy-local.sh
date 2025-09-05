#!/bin/bash

# Candlefish AI Local Secrets Management Deployment
# Operational Design Atelier - Security as Craft (Local Development)

set -euo pipefail

# Color codes for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ______                ____     _____ _     __                     ║
║  / ____/___ _____  ____/ / /__  / __(_)____/ /_                    ║
║ / /   / __ `/ __ \/ __  / / _ \/ /_/ / ___/ __ \                   ║
║/ /___/ /_/ / / / / /_/ / /  __/ __/ (__  ) / / /                   ║
║\____/\__,_/_/ /_/\__,_/_/\___/_/ /_/____/_/ /_/                    ║
║                                                                      ║
║              LOCAL SECRETS MANAGEMENT DEPLOYMENT                    ║
║           Operational Design Atelier - Security as Craft            ║
║                     (Development Environment)                        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${SCRIPT_DIR}/logs/local_deployment_${TIMESTAMP}.log"
GENERATED_SECRETS_DIR="$HOME/.candlefish-secrets-20250904-212216"

# Create log directory
mkdir -p "${SCRIPT_DIR}/logs"

# Logging function
log() {
    echo -e "${2:-${NC}}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    local line_number=${1:-"unknown"}
    log "❌ Error occurred on line $line_number" "${RED}"
    log "📋 Check the log file: $LOG_FILE" "${YELLOW}"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Check prerequisites for local development
check_local_prerequisites() {
    log "📦 Checking local development prerequisites..." "${BLUE}"
    
    local missing_tools=()
    
    # Check required tools for local development
    for tool in docker docker-compose node npm; do
        if ! command -v $tool &>/dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log "❌ Missing required tools: ${missing_tools[*]}" "${RED}"
        log "   Please install missing tools and try again" "${YELLOW}"
        exit 1
    fi
    
    # Check Docker is running
    if ! docker info &>/dev/null; then
        log "❌ Docker is not running. Please start Docker Desktop." "${RED}"
        exit 1
    fi
    
    log "✅ All prerequisites met" "${GREEN}"
}

# Setup local HashiCorp Vault
setup_vault() {
    log "🔐 Setting up local HashiCorp Vault..." "${BLUE}"
    
    # Create Vault data directory
    mkdir -p "${SCRIPT_DIR}/data/vault"
    
    # Create Vault configuration
    cat > "${SCRIPT_DIR}/data/vault/config.hcl" <<EOF
ui = true
mlock = false

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}

api_addr = "http://127.0.0.1:8200"
cluster_addr = "http://127.0.0.1:8201"
EOF

    # Create Vault docker-compose configuration
    cat > "${SCRIPT_DIR}/docker-compose.local.yml" <<EOF
version: '3.8'

services:
  vault:
    image: vault:1.15.0
    container_name: candlefish-vault
    cap_add:
      - IPC_LOCK
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: "candlefish-dev-token"
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
      VAULT_ADDR: "http://0.0.0.0:8200"
    volumes:
      - ./data/vault:/vault/data
      - ./data/vault/config.hcl:/vault/config/config.hcl
    command: vault server -dev -dev-root-token-id="candlefish-dev-token"
    networks:
      - candlefish-secrets

  redis:
    image: redis:7-alpine
    container_name: candlefish-redis
    ports:
      - "6379:6379"
    environment:
      REDIS_PASSWORD: "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd"
    command: redis-server --requirepass JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd
    volumes:
      - redis_data:/data
    networks:
      - candlefish-secrets

  postgres:
    image: postgres:15-alpine
    container_name: candlefish-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: candlefish
      POSTGRES_USER: candlefish
      POSTGRES_PASSWORD: "H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - candlefish-secrets

  secrets-sdk:
    build:
      context: ./sdk/typescript
      dockerfile: Dockerfile.dev
    container_name: candlefish-secrets-sdk
    ports:
      - "3001:3001"
    environment:
      - VAULT_ADDR=http://vault:8200
      - VAULT_TOKEN=candlefish-dev-token
      - REDIS_URL=redis://:JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd@redis:6379
      - POSTGRES_URL=postgresql://candlefish:H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2@postgres:5432/candlefish
    depends_on:
      - vault
      - redis
      - postgres
    volumes:
      - ./sdk/typescript:/app
      - /app/node_modules
    networks:
      - candlefish-secrets

networks:
  candlefish-secrets:
    driver: bridge

volumes:
  redis_data:
  postgres_data:
EOF

    log "✅ Local Vault configuration created" "${GREEN}"
}

# Create SQL initialization script
create_sql_init() {
    log "📊 Creating database initialization script..." "${BLUE}"
    
    mkdir -p "${SCRIPT_DIR}/sql"
    
    cat > "${SCRIPT_DIR}/sql/init.sql" <<EOF
-- Candlefish AI Secrets Management Database Schema
-- Operational Design Atelier - Security as Craft

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit log table for security events
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    resource VARCHAR(500) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure')),
    metadata JSONB DEFAULT '{}',
    client_ip INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Secret metadata table
CREATE TABLE secret_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path VARCHAR(500) UNIQUE NOT NULL,
    classification VARCHAR(50) NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
    owner VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotation_schedule INTERVAL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Break-glass access log
CREATE TABLE break_glass_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    approvers TEXT[] NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    video_recorded BOOLEAN DEFAULT FALSE,
    session_recording_path VARCHAR(500)
);

-- Performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric VARCHAR(100) NOT NULL,
    path VARCHAR(500) NOT NULL,
    latency_ms INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_resource ON audit_log(resource);
CREATE INDEX idx_secret_metadata_path ON secret_metadata(path);
CREATE INDEX idx_secret_metadata_owner ON secret_metadata(owner);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_path ON performance_metrics(path);

-- Insert initial secret metadata
INSERT INTO secret_metadata (path, classification, owner, purpose, tags) VALUES
    ('candlefish/mongodb/connection', 'confidential', 'platform-team', 'Database connection for MongoDB', '{"type": "database", "service": "mongodb"}'),
    ('candlefish/api/smithery', 'confidential', 'platform-team', 'Smithery API key for external integrations', '{"type": "api_key", "service": "smithery"}'),
    ('candlefish/jwt/secret', 'restricted', 'security-team', 'JWT signing secret', '{"type": "crypto", "purpose": "auth"}'),
    ('candlefish/encryption/key', 'restricted', 'security-team', 'Master encryption key', '{"type": "crypto", "purpose": "encryption"}'),
    ('candlefish/postgres/password', 'confidential', 'platform-team', 'PostgreSQL database password', '{"type": "database", "service": "postgresql"}'),
    ('candlefish/redis/password', 'confidential', 'platform-team', 'Redis cache password', '{"type": "database", "service": "redis"}');

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action VARCHAR(100),
    p_actor VARCHAR(255),
    p_resource VARCHAR(500),
    p_result VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_log (action, actor, resource, result, metadata)
    VALUES (p_action, p_actor, p_resource, p_result, p_metadata)
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_metric(
    p_metric VARCHAR(100),
    p_path VARCHAR(500),
    p_latency_ms INTEGER,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO performance_metrics (metric, path, latency_ms, metadata)
    VALUES (p_metric, p_path, p_latency_ms, p_metadata)
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
EOF

    log "✅ Database initialization script created" "${GREEN}"
}

# Create SDK Dockerfile for development
create_sdk_dockerfile() {
    log "🐳 Creating SDK development container..." "${BLUE}"
    
    mkdir -p "${SCRIPT_DIR}/sdk/typescript"
    
    cat > "${SCRIPT_DIR}/sdk/typescript/Dockerfile.dev" <<EOF
FROM node:18-alpine

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start development server
CMD ["npm", "run", "dev"]
EOF

    # Create package.json for the SDK
    cat > "${SCRIPT_DIR}/sdk/typescript/package.json" <<EOF
{
  "name": "@candlefish/secrets-sdk",
  "version": "1.0.0",
  "description": "Candlefish AI Secrets Management SDK - Local Development",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "redis": "^4.6.8",
    "pg": "^8.11.3",
    "node-vault": "^0.10.2",
    "winston": "^3.10.0",
    "prometheus-client": "^15.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.5.0",
    "@types/pg": "^8.10.2",
    "typescript": "^5.1.6",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.6.2",
    "@types/jest": "^29.5.4",
    "eslint": "^8.47.0",
    "@typescript-eslint/parser": "^6.4.0",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "prettier": "^3.0.2"
  },
  "keywords": [
    "secrets-management",
    "vault",
    "security",
    "candlefish"
  ],
  "author": "Candlefish AI - Operational Design Atelier",
  "license": "PROPRIETARY"
}
EOF

    # Create TypeScript configuration
    cat > "${SCRIPT_DIR}/sdk/typescript/tsconfig.json" <<EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "resolveJsonModule": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
EOF

    log "✅ SDK development container configuration created" "${GREEN}"
}

# Create development server for SDK
create_sdk_server() {
    log "🚀 Creating SDK development server..." "${BLUE}"
    
    mkdir -p "${SCRIPT_DIR}/sdk/typescript/src"
    
    cat > "${SCRIPT_DIR}/sdk/typescript/src/server.ts" <<EOF
/**
 * Candlefish AI Secrets Management SDK - Development Server
 * Operational Design Atelier - Security as Craft
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { Client as PgClient } from 'pg';
import vault from 'node-vault';
import winston from 'winston';

const app = express();
const port = process.env.PORT || 3001;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configure clients
const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
  token: process.env.VAULT_TOKEN || 'candlefish-dev-token'
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://:JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd@redis:6379'
});

const pgClient = new PgClient({
  connectionString: process.env.POSTGRES_URL || 'postgresql://candlefish:H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2@postgres:5432/candlefish'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      vault: false,
      redis: false,
      postgres: false
    }
  };

  try {
    // Check Vault
    await vaultClient.read('sys/health');
    health.services.vault = true;
  } catch (error) {
    logger.warn('Vault health check failed:', error);
  }

  try {
    // Check Redis
    await redisClient.ping();
    health.services.redis = true;
  } catch (error) {
    logger.warn('Redis health check failed:', error);
  }

  try {
    // Check PostgreSQL
    await pgClient.query('SELECT 1');
    health.services.postgres = true;
  } catch (error) {
    logger.warn('PostgreSQL health check failed:', error);
  }

  const allHealthy = Object.values(health.services).every(status => status);
  health.status = allHealthy ? 'healthy' : 'degraded';

  res.status(allHealthy ? 200 : 503).json(health);
});

// Get secret endpoint
app.get('/api/v1/secrets/:path(*)', async (req, res) => {
  const secretPath = req.params.path;
  const startTime = Date.now();

  try {
    logger.info(\`Fetching secret: \${secretPath}\`);

    // Check cache first
    const cached = await redisClient.get(\`secret:\${secretPath}\`);
    if (cached) {
      await pgClient.query(
        'SELECT record_metric($1, $2, $3, $4)',
        ['cache_hit', secretPath, Date.now() - startTime, JSON.stringify({ cached: true })]
      );
      
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true
      });
    }

    // Fetch from Vault
    const secret = await vaultClient.read(\`secret/data/\${secretPath}\`);
    const secretValue = secret.data?.data;

    if (!secretValue) {
      throw new Error('Secret not found');
    }

    // Cache the result
    await redisClient.setEx(\`secret:\${secretPath}\`, 300, JSON.stringify(secretValue));

    // Log metrics
    await pgClient.query(
      'SELECT record_metric($1, $2, $3, $4)',
      ['secret_retrieved', secretPath, Date.now() - startTime, JSON.stringify({ vault: true })]
    );

    // Log audit event
    await pgClient.query(
      'SELECT log_audit_event($1, $2, $3, $4, $5)',
      ['get_secret', 'sdk-server', secretPath, 'success', JSON.stringify({ method: 'vault' })]
    );

    res.json({
      success: true,
      data: secretValue,
      cached: false
    });

  } catch (error) {
    logger.error(\`Error fetching secret \${secretPath}:\`, error);

    // Log audit event
    await pgClient.query(
      'SELECT log_audit_event($1, $2, $3, $4, $5)',
      ['get_secret', 'sdk-server', secretPath, 'failure', JSON.stringify({ error: error.message })]
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List secrets endpoint
app.get('/api/v1/secrets', async (req, res) => {
  try {
    const secrets = await vaultClient.list('secret/metadata');
    
    res.json({
      success: true,
      data: secrets.data?.keys || []
    });
  } catch (error) {
    logger.error('Error listing secrets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Audit log endpoint
app.get('/api/v1/audit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pgClient.query(
      'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize connections and start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Connect to PostgreSQL
    await pgClient.connect();
    logger.info('Connected to PostgreSQL');

    // Initialize Vault secrets
    await initializeVaultSecrets();

    // Start server
    app.listen(port, () => {
      logger.info(\`🚀 Candlefish Secrets SDK server running on port \${port}\`);
      logger.info(\`📊 Health check: http://localhost:\${port}/health\`);
      logger.info(\`🔐 API endpoint: http://localhost:\${port}/api/v1/secrets\`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize Vault with secrets
async function initializeVaultSecrets() {
  try {
    logger.info('Initializing Vault secrets...');

    const secrets = {
      'candlefish/mongodb/connection': {
        uri: 'mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority',
        username: 'candlefish_admin_20250904',
        password: 'vr3UWJROhpYo511uDQu7IxyIMkauoH0k'
      },
      'candlefish/api/smithery': {
        key: '55f3f737-0a09-49e8-a2f7-d1fd035bf7b7'
      },
      'candlefish/jwt/secret': {
        value: '5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf'
      },
      'candlefish/encryption/key': {
        value: 'A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1'
      },
      'candlefish/postgres/password': {
        value: 'H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2'
      },
      'candlefish/redis/password': {
        value: 'JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd'
      }
    };

    // Enable KV secrets engine
    try {
      await vaultClient.mount({
        mount_point: 'secret',
        type: 'kv',
        options: {
          version: '2'
        }
      });
    } catch (error) {
      // Ignore if already mounted
      logger.info('KV secrets engine already mounted');
    }

    // Write secrets to Vault
    for (const [path, value] of Object.entries(secrets)) {
      await vaultClient.write(\`secret/data/\${path}\`, { data: value });
      logger.info(\`Initialized secret: \${path}\`);
    }

    logger.info('✅ Vault secrets initialization complete');
  } catch (error) {
    logger.error('Failed to initialize Vault secrets:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  
  try {
    await redisClient.quit();
    await pgClient.end();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
EOF

    log "✅ SDK development server created" "${GREEN}"
}

# Deploy local infrastructure
deploy_local() {
    log "🚀 Deploying local secrets management infrastructure..." "${BLUE}"
    
    cd "$SCRIPT_DIR"
    
    # Stop any existing containers
    docker-compose -f docker-compose.local.yml down 2>/dev/null || true
    
    # Build and start containers
    docker-compose -f docker-compose.local.yml up -d
    
    # Wait for services to be ready
    log "⏳ Waiting for services to be ready..." "${YELLOW}"
    sleep 30
    
    # Check service health
    local vault_healthy=false
    local attempts=0
    while [[ $attempts -lt 12 ]]; do
        if curl -s http://localhost:8200/v1/sys/health >/dev/null; then
            vault_healthy=true
            break
        fi
        sleep 5
        attempts=$((attempts + 1))
    done
    
    if [[ "$vault_healthy" == "true" ]]; then
        log "✅ Vault is healthy and ready" "${GREEN}"
    else
        log "❌ Vault failed to start properly" "${RED}"
        return 1
    fi
    
    # Check SDK service
    if curl -s http://localhost:3001/health >/dev/null; then
        log "✅ SDK service is healthy and ready" "${GREEN}"
    else
        log "⚠️  SDK service is still starting up" "${YELLOW}"
    fi
    
    log "✅ Local infrastructure deployment complete" "${GREEN}"
}

# Create environment configuration
create_local_env() {
    log "📝 Creating local environment configuration..." "${BLUE}"
    
    # Create .env.local file for development
    cat > "${SCRIPT_DIR}/.env.local" <<EOF
# Candlefish AI Local Secrets Management Configuration
# Generated: $(date)

# Local Services
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=candlefish-dev-token
REDIS_URL=redis://:JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd@localhost:6379
POSTGRES_URL=postgresql://candlefish:H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2@localhost:5432/candlefish

# SDK Configuration
CANDLEFISH_SECRETS_ENDPOINT=http://localhost:3001
CANDLEFISH_SECRETS_MOCK_MODE=false
CANDLEFISH_SECRETS_CACHE_TTL=300

# Application Secrets (from generated credentials)
MONGODB_URI=mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority
SMITHERY_API_KEY=55f3f737-0a09-49e8-a2f7-d1fd035bf7b7
JWT_SECRET=5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf
ENCRYPTION_KEY=A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1

# Development Settings
NODE_ENV=development
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
ENABLE_PERFORMANCE_METRICS=true
EOF

    # Copy to project root for easy access
    cp "${SCRIPT_DIR}/.env.local" "/Users/patricksmith/candlefish-ai/.env.local"
    
    log "✅ Local environment configuration created" "${GREEN}"
    log "📋 Configuration files:" "${CYAN}"
    log "   • ${SCRIPT_DIR}/.env.local" "${CYAN}"
    log "   • /Users/patricksmith/candlefish-ai/.env.local" "${CYAN}"
}

# Run health checks
run_health_checks() {
    log "🏥 Running comprehensive health checks..." "${BLUE}"
    
    local checks_passed=0
    local total_checks=5
    
    # Check 1: Vault health
    if curl -s http://localhost:8200/v1/sys/health | jq -e '.sealed == false' >/dev/null 2>&1; then
        log "✅ Vault: Healthy and unsealed" "${GREEN}"
        checks_passed=$((checks_passed + 1))
    else
        log "❌ Vault: Not healthy or sealed" "${RED}"
    fi
    
    # Check 2: Redis connectivity
    if redis-cli -h localhost -p 6379 -a "JkFMSrJar9o5CiVwNwiHnQuAEMiE8Zhd" ping 2>/dev/null | grep -q "PONG"; then
        log "✅ Redis: Connected and responding" "${GREEN}"
        checks_passed=$((checks_passed + 1))
    else
        log "❌ Redis: Connection failed" "${RED}"
    fi
    
    # Check 3: PostgreSQL connectivity
    if PGPASSWORD="H1G4HpaTnkgYOuckzGToiG4SITJ8eRa2" psql -h localhost -U candlefish -d candlefish -c "SELECT 1;" >/dev/null 2>&1; then
        log "✅ PostgreSQL: Connected and responding" "${GREEN}"
        checks_passed=$((checks_passed + 1))
    else
        log "❌ PostgreSQL: Connection failed" "${RED}"
    fi
    
    # Check 4: SDK service health
    if curl -s http://localhost:3001/health | jq -e '.status == "healthy"' >/dev/null 2>&1; then
        log "✅ SDK Service: Healthy and responding" "${GREEN}"
        checks_passed=$((checks_passed + 1))
    else
        log "❌ SDK Service: Not healthy" "${RED}"
    fi
    
    # Check 5: Secret retrieval test
    if curl -s http://localhost:3001/api/v1/secrets/candlefish/jwt/secret | jq -e '.success == true' >/dev/null 2>&1; then
        log "✅ Secret Retrieval: Working correctly" "${GREEN}"
        checks_passed=$((checks_passed + 1))
    else
        log "❌ Secret Retrieval: Failed" "${RED}"
    fi
    
    log "📊 Health Check Summary: ${checks_passed}/${total_checks} passed" "${CYAN}"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        log "🎉 All health checks passed! System is ready." "${GREEN}"
        return 0
    else
        log "⚠️  Some health checks failed. Check logs for details." "${YELLOW}"
        return 1
    fi
}

# Generate deployment report
generate_report() {
    log "📚 Generating deployment report..." "${BLUE}"
    
    cat > "${SCRIPT_DIR}/LOCAL_DEPLOYMENT_REPORT_${TIMESTAMP}.md" <<EOF
# Candlefish AI Local Secrets Management Deployment Report

## Deployment Summary
- **Environment**: Local Development
- **Timestamp**: $(date)
- **Status**: Successfully Deployed
- **Components**: Vault, Redis, PostgreSQL, SDK Service

## Access Information

### Services
- **HashiCorp Vault UI**: http://localhost:8200/ui
  - Token: \`candlefish-dev-token\`
- **SDK API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Redis**: localhost:6379 (password protected)
- **PostgreSQL**: localhost:5432 (candlefish/candlefish)

### Configuration Files
- **Environment**: \`${SCRIPT_DIR}/.env.local\`
- **Docker Compose**: \`${SCRIPT_DIR}/docker-compose.local.yml\`
- **Vault Config**: \`${SCRIPT_DIR}/data/vault/config.hcl\`

## Secrets Initialized
- \`candlefish/mongodb/connection\` - MongoDB Atlas connection
- \`candlefish/api/smithery\` - Smithery API key
- \`candlefish/jwt/secret\` - JWT signing secret
- \`candlefish/encryption/key\` - Master encryption key
- \`candlefish/postgres/password\` - PostgreSQL password
- \`candlefish/redis/password\` - Redis password

## API Usage Examples

### Get a Secret
\`\`\`bash
curl http://localhost:3001/api/v1/secrets/candlefish/jwt/secret
\`\`\`

### List All Secrets
\`\`\`bash
curl http://localhost:3001/api/v1/secrets
\`\`\`

### View Audit Log
\`\`\`bash
curl http://localhost:3001/api/v1/audit
\`\`\`

## TypeScript SDK Usage

\`\`\`typescript
import { CandlefishSecrets } from '@candlefish/secrets-sdk';

const secrets = new CandlefishSecrets({
  vaultEndpoint: 'http://localhost:8200',
  environment: 'development',
  mockMode: false
});

// Get a secret
const jwtSecret = await secrets.get<string>('candlefish/jwt/secret');

// Get with auto-refresh
const dbConnection = await secrets.get('candlefish/mongodb/connection', {
  autoRefresh: true,
  duration: '1h'
});
\`\`\`

## Next Steps

### For Full AWS Deployment
1. **Create AWS IAM User**: candlefish-secrets-admin
2. **Update AWS Credentials**: Replace placeholders in generated secrets
3. **Run Terraform Deployment**:
   \`\`\`bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   \`\`\`

### Application Integration
1. **Install SDK**: \`npm install @candlefish/secrets-sdk\`
2. **Update Applications**: Replace hardcoded secrets with SDK calls
3. **Configure Environment**: Use \`.env.local\` for development

### Security Checklist
- [ ] Review all secrets in Vault UI
- [ ] Test break-glass procedures
- [ ] Verify audit logging is working
- [ ] Check performance metrics collection
- [ ] Test secret rotation functionality

## Monitoring and Maintenance

### Log Files
- **Deployment Log**: \`${LOG_FILE}\`
- **Container Logs**: \`docker-compose -f docker-compose.local.yml logs\`

### Maintenance Commands
\`\`\`bash
# Restart services
docker-compose -f docker-compose.local.yml restart

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop services
docker-compose -f docker-compose.local.yml down

# Clean up
docker-compose -f docker-compose.local.yml down -v
\`\`\`

## Support
- **Team**: Platform Engineering
- **Documentation**: ./docs/
- **Issues**: Create GitHub issue with [secrets] tag

---
*Candlefish AI - Operational Design Atelier*  
*Security as Craft - Local Development Environment*
EOF

    log "✅ Deployment report generated: LOCAL_DEPLOYMENT_REPORT_${TIMESTAMP}.md" "${GREEN}"
}

# Main execution flow
main() {
    log "🎯 Starting local secrets management deployment..." "${PURPLE}"
    
    check_local_prerequisites
    setup_vault
    create_sql_init
    create_sdk_dockerfile
    create_sdk_server
    deploy_local
    create_local_env
    
    # Give services time to fully initialize
    log "⏳ Allowing services to fully initialize..." "${YELLOW}"
    sleep 10
    
    run_health_checks
    generate_report
    
    log "🎉 Local deployment complete!" "${GREEN}"
    log "🔗 Access URLs:" "${CYAN}"
    log "   • Vault UI: http://localhost:8200/ui (token: candlefish-dev-token)" "${CYAN}"
    log "   • SDK API: http://localhost:3001" "${CYAN}"
    log "   • Health Check: http://localhost:3001/health" "${CYAN}"
    log "📊 Check the deployment report for full details" "${CYAN}"
}

# Run main function
main "$@"