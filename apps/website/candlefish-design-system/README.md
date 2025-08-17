# 🕯️ Candlefish Design System

**Refinement over disruption.** A complete design-to-code pipeline that keeps Figma and your application in perfect sync.

## 🎯 Overview

This design system provides:
- **Figma Plugin**: Generates complete brand system in Figma
- **Design Tokens**: Single source of truth for design decisions
- **Style Dictionary**: Transforms tokens to multiple platforms
- **Tailwind Preset**: Ready-to-use Tailwind configuration
- **Component Library**: Pre-built semantic components
- **CI/CD Pipeline**: Automated token updates and publishing

## 📁 Structure

```
candlefish-design-system/
├── packages/
│   ├── tokens/                    # Design tokens (source of truth)
│   │   ├── tokens/                # Token JSON files
│   │   ├── scripts/               # Build scripts
│   │   └── build/                 # Generated outputs
│   └── tailwind-preset/           # Tailwind configuration
└── .github/workflows/             # CI/CD automation
```

## 🚀 Quick Start

### 1. Install the Figma Plugin

```bash
cd ../candlefish-figma-starter
# Open Figma Desktop
# Plugins → Development → Import plugin from manifest...
# Select manifest.json
```

### 2. Generate Design System in Figma

1. Open a new Figma file
2. Run: **Plugins → Candlefish Starter Kit → Build**
3. Your complete design system generates in ~30 seconds

### 3. Use in Your Application

```bash
# Install packages
npm install -D tailwindcss @candlefish/tokens @candlefish/tailwind-preset

# Configure Tailwind
# tailwind.config.js
module.exports = {
  presets: [require('@candlefish/tailwind-preset')],
  content: ["./src/**/*.{js,jsx,ts,tsx}"]
};
```

## 📦 Packages

### @candlefish/tokens

Design tokens as JavaScript, CSS, and SCSS variables.

```javascript
// Import tokens directly
import * as tokens from '@candlefish/tokens';

// Use CSS variables
import '@candlefish/tokens/css';

// Use in SCSS
@import '@candlefish/tokens/scss';
```

### @candlefish/tailwind-preset

Pre-configured Tailwind theme with Candlefish design system.

```jsx
// Use utility classes
<div className="bg-warm-white text-charcoal">
  <h1 className="text-display">AI that refines</h1>
  <button className="btn-primary">Get Started</button>
</div>
```

## 🎨 Design Tokens

### Colors
- `charcoal` (#1A1A1A) - Primary text
- `warm-white` (#FAFAF8) - Backgrounds
- `amber-flame` (#FFB347) - Primary accent
- `deep-indigo` (#3A3A60) - Secondary
- `slate-gray` (#6B6B6B) - Borders
- `muted-sand` (#D8D3C4) - Tertiary

### Typography
- **Display**: Tiempos (serif) 72px
- **Heading**: Inter 28px semibold
- **Body**: Inter 16px regular
- **Caption**: Inter 12px medium

### Spacing
8pt grid system: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120, 160

### Components
Pre-built classes:
- `.btn-primary` - Amber button
- `.btn-secondary` - Charcoal button
- `.card-case` - Case study card
- `.text-display` - Display typography
- `.text-heading` - Heading typography
- `.text-body` - Body typography

## 🔄 Workflow

### Design → Code

1. **Update in Figma**
   - Modify designs in Figma
   - Export tokens using Tokens Studio plugin

2. **Update Tokens**
   ```bash
   # Replace token file
   cp ~/Downloads/tokens.json packages/tokens/tokens/tokens.candlefish.json
   
   # Rebuild
   npm run tokens:build
   ```

3. **Publish Updates**
   ```bash
   # Bump version
   npm version patch --workspace=@candlefish/tokens
   
   # Publish
   npm run publish:all
   ```

4. **Update Applications**
   ```bash
   npm update @candlefish/tokens @candlefish/tailwind-preset
   ```

## 🤖 Automation

### GitHub Actions

The CI/CD pipeline automatically:
- Builds tokens on push to main
- Publishes packages when versions change
- Creates GitHub releases
- Commits build artifacts

### Local Development

```bash
# Watch tokens for changes
npm run tokens:watch

# Build everything
npm run build

# Run tests
npm test
```

## 📝 Examples

### Hero Section
```jsx
export function Hero() {
  return (
    <section className="px-30 py-24 bg-warm-white">
      <h1 className="text-display text-charcoal">
        AI that refines, not disrupts.
      </h1>
      <p className="text-body text-charcoal/90 mt-4 max-w-3xl">
        We build modular tools that illuminate hidden efficiencies—
        simple, durable, and yours to keep.
      </p>
      <button className="btn-primary mt-6">
        See how refinement works →
      </button>
    </section>
  );
}
```

### Case Study Card
```jsx
export function CaseCard({ title, description, tags }) {
  return (
    <div className="card-case">
      <h3 className="text-heading text-charcoal">{title}</h3>
      <p className="text-body text-charcoal/80 mt-2">
        {description}
      </p>
      <div className="flex gap-2 mt-4">
        {tags.map(tag => (
          <span key={tag} className="text-caption bg-slate/10 px-3 py-1 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

## 🛠 Development

### Prerequisites
- Node.js 18+
- npm 9+
- Figma Desktop (for plugin)

### Setup
```bash
# Clone repository
git clone https://github.com/candlefish-ai/candlefish-design-system.git
cd candlefish-design-system

# Install dependencies
npm install

# Build packages
npm run build
```

### Project Structure
```
packages/tokens/
├── tokens/
│   └── tokens.candlefish.json    # Source tokens
├── scripts/
│   └── generate-tailwind-theme.js # Tailwind bridge
├── style-dictionary.config.js     # SD configuration
└── build/                         # Generated files
    ├── web/css/variables.css
    ├── web/scss/_tokens.scss
    ├── web/js/tokens.js
    └── tailwind/theme.js
```

## 📚 Documentation

- [Design Tokens Guide](./docs/tokens.md)
- [Figma Plugin Usage](./docs/figma-plugin.md)
- [Tailwind Integration](./docs/tailwind.md)
- [CI/CD Pipeline](./docs/ci-cd.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT © Candlefish AI

---

Built with refinement by [Candlefish AI](https://candlefish.ai) 🕯️
