#!/bin/bash

# Comprehensive Backup and Recovery Manager for Paintbox
# Handles PostgreSQL and Redis backups with automated retention

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_LOG="$PROJECT_ROOT/backup.log"

# Default values
FLY_DB_APP="${FLY_DB_APP:-paintbox-prod-db}"
FLY_REDIS_APP="${FLY_REDIS_APP:-paintbox-redis}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-paintbox-backups-$(date +%Y)}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_PREFIX="paintbox"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$BACKUP_LOG"
}

log_info() { log "${BLUE}INFO${NC}" "$@"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$@"; }
log_warning() { log "${YELLOW}WARNING${NC}" "$@"; }
log_error() { log "${RED}ERROR${NC}" "$@"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking backup prerequisites..."

    local missing_tools=()

    command -v flyctl &> /dev/null || missing_tools+=("flyctl")
    command -v aws &> /dev/null || missing_tools+=("aws")
    command -v pg_dump &> /dev/null || missing_tools+=("pg_dump")
    command -v redis-cli &> /dev/null || missing_tools+=("redis-cli")
    command -v gzip &> /dev/null || missing_tools+=("gzip")
    command -v jq &> /dev/null || missing_tools+=("jq")

    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check authentication
    if ! flyctl auth whoami &> /dev/null; then
        log_error "Not authenticated with Fly.io. Run: flyctl auth login"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Not authenticated with AWS. Run: aws configure"
        exit 1
    fi

    # Check/create S3 bucket
    if ! aws s3 ls "s3://$S3_BACKUP_BUCKET" &> /dev/null; then
        log_info "Creating S3 backup bucket: $S3_BACKUP_BUCKET"
        aws s3 mb "s3://$S3_BACKUP_BUCKET" --region "$AWS_REGION"

        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$S3_BACKUP_BUCKET" \
            --versioning-configuration Status=Enabled

        # Set lifecycle policy for retention
        cat > /tmp/lifecycle-policy.json << EOF
{
    "Rules": [
        {
            "ID": "DeleteOldBackups",
            "Status": "Enabled",
            "Expiration": {
                "Days": $RETENTION_DAYS
            },
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 7
            }
        }
    ]
}
EOF
        aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BACKUP_BUCKET" \
            --lifecycle-configuration file:///tmp/lifecycle-policy.json

        rm -f /tmp/lifecycle-policy.json
    fi

    log_success "Prerequisites check passed"
}

# Get database connection info from AWS Secrets Manager
get_db_connection() {
    log_info "Retrieving database connection info..."

    local secret_name="paintbox/${ENVIRONMENT}/secrets"
    local secret_value

    secret_value=$(aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --region "$AWS_REGION" \
        --query SecretString \
        --output text 2>/dev/null) || {
        log_error "Failed to retrieve database credentials from AWS Secrets Manager"
        return 1
    }

    echo "$secret_value" | jq -r '.database.url'
}

# Create PostgreSQL backup
backup_postgres() {
    local backup_name="${BACKUP_PREFIX}-postgres-$(date +%Y%m%d_%H%M%S)"
    local backup_file="/tmp/${backup_name}.sql"
    local compressed_file="${backup_file}.gz"

    log_info "Starting PostgreSQL backup: $backup_name"

    # Get database connection URL
    local db_url
    db_url=$(get_db_connection) || {
        log_error "Failed to get database connection info"
        return 1
    }

    # Create backup using pg_dump
    log_info "Creating database dump..."
    if pg_dump "$db_url" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --format=custom \
        --file="$backup_file" 2>> "$BACKUP_LOG"; then

        # Compress backup
        log_info "Compressing backup..."
        gzip "$backup_file"

        # Upload to S3
        log_info "Uploading backup to S3..."
        aws s3 cp "$compressed_file" \
            "s3://$S3_BACKUP_BUCKET/postgres/$(basename "$compressed_file")" \
            --metadata "environment=$ENVIRONMENT,app=$FLY_DB_APP,created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

        # Cleanup local file
        rm -f "$compressed_file"

        log_success "PostgreSQL backup completed: $backup_name"
        echo "$backup_name"
    else
        log_error "PostgreSQL backup failed"
        rm -f "$backup_file" "$compressed_file"
        return 1
    fi
}

# Create Redis backup
backup_redis() {
    local backup_name="${BACKUP_PREFIX}-redis-$(date +%Y%m%d_%H%M%S)"
    local backup_file="/tmp/${backup_name}.rdb"
    local compressed_file="${backup_file}.gz"

    log_info "Starting Redis backup: $backup_name"

    # Get Redis connection info
    local redis_url
    redis_url=$(echo "$(get_db_connection)" | jq -r '.redis.url' 2>/dev/null || echo "")

    if [[ -z "$redis_url" ]]; then
        log_warning "Redis connection info not available, skipping Redis backup"
        return 0
    fi

    # Use Fly.io proxy to connect to Redis
    log_info "Creating Redis backup via Fly.io proxy..."

    # Start proxy in background
    flyctl proxy 6379:6379 --app "$FLY_REDIS_APP" &
    local proxy_pid=$!
    sleep 5  # Wait for proxy to start

    # Create backup
    if redis-cli -p 6379 --rdb "$backup_file" 2>> "$BACKUP_LOG"; then
        # Kill proxy
        kill $proxy_pid 2>/dev/null || true

        # Compress backup
        log_info "Compressing Redis backup..."
        gzip "$backup_file"

        # Upload to S3
        log_info "Uploading Redis backup to S3..."
        aws s3 cp "$compressed_file" \
            "s3://$S3_BACKUP_BUCKET/redis/$(basename "$compressed_file")" \
            --metadata "environment=$ENVIRONMENT,app=$FLY_REDIS_APP,created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

        # Cleanup local file
        rm -f "$compressed_file"

        log_success "Redis backup completed: $backup_name"
        echo "$backup_name"
    else
        # Kill proxy on failure
        kill $proxy_pid 2>/dev/null || true
        log_error "Redis backup failed"
        rm -f "$backup_file" "$compressed_file"
        return 1
    fi
}

# List available backups
list_backups() {
    log_info "Listing available backups..."

    echo ""
    echo "PostgreSQL Backups:"
    echo "==================="
    aws s3 ls "s3://$S3_BACKUP_BUCKET/postgres/" --recursive | while read -r line; do
        local date_time=$(echo "$line" | awk '{print $1, $2}')
        local size=$(echo "$line" | awk '{print $3}')
        local file=$(echo "$line" | awk '{print $4}' | xargs basename)
        printf "%-20s %-10s %s\n" "$date_time" "$size" "$file"
    done

    echo ""
    echo "Redis Backups:"
    echo "=============="
    aws s3 ls "s3://$S3_BACKUP_BUCKET/redis/" --recursive | while read -r line; do
        local date_time=$(echo "$line" | awk '{print $1, $2}')
        local size=$(echo "$line" | awk '{print $3}')
        local file=$(echo "$line" | awk '{print $4}' | xargs basename)
        printf "%-20s %-10s %s\n" "$date_time" "$size" "$file"
    done
    echo ""
}

# Restore PostgreSQL backup
restore_postgres() {
    local backup_name="$1"
    local restore_file="/tmp/${backup_name}"

    if [[ -z "$backup_name" ]]; then
        log_error "Please specify a backup name to restore"
        return 1
    fi

    log_warning "Starting PostgreSQL restore: $backup_name"
    log_warning "This will overwrite the current database!"

    # Confirm restore
    if [[ "${FORCE_RESTORE:-false}" != "true" ]]; then
        echo -n "Are you sure you want to restore '$backup_name'? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Restore cancelled"
            return 0
        fi
    fi

    # Download backup from S3
    log_info "Downloading backup from S3..."
    aws s3 cp "s3://$S3_BACKUP_BUCKET/postgres/$backup_name" "$restore_file"

    # Decompress if needed
    if [[ "$backup_name" == *.gz ]]; then
        gunzip "$restore_file"
        restore_file="${restore_file%.gz}"
    fi

    # Get database connection URL
    local db_url
    db_url=$(get_db_connection) || {
        log_error "Failed to get database connection info"
        rm -f "$restore_file"
        return 1
    }

    # Restore database
    log_info "Restoring database..."
    if pg_restore --verbose --clean --if-exists --no-owner --no-privileges \
        --dbname="$db_url" "$restore_file" 2>> "$BACKUP_LOG"; then

        log_success "PostgreSQL restore completed successfully"
    else
        log_error "PostgreSQL restore failed"
        rm -f "$restore_file"
        return 1
    fi

    # Cleanup
    rm -f "$restore_file"
    log_success "Restore cleanup completed"
}

# Restore Redis backup
restore_redis() {
    local backup_name="$1"
    local restore_file="/tmp/${backup_name}"

    if [[ -z "$backup_name" ]]; then
        log_error "Please specify a backup name to restore"
        return 1
    fi

    log_warning "Starting Redis restore: $backup_name"
    log_warning "This will overwrite the current Redis data!"

    # Confirm restore
    if [[ "${FORCE_RESTORE:-false}" != "true" ]]; then
        echo -n "Are you sure you want to restore '$backup_name'? (yes/no): "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Restore cancelled"
            return 0
        fi
    fi

    # Download backup from S3
    log_info "Downloading Redis backup from S3..."
    aws s3 cp "s3://$S3_BACKUP_BUCKET/redis/$backup_name" "$restore_file"

    # Decompress if needed
    if [[ "$backup_name" == *.gz ]]; then
        gunzip "$restore_file"
        restore_file="${restore_file%.gz}"
    fi

    log_warning "Redis restore requires manual intervention"
    log_info "1. Stop Redis: flyctl ssh console --app $FLY_REDIS_APP"
    log_info "2. Replace /data/dump.rdb with the backup file"
    log_info "3. Restart Redis"
    log_info "Backup file downloaded to: $restore_file"
}

# Verify backup integrity
verify_backup() {
    local backup_type="$1"
    local backup_name="$2"

    if [[ -z "$backup_type" || -z "$backup_name" ]]; then
        log_error "Please specify backup type (postgres/redis) and backup name"
        return 1
    fi

    log_info "Verifying backup: $backup_type/$backup_name"

    # Download backup
    local backup_file="/tmp/verify_${backup_name}"
    aws s3 cp "s3://$S3_BACKUP_BUCKET/$backup_type/$backup_name" "$backup_file"

    case "$backup_type" in
        "postgres")
            # Decompress if needed
            if [[ "$backup_name" == *.gz ]]; then
                gunzip "$backup_file"
                backup_file="${backup_file%.gz}"
            fi

            # Verify PostgreSQL backup
            if pg_restore --list "$backup_file" > /dev/null 2>&1; then
                local table_count
                table_count=$(pg_restore --list "$backup_file" | grep -c "TABLE" || echo "0")
                log_success "PostgreSQL backup verified: $table_count tables found"
            else
                log_error "PostgreSQL backup verification failed"
                rm -f "$backup_file"
                return 1
            fi
            ;;
        "redis")
            # Basic file integrity check for Redis
            if [[ -f "$backup_file" ]]; then
                local file_size
                file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
                if [[ $file_size -gt 0 ]]; then
                    log_success "Redis backup verified: $file_size bytes"
                else
                    log_error "Redis backup verification failed: empty file"
                    return 1
                fi
            else
                log_error "Redis backup file not found"
                return 1
            fi
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            return 1
            ;;
    esac

    rm -f "$backup_file"
    log_success "Backup verification completed"
}

# Cleanup old backups (beyond retention period)
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    local cutoff_date
    cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

    # PostgreSQL backups
    local postgres_deleted=0
    aws s3api list-objects-v2 --bucket "$S3_BACKUP_BUCKET" --prefix "postgres/" --query 'Contents[?LastModified<`'"$cutoff_date"'T00:00:00.000Z`].[Key]' --output text | while read -r key; do
        if [[ -n "$key" && "$key" != "None" ]]; then
            aws s3 rm "s3://$S3_BACKUP_BUCKET/$key"
            ((postgres_deleted++))
        fi
    done

    # Redis backups
    local redis_deleted=0
    aws s3api list-objects-v2 --bucket "$S3_BACKUP_BUCKET" --prefix "redis/" --query 'Contents[?LastModified<`'"$cutoff_date"'T00:00:00.000Z`].[Key]' --output text | while read -r key; do
        if [[ -n "$key" && "$key" != "None" ]]; then
            aws s3 rm "s3://$S3_BACKUP_BUCKET/$key"
            ((redis_deleted++))
        fi
    done

    log_success "Cleanup completed. Removed old backups beyond $RETENTION_DAYS days"
}

# Create automated backup schedule
create_backup_schedule() {
    log_info "Creating automated backup schedule..."

    # Create systemd timer for daily backups (Linux)
    if command -v systemctl &> /dev/null; then
        cat > /tmp/paintbox-backup.service << EOF
[Unit]
Description=Paintbox Database Backup
After=network.target

[Service]
Type=oneshot
ExecStart=$SCRIPT_DIR/backup-manager.sh backup-all
User=$(whoami)
EOF

        cat > /tmp/paintbox-backup.timer << EOF
[Unit]
Description=Run Paintbox backup daily
Requires=paintbox-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

        log_info "Systemd service and timer files created in /tmp"
        log_info "To install: sudo cp /tmp/paintbox-backup.* /etc/systemd/system/ && sudo systemctl enable --now paintbox-backup.timer"
    fi

    # Create crontab entry
    local cron_entry="0 2 * * * $SCRIPT_DIR/backup-manager.sh backup-all >> $BACKUP_LOG 2>&1"
    log_info "Suggested crontab entry (daily at 2 AM):"
    echo "$cron_entry"
}

# Point-in-time recovery setup
setup_point_in_time_recovery() {
    log_info "Setting up point-in-time recovery..."

    # Enable WAL archiving for PostgreSQL (requires configuration changes)
    log_info "For point-in-time recovery, configure PostgreSQL with:"
    echo "  wal_level = replica"
    echo "  archive_mode = on"
    echo "  archive_command = 'aws s3 cp %p s3://$S3_BACKUP_BUCKET/wal/%f'"
    echo ""
    log_info "This requires PostgreSQL configuration changes and restart"
}

# Main function
main() {
    local command="${1:-help}"

    case "$command" in
        "backup-postgres")
            check_prerequisites
            backup_postgres
            ;;
        "backup-redis")
            check_prerequisites
            backup_redis
            ;;
        "backup-all")
            check_prerequisites
            log_info "Starting full backup..."
            local postgres_backup
            local redis_backup
            postgres_backup=$(backup_postgres)
            redis_backup=$(backup_redis)
            log_success "Full backup completed: PostgreSQL=$postgres_backup, Redis=$redis_backup"
            ;;
        "list")
            list_backups
            ;;
        "restore-postgres")
            check_prerequisites
            restore_postgres "${2:-}"
            ;;
        "restore-redis")
            check_prerequisites
            restore_redis "${2:-}"
            ;;
        "verify")
            verify_backup "${2:-}" "${3:-}"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "schedule")
            create_backup_schedule
            ;;
        "pitr")
            setup_point_in_time_recovery
            ;;
        "help"|*)
            echo "Paintbox Backup Manager"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  backup-postgres     Create PostgreSQL backup"
            echo "  backup-redis        Create Redis backup"
            echo "  backup-all          Create both PostgreSQL and Redis backups"
            echo "  list                List available backups"
            echo "  restore-postgres    Restore PostgreSQL backup"
            echo "  restore-redis       Restore Redis backup"
            echo "  verify <type> <name> Verify backup integrity"
            echo "  cleanup             Remove old backups beyond retention period"
            echo "  schedule            Set up automated backup schedule"
            echo "  pitr                Set up point-in-time recovery"
            echo "  help                Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  FLY_DB_APP          Fly.io PostgreSQL app name"
            echo "  FLY_REDIS_APP       Fly.io Redis app name"
            echo "  S3_BACKUP_BUCKET    S3 bucket for backups"
            echo "  RETENTION_DAYS      Backup retention period (default: 30)"
            echo "  FORCE_RESTORE       Skip restore confirmation (default: false)"
            echo ""
            echo "Examples:"
            echo "  $0 backup-all"
            echo "  $0 list"
            echo "  $0 restore-postgres paintbox-postgres-20241201_120000.sql.gz"
            echo "  $0 verify postgres paintbox-postgres-20241201_120000.sql.gz"
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
