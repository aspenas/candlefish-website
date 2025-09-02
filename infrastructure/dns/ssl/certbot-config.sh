#!/bin/bash
# Let's Encrypt SSL certificate management for candlefish.ai subdomains

set -euo pipefail

# Configuration
DOMAIN="candlefish.ai"
SUBDOMAINS=("api" "analytics" "router" "monitor" "config")
EMAIL="admin@candlefish.ai"
WEBROOT_PATH="/var/www/certbot"
RENEWAL_HOOK_PATH="/etc/letsencrypt/renewal-hooks/deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Install certbot if not present
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        if [[ -f /etc/redhat-release ]]; then
            dnf install -y certbot python3-certbot-nginx
        elif [[ -f /etc/debian_version ]]; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        else
            error "Unsupported operating system"
        fi
    else
        log "Certbot is already installed"
    fi
}

# Create webroot directory
setup_webroot() {
    log "Setting up webroot directory..."
    mkdir -p "$WEBROOT_PATH"
    chown -R nginx:nginx "$WEBROOT_PATH" 2>/dev/null || chown -R www-data:www-data "$WEBROOT_PATH" 2>/dev/null || true
    chmod 755 "$WEBROOT_PATH"
}

# Generate domain list for certificate
generate_domain_list() {
    local domain_args=""
    domain_args="-d $DOMAIN -d www.$DOMAIN"
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        domain_args="$domain_args -d $subdomain.$DOMAIN"
    done
    
    echo "$domain_args"
}

# Request initial certificate
request_certificate() {
    log "Requesting SSL certificate for $DOMAIN and subdomains..."
    
    local domain_args
    domain_args=$(generate_domain_list)
    
    # Check if certificate already exists
    if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        warn "Certificate for $DOMAIN already exists. Use renew_certificate() to renew."
        return 0
    fi
    
    # Request certificate using webroot method
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT_PATH" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --expand \
        $domain_args || error "Failed to request certificate"
    
    log "Certificate successfully requested!"
}

# Renew certificate
renew_certificate() {
    log "Renewing SSL certificates..."
    
    certbot renew --quiet || error "Failed to renew certificates"
    
    log "Certificates renewed successfully!"
}

# Setup automatic renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal hook script
    mkdir -p "$RENEWAL_HOOK_PATH"
    
    cat > "$RENEWAL_HOOK_PATH/reload-nginx.sh" << 'EOF'
#!/bin/bash
# Reload nginx after certificate renewal

systemctl reload nginx || service nginx reload
echo "$(date): Nginx reloaded after certificate renewal" >> /var/log/letsencrypt/renewal.log
EOF
    
    chmod +x "$RENEWAL_HOOK_PATH/reload-nginx.sh"
    
    # Setup cron job for renewal (runs twice daily)
    local cron_job="0 */12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx"
    
    # Check if cron job already exists
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        log "Cron job for certificate renewal added"
    else
        log "Cron job for certificate renewal already exists"
    fi
}

# Test certificate configuration
test_certificate() {
    log "Testing SSL certificate configuration..."
    
    for subdomain in "${SUBDOMAINS[@]}"; do
        local test_url="https://$subdomain.$DOMAIN"
        if curl -s --head --fail "$test_url" >/dev/null 2>&1; then
            log "✓ $test_url is accessible"
        else
            warn "✗ $test_url is not accessible"
        fi
    done
}

# Backup certificates
backup_certificates() {
    log "Backing up SSL certificates..."
    
    local backup_dir="/backup/letsencrypt-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$(dirname "$backup_dir")"
    
    if [[ -d "/etc/letsencrypt" ]]; then
        cp -r /etc/letsencrypt "$backup_dir"
        log "Certificates backed up to $backup_dir"
    else
        warn "No certificates found to backup"
    fi
}

# Show certificate information
show_cert_info() {
    log "Certificate information:"
    
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]]; then
        openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:)"
    else
        warn "No certificate found for $DOMAIN"
    fi
}

# Force renewal (for testing)
force_renewal() {
    log "Forcing certificate renewal..."
    
    certbot renew --force-renewal || error "Failed to force renewal"
    systemctl reload nginx || service nginx reload
    
    log "Forced renewal completed!"
}

# Main function
main() {
    case "${1:-setup}" in
        "setup")
            check_root
            install_certbot
            setup_webroot
            request_certificate
            setup_auto_renewal
            test_certificate
            show_cert_info
            ;;
        "renew")
            check_root
            renew_certificate
            test_certificate
            ;;
        "force-renew")
            check_root
            force_renewal
            test_certificate
            ;;
        "test")
            test_certificate
            ;;
        "info")
            show_cert_info
            ;;
        "backup")
            check_root
            backup_certificates
            ;;
        *)
            echo "Usage: $0 {setup|renew|force-renew|test|info|backup}"
            echo "  setup       - Initial certificate setup"
            echo "  renew       - Renew existing certificates"
            echo "  force-renew - Force renewal of certificates"
            echo "  test        - Test certificate accessibility"
            echo "  info        - Show certificate information"
            echo "  backup      - Backup certificates"
            exit 1
            ;;
    esac
}

main "$@"