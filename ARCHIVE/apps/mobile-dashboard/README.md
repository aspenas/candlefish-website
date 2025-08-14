# Tyler Setup Mobile Dashboard

A comprehensive React Native mobile application for the Tyler Setup platform, providing native iOS and Android experiences with full feature parity to the web dashboard including contractor management, real-time analytics, and QR code scanning.

## 📱 Features

### Core Functionality
- **Multi-tenant Organization Support**: Switch between organizations seamlessly
- **Real-time Dashboard Viewing**: Native gestures for zooming, panning, and interaction
- **Data Visualization**: Native charts using react-native-svg-charts with smooth animations
- **Offline Support**: Complete offline functionality with intelligent sync when online
- **Push Notifications**: Real-time alerts for dashboard updates and system notifications

### Authentication & Security
- **Biometric Authentication**: Face ID/Touch ID integration for secure login
- **Secure Token Storage**: Using Expo SecureStore for sensitive data
- **GraphQL Integration**: Consistent API with web frontend
- **Organization-based Permissions**: Role-based access control

### Native Features
- **Deep Linking**: Dashboard sharing and invitation link handling
- **QR Code Scanning**: Camera integration for invitations and dashboard access
- **iOS Widgets**: Home screen widgets for key metrics
- **Android App Shortcuts**: Quick access to common actions
- **Haptic Feedback**: Native touch feedback throughout the app

### Performance Optimizations
- **Lazy Loading**: Components and data loaded on demand
- **Image Caching**: Efficient caching with storage management
- **Network Awareness**: Adaptive behavior based on connection quality
- **Background Sync**: Intelligent data synchronization
- **Memory Management**: Performance monitoring and optimization

## 🏗️ Architecture

### Project Structure
```
apps/mobile-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── charts/         # Data visualization components
│   │   ├── dashboard/      # Dashboard-specific components
│   │   └── ui/            # Common UI components
│   ├── screens/            # Screen components
│   │   ├── auth/          # Authentication screens
│   │   ├── dashboard/     # Dashboard screens
│   │   ├── scanner/       # QR scanner screen
│   │   └── profile/       # Profile and settings screens
│   ├── navigation/         # Navigation configuration
│   ├── services/          # API and business logic services
│   ├── store/             # Redux store and slices
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── ios/                   # iOS-specific code and widgets
├── android/               # Android-specific code and shortcuts
└── assets/               # Static assets (images, fonts)
```

### State Management
- **Redux Toolkit**: Modern Redux with RTK Query integration
- **Redux Persist**: Automatic state persistence for offline support
- **Structured Slices**:
  - `authSlice`: Authentication and user management
  - `organizationSlice`: Multi-tenant organization handling
  - `dashboardSlice`: Dashboard and widget data management
  - `offlineSlice`: Offline queue and sync management
  - `notificationSlice`: Push notification management
  - `uiSlice`: UI state and preferences

### Services Layer
- **AuthService**: Authentication with biometric support
- **BiometricService**: Face ID/Touch ID integration
- **DashboardService**: Dashboard and widget data operations
- **OrganizationService**: Multi-tenant organization management
- **OfflineService**: Local data caching and mutation queue
- **SyncService**: Intelligent online/offline synchronization
- **NetworkService**: Network state and connectivity management
- **NotificationService**: Push notifications and local alerts

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native CLI
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Install dependencies**:
   ```bash
   cd apps/mobile-dashboard
   npm install
   ```

2. **iOS Setup**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Start the development server**:
   ```bash
   npm run start
   ```

4. **Run on iOS**:
   ```bash
   npm run ios
   ```

5. **Run on Android**:
   ```bash
   npm run android
   ```

### Environment Configuration

Create a `.env` file in the app root:
```env
GRAPHQL_ENDPOINT=https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql
GRAPHQL_WS_ENDPOINT=wss://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql
API_VERSION=v1
ENVIRONMENT=production
```

## 📊 Data Visualization

The app uses `react-native-svg-charts` for native chart rendering:

### Supported Chart Types
- **Line Charts**: Time series data with smooth animations
- **Bar Charts**: Category-based data visualization  
- **Pie Charts**: Proportional data with interactive legends
- **Area Charts**: Filled line charts for trends
- **Metric Cards**: Key performance indicators
- **Gauge Charts**: Progress and performance metrics

### Chart Features
- **Native Gestures**: Pinch to zoom, pan to navigate
- **Smooth Animations**: 60fps chart transitions
- **Adaptive Theming**: Light/dark mode support
- **Responsive Design**: Tablet and phone optimized layouts
- **Interactive Elements**: Tap to drill down, long press for details

## 🔄 Offline Support

### Offline-First Architecture
- **Local Data Storage**: AsyncStorage for dashboard data
- **Mutation Queue**: Offline actions queued for later sync
- **Intelligent Sync**: Network-aware synchronization
- **Cache Management**: Automatic cleanup and storage optimization

### Offline Features
- **Dashboard Viewing**: Cached dashboards available offline
- **Data Persistence**: Widget data stored locally
- **Offline Actions**: Queue mutations for later execution
- **Sync Indicators**: Clear offline/online status
- **Conflict Resolution**: Automatic sync conflict handling

## 🔔 Push Notifications

### Notification Types
- **Alert Notifications**: Threshold breaches and critical alerts
- **Dashboard Updates**: New data and refresh notifications
- **System Notifications**: App updates and maintenance alerts
- **Organization Invitations**: Team collaboration notifications

### Platform Integration
- **iOS**: Apple Push Notification Service (APNS)
- **Android**: Firebase Cloud Messaging (FCM)
- **Local Notifications**: Scheduled reminders and alerts
- **Badge Management**: App icon badge counts
- **Silent Updates**: Background data refresh

## 🔐 Security Features

### Authentication
- **Biometric Login**: Face ID/Touch ID support
- **Secure Storage**: Encrypted token storage
- **Auto-logout**: Session timeout and security
- **Multi-factor**: Optional 2FA support

### Data Protection
- **End-to-end Encryption**: Sensitive data encryption
- **Certificate Pinning**: API security
- **Secure Communication**: TLS/SSL for all requests
- **Local Encryption**: Cached data protection

## 📱 Platform-Specific Features

### iOS Features
- **Widgets**: Home screen metric widgets
- **Shortcuts**: Siri shortcuts integration
- **App Clips**: Lightweight app experiences
- **Universal Links**: Deep linking support

### Android Features
- **App Shortcuts**: Home screen shortcuts
- **Adaptive Icons**: Dynamic icon theming
- **Picture-in-Picture**: Dashboard monitoring
- **App Links**: Intent-based deep linking

## 🎯 Performance Optimizations

### Rendering Performance
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo and useMemo optimization
- **FlatList Optimization**: Efficient scrolling for large datasets
- **Image Optimization**: WebP format with caching

### Memory Management
- **Automatic Cleanup**: Component unmount cleanup
- **Cache Limits**: Storage usage monitoring
- **Memory Profiling**: Performance metrics tracking
- **Background Tasks**: Efficient background processing

### Network Optimization
- **Request Batching**: Multiple requests combined
- **Cache-First Strategy**: Reduced API calls
- **Compression**: GZIP and image optimization
- **Retry Logic**: Intelligent error recovery

## 🧪 Testing

### Testing Strategy
- **Unit Tests**: Jest for component and service testing
- **Integration Tests**: API integration testing
- **E2E Tests**: Detox for full user journey testing
- **Performance Tests**: Memory and rendering performance

### Test Coverage
- **Components**: UI component testing with React Native Testing Library
- **Services**: Business logic and API service testing
- **Navigation**: Screen navigation and deep linking testing
- **Offline**: Sync and cache functionality testing

## 🚢 Deployment

### Build Configuration
- **iOS**: Xcode project with proper provisioning profiles
- **Android**: Gradle configuration with signing keys
- **Code Signing**: Automated certificate management
- **Bundle Optimization**: Tree shaking and minification

### Release Process
1. **Version Bump**: Update version numbers in app.json and package.json
2. **Build Generation**: Create platform-specific builds
3. **Testing**: Full regression testing on devices
4. **Store Submission**: App Store and Play Store deployment
5. **Monitoring**: Crash reporting and analytics tracking

## 🛠️ Development Tools

### Debugging
- **React Native Debugger**: Enhanced debugging experience
- **Flipper**: Network inspection and state debugging
- **Metro Bundler**: Hot reloading and fast refresh
- **Native Debugging**: Xcode and Android Studio integration

### Code Quality
- **ESLint**: Code linting and formatting
- **TypeScript**: Type safety and IntelliSense
- **Husky**: Git hooks for quality gates
- **Automated Testing**: CI/CD pipeline integration

## 📈 Analytics & Monitoring

### Performance Monitoring
- **Crash Reporting**: Automatic crash detection and reporting
- **Performance Metrics**: App launch time, memory usage, battery impact
- **User Analytics**: Feature usage and engagement tracking
- **Network Monitoring**: API performance and error tracking

### Business Intelligence
- **Feature Adoption**: Track new feature usage
- **User Journey**: Understanding user workflow
- **Performance Bottlenecks**: Identify optimization opportunities
- **Error Patterns**: Proactive issue resolution

## 🤝 Contributing

### Development Workflow
1. **Feature Branches**: Create feature branches from main
2. **Code Review**: All changes require peer review
3. **Testing**: Automated testing for all changes
4. **Documentation**: Update docs for new features

### Coding Standards
- **TypeScript**: Strict type checking enabled
- **Component Architecture**: Functional components with hooks
- **Style Guide**: Consistent styling and naming conventions
- **Performance**: Performance-first development approach

## 📚 Documentation

### Developer Resources
- **API Documentation**: GraphQL schema and operations
- **Component Library**: Storybook for UI components
- **Architecture Guide**: Detailed system architecture
- **Troubleshooting**: Common issues and solutions

### User Resources
- **User Guide**: Feature usage and navigation
- **FAQ**: Frequently asked questions
- **Video Tutorials**: Step-by-step feature demonstrations
- **Release Notes**: Update summaries and new features

---

## 📄 License

This project is proprietary software developed by Candlefish AI.

## 📞 Support

For technical support and questions:
- **Email**: support@candlefish.ai
- **Documentation**: https://docs.candlefish.ai
- **Issue Tracker**: GitHub Issues (for internal team)

---

*Built with ❤️ using React Native and Expo*
