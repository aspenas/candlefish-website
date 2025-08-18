# Candlefish Design System Documentation

## Design Philosophy

The Candlefish Design System embodies principles of clarity, efficiency, and technological sophistication. Our visual language balances minimalism with warmth, creating interfaces that are both powerful and approachable.

### Core Principles

1. **Clarity First**: Every element serves a purpose
2. **Consistent Rhythm**: Mathematical relationships create harmony
3. **Accessible by Default**: Inclusive design for all users
4. **Performance Minded**: Lightweight, optimized assets
5. **Scalable Foundation**: Grows with product needs

## Color System

### Color Architecture

Our color system uses a semantic naming structure that scales from brand colors to functional UI colors.

```
Color System
├── Brand Colors (Core identity)
├── Neutral Scale (UI foundation)
├── Accent Colors (Functional states)
└── Semantic Tokens (Contextual usage)
```

### Brand Colors

#### Primary - Electric Cyan
- **Hex**: `#11D9E6`
- **RGB**: `17, 217, 230`
- **HSL**: `184°, 86%, 48%`
- **Usage**: Primary actions, brand moments, key highlights
- **Accessibility**: AA compliant on dark backgrounds

#### Ink - Deep Charcoal
- **Hex**: `#0D1214`
- **RGB**: `13, 18, 20`
- **HSL**: `197°, 21%, 6%`
- **Usage**: Primary text, high-contrast elements
- **Accessibility**: AAA compliant on light backgrounds

#### Surface - Ocean Depth
- **Hex**: `#082C32`
- **RGB**: `8, 44, 50`
- **HSL**: `189°, 72%, 11%`
- **Usage**: Dark backgrounds, header areas, depth layers
- **Accessibility**: Requires light text for contrast

### Neutral Scale

A carefully calibrated 9-step scale providing flexibility for UI design:

| Level | Name        | Hex       | Usage                           |
|-------|-------------|-----------|--------------------------------|
| 100   | Snow        | `#F2F5F6` | Backgrounds, subtle fills      |
| 200   | Mist        | `#E6EBED` | Borders, dividers              |
| 300   | Fog         | `#CBD5D9` | Disabled states, placeholders  |
| 400   | Cloud       | `#AFBEC4` | Secondary borders              |
| 500   | Storm       | `#93A7AF` | Secondary text                 |
| 600   | Steel       | `#798F99` | Icons, tertiary text          |
| 700   | Slate       | `#5F7782` | Active borders                 |
| 800   | Graphite    | `#485E68` | Primary borders, strong text   |
| 900   | Carbon      | `#31454E` | Near-black, maximum contrast   |

### Accent Colors

#### Warning - Amber
- **Hex**: `#D97706`
- **RGB**: `217, 119, 6`
- **Usage**: Warnings, caution states, important notices

#### Success - Emerald
- **Hex**: `#10B981`
- **RGB**: `16, 185, 129`
- **Usage**: Success states, positive actions, confirmations

### Color Application Rules

1. **Contrast Requirements**
   - Text on background: Minimum 4.5:1 (WCAG AA)
   - Large text: Minimum 3:1
   - Interactive elements: Minimum 3:1

2. **Color Combinations**
   ```
   Approved Combinations:
   - Ink (#0D1214) on Snow (#F2F5F6)
   - Snow (#F2F5F6) on Surface (#082C32)
   - Primary (#11D9E6) on Ink (#0D1214)
   - Carbon (#31454E) on Mist (#E6EBED)
   ```

3. **Semantic Usage**
   - **Backgrounds**: Neutral 100-200
   - **Cards**: White with Neutral 200 border
   - **Text**: Ink (primary), Neutral 600-900 (secondary)
   - **Borders**: Neutral 200-400
   - **Interactive**: Primary for CTAs, Neutral 700 for secondary

## Typography System

### Type Scale

Based on a modular scale with a ratio of 1.4 (Augmented Fourth):

| Style  | Size | Line Height | Weight | Tracking | Usage                    |
|--------|------|-------------|--------|----------|--------------------------|
| H1     | 40px | 48px        | Medium | +0.01em  | Page titles, hero text   |
| H2     | 28px | 36px        | Medium | +0.01em  | Section headers          |
| H3     | 20px | 28px        | Medium | +0.01em  | Subsection headers       |
| Body   | 16px | 24px        | Regular| 0        | Body text, descriptions  |
| Small  | 14px | 20px        | Regular| 0        | Captions, metadata       |

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

### Typography Principles

1. **Hierarchy**: Clear visual distinction between levels
2. **Readability**: Optimal line length (45-75 characters)
3. **Rhythm**: Consistent baseline grid (8px)
4. **Contrast**: Weight and size create emphasis

### Text Color Guidelines

```typescript
// Text color assignments
const textColors = {
  primary: '#0D1214',   // Ink - Primary text
  secondary: '#5F7782', // Slate - Secondary text
  tertiary: '#93A7AF',  // Storm - Tertiary text
  disabled: '#CBD5D9',  // Fog - Disabled text
  inverse: '#F2F5F6',   // Snow - Text on dark
  link: '#11D9E6',      // Primary - Interactive text
};
```

## Component Library

### Component Architecture

```
Components
├── Primitives (Atomic elements)
├── Patterns (Composite components)
├── Templates (Page layouts)
└── Utilities (Helper components)
```

### Grid System

#### Container Component
- **Max Width**: 1200px
- **Padding**: 24px (mobile), 48px (desktop)
- **Margins**: Auto-centered
- **Columns**: 12-column grid
- **Gutter**: 24px

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  
  @media (min-width: 768px) {
    padding: 0 48px;
  }
}
```

#### Stack Component
- **Direction**: Vertical (default), Horizontal
- **Spacing**: 8px, 16px, 24px, 32px variants
- **Alignment**: Start, Center, End, Stretch

### Button Components

#### Primary Button
```css
.button-primary {
  background: #11D9E6;
  color: #0D1214;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0FC5D2;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(17, 217, 230, 0.3);
  }
}
```

#### Quiet Button
```css
.button-quiet {
  background: #FFFFFF;
  color: #0D1214;
  padding: 12px 24px;
  border: 1px solid #CBD5D9;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #93A7AF;
    background: #F2F5F6;
  }
}
```

### Card Component

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E6EBED;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

### Form Components

#### Input Field
```css
.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #CBD5D9;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #11D9E6;
    box-shadow: 0 0 0 3px rgba(17, 217, 230, 0.1);
  }
}
```

## Grid System

### 8-Point Grid

All spacing, sizing, and positioning follow an 8-point grid system:

```
Base unit: 8px

Spacing Scale:
- xs:  4px (0.5x)
- sm:  8px (1x)
- md:  12px (1.5x)
- lg:  16px (2x)
- xl:  24px (3x)
- 2xl: 32px (4x)
- 3xl: 48px (6x)
- 4xl: 64px (8x)
- 5xl: 80px (10x)
- 6xl: 120px (15x)
```

### Layout Grid

#### Desktop (1440px)
- **Columns**: 12
- **Gutter**: 24px
- **Margin**: 120px

#### Tablet (768px)
- **Columns**: 8
- **Gutter**: 24px
- **Margin**: 48px

#### Mobile (375px)
- **Columns**: 4
- **Gutter**: 16px
- **Margin**: 24px

### Responsive Breakpoints

```css
/* Mobile First Approach */
$mobile-small: 320px;
$mobile: 375px;
$mobile-large: 414px;
$tablet: 768px;
$desktop: 1024px;
$desktop-large: 1440px;
$desktop-xl: 1920px;
```

## Spacing Scale

### Spacing Tokens

```typescript
const spacing = {
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
};
```

### Spacing Application

1. **Component Padding**: Use consistent internal spacing
2. **Section Spacing**: Maintain rhythm between sections
3. **Element Spacing**: Related items closer, unrelated farther
4. **Responsive Spacing**: Scale appropriately for device

## Effect Styles

### Shadows

```css
/* Shadow Scale */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Colored Shadows */
--shadow-primary: 0 10px 25px -5px rgba(17, 217, 230, 0.3);
--shadow-error: 0 10px 25px -5px rgba(239, 68, 68, 0.3);
--shadow-success: 0 10px 25px -5px rgba(16, 185, 129, 0.3);
```

### Border Radius

```css
--radius-none: 0px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

### Transitions

```css
/* Duration */
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;

/* Easing */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

## Best Practices

### Design Principles

1. **Consistency**
   - Use established patterns
   - Maintain visual rhythm
   - Apply systematic spacing

2. **Hierarchy**
   - Clear information architecture
   - Progressive disclosure
   - Visual weight distribution

3. **Accessibility**
   - WCAG AA compliance minimum
   - Keyboard navigation support
   - Screen reader optimization

4. **Performance**
   - Optimize asset sizes
   - Lazy load when appropriate
   - Minimize paint operations

### Component Guidelines

1. **Naming Convention**
   ```
   Category/Variant/State
   Examples:
   - Button/Primary/Default
   - Card/Product/Hover
   - Input/Text/Focused
   ```

2. **Variant Structure**
   - Size: Small, Medium, Large
   - Type: Primary, Secondary, Tertiary
   - State: Default, Hover, Active, Disabled

3. **Documentation**
   - Purpose and use cases
   - Props and variants
   - Accessibility notes
   - Code examples

### Color Usage

1. **Brand Moments**
   - Hero sections
   - Primary CTAs
   - Success states

2. **Neutral Foundation**
   - Body text
   - Backgrounds
   - Borders

3. **Accent Sparingly**
   - Warnings
   - Errors
   - Special states

### Typography Rules

1. **Limit Fonts**
   - Maximum 2 typefaces
   - Use weight for hierarchy
   - Consistent line heights

2. **Readable Measures**
   - 45-75 characters per line
   - Adequate line spacing
   - Sufficient contrast

3. **Responsive Scaling**
   - Fluid typography where appropriate
   - Breakpoint adjustments
   - Maintain hierarchy

## Implementation Examples

### CSS Variables

```css
:root {
  /* Colors */
  --color-primary: #11D9E6;
  --color-ink: #0D1214;
  --color-surface: #082C32;
  
  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --text-base: 16px;
  --leading-normal: 1.5;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Borders */
  --border-width: 1px;
  --border-radius: 8px;
}
```

### React Component

```tsx
// Button.tsx
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'primary' | 'quiet';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  onClick,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Figma Token Structure

```json
{
  "global": {
    "color": {
      "brand": {
        "primary": {
          "value": "#11D9E6",
          "type": "color"
        }
      }
    },
    "typography": {
      "h1": {
        "value": {
          "fontFamily": "Inter",
          "fontSize": "40px",
          "fontWeight": "500",
          "lineHeight": "48px"
        },
        "type": "typography"
      }
    }
  }
}
```

## Migration Guide

### From Custom Styles

1. **Audit Current Styles**
   - List all colors
   - Document type scales
   - Map components

2. **Map to System**
   - Match closest system values
   - Identify gaps
   - Plan transitions

3. **Implement Gradually**
   - Start with new features
   - Refactor by section
   - Maintain consistency

### Token Integration

```javascript
// Import tokens
import tokens from '@candlefish/design-tokens';

// Use in styles
const styles = {
  color: tokens.color.brand.primary,
  fontSize: tokens.typography.body.fontSize,
  spacing: tokens.spacing.md,
};
```

## Resources

### Tools
- **Figma Plugin**: Automated system generation
- **Token Generator**: JSON token export
- **Style Dictionary**: Cross-platform tokens

### Documentation
- Component Storybook (coming soon)
- Token reference site
- Implementation guides

### Support
- Design system team channel
- Office hours weekly
- Migration assistance available

---

*The Candlefish Design System is a living document that evolves with our products and user needs.*
