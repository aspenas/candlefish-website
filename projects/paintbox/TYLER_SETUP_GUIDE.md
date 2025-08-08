# Tyler-Setup Design System Implementation Guide

## 🚀 Quick Start

Run the automated transformation workflow:

```bash
# Install GitHub CLI if needed
brew install gh

# Run the transformation workflow
gh workflow run tyler-setup-transform.yml \
  --field transform_scope=full \
  --field improvements=true

# Or run manually
npm run tyler:transform
```

## 📋 What Gets Transformed

### Phase 1: Foundation (Automated)

- ✅ CSS variable system with HSL colors
- ✅ Theme provider with light/dark modes
- ✅ Utility functions (cn, debounce, throttle)
- ✅ Touch optimization utilities

### Phase 2: Components (Automated)

- ✅ All UI components transformed to Tyler-Setup patterns
- ✅ 44px minimum touch targets for iPad
- ✅ Theme-aware styling with CSS variables
- ✅ Accessibility improvements (ARIA labels, focus states)

### Phase 3: Testing (Automated)

- ✅ Component unit tests with theme testing
- ✅ Integration tests for workflow components
- ✅ Accessibility tests (WCAG 2.1 Level AA)
- ✅ Touch optimization tests

### Phase 4: Type Safety (Automated)

- ✅ Removal of all `any` types
- ✅ Proper TypeScript interfaces
- ✅ Type declarations generated
- ✅ Strict mode compliance

### Phase 5: Documentation (Automated)

- ✅ Component documentation with examples
- ✅ API reference generation
- ✅ Storybook stories
- ✅ Design system guide

## 🛠️ Manual Implementation

If you prefer manual implementation or need to customize:

### 1. Install Dependencies

```bash
npm install clsx tailwind-merge lru-cache
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @types/node @types/react
```

### 2. Apply Foundation

```bash
# Copy CSS variables
cp .github/templates/globals.css app/globals.css

# Create theme provider
cp .github/templates/ThemeProvider.tsx lib/theme/

# Add utilities
cp .github/templates/cn.ts lib/utils/
```

### 3. Transform Components

```bash
# Run transformation script
node .github/scripts/apply-tyler-setup.js --phase components

# Or transform individually
npm run tyler:transform:button
npm run tyler:transform:card
npm run tyler:transform:input
```

### 4. Generate Tests

```bash
# Generate all tests
node .github/scripts/generate-tests.js --type all

# Or generate specific types
npm run tyler:tests:components
npm run tyler:tests:integration
npm run tyler:tests:a11y
```

### 5. Fix Type Issues

```bash
# Remove any types and add interfaces
node .github/scripts/fix-types.js

# Verify with TypeScript
npm run typecheck
```

### 6. Generate Documentation

```bash
# Generate all documentation
node .github/scripts/generate-component-docs.js

# Build Storybook
npm run storybook:build
```

## 🧪 Testing

### Run All Tests

```bash
npm run test:tyler
```

### Individual Test Suites

```bash
# Component tests
npm run test:components

# Integration tests
npm run test:integration

# Accessibility tests
npm run test:a11y

# Performance tests
npm run test:performance
```

### Coverage Report

```bash
npm run test:coverage
```

## 📱 iPad Optimization

### Touch Gestures

```tsx
import { useSwipe, usePinch, useLongPress } from '@/lib/hooks/useTouchGestures';

function MyComponent() {
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
  });

  return <div {...swipeHandlers}>Swipeable content</div>;
}
```

### Responsive Navigation

```tsx
import { IPadNavigation } from '@/components/ui/IPadNavigation';

function WorkflowPage() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <IPadNavigation
      steps={workflowSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    />
  );
}
```

## 🎨 Theming

### Using the Theme

```tsx
import { useTheme } from '@/lib/theme/ThemeProvider';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

### CSS Variables

```css
/* Use CSS variables in your styles */
.custom-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

/* Dark mode automatically applied */
.dark .custom-component {
  /* Variables update automatically */
}
```

## 🔧 Configuration

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "css.validate": false,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## 📊 Performance Monitoring

### Bundle Size

```bash
# Check bundle size
npm run analyze

# Set limits in package.json
"bundlesize": [
  {
    "path": ".next/static/chunks/*.js",
    "maxSize": "100 kB"
  }
]
```

### Performance Metrics

```tsx
import { OptimizedPaintingCalculator } from '@/lib/calculations/optimized-calculator';

const calculator = new OptimizedPaintingCalculator({
  onProgress: (percent, formula) => {
    console.log(`${percent}% - Processing: ${formula}`);
  }
});

// Get performance metrics
const metrics = calculator.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cacheStats);
console.log('Average calculation time:', metrics.metrics);
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Theme Not Applying

```tsx
// Ensure ThemeProvider wraps your app
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```

#### 2. Touch Targets Too Small

```css
/* Add to components */
.touchable {
  min-height: var(--touch-target);
  min-width: var(--touch-target);
}
```

#### 3. Type Errors

```bash
# Regenerate types
npm run tyler:types:generate

# Check for any types
npm run tyler:types:check
```

#### 4. Test Failures

```bash
# Update snapshots
npm run test -- -u

# Run specific test
npm run test -- Button.test.tsx
```

## 📚 Resources

- [Tyler-Setup Documentation](./docs/components.md)
- [API Reference](./docs/api-reference.json)
- [Migration Guide](./docs/migration.md)
- [Storybook](http://localhost:6006)

## 🤝 Contributing

1. Create a feature branch
2. Run the transformation workflow
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This implementation follows the Tyler-Setup design system patterns and is optimized for the Paintbox application requirements.
