# @candlefish-ai/ui-components

Unified UI components library for Candlefish AI projects, providing consistent design patterns, state management, and responsive components across all applications.

## Features

- 🎨 **Unified Design System** - Consistent branding and styling across all projects
- 🧩 **Reusable Components** - Modular, composable UI components
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🔄 **State Management** - Zustand for UI state, TanStack Query for server state
- 🎯 **Type Safe** - Full TypeScript support with proper type exports
- ♿ **Accessible** - WCAG compliant with proper ARIA attributes
- 🚀 **Performance Optimized** - Tree-shaking, lazy loading, memoization

## Installation

```bash
# In workspace projects
pnpm add @candlefish-ai/ui-components

# Install peer dependencies
pnpm add react react-dom tailwindcss
```

## Quick Start

### 1. Import Styles
```tsx
// In your app's main CSS file or component
import '@candlefish-ai/ui-components/styles'
```

### 2. Configure Tailwind
```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@candlefish-ai/ui-components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [
    require('@candlefish-ai/ui-components/tailwind.config.js')
  ],
  // Your custom config...
}
```

### 3. Setup Providers
```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationStack } from '@candlefish-ai/ui-components'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <NotificationStack position="top-right" />
    </QueryClientProvider>
  )
}
```

## Components

### Brand Components

#### Logo
Unified logo component supporting multiple variants and brands.

```tsx
import { CandlefishLogo, PaintboxLogo, Logo } from '@candlefish-ai/ui-components'

// Brand-specific logos
<CandlefishLogo size="md" showText />
<PaintboxLogo size="lg" href="/dashboard" />

// Generic logo with custom branding
<Logo 
  variant="horizontal"
  size="xl"
  imageSrc="/custom-logo.png"
  text="CUSTOM BRAND"
  animated
/>
```

**Props:**
- `variant`: 'horizontal' | 'stacked' | 'icon'
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `showText`: boolean
- `animated`: boolean (hover effects)
- `href`: string (makes logo clickable)

### Layout Components

#### Navigation
Responsive navigation with mobile support and user authentication states.

```tsx
import { Navigation } from '@candlefish-ai/ui-components'

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { 
    label: 'Projects', 
    href: '/projects',
    children: [
      { label: 'Active', href: '/projects/active' },
      { label: 'Archive', href: '/projects/archive' }
    ]
  }
]

<Navigation 
  items={navigationItems}
  showSearch
  showNotifications
  showProfile
/>
```

#### AppLayout
Composable layout system for consistent page structure.

```tsx
import { DashboardLayout, PublicLayout } from '@candlefish-ai/ui-components'

// For authenticated dashboard pages
<DashboardLayout
  sidebarItems={sidebarItems}
  navigationItems={navigationItems}
  sidebarHeader={<UserProfile />}
>
  {children}
</DashboardLayout>

// For public marketing pages
<PublicLayout 
  navigationItems={publicNavItems}
  showSearch={false}
>
  {children}
</PublicLayout>
```

### UI Components

#### Button
Versatile button component with multiple variants and loading states.

```tsx
import { Button } from '@candlefish-ai/ui-components'

<Button variant="primary" size="md" loading>
  Save Changes
</Button>

<Button variant="outline" leftIcon={<PlusIcon />}>
  Add Item
</Button>
```

#### Card
Flexible card container with variants for different contexts.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@candlefish-ai/ui-components'

<Card variant="glass" hover="glow">
  <CardHeader>
    <CardTitle>Project Stats</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
</Card>
```

#### Input
Form input with icon support and error states.

```tsx
import { Input } from '@candlefish-ai/ui-components'

<Input
  placeholder="Search..."
  leftIcon={<SearchIcon />}
  error={!!errors.search}
/>
```

## State Management

### Authentication Store

```tsx
import { useAuthStore } from '@candlefish-ai/ui-components'

function UserProfile() {
  const { user, isAuthenticated, logout } = useAuthStore()
  
  if (!isAuthenticated) return <LoginButton />
  
  return (
    <div>
      <p>Welcome, {user.name}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}
```

### Notifications Store

```tsx
import { useNotify, NotificationStack } from '@candlefish-ai/ui-components'

function MyComponent() {
  const notify = useNotify()
  
  const handleSave = async () => {
    try {
      await saveData()
      notify.success('Data saved successfully!')
    } catch (error) {
      notify.error('Save failed', error.message)
    }
  }
  
  return (
    <>
      <Button onClick={handleSave}>Save</Button>
      <NotificationStack />
    </>
  )
}
```

### API Hooks

```tsx
import { useProjects, useCreateProject } from '@candlefish-ai/ui-components'

function ProjectsList() {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  
  const handleCreate = () => {
    createProject.mutate({
      name: 'New Project',
      organizationId: 'org-123'
    })
  }
  
  if (isLoading) return <LoadingSpinner />
  
  return (
    <div>
      <Button onClick={handleCreate}>Create Project</Button>
      {projects?.data.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

## Styling and Theming

The library uses a unified design system with CSS custom properties for easy theming:

```css
:root {
  /* Brand colors */
  --color-candlefish-400: #00CED1;
  --color-candlefish-300: #5ce5ff;
  
  /* Semantic colors */
  --bg-primary: #000000;
  --text-primary: #FFFFFF;
  --accent: var(--color-candlefish-400);
  
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Berkeley Mono', 'Courier New', monospace;
}
```

### Utility Classes

```tsx
// Spine layout system
<section className="spine-section">
  <div className="spine-container">
    <h2 className="spine-label">Section Title</h2>
    <p className="text-gradient">Gradient text</p>
  </div>
</section>

// Animation utilities
<div className="animate-fade-in-up">
  <div className="candlefish-glow">Glowing element</div>
</div>
```

## Migration Guide

### From Individual Projects

#### 1. Update Package Dependencies
```bash
pnpm add @candlefish-ai/ui-components
```

#### 2. Replace Logo Components
```tsx
// Before
import PaintboxLogo from './components/ui/PaintboxLogo'

// After  
import { PaintboxLogo } from '@candlefish-ai/ui-components'
```

#### 3. Update Layout Structure
```tsx
// Before
<div className="app">
  <Navigation />
  <main>{children}</main>
</div>

// After
<PublicLayout navigationItems={navItems}>
  {children}
</PublicLayout>
```

#### 4. Migrate State Management
```tsx
// Before - custom auth state
const [user, setUser] = useState(null)

// After - unified auth store
import { useAuthStore } from '@candlefish-ai/ui-components'
const { user, setUser } = useAuthStore()
```

### Paintbox Specific Migration

The Paintbox project has been updated to use the unified components:

```tsx
// PaintboxLogo.tsx - now wraps the unified Logo
import { PaintboxLogo as BasePaintboxLogo } from '@candlefish-ai/ui-components'

export default function PaintboxLogo({ size, priority, ...props }) {
  const unifiedSize = sizeMapping[size]
  return (
    <BasePaintboxLogo 
      size={unifiedSize}
      loading={priority ? 'eager' : 'lazy'}
      {...props} 
    />
  )
}
```

## Performance Considerations

### Component Optimization
- Components use `React.forwardRef` for proper ref forwarding
- `React.memo` for expensive components
- Lazy loading for heavy components

### Bundle Optimization
- Tree-shaking enabled with proper `sideEffects: false`
- CSS is extracted and can be loaded separately
- TypeScript types are properly exported

### Loading Strategies
```tsx
// Eager loading for above-the-fold content
<Logo loading="eager" priority />

// Lazy loading for below-the-fold
<Image loading="lazy" />

// Code splitting for heavy components
const Dashboard = lazy(() => import('./Dashboard'))
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- High contrast mode support
- Reduced motion support

```tsx
// Automatic accessibility features
<Button aria-label="Save document">
  <SaveIcon />
</Button>

<Navigation aria-label="Main navigation" />

<Card role="region" aria-labelledby="card-title">
  <CardTitle id="card-title">Stats</CardTitle>
</Card>
```

## Development

### Local Development
```bash
pnpm dev        # Start development server
pnpm build      # Build package
pnpm typecheck  # Type checking
pnpm lint       # Lint code
```

### Adding New Components
1. Create component in `src/components/`
2. Export from appropriate index file
3. Add to main `src/index.ts`
4. Update documentation

## Contributing

1. Follow the existing code patterns and naming conventions
2. Include proper TypeScript types
3. Add accessibility attributes
4. Test on multiple screen sizes
5. Update documentation for new features

## License

MIT - Candlefish AI LLC
