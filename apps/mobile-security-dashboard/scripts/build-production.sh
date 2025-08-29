#!/bin/bash
# Production Build Script for Mobile Security Dashboard
# This script builds production versions of the mobile app for both iOS and Android

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Mobile Security Dashboard"
IOS_BUNDLE_ID="com.candlefish.security.dashboard"
ANDROID_PACKAGE="com.candlefish.security.dashboard"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Building $PROJECT_NAME (Production)${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo -e "${RED}Error: This script must be run from the mobile app root directory${NC}"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}Error: EAS CLI is not installed${NC}"
    echo -e "${YELLOW}Install it with: npm install -g eas-cli${NC}"
    exit 1
fi

# Check if user is logged in to EAS
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}You need to log in to EAS first${NC}"
    eas login
fi

# Function to create iOS production build
build_ios() {
    echo -e "${BLUE}Building iOS Production App...${NC}"
    
    # Check for iOS credentials
    echo -e "${YELLOW}Checking iOS credentials...${NC}"
    eas credentials:list --platform=ios || {
        echo -e "${RED}No iOS credentials found. Setting up credentials...${NC}"
        eas credentials --platform=ios
    }
    
    # Build iOS app
    echo -e "${BLUE}Starting iOS build...${NC}"
    eas build --platform ios --profile production --non-interactive
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ iOS build completed successfully${NC}"
    else
        echo -e "${RED}✗ iOS build failed${NC}"
        return 1
    fi
}

# Function to create Android production build (AAB for Play Store)
build_android_aab() {
    echo -e "${BLUE}Building Android AAB for Google Play Store...${NC}"
    
    # Check for Android credentials
    echo -e "${YELLOW}Checking Android credentials...${NC}"
    eas credentials:list --platform=android || {
        echo -e "${RED}No Android credentials found. Setting up credentials...${NC}"
        eas credentials --platform=android
    }
    
    # Build Android AAB
    echo -e "${BLUE}Starting Android AAB build...${NC}"
    eas build --platform android --profile production-aab --non-interactive
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Android AAB build completed successfully${NC}"
    else
        echo -e "${RED}✗ Android AAB build failed${NC}"
        return 1
    fi
}

# Function to create Android production build (APK for sideloading/testing)
build_android_apk() {
    echo -e "${BLUE}Building Android APK for testing/sideloading...${NC}"
    
    # Build Android APK
    echo -e "${BLUE}Starting Android APK build...${NC}"
    eas build --platform android --profile production-apk --non-interactive
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Android APK build completed successfully${NC}"
    else
        echo -e "${RED}✗ Android APK build failed${NC}"
        return 1
    fi
}

# Function to generate release notes
generate_release_notes() {
    echo -e "${BLUE}Generating release notes...${NC}"
    
    RELEASE_NOTES_FILE="RELEASE_NOTES.md"
    VERSION=$(grep '"version"' package.json | head -1 | awk -F '"' '{print $4}')
    BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S UTC')
    
    cat > "$RELEASE_NOTES_FILE" << EOF
# Mobile Security Dashboard v$VERSION

**Build Date:** $BUILD_DATE

## What's New

- Enhanced biometric authentication with Face ID and Touch ID support
- Real-time push notifications for critical security alerts
- Offline-first data synchronization with automatic background sync
- Location-based threat alerting and geofencing
- Advanced security hardening with root/jailbreak detection
- Comprehensive crash reporting and error monitoring
- Demo mode with guided tour for new users

## Security Features

- 🔐 **Biometric Authentication**: Secure app access with Face ID, Touch ID, or fingerprint
- 🛡️ **Device Security**: Advanced root/jailbreak detection and tamper prevention
- 🔒 **Data Encryption**: All sensitive data encrypted with device-specific keys
- 📍 **Location Security**: Geofencing and location-based threat detection
- 🚨 **Real-time Alerts**: Instant push notifications for critical security events

## Platform Support

- **iOS**: 13.0+ (iPhone and iPad)
- **Android**: API level 21+ (Android 5.0+)

## Build Information

- **iOS Bundle ID**: $IOS_BUNDLE_ID
- **Android Package**: $ANDROID_PACKAGE
- **Environment**: Production
- **Build Type**: Release

## Installation

### iOS (App Store)
1. Download from the App Store
2. Open the app and complete the setup process
3. Enable biometric authentication when prompted
4. Allow push notifications for security alerts

### Android (Google Play Store)
1. Download from Google Play Store
2. Open the app and complete the setup process
3. Enable fingerprint authentication when prompted
4. Allow push notifications for security alerts

## Configuration

The app will automatically detect your environment and configure itself for production use. Key features:

- **API Endpoint**: https://security-api.candlefish.ai
- **Push Notifications**: Firebase Cloud Messaging
- **Crash Reporting**: Integrated error monitoring
- **Security Hardening**: Enabled for production builds

## Support

For technical support or questions:
- Email: support@candlefish.ai
- Documentation: https://docs.candlefish.ai/mobile-security-dashboard

## Privacy & Security

This app implements privacy-by-design principles:
- No data collection without explicit consent
- All sensitive data encrypted locally
- Minimal permissions requested
- Optional location services for enhanced security

Built with security best practices for enterprise use.
EOF

    echo -e "${GREEN}✓ Release notes generated: $RELEASE_NOTES_FILE${NC}"
}

# Function to create build metadata
create_build_metadata() {
    echo -e "${BLUE}Creating build metadata...${NC}"
    
    VERSION=$(grep '"version"' package.json | head -1 | awk -F '"' '{print $4}')
    BUILD_NUMBER=$(grep '"buildNumber"' app.json | head -1 | awk -F '"' '{print $4}' || echo "1")
    BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S UTC')
    GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    
    cat > "build-metadata.json" << EOF
{
  "version": "$VERSION",
  "buildNumber": "$BUILD_NUMBER",
  "buildDate": "$BUILD_DATE",
  "git": {
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH"
  },
  "platform": {
    "ios": {
      "bundleId": "$IOS_BUNDLE_ID",
      "buildConfiguration": "Release"
    },
    "android": {
      "package": "$ANDROID_PACKAGE",
      "buildType": "release"
    }
  },
  "environment": "production"
}
EOF

    echo -e "${GREEN}✓ Build metadata created: build-metadata.json${NC}"
}

# Function to clean up before build
cleanup_before_build() {
    echo -e "${BLUE}Cleaning up before build...${NC}"
    
    # Clean npm/yarn cache
    if command -v yarn &> /dev/null; then
        yarn cache clean
    else
        npm cache clean --force
    fi
    
    # Clean iOS build artifacts if they exist
    if [ -d "ios" ]; then
        rm -rf ios/build
    fi
    
    # Clean Android build artifacts if they exist  
    if [ -d "android" ]; then
        cd android && ./gradlew clean && cd ..
    fi
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Function to run pre-build checks
run_prebuild_checks() {
    echo -e "${BLUE}Running pre-build checks...${NC}"
    
    # Check if required files exist
    REQUIRED_FILES=("app.json" "package.json" ".env.production")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Error: Required file '$file' not found${NC}"
            exit 1
        fi
    done
    
    # Check if Firebase config exists
    if [ ! -f "google-services.json" ] && [ ! -f "google-services.json.template" ]; then
        echo -e "${YELLOW}Warning: google-services.json not found. Make sure to add Firebase configuration.${NC}"
    fi
    
    if [ ! -f "GoogleService-Info.plist" ] && [ ! -f "GoogleService-Info.plist.template" ]; then
        echo -e "${YELLOW}Warning: GoogleService-Info.plist not found. Make sure to add Firebase configuration.${NC}"
    fi
    
    echo -e "${GREEN}✓ Pre-build checks completed${NC}"
}

# Function to display build summary
display_build_summary() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}       BUILD SUMMARY${NC}"
    echo -e "${BLUE}======================================${NC}"
    
    VERSION=$(grep '"version"' package.json | head -1 | awk -F '"' '{print $4}')
    echo -e "${GREEN}App Version:${NC} $VERSION"
    echo -e "${GREEN}Build Date:${NC} $(date '+%Y-%m-%d %H:%M:%S UTC')"
    echo -e "${GREEN}Environment:${NC} Production"
    
    if [ "$BUILD_IOS" = "true" ]; then
        echo -e "${GREEN}✓ iOS build requested${NC}"
    fi
    
    if [ "$BUILD_ANDROID_AAB" = "true" ]; then
        echo -e "${GREEN}✓ Android AAB build requested${NC}"
    fi
    
    if [ "$BUILD_ANDROID_APK" = "true" ]; then
        echo -e "${GREEN}✓ Android APK build requested${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Ready to start building. This may take 10-20 minutes.${NC}"
    echo -e "${YELLOW}You can monitor progress at: https://expo.dev/accounts/candlefish/projects${NC}"
    echo ""
}

# Parse command line arguments
BUILD_IOS=false
BUILD_ANDROID_AAB=false
BUILD_ANDROID_APK=false
SKIP_PREBUILD_CHECKS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --ios)
            BUILD_IOS=true
            shift
            ;;
        --android-aab)
            BUILD_ANDROID_AAB=true
            shift
            ;;
        --android-apk)
            BUILD_ANDROID_APK=true
            shift
            ;;
        --all)
            BUILD_IOS=true
            BUILD_ANDROID_AAB=true
            BUILD_ANDROID_APK=true
            shift
            ;;
        --skip-checks)
            SKIP_PREBUILD_CHECKS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --ios              Build iOS app"
            echo "  --android-aab      Build Android AAB (Google Play)"
            echo "  --android-apk      Build Android APK (testing/sideloading)"
            echo "  --all              Build all platforms"
            echo "  --skip-checks      Skip pre-build checks"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --all                    # Build all platforms"
            echo "  $0 --ios --android-aab      # Build iOS and Android AAB"
            echo "  $0 --android-apk            # Build only Android APK"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Default to building all if no specific platform is requested
if [ "$BUILD_IOS" = false ] && [ "$BUILD_ANDROID_AAB" = false ] && [ "$BUILD_ANDROID_APK" = false ]; then
    BUILD_IOS=true
    BUILD_ANDROID_AAB=true
    BUILD_ANDROID_APK=true
fi

# Display build summary
display_build_summary

# Ask for confirmation
read -p "Do you want to proceed with the build? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Build cancelled${NC}"
    exit 0
fi

# Run pre-build checks
if [ "$SKIP_PREBUILD_CHECKS" = false ]; then
    run_prebuild_checks
fi

# Clean up before build
cleanup_before_build

# Generate build metadata
create_build_metadata

# Build platforms
BUILDS_SUCCESSFUL=0
BUILDS_FAILED=0

if [ "$BUILD_IOS" = true ]; then
    if build_ios; then
        ((BUILDS_SUCCESSFUL++))
    else
        ((BUILDS_FAILED++))
    fi
fi

if [ "$BUILD_ANDROID_AAB" = true ]; then
    if build_android_aab; then
        ((BUILDS_SUCCESSFUL++))
    else
        ((BUILDS_FAILED++))
    fi
fi

if [ "$BUILD_ANDROID_APK" = true ]; then
    if build_android_apk; then
        ((BUILDS_SUCCESSFUL++))
    else
        ((BUILDS_FAILED++))
    fi
fi

# Generate release notes
generate_release_notes

# Final summary
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}       FINAL RESULTS${NC}"
echo -e "${BLUE}======================================${NC}"

if [ $BUILDS_SUCCESSFUL -gt 0 ]; then
    echo -e "${GREEN}✓ Successful builds: $BUILDS_SUCCESSFUL${NC}"
fi

if [ $BUILDS_FAILED -gt 0 ]; then
    echo -e "${RED}✗ Failed builds: $BUILDS_FAILED${NC}"
fi

echo ""
echo -e "${GREEN}Release notes generated: RELEASE_NOTES.md${NC}"
echo -e "${GREEN}Build metadata: build-metadata.json${NC}"
echo ""

if [ $BUILDS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All builds completed successfully!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Download builds from: https://expo.dev/accounts/candlefish/projects"
    echo -e "2. Test the builds on physical devices"
    echo -e "3. Submit to app stores using: eas submit"
    exit 0
else
    echo -e "${RED}Some builds failed. Check the logs above for details.${NC}"
    exit 1
fi