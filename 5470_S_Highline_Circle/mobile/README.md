# Item Valuation Mobile App

A comprehensive React Native mobile application for the Item Valuation and Pricing System, providing offline-first functionality with AI-powered valuations, barcode scanning, and secure biometric authentication.

## Features

### Core Functionality
- **AI-Powered Valuations**: Camera-based item analysis with real-time AI price estimation
- **Barcode & QR Scanning**: Quick item identification and lookup
- **Offline-First Architecture**: Full functionality without internet connection
- **Real-Time Sync**: Automatic data synchronization when online
- **Push Notifications**: Price alerts and market opportunities

### Security & Performance
- **Biometric Authentication**: Fingerprint and Face ID support
- **Location-Based Security**: Threat assessment and monitoring
- **Performance Monitoring**: Real-time app performance tracking
- **Security Event Logging**: Comprehensive security audit trails

### Mobile-Specific Features
- **Native Camera Integration**: Optimized photo capture with AI analysis
- **Gesture Navigation**: Intuitive swipe and touch interactions
- **Battery Optimization**: Smart background processing
- **Offline Queue**: Reliable data sync when connectivity returns

## Architecture

### Technology Stack
- **Framework**: React Native 0.73.2
- **Navigation**: React Navigation v6
- **State Management**: React Query + Context API
- **Offline Storage**: AsyncStorage + SQLite
- **Authentication**: Biometric + JWT
- **Networking**: GraphQL with offline caching

### Project Structure
```
mobile/
├── App.tsx                 # Main app component
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ValuationCard.tsx
│   │   ├── PriceHistoryChart.tsx
│   │   └── MarketComparisonTable.tsx
│   ├── screens/           # Main app screens
│   │   ├── DashboardScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── ScannerScreen.tsx
│   │   ├── ValuationsScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── ItemDetailScreen.tsx
│   │   ├── AuthScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── providers/         # Context providers
│   │   ├── AuthProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── OfflineProvider.tsx
│   ├── services/          # Business logic services
│   │   ├── api.ts
│   │   ├── offline-queue.ts
│   │   ├── security.ts
│   │   ├── performance.ts
│   │   └── location-threat.ts
│   ├── types/             # TypeScript type definitions
│   │   ├── index.ts
│   │   └── navigation.ts
│   └── theme/             # Theme configuration
│       └── index.ts
└── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18 or higher
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation
1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Install iOS dependencies (iOS only):
   ```bash
   cd ios && pod install
   ```

3. Start the Metro bundler:
   ```bash
   npm start
   ```

4. Run on device/simulator:
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

### Environment Configuration

Create environment-specific configuration for API endpoints:

```typescript
// src/config/environment.ts
export const API_CONFIG = {
  development: {
    API_URL: 'http://localhost:8080/graphql',
    WS_URL: 'ws://localhost:8080/graphql',
  },
  production: {
    API_URL: 'https://your-api.com/graphql',
    WS_URL: 'wss://your-api.com/graphql',
  }
};
```

## Key Components

### ValuationCard
Mobile-optimized valuation display with touch interactions:
- Compact and full display modes
- Confidence indicators with color coding
- Touch gestures for quick actions
- Offline status indicators

### CameraScreen
AI-powered photo capture and analysis:
- Real-time camera preview
- AI valuation processing
- Offline photo queuing
- Flash and camera controls

### ScannerScreen
Barcode and QR code scanning:
- Real-time code detection
- Item lookup and creation
- Offline scan queuing
- Visual feedback and animations

### OfflineQueueService
Robust offline functionality:
- Action queuing system
- Automatic sync on connectivity
- Data persistence
- Conflict resolution

## Security Features

### Biometric Authentication
```typescript
// Enable biometric auth
import TouchID from 'react-native-touch-id';

const authenticate = async () => {
  try {
    await TouchID.authenticate('Access your valuations');
    return true;
  } catch (error) {
    return false;
  }
};
```

### Security Monitoring
- Real-time threat assessment
- Location-based security
- Device integrity checking
- Audit trail logging

### Data Protection
- End-to-end encryption
- Secure local storage
- Certificate pinning
- Biometric data protection

## Performance Optimization

### Battery Life
- Background processing limits
- Location service optimization
- Camera usage management
- Network request batching

### Memory Management
- Image compression and caching
- Component lazy loading
- Memory leak prevention
- Garbage collection optimization

### Network Optimization
- Request deduplication
- Image lazy loading
- GraphQL query optimization
- Offline-first caching

## Offline Capabilities

### Data Persistence
- Local SQLite database
- Image caching system
- Configuration storage
- User preference sync

### Sync Strategy
- Incremental sync
- Conflict resolution
- Priority-based queuing
- Bandwidth adaptation

### Offline Features
- Photo capture and analysis
- Barcode scanning
- Data entry and editing
- Report generation

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Performance Testing
```bash
npm run test:performance
```

## Deployment

### Android
```bash
# Generate release APK
npm run build:android

# Generate AAB for Play Store
cd android && ./gradlew bundleRelease
```

### iOS
```bash
# Build for release
npm run build:ios

# Archive for App Store
# Use Xcode to archive and upload
```

## Monitoring & Analytics

### Performance Monitoring
- Screen load times
- Network request latency
- Memory usage tracking
- Battery usage analysis

### Security Monitoring
- Authentication events
- Location-based threats
- Device security status
- Data access logging

### User Analytics
- Feature usage tracking
- User journey analysis
- Crash reporting
- Performance metrics

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   npm run reset-cache
   ```

2. **Android build failures**:
   ```bash
   cd android && ./gradlew clean
   npm run clean
   ```

3. **iOS build failures**:
   ```bash
   cd ios && pod clean && pod install
   ```

### Debug Mode
Enable debug logging in development:
```typescript
// In App.tsx
if (__DEV__) {
  console.log('Debug mode enabled');
  // Enable additional logging
}
```

## Contributing

1. Follow the established code style
2. Add tests for new features
3. Update documentation
4. Ensure offline functionality works
5. Test on both iOS and Android

## License

Private - Proprietary Software

## Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting guide

---

Built with React Native for iOS and Android platforms.