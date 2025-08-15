# Paintbox Mobile

A comprehensive React Native mobile application for paint estimation and project management, designed for field estimators and managers in the painting industry.

## 🚀 Features

### Core Functionality
- **Offline-First Architecture**: Work seamlessly without internet connection
- **Real-Time Synchronization**: Automatic sync when connectivity is restored
- **iPad Optimization**: Designed for professional use on tablets
- **Field-Ready UI**: Touch-optimized interface for outdoor work conditions

### Project Management
- Complete project lifecycle management
- Real-time status updates and collaboration
- GPS location tracking for site visits
- Weather risk assessment and alerts

### Photo Documentation
- **Company Cam Integration**: Seamless photo sync with Company Cam platform
- **WW Tag System**: Industry-standard tagging (WW1-WW30)
- **Photo Annotation**: Touch-based annotation with Apple Pencil support
- **Offline Photo Queue**: Photos captured offline sync automatically

### Measurement & Estimation
- Touch-optimized measurement entry
- Elevation-based organization (matching web platform)
- Real-time pricing calculations
- Three-tier pricing (Good/Better/Best)

### Manager Features
- **Approval Workflows**: Discount and pricing approvals
- **Push Notifications**: Real-time approval requests
- **Margin Visibility**: Profit margin calculations
- **Team Monitoring**: Real-time crew location and status

## 🏗 Architecture

### Technology Stack
- **React Native 0.81+** with TypeScript
- **Apollo Client** with offline support
- **React Navigation 6** for navigation
- **AsyncStorage** for local data persistence
- **React Native Vision Camera** for photo capture
- **AWS SDK** for secure credential management

### GraphQL Integration
- Connects to Apollo Federation GraphQL API
- Offline-first caching strategy
- Real-time subscriptions for collaboration
- Optimistic UI updates

### Security
- **AWS Secrets Manager** integration
- **Keychain/Keystore** for credential storage
- **Biometric authentication** support
- **Certificate pinning** for API connections

## 📱 Platform Support

### iOS (Primary)
- iOS 13.0+
- iPad Pro optimization
- Apple Pencil support
- Background app refresh
- Push notifications (APNS)

### Android
- Android API 21+ (Android 5.0)
- Large screen support
- Background sync
- Push notifications (Firebase)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native CLI
- iOS: Xcode 14+, CocoaPods
- Android: Android Studio, Java 11+

### Installation

1. **Clone the repository**
   ```bash
   cd /path/to/paintbox/mobile/PaintboxMobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure AWS credentials and API endpoints
   vim .env
   ```

4. **Run on iOS**
   ```bash
   npx react-native run-ios
   ```

5. **Run on Android**
   ```bash
   npx react-native run-android
   ```

## 📋 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components
│   ├── measurement/     # Measurement-specific components  
│   ├── projects/        # Project management components
│   ├── gallery/         # Photo gallery components
│   └── manager/         # Manager approval components
├── screens/             # Screen components
├── navigation/          # Navigation configuration
├── services/            # Business logic and API services
│   ├── apolloClient.ts  # GraphQL client setup
│   ├── awsCredentials.ts # AWS credential management
│   ├── offlineSync.ts   # Offline synchronization
│   └── cameraService.ts # Photo capture service
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── store/              # State management
```

## 🔧 Configuration

### Environment Variables
```bash
# GraphQL API
GRAPHQL_ENDPOINT=https://api.paintbox.candlefish.ai/graphql
GRAPHQL_WS_ENDPOINT=wss://api.paintbox.candlefish.ai/graphql

# AWS Configuration
AWS_REGION=us-east-1
AWS_SECRET_NAME=paintbox/mobile/api-keys

# Company Cam
COMPANY_CAM_API_URL=https://api.companycam.com/v2
COMPANY_CAM_WEBHOOK_SECRET=your-webhook-secret

# Push Notifications
FCM_SENDER_ID=your-fcm-sender-id
APNS_TEAM_ID=your-apns-team-id
```

## 📱 Field Usage Guide

### Offline Operation
1. **Pre-Sync Data**: Download projects and estimates before going offline
2. **Photo Capture**: Photos are stored locally and queued for upload
3. **Measurement Entry**: All measurements saved locally with auto-sync
4. **GPS Tracking**: Location data cached for photo tagging

### iPad Optimization
- **Split Screen**: Measurements and photos side-by-side
- **Apple Pencil**: Annotation and sketching support
- **Landscape Mode**: Optimized for landscape orientation
- **External Keyboard**: Shortcut key support

### Company Cam Workflow
1. **Project Sync**: Sync project from Company Cam using project ID
2. **Photo Capture**: Photos automatically tagged with WW codes
3. **Annotation**: Add measurements and notes to photos
4. **Background Sync**: Photos upload to Company Cam when online

## 🔐 Security Features

### Data Protection
- **Encryption at Rest**: Local data encrypted with device keychain
- **Transport Security**: TLS 1.3 with certificate pinning
- **Credential Management**: AWS Secrets Manager integration
- **Biometric Auth**: Face ID/Touch ID for app access

## 📊 Performance Monitoring

### Metrics Tracked
- App launch time
- Screen transition performance
- Network request latency
- Offline sync queue size
- Memory usage patterns
- Crash reports

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Follow TypeScript and ESLint rules
3. Write tests for new functionality
4. Update documentation
5. Submit pull request for review

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with React Native rules
- **Prettier**: Consistent code formatting
- **Testing**: Jest + React Native Testing Library

## 📄 License

Copyright © 2024 Candlefish AI. All rights reserved.

## 🗓 Release Notes

### Version 1.0.0 (Initial Release)
- Complete project management workflow
- Offline-first architecture with sync
- Company Cam integration
- iPad optimization with Apple Pencil support
- Manager approval workflows
- Real-time collaboration features

### Planned Features (v1.1.0)
- Advanced weather integration
- AI-powered measurement suggestions
- Enhanced photo analysis
- Automated report generation
- Multi-language support