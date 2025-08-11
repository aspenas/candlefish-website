# Week 1: Frontend Agent Brief
**Timeline**: August 12-16, 2025  
**Priority**: HIGH  
**Dependencies**: None (Can work in parallel)  

## Mission
Fix the website deployment issues on Netlify and establish the foundation for the UI component library and dashboard structure.

## Specific Tasks

### 1. Fix Netlify Deployment (Day 1)
**Objective**: Resolve monorepo build issues preventing website deployment

**Current Issues**:
- Build failing due to missing @candlefish-ai/ui-components package
- Monorepo structure not properly configured for Netlify
- Missing build dependencies

**Investigation Steps**:
```bash
# Check current structure
cd /Users/patricksmith/candlefish-ai
ls -la apps/website/
cat apps/website/package.json

# Check for ui-components package
ls -la packages/ui-components/

# Test local build
cd apps/website
npm install
npm run build
```

**Solution Approach**:

Option 1: Fix monorepo configuration
```json
// netlify.toml
[build]
  base = "apps/website"
  command = "npm run build"
  publish = "dist"
  
[build.environment]
  NPM_FLAGS = "--prefix=/opt/buildhome/repo"
```

Option 2: Create ui-components package
```bash
# Create the missing package
mkdir -p packages/ui-components
cd packages/ui-components
npm init -y

# Add to package.json
{
  "name": "@candlefish-ai/ui-components",
  "version": "1.0.0",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./styles": "./dist/styles.css"
  }
}
```

Option 3: Simplify imports temporarily
```typescript
// Replace in HomePage.tsx
// import { PublicLayout } from '@candlefish-ai/ui-components'
import PublicLayout from '../components/layouts/PublicLayout'
```

**Success Criteria**:
- Website builds successfully on Netlify
- Deployment completes without errors
- Site accessible at candlefish.ai
- All pages loading correctly

### 2. Component Library Structure (Day 2)
**Objective**: Create proper component library architecture

**Create Structure**:
```
packages/ui-components/
├── src/
│   ├── components/
│   │   ├── buttons/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── Button.test.tsx
│   │   ├── forms/
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── TextArea.tsx
│   │   ├── layouts/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── MobileLayout.tsx
│   │   └── navigation/
│   │       ├── NavBar.tsx
│   │       ├── SideBar.tsx
│   │       └── MobileMenu.tsx
│   ├── styles/
│   │   ├── theme.ts
│   │   ├── globals.css
│   │   └── variables.css
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Setup Build Process**:
```json
// package.json
{
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "test": "jest",
    "storybook": "storybook dev -p 6006"
  }
}
```

**Export Configuration**:
```typescript
// src/index.ts
export * from './components/buttons'
export * from './components/forms'
export * from './components/layouts'
export * from './components/navigation'
```

**Success Criteria**:
- Component library package created
- Build process working
- Components exportable
- Basic components implemented

### 3. Dashboard Layout Design (Day 3)
**Objective**: Create dashboard wireframes and layout components

**Dashboard Structure**:
```typescript
// DashboardLayout.tsx
interface DashboardLayoutProps {
  sidebar?: boolean
  header?: boolean
  children: React.ReactNode
}

const DashboardLayout = ({ sidebar = true, header = true, children }) => {
  return (
    <div className="dashboard-container">
      {header && <Header />}
      <div className="dashboard-content">
        {sidebar && <Sidebar />}
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Key Pages to Design**:
1. **Dashboard Home**
   - Metrics overview
   - Recent documents
   - Activity feed
   - Quick actions

2. **Document List**
   - Grid/List view toggle
   - Search and filters
   - Sort options
   - Bulk actions

3. **Document Editor**
   - Editor toolbar
   - Document canvas
   - Comments panel
   - Version history

4. **Settings**
   - User profile
   - Team management
   - Integrations
   - Billing

**Success Criteria**:
- Dashboard layout component created
- Navigation structure defined
- Responsive design implemented
- Accessibility standards met

### 4. Authentication UI (Day 4)
**Objective**: Create authentication flow UI components

**Components to Create**:
```typescript
// Login Form
const LoginForm = () => {
  return (
    <form className="auth-form">
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Button type="submit">Sign In</Button>
      <Link href="/forgot-password">Forgot Password?</Link>
    </form>
  )
}

// Register Form
const RegisterForm = () => {
  return (
    <form className="auth-form">
      <Input type="text" placeholder="Full Name" />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input type="password" placeholder="Confirm Password" />
      <Button type="submit">Create Account</Button>
    </form>
  )
}

// Auth Layout
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <Logo />
        {children}
      </div>
    </div>
  )
}
```

**Auth Flow Pages**:
- /login
- /register
- /forgot-password
- /reset-password
- /verify-email

**Success Criteria**:
- All auth UI components created
- Forms validation ready
- Responsive design complete
- Error states handled

### 5. Style System Setup (Day 5)
**Objective**: Establish design system and theming

**Design Tokens**:
```css
/* variables.css */
:root {
  /* Colors */
  --color-primary: #0066cc;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  
  /* Typography */
  --font-family: 'Inter', sans-serif;
  --font-size-base: 16px;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Borders */
  --border-radius: 4px;
  --border-width: 1px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

**Component Styling**:
```typescript
// Using CSS Modules
import styles from './Button.module.css'

// Or Styled Components
import styled from 'styled-components'

const StyledButton = styled.button`
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  background: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`
```

**Success Criteria**:
- Design system documented
- CSS variables defined
- Theme switching ready
- Consistent styling across components

## Validation Checklist

### Day 1 Completion
- [ ] Netlify build issue identified
- [ ] Solution implemented
- [ ] Website deploying successfully
- [ ] All pages accessible

### Day 2 Completion
- [ ] Component library structure created
- [ ] Build process configured
- [ ] Basic components implemented
- [ ] Package exportable

### Day 3 Completion
- [ ] Dashboard layout designed
- [ ] Navigation structure defined
- [ ] Key pages wireframed
- [ ] Responsive design implemented

### Day 4 Completion
- [ ] Auth components created
- [ ] Forms implemented
- [ ] Validation ready
- [ ] Error states handled

### Day 5 Completion
- [ ] Style system established
- [ ] Design tokens defined
- [ ] Theme switching implemented
- [ ] Documentation complete

## Common Issues & Solutions

### Netlify Build Failures
```bash
# Debug build locally
netlify build --debug

# Check build logs
netlify deploy --prod --debug

# Clear cache and retry
netlify build --clear-cache
```

### Component Import Issues
```javascript
// Check exports
console.log(require('@candlefish-ai/ui-components'))

// Verify build output
ls -la packages/ui-components/dist/
```

### Style Conflicts
```css
/* Use CSS Modules for isolation */
.button {
  composes: base from './base.module.css';
  /* component specific styles */
}
```

## Handoff Deliverables

### For Backend Agent
- API integration requirements
- Authentication flow specs
- Data fetching patterns needed

### For Real-time Agent
- WebSocket UI requirements
- Real-time update locations
- Presence indicator designs

### For Testing Agent
- Component test suites
- E2E test scenarios
- Accessibility audit results

## Resources

### Documentation
- [Netlify Monorepo Guide](https://docs.netlify.com/configure-builds/monorepos/)
- [React Component Patterns](https://reactpatterns.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Storybook](https://storybook.js.org/docs)

### Design Resources
- [Figma Component Library](https://www.figma.com/community)
- [Tailwind UI](https://tailwindui.com/)
- [Headless UI](https://headlessui.dev/)

## Success Metrics
- Website deployment fixed by Day 1
- Component library functional by Day 3
- Dashboard UI ready for integration by Day 5
- Zero accessibility violations
- 100% responsive design coverage

---

**Agent Handoff**: Complete all tasks and update `/deployment/handoffs/2025-08-16-frontend-handoff.md` with:
- Netlify deployment solution details
- Component library structure
- Dashboard design decisions
- Style system documentation
- Integration points identified
