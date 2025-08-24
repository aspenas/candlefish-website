# Candlefish Partners Mobile Implementation

## Overview

The Candlefish Partners Portal has been enhanced with comprehensive mobile app features, transforming it into a Progressive Web App (PWA) optimized for field operators and technicians. This implementation follows the Candlefish philosophy of "Operational craft" - built for actual field use with systems that work offline and online.

## Architecture

### Mobile-First Design Philosophy
- **Touch-First Interface**: Large touch targets, gesture-based navigation
- **Field-Ready UI**: High contrast, readable in outdoor conditions
- **Offline-First**: Works seamlessly without internet connection
- **Battery Efficient**: Optimized for extended field use

### Progressive Web App (PWA) Features
- **App Installation**: Install directly from browser
- **Native Feel**: Behaves like a native mobile app
- **Background Sync**: Data syncs when connectivity returns
- **Push Notifications**: Critical updates even when app is closed

## Key Mobile Features

### 1. PWA Configuration (`/public/manifest.json`)
```json
{
  "name": "Candlefish Partners Portal",
  "short_name": "Candlefish Partners",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#3B82F6",
  "start_url": "/",
  "scope": "/"
}
```

**Features:**
- App shortcuts for quick access
- Custom splash screens
- Native app appearance
- Offline indicator

### 2. Service Worker (`/public/sw.js`)
```javascript
// Offline-first caching strategy
// Critical resource precaching
// Background sync for data updates
// Push notification handling
```

**Capabilities:**
- Cache-first strategy for fast loading
- Offline fallbacks for all features
- Automatic updates with user notification
- Background data synchronization

### 3. Mobile-First Components

#### Mobile Hero Section (`/src/components/sections/mobile/MobileHeroSection.tsx`)
- PWA install banner
- Network status indicator
- Quick actions menu
- Responsive stats display

#### Mobile Operator Network (`/src/components/sections/mobile/MobileOperatorNetwork.tsx`)
- Touch-friendly operator cards
- Real-time availability status
- Distance and location display
- Offline cached data

#### Mobile Implementation Guides (`/src/components/sections/mobile/MobileImplementationGuides.tsx`)
- Downloadable guides for offline use
- Progress tracking
- Media-rich documentation
- Search and filtering

### 4. Camera Integration

#### Field Documentation (`/src/components/camera/MobileCameraCapture.tsx`)
```typescript
interface CapturedImage {
  id: string
  dataUrl: string
  timestamp: number
  metadata: {
    location?: GeolocationPosition
    operator?: string
    jobId?: string
    tags?: string[]
  }
}
```

**Features:**
- Professional photo capture
- GPS metadata embedding
- Timestamp overlays
- Offline storage with auto-sync

#### Camera Hook (`/src/hooks/useCamera.ts`)
- Image management
- Upload queue for offline scenarios
- Storage optimization
- Sharing capabilities

### 5. Location Services

#### Location Hook (`/src/hooks/useLocation.ts`)
```typescript
interface LocationPreferences {
  enableTracking: boolean
  shareWithOperators: boolean
  accuracy: 'low' | 'medium' | 'high'
  updateInterval: number
}
```

**Features:**
- Real-time location tracking
- Nearby operator discovery
- Location sharing with privacy controls
- Battery-efficient positioning

#### Location Services Component (`/src/components/location/LocationServices.tsx`)
- Permission management
- Accuracy settings
- Nearby operators list
- Emergency location sharing

### 6. Push Notifications

#### Notification Manager (`/src/lib/push-notifications.ts`)
```typescript
interface NotificationPreferences {
  enabled: boolean
  operatorUpdates: boolean
  jobAssignments: boolean
  emergencyAlerts: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}
```

**Features:**
- Categorized notification types
- Quiet hours support
- Offline notification queuing
- Rich notification actions

### 7. Offline-First Data Strategy

#### Offline Storage (`/src/lib/offline-storage.ts`)
- IndexedDB for structured data
- Automatic cache management
- Sync queue for offline operations
- Storage usage monitoring

#### Apollo Offline Integration (`/src/lib/offline-apollo.ts`)
- GraphQL offline caching
- Optimistic updates
- Background sync
- Error handling

## Mobile Navigation

### Bottom Navigation Bar
- **Home**: Dashboard and overview
- **Network**: Operator availability
- **Guides**: Implementation documentation
- **Stories**: Success case studies

### Mobile Layout (`/src/components/layout/MobileLayout.tsx`)
- Responsive header with status indicators
- Slide-out navigation menu
- Quick action shortcuts
- PWA install prompts

## Field Use Cases

### 1. IoT Sensor Installation
```typescript
const workflow = [
  'Access implementation guides offline',
  'Document installation progress with photos',
  'Share location with supervisor for assistance',
  'Receive emergency notifications during work'
]
```

### 2. Industrial Automation Setup
- Real-time operator coordination
- Photo documentation with location data
- Offline guide access in areas with poor connectivity
- Push notifications for critical updates

### 3. Smart Building Integration
- Multi-site project coordination
- Visual progress tracking
- Team communication through location sharing
- Emergency response capabilities

## Technical Implementation

### Mobile-Responsive Design
```css
/* Mobile-first breakpoints */
sm: '640px'   // Small tablets
md: '768px'   // Tablets
lg: '1024px'  // Small laptops
xl: '1280px'  // Desktops
```

### Performance Optimizations
- **Image Optimization**: WebP format with fallbacks
- **Bundle Splitting**: Route-based code splitting
- **Lazy Loading**: Component and image lazy loading
- **Caching Strategy**: Stale-while-revalidate for dynamic content

### Security Considerations
- **HTTPS Only**: Required for PWA features
- **Secure Storage**: Encrypted local data storage
- **Permission Management**: Granular user permissions
- **Data Privacy**: Location and photo data protection

## Testing Strategy

### Mobile Testing
```bash
# Run on mobile devices
npm run dev
# Test PWA features
npm run build && npm run start
```

### Browser Testing
- **Chrome DevTools**: Mobile device simulation
- **Firefox**: PWA debugging tools
- **Safari**: iOS-specific testing
- **Edge**: PWA installation testing

### Real Device Testing
- iOS Safari (iPhone/iPad)
- Android Chrome
- Various screen sizes and orientations
- Different network conditions

## Deployment

### Build Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      }
    ]
  }
}
```

### Environment Variables
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://api.candlefish.ai/graphql
```

## Analytics and Monitoring

### PWA Analytics
- Installation rates
- Offline usage patterns
- Feature adoption metrics
- Performance monitoring

### Mobile-Specific Metrics
- Camera usage statistics
- Location sharing frequency
- Notification engagement rates
- Offline sync success rates

## Future Enhancements

### Phase 2 Features
- **AR Integration**: Augmented reality for equipment identification
- **Voice Commands**: Hands-free operation in field conditions
- **Advanced Sync**: Conflict resolution for offline changes
- **Team Chat**: Real-time communication between operators

### Phase 3 Features
- **Wearable Integration**: Smartwatch companion app
- **IoT Device Control**: Direct device management from mobile
- **AI Assistance**: Computer vision for equipment diagnostics
- **Advanced Analytics**: Predictive maintenance insights

## Getting Started

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test PWA features (requires build)
npm run build && npm run start
```

### Testing Mobile Features
1. **PWA Installation**: Use Chrome DevTools > Application > Manifest
2. **Offline Mode**: Toggle network in DevTools
3. **Push Notifications**: Test with browser push tools
4. **Camera Features**: Requires HTTPS in production

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to CDN/hosting platform
# Ensure HTTPS is enabled for PWA features
```

## Support and Documentation

### Browser Support
- **Chrome**: Full PWA support
- **Firefox**: Core features supported
- **Safari**: iOS PWA support with limitations
- **Edge**: Full PWA support

### Mobile OS Support
- **iOS**: 12.2+ (PWA support)
- **Android**: 5.0+ (Chrome PWA)
- **Feature Detection**: Graceful degradation for older devices

### Troubleshooting
- **Service Worker Issues**: Check browser console
- **PWA Installation**: Verify manifest and HTTPS
- **Camera Access**: Ensure permissions granted
- **Location Services**: Check device location settings

This mobile implementation transforms the Candlefish Partners Portal into a powerful field tool that respects the reality of operator work - intermittent connectivity, outdoor conditions, and the need for reliable, always-available functionality.