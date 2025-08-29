#!/bin/bash
# Code Signing Setup Script for Mobile Security Dashboard
# This script helps set up code signing for both iOS and Android platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Code Signing Setup${NC}"
echo -e "${BLUE}======================================${NC}"

# Configuration
IOS_BUNDLE_ID="com.candlefish.security.dashboard"
ANDROID_PACKAGE="com.candlefish.security.dashboard"
KEYSTORE_ALIAS="candlefish-security-dashboard"

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

# Function to setup iOS code signing
setup_ios_signing() {
    echo -e "${BLUE}Setting up iOS code signing...${NC}"
    
    echo -e "${YELLOW}iOS Code Signing Requirements:${NC}"
    echo "1. Apple Developer Account"
    echo "2. App Store Connect App ID"
    echo "3. Distribution Certificate"
    echo "4. Provisioning Profiles"
    echo ""
    
    read -p "Do you want to set up iOS code signing? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping iOS code signing setup${NC}"
        return
    fi
    
    # Check existing iOS credentials
    echo -e "${BLUE}Checking existing iOS credentials...${NC}"
    eas credentials:list --platform=ios || true
    
    echo ""
    echo -e "${YELLOW}Setting up iOS credentials for bundle ID: $IOS_BUNDLE_ID${NC}"
    
    # Interactive setup
    eas credentials --platform=ios
    
    echo -e "${GREEN}✓ iOS code signing setup completed${NC}"
    
    # Create iOS signing documentation
    cat > "IOS_SIGNING_SETUP.md" << EOF
# iOS Code Signing Setup

## Bundle Identifier
- **Production**: $IOS_BUNDLE_ID
- **Staging**: $IOS_BUNDLE_ID.staging
- **Development**: $IOS_BUNDLE_ID.dev

## Required Certificates
1. **iOS Distribution Certificate**
   - Used for App Store builds
   - Valid for 1 year
   - Managed through EAS or Apple Developer Portal

2. **iOS Development Certificate**
   - Used for development builds
   - Valid for 1 year

## Provisioning Profiles
1. **App Store Distribution Profile**
   - For production App Store builds
   - Linked to distribution certificate

2. **Ad Hoc Distribution Profile**
   - For internal testing
   - Can include up to 100 test devices

3. **Development Profile**
   - For development builds
   - Includes registered development devices

## EAS Credentials Management
All iOS signing credentials are managed through EAS:

\`\`\`bash
# View current credentials
eas credentials:list --platform=ios

# Set up new credentials
eas credentials --platform=ios

# Configure for specific profile
eas credentials --platform=ios --profile=production
\`\`\`

## Manual Setup (if needed)
If you prefer to manage certificates manually:

1. Create certificates in Apple Developer Portal
2. Download and install certificates
3. Create provisioning profiles
4. Upload to EAS:

\`\`\`bash
eas credentials:configure --platform=ios
\`\`\`

## App Store Connect Setup
1. Create app in App Store Connect
2. Set bundle ID: $IOS_BUNDLE_ID
3. Configure app information
4. Set up TestFlight for beta testing

## Troubleshooting
- Ensure bundle ID matches exactly
- Check certificate expiration dates
- Verify provisioning profile includes all required capabilities
- Check team ID matches

## Build Commands
\`\`\`bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
\`\`\`
EOF
    
    echo -e "${GREEN}✓ iOS signing documentation created: IOS_SIGNING_SETUP.md${NC}"
}

# Function to setup Android code signing
setup_android_signing() {
    echo -e "${BLUE}Setting up Android code signing...${NC}"
    
    echo -e "${YELLOW}Android Code Signing Requirements:${NC}"
    echo "1. Google Play Console Developer Account"
    echo "2. App Signing Key (managed by Google Play)"
    echo "3. Upload Key (for uploading to Play Console)"
    echo "4. Service Account for automated uploads"
    echo ""
    
    read -p "Do you want to set up Android code signing? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping Android code signing setup${NC}"
        return
    fi
    
    # Check existing Android credentials
    echo -e "${BLUE}Checking existing Android credentials...${NC}"
    eas credentials:list --platform=android || true
    
    echo ""
    echo -e "${YELLOW}Setting up Android credentials for package: $ANDROID_PACKAGE${NC}"
    
    # Option to create new keystore or use existing
    echo -e "${YELLOW}Android Keystore Options:${NC}"
    echo "1. Let EAS generate and manage keystore (recommended)"
    echo "2. Upload existing keystore"
    echo "3. Generate keystore manually"
    echo ""
    
    read -p "Choose option (1-3): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            echo -e "${BLUE}Using EAS-managed keystore...${NC}"
            eas credentials --platform=android
            ;;
        2)
            echo -e "${BLUE}Upload existing keystore...${NC}"
            echo -e "${YELLOW}You'll need:${NC}"
            echo "- Keystore file (.jks or .keystore)"
            echo "- Keystore password"
            echo "- Key alias"
            echo "- Key password"
            echo ""
            eas credentials --platform=android
            ;;
        3)
            echo -e "${BLUE}Generating keystore manually...${NC}"
            generate_android_keystore
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            return 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Android code signing setup completed${NC}"
    
    # Create Android signing documentation
    cat > "ANDROID_SIGNING_SETUP.md" << EOF
# Android Code Signing Setup

## Package Name
- **Production**: $ANDROID_PACKAGE
- **Staging**: $ANDROID_PACKAGE.staging
- **Development**: $ANDROID_PACKAGE.dev

## Keystore Information
- **Alias**: $KEYSTORE_ALIAS
- **Key Algorithm**: RSA
- **Key Size**: 2048 bits
- **Validity**: 25 years

## Google Play App Signing
Google Play Console manages your app signing key:

1. **App Signing Key**: Managed by Google Play
2. **Upload Key**: Used to sign APKs/AABs for upload
3. **Service Account**: For automated uploads

## EAS Credentials Management
All Android signing credentials are managed through EAS:

\`\`\`bash
# View current credentials
eas credentials:list --platform=android

# Set up new credentials
eas credentials --platform=android

# Configure for specific profile
eas credentials --platform=android --profile=production
\`\`\`

## Manual Keystore Generation
If you generated a keystore manually:

\`\`\`bash
keytool -genkeypair -v -keystore security-dashboard.keystore \\
  -alias $KEYSTORE_ALIAS \\
  -keyalg RSA \\
  -keysize 2048 \\
  -validity 9125 \\
  -storepass [STORE_PASSWORD] \\
  -keypass [KEY_PASSWORD] \\
  -dname "CN=Candlefish Security Dashboard, O=Candlefish, L=City, ST=State, C=US"
\`\`\`

## Google Play Console Setup
1. Create app in Google Play Console
2. Set package name: $ANDROID_PACKAGE
3. Upload app signing certificate
4. Set up internal/closed testing tracks
5. Create service account for automated uploads

## Service Account Setup
For automated submissions with \`eas submit\`:

1. Create service account in Google Cloud Console
2. Enable Google Play Developer API
3. Grant necessary permissions in Play Console
4. Download service account JSON
5. Save as \`google-play-service-account.json\`

## Build Commands
\`\`\`bash
# Development build
eas build --platform android --profile development

# Production AAB (for Play Store)
eas build --platform android --profile production-aab

# Production APK (for testing/sideloading)
eas build --platform android --profile production-apk
\`\`\`

## Submission Commands
\`\`\`bash
# Submit to Google Play (internal track)
eas submit --platform android --profile staging

# Submit to Google Play (production track)
eas submit --platform android --profile production
\`\`\`

## Troubleshooting
- Ensure package name matches exactly
- Check keystore password and alias
- Verify service account permissions
- Check Google Play Console app setup
- Ensure upload key is registered with Google Play
EOF
    
    echo -e "${GREEN}✓ Android signing documentation created: ANDROID_SIGNING_SETUP.md${NC}"
}

# Function to generate Android keystore manually
generate_android_keystore() {
    echo -e "${BLUE}Generating Android keystore...${NC}"
    
    if ! command -v keytool &> /dev/null; then
        echo -e "${RED}Error: keytool not found. Please install Java JDK${NC}"
        return 1
    fi
    
    KEYSTORE_FILE="security-dashboard.keystore"
    
    # Prompt for keystore information
    echo -e "${YELLOW}Enter keystore information:${NC}"
    read -p "Store password (hidden): " -s STORE_PASSWORD
    echo
    read -p "Key password (hidden): " -s KEY_PASSWORD
    echo
    read -p "Your name: " DNAME_CN
    read -p "Organization: " DNAME_O
    read -p "City: " DNAME_L
    read -p "State/Province: " DNAME_ST
    read -p "Country (2 letters): " DNAME_C
    
    # Generate keystore
    echo -e "${BLUE}Generating keystore: $KEYSTORE_FILE${NC}"
    keytool -genkeypair -v -keystore "$KEYSTORE_FILE" \
        -alias "$KEYSTORE_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 9125 \
        -storepass "$STORE_PASSWORD" \
        -keypass "$KEY_PASSWORD" \
        -dname "CN=$DNAME_CN, O=$DNAME_O, L=$DNAME_L, ST=$DNAME_ST, C=$DNAME_C"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Keystore generated successfully: $KEYSTORE_FILE${NC}"
        echo -e "${YELLOW}IMPORTANT: Store the keystore file and passwords securely!${NC}"
        echo -e "${YELLOW}You'll need to upload this keystore to EAS:${NC}"
        echo -e "eas credentials --platform=android"
    else
        echo -e "${RED}✗ Failed to generate keystore${NC}"
        return 1
    fi
}

# Function to setup service account for Google Play
setup_google_play_service_account() {
    echo -e "${BLUE}Setting up Google Play Service Account...${NC}"
    
    echo -e "${YELLOW}Google Play Service Account Setup:${NC}"
    echo "1. Go to Google Cloud Console"
    echo "2. Create a new project or select existing"
    echo "3. Enable Google Play Developer API"
    echo "4. Create service account"
    echo "5. Download JSON key file"
    echo "6. Grant permissions in Google Play Console"
    echo ""
    
    read -p "Have you completed the above steps? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Please complete the service account setup first${NC}"
        echo -e "${YELLOW}Detailed instructions: https://docs.expo.dev/submit/android/#{NC}"
        return
    fi
    
    read -p "Enter path to service account JSON file: " SERVICE_ACCOUNT_PATH
    
    if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
        cp "$SERVICE_ACCOUNT_PATH" "google-play-service-account.json"
        echo -e "${GREEN}✓ Service account file copied to google-play-service-account.json${NC}"
        echo -e "${YELLOW}This file is used by EAS Submit for automated uploads${NC}"
    else
        echo -e "${RED}Error: Service account file not found: $SERVICE_ACCOUNT_PATH${NC}"
    fi
}

# Function to verify code signing setup
verify_signing_setup() {
    echo -e "${BLUE}Verifying code signing setup...${NC}"
    
    echo -e "${YELLOW}iOS Credentials:${NC}"
    eas credentials:list --platform=ios || echo "No iOS credentials found"
    
    echo ""
    echo -e "${YELLOW}Android Credentials:${NC}"
    eas credentials:list --platform=android || echo "No Android credentials found"
    
    echo ""
    echo -e "${YELLOW}Files Check:${NC}"
    
    if [ -f "google-play-service-account.json" ]; then
        echo -e "${GREEN}✓ Google Play service account configured${NC}"
    else
        echo -e "${YELLOW}⚠ Google Play service account not configured${NC}"
    fi
    
    if [ -f "*.keystore" ] || [ -f "*.jks" ]; then
        echo -e "${GREEN}✓ Android keystore file found${NC}"
    else
        echo -e "${YELLOW}⚠ No local Android keystore found (may be managed by EAS)${NC}"
    fi
}

# Function to create signing summary
create_signing_summary() {
    echo -e "${BLUE}Creating signing summary...${NC}"
    
    cat > "CODE_SIGNING_SUMMARY.md" << EOF
# Code Signing Summary - Mobile Security Dashboard

## iOS Configuration
- **Bundle ID**: $IOS_BUNDLE_ID
- **Team ID**: [Set in EAS or Apple Developer Portal]
- **Certificates**: Managed by EAS
- **Provisioning Profiles**: Auto-generated by EAS

### Build Profiles
- **Development**: $IOS_BUNDLE_ID.dev
- **Staging**: $IOS_BUNDLE_ID.staging  
- **Production**: $IOS_BUNDLE_ID

## Android Configuration
- **Package Name**: $ANDROID_PACKAGE
- **Keystore Alias**: $KEYSTORE_ALIAS
- **Signing Method**: Google Play App Signing
- **Upload Key**: Managed by EAS

### Build Profiles
- **Development**: $ANDROID_PACKAGE.dev
- **Staging**: $ANDROID_PACKAGE.staging
- **Production**: $ANDROID_PACKAGE

## EAS Build Profiles

### iOS
\`\`\`json
"ios": {
  "bundleIdentifier": "$IOS_BUNDLE_ID",
  "buildConfiguration": "Release",
  "autoIncrement": "buildNumber"
}
\`\`\`

### Android
\`\`\`json
"android": {
  "buildType": "release",
  "gradleCommand": ":app:bundleRelease"
}
\`\`\`

## Automated Submission
- **iOS**: App Store Connect via EAS Submit
- **Android**: Google Play Console via EAS Submit
- **Service Account**: google-play-service-account.json

## Security Notes
- All private keys stored securely in EAS
- Keystore passwords encrypted
- Service account JSON should not be committed to git
- Regular certificate renewal required

## Quick Commands
\`\`\`bash
# Build all platforms
./scripts/build-production.sh --all

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production

# Check credentials
eas credentials:list --platform ios
eas credentials:list --platform android
\`\`\`

Generated on: $(date '+%Y-%m-%d %H:%M:%S UTC')
EOF

    echo -e "${GREEN}✓ Code signing summary created: CODE_SIGNING_SUMMARY.md${NC}"
}

# Main menu
show_main_menu() {
    echo -e "${YELLOW}Code Signing Setup Options:${NC}"
    echo "1. Setup iOS code signing"
    echo "2. Setup Android code signing"
    echo "3. Setup Google Play service account"
    echo "4. Verify signing setup"
    echo "5. Setup all platforms"
    echo "6. Exit"
    echo ""
    
    read -p "Choose an option (1-6): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            setup_ios_signing
            ;;
        2)
            setup_android_signing
            ;;
        3)
            setup_google_play_service_account
            ;;
        4)
            verify_signing_setup
            ;;
        5)
            setup_ios_signing
            setup_android_signing
            setup_google_play_service_account
            verify_signing_setup
            create_signing_summary
            ;;
        6)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            show_main_menu
            ;;
    esac
}

# Check if script arguments were provided
if [ $# -gt 0 ]; then
    case $1 in
        --ios)
            setup_ios_signing
            ;;
        --android)
            setup_android_signing
            ;;
        --service-account)
            setup_google_play_service_account
            ;;
        --verify)
            verify_signing_setup
            ;;
        --all)
            setup_ios_signing
            setup_android_signing
            setup_google_play_service_account
            verify_signing_setup
            create_signing_summary
            ;;
        --help|-h)
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  --ios              Setup iOS code signing"
            echo "  --android          Setup Android code signing"
            echo "  --service-account  Setup Google Play service account"
            echo "  --verify           Verify signing setup"
            echo "  --all              Setup everything"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "If no option is provided, an interactive menu will be shown."
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
else
    # Interactive mode
    show_main_menu
fi

echo -e "${GREEN}Code signing setup completed!${NC}"