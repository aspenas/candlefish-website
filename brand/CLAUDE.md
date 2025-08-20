# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Candlefish Brand website is an experimental "operational atelier" - a living website that displays real-time business operations and craft. It's being transformed from a traditional marketing site into an immersive WebGL experience with real-time data visualization.

## Tech Stack

- **Framework**: Next.js 14.1.0 (App Router)
- **UI**: React 18.2.0 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **3D/WebGL**: Three.js, React Three Fiber, React Three Drei
- **Animation**: Framer Motion, GSAP, P5.js
- **Real-time**: Socket.io for WebSocket connections
- **Testing**: Jest, Cypress, Playwright
- **Infrastructure**: Kubernetes-ready, Terraform configs

## Development Commands

```bash
cd website/

# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Next.js linter

# Testing - run from website/ directory
npm test             # Run Jest unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:ci      # Run tests for CI (no watch, with coverage)
npm run test:e2e     # Run Cypress E2E tests headless
npm run test:e2e:open # Open Cypress test runner
npm run test:accessibility # Run Playwright accessibility tests
npm run test:performance # Run K6 load tests
npm run test:visual  # Run Playwright visual regression tests
npm run test:all     # Run all test suites

# Utilities
npm run export-pdf   # Export PDF documentation
```

## Architecture & Key Patterns

### Component Structure
The project uses a highly modular component architecture:

- **`/components/ui/`** - Base UI components (Button, Card, Input, etc.)
- **`/components/atelier/`** - Spatial/experimental components (CursorTrail, SpatialNavigation, TemporalEvolution)
- **`/components/spatial/`** - WebGL and 3D components
- **`/components/navigation/`** - Navigation components (OperationalNav, OperationalFooter)
- **`/components/sections/`** - Page sections (Hero, Features, Testimonials)
- **`/components/queue/`** - Queue management visualization

### Design System
Custom Tailwind configuration with architectural design tokens:
- **Colors**: `atelier-canvas`, `ink-primary`, `operation-active`, `material-concrete`
- **Typography**: Custom font stack with display, editorial, and mono families
- **Spacing**: CSS custom properties for consistent spacing (`--space-xs` through `--space-4xl`)
- **Animation**: Custom keyframes for `expand-h`, `reveal-v`, `fade-up`
- **Grid**: Custom `atelier` grid template for complex layouts

### Real-time Architecture
The site integrates with live operational systems:
- Jesse's Venue Ops (booking metrics)
- Crown Trophy system (order processing)
- Kind Home (assessment tracking)
- Data flows through WebSocket connections with obfuscation layer

### State Management
- Local state with React hooks
- Custom hooks in `/hooks/` for common patterns
- Real-time data via Socket.io subscriptions

## Testing Strategy

### Test Coverage Goals
- Minimum 80% coverage across all categories (branches, functions, lines, statements)
- Unit tests for all utilities and hooks
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Accessibility tests for WCAG compliance
- Performance tests targeting 1000 concurrent users

### Running Single Tests
```bash
# Run specific test file
npm test -- AssessmentForm.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"

# Run tests in specific directory
npm test -- __tests__/components
```

## Deployment Configuration

### Environments
- **Development**: Local Next.js dev server
- **Staging**: Kubernetes overlay in `/k8s/overlays/staging/`
- **Production**: Kubernetes overlay in `/k8s/overlays/production/`

### Infrastructure
- Kubernetes manifests in `/k8s/`
- Terraform modules for AWS infrastructure
- Monitoring with Prometheus/Grafana
- Blue-green deployment scripts in `/scripts/deployment/`

## Current Implementation Phase

As of the IMPLEMENTATION_ROADMAP.md, the project is transitioning through:
1. **Phase 1-2**: Real-time infrastructure setup (Redis, WebSocket, PostgreSQL)
2. **Phase 3**: WebGL spatial experience (Three.js environment)
3. **Phase 4**: Operational instruments (Assessor, Orchestrator, Monitor)
4. **Phase 5**: Performance optimization and production launch

Target: 1000 concurrent users with <100ms data latency and 60 FPS WebGL performance.

## Key Files to Understand

- `app/page.tsx` - Main operational homepage with real-time status
- `app/atelier/page.tsx` - Experimental WebGL atelier experience  
- `lib/operational-data.ts` - Operational data management
- `lib/queue-manager.ts` - Queue system implementation
- `lib/workshop-telemetry.ts` - Telemetry and metrics
- `lib/realtime/websocket-manager.ts` - WebSocket connection handling

## Performance Considerations

- WebGL requires adaptive quality renderer for browser compatibility
- Implement LOD (Level of Detail) system for 3D scenes
- Target 60 FPS with fallback to Canvas renderer
- Initial load time target: <2 seconds
- Use frame rate monitoring and memory management

## Security Notes

- All real-time data goes through differential privacy engine
- Implement obfuscation layer for sensitive metrics
- Authentication system for queue access
- Rate limiting on all API endpoints
- Data encryption for client storage