# Candlefish Figma Plugin - Testing Framework

This directory contains a comprehensive testing framework for the Candlefish Figma plugin, including unit tests, integration tests, and testing utilities.

## Test Structure

```
__tests__/
├── setup.ts                 # Jest setup and Figma API mocks
├── color.test.ts            # Color conversion function tests
├── tokens.test.ts           # Token generation tests
├── components.test.ts       # Component creation tests
├── integration.test.ts      # Full plugin flow tests
├── export.test.ts          # Export functionality tests
├── utils.test.ts           # Test utilities and helpers
├── tsconfig.json           # TypeScript config for tests
└── README.md               # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### CI Mode
```bash
npm run test:ci
```

## Test Categories

### Unit Tests

#### Color Tests (`color.test.ts`)
- Hex to RGB conversion accuracy
- Color validation
- Brand color compliance
- Neutral scale progression
- Error handling for invalid colors

#### Token Tests (`tokens.test.ts`)
- Color token structure validation
- Typography token validation
- File generation testing
- Token naming conventions
- JSON output validation

#### Component Tests (`components.test.ts`)
- Logo component creation
- Base component structure
- Layout properties
- Typography styles
- Export settings configuration

### Integration Tests (`integration.test.ts`)
- Complete plugin execution flow
- Page creation and organization
- Font loading with fallbacks
- Variable collection setup
- Performance testing

### Export Tests (`export.test.ts`)
- Figma API authentication
- Node discovery in document tree
- Image export requests (SVG, PDF)
- File download and save operations
- Error handling and recovery

## Mock Framework

### Figma API Mocks
The testing framework includes comprehensive mocks for the Figma plugin API:

- `MockFigmaNode` - Base node implementation
- `MockPageNode` - Page-specific functionality
- `MockComponentNode` - Component creation
- `MockFrameNode` - Frame and layout features
- `MockTextNode` - Text and typography
- `MockPaintStyle` - Color style management
- `MockTextStyle` - Typography style management

### Global Setup
- Figma API objects are mocked globally
- Console methods are mocked to reduce test noise
- Fetch is mocked for API testing
- Base64 functions are available for image testing

## Test Utilities

### Color Utilities (`colorUtils`)
```typescript
// Convert colors and test contrast
const rgb = colorUtils.hexToRgb('#11D9E6');
const ratio = colorUtils.getContrastRatio('#FFFFFF', '#000000');
const isValid = colorUtils.isValidHex('#11D9E6');
```

### Component Utilities (`componentUtils`)
```typescript
// Create test components quickly
const component = componentUtils.createTestComponent('Test', 200, 100);
componentUtils.verifyComponentStructure(component, 1);
```

### Performance Utilities (`performanceUtils`)
```typescript
// Measure execution time
const { result, duration } = performanceUtils.measureExecutionTime(() => {
  // Your code here
});
```

### Brand Validation (`brandUtils`)
```typescript
// Validate brand compliance
brandUtils.validateBrandColors();
brandUtils.validateNeutralScale();
brandUtils.validateTypeScale();
```

## Coverage Requirements

The test suite maintains high coverage standards:

- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

Coverage reports are generated in HTML format for detailed analysis.

## Test Data

### Mock Data Generators
```typescript
// Generate test data
const bytes = mockDataGenerators.generateMockImageBytes(1024);
const apiResponse = mockDataGenerators.generateMockApiResponse(['node1', 'node2']);
const document = mockDataGenerators.generateMockDocument(['Page 1', 'Page 2']);
```

### Brand Constants
Tests use the actual brand values:

- **Primary**: `#11D9E6`
- **Ink**: `#0D1214`
- **Surface**: `#082C32`
- **Neutral Scale**: 9-step progression
- **Type Scale**: H1 (40px) to Small (14px)

## Error Testing

The framework includes comprehensive error handling tests:

- Network timeouts and API failures
- Missing authentication credentials
- Invalid color formats
- Font loading failures
- File system errors
- Malformed API responses

## Performance Testing

Performance tests ensure the plugin operates efficiently:

- Component creation performance
- Large dataset handling
- Concurrent operation testing
- Memory usage validation
- Execution time benchmarks

## Accessibility Testing

Tests include accessibility validation:

- Color contrast ratio compliance (WCAG AA)
- Font size and line height ratios
- Semantic component naming
- Export format accessibility

## CI/CD Integration

The test suite is designed for continuous integration:

- Deterministic test execution
- No external dependencies
- Fast execution times
- Comprehensive error reporting
- Coverage threshold enforcement

## Development Workflow

1. **Write failing test** - Start with a test that describes the expected behavior
2. **Implement feature** - Write the minimum code to make the test pass
3. **Refactor** - Improve code while keeping tests green
4. **Run full suite** - Ensure no regressions
5. **Check coverage** - Maintain coverage standards

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="should create logo component"
```

### Coverage for Specific File
```bash
npm test -- --collectCoverageFrom="plugin/src/main.ts"
```

## Best Practices

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how
2. **Arrange-Act-Assert** - Clear test structure
3. **Descriptive Test Names** - Tests should read like specifications
4. **Mock External Dependencies** - Keep tests isolated and fast
5. **Test Edge Cases** - Include error conditions and boundary values
6. **Keep Tests Fast** - Unit tests should run in milliseconds
7. **Use Type Safety** - Leverage TypeScript in tests

## Troubleshooting

### Common Issues

#### Font Loading Errors
If tests fail due to font loading:
```typescript
// Mock font loading in test
jest.spyOn(mockFigma, 'loadFontAsync').mockResolvedValue(undefined);
```

#### API Rate Limiting
For export tests, ensure fetch is properly mocked:
```typescript
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ images: {} })
});
```

#### Type Errors
Ensure test TypeScript config extends main config:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  }
}
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add appropriate type annotations
3. Include both success and failure cases
4. Update this README if adding new test categories
5. Ensure tests pass in CI environment

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing](https://typescript-eslint.io/docs/linting/typed-linting/)
