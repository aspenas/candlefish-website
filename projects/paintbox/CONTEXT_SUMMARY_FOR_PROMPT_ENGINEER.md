# Context Summary: Paintbox UI Transformation

## Quick Brief for Prompt Engineer

This document provides a condensed context summary for creating the final transformation prompt. The full project will require ~70K tokens across 5 phases.

## Project Goal
Transform Paintbox application's UI to match Tyler-Setup's modern design system while preserving ALL business logic, Excel formulas, and integrations.

## Critical Constraints
1. **KEEP Zustand** - Do NOT migrate to Redux (Tyler uses Redux, but we keep Zustand)
2. **PRESERVE Excel Engine** - 14,000+ formulas must remain untouched
3. **MAINTAIN Integrations** - Salesforce, Company Cam, WebSocket must work
4. **OPTIMIZE for iPad** - Primary use case is field estimators on tablets
5. **FULL CUTOVER** - Not gradual, complete transformation

## Technical Stack Comparison

### Paintbox (Current)
```
Framework: Next.js 15.4.5 (App Router)
State: Zustand 5.0.7
Styling: Tailwind CSS v4 + Custom Paintbox theme
Calculations: 14,000+ Excel formulas
Integrations: Salesforce, Company Cam, WebSocket
```

### Tyler-Setup (Target Design)
```
Framework: Vite + React 18 (reference only)
State: Redux (we won't use, keeping Zustand)
Styling: CSS Variables + Tailwind v3
Theme: Full light/dark mode support
Utilities: cn() pattern for className merging
```

## What We're Taking from Tyler-Setup

### 1. CSS Variable System
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... comprehensive variable system */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

### 2. Utility Pattern
```typescript
// The cn() utility for className merging
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 3. Component Patterns
- Clean, modern component structure
- Consistent theming approach
- Professional light/dark mode

## Phase Breakdown (70K tokens total)

### Phase 1: Foundation (10K tokens)
- CSS variables, theme system, utilities
- Base component library
- Theme provider and hooks

### Phase 2: Components (20K tokens)
- Transform ALL UI components
- Maintain business logic
- Add dark mode support

### Phase 3: Excel Engine (15K tokens)
- Optimize performance
- Add missing functions
- Improve caching

### Phase 4: iPad Optimization (10K tokens)
- Touch gestures
- Responsive layouts
- Performance tuning

### Phase 5: Testing (10K tokens)
- Full regression testing
- Performance validation
- Documentation

### Reserve: 5K tokens

## Key Files Created

### Context Management
1. **CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md** - Complete project context (comprehensive)
2. **TRANSFORMATION_PROMPT_TEMPLATE.md** - Template for agent prompts
3. **PHASE_1_STATUS.md** - Ready to start Phase 1

## Prompt Engineering Recommendations

### For Each Phase Prompt

1. **Start with Context Load**
```
Read these files first:
- CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md
- PHASE_[X]_STATUS.md
```

2. **Emphasize Constraints**
```
CRITICAL: 
- Keep Zustand (no Redux)
- Preserve ALL Excel formulas
- Maintain service integrations
- Optimize for iPad
```

3. **Provide Clear Patterns**
```typescript
// Show Tyler-Setup patterns to follow
// Include specific examples
// Demonstrate the cn() utility usage
```

4. **Include Validation Steps**
```
After each change:
- Test business logic preserved
- Verify theme switching
- Check iPad responsiveness
```

5. **Define Success Metrics**
```
Phase complete when:
- All tasks done
- Tests >95% passing
- No business logic regression
- Performance targets met
```

## Recommended Prompt Structure

```markdown
# Paintbox UI Transformation - Phase [X]

## Context
[Load context files]

## Your Mission
[Specific phase objective]

## Constraints
[List critical preservations]

## Tasks
[Detailed task list]

## Patterns to Follow
[Code examples from Tyler-Setup]

## Validation
[Testing requirements]

## Deliverables
[Expected outputs]
```

## Risk Mitigation Notes

### High-Risk Areas
1. **Excel Engine** - Any modification could break 14,000+ formulas
2. **Zustand Stores** - Must remain compatible with existing logic
3. **API Integrations** - Breaking changes would affect production
4. **WebSocket** - Real-time updates critical for UX

### Safe Areas for Transformation
1. **Component Styling** - Full freedom to change
2. **CSS Architecture** - Can completely restructure
3. **Theme System** - New implementation welcome
4. **Touch Interactions** - Enhance freely
5. **Visual Effects** - Add animations/transitions

## Success Criteria Summary

### Must Have
- ✅ All Excel formulas working exactly as before
- ✅ Salesforce/Company Cam integrations intact
- ✅ Zustand state management preserved
- ✅ Full light/dark theme support
- ✅ iPad-optimized touch targets (44px minimum)

### Nice to Have
- ⚡ 20%+ performance improvement
- 📦 Smaller bundle size
- 🎨 Smooth animations
- 📱 PWA enhancements
- 🔄 Better offline support

## Quick Reference Paths

### Paintbox
```
Root: /Users/patricksmith/candlefish-ai/projects/paintbox
Components: ./components/
Excel Engine: ./lib/excel-engine/
Calculations: ./lib/calculations/
Services: ./lib/services/
```

### Tyler-Setup
```
Root: /Users/patricksmith/candlefish-ai/packages/tyler-setup
Frontend: ./frontend/src/
CSS Variables: ./frontend/src/index.css
Utils: ./frontend/src/lib/utils.ts
Components: ./frontend/src/components/
```

## Final Notes for Prompt Engineer

1. **Token Management**: Each phase has a budget. Encourage agents to summarize completed work to preserve context space.

2. **Incremental Validation**: Emphasize testing after EACH file change, not batch testing.

3. **Business Logic Protection**: Make it crystal clear that calculation logic is untouchable.

4. **iPad First**: Every UI decision should consider tablet use as primary.

5. **Documentation Trail**: Each phase must document changes for the next phase.

---

**Purpose**: This summary enables you to create focused, effective prompts for each transformation phase while maintaining project coherence across the 70K token scope.

**Key Documents**:
- Full Context: CONTEXT_MANAGEMENT_PAINTBOX_TRANSFORM.md
- Agent Template: TRANSFORMATION_PROMPT_TEMPLATE.md
- Phase 1 Ready: PHASE_1_STATUS.md

**Next Step**: Use this summary to craft the Phase 1 execution prompt for the first transformation agent.