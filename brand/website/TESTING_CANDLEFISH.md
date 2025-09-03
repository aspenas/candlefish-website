# Candlefish Animation Testing Suite

Comprehensive test documentation for the enhanced bioluminescent candlefish animation with emotional AI and personality system.

## Overview

This testing suite covers all aspects of the candlefish animation system:

- **Emotional State Machine**: 6 moods (curious, playful, shy, excited, trusting, lonely)
- **Memory System**: Trust building, feeding location memory, visit tracking
- **Particle Systems**: Food particles, bubble effects, trail rendering
- **API Integration**: Session management, interaction tracking, mood transitions
- **WebSocket Events**: Real-time mood changes, trust updates, feeding events
- **Visual Regression**: Mood appearances, particle effects, responsive design
- **Performance**: Animation smoothness, memory usage, load testing

## Test Categories

### 1. Unit Tests (Jest)

Tests for core emotional AI system classes:

```bash
# Run all unit tests
npm run test:unit

# Run specific test files
npm test web/aquarium/__tests__/emotional-state-machine.test.ts
npm test web/aquarium/__tests__/memory-system.test.ts
npm test web/aquarium/__tests__/particle-system.test.ts

# Watch mode for development
npm run test:watch
```

**Coverage Areas:**
- EmotionalStateMachine: State transitions, mood evaluation, history tracking
- MemorySystem: Trust calculations, feeding memory, localStorage persistence
- ParticleSystem: Food physics, bubble generation, collision detection

### 2. Integration Tests (Jest)

Tests for API endpoints and WebSocket communication:

```bash
# Run integration tests
npm run test:integration

# Specific API tests
npm test __tests__/integration/fish-api-integration.test.ts
npm test __tests__/integration/websocket-events.test.ts
```

**API Endpoints Tested:**
- `POST /api/fish/session` - Session creation and restoration
- `POST /api/fish/interaction` - User interaction recording
- `POST /api/fish/feed` - Feeding mechanics
- `GET /api/fish/personality` - Personality data retrieval
- `POST /api/fish/mood` - Mood change triggers
- `GET /api/fish/memory` - Memory data access

**WebSocket Events:**
- `mood-change` - Real-time mood transitions
- `trust-update` - Trust level changes and milestones
- `feeding-event` - Food placement, consumption, expiration
- `memory-save` - Memory persistence events
- `visitor-recognized` - Returning visitor detection

### 3. End-to-End Tests (Cypress)

Complete user interaction flows:

```bash
# Run E2E tests headless
npm run test:e2e

# Open Cypress test runner
npm run test:e2e:open

# Run specific test file
npx cypress run --spec "cypress/e2e/enhanced-candlefish-interactions.cy.ts"
```

**Test Scenarios:**
- First-time visitor experience and trust building
- Mood transitions through various interactions
- Feeding mechanics and memory formation
- Returning visitor recognition and bonuses
- Memory persistence across page reloads
- Performance under rapid interactions

### 4. Visual Regression Tests (Playwright)

Visual appearance testing for different moods:

```bash
# Run visual tests
npm run test:visual

# Update screenshots (when UI intentionally changes)
npx playwright test --update-snapshots

# Run specific visual tests
npx playwright test __tests__/visual/candlefish-mood-appearances.test.ts
```

**Visual Components Tested:**
- Mood-specific colors and glow effects
- Particle system rendering (food, bubbles, trails)
- Background mood influences
- Responsive design across screen sizes
- Error states and fallbacks

### 5. Performance Tests (K6)

Animation smoothness and load testing:

```bash
# Run performance tests
npm run test:performance

# Custom K6 run with specific users
k6 run --vus 10 --duration 30s __tests__/performance/k6/candlefish-animation-performance.js

# Run with environment variables
BASE_URL=https://staging.example.com k6 run __tests__/performance/k6/candlefish-animation-performance.js
```

**Performance Metrics:**
- Animation FPS (target: ≥30 FPS)
- Memory usage (target: <100MB)
- Interaction response time (target: <100ms)
- Trust calculation performance
- Mood transition speed
- Particle system efficiency

## Running All Tests

### Automated Test Suite

Use the comprehensive test runner:

```bash
# Run all test types
node scripts/run-candlefish-tests.js

# Run specific test types only
node scripts/run-candlefish-tests.js --only unit,integration

# Skip specific test types
node scripts/run-candlefish-tests.js --skip performance

# Continue on failure (don't stop at first failure)
node scripts/run-candlefish-tests.js --continue-on-failure

# CI mode (sequential execution)
node scripts/run-candlefish-tests.js --ci
```

### Individual Test Commands

```bash
# Unit tests with coverage
npm run test:candlefish

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Visual regression tests
npm run test:visual

# Performance tests
npm run test:performance

# All tests (custom runner)
npm run test:all
```

## Test Configuration

### Coverage Thresholds

```javascript
// jest.config.candlefish.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Performance Thresholds

```javascript
// K6 performance thresholds
thresholds: {
  animation_fps: ['value>=30'],
  animation_memory_mb: ['value<100'],
  interaction_response_time: ['p(95)<100'],
  trust_calculation_time: ['p(95)<50'],
  mood_transition_time: ['p(95)<200']
}
```

## Test Data and Fixtures

### Mock Data Examples

```javascript
// Emotional state mock
const mockEmotionalState = {
  mood: 'curious',
  intensity: 0.5,
  duration: 0,
  transitionSpeed: 1.0
}

// Memory data mock
const mockMemoryData = {
  trustLevel: 65,
  lastInteraction: Date.now(),
  feedingSpots: [{ x: 200, y: 150 }],
  interactionCount: 25,
  visitDates: [Date.now()]
}
```

### Test Environment Setup

```javascript
// localStorage mock for browser environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

## Debugging Tests

### Jest Debugging

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --testNamePattern="should transition to excited state"
```

### Cypress Debugging

```bash
# Open Cypress with debugging
DEBUG=cypress:* npx cypress open

# Run with video recording
npx cypress run --record --video
```

### Playwright Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Debug mode with browser
npx playwright test --debug
```

## Continuous Integration

### GitHub Actions Example

```yaml
- name: Run Candlefish Tests
  run: |
    npm ci
    npm run build
    node scripts/run-candlefish-tests.js --ci --continue-on-failure
  env:
    CI: true
    SERVER_RUNNING: false
```

### Test Reports

Tests generate comprehensive reports:

- **HTML Reports**: `./test-reports/html/`
- **JUnit Reports**: `./test-reports/junit/`
- **Coverage Reports**: `./test-reports/coverage/`
- **Performance Reports**: `./test-reports/k6-results.json`
- **Visual Diff Reports**: `./test-results/`

## Development Workflow

### Pre-commit Testing

```bash
# Quick test before commit
npm run test:unit
npm run test:related $(git diff --cached --name-only)

# Full test before push
node scripts/run-candlefish-tests.js --skip performance
```

### Test-Driven Development

1. Write failing test for new feature
2. Implement minimal code to pass test
3. Refactor while keeping tests green
4. Add edge cases and error handling tests

### Updating Tests

When adding new moods or features:

1. Update unit tests for new behavior
2. Add integration tests for new API endpoints
3. Create E2E scenarios for new user flows
4. Capture visual regression tests for new appearances
5. Update performance baselines if needed

## Troubleshooting

### Common Issues

**Tests timing out:**
```bash
# Increase timeout in jest.config.js
testTimeout: 30000 // 30 seconds
```

**WebSocket connection failures:**
```bash
# Ensure local server is running
npm run dev
# Or set SERVER_RUNNING=true
```

**Visual test differences:**
```bash
# Update snapshots after intentional changes
npx playwright test --update-snapshots
```

**K6 not found:**
```bash
# Install K6 (macOS)
brew install k6

# Install K6 (Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Getting Help

- Check test logs in `./test-reports/`
- Review failed screenshots in `./test-results/`
- Run tests with `--verbose` flag for detailed output
- Use debugging modes for step-by-step execution

## Contributing

When contributing to the candlefish animation system:

1. **Always write tests** for new features
2. **Maintain high coverage** (80%+ required)
3. **Test all mood states** for behavioral changes
4. **Include visual tests** for appearance changes
5. **Performance test** intensive features
6. **Update documentation** for new test scenarios

### Test Checklist

- [ ] Unit tests for core logic
- [ ] Integration tests for API changes
- [ ] E2E tests for user flows
- [ ] Visual tests for UI changes
- [ ] Performance tests for optimization
- [ ] Error handling tests
- [ ] Cross-browser compatibility tests
- [ ] Mobile responsiveness tests
- [ ] Accessibility compliance tests

This comprehensive testing suite ensures the candlefish animation system is robust, performant, and delightful for users across all interaction scenarios.