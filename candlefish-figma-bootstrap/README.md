# Candlefish Figma Plugin

A comprehensive Figma plugin that bootstraps the Candlefish brand design system directly within Figma, providing designers with a complete foundation of colors, typography, components, and brand assets.

## Overview

The Candlefish Figma Plugin automates the creation of a complete design system within Figma, establishing brand consistency and accelerating design workflows. It generates color styles, typography scales, reusable components, and brand assets in a single automated process.

## Features

### 🎨 Color System
- **Brand Colors**: Primary (#11D9E6), Ink (#0D1214), Surface (#082C32)
- **Neutral Scale**: Complete 9-step neutral palette (100-900)
- **Accent Colors**: Warning and success states
- **Color Variables**: Light and dark mode collections
- **Paint Styles**: Pre-configured color styles for consistent application

### 📝 Typography System
- **Type Scale**: H1, H2, H3, Body, Small text styles
- **Font**: Inter typeface with optimized weights
- **Line Heights**: Carefully tuned for readability
- **Letter Spacing**: Precision tracking values

### 🧩 Component Library
- **Logo Components**: Primary, Wordmark, Horizontal/Stacked lockups
- **Layout Components**: Grid containers and stacks
- **UI Components**: Buttons (Primary/Quiet), Cards
- **Export Settings**: Pre-configured SVG and PDF exports

### 📋 Page Structure
- **Cover Page**: Project overview
- **Brand Assets**: Logo variants and brand elements
- **Type & Color**: Typography and color documentation
- **Components**: Reusable UI components
- **Specimens**: Brand sheet with visual examples

## Installation

### Prerequisites
- Figma Desktop App (required for local plugin development)
- Node.js 18+ and npm
- AWS credentials configured (for Figma token retrieval)

### Setup Steps

1. **Clone the repository**
   ```bash
   cd /Users/patricksmith/candlefish-ai/candlefish-figma-bootstrap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Load in Figma Desktop**
   - Open Figma Desktop App
   - Go to Menu → Plugins → Development → Import plugin from manifest
   - Select the `plugin/manifest.json` file
   - The plugin will appear in your plugins menu

## Usage Guide

### Running the Plugin

1. **Open a Figma file** where you want to create the design system
2. **Run the plugin** from Plugins → Development → Candlefish Brand Bootstrap
3. **Wait for completion** - The plugin will:
   - Create all required pages
   - Generate color styles and variables
   - Create typography styles
   - Build component library
   - Set up brand specimens
4. **Success notification** appears when complete

### Generated Structure

```
Your Figma File
├── Cover
├── 01 Brand Assets
│   └── Logo variants (Primary, Wordmark, Lockups)
├── 02 Type & Color
│   ├── Color styles
│   └── Typography styles
├── 03 Components
│   ├── Grid/Container
│   ├── Grid/Stack
│   ├── Card/Base
│   ├── Button/Primary
│   └── Button/Quiet
└── 04 Specimens
    └── Brand Sheet (Visual examples)
```

### Working with Generated Assets

#### Using Color Styles
1. Select any object
2. Open Fill/Stroke panels
3. Choose from Brand/, Neutral/, or Accent/ color styles

#### Applying Typography
1. Create or select text
2. Open Text panel
3. Apply Type/H1, Type/Body, etc. styles

#### Using Components
1. Open Assets panel
2. Drag components onto canvas
3. Customize using variant properties

## Configuration

### Customizing Brand Colors

Edit the color values in `plugin/src/main.ts`:

```typescript
// Core brand colors
makePaintStyle('Brand/Primary', '#11D9E6');  // Your primary color
makePaintStyle('Brand/Ink', '#0D1214');      // Your text color
makePaintStyle('Brand/Surface', '#082C32');  // Your surface color
```

### Modifying Typography Scale

Adjust font sizes and weights in the `createTypographyStyles()` function:

```typescript
const styles = [
  { name: 'Type/H1', fontSize: 40, lineHeight: 48, fontWeight: 'Medium' },
  // Add or modify styles here
];
```

### Adding New Components

Create additional components in the `createBaseComponents()` function:

```typescript
// Example: Add a new input component
const input = figma.createComponent();
input.name = 'Form/Input';
input.resize(320, 44);
// Configure properties...
```

## Troubleshooting

### Common Issues

#### Plugin doesn't appear in Figma
- Ensure you're using Figma Desktop App (not web version)
- Check that manifest.json is valid
- Rebuild the plugin with `npm run build`

#### Fonts not loading
- Install Inter font locally from [Google Fonts](https://fonts.google.com/specimen/Inter)
- Restart Figma after font installation

#### Colors appear incorrect
- Verify hex values in the source code
- Check Figma's color profile settings
- Ensure RGB color space is selected

#### Build errors
```bash
# Clean and rebuild
rm -rf plugin/build
npm run build
```

### Debug Mode

Enable console logging by modifying the plugin:

```typescript
// Add at the top of run() function
console.log('Starting Candlefish bootstrap...');
// Add throughout for debugging
console.log('Creating color styles...');
```

View logs in Figma: Plugins → Development → Open Console

## Scripts

### Available Commands

```bash
# Build plugin for production
npm run build

# Watch mode for development
npm run dev

# Generate design tokens
npm run tokens

# Export assets from Figma
npm run export:assets

# Fetch Figma API token from AWS
npm run fetch:token:cli

# Type checking
npm run type-check
```

### Token Generation

Generate JSON token files for use in other applications:

```bash
npm run tokens
# Output: dist/tokens/color.json, dist/tokens/type.json
```

## API Integration

### Using with Figma API

The plugin includes scripts for API integration:

```javascript
// scripts/export-assets.ts
// Exports assets from Figma files via API

// scripts/find-file-key.ts  
// Locates Figma file keys from URLs

// scripts/generate-tokens.ts
// Creates design token JSON files
```

### AWS Integration

Fetches Figma API tokens securely from AWS Secrets Manager:

```bash
npm run fetch:token:cli
# Uses: /Users/patricksmith/candlefish-ai/scripts/fetch-figma-token.sh
```

## Contributing

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** to plugin source
3. **Test locally** in Figma Desktop
4. **Build and verify**
   ```bash
   npm run build
   npm run type-check
   ```

5. **Submit pull request** with description

### Code Style

- TypeScript with strict type checking
- Consistent naming: PascalCase for components, camelCase for functions
- Comment complex logic
- Follow existing patterns

### Testing Guidelines

Test the plugin with:
- Empty Figma files
- Files with existing content
- Different color profiles
- Various screen resolutions

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `/docs` folder for detailed guides
- **Team**: Contact the design system team

## Credits

Created by the Candlefish AI team for streamlining brand design workflows.

---

*Last updated: August 2025*
