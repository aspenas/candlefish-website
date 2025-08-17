# Candlefish Figma Plugin - Developer Documentation

## Architecture Overview

The Candlefish Figma Plugin follows a modular architecture designed for maintainability and extensibility.

### System Architecture

```
┌─────────────────────────────────────────────────┐
│                 Figma Desktop App               │
├─────────────────────────────────────────────────┤
│              Plugin Runtime Environment         │
├─────────────────────────────────────────────────┤
│                  Main Plugin Code               │
│                 (plugin/src/main.ts)            │
├─────────────┬───────────────┬──────────────────┤
│   Styles    │  Components   │     Assets       │
│   Module    │    Module     │     Module       │
├─────────────┴───────────────┴──────────────────┤
│                 Figma Plugin API                │
├─────────────────────────────────────────────────┤
│              External Scripts Layer             │
│         (Token Generation, Asset Export)        │
├─────────────────────────────────────────────────┤
│                  AWS Integration                │
│           (Secrets Manager for API Keys)        │
└─────────────────────────────────────────────────┘
```

### Component Architecture

```
main.ts
├── Color System
│   ├── hexToRgb()           - Color conversion
│   ├── makePaintStyle()     - Style creation
│   └── createColorStylesAndVariables() - Variable setup
├── Typography System
│   └── createTypographyStyles() - Text style generation
├── Component System
│   ├── createBaseComponents() - UI component creation
│   └── importLogoToComponent() - Asset embedding
├── Page Management
│   └── ensurePage() - Page creation/retrieval
└── Orchestration
    └── run() - Main execution flow
```

## Code Structure

### Directory Layout

```
candlefish-figma-bootstrap/
├── plugin/                   # Plugin source code
│   ├── manifest.json        # Plugin configuration
│   ├── src/
│   │   └── main.ts         # Main plugin logic
│   └── build/              # Compiled output
│       └── main.js         # Bundled plugin
├── scripts/                 # Utility scripts
│   ├── generate-tokens.ts  # Token generation
│   ├── export-assets.ts    # Asset export via API
│   ├── find-file-key.ts    # File key extraction
│   └── load-logo-and-run.ts # Logo embedding
├── dist/                    # Build artifacts
│   └── tokens/             # Generated design tokens
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

### Key Modules

#### Color System Module

Responsible for color management and style creation:

```typescript
// Color conversion utility
function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

// Paint style factory
function makePaintStyle(name: string, hex: string): PaintStyle {
  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = [{
    type: 'SOLID',
    color: hexToRgb(hex),
  }];
  return style;
}
```

#### Typography Module

Manages text styles and font configurations:

```typescript
function createTypographyStyles() {
  const styles = [
    { name: 'Type/H1', fontSize: 40, lineHeight: 48, fontWeight: 'Medium' },
    // Additional styles...
  ];
  
  for (const s of styles) {
    const ts = figma.createTextStyle();
    ts.name = s.name;
    ts.fontSize = s.fontSize;
    ts.lineHeight = { unit: 'PIXELS', value: s.lineHeight };
    ts.letterSpacing = { unit: 'PERCENT', value: s.letterSpacing * 100 };
    ts.fontName = { family: 'Inter', style: s.fontWeight };
  }
}
```

#### Component Creation Module

Generates reusable UI components:

```typescript
function createBaseComponents() {
  // Container component with auto-layout
  const container = figma.createComponent();
  container.name = 'Grid/Container';
  container.layoutMode = 'VERTICAL';
  container.itemSpacing = 24;
  container.paddingLeft = 24;
  // Additional configuration...
  
  return { container, /* other components */ };
}
```

## API Documentation

### Main Functions

#### `run(bytes?: Uint8Array): Promise<void>`

Main execution function that orchestrates the entire plugin flow.

**Parameters:**
- `bytes` (optional): Logo image data as Uint8Array

**Process:**
1. Creates required pages
2. Generates color styles and variables
3. Creates typography styles
4. Imports logo and creates variants
5. Generates base components
6. Creates brand specimen sheet

**Example:**
```typescript
await run(logoBytes);
```

#### `hexToRgb(hex: string): RGB`

Converts hexadecimal color strings to Figma RGB format.

**Parameters:**
- `hex`: Hex color string (with or without #)

**Returns:**
- RGB object with r, g, b values (0-1 range)

**Example:**
```typescript
const rgb = hexToRgb('#11D9E6');
// Returns: { r: 0.067, g: 0.851, b: 0.902 }
```

#### `makePaintStyle(name: string, hex: string): PaintStyle`

Creates a Figma paint style with the specified color.

**Parameters:**
- `name`: Style name (use / for grouping)
- `hex`: Hexadecimal color value

**Returns:**
- PaintStyle object

**Example:**
```typescript
const brandPrimary = makePaintStyle('Brand/Primary', '#11D9E6');
```

#### `ensurePage(name: string): Promise<PageNode>`

Creates a page or returns existing one with the same name.

**Parameters:**
- `name`: Page name

**Returns:**
- Promise resolving to PageNode

**Example:**
```typescript
const assetsPage = await ensurePage('01 Brand Assets');
```

#### `importLogoToComponent(imgBytes: Uint8Array | undefined, name?: string): Promise<ComponentNode>`

Creates a logo component with optional image data.

**Parameters:**
- `imgBytes`: Image data as Uint8Array
- `name`: Component name (default: 'Logo/Primary')

**Returns:**
- Promise resolving to ComponentNode

**Example:**
```typescript
const logo = await importLogoToComponent(logoData, 'Logo/Primary');
```

### Script APIs

#### Token Generation Script

```typescript
// scripts/generate-tokens.ts
// Generates design token JSON files

interface ColorTokens {
  color: {
    brand: Record<string, string>;
    neutral: Record<string, string>;
    accent: Record<string, string>;
  };
}

interface TypeTokens {
  type: {
    [key: string]: {
      size: number;
      line: number;
      weight: string;
      tracking: number;
    };
  };
}
```

## Testing Guide

### Unit Testing

While Figma plugins don't support traditional unit testing, you can test individual functions:

```typescript
// test-utils.ts
import { hexToRgb } from './main';

// Test color conversion
console.assert(
  JSON.stringify(hexToRgb('#FFFFFF')) === JSON.stringify({ r: 1, g: 1, b: 1 }),
  'White conversion failed'
);
```

### Integration Testing

Test the plugin in Figma Desktop:

1. **Setup Test Environment**
   ```bash
   # Create test build
   npm run build
   
   # Load in Figma Desktop
   # Plugins → Development → Import plugin from manifest
   ```

2. **Test Scenarios**
   - Empty file bootstrap
   - File with existing content
   - Missing font handling
   - Large file performance

3. **Validation Checklist**
   - [ ] All pages created
   - [ ] Color styles generated
   - [ ] Typography styles applied
   - [ ] Components created
   - [ ] Specimens rendered
   - [ ] No console errors

### Performance Testing

Monitor plugin performance:

```typescript
// Add performance monitoring
const startTime = Date.now();
await run();
const endTime = Date.now();
console.log(`Plugin execution time: ${endTime - startTime}ms`);
```

## Build Process

### Development Build

For active development with file watching:

```bash
npm run dev
# Uses esbuild with --watch flag
# Auto-rebuilds on file changes
```

### Production Build

For distribution and deployment:

```bash
npm run build
# Outputs: plugin/build/main.js
```

### Build Configuration

The build uses esbuild with these settings:

```json
{
  "bundle": true,
  "format": "cjs",
  "platform": "browser",
  "target": "es2017",
  "outfile": "plugin/build/main.js"
}
```

### Optimization Tips

1. **Minimize bundle size**
   - Use tree-shaking
   - Avoid large dependencies
   - Inline small utilities

2. **Improve performance**
   - Batch Figma API calls
   - Use async/await properly
   - Cache repeated operations

## Deployment

### Local Development

1. **Build the plugin**
   ```bash
   npm run build
   ```

2. **Load in Figma Desktop**
   - Menu → Plugins → Development → Import plugin from manifest
   - Select `plugin/manifest.json`

3. **Test thoroughly**
   - Run in different files
   - Check all features
   - Monitor console for errors

### Distribution

#### Internal Distribution

1. **Package the plugin**
   ```bash
   zip -r candlefish-figma-plugin.zip plugin/
   ```

2. **Share with team**
   - Upload to shared drive
   - Include installation guide
   - Document version changes

#### Figma Community (Future)

1. **Prepare for publication**
   - Complete documentation
   - Add cover image
   - Create demo file

2. **Submit to Figma**
   - Follow Figma's review guidelines
   - Provide support contact
   - Include privacy policy

### Version Management

Update version in `manifest.json`:

```json
{
  "name": "Candlefish Brand Bootstrap",
  "id": "candlefish.brand.bootstrap",
  "api": "1.0.0",
  "version": "1.2.0"  // Update this
}
```

## Advanced Topics

### Custom Logo Embedding

Embed logo directly in the plugin:

```typescript
// plugin/src/logo-bytes.ts
export const LOGO_BASE64 = 'data:image/png;base64,...';
```

### Dynamic Token Loading

Load tokens from external source:

```typescript
async function loadTokensFromAPI() {
  const response = await fetch('https://api.example.com/tokens');
  const tokens = await response.json();
  applyTokensToFigma(tokens);
}
```

### Multi-Brand Support

Support multiple brand configurations:

```typescript
interface BrandConfig {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, any>;
}

function applyBrand(config: BrandConfig) {
  // Apply brand-specific styles
}
```

### Figma API Integration

Use the Figma REST API for advanced operations:

```typescript
// scripts/export-assets.ts
const FIGMA_API = 'https://api.figma.com/v1';

async function exportFromFigma(fileKey: string) {
  const response = await fetch(`${FIGMA_API}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': process.env.FIGMA_TOKEN
    }
  });
  return response.json();
}
```

## Troubleshooting

### Common Development Issues

#### TypeScript Errors

```bash
# Check types
npm run type-check

# Common fixes:
# - Update @figma/plugin-typings
# - Check tsconfig.json settings
```

#### Build Failures

```bash
# Clean build
rm -rf plugin/build
rm -rf dist
npm run build

# Check for:
# - Missing dependencies
# - Syntax errors
# - Import path issues
```

#### Runtime Errors

```javascript
// Add error handling
try {
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
} catch (error) {
  console.error('Font loading failed:', error);
  // Fallback logic
}
```

### Debug Techniques

1. **Console Logging**
   ```typescript
   console.log('Debug:', variable);
   console.table(data);
   console.time('operation');
   // ... code ...
   console.timeEnd('operation');
   ```

2. **Figma DevTools**
   - Open: Plugins → Development → Open Console
   - Use Network tab for API calls
   - Check Console for errors

3. **State Inspection**
   ```typescript
   // Log current selection
   console.log('Selected:', figma.currentPage.selection);
   
   // Log all pages
   figma.root.children.forEach(page => {
     console.log('Page:', page.name);
   });
   ```

## Security Considerations

### API Key Management

Never hardcode API keys:

```typescript
// Bad
const API_KEY = 'sk-abc123...';

// Good
const API_KEY = process.env.FIGMA_TOKEN;
```

### AWS Secrets Integration

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getFigmaToken() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const command = new GetSecretValueCommand({
    SecretId: 'figma-api-token'
  });
  const response = await client.send(command);
  return response.SecretString;
}
```

### Input Validation

Always validate external input:

```typescript
function validateHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function safeMakePaintStyle(name: string, hex: string) {
  if (!validateHexColor(hex)) {
    throw new Error('Invalid hex color');
  }
  return makePaintStyle(name, hex);
}
```

## Performance Optimization

### Batch Operations

```typescript
// Inefficient
for (const color of colors) {
  makePaintStyle(color.name, color.hex);
}

// Efficient
const styles = colors.map(c => makePaintStyle(c.name, c.hex));
```

### Lazy Loading

```typescript
// Load fonts only when needed
async function createTextIfFontAvailable() {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    // Create text nodes
  } catch {
    // Skip text creation
  }
}
```

### Memory Management

```typescript
// Clean up large objects
let largeData = processData();
// Use data...
largeData = null; // Allow garbage collection
```

## Contributing Guidelines

### Code Standards

- Use TypeScript strict mode
- Follow ESLint rules
- Add JSDoc comments for public APIs
- Keep functions under 50 lines
- Use meaningful variable names

### Pull Request Process

1. Create feature branch
2. Write/update documentation
3. Add tests if applicable
4. Run type checking
5. Submit PR with description

### Review Checklist

- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Error handling in place
- [ ] Performance considered
- [ ] Security reviewed

---

*For more information, see the main README.md or contact the development team.*
