#!/bin/bash

# PostgreSQL Backup Script for Candlefish Website
# Performs automated backups with compression and encryption
# Supports full backups, incremental backups, and WAL archiving

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/candlefish-backup.log"
PID_FILE="/var/run/candlefish-backup.pid"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-candlefish_production}"
DB_USER="${DB_USER:-candlefish_backup}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/postgresql}"
S3_BUCKET="${S3_BUCKET:-candlefish-database-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"

# Encryption
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@candlefish.ai}"
ENCRYPT_BACKUPS="${ENCRYPT_BACKUPS:-true}"

# Notification
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-ops@candlefish.ai}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    send_alert "Backup failed: $1"
    cleanup_and_exit 1
}

# Cleanup function
cleanup_and_exit() {
    local exit_code=${1:-0}
    
    # Remove PID file
    rm -f "$PID_FILE"
    
    # Clean up temporary files
    find "$BACKUP_DIR" -name "*.tmp" -mtime +1 -delete 2>/dev/null || true
    
    exit $exit_code
}

# Check if backup is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "Backup already running (PID: $pid)"
            exit 0
        else
            log "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Create PID file
    echo $$ > "$PID_FILE"
}

# Send alert notifications
send_alert() {
    local message="$1"
    local level="${2:-error}"
    
    log "ALERT: $message"
    
    # Send Slack notification if webhook URL is configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Candlefish Database Backup Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi
    
    # Send email alert if configured
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail >/dev/null; then
        echo "$message" | mail -s "Candlefish Database Backup Alert" "$ALERT_EMAIL" || true
    fi
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" >/dev/null 2>&1; then
        error_exit "Cannot connect to database $DB_NAME on $DB_HOST:$DB_PORT"
    fi
    
    log "Database connection successful"
}

# Create backup directories
setup_directories() {
    local dirs=(
        "$BACKUP_DIR"
        "$BACKUP_DIR/full"
        "$BACKUP_DIR/incremental"
        "$BACKUP_DIR/wal"
        "$BACKUP_DIR/temp"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir" || error_exit "Failed to create directory: $dir"
    done
    
    log "Backup directories created/verified"
}

# Full database backup
full_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/full/candlefish_full_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    log "Starting full backup..."
    
    # Create backup with pg_dump
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=0 \
        --file="$backup_file" \
        || error_exit "pg_dump failed"
    
    log "Database dump completed: $backup_file"
    
    # Compress backup
    gzip -"$COMPRESSION_LEVEL" "$backup_file" || error_exit "Compression failed"
    log "Backup compressed: $compressed_file"
    
    # Encrypt backup if enabled
    if [[ "$ENCRYPT_BACKUPS" == "true" ]]; then
        gpg --trust-model always --encrypt --recipient "$GPG_RECIPIENT" \
            --output "$encrypted_file" "$compressed_file" \
            || error_exit "Encryption failed"
        
        # Remove unencrypted file
        rm "$compressed_file"
        backup_file="$encrypted_file"
        log "Backup encrypted: $encrypted_file"
    else
        backup_file="$compressed_file"
    fi
    
    # Upload to S3
    upload_to_s3 "$backup_file" "full/$(basename "$backup_file")"
    
    # Verify backup integrity
    verify_backup "$backup_file"
    
    log "Full backup completed successfully: $(basename "$backup_file")"
    echo "$backup_file"
}

# Incremental backup using WAL files
incremental_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/incremental/candlefish_incremental_${timestamp}.tar.gz"
    
    log "Starting incremental backup..."
    
    # Archive WAL files
    local wal_dir="$BACKUP_DIR/wal"
    local temp_dir="$BACKUP_DIR/temp/incremental_$timestamp"
    
    mkdir -p "$temp_dir"
    
    # Find and copy recent WAL files
    find /var/lib/postgresql/*/main/pg_wal -name "*.ready" -mtime -1 2>/dev/null | while read -r file; do
        local wal_file=$(basename "$file" .ready)
        local wal_path="/var/lib/postgresql/*/main/pg_wal/$wal_file"
        
        if [[ -f "$wal_path" ]]; then
            cp "$wal_path" "$temp_dir/" || log "Warning: Failed to copy $wal_path"
        fi
    done
    
    # Create compressed archive
    if [[ -n "$(ls -A "$temp_dir" 2>/dev/null)" ]]; then
        tar -czf "$backup_file" -C "$temp_dir" . || error_exit "Failed to create incremental backup"
        
        # Encrypt if enabled
        if [[ "$ENCRYPT_BACKUPS" == "true" ]]; then
            local encrypted_file="${backup_file}.gpg"
            gpg --trust-model always --encrypt --recipient "$GPG_RECIPIENT" \
                --output "$encrypted_file" "$backup_file" \
                || error_exit "Encryption failed"
            
            rm "$backup_file"
            backup_file="$encrypted_file"
        fi
        
        # Upload to S3
        upload_to_s3 "$backup_file" "incremental/$(basename "$backup_file")"
        
        log "Incremental backup completed: $(basename "$backup_file")"
    else
        log "No WAL files found for incremental backup"
    fi
    
    # Cleanup temp directory
    rm -rf "$temp_dir"
}

# Upload backup to S3
upload_to_s3() {
    local local_file="$1"
    local s3_key="$2"
    local s3_path="s3://$S3_BUCKET/$s3_key"
    
    log "Uploading to S3: $s3_path"
    
    # Upload with server-side encryption
    aws s3 cp "$local_file" "$s3_path" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "backup-date=$(date -Iseconds),environment=production,source=candlefish-website" \
        || error_exit "S3 upload failed: $s3_path"
    
    log "S3 upload completed: $s3_path"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Test file readability
    if [[ "$backup_file" == *.gpg ]]; then
        # Test GPG decryption
        gpg --quiet --decrypt "$backup_file" | head -c 1 >/dev/null \
            || error_exit "Backup verification failed: Cannot decrypt $backup_file"
    elif [[ "$backup_file" == *.gz ]]; then
        # Test gzip integrity
        gzip -t "$backup_file" || error_exit "Backup verification failed: Corrupted gzip $backup_file"
    fi
    
    log "Backup verification successful"
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Clean local backups
    find "$BACKUP_DIR/full" -name "*.sql.gz*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/incremental" -name "*.tar.gz*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean S3 backups (lifecycle policy should handle this, but cleanup manually as backup)
    aws s3 ls "s3://$S3_BUCKET/full/" --region "$AWS_REGION" | \
        awk '$1 < "'$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')'" {print $4}' | \
        while read -r file; do
            if [[ -n "$file" ]]; then
                aws s3 rm "s3://$S3_BUCKET/full/$file" --region "$AWS_REGION" || true
            fi
        done
    
    log "Cleanup completed"
}

# Generate backup report
generate_report() {
    local backup_file="$1"
    local backup_type="$2"
    local file_size=$(du -h "$backup_file" | cut -f1)
    
    cat << EOF
Candlefish Database Backup Report
=================================

Backup Type: $backup_type
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST

Backup Details:
- File: $(basename "$backup_file")
- Size: $file_size
- Location: $backup_file
- S3 Bucket: $S3_BUCKET
- Encryption: $ENCRYPT_BACKUPS

Status: SUCCESS
EOF
}

# Main backup function
main() {
    local backup_type="${1:-full}"
    
    log "Starting Candlefish database backup (type: $backup_type)"
    
    # Pre-flight checks
    check_running
    test_connection
    setup_directories
    
    # Perform backup based on type
    case "$backup_type" in
        "full")
            backup_file=$(full_backup)
            ;;
        "incremental")
            incremental_backup
            ;;
        *)
            error_exit "Unknown backup type: $backup_type"
            ;;
    esac
    
    # Post-backup tasks
    cleanup_old_backups
    
    # Generate and send report
    if [[ -n "${backup_file:-}" ]]; then
        generate_report "$backup_file" "$backup_type" | tee -a "$LOG_FILE"
        
        # Send success notification
        send_alert "Backup completed successfully: $(basename "$backup_file")" "info"
    fi
    
    log "Backup process completed successfully"
    cleanup_and_exit 0
}

# Signal handlers
trap 'error_exit "Backup interrupted by signal"' INT TERM
trap 'cleanup_and_exit' EXIT

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] [BACKUP_TYPE]

Backup types:
  full         Full database backup (default)
  incremental  Incremental backup using WAL files

Options:
  -h, --help   Show this help message

Environment variables:
  DB_HOST              Database host (default: localhost)
  DB_PORT              Database port (default: 5432)
  DB_NAME              Database name (default: candlefish_production)
  DB_USER              Database user (default: candlefish_backup)
  BACKUP_DIR           Local backup directory
  S3_BUCKET            S3 bucket for backup storage
  RETENTION_DAYS       Backup retention in days (default: 30)
  ENCRYPT_BACKUPS      Enable encryption (default: true)
  SLACK_WEBHOOK_URL    Slack webhook for notifications

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        *)
            BACKUP_TYPE="$1"
            shift
            ;;
    esac
done

# Run main function
main "${BACKUP_TYPE:-full}"