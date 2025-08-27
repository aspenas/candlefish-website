# Candlefish Operational Maturity Map - Mobile App

A comprehensive React Native mobile application for conducting operational maturity assessments with offline capabilities, native features, and real-time synchronization.

## Features

### 📱 Core Mobile Experience
- **Bottom Tab Navigation** - Easy access to Dashboard, Assessments, Documents, and Settings
- **Stack Navigation** - Seamless flow through assessment creation and completion
- **Deep Linking** - Direct links to specific assessments and documents
- **iOS and Android Support** - Platform-specific optimizations and UI conventions

### 🔄 Offline-First Architecture
- **Local Data Storage** - SQLite with Redux Persist for offline data access
- **Sync Queue** - Automatic synchronization when network is restored
- **Conflict Resolution** - Smart merging of offline and server data
- **Offline Assessment Creation** - Continue working without internet connection

### 📊 Assessment Management
- **Interactive Question Flow** - Swipe gestures and progress tracking
- **Industry-Specific Assessments** - Tailored questions for different verticals
- **Real-Time Progress** - Live updates and completion tracking
- **Confidence Scoring** - User confidence levels for each response

### 📄 Document Capture
- **Camera Integration** - Native camera for document capture
- **Image Optimization** - Automatic compression and format conversion
- **File System Access** - Import documents from device storage
- **Document Processing** - AI-powered text extraction and analysis

### 🔐 Security & Authentication
- **Biometric Authentication** - Face ID, Touch ID, and fingerprint support
- **Secure Storage** - Encrypted local storage for sensitive data
- **Token Management** - Secure JWT handling with automatic refresh
- **PIN Fallback** - Alternative authentication method

### 🔔 Push Notifications
- **Assessment Reminders** - Scheduled notifications for pending assessments
- **Processing Updates** - Real-time status updates
- **Sync Notifications** - Offline data synchronization alerts
- **Custom Notifications** - Configurable notification preferences

### ⚡ Performance Optimizations
- **Image Compression** - Automatic optimization for mobile devices
- **Lazy Loading** - Progressive data loading and pagination
- **Background Processing** - Non-blocking operations for smooth UI
- **Memory Management** - Efficient resource usage and cleanup

## Technology Stack

### Core Framework
- **React Native** 0.72.0 with TypeScript
- **Expo SDK** 49.0 for native module access
- **React Navigation** 6.x for navigation

### State Management
- **Redux Toolkit** with RTK Query for state management
- **Redux Persist** for offline data persistence
- **Apollo Client** for GraphQL with offline support

### Native Modules
- **Expo Camera** for document capture
- **Expo Local Authentication** for biometric auth
- **Expo Notifications** for push notifications
- **Expo File System** for document management
- **Expo Secure Store** for encrypted storage

### Development Tools
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality
- **Jest** and **Expo Jest** for testing
- **EAS Build** for app compilation

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── dashboard/      # Dashboard-specific components
│   ├── assessment/     # Assessment flow components
│   └── documents/      # Document handling components
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── onboarding/    # First-time user experience
│   └── ...            # Feature-specific screens
├── navigation/         # Navigation configuration
├── services/          # External service integrations
│   ├── apollo.ts      # GraphQL client setup
│   ├── biometric.ts   # Biometric authentication
│   ├── notifications.tsx # Push notification handling
│   └── fileSystem.ts  # File management utilities
├── store/             # Redux store configuration
│   └── slices/        # Redux slices for different features
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
└── utils/             # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Studio
- Physical device for biometric testing

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd mobile-maturity-map

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Devices

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web (for testing)
npm run web
```

### Building for Production

```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Submit to app stores
npm run submit:ios
npm run submit:android
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_API_URL=https://api.candlefish.ai/graphql
EXPO_PUBLIC_WS_URL=wss://api.candlefish.ai/graphql
EXPO_PUBLIC_APP_VARIANT=production
```

### API Integration
The app connects to the existing Candlefish GraphQL API. Update the endpoint in `src/services/apollo.ts`:

```typescript
const httpLink = createHttpLink({
  uri: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/graphql',
});
```

## Key Features Implementation

### Offline Support
- **Redux Persist**: Automatically saves state to AsyncStorage
- **Sync Queue**: Queues operations when offline, syncs when online
- **Optimistic Updates**: Immediate UI updates with background sync

### Document Capture
- **Camera Integration**: Full-screen camera with capture guidelines
- **Image Processing**: Automatic compression and format conversion
- **File Import**: Support for PDF, Word, Excel, images, and more

### Biometric Authentication
- **Multi-Platform**: Face ID (iOS), Fingerprint (Android), Touch ID
- **Graceful Fallback**: PIN-based authentication when biometric fails
- **Secure Storage**: Encrypted storage for authentication tokens

### Push Notifications
- **Local Notifications**: Assessment reminders and alerts
- **Remote Notifications**: Server-triggered updates via Expo Push
- **Rich Notifications**: Custom data and deep linking support

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Deployment

### Development Build
```bash
# Create development build
eas build --profile development --platform all
```

### Production Build
```bash
# Create production builds
eas build --profile production --platform all

# Submit to app stores
eas submit --platform all
```

### Environment-Specific Builds
- **Development**: Internal testing with debug features
- **Preview**: Internal distribution for stakeholders
- **Production**: App store distribution

## Architecture Decisions

### Offline-First Design
- All data operations work offline with automatic sync
- Optimistic updates provide immediate feedback
- Conflict resolution handles concurrent modifications

### Performance Optimization
- Image compression reduces bandwidth and storage
- Lazy loading minimizes initial load time
- Background processing prevents UI blocking

### Security Implementation
- Biometric authentication for quick access
- Encrypted local storage for sensitive data
- Token-based API authentication with refresh

### Cross-Platform Considerations
- Platform-specific UI components where appropriate
- Native module integration for device features
- Consistent user experience across iOS and Android

## Contributing

1. Follow the existing code structure and patterns
2. Add TypeScript types for all new code
3. Include unit tests for new features
4. Update documentation for API changes
5. Test on both iOS and Android platforms

## Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx react-native start --reset-cache
```

**iOS build errors:**
```bash
cd ios && pod install
```

**Android build errors:**
```bash
cd android && ./gradlew clean
```

**Expo development build:**
```bash
npx expo install --fix
```

## Performance Monitoring

The app includes built-in performance monitoring:
- Memory usage tracking (development)
- Render time measurements
- Network request monitoring
- Crash reporting integration

## Privacy and Security

- All sensitive data is encrypted at rest
- Biometric data never leaves the device
- Network communication uses HTTPS/WSS
- User data is processed according to privacy policies

## License

This project is part of the Candlefish Operational Maturity Assessment platform.