# Homepage UI/Animation Features

## Overview
The Candlefish.ai homepage now includes shader-based transitions, live API bindings with automatic fallbacks, and production-ready refresh mechanisms.

## New Components

### 1. HeaderText Component
- **Location**: `components/HeaderText.tsx`
- **Features**:
  - WebGL shader-based mist/fog dissolve transitions between projects
  - Pulls project titles from `/api/workshop/active` endpoint
  - 5-second rotation cycle with smooth transitions
  - Respects `prefers-reduced-motion` accessibility setting
  - Pauses when tab is hidden or component is off-screen

### 2. SystemActivity Component
- **Location**: `components/SystemActivity.tsx`
- **Features**:
  - Minimalist 1-2px activity bars fixed at page top
  - Canvas-based rendering for smooth 30-60 FPS animation
  - Subtle monochrome aesthetic with muted grayscale
  - Auto-refreshes data every 30 seconds
  - Performance-optimized with visibility detection

### 3. SystemArchitecture Component
- **Location**: `components/SystemArchitecture.tsx`
- **Features**:
  - NANDA-style node graph visualization
  - Three.js/React Three Fiber implementation
  - Node size based on log(streams) for visual hierarchy
  - Interactive hover tooltips showing franchise details
  - Three states: CALIBRATING (drift), ACTIVE (pulse), OPERATIONAL (particles)

## API Integration

### API Utils (`lib/api.ts`)
- Automatic fallback to local mock data on API failure
- 2-second timeout for all API requests
- Type-safe data validation
- Graceful error handling with console warnings

### Mock Data
- **Location**: `mock/` directory
- Contains fallback JSON for all API endpoints:
  - `workshop.json` - Active projects
  - `systemActivity.json` - System capacity/activity data
  - `franchises.json` - Franchise network graph

## Automation

### Local Development
```bash
# Refreshes mocks then starts dev server
npm run dev

# Manually refresh mocks
npm run refresh-mocks
```

### Production Build
```bash
# Refreshes mocks then builds
npm run build
```

### CI/CD Integration
- **GitHub Action**: `.github/workflows/refresh_mocks.yml`
- Runs nightly at 09:30 UTC (03:30 Denver time)
- Automatically commits updated mock data if APIs return new information
- Can be manually triggered via workflow_dispatch

## Configuration

### Environment Variables
- `NEXT_PUBLIC_CANDLEFISH_API_BASE` - API base URL (default: https://api.candlefish.ai)
- `NEXT_PUBLIC_ENABLE_ANIMATIONS` - Toggle animations on/off (default: true)

### Animation Settings
All components respect:
- `prefers-reduced-motion` media query
- Document visibility state (pause when hidden)
- Intersection Observer (pause when off-screen)

## Performance Considerations

1. **WebGL Components**: Use React Suspense for lazy loading
2. **Canvas Rendering**: Throttled to 30-60 FPS with RAF optimization
3. **Memory Management**: Proper cleanup in useEffect return functions
4. **Network Requests**: 2-second timeout with automatic fallback

## Accessibility

- All WebGL/Canvas elements have `aria-hidden="true"`
- Fallback to CSS transitions when reduced motion is preferred
- Keyboard navigation remains unaffected
- Semantic HTML structure preserved

## Testing

The implementation includes proper error boundaries and fallbacks:
- API failures gracefully fall back to mock data
- WebGL failures show static alternatives
- Missing dependencies are handled with default values

## Future Enhancements

Potential improvements for consideration:
1. Add WebSocket support for real-time data updates
2. Implement progressive enhancement for older browsers
3. Add configuration UI for animation preferences
4. Extend particle system for more complex data flows
