# Candlefish AI Mobile Collaboration App

A comprehensive React Native mobile application for real-time collaborative document editing, built with TypeScript and Expo.

## 🚀 Features

### ✅ Core Collaboration Features
- **Real-time Collaborative Editing** - Multi-user document editing with CRDT-based conflict resolution
- **Live Presence Indicators** - See who's online and their cursor positions in real-time
- **Touch-optimized Comments** - Swipe gestures for quick comment actions (reply, resolve, edit)
- **Mobile-optimized Editor** - Rich text editing designed specifically for mobile devices
- **Document Sharing** - Share documents with fine-grained permissions

### ✅ Mobile-specific Features
- **Offline-first Architecture** - Works seamlessly offline with automatic sync when online
- **Camera Integration** - Capture photos and attach files directly from camera or gallery
- **Push Notifications** - Real-time notifications for mentions, comments, and collaboration events
- **Biometric Authentication** - Face ID / Touch ID support for secure access
- **Haptic Feedback** - Tactile feedback for better user experience
- **Performance Optimization** - Battery and network-aware optimizations

### ✅ Advanced Features
- **CRDT Synchronization** - Using Yjs for conflict-free collaborative editing
- **GraphQL Real-time Subscriptions** - WebSocket-based real-time updates
- **Redux State Management** - Centralized app state with persistence
- **Material Design 3** - Modern UI following Google's Material Design guidelines
- **Comprehensive Error Handling** - Graceful error handling and recovery

## 🏗 Architecture

```
src/
├── components/           # Reusable UI components
│   ├── editor/          # Collaborative editing components
│   ├── comments/        # Comment system components
│   ├── attachments/     # File attachment components
│   └── ui/             # Base UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── services/           # Business logic services
│   ├── apollo.ts       # GraphQL client configuration
│   ├── offline.ts      # Offline data management
│   ├── notifications.ts # Push notifications
│   ├── camera.ts       # Camera and file handling
│   └── performance.ts  # Performance optimizations
├── stores/             # Redux store configuration
├── graphql/            # GraphQL queries, mutations, subscriptions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## 📱 Technology Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and toolchain
- **TypeScript** - Type-safe JavaScript
- **React Native Paper** - Material Design components
- **Apollo Client** - GraphQL client with caching
- **Redux Toolkit** - State management
- **Yjs** - CRDT for collaborative editing
- **React Navigation** - Navigation library
- **Expo Notifications** - Push notifications
- **Expo Camera** - Camera and media handling
- **AsyncStorage** - Local data persistence

## 🛠 Installation & Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator / Android Emulator or physical device

### Install Dependencies
```bash
cd apps/mobile-collaboration
npm install
```

### Environment Setup
1. Configure your GraphQL endpoints in `src/config/index.ts`
2. Set up push notification credentials in `app.json`
3. Configure your development/staging/production environments

### Run the App
```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📋 Configuration

### GraphQL API
Configure your GraphQL endpoints in `src/config/index.ts`:

```typescript
const environments = {
  development: {
    graphql: {
      httpEndpoint: 'http://localhost:4000/graphql',
      wsEndpoint: 'ws://localhost:4000/graphql',
    },
  },
  production: {
    graphql: {
      httpEndpoint: 'https://api.candlefish.ai/graphql',
      wsEndpoint: 'wss://api.candlefish.ai/graphql',
    },
  },
};
```

### Push Notifications
Update `app.json` with your notification configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

### Feature Flags
Enable/disable features in `src/config/index.ts`:

```typescript
features: {
  offlineMode: true,
  pushNotifications: true,
  biometricAuth: true,
  cameraIntegration: true,
  performanceOptimization: true,
}
```

## 🔧 Development

### Code Generation
Generate TypeScript types from GraphQL schema:

```bash
npm run codegen
```

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Linting
```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking
```bash
npm run typecheck
```

## 📦 Building for Production

### Build for iOS
```bash
npm run build:ios
```

### Build for Android
```bash
npm run build:android
```

## 🎯 Key Components

### CollaborativeEditor
The main collaborative editing component with real-time synchronization:

```typescript
<CollaborativeEditor
  documentId={documentId}
  readOnly={!canEdit}
  onContentChange={handleContentChange}
  onSelectionChange={handleSelectionChange}
/>
```

### CommentSystem
Touch-optimized comment system with swipe gestures:

```typescript
<CommentSystem
  documentId={documentId}
  comments={comments}
  onCommentSelect={handleCommentSelect}
/>
```

### PresenceLayer
Real-time user presence indicators:

```typescript
<PresenceLayer
  documentId={documentId}
/>
```

### AttachmentUploader
Camera and file attachment handling:

```typescript
<AttachmentUploader
  documentId={documentId}
  onUploadComplete={handleUploadComplete}
  maxFiles={10}
  maxFileSize={50 * 1024 * 1024}
/>
```

## 🔐 Security

- **Biometric Authentication** - Face ID / Touch ID support
- **Secure Storage** - Sensitive data stored in iOS Keychain / Android Keystore
- **Token-based Authentication** - JWT tokens with automatic refresh
- **Permission-based Access** - Fine-grained document permissions
- **Network Security** - HTTPS/WSS only in production

## ⚡ Performance Optimizations

- **Network-aware Operations** - Adapt behavior based on connection type
- **Battery Optimization** - Reduce activity on low battery
- **Memory Management** - Automatic cache eviction and garbage collection
- **Request Batching** - Batch multiple requests for efficiency
- **Image Optimization** - Automatic compression and thumbnail generation
- **Lazy Loading** - Load content on demand

## 📱 Platform-specific Features

### iOS
- Face ID / Touch ID authentication
- iOS-style haptic feedback
- Native share sheet integration
- iOS-specific navigation patterns

### Android
- Fingerprint authentication
- Android-style material design
- Android share intent handling
- Adaptive icons and shortcuts

## 🤝 Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation for API changes
4. Use TypeScript strictly - no `any` types
5. Follow Material Design guidelines for UI

## 📄 License

This project is part of the Candlefish AI collaboration platform and is proprietary software.

## 🐛 Troubleshooting

### Common Issues

#### GraphQL Connection Issues
- Verify your API endpoints are correct
- Check network connectivity
- Ensure WebSocket connections are allowed

#### Push Notification Setup
- Verify your Expo project ID is configured
- Check notification permissions are granted
- Ensure you have valid push notification certificates

#### Offline Sync Issues
- Check AsyncStorage permissions
- Verify network state detection is working
- Review offline queue processing logs

#### Performance Issues
- Enable performance monitoring in development
- Check for memory leaks with large documents
- Verify image optimization is working

For more help, check the logs in development mode or contact the development team.
