# Frontend Migration Guide - Candlefish AI Component Consolidation

This guide outlines the migration path for consolidating frontend components across the Candlefish AI ecosystem using the new unified `@candlefish-ai/ui-components` library.

## Overview

The frontend consolidation provides:
- **Unified Component Library**: Consistent UI components across all projects
- **State Management**: Zustand + TanStack Query for optimal performance
- **Design System**: Consolidated Tailwind configuration with brand tokens
- **Type Safety**: Full TypeScript support with proper exports
- **Performance**: Tree-shaking, lazy loading, and optimized bundles

## Migration Steps

### 1. Setup and Installation

Run the setup script to install the unified component library:

```bash
./scripts/setup-ui-components.sh
```

Or manually:

```bash
# Install in workspace projects
cd apps/website && pnpm add @candlefish-ai/ui-components@workspace:*
cd projects/paintbox && pnpm add @candlefish-ai/ui-components@workspace:*
```

### 2. Update Tailwind Configuration

Create or update `tailwind.config.js` in each project:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './node_modules/@candlefish-ai/ui-components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [
    require('@candlefish-ai/ui-components/tailwind.config.js')
  ],
  // Project-specific overrides
  theme: {
    extend: {
      // Custom extensions
    }
  }
}
```

### 3. Import Global Styles

Add to your main CSS file or root component:

```tsx
// In your main CSS file
@import '@candlefish-ai/ui-components/styles';

// Or in your root component
import '@candlefish-ai/ui-components/styles'
```

### 4. Component Migration

#### Logo Components

**Before:**
```tsx
// Multiple logo implementations
import CandlefishLogo from './components/Logo'
import PaintboxLogo from './components/ui/PaintboxLogo'
```

**After:**
```tsx
import { CandlefishLogo, PaintboxLogo } from '@candlefish-ai/ui-components'

// Unified API
<CandlefishLogo size="md" showText animated />
<PaintboxLogo size="lg" href="/dashboard" />
```

#### Navigation Components

**Before:**
```tsx
import Navigation from './components/Navigation'

<Navigation />
<main>{children}</main>
```

**After:**
```tsx
import { PublicLayout, DashboardLayout } from '@candlefish-ai/ui-components'

// For public pages
<PublicLayout navigationItems={navItems}>
  {children}
</PublicLayout>

// For authenticated dashboards
<DashboardLayout 
  sidebarItems={sidebarItems}
  navigationItems={navItems}
>
  {children}
</DashboardLayout>
```

#### State Management Migration

**Before:**
```tsx
// Custom state management
const [user, setUser] = useState(null)
const [notifications, setNotifications] = useState([])
```

**After:**
```tsx
import { useAuthStore, useNotify } from '@candlefish-ai/ui-components'

// Unified state management
const { user, isAuthenticated, login } = useAuthStore()
const notify = useNotify()

// Usage
notify.success('Operation completed!')
```

### 5. API Integration

Replace custom API calls with unified hooks:

**Before:**
```tsx
const [projects, setProjects] = useState([])
const [loading, setLoading] = useState(false)

useEffect(() => {
  setLoading(true)
  fetchProjects().then(setProjects).finally(() => setLoading(false))
}, [])
```

**After:**
```tsx
import { useProjects } from '@candlefish-ai/ui-components'

const { data: projects, isLoading } = useProjects()
```

## Project-Specific Migrations

### Website (`apps/website`)

**Status**: ✅ Updated to use PublicLayout

**Changes Made:**
- Updated `HomePage.tsx` to use `PublicLayout`
- Added navigation items with anchor links
- Integrated unified component system

**Remaining Tasks:**
- [ ] Update individual section components to use unified UI components
- [ ] Replace custom buttons with `Button` component
- [ ] Update form inputs to use `Input` component

### Paintbox (`projects/paintbox`)

**Status**: ✅ Logo component updated

**Changes Made:**
- Updated `PaintboxLogo.tsx` to wrap unified component
- Maintained backward compatibility with existing size props

**Remaining Tasks:**
- [ ] Update dashboard components to use `DashboardLayout`
- [ ] Replace custom cards with `Card` component
- [ ] Integrate notification system for user feedback
- [ ] Update form components to use unified inputs

### Brand Portal (`apps/brand-portal`)

**Status**: 🔄 Pending migration

**Tasks:**
- [ ] Add UI components dependency
- [ ] Update HTML templates to use React components
- [ ] Integrate with unified asset management
- [ ] Update branding to use consolidated logo system

## Component Mapping

| Old Component | New Component | Migration Notes |
|---------------|---------------|-----------------|
| `components/Logo.tsx` | `CandlefishLogo` | Direct replacement |
| `PaintboxLogo` | `PaintboxLogo` | Wrapper maintains compatibility |
| `Navigation` | `Navigation` or `PublicLayout` | Layout-specific choice |
| Custom buttons | `Button` | Props may need adjustment |
| Custom cards | `Card` family | More structured API |
| Custom inputs | `Input` | Enhanced with icons and states |

## Design System Updates

### Color Tokens

The unified design system provides consistent color tokens:

```css
/* Brand colors */
--color-candlefish-400: #00CED1;  /* Primary teal */
--color-candlefish-300: #5ce5ff;  /* Light teal */

/* Semantic colors */
--bg-primary: #000000;     /* Black background */
--text-primary: #FFFFFF;   /* White text */
--accent: var(--color-candlefish-400);
```

### Typography Scale

Responsive typography using clamp() for fluid scaling:

```css
--text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-lg: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
--text-6xl: clamp(3.5rem, 2.8rem + 3vw, 4rem);
```

### Layout System

Spine-based layout system for consistent spacing:

```tsx
<section className="spine-section">
  <div className="spine-container">
    <h2 className="spine-label">Section Title</h2>
    {/* Content */}
  </div>
</section>
```

## State Management Architecture

### Stores

1. **Auth Store** (`useAuthStore`): User authentication and session
2. **UI Store** (`useUIStore`): UI state (sidebar, theme, modals)
3. **Notifications Store** (`useNotificationStore`): Toast notifications

### API Layer

Unified API hooks with TanStack Query:

```tsx
// Queries
useCurrentUser()
useProjects(organizationId)
useOrganization(id)

// Mutations
useLogin()
useCreateProject()
useUpdateUser()
```

## Performance Optimizations

### Bundle Optimization

- Tree-shaking enabled with `sideEffects: false`
- Component lazy loading for large components
- CSS extraction and optimization
- TypeScript declaration maps for better debugging

### Loading Strategies

```tsx
// Above-the-fold components
<CandlefishLogo loading="eager" />

// Below-the-fold components  
<ProjectCard loading="lazy" />

// Heavy components
const Dashboard = lazy(() => import('./Dashboard'))
```

### Responsive Design

Mobile-first approach with container queries:

```css
@container logo-mark (min-width: 80px) {
  .candlefish-logo__text {
    font-size: 1.5rem;
  }
}
```

## Testing Strategy

### Component Testing

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@candlefish-ai/ui-components'

test('renders button with loading state', () => {
  render(<Button loading>Save</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

### Integration Testing

```tsx
import { useAuthStore } from '@candlefish-ai/ui-components'
import { renderHook } from '@testing-library/react'

test('auth store manages login state', () => {
  const { result } = renderHook(() => useAuthStore())
  // Test login flow
})
```

## Accessibility Compliance

All components include:

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- High contrast mode support
- Reduced motion preferences

```tsx
// Automatic accessibility features
<Button aria-label="Save document">
  <SaveIcon />
</Button>

<Navigation aria-label="Main navigation" />
```

## Deployment Considerations

### Build Process

Each project maintains its own build process but shares components:

```json
{
  "scripts": {
    "build": "next build",
    "build:components": "pnpm --filter @candlefish-ai/ui-components build"
  }
}
```

### Environment Configuration

```bash
# Shared environment variables
NEXT_PUBLIC_API_URL=https://api.candlefish.ai/v1
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Project-specific variables
PAINTBOX_COMPANYCAM_API_KEY=your-api-key
```

## Migration Checklist

### Phase 1: Foundation ✅
- [x] Create unified component library package
- [x] Set up build system and TypeScript configuration
- [x] Create consolidated Logo component
- [x] Set up state management with Zustand + TanStack Query
- [x] Create shared layout components
- [x] Update design system with Tailwind configuration

### Phase 2: Core Components ✅
- [x] Implement Button, Card, Input components
- [x] Create notification system
- [x] Set up API client hooks
- [x] Update HomePage to use PublicLayout
- [x] Update PaintboxLogo to use unified component

### Phase 3: Project Integration 🔄
- [ ] Complete Paintbox dashboard migration
- [ ] Update brand portal templates
- [ ] Migrate remaining website components
- [ ] Add comprehensive test coverage
- [ ] Performance optimization and monitoring

### Phase 4: Advanced Features 📋
- [ ] Command palette component
- [ ] Advanced form components
- [ ] Data visualization components
- [ ] PWA integration improvements
- [ ] Advanced animation system

## Troubleshooting

### Common Issues

**TypeScript Errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**CSS Not Loading:**
```tsx
// Ensure styles are imported
import '@candlefish-ai/ui-components/styles'
```

**Component Not Found:**
```bash
# Verify package is built
cd packages/ui-components && pnpm build
```

### Development Tips

1. Use the setup script for initial configuration
2. Keep component APIs consistent with existing patterns
3. Test on multiple screen sizes and devices
4. Follow accessibility guidelines
5. Use TypeScript strictly for better DX

## Resources

- [Component Documentation](packages/ui-components/README.md)
- [Design System Tokens](packages/ui-components/src/styles/globals.css)
- [Migration Examples](packages/ui-components/src/components/)
- [API Reference](packages/ui-components/src/hooks/api.ts)

## Support

For migration questions or issues:
1. Check the component documentation
2. Review existing implementations
3. Test changes in development environment
4. Use TypeScript for better error detection
