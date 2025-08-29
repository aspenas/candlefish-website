# Candlefish Prompt Engineering Mobile App

A React Native mobile companion app for the Candlefish AI prompt engineering system, providing on-the-go prompt management, testing, and analytics.

## Overview

This mobile app extends the powerful prompt engineering capabilities of the Candlefish AI platform to iOS and Android devices, offering a native mobile experience for managing prompt templates, executing tests, and monitoring performance metrics.

## Features

### 🚀 Core Functionality
- **Prompt Library Management**: Browse, search, and organize prompt templates
- **Mobile-Optimized Editor**: Touch-friendly prompt template creation and editing
- **Real-time Testing**: Execute prompts and view results instantly
- **Performance Analytics**: Track usage, costs, and quality metrics
- **Offline Mode**: Queue prompts for execution when connectivity returns

### 📱 Mobile-Specific Features
- **Biometric Authentication**: Secure access with Face ID/Touch ID
- **Voice Input**: Speech-to-text prompt creation
- **Camera OCR**: Extract text from images for prompt context
- **Swipe Actions**: Intuitive gesture-based interactions
- **Push Notifications**: Get notified of execution results
- **Haptic Feedback**: Tactile response for all interactions
- **Background Execution**: Continue processing prompts in the background

### 🔧 Native Integrations
- **Document Picker**: Import files for prompt context
- **Clipboard Integration**: Quick prompt creation from clipboard
- **Deep Linking**: Direct access to specific templates or executions
- **Share Extension**: Share prompts across apps
- **iOS Widgets**: Quick access to recent templates (iOS)
- **Android Shortcuts**: Home screen shortcuts for common actions (Android)

## Tech Stack

- **Framework**: React Native 0.72+ with Expo 49+
- **Language**: TypeScript 5.1+
- **Navigation**: React Navigation 6.x
- **State Management**: Redux Toolkit with Redux Persist
- **UI Components**: React Native Paper (Material Design 3)
- **Charts**: React Native Chart Kit
- **Authentication**: Expo Local Authentication
- **Storage**: Expo Secure Store + Async Storage
- **Network**: React Query with offline support
- **Animations**: React Native Reanimated 3.x

## Installation

### Prerequisites
- Node.js 20.11.0+
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Emulator
- Physical device for testing biometric features

### Setup

1. **Install Dependencies**
```bash
cd apps/mobile-prompt-engineering
npm install
```

2. **Environment Configuration**
```bash
# Create .env file
cp .env.example .env

# Configure API endpoints
EXPO_PUBLIC_API_BASE_URL=https://candlefish.ai/api
EXPO_PUBLIC_WEBSOCKET_URL=wss://candlefish.ai/ws
```

3. **Start Development Server**
```bash
# Start Expo development server
npm start

# Run on specific platform
npm run ios
npm run android
```

4. **Build for Production**
```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Build for both platforms
npm run build:all
```

## Architecture

### Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Generic UI components
│   └── dashboard/      # Dashboard-specific components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── hooks/              # Custom React hooks
├── services/           # API and external services
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── constants/          # App constants and configuration
```

### State Management

The app uses Redux Toolkit for state management with the following slices:

- **authSlice**: User authentication and profile
- **templatesSlice**: Prompt template management
- **executionsSlice**: Prompt execution history
- **settingsSlice**: App settings and preferences
- **modelsSlice**: AI model status and configuration
- **offlineSlice**: Offline queue and network status

### Data Flow

1. **Online Mode**: Direct API calls with real-time updates
2. **Offline Mode**: Queue operations and sync when online
3. **Caching**: Intelligent caching with TTL and LRU eviction
4. **Background Sync**: Automatic synchronization every 5 minutes

## Key Components

### SwipeablePromptCard
Touch-optimized card component with swipe actions for quick operations:
- **Left Swipe**: Test, Duplicate
- **Right Swipe**: Edit, Delete
- **Tap**: View details

### QuickActionBar
Horizontal scrollable bar with common actions:
- Voice Prompt
- Camera OCR
- Quick Test
- Clipboard Import

### MetricCard
Real-time metric display with trend indicators and drill-down navigation.

### VoicePromptScreen
Speech-to-text interface for hands-free prompt creation with:
- Real-time transcription
- Confidence scoring
- Multiple language support

## Mobile Optimizations

### Performance
- **Lazy Loading**: Screens and components loaded on demand
- **Image Caching**: Intelligent image caching with size limits
- **Memory Management**: Automatic cleanup of unused resources
- **Bundle Optimization**: Code splitting for faster startup

### UX/UI
- **Adaptive Layouts**: Responsive design for all screen sizes
- **Dark Mode**: Full dark mode support with system preference detection
- **Accessibility**: VoiceOver/TalkBack support with proper labeling
- **Haptic Feedback**: Contextual vibration for user actions

### Battery Optimization
- **Background Limits**: Minimal background processing
- **Network Efficiency**: Batch requests and intelligent polling
- **CPU Throttling**: Reduced processing during low battery

## API Integration

### Endpoints
The app integrates with the following API endpoints:

```typescript
// Template management
GET    /api/templates
POST   /api/templates
PUT    /api/templates/:id
DELETE /api/templates/:id

// Prompt execution
POST   /api/prompts/execute
GET    /api/prompts/executions
WS     /ws/prompts/stream

// Analytics
GET    /api/analytics/metrics
GET    /api/analytics/usage

// User management
GET    /api/user/profile
PUT    /api/user/preferences
```

### Authentication
- JWT tokens stored in Expo Secure Store
- Automatic token refresh with retry logic
- Biometric authentication for sensitive operations

## Testing

### Test Coverage Goals
- **Unit Tests**: 80%+ coverage for utilities and hooks
- **Integration Tests**: API integration and navigation flows
- **E2E Tests**: Critical user journeys with Detox
- **Accessibility Tests**: WCAG 2.1 AA compliance

### Running Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (iOS)
npm run test:e2e:ios

# E2E tests (Android)
npm run test:e2e:android
```

## Deployment

### iOS Deployment
1. **App Store Connect**: Configure app metadata and screenshots
2. **TestFlight**: Internal testing with team members
3. **Release**: Production deployment with phased rollout

### Android Deployment
1. **Google Play Console**: Configure store listing and assets
2. **Internal Testing**: Alpha testing with internal team
3. **Release**: Production deployment with staged rollout

### Configuration Files
- **app.json**: Expo configuration
- **eas.json**: EAS Build configuration
- **app.config.js**: Dynamic configuration

## Security

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Network Security**: Certificate pinning and TLS 1.3
- **Input Validation**: Comprehensive client-side validation
- **Biometric Authentication**: Secure local authentication

### Privacy
- **Data Minimization**: Only collect necessary data
- **User Consent**: Explicit consent for analytics and crash reporting
- **GDPR Compliance**: Right to deletion and data portability

## Performance Monitoring

### Metrics Tracked
- **App Performance**: Startup time, memory usage, crash rates
- **User Engagement**: Screen time, feature usage, retention
- **API Performance**: Response times, error rates, success rates
- **Business Metrics**: Template usage, execution costs, user satisfaction

### Monitoring Tools
- **Expo Analytics**: Built-in analytics and crash reporting
- **Custom Analytics**: Business-specific metrics and funnels
- **Performance Monitoring**: Real-time performance alerts

## Platform-Specific Features

### iOS Features
- **Widgets**: Home screen widgets for quick template access
- **Shortcuts**: Siri Shortcuts for voice-activated prompts
- **Handoff**: Continue work between iPhone and iPad
- **Dynamic Type**: Support for accessibility text sizes

### Android Features
- **App Shortcuts**: Static and dynamic shortcuts
- **Adaptive Icons**: Support for various launcher icon shapes
- **Material You**: Dynamic color theming (Android 12+)
- **Bubbles**: Floating chat bubbles for active executions

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Clear Metro cache: `npx expo start --clear`
   - Clean node_modules: `rm -rf node_modules && npm install`

2. **Authentication Issues**
   - Check API endpoint configuration
   - Verify biometric enrollment on device

3. **Performance Issues**
   - Enable Hermes engine in production builds
   - Use React DevTools Profiler for performance debugging

4. **Network Issues**
   - Check network connectivity
   - Verify API endpoints are accessible
   - Review offline queue for pending operations

### Support
- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Testing**: Use development builds for debugging

## Contributing

1. **Development Setup**: Follow installation instructions
2. **Code Style**: Use ESLint and Prettier configurations
3. **Testing**: Write tests for new features
4. **Documentation**: Update README for significant changes
5. **Pull Requests**: Follow conventional commit messages

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: 2025-08-27  
**Maintained by**: Candlefish AI Mobile Team