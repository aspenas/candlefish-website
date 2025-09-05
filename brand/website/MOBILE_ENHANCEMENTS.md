# Mobile Enhancements for Bioluminescent Fish Animation

## Overview

The Enhanced HeroFish component provides comprehensive mobile optimization features for the bioluminescent fish animation, including touch interactions, device sensors, PWA capabilities, cross-platform compatibility, and accessibility enhancements.

## Features

### 1. Mobile Touch Interactions
- **Touch-to-Follow**: Fish follows touch input with configurable attraction strength
- **Touch-to-Dart**: Tap or swipe to trigger fish dart behavior
- **Multi-touch Support**: Handles pinch and gesture recognition
- **Touch Debouncing**: Prevents performance issues from rapid touch events
- **Pressure Sensitivity**: Uses force touch data when available

### 2. Device Orientation & Sensors
- **Gyroscope Integration**: Fish responds to device tilt
- **Accelerometer Support**: Environmental forces based on device motion
- **Permission Handling**: Proper iOS 13+ sensor permission requests
- **Smooth Interpolation**: Prevents jerky motion from sensor noise

### 3. Haptic Feedback
- **State-based Vibrations**: Different patterns for idle, dart, and recover states
- **Touch Feedback**: Immediate response to user interactions
- **Battery Awareness**: Reduces haptic intensity on low battery
- **Platform-specific Patterns**: Optimized for iOS and Android

### 4. Performance Scaling
- **Battery-aware Quality**: Automatically reduces quality on low battery
- **Network-aware Loading**: Adapts to connection speed and data saver mode
- **Device Capability Detection**: Adjusts based on RAM, CPU cores, and GPU
- **Adaptive Frame Rate**: Targets appropriate FPS for device capabilities

### 5. PWA Support
- **Offline Functionality**: Works without network connection
- **App Installation**: Native install prompts and shortcuts
- **Background Sync**: Syncs analytics and state when connection restored
- **Service Worker Caching**: Efficient asset management
- **IndexedDB Storage**: Persistent state and configuration storage

### 6. Cross-Platform Compatibility
- **React Native WebView**: Seamless integration with RN apps
- **Flutter Web Bridge**: Communication with Flutter host apps
- **iOS Safari Optimizations**: Handles Safari-specific quirks and limitations
- **Android Chrome Optimizations**: Leverages Chrome-specific features
- **Safe Area Support**: Respects notches and navigation bars

### 7. Accessibility Enhancements
- **Screen Reader Support**: Full VoiceOver/TalkBack compatibility
- **Keyboard Navigation**: Complete keyboard control with focus management
- **Touch Target Sizing**: Minimum 48x48px touch targets
- **High Contrast Mode**: Adapts to system contrast preferences
- **Reduced Motion**: Respects motion sensitivity preferences
- **Audio Descriptions**: Sound effects for state changes

## Usage

### Basic Implementation

```tsx
import EnhancedHeroFish from '../components/EnhancedHeroFish'

function MyComponent() {
  return (
    <EnhancedHeroFish
      width={800}
      height={600}
      enableTouchInteraction={true}
      enableDeviceOrientation={true}
      enableHapticFeedback={true}
      enablePWAFeatures={true}
      enableAccessibility={true}
    />
  )
}
```

### Advanced Configuration

```tsx
<EnhancedHeroFish
  // Dimensions
  width={800}
  height={600}
  className="my-fish-animation"
  
  // Mobile features
  enableTouchInteraction={true}
  enableDeviceOrientation={true}
  enableHapticFeedback={true}
  
  // PWA features
  enablePWAFeatures={true}
  
  // Accessibility
  enableAccessibility={true}
  announceStateChanges={true}
  
  // Performance
  adaptiveQuality={true}
  respectBatteryLevel={true}
  
  // Callbacks
  onFishStateChange={(state) => console.log('Fish state:', state)}
  onTouchInteraction={(pos, type) => console.log('Touch:', pos, type)}
  onPerformanceChange={(level) => console.log('Performance:', level)}
  
  // Development
  showDebugInfo={process.env.NODE_ENV === 'development'}
/>
```

## Architecture

### Module Structure
```
src/heroFish/
├── mobile.ts              # Touch interactions and device sensors
├── pwa.ts                 # PWA and offline support
├── crossPlatform.ts       # Platform compatibility layer
├── accessibility.ts       # Accessibility features
└── index.ts              # Main HeroFish class

components/
└── EnhancedHeroFish.tsx   # React component integration
```

### Key Classes

#### MobileEnhancementManager
- Detects mobile capabilities
- Manages touch event handling
- Provides device sensor access
- Monitors battery and network status

#### PWAManager
- Service worker registration
- IndexedDB storage management
- Installation prompt handling
- Background sync coordination

#### CrossPlatformManager
- Platform detection and optimization
- Safe area calculation
- WebView bridge communication
- Performance tuning per platform

#### AccessibilityManager
- Screen reader support
- Keyboard navigation
- ARIA attribute management
- Audio feedback system

## Performance Optimizations

### Quality Tiers
- **T1 (High)**: Full effects, 60 FPS, high particle count
- **T2 (Medium)**: Reduced effects, 60 FPS, medium particles
- **T3 (Low)**: Minimal effects, 30 FPS, low particles  
- **T4 (Minimal)**: No effects, 24 FPS, minimal particles

### Platform-Specific Optimizations

#### iOS Safari
- Reduced pixel ratio to 1.5x for performance
- Disabled antialiasing to prevent GPU overload
- Texture size limited to 1024px
- Memory limit set to 32MB

#### Android Chrome
- Maintains higher pixel ratio (up to 2x)
- Enables antialiasing for better quality
- Optimized particle systems
- Memory limit set to 48MB

#### WebView Environments
- Falls back to Canvas2D rendering
- Disables expensive bloom effects
- Reduces particle count significantly
- Implements conservative memory management

## Testing

### Running Tests
```bash
# Run mobile-specific tests
npm test -- __tests__/mobile/

# Run with coverage
npm run test:coverage -- __tests__/mobile/

# Run specific test file
npm test enhanced-hero-fish.test.tsx
```

### Test Coverage
- Touch interaction handling
- Device orientation response
- PWA installation flow
- Platform compatibility
- Accessibility compliance
- Performance adaptation
- Error handling and fallbacks

### Manual Testing Checklist

#### Mobile Devices
- [ ] Touch interactions work smoothly
- [ ] Device orientation affects fish movement
- [ ] Haptic feedback triggers appropriately
- [ ] PWA installs correctly
- [ ] Works offline
- [ ] Performance is acceptable on low-end devices

#### Accessibility
- [ ] Screen reader announces state changes
- [ ] Keyboard navigation works fully
- [ ] Touch targets are minimum 48x48px
- [ ] High contrast mode is supported
- [ ] Reduced motion is respected

#### Cross-Platform
- [ ] React Native WebView integration
- [ ] Flutter web bridge communication
- [ ] iOS Safari specific features
- [ ] Android Chrome optimizations
- [ ] Safe area handling on notched devices

## Deployment Considerations

### Service Worker Setup
Create `/public/sw-fish.js` with the generated service worker code:

```javascript
// Use the generated code from PWAManager.generateServiceWorkerCode()
```

### Manifest Configuration
Add to `/public/manifest.json`:

```json
{
  "name": "Candlefish Animation",
  "short_name": "Candlefish",
  "description": "Interactive bioluminescent fish animation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#3A3A60",
  "theme_color": "#FFB347",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Performance Monitoring
The component provides real-time metrics:

```tsx
<EnhancedHeroFish
  onPerformanceChange={(level) => {
    // Send to analytics
    analytics.track('fish_performance', { level })
  }}
  showDebugInfo={true} // Enable in development
/>
```

## Troubleshooting

### Common Issues

#### Touch Events Not Working
- Ensure `enableTouchInteraction={true}`
- Check that `touch-action: none` is applied
- Verify touch event preventDefault calls

#### Poor Performance on Mobile
- Enable `adaptiveQuality={true}`
- Check battery level and network conditions
- Consider using T3 or T4 quality tiers manually

#### PWA Not Installing
- Verify service worker registration
- Check manifest.json is properly served
- Ensure HTTPS is used (required for PWA)

#### Accessibility Issues
- Run automated accessibility tests
- Test with actual screen readers
- Verify ARIA attributes are present

### Debug Information
Enable debug mode to see:
- Current FPS and quality tier
- Platform and device information
- Touch and sensor capabilities
- Battery and network status
- Performance metrics

```tsx
<EnhancedHeroFish showDebugInfo={true} />
```

## Browser Support

### Minimum Requirements
- Chrome 80+
- Safari 13+
- Firefox 75+
- Edge 80+

### Feature Support Matrix
| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Touch Events | ✅ | ✅ | ✅ | ✅ |
| Device Orientation | ✅ | ⚠️* | ✅ | ✅ |
| Haptic Feedback | ✅ | ❌ | ❌ | ✅ |
| PWA Install | ✅ | ⚠️* | ⚠️* | ✅ |
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| WebGL | ✅ | ✅ | ✅ | ✅ |

*Requires user gesture or has limitations

## Contributing

### Adding New Mobile Features

1. Create feature module in `src/heroFish/`
2. Add integration to `EnhancedHeroFish.tsx`
3. Write comprehensive tests
4. Update documentation
5. Test across multiple devices

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Include JSDoc comments
- Handle errors gracefully
- Provide fallbacks for unsupported features

## License

Part of the Candlefish AI brand website project.