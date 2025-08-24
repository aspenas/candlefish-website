#!/bin/bash

# =============================================================================
# Deployment Database Setup Script
# Sets up PostgreSQL database for deployment tracking and monitoring
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/database-setup-$(date +%Y%m%d-%H%M%S).log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Database configuration
DB_NAME="${DB_NAME:-candlefish_deployment}"
DB_USER="${DB_USER:-candlefish_deploy}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
POSTGRES_URL="${POSTGRES_URL:-}"

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${BLUE}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}$*${NC}"
}

log_warn() {
    log "WARN" "${YELLOW}$*${NC}"
}

log_error() {
    log "ERROR" "${RED}$*${NC}"
}

# Check if PostgreSQL is available
check_postgresql() {
    log_info "Checking PostgreSQL availability..."

    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) not found. Please install PostgreSQL."
        exit 1
    fi

    # Check connection
    if [ -n "$POSTGRES_URL" ]; then
        log_info "Using provided POSTGRES_URL..."
        if ! psql "$POSTGRES_URL" -c "SELECT 1;" &> /dev/null; then
            log_error "Cannot connect to PostgreSQL using POSTGRES_URL"
            exit 1
        fi
    else
        log_info "Testing local PostgreSQL connection..."
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "SELECT 1;" &> /dev/null; then
            log_error "Cannot connect to local PostgreSQL. Ensure PostgreSQL is running."
            exit 1
        fi
    fi

    log_success "PostgreSQL connection verified"
}

# Create database and user if needed
setup_database_user() {
    log_info "Setting up database and user..."

    if [ -n "$POSTGRES_URL" ]; then
        log_info "Using existing database connection"
        return 0
    fi

    # Create database
    log_info "Creating database: $DB_NAME"
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || \
        log_warn "Database $DB_NAME already exists or creation failed"

    # Create user
    log_info "Creating user: $DB_USER"
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE USER $DB_USER WITH PASSWORD 'deployment_tracking';" 2>/dev/null || \
        log_warn "User $DB_USER already exists or creation failed"

    # Grant privileges
    log_info "Granting privileges..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || \
        log_warn "Failed to grant database privileges"

    # Connect to the new database and grant schema privileges
    psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || \
        log_warn "Failed to grant schema privileges"

    log_success "Database and user setup completed"
}

# Apply database schema
apply_schema() {
    log_info "Applying database schema..."

    local db_url="$POSTGRES_URL"
    if [ -z "$db_url" ]; then
        db_url="postgresql://$DB_USER:deployment_tracking@$DB_HOST:$DB_PORT/$DB_NAME"
    fi

    # Apply the main schema
    if psql "$db_url" -f "$PROJECT_ROOT/deployment-api-schema.sql"; then
        log_success "Database schema applied successfully"
    else
        log_error "Failed to apply database schema"
        return 1
    fi

    # Verify schema was applied correctly
    log_info "Verifying schema installation..."
    local table_count
    table_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)

    if [ "$table_count" -ge 10 ]; then
        log_success "Schema verification passed: $table_count tables created"
    else
        log_error "Schema verification failed: only $table_count tables found"
        return 1
    fi

    # Check if initial data was inserted
    local sites_count
    sites_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM sites;" | xargs)

    if [ "$sites_count" -eq 3 ]; then
        log_success "Initial data verification passed: 3 sites configured"
    else
        log_warn "Expected 3 sites, found $sites_count. This may be normal if running multiple times."
    fi
}

# Create database connection configuration
create_connection_config() {
    log_info "Creating database connection configuration..."

    local config_dir="$PROJECT_ROOT/config"
    mkdir -p "$config_dir"

    local db_url="$POSTGRES_URL"
    if [ -z "$db_url" ]; then
        db_url="postgresql://$DB_USER:deployment_tracking@$DB_HOST:$DB_PORT/$DB_NAME"
    fi

    cat > "$config_dir/database.json" <<EOF
{
    "development": {
        "url": "$db_url",
        "ssl": false
    },
    "production": {
        "url": "$db_url",
        "ssl": true,
        "pool": {
            "min": 2,
            "max": 20,
            "acquire": 60000,
            "idle": 10000
        }
    },
    "migrations": {
        "directory": "./migrations",
        "tableName": "deployment_migrations"
    }
}
EOF

    log_success "Database configuration created at $config_dir/database.json"
}

# Run database health check
health_check() {
    log_info "Running database health check..."

    local db_url="$POSTGRES_URL"
    if [ -z "$db_url" ]; then
        db_url="postgresql://$DB_USER:deployment_tracking@$DB_HOST:$DB_PORT/$DB_NAME"
    fi

    # Test connection
    if ! psql "$db_url" -c "SELECT 1;" &> /dev/null; then
        log_error "Database connection failed"
        return 1
    fi

    # Test core tables
    local required_tables=("sites" "environments" "deployments" "health_checks" "deployment_audit_logs")
    for table in "${required_tables[@]}"; do
        if psql "$db_url" -t -c "SELECT COUNT(*) FROM $table;" &> /dev/null; then
            log_success "✅ Table $table accessible"
        else
            log_error "❌ Table $table not accessible"
            return 1
        fi
    done

    # Test database functions
    if psql "$db_url" -c "SELECT update_updated_at_column();" &> /dev/null; then
        log_success "✅ Database functions working"
    else
        log_warn "⚠️ Some database functions may not be working properly"
    fi

    log_success "Database health check completed successfully"
}

# Create sample deployment record for testing
create_test_deployment() {
    log_info "Creating test deployment record..."

    local db_url="$POSTGRES_URL"
    if [ -z "$db_url" ]; then
        db_url="postgresql://$DB_USER:deployment_tracking@$DB_HOST:$DB_PORT/$DB_NAME"
    fi

    local current_commit
    current_commit=$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo "unknown")

    local current_branch
    current_branch=$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "main")

    # Create a test deployment
    psql "$db_url" -c "
        INSERT INTO deployments (
            site_id, environment_id, commit_sha, branch,
            deployment_type, triggered_by, trigger_source, status
        )
        SELECT s.id, e.id, '$current_commit', '$current_branch',
               'test', 'setup_script', 'manual', 'success'
        FROM sites s, environments e
        WHERE s.name = 'docs' AND e.name = 'staging'
        LIMIT 1
        ON CONFLICT DO NOTHING;
    " || log_warn "Failed to create test deployment record"

    # Show deployment summary
    log_info "Current deployments in database:"
    psql "$db_url" -c "
        SELECT
            s.name as site,
            e.name as environment,
            d.status,
            d.branch,
            d.created_at
        FROM deployments d
        JOIN sites s ON d.site_id = s.id
        JOIN environments e ON d.environment_id = e.id
        ORDER BY d.created_at DESC
        LIMIT 5;
    " || log_warn "Failed to query deployments"

    log_success "Test deployment record created"
}

# Main execution
main() {
    log_info "Starting deployment database setup..."

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Check prerequisites
    check_postgresql

    # Setup database
    setup_database_user

    # Apply schema
    apply_schema

    # Create configuration
    create_connection_config

    # Run health check
    health_check

    # Create test deployment
    create_test_deployment

    log_success "✅ Deployment database setup completed successfully!"

    # Output connection information
    echo ""
    echo "============================================================="
    echo "Database Setup Complete"
    echo "============================================================="
    if [ -n "$POSTGRES_URL" ]; then
        echo "Database URL: $POSTGRES_URL"
    else
        echo "Database: $DB_NAME"
        echo "User: $DB_USER"
        echo "Host: $DB_HOST:$DB_PORT"
        echo "Connection: postgresql://$DB_USER:deployment_tracking@$DB_HOST:$DB_PORT/$DB_NAME"
    fi
    echo "Configuration: $PROJECT_ROOT/config/database.json"
    echo "============================================================="
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "check")
        check_postgresql
        health_check
        ;;
    "test")
        create_test_deployment
        ;;
    *)
        echo "Usage: $0 [setup|check|test]"
        echo ""
        echo "Commands:"
        echo "  setup - Full database setup (default)"
        echo "  check - Run health check only"
        echo "  test  - Create test deployment record"
        exit 1
        ;;
esac
