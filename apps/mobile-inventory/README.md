# Mobile Inventory Management App

A comprehensive React Native mobile application for inventory management with offline-first architecture, barcode scanning, real-time updates, and biometric authentication.

## Features

### ✨ Core Functionality
- **📱 Cross-platform** - iOS and Android compatibility
- **📊 Inventory Management** - Create, update, delete, and track inventory items
- **📷 Barcode Scanning** - Fast and accurate barcode/QR code scanning
- **📸 Photo Capture** - Take and store photos of inventory items
- **🔍 Search & Filter** - Advanced search and filtering capabilities
- **📈 Analytics** - Real-time inventory statistics and insights

### 🔒 Authentication & Security
- **🔐 Biometric Authentication** - Face ID/Touch ID/Fingerprint support
- **🔑 JWT-based Authentication** - Secure token-based authentication
- **🔐 PIN Backup** - Fallback authentication method
- **🚫 Account Lockout** - Protection against brute force attacks

### 🌐 Offline-First Architecture
- **💾 SQLite Database** - Local data storage with encryption support
- **🔄 Real-time Sync** - GraphQL subscriptions for live updates
- **📤 Offline Queue** - Queue mutations when offline, sync when online
- **🔄 Conflict Resolution** - Smart conflict handling during sync

### 🔔 Notifications
- **📱 Push Notifications** - Low stock alerts and inventory updates
- **⚡ Real-time Alerts** - Instant notifications for critical inventory levels
- **🔕 Quiet Hours** - Customizable notification scheduling
- **📊 Smart Alerts** - Context-aware notification settings

## Tech Stack

### Frontend
- **React Native 0.74** - Cross-platform mobile framework
- **Expo 51** - Development toolchain and SDK
- **TypeScript** - Type-safe development
- **Redux Toolkit** - State management
- **Redux Persist** - State persistence

### Data & Sync
- **SQLite** - Local database
- **GraphQL** - API communication
- **Apollo Client** - GraphQL client with caching
- **GraphQL Subscriptions** - Real-time updates

### Authentication
- **Expo Local Authentication** - Biometric authentication
- **Expo Secure Store** - Secure credential storage
- **JWT** - Token-based authentication

### Camera & Scanning
- **Expo Camera** - Photo capture
- **Expo Barcode Scanner** - Barcode/QR code scanning
- **Expo Image Picker** - Gallery integration

### Notifications
- **Expo Notifications** - Push notifications
- **Background Tasks** - Periodic sync and monitoring

## Getting Started

### Prerequisites
- Node.js 16+
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator
- Physical device for testing biometric features

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd mobile-inventory
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy environment template
cp .env.example .env

# Update GraphQL endpoint
EXPO_PUBLIC_GRAPHQL_ENDPOINT=https://api.candlefish.ai/graphql
EXPO_PUBLIC_GRAPHQL_WS_ENDPOINT=wss://api.candlefish.ai/graphql
```

4. **Start development server**
```bash
npm start
```

### Development

```bash
# Start with tunnel (for testing on physical devices)
npm run start:dev-tunnel

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (limited functionality)
npm run web
```

### Building

```bash
# Build for development
eas build --profile development --platform all

# Build for production
eas build --profile production --platform all
```

## Project Structure

```
src/
├── components/           # Reusable components
│   ├── BarcodeScanner.tsx
│   ├── CameraCapture.tsx
│   ├── LoadingScreen.tsx
│   └── ErrorBoundary.tsx
├── database/            # SQLite database
│   ├── schema.ts
│   └── repositories/
│       └── InventoryRepository.ts
├── graphql/             # GraphQL client & queries
│   ├── client.ts
│   └── schema.ts
├── navigation/          # Navigation configuration
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── screens/             # Screen components
│   ├── auth/
│   ├── inventory/
│   └── settings/
├── services/           # Business logic services
│   ├── BiometricAuthService.ts
│   └── NotificationService.ts
├── store/              # Redux store & slices
│   ├── index.ts
│   └── slices/
└── utils/              # Helper functions
```

## Key Components

### 🗄️ Database Layer
- **SQLite with schema versioning**
- **Repository pattern for data access**
- **Automatic migrations**
- **Offline-first design**

### 🔄 Synchronization
- **Bi-directional sync with GraphQL API**
- **Optimistic updates**
- **Conflict resolution strategies**
- **Background sync with exponential backoff**

### 📱 Platform Integration
- **Native camera integration**
- **Biometric authentication**
- **Push notifications**
- **Background app refresh**

## Configuration

### GraphQL API
Update the GraphQL endpoint in your environment:
```typescript
// src/graphql/client.ts
const GRAPHQL_ENDPOINT = 'https://api.candlefish.ai/graphql';
const GRAPHQL_WS_ENDPOINT = 'wss://api.candlefish.ai/graphql';
```

### Database Schema
The app uses SQLite with the following main tables:
- `inventory_items` - Core inventory data
- `offline_mutations` - Sync queue
- `user_sessions` - Authentication data
- `app_settings` - User preferences

### Notifications
Configure notification channels in:
```typescript
// src/services/NotificationService.ts
await Notifications.setNotificationChannelAsync('low-stock', {
  name: 'Low Stock Alerts',
  importance: Notifications.AndroidImportance.HIGH,
  // ... other settings
});
```

## API Integration

The app connects to the Candlefish AI GraphQL API with the following key operations:

### Queries
- `GET_INVENTORY_ITEMS` - Fetch inventory with pagination
- `GET_INVENTORY_ITEM_BY_BARCODE` - Barcode lookup
- `GET_LOW_STOCK_ITEMS` - Items below threshold

### Mutations
- `CREATE_INVENTORY_ITEM` - Add new items
- `UPDATE_INVENTORY_ITEM` - Update existing items
- `UPDATE_INVENTORY_QUANTITY` - Quick quantity updates
- `BULK_UPDATE_INVENTORY` - Batch operations

### Subscriptions
- `INVENTORY_ITEM_UPDATED` - Real-time item changes
- `LOW_STOCK_ALERT` - Immediate stock alerts
- `INVENTORY_SYNC_STATUS` - Sync progress updates

## Security

### Data Protection
- **SQLite encryption** for local data
- **Secure credential storage** using Expo Secure Store
- **JWT token management** with automatic refresh
- **Biometric authentication** with fallback options

### Network Security
- **HTTPS/WSS only** for API communication
- **Token-based authentication** with short-lived JWTs
- **Request signing** for sensitive operations
- **Rate limiting** protection

## Performance

### Optimizations
- **Virtual scrolling** for large inventory lists
- **Image optimization** with caching
- **Background sync** to minimize UI blocking
- **Memory management** for camera operations
- **Bundle splitting** for faster app startup

### Monitoring
- **Performance metrics** collection
- **Error boundary** crash protection
- **Network status** monitoring
- **Sync performance** tracking

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suites
npm test -- --testPathPattern=inventory
```

## Deployment

### App Store Distribution
1. Build production release: `eas build --profile production`
2. Submit to App Store: `eas submit --platform ios`
3. Submit to Google Play: `eas submit --platform android`

### Over-the-Air Updates
```bash
# Publish OTA update
eas update --branch production
```

## Troubleshooting

### Common Issues

**Database initialization fails:**
```bash
# Clear app data and restart
expo r -c
```

**Biometric authentication not working:**
- Ensure device has biometric authentication set up
- Check permissions in app settings
- Verify physical device testing (simulators have limited support)

**Sync issues:**
- Check network connectivity
- Verify GraphQL endpoint configuration
- Monitor Redux DevTools for state changes

**Camera permissions denied:**
- Check device privacy settings
- Restart app after granting permissions
- Verify Expo permissions configuration

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact: support@candlefish.ai
- Documentation: https://docs.candlefish.ai

---

Built with ❤️ by the Candlefish AI team
