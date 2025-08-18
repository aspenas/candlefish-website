# Candlefish Figma Plugin - Test Commands Reference

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Test Commands

### Basic Testing
```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, exit after completion)
npm run test:ci
```

### Specific Test Types
```bash
# Run only unit tests (excludes integration tests)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run specific test file
npm test color.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="color conversion"
```

### Development Commands
```bash
# Type check all TypeScript files
npm run type-check

# Type check test files specifically
npm run lint:test

# Build plugin for testing
npm run build

# Build scripts for testing
npm run build:scripts
```

## Coverage Commands

### Generate Coverage Reports
```bash
# HTML coverage report (opens in browser)
npm run test:coverage
open coverage/lcov-report/index.html

# Text coverage summary
npm test -- --coverage --coverageReporters=text

# JSON coverage data
npm test -- --coverage --coverageReporters=json
```

### Coverage Thresholds
Current thresholds (configured in jest.config.js):
- Branches: 80%
- Functions: 80% 
- Lines: 80%
- Statements: 80%

## Debugging Tests

### Verbose Output
```bash
# Show all test descriptions and results
npm test -- --verbose

# Show test output (console.log, etc.)
npm test -- --verbose --no-silent
```

### Debug Specific Tests
```bash
# Run single test file with verbose output
npm test color.test.ts -- --verbose

# Run tests matching specific pattern
npm test -- --testNamePattern="hex.*conversion"

# Run tests in specific directory
npm test __tests__/
```

### Debug Failed Tests
```bash
# Only run tests that failed in last run
npm test -- --onlyFailures

# Run tests and stop on first failure
npm test -- --bail

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot
```

## Performance Testing

### Test Performance
```bash
# Run tests with timing information
npm test -- --verbose --detect-slow-tests-ms=1000

# Run tests with memory usage
npm test -- --logHeapUsage

# Run specific performance test
npm test performance -- --testNamePattern="should handle large"
```

## Environment Variables

### Test Configuration
```bash
# Set test timeout
JEST_TIMEOUT=30000 npm test

# Run tests in specific environment
NODE_ENV=test npm test

# Enable debug logging
DEBUG=* npm test

# Skip slow tests
SKIP_SLOW_TESTS=true npm test
```

### Figma API Testing
```bash
# Test with actual Figma token (integration tests)
FIGMA_TOKEN=your_token npm run test:integration

# Test export functionality
FIGMA_TOKEN=token FIGMA_FILE_KEY=key npm test export.test.ts
```

## CI/CD Commands

### GitHub Actions
```bash
# Simulate CI test run locally
npm run test:ci

# Run tests with JUnit output for CI
npm test -- --reporters=jest-junit

# Generate coverage for CI
npm test -- --coverage --coverageReporters=lcov
```

### Pre-commit Testing
```bash
# Run all checks before commit
npm run type-check && npm run test:ci

# Quick smoke test
npm run test:unit

# Full validation
npm run type-check && npm run lint:test && npm run test:coverage
```

## Test File Organization

```
__tests__/
├── color.test.ts           # Color utility tests
├── tokens.test.ts          # Token generation tests  
├── components.test.ts      # Component creation tests
├── integration.test.ts     # Full workflow tests
├── export.test.ts         # Export functionality tests
├── utils.test.ts          # Test utilities
└── setup.ts              # Test configuration
```

## Mock Data Commands

### Generate Test Data
```bash
# Test token generation
npm run tokens

# Verify token output
cat dist/tokens/color.json | jq '.color.brand'
cat dist/tokens/type.json | jq '.type.h1'
```

### Test Export Simulation
```bash
# Build export scripts
npm run build:scripts

# Test export with mock data (requires FIGMA_TOKEN)
FIGMA_TOKEN=test npm run export:assets mock-file-key
```

## Troubleshooting

### Common Issues

#### Tests hanging
```bash
# Force exit after 30 seconds
timeout 30s npm test

# Run with detectOpenHandles to find issues
npm test -- --detectOpenHandles
```

#### Memory issues
```bash
# Increase memory limit
node --max-old-space-size=4096 node_modules/.bin/jest

# Run tests sequentially (slower but less memory)
npm test -- --runInBand
```

#### Type errors in tests
```bash
# Check test TypeScript configuration
npm run lint:test

# Verify test dependencies
npm ls @types/jest
```

#### Coverage issues
```bash
# Clear Jest cache
npm test -- --clearCache

# Reset coverage data
rm -rf coverage/ && npm run test:coverage
```

### Clean Reset
```bash
# Full clean and reinstall
rm -rf node_modules/ package-lock.json coverage/
npm install
npm test
```

## Advanced Usage

### Custom Test Configurations
```bash
# Run with custom Jest config
npm test -- --config=custom-jest.config.js

# Override specific settings
npm test -- --collectCoverageFrom="plugin/src/*.ts"

# Run with different test environment
npm test -- --testEnvironment=jsdom
```

### Parallel Testing
```bash
# Run tests in parallel (default)
npm test

# Run tests sequentially
npm test -- --runInBand

# Limit worker processes
npm test -- --maxWorkers=2
```

### Watch Mode Options
```bash
# Watch all files
npm run test:watch

# Watch only test files
npm test -- --watch --watchPathIgnorePatterns=plugin/build

# Watch with specific patterns
npm test -- --watch --testPathPattern=color
```

## Integration with Development Tools

### VS Code Integration
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npm test",
      "group": "test"
    }
  ]
}
```

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test
npx husky add .husky/pre-commit "npm run test:ci"
```

## Performance Benchmarks

Expected test execution times:
- Unit tests: < 5 seconds
- Integration tests: < 10 seconds
- Full test suite: < 15 seconds
- Coverage generation: +2-3 seconds

If tests exceed these times, consider optimizing or investigating performance issues.
