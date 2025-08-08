# System Analyzer Mobile App

A React Native mobile application for the System Analyzer platform, providing comprehensive system monitoring and management capabilities on mobile devices.

## Features

### 🔍 Real-time System Monitoring

- **Dashboard Overview**: System health summary with real-time status updates
- **Service Management**: Grid view of all services with status indicators
- **Live Metrics**: Mobile-optimized charts for CPU, memory, disk, and network metrics
- **Alert Management**: Comprehensive alert listing with filtering and quick actions

### 📱 Mobile-Optimized Experience

- **Pull-to-refresh**: Refresh data with native mobile gestures
- **Offline Support**: Apollo GraphQL cache persistence with AsyncStorage
- **Network-aware**: Automatic retry and offline detection
- **Responsive Design**: Optimized for all screen sizes and orientations

### 🔔 Push Notifications

- **Real-time Alerts**: Instant notifications for critical system issues
- **Background Monitoring**: Periodic system health checks when app is backgrounded
- **Smart Notifications**: Severity-based notification priorities
- **Quick Actions**: Acknowledge and resolve alerts directly from notifications

### ⚡ Performance & Reliability

- **Background Tasks**: Periodic data synchronization using Expo BackgroundFetch
- **Deep Linking**: Direct navigation to specific services and alerts
- **Error Handling**: Comprehensive error boundaries and retry mechanisms
- **Haptic Feedback**: Native touch feedback for important actions

## Architecture

### 🏗️ Technical Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **React Navigation**: Tab-based navigation with stack navigators
- **React Native Paper**: Material Design 3 UI components
- **Apollo GraphQL**: Data fetching with real-time subscriptions
- **AsyncStorage**: Local data persistence
- **Expo Notifications**: Push notification management

### 📊 Data Management

- **GraphQL API**: Consistent with web frontend
- **Real-time Updates**: WebSocket subscriptions for live data
- **Offline Caching**: Apollo cache with AsyncStorage persistence
- **Background Sync**: Periodic data updates in background
- **Network Detection**: Adaptive fetch policies based on connectivity

### 🔗 Integration

- **Shared GraphQL Schema**: Consistent API with web frontend
- **Deep Linking**: URL-based navigation and sharing
- **Push Notifications**: Firebase (Android) and APNS (iOS)
- **Background Tasks**: Expo TaskManager integration

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ServiceStatusCard.tsx
│   │   ├── SystemHealthCard.tsx
│   │   ├── AlertSummaryCard.tsx
│   │   ├── MetricsOverviewCard.tsx
│   │   ├── ContainerCard.tsx
│   │   ├── ProcessCard.tsx
│   │   ├── AlertListItem.tsx
│   │   ├── ServiceStatusBadge.tsx
│   │   ├── MetricCard.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── ErrorState.tsx
│   ├── screens/             # Screen components
│   │   ├── DashboardScreen.tsx
│   │   ├── ServicesScreen.tsx
│   │   ├── ServiceDetailScreen.tsx
│   │   ├── MetricsScreen.tsx
│   │   ├── AlertsScreen.tsx
│   │   ├── AlertDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/            # Business logic and API
│   │   ├── apolloClient.ts
│   │   ├── queries.ts
│   │   ├── notifications.ts
│   │   ├── backgroundTasks.ts
│   │   └── deepLinking.ts
│   └── types/               # TypeScript type definitions
├── App.tsx                  # Main app component
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json           # TypeScript configuration
```

## Key Features Implementation

### 🎯 Dashboard Screen

- System health overview with health score
- Service status grid with real-time updates
- Active alerts summary with quick navigation
- Resource utilization metrics
- Pull-to-refresh functionality

### 📋 Service Management

- Comprehensive service listing with filtering
- Service detail views with container and process information
- Quick actions: restart, health check, view metrics
- Real-time status updates via subscriptions
- Dependency visualization

### 📊 Metrics & Monitoring

- Mobile-optimized charts using React Native Chart Kit
- Time range selection (1h, 6h, 24h, 7d)
- Metric type filtering (CPU, Memory, Disk, Network)
- Real-time data updates
- Performance trend analysis

### 🚨 Alert Management

- Comprehensive alert listing with filtering
- Severity-based organization (Critical, High, Medium, Low)
- Status filtering (Active, Resolved, Acknowledged)
- Quick actions: acknowledge, resolve
- Alert detail views with full context

### ⚙️ Settings & Configuration

- Push notification preferences
- Background sync configuration
- Cache management
- App information and version details

## Development Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator
- GraphQL API server running

### Installation

```bash
cd mobile
npm install
```

### Development

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Build

```bash
# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## Configuration

### Environment Variables

Configure in `app.json` under `extra`:

```json
{
  "extra": {
    "graphqlUrl": "http://your-server:4000/graphql",
    "graphqlWsUrl": "ws://your-server:4000/graphql"
  }
}
```

### Push Notifications

1. Configure Firebase (Android) and Apple Push Notifications (iOS)
2. Add certificates and keys to Expo
3. Update notification categories in `notifications.ts`

### Deep Linking

The app supports deep linking for:

- Services: `systemanalyzer://service/{id}`
- Alerts: `systemanalyzer://alert/{id}`
- Metrics: `systemanalyzer://metrics/{id}`
- Dashboard: `systemanalyzer://dashboard`

## Performance Features

### 📱 Mobile Optimizations

- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Automatic image compression
- **Bundle Splitting**: Code splitting for optimal loading
- **Memory Management**: Efficient component lifecycle management

### 🔄 Data Synchronization

- **Smart Caching**: Apollo cache with persistence
- **Background Sync**: 15-minute intervals with BackgroundFetch
- **Conflict Resolution**: Automatic data conflict handling
- **Network Optimization**: Adaptive queries based on connection

### 🚀 Performance Monitoring

- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Load time and interaction tracking
- **Crash Reporting**: Automatic crash detection and reporting
- **User Analytics**: Usage pattern analysis

## Security

### 🔐 Data Protection

- **Authentication**: JWT token management
- **API Security**: Secure GraphQL endpoint communication
- **Local Storage**: Encrypted sensitive data storage
- **Network Security**: Certificate pinning and TLS validation

### 🛡️ Privacy Features

- **Data Minimization**: Only necessary data collection
- **User Consent**: Explicit permission for notifications and background sync
- **Data Retention**: Configurable cache expiration
- **Audit Logging**: User action tracking

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Performance Tests

```bash
npm run test:performance
```

## Deployment

### App Store Distribution

1. Configure signing certificates
2. Build release version
3. Submit to Apple App Store and Google Play Store

### Over-the-Air Updates

- Expo Updates for quick bug fixes
- Staged rollout capabilities
- Rollback support

## Contributing

1. Follow React Native and TypeScript best practices
2. Maintain consistent code style with ESLint and Prettier
3. Write comprehensive tests for new features
4. Update documentation for API changes

## License

This project is part of the System Analyzer platform and follows the same licensing terms.
