#!/bin/bash
# Install CLOS systemd service

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOS_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Configuration
SERVICE_NAME="clos"
SERVICE_FILE="${SCRIPT_DIR}/${SERVICE_NAME}.service"
INSTALL_PATH="/opt/candlefish/clos"
USER="candlefish"
GROUP="docker"

echo -e "${BLUE}Installing CLOS systemd service...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}" 
   exit 1
fi

# Create user if it doesn't exist
if ! id "$USER" &>/dev/null; then
    echo -e "${YELLOW}Creating user: $USER${NC}"
    useradd -r -s /bin/bash -G docker -d "$INSTALL_PATH" "$USER"
else
    echo -e "${GREEN}User $USER already exists${NC}"
    # Ensure user is in docker group
    usermod -a -G docker "$USER"
fi

# Create installation directory
echo -e "${YELLOW}Creating installation directory: $INSTALL_PATH${NC}"
mkdir -p "$INSTALL_PATH"

# Copy CLOS files to installation directory
echo -e "${YELLOW}Copying CLOS files...${NC}"
rsync -av --exclude='.git' --exclude='node_modules' --exclude='*.log' \
    "$CLOS_ROOT/" "$INSTALL_PATH/"

# Set ownership
echo -e "${YELLOW}Setting ownership...${NC}"
chown -R "$USER:$GROUP" "$INSTALL_PATH"

# Set permissions
chmod +x "$INSTALL_PATH/scripts/"*.sh
chmod +x "$INSTALL_PATH/clos"

# Install Docker and Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Copy systemd service file
echo -e "${YELLOW}Installing systemd service...${NC}"
cp "$SERVICE_FILE" "/etc/systemd/system/${SERVICE_NAME}.service"

# Reload systemd
echo -e "${YELLOW}Reloading systemd...${NC}"
systemctl daemon-reload

# Enable and start service
echo -e "${YELLOW}Enabling and starting service...${NC}"
systemctl enable "$SERVICE_NAME"

# Create environment file
echo -e "${YELLOW}Creating environment file...${NC}"
cat > "/etc/default/clos" << EOF
# CLOS Environment Configuration
CLOS_CONFIG_PATH=$INSTALL_PATH/.clos/config.yaml
CLOS_LOG_LEVEL=info
DOCKER_COMPOSE_PROFILES=core,monitoring

# Database passwords (change in production)
POSTGRES_PASSWORD=candlefish_prod_$(openssl rand -hex 16)
SECURITY_DB_PASSWORD=security_prod_$(openssl rand -hex 16)
PKB_DB_PASSWORD=pkb_prod_$(openssl rand -hex 16)
CANDLEFISH_DB_PASSWORD=candlefish_prod_$(openssl rand -hex 16)

# JWT secrets (change in production)
JWT_SECRET=jwt_prod_$(openssl rand -hex 32)
PKB_JWT_SECRET=pkb_jwt_prod_$(openssl rand -hex 32)
CANDLEFISH_JWT_SECRET=candlefish_jwt_prod_$(openssl rand -hex 32)

# Session secrets (change in production)
SESSION_SECRET=session_prod_$(openssl rand -hex 32)
PKB_SECRET_KEY=pkb_secret_prod_$(openssl rand -hex 32)
CANDLEFISH_SESSION_SECRET=candlefish_session_prod_$(openssl rand -hex 32)

# Redis passwords
RABBITMQ_PASSWORD=rabbitmq_prod_$(openssl rand -hex 16)

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=grafana_admin_$(openssl rand -hex 12)
PROMETHEUS_ADMIN_PASSWORD=prometheus_admin_$(openssl rand -hex 12)

# MinIO
MINIO_ACCESS_KEY=minio_access_$(openssl rand -hex 8)
MINIO_SECRET_KEY=minio_secret_$(openssl rand -hex 16)

# Elasticsearch
PKB_ELASTICSEARCH_PASSWORD=elastic_$(openssl rand -hex 16)
EOF

# Secure the environment file
chmod 600 "/etc/default/clos"
chown root:root "/etc/default/clos"

# Create log directory
mkdir -p /var/log/clos
chown "$USER:$GROUP" /var/log/clos

# Create systemd override directory for environment file
mkdir -p "/etc/systemd/system/${SERVICE_NAME}.service.d"
cat > "/etc/systemd/system/${SERVICE_NAME}.service.d/environment.conf" << EOF
[Service]
EnvironmentFile=/etc/default/clos
EOF

# Reload systemd again to pick up override
systemctl daemon-reload

echo -e "${GREEN}CLOS systemd service installed successfully!${NC}"
echo ""
echo -e "${BLUE}Service Management Commands:${NC}"
echo -e "  Start:   ${YELLOW}sudo systemctl start $SERVICE_NAME${NC}"
echo -e "  Stop:    ${YELLOW}sudo systemctl stop $SERVICE_NAME${NC}"
echo -e "  Restart: ${YELLOW}sudo systemctl restart $SERVICE_NAME${NC}"
echo -e "  Status:  ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
echo -e "  Logs:    ${YELLOW}sudo journalctl -u $SERVICE_NAME -f${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Install Path:    ${YELLOW}$INSTALL_PATH${NC}"
echo -e "  Config File:     ${YELLOW}$INSTALL_PATH/.clos/config.yaml${NC}"
echo -e "  Environment:     ${YELLOW}/etc/default/clos${NC}"
echo -e "  Service File:    ${YELLOW}/etc/systemd/system/${SERVICE_NAME}.service${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Review and customize ${YELLOW}/etc/default/clos${NC}"
echo -e "  2. Review and customize ${YELLOW}$INSTALL_PATH/.clos/config.yaml${NC}"
echo -e "  3. Start the service: ${YELLOW}sudo systemctl start $SERVICE_NAME${NC}"
echo -e "  4. Check status: ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
echo ""
echo -e "${GREEN}Installation completed!${NC}"