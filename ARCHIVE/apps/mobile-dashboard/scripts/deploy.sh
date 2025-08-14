#!/bin/bash

# Tyler Setup Mobile App Deployment Script
# This script automates the build and deployment process for both iOS and Android

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Tyler Setup Mobile Dashboard"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="./builds"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "  $APP_NAME"
    echo "  Deployment Script v$VERSION"
    echo "=================================="
    echo -e "${NC}"
}

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --platform [ios|android|all]    Platform to build (default: all)"
    echo "  --profile [development|preview|production]    Build profile (default: production)"
    echo "  --submit                         Submit to app stores after build"
    echo "  --auto-increment                 Auto increment build number"
    echo "  --clean                          Clean before build"
    echo "  --help                           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --platform ios --profile production --submit"
    echo "  $0 --platform android --profile preview"
    echo "  $0 --clean --auto-increment"
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Please run this script from the app root directory."
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi

    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        warning "Expo CLI not found globally. Installing..."
        npm install -g @expo/cli
    fi

    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        warning "EAS CLI not found globally. Installing..."
        npm install -g eas-cli
    fi

    success "Prerequisites check completed"
}

check_environment() {
    log "Checking environment configuration..."

    if [[ ! -f ".env" ]]; then
        warning ".env file not found. Using .env.example as template..."
        cp .env.example .env
    fi

    # Check required environment variables
    source .env

    if [[ -z "$GRAPHQL_ENDPOINT" ]]; then
        error "GRAPHQL_ENDPOINT is not set in .env file"
    fi

    success "Environment configuration is valid"
}

install_dependencies() {
    log "Installing dependencies..."

    npm ci

    if [[ "$PLATFORM" == "ios" ]] || [[ "$PLATFORM" == "all" ]]; then
        if [[ -d "ios" ]]; then
            log "Installing iOS dependencies..."
            cd ios
            pod install --quiet
            cd ..
        fi
    fi

    success "Dependencies installed"
}

lint_and_test() {
    log "Running linting and tests..."

    # Run TypeScript check
    npm run typecheck

    # Run linting
    npm run lint

    # Run tests
    npm run test -- --coverage --watchAll=false

    success "All checks passed"
}

increment_build_number() {
    if [[ "$AUTO_INCREMENT" == "true" ]]; then
        log "Auto-incrementing build number..."

        # Read current version from app.json
        CURRENT_VERSION=$(node -p "require('./app.json').expo.version")
        BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber")
        VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode")

        # Increment build numbers
        NEW_BUILD_NUMBER=$((BUILD_NUMBER + 1))
        NEW_VERSION_CODE=$((VERSION_CODE + 1))

        # Update app.json
        node -e "
        const fs = require('fs');
        const appConfig = require('./app.json');
        appConfig.expo.ios.buildNumber = '$NEW_BUILD_NUMBER';
        appConfig.expo.android.versionCode = $NEW_VERSION_CODE;
        fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
        "

        success "Build numbers updated: iOS=$NEW_BUILD_NUMBER, Android=$NEW_VERSION_CODE"
    fi
}

clean_build_artifacts() {
    if [[ "$CLEAN" == "true" ]]; then
        log "Cleaning build artifacts..."

        rm -rf node_modules
        rm -rf .expo
        rm -rf $BUILD_DIR

        if [[ -d "ios" ]]; then
            cd ios
            rm -rf Pods
            rm -rf build
            rm -rf DerivedData
            cd ..
        fi

        if [[ -d "android" ]]; then
            cd android
            ./gradlew clean || true
            cd ..
        fi

        success "Build artifacts cleaned"
    fi
}

create_build_directory() {
    log "Creating build directory..."

    mkdir -p $BUILD_DIR

    # Create build info file
    cat > $BUILD_DIR/build-info.json << EOF
{
  "appName": "$APP_NAME",
  "version": "$VERSION",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "$PLATFORM",
  "profile": "$PROFILE",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

    success "Build directory created"
}

build_ios() {
    if [[ "$PLATFORM" == "ios" ]] || [[ "$PLATFORM" == "all" ]]; then
        log "Building iOS app..."

        eas build --platform ios --profile $PROFILE --non-interactive --wait

        if [[ "$SUBMIT" == "true" ]] && [[ "$PROFILE" == "production" ]]; then
            log "Submitting iOS app to App Store..."
            eas submit --platform ios --profile production --non-interactive
        fi

        success "iOS build completed"
    fi
}

build_android() {
    if [[ "$PLATFORM" == "android" ]] || [[ "$PLATFORM" == "all" ]]; then
        log "Building Android app..."

        eas build --platform android --profile $PROFILE --non-interactive --wait

        if [[ "$SUBMIT" == "true" ]] && [[ "$PROFILE" == "production" ]]; then
            log "Submitting Android app to Google Play..."
            eas submit --platform android --profile production --non-interactive
        fi

        success "Android build completed"
    fi
}

generate_release_notes() {
    log "Generating release notes..."

    RELEASE_NOTES_FILE="$BUILD_DIR/release-notes-v$VERSION.md"

    cat > $RELEASE_NOTES_FILE << EOF
# $APP_NAME v$VERSION Release Notes

**Build Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Platform**: $PLATFORM
**Profile**: $PROFILE

## What's New

### Features
- New feature implementations
- UI/UX improvements
- Performance optimizations

### Bug Fixes
- Critical bug fixes
- Minor issue resolutions

### Technical Changes
- Dependencies updated
- Security improvements
- Code optimizations

---

## Build Information

- **Git Commit**: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
- **Git Branch**: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')
- **Build Profile**: $PROFILE
- **React Native Version**: $(node -p "require('./package.json').dependencies['react-native']")
- **Expo SDK Version**: $(node -p "require('./package.json').dependencies['expo']")

## Testing

- ✅ Unit Tests: $(npm test -- --passWithNoTests --silent 2>&1 | grep -c "✓" || echo "N/A") passed
- ✅ TypeScript: No type errors
- ✅ Linting: All checks passed
- ✅ Build: Successful for $PLATFORM

EOF

    success "Release notes generated: $RELEASE_NOTES_FILE"
}

post_build_actions() {
    log "Performing post-build actions..."

    # Generate build summary
    echo -e "\n${GREEN}Build Summary:${NC}"
    echo "  App: $APP_NAME"
    echo "  Version: $VERSION"
    echo "  Platform: $PLATFORM"
    echo "  Profile: $PROFILE"
    echo "  Build Date: $(date)"

    if [[ "$SUBMIT" == "true" ]]; then
        echo "  Status: Built and submitted to app stores"
    else
        echo "  Status: Built successfully"
    fi

    # Archive build logs
    if [[ -f "eas-build.log" ]]; then
        mv eas-build.log $BUILD_DIR/eas-build-$(date +%Y%m%d-%H%M%S).log
    fi

    success "Post-build actions completed"
}

cleanup() {
    log "Cleaning up temporary files..."

    # Clean up any temporary files created during build
    rm -f *.log.tmp
    rm -rf .tmp

    success "Cleanup completed"
}

# Main execution
main() {
    print_header

    # Parse command line arguments
    PLATFORM="all"
    PROFILE="production"
    SUBMIT="false"
    AUTO_INCREMENT="false"
    CLEAN="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --platform)
                PLATFORM="$2"
                shift 2
                ;;
            --profile)
                PROFILE="$2"
                shift 2
                ;;
            --submit)
                SUBMIT="true"
                shift
                ;;
            --auto-increment)
                AUTO_INCREMENT="true"
                shift
                ;;
            --clean)
                CLEAN="true"
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Validate platform argument
    if [[ "$PLATFORM" != "ios" ]] && [[ "$PLATFORM" != "android" ]] && [[ "$PLATFORM" != "all" ]]; then
        error "Invalid platform. Must be 'ios', 'android', or 'all'"
    fi

    # Validate profile argument
    if [[ "$PROFILE" != "development" ]] && [[ "$PROFILE" != "preview" ]] && [[ "$PROFILE" != "production" ]]; then
        error "Invalid profile. Must be 'development', 'preview', or 'production'"
    fi

    log "Starting deployment process..."
    log "Platform: $PLATFORM"
    log "Profile: $PROFILE"
    log "Submit: $SUBMIT"

    # Execute build pipeline
    check_prerequisites
    check_environment
    clean_build_artifacts
    install_dependencies
    lint_and_test
    increment_build_number
    create_build_directory

    # Build for specified platforms
    build_ios
    build_android

    # Post-build tasks
    generate_release_notes
    post_build_actions
    cleanup

    success "🎉 Deployment completed successfully!"

    if [[ "$SUBMIT" == "true" ]]; then
        log "Your app has been submitted to the app stores."
        log "Monitor the submission status in App Store Connect and Google Play Console."
    else
        log "Your app has been built successfully."
        log "Run with --submit flag to automatically submit to app stores."
    fi
}

# Handle script interruption
trap 'error "Script interrupted"' INT TERM

# Run main function
main "$@"
