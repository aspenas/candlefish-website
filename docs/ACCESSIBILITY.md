# Accessibility Guidelines

## Core Commitment

Candlefish.ai is committed to WCAG 2.1 AA compliance with AAA aspirations. Our "calm technology" philosophy naturally aligns with accessibility: reduced cognitive load, minimal interruptions, and clear information architecture benefit everyone.

## Design Principles

### 1. Perceivable
- **Text Alternatives**: All non-text content has text equivalents
- **Adaptable**: Content presents in different ways without losing meaning
- **Distinguishable**: Users can easily see and hear content

### 2. Operable
- **Keyboard Accessible**: All functionality available via keyboard
- **Enough Time**: Users have sufficient time to read and use content
- **Seizures**: No content causes seizures
- **Navigable**: Clear navigation and page structure

### 3. Understandable
- **Readable**: Text content is readable and understandable
- **Predictable**: Web pages appear and operate predictably
- **Input Assistance**: Help users avoid and correct mistakes

### 4. Robust
- **Compatible**: Content works with current and future assistive technologies

## Implementation Standards

### Color & Contrast
```css
/* Minimum contrast ratios */
--contrast-normal-text: 4.5:1;  /* WCAG AA */
--contrast-large-text: 3:1;     /* WCAG AA for 18pt+ */
--contrast-enhanced: 7:1;       /* WCAG AAA */

/* Never rely on color alone */
.error {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
  background: #ffebee;
}
.error::before {
  content: "Error: "; /* Text indicator */
}
```

### Focus Indicators
```css
/* Visible focus for all interactive elements */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

### Motion & Animation
```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Provide pause controls for auto-playing content */
.carousel[data-autoplay="true"] {
  --autoplay-duration: 5s;
}
.carousel[data-paused="true"] {
  animation-play-state: paused;
}
```

### Keyboard Navigation
```typescript
// Skip links
<a href="#main" className="skip-link">
  Skip to main content
</a>

// Keyboard trap prevention
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeModal()
  }
  // Tab cycling within modal
  if (e.key === 'Tab') {
    const focusables = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    // Handle tab cycling logic
  }
}

// Focus management
const openModal = () => {
  previousFocus = document.activeElement
  modal.querySelector('button')?.focus()
}
const closeModal = () => {
  previousFocus?.focus()
}
```

### Screen Reader Support
```tsx
// Semantic HTML
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/">Home</a></li>
    <li><a href="/about" aria-current="page">About</a></li>
  </ul>
</nav>

// Live regions for dynamic content
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
>
  {statusMessage}
</div>

// Form labels and descriptions
<label htmlFor="email">
  Email Address
  <span aria-label="required">*</span>
</label>
<input 
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={hasError}
  required
/>
<span id="email-error" role="alert">
  {errorMessage}
</span>
```

### Component Patterns

#### Pause & Seal Component
```tsx
// Accessible meditation timer
<div role="application" aria-label="Meditation timer">
  <h2 id="timer-heading">Pause & Seal</h2>
  <div 
    role="timer"
    aria-labelledby="timer-heading"
    aria-live="polite"
    aria-atomic="true"
  >
    <span className="sr-only">
      {minutes} minutes {seconds} seconds remaining
    </span>
    <span aria-hidden="true">{formatTime(timeRemaining)}</span>
  </div>
  <button 
    aria-label={isPlaying ? "Pause timer" : "Start timer"}
    aria-pressed={isPlaying}
  >
    {isPlaying ? "Pause" : "Start"}
  </button>
</div>
```

#### Focus Room Component
```tsx
// Accessible presence indicators
<div role="group" aria-label="Participants">
  <h3 className="sr-only">Active Participants</h3>
  <ul role="list" aria-live="polite">
    {participants.map(p => (
      <li key={p.id}>
        <span className="sr-only">{p.name} is present</span>
        <div 
          aria-hidden="true" 
          style={{ background: p.color }}
        >
          {p.initials}
        </div>
      </li>
    ))}
  </ul>
</div>
```

#### Right-Sized Metrics
```tsx
// Accessible data visualization
<figure role="img" aria-labelledby="chart-title" aria-describedby="chart-desc">
  <figcaption id="chart-title">Performance Metrics</figcaption>
  <div className="chart-container">
    {/* Visual chart */}
  </div>
  <p id="chart-desc" className="sr-only">
    Your performance is at the 72nd percentile, 
    above the median of 50%. Week over week change: -5%.
  </p>
  {/* Data table alternative */}
  <details>
    <summary>View as table</summary>
    <table>
      <caption>Performance Metrics Data</caption>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Percentile</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>{/* Table rows */}</tbody>
    </table>
  </details>
</figure>
```

## Testing Checklist

### Automated Testing
```bash
# Run accessibility tests
pnpm test:accessibility

# Lighthouse CI
pnpm lighthouse:ci

# Pa11y testing
pnpm pa11y:test

# Axe-core integration
pnpm test:axe
```

### Manual Testing

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Reverse tab (Shift+Tab) works correctly
- [ ] Enter/Space activates buttons
- [ ] Arrow keys work in menus/lists
- [ ] Escape closes modals/dropdowns
- [ ] No keyboard traps exist
- [ ] Focus indicators always visible

#### Screen Reader Testing
- [ ] NVDA on Windows
- [ ] JAWS on Windows
- [ ] VoiceOver on macOS (Cmd+F5)
- [ ] VoiceOver on iOS
- [ ] TalkBack on Android
- [ ] Landmark regions properly labeled
- [ ] Form inputs have labels
- [ ] Error messages announced
- [ ] Dynamic content updates announced

#### Visual Testing
- [ ] 200% zoom maintains usability
- [ ] High contrast mode works
- [ ] Dark mode maintains contrast
- [ ] Color not sole information conveyor
- [ ] Focus indicators visible
- [ ] Touch targets ≥ 44×44px (mobile)
- [ ] Click targets ≥ 24×24px (desktop)

#### Cognitive Accessibility
- [ ] Clear, simple language
- [ ] Consistent navigation
- [ ] Error prevention and recovery
- [ ] No time limits (or adjustable)
- [ ] Clear instructions
- [ ] Predictable interactions

## Browser & AT Support Matrix

| Browser | Screen Reader | Support Level |
|---------|--------------|---------------|
| Chrome | NVDA | Full |
| Firefox | NVDA | Full |
| Edge | Narrator | Full |
| Safari | VoiceOver | Full |
| Chrome | JAWS | Full |
| iOS Safari | VoiceOver | Full |
| Chrome Android | TalkBack | Full |

## Common Patterns

### Loading States
```tsx
<div role="status" aria-live="polite">
  <span className="sr-only">Loading...</span>
  <Spinner aria-hidden="true" />
</div>
```

### Error Messages
```tsx
<div role="alert" aria-live="assertive">
  <h2>Error</h2>
  <p>{errorMessage}</p>
</div>
```

### Progress Indicators
```tsx
<progress 
  value={current} 
  max={total}
  aria-label={`Step ${current} of ${total}`}
>
  {Math.round((current / total) * 100)}%
</progress>
```

### Tooltips
```tsx
<button 
  aria-describedby={showTooltip ? "tooltip" : undefined}
  onMouseEnter={showTooltip}
  onFocus={showTooltip}
>
  Info
</button>
{showTooltip && (
  <div role="tooltip" id="tooltip">
    Additional information
  </div>
)}
```

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y CLI](https://pa11y.org/)
- [Contrast Checker](https://www.webai.org/resources/contrastchecker/)

### Training
- Screen reader basics for developers
- Quarterly accessibility audits
- User testing with disabled users
- Accessibility champion program

## Compliance Reporting

### Metrics Tracked
- Lighthouse accessibility score (target: >95)
- Automated test pass rate (target: 100%)
- Manual audit findings (target: 0 critical)
- User complaints (target: <1/month)
- Time to fix (target: <48hr for critical)

### Accessibility Statement
Published at `/accessibility` including:
- Compliance status
- Known issues & timeline
- Contact information
- Feedback mechanism
- Alternative formats available

---

*Remember: Accessibility is not a feature, it's a fundamental requirement. Every user deserves equal access to information and functionality.*
