# Security Mobile Dashboard

A production-ready React Native mobile application for security monitoring and incident response, complementing the web-based security dashboard. This app provides real-time threat detection, alert management, and on-the-go incident response capabilities.

## 🚀 Features

### Core Security Features
- **Real-time Security Alerts**: Push notifications for critical threats
- **Threat Visualization**: Interactive charts and graphs showing security metrics
- **Incident Management**: Create, update, and manage security incidents on mobile
- **Location-based Threats**: GPS-aware threat detection and alerting
- **Offline-first Architecture**: Works seamlessly without internet connectivity

### Mobile-Specific Features  
- **Biometric Authentication**: Face ID/Touch ID integration for secure access
- **Swipeable Alert Cards**: Gesture-based interface for quick alert management
- **Dark Theme Interface**: Optimized for security operations and low-light environments
- **Background Sync**: Automatic data synchronization when connectivity is restored
- **Performance Optimization**: Battery and data usage optimization

### Security & Privacy
- **End-to-end Encryption**: Secure credential storage with hardware-backed encryption
- **Certificate Pinning**: Protection against man-in-the-middle attacks
- **Secure Storage**: Hardware security module integration for sensitive data
- **Auto-lock**: Configurable timeout with biometric unlock
- **Remote Wipe**: Emergency data deletion capability

## 📱 Architecture

### Technology Stack
- **Framework**: React Native with Expo SDK 49
- **Language**: TypeScript for type safety
- **State Management**: Apollo Client with GraphQL
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper with custom security theme
- **Charts**: Victory Native for data visualization
- **Authentication**: Expo Local Authentication for biometrics
- **Storage**: Expo Secure Store + AsyncStorage
- **Network**: Apollo Client with WebSocket subscriptions
- **Background Tasks**: Expo Background Fetch & Task Manager

### Key Services

#### 1. Apollo Client Service (`src/services/apollo-client.ts`)
- GraphQL client with real-time subscriptions
- Network-aware caching and offline support
- Automatic token refresh and error handling
- Connection retry logic with exponential backoff

#### 2. Authentication Service (`src/services/auth.ts`)
- JWT token management with refresh logic
- Biometric authentication (Face ID/Touch ID)
- Session timeout and security event logging
- Secure credential storage

#### 3. Notification Service (`src/services/notifications.ts`)
- Push notification registration and handling
- Background notification processing
- Customizable notification settings
- Priority-based notification filtering

#### 4. Offline Queue Service (`src/services/offline-queue.ts`)
- Offline-first data synchronization
- Priority-based operation queuing
- Background sync with retry logic
- Incident creation and management while offline

#### 5. Location Threat Service (`src/services/location-threat.ts`)
- GPS-based threat detection
- Geofenced security zones
- Location-based alert triggering
- Background location monitoring

#### 6. Security Service (`src/services/security.ts`)
- Certificate pinning implementation
- Secure credential storage with encryption
- Device security validation
- Security configuration management

#### 7. Performance Service (`src/services/performance.ts`)
- Battery usage optimization
- Data usage monitoring and limits
- Network optimization strategies
- Performance metrics collection

## 🎨 Design System

### Security Theme (`src/theme/SecurityTheme.ts`)
- Dark-first color palette optimized for security operations
- Severity-based color coding (Critical: Red, High: Orange, etc.)
- Typography system with security-focused fonts
- Consistent spacing and component styles
- Responsive design tokens

### UI Components
- **SwipeableAlertCard**: Gesture-based alert management
- **ThreatActivityChart**: Real-time threat visualization
- **LoadingScreen**: Branded loading states
- **ErrorFallback**: Comprehensive error handling

## 📊 Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GraphQL API   │◄──►│  Apollo Client   │◄──►│  React Native   │
│  (WebSocket)    │    │   (Cache)        │    │   Components    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Push Notifs    │    │ Offline Queue    │    │  Local Storage  │
│   (FCM/APN)     │    │   Service        │    │  (Encrypted)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── cards/          # Card components (SwipeableAlertCard)
│   │   ├── charts/         # Chart components (ThreatActivityChart)
│   │   └── ui/             # Basic UI components
│   ├── navigation/         # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── dashboard/      # Dashboard screens
│   │   ├── alerts/         # Alert management screens
│   │   ├── incidents/      # Incident management screens
│   │   ├── threats/        # Threat visualization screens
│   │   └── settings/       # Settings screens
│   ├── services/           # Core services
│   │   ├── apollo-client.ts
│   │   ├── auth.ts
│   │   ├── notifications.ts
│   │   ├── offline-queue.ts
│   │   ├── location-threat.ts
│   │   ├── security.ts
│   │   └── performance.ts
│   ├── theme/              # Design system
│   │   └── SecurityTheme.ts
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── assets/                 # Static assets (images, fonts)
├── App.tsx                 # Main application component
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd security-dashboard/mobile
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API endpoints and keys
```

4. **Start the development server**
```bash
npm run start
```

5. **Run on specific platforms**
```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

### Build for Production

1. **Configure EAS Build**
```bash
npm install -g @expo/cli
eas build:configure
```

2. **Build for iOS**
```bash
eas build --platform ios
```

3. **Build for Android**
```bash
eas build --platform android
```

## 🔧 Configuration

### Environment Variables
```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
EXPO_PUBLIC_ENVIRONMENT=development
```

### GraphQL Configuration
Update `src/services/apollo-client.ts` with your GraphQL endpoint:
```typescript
const API_BASE_URL = __DEV__ ? 'http://localhost:4000' : 'https://api.candlefish.ai';
```

### Push Notifications
Configure push notifications in `app.json`:
```json
{
  "expo": {
    "notifications": {
      "icon": "./assets/notification-icon.png",
      "color": "#ef4444"
    }
  }
}
```

## 📱 Platform-Specific Features

### iOS Configuration
- **Info.plist Permissions**: Camera, Location, Face ID usage descriptions
- **Bundle Identifier**: `com.candlefish.securitymobile`
- **Build Number**: Auto-incrementing for App Store submissions
- **Privacy Settings**: Background app refresh, location services

### Android Configuration
- **Permissions**: Camera, Location, Biometric, Network state
- **Package Name**: `com.candlefish.securitymobile`
- **Version Code**: Auto-incrementing for Play Store submissions
- **Background Processing**: Doze mode optimization

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Run Jest tests
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report
```

### E2E Tests
```bash
npm run test:e2e           # Run Detox E2E tests
npm run test:e2e:build     # Build E2E test app
```

### Test Structure
```
__tests__/
├── components/            # Component unit tests
├── services/              # Service unit tests
├── screens/               # Screen integration tests
└── e2e/                   # End-to-end tests
```

## 📊 Performance Monitoring

### Built-in Metrics
- **Battery Usage**: Automatic optimization based on battery level
- **Data Usage**: Monitoring and limits for cellular data
- **Memory Usage**: Performance tracking and optimization
- **Network Performance**: Request batching and compression

### Performance Settings
```typescript
// Configure in PerformanceService
{
  batteryOptimization: {
    enabled: true,
    lowBatteryThreshold: 0.2,
    aggressiveMode: false
  },
  dataOptimization: {
    maxDailyDataUsage: 100 * 1024 * 1024, // 100MB
    compressImages: true,
    wifiOnlyUpdates: false
  }
}
```

## 🔐 Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- Hardware security module integration where available
- Automatic session timeout and locking
- Secure keychain storage for credentials

### Network Security
- Certificate pinning for API endpoints
- TLS 1.2+ enforcement
- Request signing and validation
- Man-in-the-middle attack protection

### Device Security
- Root/jailbreak detection
- Debug mode restrictions in production
- Screen recording prevention
- App backgrounding security

## 🚀 Deployment

### App Store Deployment (iOS)
1. Configure certificates in Apple Developer Console
2. Build with EAS: `eas build --platform ios`
3. Submit to TestFlight: `eas submit --platform ios`
4. Review and publish via App Store Connect

### Google Play Deployment (Android)
1. Generate signing key and upload to EAS
2. Build with EAS: `eas build --platform android`
3. Submit to Play Console: `eas submit --platform android`
4. Review and publish via Google Play Console

### Over-the-Air Updates
```bash
eas update --channel production    # Deploy to production
eas update --channel staging       # Deploy to staging
```

## 📚 API Integration

### GraphQL Schema
The mobile app expects the following GraphQL operations:

#### Queries
- `GetDashboardData`: Security overview and recent alerts
- `GetAlerts`: Paginated alert list with filtering
- `GetIncidents`: Incident management data
- `GetThreatActivity`: Historical threat data for charts

#### Mutations  
- `AcknowledgeAlert`: Mark alert as acknowledged
- `CreateIncident`: Create new security incident
- `UpdateIncident`: Update incident status/details

#### Subscriptions
- `SecurityAlertsSubscription`: Real-time alert updates
- `ThreatActivitySubscription`: Live threat data updates
- `IncidentUpdatesSubscription`: Incident status changes

### REST API Fallback
For environments without GraphQL, REST endpoints are supported:
- `GET /api/dashboard` - Dashboard data
- `GET /api/alerts` - Alert list
- `POST /api/incidents` - Create incident
- `PUT /api/alerts/:id/acknowledge` - Acknowledge alert

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m "Add new feature"`
7. Push to the branch: `git push origin feature/new-feature`
8. Submit a pull request

### Coding Standards
- Use TypeScript for all new code
- Follow the existing component patterns
- Add JSDoc comments for public APIs
- Maintain test coverage above 80%
- Use the established theme and styling patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Email**: support@candlefish.ai
- **Documentation**: https://docs.candlefish.ai
- **Issues**: GitHub Issues tab

## 🔄 Changelog

### Version 1.0.0 (Current)
- ✅ Initial release with core security features
- ✅ Real-time alert management
- ✅ Biometric authentication
- ✅ Offline-first architecture
- ✅ Location-based threat detection
- ✅ Performance optimization
- ✅ Dark theme UI

### Upcoming Features
- 🔄 Advanced threat analytics
- 🔄 Team collaboration features
- 🔄 Integration with SIEM systems
- 🔄 Enhanced reporting capabilities
- 🔄 Multi-language support

---

Built with ❤️ for security professionals by the Candlefish.ai team.