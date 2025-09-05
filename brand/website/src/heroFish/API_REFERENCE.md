# HeroFish Animation System - API Reference

## Overview

The HeroFish Animation System is a sophisticated, high-performance TypeScript library for creating bioluminescent fish animations with advanced rendering and performance capabilities.

### Key Features
- Noise-driven motion simulation
- Adaptive performance tiers
- Cross-platform support
- Reduced motion accessibility
- Zero external dependencies
- Bundle size ≤ 12KB gzipped

## Installation

```bash
npm install @candlefish/hero-fish
```

## Versioning

Current Version: `1.0.0`

## Core API

### `HeroFish` Class

#### Constructor
```typescript
constructor(config: HeroFishConfig = {})
```

#### Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvas` | `HTMLCanvasElement` | `undefined` | Target canvas for rendering |
| `bounds` | `Bounds` | `{ x: 0, y: 0, width: 800, height: 600 }` | Rendering area dimensions |
| `pixelRatio` | `number` | `window.devicePixelRatio` | Screen pixel density |
| `enableBloom` | `boolean` | `true` | Enable glow effect |
| `backgroundColor` | `string` | `BRAND_COLORS.deepIndigo` | Background color |
| `glowRadius` | `number` | `25` | Glow effect radius |
| `targetFPS` | `number` | `60` | Target frames per second |
| `enableAdaptiveQuality` | `boolean` | `true` | Dynamic quality adjustment |
| `respectReducedMotion` | `boolean` | `true` | Pause animation for reduced motion |
| `noiseSeed` | `number` | `Math.random() * 65536` | Noise generation seed |
| `useOffscreenCanvas` | `boolean` | Detect support | Use OffscreenCanvas if available |
| `enableTelemetry` | `boolean` | `true` | Enable performance tracking |

#### Methods

##### Initialization
- `init(canvas?: HTMLCanvasElement): Promise<void>`
  - Initialize the animation system
  - Required before calling `start()`

##### Animation Control
- `start(): void`
  - Begin animation
- `stop(): void`
  - Stop animation completely
- `pause(): void`
  - Temporarily pause animation
- `resume(): void`
  - Resume from paused state
- `reset(): void`
  - Reset to initial state

##### Configuration
- `updateConfig(newConfig: Partial<HeroFishConfig>): void`
  - Update configuration at runtime
- `resize(bounds: Bounds): void`
  - Dynamically resize animation area

##### Performance & Metrics
- `getStatus(): AnimationStatus`
  - Get current animation state
- `getMetrics(): PerformanceMetrics | null`
  - Retrieve performance metrics
- `getRenderStats(): Record<string, number>`
  - Get rendering statistics
- `setQualityTier(tier: QualityTier): void`
  - Force specific quality tier

##### Event Callbacks
- `onStateChange(callback: StateChangeCallback): void`
  - Listen for fish state changes
- `onPerformanceAlert(callback: PerformanceCallback): void`
  - Monitor performance alerts
- `onQualityChange(callback: QualityChangeCallback): void`
  - Track quality tier changes

##### Resource Management
- `dispose(): void`
  - Clean up all resources

### Quick Start Example

```typescript
import { createHeroFish } from '@candlefish/hero-fish';

async function initializeFishAnimation() {
  const canvas = document.getElementById('fish-canvas') as HTMLCanvasElement;
  
  const heroFish = await createHeroFish(canvas, {
    bounds: { x: 0, y: 0, width: 1200, height: 800 },
    enableBloom: true,
    respectReducedMotion: true
  });

  heroFish.onStateChange((oldState, newState) => {
    console.log(`Fish state changed from ${oldState} to ${newState}`);
  });

  heroFish.start();
}
```

## Performance Tiers

The system dynamically adjusts quality based on device capabilities:

| Tier | Description | Performance Target |
|------|-------------|---------------------|
| T1   | High Quality | 60 FPS, Full Effects |
| T2   | Medium Quality | 45 FPS, Reduced Effects |
| T3   | Low Quality | 30 FPS, Minimal Effects |
| T4   | Minimal Quality | Static Rendering |

## Accessibility

- Respects `prefers-reduced-motion` media query
- Automatically pauses/resumes based on page visibility
- Configurable motion reduction behavior

## Browser & Platform Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Desktop and mobile web
- React Native (with additional bridge)
- PWA compatible
- OffscreenCanvas support

## Error Handling

The system provides detailed error messages during initialization and runtime:

- Configuration validation
- Canvas availability checks
- Performance monitoring
- Graceful degradation

## TypeScript Support

Full TypeScript type definitions are included, providing:
- Comprehensive type checking
- IntelliSense support
- Compile-time safety

## Performance Optimization

- Noise-based motion simulation
- Dynamic quality adjustment
- Minimal memory allocation
- Frame time capping
- Adaptive rendering

## License

MIT License

## Contributing

See `CONTRIBUTING.md` in the project root for guidelines.

## Support

For issues, feature requests, or support:
- GitHub Issues
- Support Email: support@candlefish.ai