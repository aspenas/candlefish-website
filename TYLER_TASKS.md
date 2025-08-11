# Tyler's Task Assignment Board

## Mission Critical: Paintbox Production (48 Hour Sprint)

### Your Role
Full-time engineering lead for frontend excellence and testing. You have full autonomy within your domain. Report progress every 4 hours.

---

## IMMEDIATE TASKS (Next 24 Hours)

### 1. ⚡ Production Environment Setup
**Priority**: CRITICAL
**Deadline**: Hour 4
**Location**: `/projects/paintbox`

```bash
# Your setup commands
cd /Users/patricksmith/candlefish-ai/projects/paintbox
npm install
npm run build
npm run test
```

**Deliverables**:
- [ ] Verify all dependencies installed
- [ ] Build succeeds without warnings
- [ ] All existing tests pass
- [ ] Document any issues in Slack

---

### 2. 📱 Tablet Responsiveness Fix
**Priority**: CRITICAL  
**Deadline**: Hour 8
**Files**: 
- `/projects/paintbox/components/workflow/`
- `/projects/paintbox/app/globals.css`

**Requirements**:
- [ ] Test on iPad (landscape and portrait)
- [ ] Fix calculation panel overflow on mobile
- [ ] Ensure touch targets are 44x44px minimum
- [ ] Add loading states for slow connections
- [ ] Test offline mode functionality

**Specific Fixes Needed**:
```typescript
// Add to all workflow components
const isTouchDevice = 'ontouchstart' in window;
const inputSize = isTouchDevice ? 'large' : 'medium';
```

---

### 3. 🧪 Critical Test Coverage
**Priority**: HIGH
**Deadline**: Hour 12
**Target**: 80% coverage on critical paths

**Test Files to Create**:
```
/projects/paintbox/lib/calculations/__tests__/
├── pricing-engine.test.ts       // Test all pricing calculations
├── excel-formulas.test.ts       // Verify Excel parity
├── real-time-calc.test.ts      // Test WebSocket updates
└── edge-cases.test.ts          // Boundary conditions

/projects/paintbox/app/api/__tests__/
├── salesforce.test.ts           // API integration tests
├── companycam.test.ts           // Photo upload tests
└── pdf-generation.test.ts      // PDF output tests
```

**Must Test**:
- Good/Better/Best pricing accuracy
- Formula calculation order
- Offline data persistence
- API error handling
- PDF generation consistency

---

### 4. 🎨 UI Polish for Demo
**Priority**: HIGH
**Deadline**: Hour 16
**Focus**: First impressions matter at AI4 conference

**Polish Tasks**:
- [ ] Add smooth transitions (200ms ease-in-out)
- [ ] Implement skeleton loaders
- [ ] Add success animations (check marks, etc.)
- [ ] Fix any layout shifts during loading
- [ ] Ensure consistent spacing (8px grid)
- [ ] Add proper error boundaries with fallbacks

**Key Components**:
```typescript
// Add to /components/ui/LoadingState.tsx
export const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);
```

---

## SECONDARY TASKS (Hours 24-48)

### 5. 📖 User Documentation
**Priority**: MEDIUM
**Deadline**: Hour 36
**Output**: `/docs/user-guide.md`

**Sections to Write**:
1. Getting Started (5 min read)
2. Creating Your First Estimate
3. Understanding Calculations
4. Salesforce Integration
5. Troubleshooting Guide

---

### 6. 🔧 Performance Optimization
**Priority**: MEDIUM
**Deadline**: Hour 40

**Optimizations**:
- [ ] Implement React.memo on expensive components
- [ ] Add debouncing to calculation inputs (300ms)
- [ ] Lazy load non-critical components
- [ ] Optimize images with next/image
- [ ] Enable gzip compression

---

### 7. 🚨 Error Handling Enhancement
**Priority**: MEDIUM
**Deadline**: Hour 44

**Implement**:
```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error);
    // Send to Sentry
    Sentry.captureException(error);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## CONTINUOUS TASKS

### Code Quality Standards
**Every Commit Must**:
- Pass ESLint without warnings
- Include appropriate TypeScript types
- Have corresponding tests
- Update documentation if needed

### Communication Protocol
- **Slack Updates**: Every 4 hours
- **Blockers**: Immediately escalate to Patrick or Claude
- **PRs**: Create for review (auto-merge enabled)
- **Questions**: Use #engineering channel

---

## SUCCESS METRICS

Your work is successful when:
1. ✅ Paintbox loads in < 2 seconds
2. ✅ All calculations match Excel exactly
3. ✅ Works perfectly on iPad Pro
4. ✅ Zero console errors in production
5. ✅ 80% test coverage achieved
6. ✅ Customer can complete estimate in 5 minutes

---

## TOOLS & RESOURCES

### Quick Commands
```bash
# Run development server
npm run dev

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Check TypeScript
npm run type-check

# Fix linting
npm run lint:fix
```

### Key Files
- Excel formulas: `/lib/excel-engine/formula-engine.ts`
- Calculations: `/lib/calculations/calculation-engine.ts`
- API routes: `/app/api/v1/`
- Components: `/components/workflow/`

### Testing Data
- Test Excel: `/test-data/bart3.20.xlsx`
- Test credentials: AWS Secrets Manager
- Sandbox URLs: Check `.env.local`

---

## YOUR AUTHORITY

You have full autonomy to:
- ✅ Refactor any code for better performance
- ✅ Add any npm packages needed
- ✅ Change UI/UX for better usability
- ✅ Create new components as needed
- ✅ Modify build configuration
- ✅ Update documentation

You must check with Patrick/Claude before:
- ❌ Changing calculation logic
- ❌ Modifying database schema
- ❌ Altering API contracts
- ❌ Removing features

---

## QUESTIONS?

If stuck or need clarification:
1. Check existing code for patterns
2. Search documentation
3. Ask in Slack with @claude or @patrick
4. Call Patrick if critical blocker

**Remember**: We're launching at AI4 conference. Every detail matters. You're building the future of SMB automation.

**LET'S SHIP IT! 🚀**

---

*Last Updated: August 10, 2025, Hour 0*
*Next Review: Hour 12*
