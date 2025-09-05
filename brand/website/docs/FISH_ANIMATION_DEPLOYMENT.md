# Bioluminescent Fish Animation - Deployment Guide

## Overview

The enhanced bioluminescent fish animation system provides advanced web platform features including mouse interaction, keyboard controls, scroll-based animations, WebGL shader effects, and browser-specific optimizations.

## Files Structure

```
/src/heroFish/
├── index.ts                 # Main entry point and exports
├── types.ts                 # Core types and math utilities
├── fish.ts                  # Fish behavior and animation logic
├── draw.ts                  # Rendering system
├── noise.ts                 # Noise generation for organic movement
├── telemetry.ts            # Performance monitoring
├── webEnhanced.ts          # Web platform enhancements
└── browserOptimization.ts   # Browser-specific optimizations

/components/
├── HeroFish.tsx            # Standard React component (enhanced)
└── WebEnhancedHeroFish.tsx # Advanced web features component
```

## Browser Compatibility Matrix

### Core Animation Support

| Browser | Version | Canvas 2D | WebGL | WebGL2 | OffscreenCanvas | Web Workers |
|---------|---------|-----------|-------|--------|-----------------|--------------|
| Chrome  | 80+     | ✅        | ✅     | ✅     | ✅              | ✅           |
| Firefox | 75+     | ✅        | ✅     | ✅     | ⚠️             | ✅           |
| Safari  | 14+     | ✅        | ✅     | ✅     | ❌              | ✅           |
| Edge    | 80+     | ✅        | ✅     | ✅     | ✅              | ✅           |

### Web Enhancement Features

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|---------|---------|--------|------|---------|
| Mouse Interaction | ✅ | ✅ | ✅ | ✅ | Full support |
| Keyboard Controls | ✅ | ✅ | ✅ | ✅ | Arrow keys, spacebar |
| Scroll Animation | ✅ | ✅ | ✅ | ✅ | Parallax effects |
| WebGL Shaders | ✅ | ✅ | ⚠️ | ✅ | Safari: limited advanced features |
| Fullscreen API | ✅ | ✅ | ✅ | ✅ | Vendor prefixes handled |
| Performance API | ✅ | ✅ | ⚠️ | ✅ | Safari: limited metrics |
| Memory Monitoring | ✅ | ❌ | ❌ | ✅ | Chrome/Edge only |

**Legend:**
- ✅ Full support
- ⚠️ Partial support
- ❌ Not supported

## Performance Characteristics

### Quality Tiers (Adaptive)

- **T1 (High)**: 60 FPS, full WebGL effects, advanced shaders, particle systems
- **T2 (Medium)**: 45+ FPS, basic WebGL, simplified shaders
- **T3 (Low)**: 30+ FPS, Canvas 2D fallback, minimal effects
- **T4 (Minimal)**: 20+ FPS, basic animation only

### Memory Usage

- **Base system**: ~2-4 MB heap
- **With WebGL**: +3-6 MB GPU memory
- **With Web Worker**: +1-2 MB worker heap
- **Total typical**: 6-12 MB depending on quality tier

### Bundle Size Impact

- **Core animation**: ~12 KB gzipped
- **Web enhancements**: +8 KB gzipped
- **Browser optimizations**: +4 KB gzipped
- **Total enhanced**: ~24 KB gzipped

## Deployment Configuration

### Environment Variables

```bash
# Enable development debugging
NODE_ENV=development  # Shows performance metrics overlay

# Production optimizations
NODE_ENV=production   # Disables debug features, enables optimizations
```

### Next.js Configuration

```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: false // Disable for client-side animation
  },
  webpack: (config) => {
    // Enable Web Workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });
    
    return config;
  },
};
```

### Build Optimizations

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

## Integration Examples

### Basic Usage (Backward Compatible)

```tsx
import HeroFish from '@/components/HeroFish'

export default function MyPage() {
  return (
    <section>
      <HeroFish />
    </section>
  )
}
```

### Advanced Usage with Web Enhancements

```tsx
import WebEnhancedHeroFish from '@/components/WebEnhancedHeroFish'

export default function InteractivePage() {
  const handleInteraction = (type: string, data: any) => {
    console.log('Fish interaction:', type, data)
  }

  const handlePerformance = (metrics: any) => {
    if (metrics.fish.fps < 30) {
      console.warn('Low performance detected')
    }
  }

  return (
    <section>
      <WebEnhancedHeroFish
        enableMouse={true}
        enableKeyboard={true}
        enableScroll={true}
        enableWebGL={true}
        enableFullscreen={true}
        onInteraction={handleInteraction}
        onPerformanceChange={handlePerformance}
        bounds={{ x: 0, y: 0, width: 1200, height: 600 }}
      />
    </section>
  )
}
```

### Manual Integration with Fish System

```tsx
import { useEffect, useRef } from 'react'
import { 
  createEnhancedHeroFish, 
  getBrowserOptimization,
  optimizeElementForBrowser 
} from '@/src/heroFish'

export default function CustomIntegration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current || !containerRef.current) return

      // Apply browser optimizations
      optimizeElementForBrowser(containerRef.current)

      // Create enhanced fish
      const { fish, webController } = await createEnhancedHeroFish(
        canvasRef.current,
        {
          bounds: { x: 0, y: 0, width: 800, height: 400 },
          enableWebEnhancements: true,
          mouseConfig: { followStrength: 0.5 },
          webGLConfig: { shaderQuality: 'high' }
        }
      )

      // Start interactions
      if (webController) {
        webController.start(containerRef.current)
      }

      fish.start()

      return () => {
        webController?.dispose()
        fish.dispose()
      }
    }

    init()
  }, [])

  return (
    <div ref={containerRef} style={{ width: 800, height: 400 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
```

## Performance Monitoring

### Development Debug Overlay

When `NODE_ENV=development`, a debug overlay shows:
- Current FPS
- WebGL status
- Mouse interaction state
- Active keyboard keys
- Scroll activity
- Quality tier
- Memory usage (Chrome/Edge)

### Production Telemetry

```tsx
import { getBrowserOptimization } from '@/src/heroFish'

const browserOpt = getBrowserOptimization()

// Monitor memory pressure
browserOpt.onMemoryPressure((pressure) => {
  if (pressure === 'high') {
    // Reduce animation quality
    fish.setQualityTier('T3')
  }
})

// Get performance metrics
const metrics = browserOpt.getPerformanceMetrics()
console.log('Browser performance:', metrics)
```

## Accessibility Features

### Reduced Motion Support

- Automatically detects `prefers-reduced-motion: reduce`
- Reduces frame rate to 30 FPS
- Disables WebGL effects
- Simplifies animation complexity

### Keyboard Navigation

- Container receives focus when enhanced
- Arrow keys control fish direction
- Spacebar triggers dart behavior
- F11 toggles fullscreen (when enabled)

### Screen Reader Support

- Proper ARIA labels describe interaction capabilities
- Non-interactive fallback for assistive technology
- Semantic role attributes

## Troubleshooting

### Common Issues

**Animation not starting:**
- Check browser console for initialization errors
- Verify canvas element is available before initialization
- Ensure container has non-zero dimensions

**Poor performance:**
- Check quality tier in debug overlay
- Monitor memory pressure
- Disable WebGL if GPU is weak
- Reduce bounds size for better performance

**WebGL not working:**
- Verify browser supports WebGL
- Check for hardware acceleration
- Fall back to Canvas 2D rendering

**Web enhancements not responding:**
- Ensure `enableWebEnhancements: true`
- Check that container has `pointerEvents: 'auto'`
- Verify event listeners are attached

### Performance Optimization Tips

1. **Reduce bounds size** for better performance on low-end devices
2. **Use quality tier T3 or T4** on mobile devices
3. **Disable WebGL** if CPU-bound
4. **Enable OffscreenCanvas** where supported
5. **Monitor memory pressure** and adjust accordingly

## Security Considerations

- Web Workers run in sandboxed contexts
- No external network requests
- No access to sensitive browser APIs
- Safe fallbacks for unsupported features
- CSP-compliant (no eval or inline scripts)

## Future Enhancements

- WebXR support for VR/AR experiences
- WebAssembly physics engine
- Advanced particle systems
- Multi-fish ecosystems
- Touch gesture recognition improvements
- Battery API integration for power management