# Candlefish Figma Plugin - API Reference

## Core API Functions

### Color Management

#### `hexToRgb(hex: string): RGB`

Converts hexadecimal color values to Figma's RGB format.

**Parameters:**
- `hex` (string): Hexadecimal color string with or without '#' prefix

**Returns:**
- `RGB`: Object with r, g, b properties (values 0-1)

**Example:**
```typescript
const rgb = hexToRgb('#11D9E6');
// Returns: { r: 0.06666666666666667, g: 0.8509803921568627, b: 0.9019607843137255 }
```

**Error Handling:**
- Returns black { r: 0, g: 0, b: 0 } for invalid input
- Accepts 3 or 6 character hex codes

---

#### `makePaintStyle(name: string, hex: string): PaintStyle`

Creates a reusable paint style in Figma.

**Parameters:**
- `name` (string): Style name, use '/' for grouping (e.g., 'Brand/Primary')
- `hex` (string): Hexadecimal color value

**Returns:**
- `PaintStyle`: Figma paint style object

**Example:**
```typescript
const primaryStyle = makePaintStyle('Brand/Primary', '#11D9E6');
// Creates a paint style named "Brand/Primary" with the specified color
```

**Side Effects:**
- Adds style to document's local styles
- Style becomes available in UI

---

#### `createColorStylesAndVariables(): void`

Generates complete color system including styles and variables.

**Parameters:** None

**Returns:** void

**Creates:**
- Brand color styles (Primary, Ink, Surface)
- Neutral scale (100-900)
- Accent colors (Warning, Success)
- Color variables for light/dark modes

**Example:**
```typescript
createColorStylesAndVariables();
// Generates ~15 color styles and ~20 color variables
```

**Collections Created:**
- `Colors/Light`: Light mode color variables
- `Colors/Dark`: Dark mode color variables

---

### Typography Management

#### `createTypographyStyles(): void`

Creates text styles for the design system.

**Parameters:** None

**Returns:** void

**Creates:**
| Style Name | Font Size | Line Height | Weight | Letter Spacing |
|------------|-----------|-------------|--------|----------------|
| Type/H1    | 40px      | 48px        | Medium | +1%            |
| Type/H2    | 28px      | 36px        | Medium | +1%            |
| Type/H3    | 20px      | 28px        | Medium | +1%            |
| Type/Body  | 16px      | 24px        | Regular| 0%             |
| Type/Small | 14px      | 20px        | Regular| 0%             |

**Example:**
```typescript
createTypographyStyles();
// Creates 5 text styles in the document
```

**Requirements:**
- Inter font family must be available
- Falls back gracefully if font unavailable

---

### Page Management

#### `ensurePage(name: string): Promise<PageNode>`

Creates a new page or returns existing page with matching name.

**Parameters:**
- `name` (string): Page name to create or find

**Returns:**
- `Promise<PageNode>`: The page node

**Example:**
```typescript
const assetsPage = await ensurePage('01 Brand Assets');
// Returns existing page or creates new one
```

**Behavior:**
- Searches all document pages
- Returns first match found
- Creates new page if none exists

---

### Component Creation

#### `importLogoToComponent(imgBytes?: Uint8Array, name?: string): Promise<ComponentNode>`

Creates a logo component with optional image data.

**Parameters:**
- `imgBytes` (Uint8Array, optional): Image data as byte array
- `name` (string, optional): Component name, defaults to 'Logo/Primary'

**Returns:**
- `Promise<ComponentNode>`: The created component

**Properties:**
- Size: 600x240px
- Export settings: SVG and PDF
- Fill: Image if bytes provided, fallback color otherwise

**Example:**
```typescript
const logoBytes = new Uint8Array([...]); // PNG data
const logo = await importLogoToComponent(logoBytes, 'Logo/Primary');
```

**Export Settings:**
```typescript
[
  { format: 'SVG', contentsOnly: true, useAbsoluteBounds: false },
  { format: 'PDF' }
]
```

---

#### `createBaseComponents(): ComponentSet`

Creates foundational UI components.

**Parameters:** None

**Returns:**
```typescript
interface ComponentSet {
  container: ComponentNode;  // Grid container
  stack: ComponentNode;      // Stack layout
  card: ComponentNode;       // Card component
  btnPrimary: ComponentNode; // Primary button
  btnQuiet: ComponentNode;   // Quiet button
}
```

**Components Created:**

| Component | Properties |
|-----------|------------|
| Grid/Container | 1200x800px, vertical layout, 24px padding |
| Grid/Stack | 600x400px, vertical layout, 16px spacing |
| Card/Base | 320x200px, white fill, border, 12px radius |
| Button/Primary | 160x40px, primary color, 8px radius |
| Button/Quiet | 160x40px, white fill, border, 8px radius |

**Example:**
```typescript
const components = createBaseComponents();
// Returns object with all created components
```

---

### Main Execution

#### `run(bytes?: Uint8Array): Promise<void>`

Main plugin execution function that orchestrates all operations.

**Parameters:**
- `bytes` (Uint8Array, optional): Logo image data

**Returns:**
- `Promise<void>`

**Operations Sequence:**
1. Creates required pages
2. Generates color system
3. Creates typography styles
4. Imports logo and variants
5. Creates base components
6. Generates brand specimen

**Example:**
```typescript
// Run with logo
const logoData = await fetchLogoData();
await run(logoData);

// Run without logo (uses fallback)
await run();
```

**Pages Created:**
- Cover
- 01 Brand Assets
- 02 Type & Color
- 03 Components
- 04 Specimens

---

## Utility Functions

### Layout Helpers

#### `addSwatch(name: string, hex: string): void`

Creates a color swatch component for specimens.

**Parameters:**
- `name` (string): Swatch label
- `hex` (string): Color value

**Internal Function** - Called within brand sheet generation

---

#### `addTypeLine(text: string, size: number, line: number, style: string): void`

Creates a typography specimen line.

**Parameters:**
- `text` (string): Display text
- `size` (number): Font size in pixels
- `line` (number): Line height in pixels
- `style` (string): Font weight ('Regular' or 'Medium')

**Internal Function** - Called within type specimen generation

---

## Script APIs

### Token Generation

#### `generate-tokens.ts`

Generates design token JSON files.

**Command:**
```bash
npm run tokens
```

**Output Files:**
- `dist/tokens/color.json`: Color tokens
- `dist/tokens/type.json`: Typography tokens

**Token Structure:**
```typescript
interface ColorTokens {
  color: {
    brand: {
      primary: string;
      ink: string;
      surface: string;
    };
    neutral: Record<string, string>;
    accent: {
      warn: string;
      ok: string;
    };
  };
}

interface TypeTokens {
  type: {
    h1: TypeStyle;
    h2: TypeStyle;
    h3: TypeStyle;
    body: TypeStyle;
    small: TypeStyle;
    family: string;
  };
}

interface TypeStyle {
  size: number;
  line: number;
  weight: string;
  tracking: number;
}
```

---

### Asset Export

#### `export-assets.ts`

Exports assets from Figma files via REST API.

**Command:**
```bash
npm run export:assets
```

**Environment Variables:**
- `FIGMA_TOKEN`: API access token
- `FIGMA_FILE_KEY`: Target file identifier

**API Endpoints Used:**
- `GET /v1/files/:key`: Fetch file data
- `GET /v1/images/:key`: Export images

---

### File Key Extraction

#### `find-file-key.ts`

Extracts file key from Figma URLs.

**Usage:**
```typescript
import { findFileKey } from './scripts/find-file-key';

const url = 'https://www.figma.com/file/ABC123/Design-System';
const key = findFileKey(url); // Returns: 'ABC123'
```

**Supported URL Formats:**
- `figma.com/file/:key/:name`
- `figma.com/proto/:key/:name`
- `figma.com/design/:key/:name`

---

## Figma Plugin API

### Message Handling

#### UI Message Interface

```typescript
interface BootstrapMessage {
  type: 'bootstrap';
  bytes?: ArrayBuffer;
}

figma.ui.onmessage = async (msg: BootstrapMessage) => {
  if (msg.type === 'bootstrap' && msg.bytes) {
    await run(new Uint8Array(msg.bytes));
  }
};
```

### UI Configuration

```typescript
figma.showUI('<html><body></body></html>', {
  visible: false,  // Hidden UI
  width: 240,      // Default width
  height: 320      // Default height
});
```

---

## Type Definitions

### Core Types

```typescript
// Figma RGB color
interface RGB {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
}

// Line height configuration
interface LineHeight {
  unit: 'PIXELS' | 'PERCENT' | 'AUTO';
  value: number;
}

// Letter spacing configuration
interface LetterSpacing {
  unit: 'PIXELS' | 'PERCENT';
  value: number;
}

// Font name configuration
interface FontName {
  family: string;
  style: string;
}

// Layout grid configuration
interface LayoutGrid {
  pattern: 'ROWS' | 'COLUMNS' | 'GRID';
  sectionSize: number;
  color: RGBA;
  visible: boolean;
}

// Export settings
interface ExportSettings {
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF';
  constraint?: { type: 'SCALE' | 'WIDTH' | 'HEIGHT'; value: number };
  suffix?: string;
  contentsOnly?: boolean;
  useAbsoluteBounds?: boolean;
}
```

---

## Error Handling

### Common Error Scenarios

#### Font Loading Errors

```typescript
try {
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  // Create text nodes
} catch (error) {
  console.warn('Font not available, skipping text creation');
  // Continue without text
}
```

#### Invalid Color Values

```typescript
function safeHexToRgb(hex: string): RGB {
  try {
    return hexToRgb(hex);
  } catch {
    return { r: 0, g: 0, b: 0 }; // Fallback to black
  }
}
```

#### Missing Image Data

```typescript
if (imgBytes && imgBytes.length > 0) {
  // Use image
} else {
  // Use fallback solid color
  rect.fills = [{ type: 'SOLID', color: hexToRgb('#11D9E6') }];
}
```

---

## Performance Considerations

### Optimization Tips

1. **Batch Operations**
   ```typescript
   // Inefficient
   for (const item of items) {
     figma.createRectangle();
   }
   
   // Efficient
   const rectangles = items.map(() => figma.createRectangle());
   ```

2. **Async Operations**
   ```typescript
   // Load fonts once
   await Promise.all([
     figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
     figma.loadFontAsync({ family: 'Inter', style: 'Medium' })
   ]);
   ```

3. **Memory Management**
   ```typescript
   // Clear large objects
   let largeData = processData();
   // Use data...
   largeData = null; // Allow GC
   ```

---

## Version Compatibility

### Figma API Version
- **Current**: 1.0.0
- **Minimum**: 1.0.0

### Plugin Manifest
```json
{
  "api": "1.0.0",
  "editorType": ["figma", "figjam"]
}
```

### TypeScript Definitions
```json
{
  "@figma/plugin-typings": "^1.100.1"
}
```

---

## Examples

### Complete Plugin Usage

```typescript
// Basic usage
import './main';

// With custom logo
const logoResponse = await fetch('/logo.png');
const logoBuffer = await logoResponse.arrayBuffer();
const logoBytes = new Uint8Array(logoBuffer);

await run(logoBytes);
```

### Extending the Plugin

```typescript
// Add custom component
function createCustomComponent(): ComponentNode {
  const component = figma.createComponent();
  component.name = 'Custom/Component';
  // Configure...
  return component;
}

// Add to main flow
async function extendedRun() {
  await run();
  const custom = createCustomComponent();
  figma.currentPage.appendChild(custom);
}
```

### Integration with External Systems

```typescript
// Fetch tokens from API
async function fetchTokensFromAPI(): Promise<any> {
  const response = await fetch('https://api.example.com/tokens');
  return response.json();
}

// Apply external tokens
async function applyExternalTokens() {
  const tokens = await fetchTokensFromAPI();
  
  for (const [name, color] of Object.entries(tokens.colors)) {
    makePaintStyle(name, color as string);
  }
}
```

---

*For implementation details and source code, refer to the plugin source files.*
