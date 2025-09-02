# Collaboration Mobile

A React Native mobile app for real-time collaborative document editing, part of the Candlefish AI ecosystem.

## Features

### 🚀 Core Functionality
- **Real-time Collaboration**: Live document editing with presence indicators
- **Offline Support**: Work offline with automatic sync when connected
- **Cross-platform**: Runs on both iOS and Android with native performance
- **Biometric Authentication**: Secure access with fingerprint/FaceID
- **Push Notifications**: Real-time updates for document changes
- **Document Management**: Create, edit, search, and organize documents

### 🤖 AI Integration
- **NANDA AI Suggestions**: Intelligent writing assistance
- **Content Improvement**: Grammar, style, and structure suggestions
- **Auto-completion**: Smart text completion while typing
- **Collaboration Insights**: Conflict prediction and merge suggestions

### 📱 Mobile-Optimized
- **Gesture Support**: Intuitive touch gestures for navigation
- **Native Animations**: Smooth, performant animations
- **Adaptive UI**: Responsive design for all screen sizes
- **Performance Monitoring**: Built-in performance tracking
- **File System Integration**: Native file import/export

## Architecture

### Technology Stack
- **React Native 0.72.6** - Cross-platform mobile framework
- **TypeScript** - Type-safe development
- **Apollo GraphQL** - Real-time data synchronization
- **React Navigation 6** - Native navigation
- **Reanimated 3** - High-performance animations
- **Gesture Handler 2** - Touch gesture recognition
- **Y.js** - CRDT for collaborative editing
- **MMKV** - Fast key-value storage

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── document/       # Document-specific components
│   └── ui/            # Base UI components
├── contexts/           # React contexts
├── hooks/             # Custom React hooks
├── navigation/        # Navigation configuration
├── screens/           # Screen components
├── services/          # Business logic services
│   ├── apollo.ts      # GraphQL client setup
│   ├── auth.ts        # Authentication service
│   ├── offlineSync.ts # Offline synchronization
│   ├── pushNotifications.ts # Push notifications
│   ├── nandaIntegration.ts # AI suggestions
│   ├── fileSystem.ts  # File operations
│   └── performance.ts # Performance monitoring
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── constants/         # App configuration
```

## Getting Started

### Prerequisites
- Node.js 16+
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/candlefish-ai/collaboration-platform.git
cd collaboration-platform/apps/collaboration-mobile
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Install iOS dependencies**
```bash
cd ios && pod install && cd ..
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development

#### iOS
```bash
npm run ios
# or for specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

#### Android
```bash
npm run android
# or with specific device
npx react-native run-android --deviceId="device_id"
```

#### Start Metro bundler
```bash
npm start
# or
npx react-native start
```

### Building for Production

#### iOS
```bash
npm run build:ios
# Creates archive in ios/build
```

#### Android
```bash
npm run build:android
# Creates APK/AAB in android/app/build/outputs
```

## Configuration

### Environment Variables
```env
# API Configuration
GRAPHQL_HTTP_ENDPOINT=https://api.candlefish.ai/collaboration/graphql
GRAPHQL_WS_ENDPOINT=wss://api.candlefish.ai/collaboration/graphql
NANDA_ENDPOINT=https://nanda.candlefish.ai

# Push Notifications
FCM_SENDER_ID=your_fcm_sender_id
APNS_BUNDLE_ID=ai.candlefish.collaboration

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_AI_SUGGESTIONS=true
```

### GraphQL Code Generation
Generate TypeScript types from GraphQL schema:
```bash
npm run codegen
```

## Key Components

### Authentication (`src/services/auth.ts`)
- JWT token management with secure storage
- Biometric authentication integration
- Automatic token refresh
- Session management

### Real-time Collaboration (`src/services/offlineSync.ts`)
- Y.js CRDT implementation
- Conflict resolution algorithms
- Offline operation queuing
- Automatic synchronization

### Document Viewer (`src/components/document/DocumentViewer.tsx`)
- Real-time content rendering
- Presence indicators for collaborators
- Gesture-based interactions
- Optimized for mobile performance

### Push Notifications (`src/services/pushNotifications.ts`)
- Document update notifications
- Collaboration invites
- Conflict resolution alerts
- Badge management

### AI Integration (`src/services/nandaIntegration.ts`)
- NANDA AI service integration
- Content suggestions
- Writing assistance
- Collaboration insights

## Testing

### Unit Tests
```bash
npm test
# or watch mode
npm run test:watch
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
# iOS
npm run e2e:ios

# Android
npm run e2e:android
```

## Performance

### Optimization Features
- **Bundle splitting** - Lazy loading of screens
- **Image optimization** - Fast image loading with caching
- **Memory management** - Automatic cleanup and monitoring
- **Network optimization** - Request deduplication and caching
- **Render optimization** - Memoized components and virtual lists

### Performance Monitoring
The app includes built-in performance monitoring:
- Render time tracking
- Memory usage monitoring
- Network performance metrics
- Crash reporting
- User interaction analytics

Access performance data:
```typescript
import { performanceService } from '@/services/performance';

// Get performance report
const report = performanceService.generatePerformanceReport();
console.log(report);
```

## Platform-Specific Features

### iOS
- **Haptic Feedback** - Native iOS haptic patterns
- **Keychain Integration** - Secure token storage
- **Background App Refresh** - Automatic sync in background
- **Spotlight Search** - Document search integration
- **3D Touch/Haptic Touch** - Quick actions

### Android
- **Biometric Prompt** - Native Android biometric authentication
- **Background Sync** - WorkManager integration
- **App Shortcuts** - Dynamic shortcuts
- **Notification Channels** - Organized push notifications
- **Adaptive Icons** - Material Design icons

## Accessibility

The app follows accessibility best practices:
- **VoiceOver/TalkBack** support
- **Dynamic Type** size support
- **High contrast** mode support
- **Screen reader** compatibility
- **Keyboard navigation** support

## Security

### Security Features
- **End-to-end encryption** for document content
- **Certificate pinning** for API requests
- **Biometric authentication** for app access
- **Secure storage** for sensitive data
- **Runtime security** checks

### Security Best Practices
- No sensitive data in logs
- Encrypted local storage
- Secure API communication
- Regular security audits
- Vulnerability scanning

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
6. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request**

### Code Style
- Use TypeScript for all new code
- Follow React Native best practices
- Use meaningful component names
- Add JSDoc comments for complex functions
- Follow the established project structure

## Deployment

### iOS App Store
1. **Build for release**
   ```bash
   npm run build:ios
   ```
2. **Archive in Xcode**
3. **Upload to App Store Connect**
4. **Submit for review**

### Google Play Store
1. **Build signed APK/AAB**
   ```bash
   npm run build:android
   ```
2. **Upload to Play Console**
3. **Configure store listing**
4. **Release to production**

### CI/CD
The app uses GitHub Actions for automated building and testing:
- **Pull Request checks** - Run tests and linting
- **Build verification** - Ensure builds succeed
- **Security scanning** - Check for vulnerabilities
- **Performance testing** - Monitor app performance

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm run clean
   npm start -- --reset-cache
   ```

2. **iOS build issues**
   ```bash
   cd ios && pod deintegrate && pod install
   ```

3. **Android build issues**
   ```bash
   cd android && ./gradlew clean
   ```

4. **Authentication issues**
   - Check API endpoints in configuration
   - Verify biometric setup on device
   - Clear app data and re-login

### Debug Tools
- **Flipper** - React Native debugging
- **Apollo DevTools** - GraphQL debugging  
- **Performance Monitor** - Built-in performance tracking
- **Network Inspector** - API request monitoring

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs.candlefish.ai](https://docs.candlefish.ai)
- **Issues**: [GitHub Issues](https://github.com/candlefish-ai/collaboration-platform/issues)
- **Discord**: [Candlefish AI Community](https://discord.gg/candlefish-ai)
- **Email**: support@candlefish.ai

---

Built with ❤️ by the Candlefish AI team