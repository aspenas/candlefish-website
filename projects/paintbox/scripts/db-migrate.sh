#!/bin/bash
# Database migration script for System Analyzer
# This script handles database migrations in a safe, atomic manner

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-system_analyzer}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./database/migrations}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1" >&2
    fi
}

# Check if required tools are available
check_dependencies() {
    local missing_deps=()

    command -v psql >/dev/null 2>&1 || missing_deps+=("psql")
    command -v pg_dump >/dev/null 2>&1 || missing_deps+=("pg_dump")

    if [[ ${#missing_deps[@]} -ne 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install PostgreSQL client tools"
        exit 1
    fi
}

# Build database connection string
build_db_url() {
    if [[ -n "$DB_PASSWORD" ]]; then
        echo "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    else
        echo "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    fi
}

# Test database connection
test_connection() {
    local db_url
    db_url=$(build_db_url)

    log_info "Testing database connection..."

    if psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Cannot connect to database"
        return 1
    fi
}

# Create migrations table if it doesn't exist
create_migrations_table() {
    local db_url
    db_url=$(build_db_url)

    log_info "Creating migrations table if not exists..."

    psql "$db_url" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checksum VARCHAR(64) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
        ON schema_migrations(applied_at);
    " >/dev/null

    log_verbose "Migrations table ready"
}

# Calculate file checksum
calculate_checksum() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | cut -d' ' -f1
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        log_error "No checksum utility found (sha256sum or shasum)"
        exit 1
    fi
}

# Get applied migrations from database
get_applied_migrations() {
    local db_url
    db_url=$(build_db_url)

    psql "$db_url" -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' '
}

# Get available migration files
get_available_migrations() {
    if [[ ! -d "$MIGRATIONS_DIR" ]]; then
        log_error "Migrations directory does not exist: $MIGRATIONS_DIR"
        exit 1
    fi

    find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort | while read -r file; do
        basename "$file" .sql
    done
}

# Check if migration was already applied with different checksum
check_migration_integrity() {
    local version="$1"
    local new_checksum="$2"
    local db_url
    db_url=$(build_db_url)

    local existing_checksum
    existing_checksum=$(psql "$db_url" -t -c "
        SELECT checksum FROM schema_migrations WHERE version = '$version';
    " 2>/dev/null | tr -d ' ')

    if [[ -n "$existing_checksum" && "$existing_checksum" != "$new_checksum" ]]; then
        log_error "Migration $version has been modified since it was applied!"
        log_error "Existing checksum: $existing_checksum"
        log_error "New checksum: $new_checksum"
        return 1
    fi

    return 0
}

# Create backup before migration
create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_file="$BACKUP_DIR/${backup_name}.sql"
    local db_url
    db_url=$(build_db_url)

    log_info "Creating backup: $backup_file"

    mkdir -p "$BACKUP_DIR"

    if pg_dump "$db_url" > "$backup_file"; then
        log_success "Backup created successfully"
        echo "$backup_file"
    else
        log_error "Failed to create backup"
        exit 1
    fi
}

# Apply a single migration
apply_migration() {
    local version="$1"
    local migration_file="$MIGRATIONS_DIR/${version}.sql"
    local db_url
    db_url=$(build_db_url)

    if [[ ! -f "$migration_file" ]]; then
        log_error "Migration file not found: $migration_file"
        return 1
    fi

    local checksum
    checksum=$(calculate_checksum "$migration_file")

    # Check if already applied
    if get_applied_migrations | grep -q "^$version$"; then
        if ! check_migration_integrity "$version" "$checksum"; then
            return 1
        fi
        log_verbose "Migration $version already applied, skipping"
        return 0
    fi

    log_info "Applying migration: $version"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would apply migration: $version"
        return 0
    fi

    # Start transaction and apply migration
    if psql "$db_url" -v ON_ERROR_STOP=1 -c "
        BEGIN;
        $(cat "$migration_file")
        INSERT INTO schema_migrations (version, checksum) VALUES ('$version', '$checksum');
        COMMIT;
    " >/dev/null; then
        log_success "Migration $version applied successfully"
    else
        log_error "Failed to apply migration $version"
        return 1
    fi
}

# Rollback a migration
rollback_migration() {
    local version="$1"
    local rollback_file="$MIGRATIONS_DIR/${version}_rollback.sql"
    local db_url
    db_url=$(build_db_url)

    if [[ ! -f "$rollback_file" ]]; then
        log_error "Rollback file not found: $rollback_file"
        return 1
    fi

    # Check if migration is applied
    if ! get_applied_migrations | grep -q "^$version$"; then
        log_warning "Migration $version is not applied, cannot rollback"
        return 0
    fi

    log_info "Rolling back migration: $version"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback migration: $version"
        return 0
    fi

    # Create backup before rollback
    local backup_file
    backup_file=$(create_backup)

    # Start transaction and rollback migration
    if psql "$db_url" -v ON_ERROR_STOP=1 -c "
        BEGIN;
        $(cat "$rollback_file")
        DELETE FROM schema_migrations WHERE version = '$version';
        COMMIT;
    " >/dev/null; then
        log_success "Migration $version rolled back successfully"
    else
        log_error "Failed to rollback migration $version"
        log_error "Database backup available at: $backup_file"
        return 1
    fi
}

# Show migration status
show_status() {
    log_info "Migration Status:"
    echo ""

    local applied_migrations
    applied_migrations=$(get_applied_migrations)

    local available_migrations
    available_migrations=$(get_available_migrations)

    printf "%-30s %-10s %-20s\n" "Migration" "Status" "Applied At"
    printf "%-30s %-10s %-20s\n" "----------" "------" "----------"

    local db_url
    db_url=$(build_db_url)

    while IFS= read -r migration; do
        if echo "$applied_migrations" | grep -q "^$migration$"; then
            local applied_at
            applied_at=$(psql "$db_url" -t -c "
                SELECT applied_at FROM schema_migrations WHERE version = '$migration';
            " 2>/dev/null | tr -d ' ')
            printf "%-30s %-10s %-20s\n" "$migration" "Applied" "$applied_at"
        else
            printf "%-30s %-10s %-20s\n" "$migration" "Pending" "-"
        fi
    done <<< "$available_migrations"
}

# Run pending migrations
migrate_up() {
    local target_version="$1"

    create_migrations_table

    local applied_migrations
    applied_migrations=$(get_applied_migrations)

    local available_migrations
    available_migrations=$(get_available_migrations)

    local pending_migrations=()

    while IFS= read -r migration; do
        if [[ -n "$target_version" && "$migration" > "$target_version" ]]; then
            break
        fi

        if ! echo "$applied_migrations" | grep -q "^$migration$"; then
            pending_migrations+=("$migration")
        fi
    done <<< "$available_migrations"

    if [[ ${#pending_migrations[@]} -eq 0 ]]; then
        log_success "No pending migrations"
        return 0
    fi

    log_info "Found ${#pending_migrations[@]} pending migration(s)"

    # Create backup before applying migrations
    if [[ "$DRY_RUN" != "true" ]]; then
        create_backup
    fi

    for migration in "${pending_migrations[@]}"; do
        if ! apply_migration "$migration"; then
            log_error "Migration failed, stopping"
            return 1
        fi
    done

    log_success "All migrations applied successfully"
}

# Rollback to specific version
migrate_down() {
    local target_version="$1"

    if [[ -z "$target_version" ]]; then
        log_error "Target version required for rollback"
        return 1
    fi

    local applied_migrations
    applied_migrations=$(get_applied_migrations | tac)  # Reverse order

    local migrations_to_rollback=()

    while IFS= read -r migration; do
        if [[ "$migration" > "$target_version" ]]; then
            migrations_to_rollback+=("$migration")
        fi
    done <<< "$applied_migrations"

    if [[ ${#migrations_to_rollback[@]} -eq 0 ]]; then
        log_success "No migrations to rollback"
        return 0
    fi

    log_info "Found ${#migrations_to_rollback[@]} migration(s) to rollback"

    for migration in "${migrations_to_rollback[@]}"; do
        if ! rollback_migration "$migration"; then
            log_error "Rollback failed, stopping"
            return 1
        fi
    done

    log_success "Rollback completed successfully"
}

# Show help
show_help() {
    cat << EOF
Database Migration Tool for System Analyzer

Usage: $0 [OPTIONS] COMMAND [ARGS]

Commands:
    up [VERSION]        Apply all pending migrations or up to VERSION
    down VERSION        Rollback migrations down to VERSION (exclusive)
    status              Show migration status
    create NAME         Create a new migration file
    help                Show this help message

Options:
    --dry-run           Show what would be done without executing
    --verbose           Enable verbose output
    --db-host HOST      Database host (default: localhost)
    --db-port PORT      Database port (default: 5432)
    --db-name NAME      Database name (default: system_analyzer)
    --db-user USER      Database user (default: postgres)
    --db-password PASS  Database password
    --migrations-dir    Migrations directory (default: ./database/migrations)
    --backup-dir        Backup directory (default: ./backups)

Examples:
    $0 up                       # Apply all pending migrations
    $0 up 20231201_120000       # Apply migrations up to version
    $0 down 20231130_100000     # Rollback to version
    $0 status                   # Show migration status
    $0 --dry-run up             # Show what migrations would be applied

EOF
}

# Create new migration
create_migration() {
    local name="$1"

    if [[ -z "$name" ]]; then
        log_error "Migration name required"
        return 1
    fi

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local version="${timestamp}_${name}"
    local migration_file="$MIGRATIONS_DIR/${version}.sql"
    local rollback_file="$MIGRATIONS_DIR/${version}_rollback.sql"

    mkdir -p "$MIGRATIONS_DIR"

    cat > "$migration_file" << EOF
-- Migration: $version
-- Description: $name
-- Created: $(date)

-- Add your migration SQL here
BEGIN;

-- Example: CREATE TABLE example (id SERIAL PRIMARY KEY, name VARCHAR(255));

COMMIT;
EOF

    cat > "$rollback_file" << EOF
-- Rollback: $version
-- Description: Rollback $name
-- Created: $(date)

-- Add your rollback SQL here
BEGIN;

-- Example: DROP TABLE IF EXISTS example;

COMMIT;
EOF

    log_success "Created migration files:"
    log_info "  Migration: $migration_file"
    log_info "  Rollback:  $rollback_file"
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --migrations-dir)
                MIGRATIONS_DIR="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            up|down|status|create|help)
                COMMAND="$1"
                shift
                break
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Check dependencies
    check_dependencies

    # Handle commands
    case "${COMMAND:-}" in
        up)
            if ! test_connection; then
                exit 1
            fi
            migrate_up "${1:-}"
            ;;
        down)
            if ! test_connection; then
                exit 1
            fi
            migrate_down "${1:-}"
            ;;
        status)
            if ! test_connection; then
                exit 1
            fi
            show_status
            ;;
        create)
            create_migration "${1:-}"
            ;;
        help|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
