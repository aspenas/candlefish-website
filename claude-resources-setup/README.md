# Claude Resources Deployment System - Test Suite

A comprehensive test suite for the Claude resources deployment system, covering backend APIs, frontend components, GitHub Actions workflows, and end-to-end deployment flows.

## 🧪 Test Structure

```
__tests__/
├── setup/                    # Test configuration and setup
│   ├── jest.config.js       # Jest configuration
│   ├── jest.setup.js        # Global test setup
│   ├── global-setup.js      # Playwright global setup
│   └── global-teardown.js   # Playwright global teardown
├── mocks/                   # Mock data and API handlers
│   ├── server.js           # MSW server setup
│   ├── handlers.js         # API request handlers
│   └── data.js             # Mock data fixtures
├── unit/                   # Unit tests
│   ├── api/                # API client tests
│   └── components/         # React component tests
├── integration/            # Integration tests
│   └── github-actions.test.js  # GitHub Actions workflow tests
├── e2e/                    # End-to-end tests
│   └── deployment-flow.test.js  # Complete deployment flow
└── performance/            # Performance tests
    └── bulk-operations.test.js  # Bulk operation performance
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create a `.env.test` file for test configuration:

```env
# Test Environment Configuration
NODE_ENV=test
CI=false

# Service URLs
DASHBOARD_URL=http://localhost:5173
API_BASE_URL=http://localhost:3000

# Test Authentication
TEST_API_TOKEN=your-test-token-here
TEST_AUTH_USER=test-user@example.com

# GitHub Actions Testing
GITHUB_TOKEN=your-github-token-here
CLAUDE_API_KEY=your-claude-api-key-here

# Test Data Management
SETUP_TEST_DB=true
CLEANUP_TEST_DATA=true
```

## 📋 Test Commands

### Run All Tests

```bash
npm run test:all        # Run all test suites
npm run test:ci         # Run tests in CI mode
```

### Unit Tests

```bash
npm run test:unit       # Run unit tests
npm run test:watch      # Run unit tests in watch mode
npm run test:coverage   # Generate coverage report
```

### Integration Tests

```bash
npm run test:integration  # Run integration tests
```

### End-to-End Tests

```bash
npm run test:e2e        # Run E2E tests
npx playwright test     # Run E2E tests directly
npx playwright test --ui  # Run E2E tests with UI
```

### Performance Tests

```bash
npm run test:performance  # Run performance tests
```

### Debugging

```bash
npm run test:debug      # Debug tests with Node inspector
npx playwright test --debug  # Debug E2E tests
```

## 🎯 Test Coverage

The test suite covers:

### Backend API Endpoints

- ✅ `POST /repositories/{repo-id}/sync` - Repository synchronization
- ✅ `GET /sync/{sync-id}` - Sync operation status
- ✅ `POST /distribute` - Resource distribution
- ✅ `GET /status/overview` - System status overview
- ✅ `POST /local/setup/{repo-id}` - Local symlink setup

### Frontend Components

- ✅ **DeploymentDashboard** - Main dashboard with system overview
- ✅ **SyncProgressIndicator** - Real-time sync progress display
- ✅ **DeploymentActions** - Quick action buttons and execution
- ✅ **ErrorHandling** - Error display and recovery
- ✅ **OnboardingWizard** - Team member onboarding flow

### GitHub Actions Workflows

- ✅ **claude-org-setup.yml** - Organization-wide setup
- ✅ **claude-team-setup.yml** - Team member onboarding
- ✅ **claude-agents-sync.yml** - Automated resource synchronization

### End-to-End Flows

- ✅ **Complete Deployment Flow** - From setup to production
- ✅ **Team Onboarding** - Member invitation to active status
- ✅ **Error Recovery** - Handling and recovering from failures
- ✅ **Real-time Updates** - WebSocket communication testing

### Performance Testing

- ✅ **Bulk Operations** - Large-scale repository management
- ✅ **Concurrent Syncs** - Multiple simultaneous operations
- ✅ **Memory Usage** - Memory leak detection and optimization
- ✅ **API Rate Limiting** - Rate limit handling and backoff

## 📊 Coverage Targets

| Test Type | Coverage Target | Current |
|-----------|----------------|---------|
| Unit Tests | 80% | 🎯 |
| Integration Tests | 70% | 🎯 |
| E2E Tests | Key Flows | 🎯 |
| Performance Tests | Critical Paths | 🎯 |

## 🔧 Test Configuration

### Jest Configuration

- **Environment**: jsdom for components, node for API tests
- **Setup**: MSW for API mocking, React Testing Library
- **Coverage**: Lines, functions, branches, statements
- **Timeout**: 30 seconds for async operations

### Playwright Configuration

- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: iOS Safari, Android Chrome
- **Reporters**: HTML, JSON, JUnit for CI/CD integration
- **Artifacts**: Screenshots, videos, traces on failure

### Mock Service Worker (MSW)

- **API Mocking**: Consistent test data across all tests
- **Error Scenarios**: Network failures, timeouts, rate limits
- **Real-time Updates**: WebSocket message simulation

## 🐛 Debugging Tests

### Unit Test Debugging

```bash
# Debug specific test file
npm run test:debug -- --testPathPattern=DeploymentDashboard

# Debug with VS Code
# Add breakpoints and run "Debug Jest Tests" configuration
```

### E2E Test Debugging

```bash
# Run with headed browser
npx playwright test --headed

# Debug mode with step-by-step execution
npx playwright test --debug

# Generate trace for analysis
npx playwright test --trace on
```

### Mock API Debugging

```bash
# Enable MSW logging
MSW_LOGGING=true npm run test

# Debug specific API handlers
npm run test -- --verbose
```

## 🚦 CI/CD Integration

### GitHub Actions Integration

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### Coverage Reporting

- **HTML Reports**: Generated in `coverage/` directory
- **LCOV**: For SonarQube, Codecov integration
- **JSON**: For custom reporting tools

## 📝 Writing Tests

### Unit Test Example

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    const onAction = jest.fn()

    render(<MyComponent onAction={onAction} />)

    await user.click(screen.getByRole('button'))

    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
```

### E2E Test Example

```javascript
import { test, expect } from '@playwright/test'

test('deployment flow', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1')).toContainText('Claude Resources')

  await page.click('button:has-text("Sync All")')

  await expect(page.locator('.progress-bar')).toBeVisible()
})
```

### Performance Test Example

```javascript
describe('Bulk Operations Performance', () => {
  it('should handle 1000 repositories efficiently', async () => {
    const startTime = performance.now()

    const result = await processRepositories(mockRepos1000)

    const executionTime = performance.now() - startTime

    expect(result).toHaveLength(1000)
    expect(executionTime).toBeLessThan(1000) // < 1 second
  })
})
```

## 🔍 Test Data Management

### Mock Data

- **Repositories**: Various states (synced, syncing, error)
- **Team Members**: Different roles and onboarding stages
- **Sync Operations**: Active, completed, failed operations
- **System Status**: Healthy, degraded, critical states

### Test Utilities

- **Factory Functions**: Generate test data dynamically
- **Cleanup Helpers**: Reset state between tests
- **Assertion Helpers**: Custom matchers for domain objects

## 📈 Performance Benchmarks

| Operation | Target Time | Memory Limit |
|-----------|-------------|--------------|
| Load 1000 repos | < 100ms | < 50MB |
| Bulk sync 50 repos | < 1s | < 100MB |
| Real-time updates | < 10ms | < 10MB |
| Dashboard render | < 200ms | < 20MB |

## 🛠 Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase timeout for specific tests
jest.setTimeout(60000)

# Or in Playwright
test.setTimeout(60000)
```

#### MSW Not Working

```bash
# Check MSW setup in jest.setup.js
# Ensure handlers are properly configured
# Verify API endpoints match exactly
```

#### E2E Tests Flaky

```bash
# Use waitFor assertions
await expect(page.locator('text=Loading')).not.toBeVisible()

# Add explicit waits
await page.waitForLoadState('networkidle')
```

#### Coverage Too Low

```bash
# Check untested files
npm run test:coverage -- --verbose

# Focus on critical paths first
# Add tests for error scenarios
```

## 🤝 Contributing

### Before Submitting Tests

1. Run full test suite: `npm run test:all`
2. Check coverage: `npm run test:coverage`
3. Lint tests: `npm run lint`
4. Validate workflows: `npm run validate:workflows`

### Test Guidelines

- **Arrange-Act-Assert**: Clear test structure
- **Descriptive Names**: Test names should describe behavior
- **Single Responsibility**: One assertion per test when possible
- **Mock External Dependencies**: Keep tests isolated
- **Test Edge Cases**: Happy path + error scenarios

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs)
- [GitHub Actions Testing](https://docs.github.com/en/actions/automating-builds-and-tests)

## 📞 Support

For questions about the test suite:

- 📧 Email: <dev-team@candlefish.ai>
- 💬 Slack: #claude-resources-testing
- 📝 Issues: GitHub Issues

---

**Happy Testing! 🧪✨**
