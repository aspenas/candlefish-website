#!/bin/bash

# CLOS Complete Deployment Script
# Deploys all CLOS services and configurations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

CLOS_ROOT="/Users/patricksmith/candlefish-ai/clos"
LOG_FILE="$CLOS_ROOT/deployment.log"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Header
log "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
log "${CYAN}║${NC}${BOLD}         CLOS Complete Deployment - Automated Setup Script             ${NC}${CYAN}║${NC}"
log "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
log "Deployment started at: $(date)"

# Step 1: Pre-flight checks
log "\n${BLUE}Step 1: Pre-flight Checks${NC}"

# Check Docker
if ! docker info >/dev/null 2>&1; then
    log "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
else
    log "${GREEN}✓ Docker is running${NC}"
fi

# Check Docker Compose
if ! command -v docker-compose >/dev/null 2>&1; then
    log "${RED}✗ Docker Compose not found${NC}"
    exit 1
else
    log "${GREEN}✓ Docker Compose found${NC}"
fi

# Step 2: Stop conflicting services
log "\n${BLUE}Step 2: Stopping Conflicting Services${NC}"

CONFLICTING_CONTAINERS=(
    "pkb-postgres-local"
    "security-redis"
    "security-dashboard-frontend"
    "security-dashboard-backend"
)

for container in "${CONFLICTING_CONTAINERS[@]}"; do
    if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
        log "${YELLOW}Stopping $container...${NC}"
        docker stop "$container" >/dev/null 2>&1 || true
        docker rm "$container" >/dev/null 2>&1 || true
    fi
done

log "${GREEN}✓ Conflicting services stopped${NC}"

# Step 3: Create CLOS directories
log "\n${BLUE}Step 3: Creating CLOS Directories${NC}"

mkdir -p "$CLOS_ROOT/.clos"
mkdir -p "$CLOS_ROOT/logs"
mkdir -p "$CLOS_ROOT/data"

log "${GREEN}✓ Directories created${NC}"

# Step 4: Initialize SQLite registry
log "\n${BLUE}Step 4: Initializing Service Registry${NC}"

if [ ! -f "$CLOS_ROOT/.clos/registry.db" ]; then
    sqlite3 "$CLOS_ROOT/.clos/registry.db" <<EOF
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    port INTEGER NOT NULL,
    group_name TEXT,
    status TEXT DEFAULT 'stopped',
    started_at DATETIME,
    health_check_url TEXT,
    container_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_port ON services(port);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_group ON services(group_name);

-- Insert default services
INSERT OR IGNORE INTO services (name, port, group_name, health_check_url)
VALUES 
    ('postgres', 5432, 'core', NULL),
    ('redis', 6379, 'core', NULL),
    ('caddy', 80, 'core', 'http://localhost:2019/config/'),
    ('candlefish-web', 3000, 'candlefish', 'http://localhost:3000/api/health'),
    ('candlefish-api', 4000, 'candlefish', 'http://localhost:4000/health'),
    ('security-dashboard', 3100, 'security', 'http://localhost:3100/health'),
    ('security-api', 4100, 'security', 'http://localhost:4100/health'),
    ('pkb-ui', 8501, 'pkb', 'http://localhost:8501/_stcore/health'),
    ('pkb-api', 8787, 'pkb', 'http://localhost:8787/health');
EOF
    log "${GREEN}✓ Registry database initialized${NC}"
else
    log "${GREEN}✓ Registry database exists${NC}"
fi

# Step 5: Deploy core infrastructure
log "\n${BLUE}Step 5: Deploying Core Infrastructure${NC}"

cd "$CLOS_ROOT"

# Create network if not exists
if ! docker network ls | grep -q "clos-network"; then
    docker network create clos-network
    log "${GREEN}✓ Docker network created${NC}"
fi

# Start essential services
log "${CYAN}Starting essential services...${NC}"
docker-compose -f deployment/docker-compose.essential.yml up -d

# Wait for services to be healthy
log "${CYAN}Waiting for services to be healthy...${NC}"
sleep 5

# Check health
SERVICES_HEALTHY=true
for container in clos-postgres clos-redis clos-caddy; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        log "${GREEN}✓ $container is running${NC}"
    else
        log "${RED}✗ $container failed to start${NC}"
        SERVICES_HEALTHY=false
    fi
done

if [ "$SERVICES_HEALTHY" = false ]; then
    log "${RED}Some services failed to start. Check logs with: docker-compose -f deployment/docker-compose.essential.yml logs${NC}"
    exit 1
fi

# Step 6: Configure local domains
log "\n${BLUE}Step 6: Configuring Local Domains${NC}"

HOSTS_ENTRY="127.0.0.1 security.local pkb.local candlefish.local grafana.local prometheus.local dashboard.local"

if ! grep -q "security.local" /etc/hosts; then
    log "${YELLOW}Adding local domains to /etc/hosts (requires sudo)${NC}"
    echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts >/dev/null
    log "${GREEN}✓ Local domains configured${NC}"
else
    log "${GREEN}✓ Local domains already configured${NC}"
fi

# Step 7: Setup shell integration
log "\n${BLUE}Step 7: Setting Up Shell Integration${NC}"

SHELL_RC="$HOME/.zshrc"
if [ -f "$HOME/.bashrc" ] && [ ! -f "$SHELL_RC" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if ! grep -q "clos/scripts/shell-integration.sh" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# CLOS Shell Integration" >> "$SHELL_RC"
    echo "source $CLOS_ROOT/scripts/shell-integration.sh" >> "$SHELL_RC"
    log "${GREEN}✓ Shell integration added to $SHELL_RC${NC}"
else
    log "${GREEN}✓ Shell integration already configured${NC}"
fi

# Step 8: Create SystemD service (optional)
log "\n${BLUE}Step 8: SystemD Service (Optional)${NC}"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -d "/etc/systemd/system" ]; then
        log "${YELLOW}Would you like to install CLOS as a system service for auto-start? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" ]]; then
            sudo cp "$CLOS_ROOT/scripts/systemd/clos.service" /etc/systemd/system/
            sudo systemctl daemon-reload
            sudo systemctl enable clos
            log "${GREEN}✓ SystemD service installed${NC}"
        fi
    fi
else
    log "${YELLOW}SystemD not available on this platform (macOS)${NC}"
fi

# Step 9: Verification
log "\n${BLUE}Step 9: Running Verification${NC}"

if [ -x "$CLOS_ROOT/scripts/verify-clos.sh" ]; then
    "$CLOS_ROOT/scripts/verify-clos.sh"
fi

# Step 10: Summary
log "\n${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
log "${CYAN}║${NC}${BOLD}                    CLOS Deployment Complete!                          ${NC}${CYAN}║${NC}"
log "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"

log "\n${GREEN}✅ Core Services Running:${NC}"
log "  • PostgreSQL: http://localhost:5432"
log "  • Redis: http://localhost:6379"
log "  • Caddy: http://localhost (status page)"

log "\n${GREEN}✅ Local Domains Configured:${NC}"
log "  • http://security.local - Security Dashboard"
log "  • http://pkb.local - Personal Knowledge Base"
log "  • http://candlefish.local - Candlefish Main"
log "  • http://dashboard.local - CLOS Dashboard"

log "\n${GREEN}✅ Available Commands:${NC}"
log "  ${CYAN}clos status${NC}              - Check service status"
log "  ${CYAN}clos up security${NC}         - Start security dashboard"
log "  ${CYAN}clos up pkb${NC}              - Start PKB services"
log "  ${CYAN}clos up candlefish${NC}       - Start Candlefish services"
log "  ${CYAN}clos up all${NC}              - Start all services"
log "  ${CYAN}clos logs -f${NC}             - Follow service logs"
log "  ${CYAN}$CLOS_ROOT/scripts/monitor-clos.sh${NC} - Real-time monitoring"

log "\n${MAGENTA}Next Steps:${NC}"
log "  1. Source your shell: ${CYAN}source $SHELL_RC${NC}"
log "  2. Start monitoring: ${CYAN}$CLOS_ROOT/scripts/monitor-clos.sh${NC}"
log "  3. Deploy services: ${CYAN}clos up all${NC}"

log "\n${BLUE}Full deployment log saved to: $LOG_FILE${NC}"