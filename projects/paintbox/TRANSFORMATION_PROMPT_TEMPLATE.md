# Paintbox UI Transformation - Agent Prompt Template

## Agent Instructions

You are tasked with transforming the Paintbox application's UI to adopt the Tyler-Setup design system. This is Phase [X] of a 5-phase transformation.

### Context Loading

Before starting, read these files in order:

1. `/Users/patricksmith/candlefish-ai/projects/paintbox/CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md`
2. `/Users/patricksmith/candlefish-ai/projects/paintbox/PHASE_[X]_STATUS.md` (if exists)

### Your Current Phase: [PHASE_NAME]

## Phase-Specific Instructions

### Phase 1: Foundation Setup

```
OBJECTIVE: Establish Tyler-Setup design foundation in Paintbox

TASKS:
1. Port CSS Variable System
   - Read: /packages/tyler-setup/frontend/src/index.css
   - Update: /projects/paintbox/app/globals.css
   - Preserve existing Paintbox functionality
   - Add theme toggle support

2. Create Utility Functions
   - Port cn() utility from Tyler-Setup
   - Create: /projects/paintbox/lib/utils/cn.ts
   - Add iPad-specific touch utilities
   - Include debounce/throttle for performance

3. Theme Provider Setup
   - Create: /projects/paintbox/lib/theme/ThemeProvider.tsx
   - Implement useTheme hook
   - Add localStorage persistence
   - Support system preference detection

4. Base Component Library
   - Transform core UI components
   - Files to update:
     * /components/ui/Button.tsx
     * /components/ui/card.tsx
     * /components/ui/FloatingInput.tsx
   - Apply Tyler-Setup patterns
   - Ensure 44px touch targets

VALIDATION:
- [ ] Theme toggle works globally
- [ ] CSS variables apply correctly
- [ ] Components support dark mode
- [ ] Touch targets are iPad-friendly

OUTPUT:
Create PHASE_1_COMPLETE.md with:
- List of modified files
- Test results
- Performance metrics
- Known issues
```

### Phase 2: Component Transformation

```
OBJECTIVE: Transform all UI components to Tyler-Setup patterns

PREREQUISITES:
- Phase 1 must be complete
- Theme system operational

TASKS:
1. Workflow Components
   Files:
   - /components/workflow/ClientInfoFormEnhanced.tsx
   - /components/workflow/ReviewCalculations.tsx

   Requirements:
   - Apply Tyler-Setup styling patterns
   - Preserve ALL business logic
   - Add touch gesture support
   - Maintain form validation

2. UI Component Library
   Files:
   - /components/ui/*.tsx (all files)

   Pattern to follow:
   ```typescript
   import { cn } from '@/lib/utils/cn'

   interface ComponentProps {
     className?: string
     // ... other props
   }

   export function Component({ className, ...props }: ComponentProps) {
     return (
       <div className={cn(
         "base-styles from Tyler-Setup",
         "responsive iPad optimizations",
         className
       )} {...props} />
     )
   }
   ```

3. Specialized Components
   - /components/secrets/*.tsx
   - /components/ui/CompanyCamGallery.tsx
   - Maintain all integrations
   - Apply consistent theming

VALIDATION:

- [ ] All components render correctly
- [ ] Dark mode works on all components
- [ ] Touch interactions are smooth
- [ ] No business logic regression

OUTPUT:
Create PHASE_2_COMPLETE.md

```

### Phase 3: Excel Engine Enhancement
```

OBJECTIVE: Optimize Excel engine without breaking changes

PREREQUISITES:

- Do NOT modify formula logic
- Preserve all calculations
- Test against original Excel file

TASKS:

1. Performance Analysis
   - Profile /lib/excel-engine/
   - Identify slow formulas
   - Document missing Excel functions

2. Optimization
   - Add memoization layer
   - Implement result caching
   - Optimize decimal.js usage

3. New Capabilities
   - Add missing Excel functions
   - Improve error handling
   - Add calculation progress indicators

VALIDATION:

- [ ] All 14,000+ formulas still work
- [ ] Calculations match Excel exactly
- [ ] Performance improved by >20%
- [ ] No memory leaks

OUTPUT:
Create PHASE_3_COMPLETE.md

```

### Phase 4: iPad Optimization
```

OBJECTIVE: Perfect the tablet experience

TASKS:

1. Touch Gestures
   - Implement swipe navigation
   - Add pinch-to-zoom
   - Long-press context menus

2. Responsive Layouts
   - Optimize for landscape/portrait
   - Collapsible navigation
   - Floating action buttons

3. Performance
   - Reduce bundle size
   - Optimize images
   - Enhance service worker

VALIDATION:

- [ ] Smooth on iPad Pro/Air
- [ ] All gestures work
- [ ] <2s page load time
- [ ] Offline mode functional

OUTPUT:
Create PHASE_4_COMPLETE.md

```

### Phase 5: Testing & Validation
```

OBJECTIVE: Ensure zero regression

TASKS:

1. Test Suite
   - Component tests
   - Integration tests
   - E2E scenarios

2. Regression Testing
   - Excel formula validation
   - API integration checks
   - Performance benchmarks

3. Documentation
   - Update README
   - Create migration guide
   - Document new patterns

VALIDATION:

- [ ] 100% test pass rate
- [ ] No calculation errors
- [ ] Performance targets met
- [ ] Ready for production

OUTPUT:
Create PHASE_5_COMPLETE.md

```

## Critical Rules

### MUST PRESERVE
1. **Zustand State Management** - Do NOT migrate to Redux
2. **Excel Formula Logic** - Every calculation must remain exact
3. **Service Integrations** - Salesforce, Company Cam, WebSocket
4. **Business Logic** - All workflows and validations
5. **API Endpoints** - No breaking changes

### CAN MODIFY
1. **Component Styling** - Full transformation allowed
2. **CSS Architecture** - Implement Tyler-Setup patterns
3. **Theme System** - Add comprehensive theming
4. **Touch Interactions** - Enhance for iPad
5. **Performance** - Optimize bundle and runtime

## File Modification Pattern

When updating files, follow this pattern:

```typescript
// 1. Read existing file first
const existing = await read('path/to/file.tsx')

// 2. Preserve business logic
// Keep all: calculations, API calls, state updates, validations

// 3. Transform UI layer only
// Update: className props, styling, theme variables

// 4. Add Tyler-Setup patterns
import { cn } from '@/lib/utils/cn'

// 5. Test immediately
// Run component tests after each change
```

## Testing Protocol

After EACH file modification:

1. Run component tests: `npm run test:components`
2. Check theme switching works
3. Test on iPad simulator/device
4. Verify business logic unchanged

## Progress Tracking

Update these files as you work:

- `PHASE_[X]_STATUS.md` - Current progress
- `PHASE_[X]_CHANGES.md` - Detailed change log
- `PHASE_[X]_ISSUES.md` - Problems encountered

## Handoff Protocol

When completing your phase:

1. **Create Completion Report**

   ```markdown
   # Phase [X] Completion Report

   ## Summary
   - Started: [timestamp]
   - Completed: [timestamp]
   - Files modified: [count]

   ## Changes Made
   [Detailed list]

   ## Test Results
   [Coverage and pass rates]

   ## Performance Metrics
   [Before/after comparison]

   ## Known Issues
   [Any pending problems]

   ## Next Phase Requirements
   [What the next agent needs to know]
   ```

2. **Update Context Management**
   - Edit CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md
   - Mark phase as complete
   - Add lessons learned

3. **Prepare Next Phase**
   - Create PHASE_[X+1]_STATUS.md
   - Include specific instructions
   - List priority items

## Emergency Procedures

If you encounter:

### Business Logic Break

1. STOP immediately
2. Revert changes
3. Document in PHASE_[X]_ISSUES.md
4. Flag for review

### Performance Degradation

1. Profile the issue
2. Document metrics
3. Attempt optimization
4. If >10% degradation, revert

### Test Failures

1. Identify affected tests
2. Determine if UI or logic issue
3. Fix UI issues only
4. Document logic issues for review

## Success Criteria

Your phase is complete when:

- [ ] All assigned tasks completed
- [ ] Tests passing at >95%
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] Handoff report created

## Quick Reference

### Key Paths

- Paintbox: `/Users/patricksmith/candlefish-ai/projects/paintbox`
- Tyler-Setup: `/Users/patricksmith/candlefish-ai/packages/tyler-setup`

### Key Commands

```bash
# Development
npm run dev

# Testing
npm run test
npm run test:components
npm run test:calculations

# Build
npm run build
```

### Key Files

- Context: `CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md`
- Current Phase: `PHASE_[X]_STATUS.md`
- Tyler CSS: `/packages/tyler-setup/frontend/src/index.css`
- Tyler Utils: `/packages/tyler-setup/frontend/src/lib/utils.ts`
- Paintbox Globals: `/projects/paintbox/app/globals.css`

---

**REMEMBER**: You are transforming the UI layer ONLY. Preserve ALL business logic, calculations, and integrations exactly as they are.
