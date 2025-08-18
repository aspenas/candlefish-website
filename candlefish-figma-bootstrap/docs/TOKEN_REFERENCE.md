# Design Token Reference

## Overview

Design tokens are the atomic design decisions that ensure consistency across all platforms and implementations of the Candlefish brand.

## Token Structure

```
tokens/
├── color.json       # Color definitions
├── type.json        # Typography specifications
├── spacing.json     # Spacing scale (future)
├── elevation.json   # Shadow definitions (future)
└── motion.json      # Animation values (future)
```

## Color Tokens

### Token Format

```json
{
  "color": {
    "brand": {
      "primary": "#11D9E6",
      "ink": "#0D1214",
      "surface": "#082C32"
    },
    "neutral": {
      "100": "#F2F5F6",
      "200": "#E6EBED",
      "300": "#CBD5D9",
      "400": "#AFBEC4",
      "500": "#93A7AF",
      "600": "#798F99",
      "700": "#5F7782",
      "800": "#485E68",
      "900": "#31454E"
    },
    "accent": {
      "warn": "#D97706",
      "ok": "#10B981"
    }
  }
}
```

### Color Token Usage

#### CSS Variables
```css
:root {
  --color-brand-primary: #11D9E6;
  --color-brand-ink: #0D1214;
  --color-brand-surface: #082C32;
  --color-neutral-100: #F2F5F6;
  /* ... */
}
```

#### JavaScript/TypeScript
```typescript
import tokens from './tokens/color.json';

const primaryColor = tokens.color.brand.primary;
const backgroundColor = tokens.color.neutral[100];
```

#### React Components
```tsx
import { colors } from '@candlefish/tokens';

const Button = styled.button`
  background-color: ${colors.brand.primary};
  color: ${colors.brand.ink};
`;
```

#### Sass/SCSS
```scss
@import 'tokens/colors';

.button-primary {
  background-color: $color-brand-primary;
  color: $color-brand-ink;
}
```

### Color Token Naming Convention

```
color.{category}.{variant}

Categories:
- brand: Core brand colors
- neutral: Grayscale palette
- accent: Functional colors
- semantic: Contextual colors (future)
```

## Typography Tokens

### Token Format

```json
{
  "type": {
    "h1": { 
      "size": 40, 
      "line": 48, 
      "weight": "Medium", 
      "tracking": 0.01 
    },
    "h2": { 
      "size": 28, 
      "line": 36, 
      "weight": "Medium", 
      "tracking": 0.01 
    },
    "h3": { 
      "size": 20, 
      "line": 28, 
      "weight": "Medium", 
      "tracking": 0.01 
    },
    "body": { 
      "size": 16, 
      "line": 24, 
      "weight": "Regular", 
      "tracking": 0 
    },
    "small": { 
      "size": 14, 
      "line": 20, 
      "weight": "Regular", 
      "tracking": 0 
    },
    "family": "Inter"
  }
}
```

### Typography Token Usage

#### CSS Implementation
```css
.h1 {
  font-family: Inter, sans-serif;
  font-size: 40px;
  line-height: 48px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
```

#### TypeScript Type Definitions
```typescript
interface TypographyToken {
  size: number;
  line: number;
  weight: 'Regular' | 'Medium' | 'Bold';
  tracking: number;
}

interface TypographyTokens {
  h1: TypographyToken;
  h2: TypographyToken;
  h3: TypographyToken;
  body: TypographyToken;
  small: TypographyToken;
  family: string;
}
```

#### React Typography Component
```tsx
import { type } from '@candlefish/tokens';

const H1 = styled.h1`
  font-size: ${type.h1.size}px;
  line-height: ${type.h1.line}px;
  font-weight: ${type.h1.weight === 'Medium' ? 500 : 400};
  letter-spacing: ${type.h1.tracking}em;
`;
```

## Spacing Tokens (Proposed)

### Token Format

```json
{
  "spacing": {
    "0": "0px",
    "px": "1px",
    "0.5": "2px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "32": "128px",
    "40": "160px",
    "48": "192px",
    "56": "224px",
    "64": "256px"
  }
}
```

### Spacing Scale Logic

```
Base: 4px
Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64
Formula: base * multiplier
```

## Border Radius Tokens (Proposed)

### Token Format

```json
{
  "radius": {
    "none": "0px",
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "2xl": "24px",
    "full": "9999px"
  }
}
```

## Shadow Tokens (Proposed)

### Token Format

```json
{
  "shadow": {
    "xs": {
      "value": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "x": 0,
      "y": 1,
      "blur": 2,
      "spread": 0,
      "color": "rgba(0, 0, 0, 0.05)"
    },
    "sm": {
      "value": "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      "x": 0,
      "y": 1,
      "blur": 3,
      "spread": 0,
      "color": "rgba(0, 0, 0, 0.1)"
    },
    "md": {
      "value": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "x": 0,
      "y": 4,
      "blur": 6,
      "spread": -1,
      "color": "rgba(0, 0, 0, 0.1)"
    }
  }
}
```

## Motion Tokens (Proposed)

### Token Format

```json
{
  "motion": {
    "duration": {
      "instant": "0ms",
      "fast": "150ms",
      "normal": "250ms",
      "slow": "350ms",
      "slower": "500ms"
    },
    "easing": {
      "linear": "linear",
      "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
      "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
      "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
    }
  }
}
```

## Token Generation

### From Figma

```bash
# Generate tokens from plugin
npm run tokens

# Output location
dist/tokens/color.json
dist/tokens/type.json
```

### Programmatic Generation

```typescript
// scripts/generate-tokens.ts
import { writeFileSync } from 'fs';

const colorTokens = {
  color: {
    brand: {
      primary: '#11D9E6',
      // ...
    }
  }
};

writeFileSync(
  './tokens/color.json', 
  JSON.stringify(colorTokens, null, 2)
);
```

## Token Transformation

### Style Dictionary Configuration

```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/css/",
      "files": [{
        "destination": "variables.css",
        "format": "css/variables"
      }]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "build/scss/",
      "files": [{
        "destination": "_variables.scss",
        "format": "scss/variables"
      }]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "build/js/",
      "files": [{
        "destination": "tokens.js",
        "format": "javascript/es6"
      }]
    }
  }
}
```

### Custom Transformations

```javascript
// Custom transform for React Native
StyleDictionary.registerTransform({
  name: 'size/dp',
  type: 'value',
  matcher: (prop) => prop.attributes.category === 'size',
  transformer: (prop) => parseFloat(prop.value) + 'dp'
});
```

## Platform-Specific Tokens

### Web Tokens
```json
{
  "web": {
    "font-family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  }
}
```

### iOS Tokens
```json
{
  "ios": {
    "font-family": "Inter",
    "font-family-fallback": "San Francisco"
  }
}
```

### Android Tokens
```json
{
  "android": {
    "font-family": "inter",
    "font-family-fallback": "roboto"
  }
}
```

## Token Validation

### Schema Validation

```typescript
// token-schema.ts
interface TokenSchema {
  color?: {
    [key: string]: string | { [key: string]: string };
  };
  type?: {
    [key: string]: {
      size: number;
      line: number;
      weight: string;
      tracking: number;
    };
  };
}

function validateTokens(tokens: any): tokens is TokenSchema {
  // Validation logic
  return true;
}
```

### Automated Testing

```typescript
// __tests__/tokens.test.ts
import tokens from '../tokens/color.json';

describe('Color Tokens', () => {
  test('all colors are valid hex', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    
    Object.values(tokens.color.brand).forEach(color => {
      expect(color).toMatch(hexRegex);
    });
  });
  
  test('contrast ratios meet WCAG AA', () => {
    const contrast = getContrastRatio(
      tokens.color.brand.ink,
      tokens.color.neutral[100]
    );
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
```

## Token Documentation

### Inline Documentation

```json
{
  "color": {
    "brand": {
      "primary": {
        "value": "#11D9E6",
        "comment": "Primary brand color - Electric cyan",
        "usage": "Primary CTAs, brand moments, key highlights"
      }
    }
  }
}
```

### Generated Documentation

```markdown
## Color Tokens

| Token | Value | Description | Usage |
|-------|-------|-------------|-------|
| color.brand.primary | #11D9E6 | Electric cyan | Primary CTAs |
| color.brand.ink | #0D1214 | Deep charcoal | Primary text |
```

## Token Versioning

### Semantic Versioning

```json
{
  "version": "1.2.3",
  "tokens": {
    // Token definitions
  }
}
```

### Change Management

```typescript
// Migration helper
function migrateTokens(oldTokens: any, version: string) {
  switch(version) {
    case '1.0.0':
      // v1 to v2 migration
      return {
        ...oldTokens,
        color: {
          brand: oldTokens.colors // Renamed
        }
      };
    default:
      return oldTokens;
  }
}
```

## Best Practices

### Do's
- Use semantic naming
- Document token purpose
- Version token changes
- Validate token values
- Test token applications

### Don'ts
- Hard-code values
- Use magic numbers
- Mix token systems
- Override tokens locally
- Break naming conventions

## Token Consumption

### Build-Time Integration
```javascript
// webpack.config.js
const tokens = require('./tokens');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      DESIGN_TOKENS: JSON.stringify(tokens)
    })
  ]
};
```

### Runtime Loading
```typescript
// Load tokens dynamically
async function loadTokens() {
  const response = await fetch('/api/design-tokens');
  const tokens = await response.json();
  applyTokens(tokens);
}
```

### CI/CD Integration
```yaml
# .github/workflows/tokens.yml
name: Update Design Tokens
on:
  push:
    paths:
      - 'tokens/**'
jobs:
  build:
    steps:
      - run: npm run build:tokens
      - run: npm run validate:tokens
      - run: npm run publish:tokens
```

---

*Design tokens are the foundation of the Candlefish design system. Keep them organized, documented, and versioned.*
