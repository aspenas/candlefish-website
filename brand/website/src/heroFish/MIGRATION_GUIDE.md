# HeroFish Animation System - Migration Guide

## Version Compatibility

### Migrating to v1.0.0

#### Breaking Changes
- Renamed primary class from `FishAnimation` to `HeroFish`
- Consolidated configuration options
- Enhanced performance tier system
- Updated callback signature

#### Migration Steps

1. **Install New Version**
   ```bash
   npm install @candlefish/hero-fish@1.0.0
   ```

2. **Update Import**
   ```typescript
   // Old
   import FishAnimation from 'fish-animation';

   // New
   import HeroFish from '@candlefish/hero-fish';
   ```

3. **Configuration Changes**
   ```typescript
   // Old
   const animation = new FishAnimation({
     canvas: myCanvas,
     width: 800,
     height: 600,
     quality: 'high'
   });

   // New
   const heroFish = new HeroFish({
     canvas: myCanvas,
     bounds: { x: 0, y: 0, width: 800, height: 600 },
     enableAdaptiveQuality: true
   });
   ```

4. **Initialization**
   ```typescript
   // Old
   animation.initialize().then(() => animation.start());

   // New
   await heroFish.init();
   heroFish.start();
   ```

5. **Event Callbacks**
   ```typescript
   // Old
   animation.on('stateChange', (state) => {});

   // New
   heroFish.onStateChange((oldState, newState) => {});
   ```

6. **Performance Monitoring**
   ```typescript
   // Old
   animation.getPerformance();

   // New
   heroFish.getMetrics();
   ```

#### Configuration Mapping

| v0.x Option | v1.0.0 Equivalent |
|-------------|-------------------|
| `width/height` | `bounds: { width, height }` |
| `quality` | `enableAdaptiveQuality` |
| `motionSensitivity` | `respectReducedMotion` |
| `renderMode` | Automatic quality tiers |

### Upgrade Checklist

- [ ] Update package to latest version
- [ ] Review breaking changes
- [ ] Update configuration
- [ ] Modify initialization logic
- [ ] Update event handling
- [ ] Test performance metrics
- [ ] Verify rendering quality

## Performance Considerations

- The new version uses more sophisticated noise generation
- Quality tiers are now more granular
- Memory usage is optimized
- Reduced motion support is more robust

## Troubleshooting

### Common Migration Issues

1. **Configuration Errors**
   - Ensure you're using the new `bounds` configuration
   - Check that canvas is properly initialized

2. **Performance Callbacks**
   - Event signatures have changed
   - Use new `onStateChange`, `onPerformanceAlert` methods

3. **Quality Tier Management**
   - Automatic tier selection replaces manual quality setting
   - Use `setQualityTier()` for forced tier selection

## Compatibility Notes

- Supports all modern browsers
- Requires TypeScript 4.5+
- Node.js 16.13.0 or later recommended

## Support

For migration assistance:
- GitHub Discussions
- Support Email: support@candlefish.ai
- Community Slack Channel

## Contributing

Help improve the migration process:
- File issues on GitHub
- Submit pull requests
- Share migration experiences