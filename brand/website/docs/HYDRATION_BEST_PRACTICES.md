# React Hydration Best Practices for Next.js

## Overview

This document outlines best practices for preventing hydration errors in React applications with Next.js App Router and React 18.

## What Are Hydration Errors?

Hydration errors occur when the client-side rendered content doesn't match the server-side rendered content. Common causes:

- Random values (`Math.random()`)
- Time-based calculations (`new Date()`, `Date.now()`)
- Browser-specific APIs (`localStorage`, `window`)
- Dynamic content that changes between server and client

## Key Fixes Implemented

### 1. Static Initial State Pattern

**Problem**: Dynamic state initialization during SSR causes mismatches.

```tsx
// ❌ BAD - Causes hydration mismatch
const [state, setState] = useState(() => ({
  value: Math.random(),
  timestamp: Date.now()
}));

// ✅ GOOD - Static initial state
const getInitialState = () => ({
  value: 0.5,    // Static value
  timestamp: 0   // Static value
});

const [state, setState] = useState(getInitialState);
```

### 2. Client-Only Effect Pattern

**Problem**: Dynamic calculations running during SSR.

```tsx
// ❌ BAD - Runs during SSR
const [value, setValue] = useState(Math.random());

// ✅ GOOD - Client-only initialization
const [isClient, setIsClient] = useState(false);
const [value, setValue] = useState(0.5); // Static initial

useEffect(() => {
  setIsClient(true);
  setValue(Math.random()); // Only run on client
}, []);
```

### 3. Conditional Rendering Pattern

**Problem**: Dynamic content rendering during SSR.

```tsx
// ❌ BAD - Dynamic content during SSR
<div>Current time: {new Date().toLocaleString()}</div>

// ✅ GOOD - Conditional rendering after hydration
{isClient && (
  <div>Current time: {new Date().toLocaleString()}</div>
)}
```

### 4. React 18 useId Hook

**Problem**: Random ID generation causes mismatches.

```tsx
// ❌ BAD - Random ID generation
const id = `input-${Math.random().toString(36).substr(2, 9)}`;

// ✅ GOOD - React 18 useId hook
const id = useId();
```

## Implementation Examples

### Time-Based Components

```tsx
'use client';

import { useState, useEffect } from 'react';

export function TimeDisplay() {
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isClient || !currentTime) {
    return <div>Loading time...</div>;
  }

  return <div>Current time: {currentTime.toLocaleString()}</div>;
}
```

### Random Value Components

```tsx
'use client';

import { useState, useEffect } from 'react';

export function RandomDisplay() {
  const [isClient, setIsClient] = useState(false);
  const [randomValue, setRandomValue] = useState(0.5); // Static initial

  useEffect(() => {
    setIsClient(true);
    setRandomValue(Math.random());
  }, []);

  return (
    <div>
      Random value: {isClient ? randomValue.toFixed(3) : '0.500'}
    </div>
  );
}
```

### Form Components with Dynamic IDs

```tsx
import { useId } from 'react';

export function FormInput({ label, ...props }) {
  const id = useId(); // React 18 hydration-safe ID

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </>
  );
}
```

## Custom Hooks

### useIsomorphicState Hook

```tsx
import { useEffect, useState } from 'react';

export function useIsomorphicState<T>(
  staticValue: T,
  dynamicValueFactory: () => T
): [T, boolean] {
  const [isClient, setIsClient] = useState(false);
  const [state, setState] = useState<T>(staticValue);

  useEffect(() => {
    setIsClient(true);
    setState(dynamicValueFactory());
  }, []);

  return [state, isClient];
}

// Usage
const [randomValue, isClient] = useIsomorphicState(0.5, () => Math.random());
```

### useClientOnlyTime Hook

```tsx
import { useEffect, useState } from 'react';

export function useClientOnlyTime() {
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  return { isClient, currentTime };
}
```

## Next.js App Router Considerations

### Metadata Configuration

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Your App',
  description: 'Description',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};
```

### Client Components

Always mark components with dynamic behavior as client components:

```tsx
'use client';

import { useState, useEffect } from 'react';
// Component with dynamic state...
```

## Testing for Hydration Issues

### Development Mode

1. Enable React Strict Mode in `next.config.js`:
```js
const nextConfig = {
  reactStrictMode: true,
};
```

2. Check browser console for hydration warnings
3. Use React DevTools Profiler

### Production Testing

1. Build and run production bundle:
```bash
npm run build
npm run start
```

2. Test with disabled JavaScript to see SSR content
3. Monitor for hydration mismatches

## Common Patterns to Avoid

### ❌ Problematic Patterns

```tsx
// Random values during initialization
const [id] = useState(() => Math.random().toString());

// Date/time calculations in render
const currentHour = new Date().getHours();

// Browser APIs during SSR
const [theme] = useState(() => localStorage.getItem('theme'));

// Dynamic calculations in component body
const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
```

### ✅ Recommended Patterns

```tsx
// Static initialization with client updates
const [isClient, setIsClient] = useState(false);
const [id] = useState('static-id');

useEffect(() => {
  setIsClient(true);
  // Dynamic updates here
}, []);

// Conditional rendering
{isClient && <DynamicContent />}

// React 18 useId for stable IDs
const id = useId();
```

## Performance Considerations

1. **Minimize Layout Shift**: Use placeholder content with similar dimensions
2. **Progressive Enhancement**: Start with static content, enhance with dynamic features
3. **Loading States**: Show appropriate loading states during hydration
4. **Batch Updates**: Group related state updates together

## Debugging Tools

1. **React DevTools**: Check component re-renders and state
2. **Next.js Analyzer**: Bundle analysis for SSR/CSR splits
3. **Browser DevTools**: Network tab for hydration requests
4. **Lighthouse**: Performance and hydration metrics

## Conclusion

Following these patterns ensures:
- ✅ No hydration mismatches
- ✅ Consistent SSR/CSR behavior
- ✅ Better performance
- ✅ Improved user experience
- ✅ Easier debugging and maintenance

Remember: When in doubt, start static and progressively enhance on the client.