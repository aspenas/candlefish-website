# Candlefish Aquarium Animation

A minimalist, bioluminescent candlefish animation rendered via Canvas for the Candlefish brand website.

## Features

- **Minimalist Design**: Single candlefish with vector outline glyph
- **Bioluminescent Glow**: Amber Flame (#FFB347) on Deep Indigo (#3A3A60) background
- **Organic Motion**: Calm idle swimming with occasional dart bursts
- **Interactive**: Responds to cursor proximity and click/tap ripples
- **Accessible**: Respects `prefers-reduced-motion` with static SVG fallback
- **Performant**: Targets 60fps desktop, 30-45fps mobile with <5% CPU usage

## Installation

The candlefish animation is implemented as both a Web Component and React component.

### React Component

```tsx
import CandleFish from '@/web/aquarium/react/CandleFish'

function MyPage() {
  return (
    <CandleFish 
      height={240}
      className="my-aquarium"
      aria-label="Bioluminescent candlefish animation"
    />
  )
}
```

### Web Component

```html
<candle-fish height="240"></candle-fish>

<script type="module">
  import '@/web/aquarium/candle-fish'
</script>
```

### Vanilla JavaScript

```javascript
import { CandlefishEngine } from '@/web/aquarium/candlefish'

const canvas = document.querySelector('canvas')
const engine = new CandlefishEngine(canvas)
engine.start()

// Cleanup when done
engine.destroy()
```

## Configuration

### Environment Variables

- `NEXT_PUBLIC_FISH_ANIM`: Set to `0` to disable animation (defaults to enabled)
- `VITE_FISH_ANIM`: Alternative for Vite-based builds

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | number | 240 | Canvas height in pixels (desktop) |
| `className` | string | '' | Additional CSS classes |
| `disabled` | boolean | false | Force static fallback |
| `static` | boolean | false | Use static SVG instead of animation |
| `aria-label` | string | 'Animated...' | Accessibility label |

## Architecture

### Core Engine (`candlefish.ts`)
- Canvas-based rendering with 2D context
- Frame-based animation loop with requestAnimationFrame
- Physics simulation for fish movement
- Trail rendering with decay
- Ripple effect system
- Cursor tracking and interaction

### Motion System (`noise.ts`)
- Perlin noise for organic movement
- Simplex noise for smoother transitions
- Octave noise for layered complexity

### Component Wrappers
- Web Component (`candle-fish.ts`): Custom element with shadow DOM
- React Component (`CandleFish.tsx`): React wrapper with hooks
- Both handle lifecycle, visibility, and responsive behavior

## Performance

### Optimization Strategies
- Visibility-based pause/resume
- Intersection Observer for viewport detection
- Document visibility API integration
- Efficient trail management with fixed buffer
- Canvas layer optimization
- Memory-conscious noise caching

### Benchmarks
- Desktop: 60fps @ 1920x1080
- Mobile: 45fps @ 375x667
- CPU Usage: <5% on modern hardware
- Bundle Size: ~10kb gzipped

## Accessibility

### Reduced Motion
The component automatically detects and respects `prefers-reduced-motion`:
- Shows static SVG fallback when reduced motion is preferred
- Maintains visual presence without animation
- Preserves brand aesthetic

### Screen Readers
- Proper ARIA labels on all interactive elements
- Descriptive alternative text for static fallback
- Semantic HTML structure

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Maintenance

### Updating Animation Parameters

Key constants in `candlefish.ts`:
```typescript
MAX_SPEED = 2.5        // Maximum swim speed
IDLE_SPEED = 0.8       // Base cruising speed
DART_SPEED = 5         // Burst speed
TRAIL_LENGTH = 30      // Number of trail points
CURIOSITY_RADIUS = 150 // Cursor attraction radius
```

### Modifying Visual Style

Colors and effects:
```typescript
GLOW_COLOR = '#FFB347'      // Amber Flame
BACKGROUND_COLOR = '#3A3A60' // Deep Indigo
```

### Debugging

Enable debug mode in browser console:
```javascript
window.CANDLEFISH_DEBUG = true
```

## Troubleshooting

### Animation Not Showing
1. Check environment variable `NEXT_PUBLIC_FISH_ANIM`
2. Verify canvas element exists in DOM
3. Check browser console for errors
4. Ensure JavaScript is enabled

### Performance Issues
1. Check CPU usage in browser DevTools
2. Verify requestAnimationFrame is firing
3. Check for memory leaks in Performance tab
4. Consider reducing trail length or effects

### Static Fallback Issues
1. Verify `/img/candlefish-static.svg` exists
2. Check network tab for 404 errors
3. Ensure proper CORS headers if hosted externally

## License

Proprietary - Candlefish AI © 2025