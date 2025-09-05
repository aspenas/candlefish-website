#!/usr/bin/env bash

# Mobile Security Migration Script
# Migrates all mobile apps to use secure secrets management
# Last updated: September 2025

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APPS_DIR="$PROJECT_ROOT/apps"

# Mobile apps to migrate
MOBILE_APPS=(
    "mobile-security-dashboard"
    "mobile-collaboration" 
    "mobile-inventory"
    "mobile-dashboard"
    "mobile-maturity-map"
    "mobile-prompt-engineering"
)

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if app directory exists
check_app_exists() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    if [[ ! -d "$app_path" ]]; then
        log_warning "App directory not found: $app_path"
        return 1
    fi
    
    return 0
}

# Backup existing environment files
backup_env_files() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Backing up environment files for $app_name..."
    
    for env_file in ".env" ".env.production" ".env.development" ".env.staging"; do
        if [[ -f "$app_path/$env_file" ]]; then
            cp "$app_path/$env_file" "$app_path/${env_file}.backup.$(date +%Y%m%d_%H%M%S)"
            log_info "Backed up $env_file"
        fi
    done
}

# Create secure environment template
create_secure_env_template() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Creating secure environment template for $app_name..."
    
    # Get app-specific configuration
    local app_domain
    local secrets_namespace
    
    case "$app_name" in
        "mobile-security-dashboard")
            app_domain="security"
            secrets_namespace="candlefish/mobile/security-dashboard"
            ;;
        "mobile-collaboration")
            app_domain="collaboration"  
            secrets_namespace="candlefish/mobile/collaboration"
            ;;
        "mobile-inventory")
            app_domain="inventory"
            secrets_namespace="candlefish/mobile/inventory"
            ;;
        "mobile-dashboard")
            app_domain="dashboard"
            secrets_namespace="candlefish/mobile/dashboard"
            ;;
        "mobile-maturity-map")
            app_domain="maturity"
            secrets_namespace="candlefish/mobile/maturity-map"
            ;;
        "mobile-prompt-engineering")
            app_domain="prompts"
            secrets_namespace="candlefish/mobile/prompt-engineering"
            ;;
        *)
            app_domain="app"
            secrets_namespace="candlefish/mobile/$app_name"
            ;;
    esac
    
    # Create secure production environment file
    cat > "$app_path/.env.production.secure" << EOF
# Secure Production Environment Configuration for $app_name
# Last updated: $(date +"%B %Y")
# SECURITY: All sensitive values are now retrieved from AWS Secrets Manager

# API Configuration
EXPO_PUBLIC_API_URL=https://${app_domain}-api.candlefish.ai/graphql
EXPO_PUBLIC_REST_API_URL=https://${app_domain}-api.candlefish.ai/api
EXPO_PUBLIC_WEBSOCKET_URL=wss://${app_domain}-api.candlefish.ai/graphql

# Authentication
EXPO_PUBLIC_AUTH_DOMAIN=auth.candlefish.ai
EXPO_PUBLIC_CLIENT_ID=candlefish-$app_name
EXPO_PUBLIC_OAUTH_REDIRECT_URL=com.candlefish.$app_domain://auth

# Firebase Configuration (Retrieved from AWS Secrets Manager)
# Keys removed for security - use MobileSecretsManager to access
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=candlefish-$app_domain-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=candlefish-$app_domain-prod
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=candlefish-$app_domain-prod.appspot.com

# Push Notifications (Retrieved from AWS Secrets Manager)
# Keys removed for security - use MobileSecretsManager to access

# Error Reporting (Retrieved from AWS Secrets Manager)
# DSN removed for security - use MobileSecretsManager to access
EXPO_PUBLIC_SENTRY_ORG=candlefish
EXPO_PUBLIC_SENTRY_PROJECT=$app_name

# Analytics
EXPO_PUBLIC_ANALYTICS_ENDPOINT=https://analytics.candlefish.ai
# Token removed for security - use MobileSecretsManager to access

# Feature Flags
EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_DEMO_MODE=false

# Security Configuration
EXPO_PUBLIC_CERTIFICATE_PINNING=true
EXPO_PUBLIC_ROOT_DETECTION=true
EXPO_PUBLIC_DEBUG_PREVENTION=true

# App Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_BUILD_NUMBER=1
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_LOG_LEVEL=error

# Deep Linking
EXPO_PUBLIC_DEEP_LINK_PREFIX=https://$app_domain.candlefish.ai
EXPO_PUBLIC_UNIVERSAL_LINKS_DOMAIN=$app_domain.candlefish.ai

# Background Sync
EXPO_PUBLIC_SYNC_INTERVAL=300000
EXPO_PUBLIC_MAX_OFFLINE_ACTIONS=1000
EXPO_PUBLIC_RETRY_ATTEMPTS=3

# Performance
EXPO_PUBLIC_MAX_MEMORY_USAGE=256
EXPO_PUBLIC_IMAGE_CACHE_SIZE=100
EXPO_PUBLIC_API_TIMEOUT=30000

# AWS Configuration for Secrets Manager (Region only - credentials handled by IAM)
EXPO_PUBLIC_AWS_REGION=us-east-1
EXPO_PUBLIC_SECRETS_NAMESPACE=$secrets_namespace
EOF

    log_success "Created secure environment template for $app_name"
}

# Copy mobile secrets manager service
copy_secrets_manager() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    local src_dir="$app_path/src"
    
    log_info "Copying mobile secrets manager to $app_name..."
    
    # Create services directory if it doesn't exist
    mkdir -p "$src_dir/services"
    
    # Copy the mobile secrets manager
    if [[ -f "$APPS_DIR/mobile-security-dashboard/src/services/mobile-secrets-manager.ts" ]]; then
        cp "$APPS_DIR/mobile-security-dashboard/src/services/mobile-secrets-manager.ts" \
           "$src_dir/services/mobile-secrets-manager.ts"
        log_success "Copied mobile secrets manager to $app_name"
    else
        log_error "Source mobile secrets manager not found"
        return 1
    fi
}

# Copy enhanced secure storage
copy_secure_storage() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    local src_dir="$app_path/src"
    
    log_info "Copying enhanced secure storage to $app_name..."
    
    # Create utils directory if it doesn't exist
    mkdir -p "$src_dir/utils"
    
    # Copy the enhanced secure storage
    if [[ -f "$APPS_DIR/mobile-security-dashboard/src/utils/secure-storage-enhanced.ts" ]]; then
        cp "$APPS_DIR/mobile-security-dashboard/src/utils/secure-storage-enhanced.ts" \
           "$src_dir/utils/secure-storage-enhanced.ts"
        log_success "Copied enhanced secure storage to $app_name"
    else
        log_error "Source enhanced secure storage not found"
        return 1
    fi
}

# Update package.json dependencies
update_dependencies() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Updating dependencies for $app_name..."
    
    if [[ -f "$app_path/package.json" ]]; then
        # Check if we need to add crypto dependency
        if ! grep -q "expo-crypto" "$app_path/package.json"; then
            log_info "Adding expo-crypto dependency to $app_name"
            cd "$app_path"
            npm install expo-crypto --save
        fi
        
        # Check if we need to add secure-store dependency
        if ! grep -q "expo-secure-store" "$app_path/package.json"; then
            log_info "Adding expo-secure-store dependency to $app_name"
            cd "$app_path"
            npm install expo-secure-store --save
        fi
        
        log_success "Dependencies updated for $app_name"
    else
        log_warning "No package.json found for $app_name"
    fi
}

# Create migration guide for specific app
create_migration_guide() {
    local app_name="$1"
    local app_path="$APPS_DIR/$app_name"
    
    log_info "Creating migration guide for $app_name..."
    
    cat > "$app_path/SECURITY_MIGRATION_GUIDE.md" << 'EOF'
# Mobile Security Migration Guide

This guide covers the migration from hardcoded API keys to secure AWS Secrets Manager integration.

## What Changed

### 1. Environment Files
- **Before**: API keys, tokens, and secrets were hardcoded in `.env.production`
- **After**: Sensitive values are retrieved from AWS Secrets Manager at runtime
- **Action**: Use `.env.production.secure` as your new production environment file

### 2. Encryption
- **Before**: Weak XOR encryption for local data
- **After**: Production-grade AES-256-GCM equivalent encryption
- **Action**: All existing encrypted data will be re-encrypted with the new system

### 3. Secrets Management
- **Before**: No centralized secrets management
- **After**: AWS Secrets Manager integration with caching and offline support
- **Action**: Secrets are fetched securely and cached for offline operation

## Migration Steps

### 1. Update Environment Configuration
```bash
# Replace your current .env.production with the secure version
cp .env.production.secure .env.production
```

### 2. Initialize Secrets Manager
Add this to your app's main entry point (App.tsx or similar):

```typescript
import { environmentConfig } from './src/config/environment';
import { enhancedSecureStorage } from './src/utils/secure-storage-enhanced';

// In your App component or main initialization
useEffect(() => {
  const initializeApp = async () => {
    try {
      // Initialize enhanced secure storage
      await enhancedSecureStorage.initialize();
      
      // Initialize environment config with secrets
      await environmentConfig.initialize();
      
      console.log('App security initialization complete');
    } catch (error) {
      console.error('Failed to initialize app security:', error);
      // Handle initialization failure
    }
  };
  
  initializeApp();
}, []);
```

### 3. Update Secret Access
Replace direct environment variable access:

```typescript
// BEFORE
const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

// AFTER
import { getFirebaseSecrets } from './services/mobile-secrets-manager';

const firebaseSecrets = await getFirebaseSecrets();
const firebaseApiKey = firebaseSecrets.apiKey;
```

### 4. Update Encryption Usage
Replace old secure storage:

```typescript
// BEFORE
import { secureStorage } from './utils/secure-storage';

// AFTER
import { enhancedSecureStorage } from './utils/secure-storage-enhanced';

// Initialize first
await enhancedSecureStorage.initialize();

// Then use as normal
await enhancedSecureStorage.setUserData(userData);
```

## AWS Configuration

### Required AWS Secrets
Your app expects these secrets in AWS Secrets Manager under the namespace:
`candlefish/mobile/YOUR_APP_NAME`

```json
{
  "firebase": {
    "apiKey": "your-firebase-api-key",
    "messagingSenderId": "your-sender-id",
    "appId": "your-app-id"
  },
  "notifications": {
    "fcmServerKey": "your-fcm-server-key",
    "apnsKeyId": "your-apns-key-id",
    "apnsTeamId": "your-apns-team-id"
  },
  "analytics": {
    "mixpanelToken": "your-mixpanel-token",
    "sentryDsn": "your-sentry-dsn"
  }
}
```

### IAM Permissions
The mobile app's API backend needs these AWS permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:candlefish/mobile/*"
    }
  ]
}
```

## Verification

### 1. Check Secrets Loading
```typescript
import { environmentConfig } from './config/environment';

// Check if secrets are loaded
console.log('Has secrets:', environmentConfig.hasSecrets());
console.log('Is initialized:', environmentConfig.isConfigInitialized());

// Get diagnostics
const diagnostics = await environmentConfig.getSecretsDiagnostics();
console.log('Secrets diagnostics:', diagnostics);
```

### 2. Test Encryption
```typescript
import { enhancedSecureStorage } from './utils/secure-storage-enhanced';

// Test storage operations
await enhancedSecureStorage.setUserData({ test: 'data' });
const retrieved = await enhancedSecureStorage.getUserData();
console.log('Storage test:', retrieved);
```

### 3. Verify No Hardcoded Keys
Run the verification script:
```bash
cd /path/to/your/app
node ../../scripts/verify-no-hardcoded-keys.js
```

## Rollback Plan

If issues arise, you can temporarily rollback:

1. **Restore backup environment files**:
   ```bash
   cp .env.production.backup.YYYYMMDD_HHMMSS .env.production
   ```

2. **Use fallback configuration**:
   The new system includes fallback to environment variables if secrets are unavailable.

3. **Clear encrypted cache**:
   ```typescript
   await enhancedSecureStorage.clearAll();
   ```

## Support

- Check logs for initialization errors
- Use diagnostics methods for troubleshooting
- Verify AWS secrets are properly configured
- Ensure network connectivity for initial secret fetch

Remember: The app will work offline after initial secret fetch thanks to secure caching.
EOF

    log_success "Created migration guide for $app_name"
}

# Migrate a single app
migrate_app() {
    local app_name="$1"
    
    log_info "Starting migration for $app_name..."
    
    if ! check_app_exists "$app_name"; then
        log_warning "Skipping $app_name - directory not found"
        return 0
    fi
    
    # Backup existing files
    backup_env_files "$app_name"
    
    # Create secure environment template
    create_secure_env_template "$app_name"
    
    # Copy security services
    copy_secrets_manager "$app_name"
    copy_secure_storage "$app_name"
    
    # Update dependencies
    update_dependencies "$app_name"
    
    # Create migration guide
    create_migration_guide "$app_name"
    
    log_success "Migration completed for $app_name"
}

# Main migration function
main() {
    log_info "Starting Mobile Security Migration..."
    log_info "Project root: $PROJECT_ROOT"
    log_info "Apps directory: $APPS_DIR"
    
    # Check prerequisites
    if [[ ! -d "$APPS_DIR" ]]; then
        log_error "Apps directory not found: $APPS_DIR"
        exit 1
    fi
    
    # Check if template files exist
    if [[ ! -f "$APPS_DIR/mobile-security-dashboard/src/services/mobile-secrets-manager.ts" ]]; then
        log_error "Template mobile secrets manager not found. Run this script from mobile-security-dashboard first."
        exit 1
    fi
    
    local failed_migrations=0
    local total_apps=${#MOBILE_APPS[@]}
    
    # Migrate each app
    for app_name in "${MOBILE_APPS[@]}"; do
        echo ""
        log_info "Processing app: $app_name ($((++processed))/$total_apps)"
        
        if migrate_app "$app_name"; then
            log_success "✓ $app_name migrated successfully"
        else
            log_error "✗ Failed to migrate $app_name"
            ((failed_migrations++))
        fi
    done
    
    # Summary
    echo ""
    log_info "Migration Summary:"
    log_info "Total apps: $total_apps"
    log_success "Successful migrations: $((total_apps - failed_migrations))"
    
    if [[ $failed_migrations -gt 0 ]]; then
        log_error "Failed migrations: $failed_migrations"
        echo ""
        log_warning "Some migrations failed. Check the logs above for details."
        log_info "Next steps:"
        log_info "1. Review and fix any failed migrations"
        log_info "2. Update AWS Secrets Manager with required secrets"
        log_info "3. Run verification script: scripts/verify-no-hardcoded-keys.sh"
        log_info "4. Test apps thoroughly before deployment"
        exit 1
    else
        echo ""
        log_success "All migrations completed successfully!"
        log_info "Next steps:"
        log_info "1. Update AWS Secrets Manager with required secrets"
        log_info "2. Run verification script: scripts/verify-no-hardcoded-keys.sh"
        log_info "3. Test apps thoroughly before deployment"
        log_info "4. Deploy with new secure configuration"
    fi
}

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [app_name|all]"
    echo ""
    echo "Available apps:"
    printf "  %s\n" "${MOBILE_APPS[@]}"
    echo ""
    echo "Examples:"
    echo "  $0 all                          # Migrate all apps"
    echo "  $0 mobile-security-dashboard    # Migrate specific app"
    exit 0
fi

# Handle command line arguments
if [[ "$1" == "all" ]]; then
    main
else
    # Migrate specific app
    migrate_app "$1"
fi