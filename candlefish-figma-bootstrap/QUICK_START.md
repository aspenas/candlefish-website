# Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Plugin (One Command)

```bash
./install.sh
```

This script will:
- ✅ Check dependencies
- ✅ Install packages
- ✅ Build the plugin
- ✅ Generate tokens
- ✅ Provide next steps

### 2. Load in Figma

1. Open **Figma Desktop App**
2. Menu → **Plugins** → **Development** → **Import plugin from manifest**
3. Select `/candlefish-figma-bootstrap/plugin/manifest.json`
4. Plugin appears as "**Candlefish Brand Bootstrap**"

### 3. Run Plugin

1. Open any Figma file
2. **Plugins** → **Development** → **Candlefish Brand Bootstrap**
3. Wait ~5 seconds
4. ✅ Complete design system generated!

## 📦 What You Get

### Instant Creation
- **14 Color Styles** - Brand, neutral, accent colors
- **5 Typography Styles** - H1, H2, H3, Body, Small
- **5 UI Components** - Buttons, cards, containers
- **4 Logo Variants** - Primary, wordmark, lockups
- **4 Organized Pages** - Assets, colors, components, specimens
- **20+ Variables** - Light/dark mode ready

### Generated Structure

```
Your Figma File
├── 📄 Cover
├── 🎨 01 Brand Assets (Logos)
├── 🎯 02 Type & Color (Styles)  
├── 🧩 03 Components (UI Kit)
└── 📊 04 Specimens (Examples)
```

## 🎨 Core Colors

| Name | Hex | Usage |
|------|-----|--------|
| **Primary** | `#11D9E6` | CTAs, highlights |
| **Ink** | `#0D1214` | Primary text |
| **Surface** | `#082C32` | Dark backgrounds |

## 📝 Typography Scale

| Style | Size | Weight | Usage |
|-------|------|--------|--------|
| **H1** | 40px | Medium | Page titles |
| **H2** | 28px | Medium | Sections |
| **H3** | 20px | Medium | Subsections |
| **Body** | 16px | Regular | Content |
| **Small** | 14px | Regular | Captions |

## 🧩 Components

### Available Now
- **Button/Primary** - Main CTAs
- **Button/Quiet** - Secondary actions
- **Card/Base** - Content containers
- **Grid/Container** - Layout wrapper
- **Grid/Stack** - Content stacking

### Using Components
1. Open **Assets** panel (Alt/Option + 2)
2. Drag components to canvas
3. Customize as needed

## ⚡ Common Tasks

### Change Brand Colors

Edit in `plugin/src/main.ts`:

```typescript
makePaintStyle('Brand/Primary', '#YourColor');
makePaintStyle('Brand/Ink', '#YourTextColor');
```

Then rebuild: `npm run build`

### Generate Design Tokens

```bash
npm run tokens
```

Output: `dist/tokens/color.json`, `dist/tokens/type.json`

### Export Assets from Figma

```bash
npm run export:assets
```

Requires: `FIGMA_TOKEN` environment variable

## 🛠 Development

### Watch Mode

```bash
npm run dev
```

Auto-rebuilds on file changes.

### Type Checking

```bash
npm run type-check
```

### Build Scripts

```bash
npm run build:scripts
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `plugin/manifest.json` | Plugin configuration |
| `plugin/src/main.ts` | Main plugin code |
| `package.json` | Dependencies & scripts |
| `scripts/generate-tokens.ts` | Token generation |

## 🐛 Troubleshooting

### Plugin Not Appearing
- Use Figma Desktop (not web)
- Check manifest path is correct
- Rebuild: `npm run build`

### Fonts Not Loading
- Install [Inter font](https://fonts.google.com/specimen/Inter)
- Restart Figma

### Build Errors
```bash
rm -rf plugin/build
npm run build
```

## 🔗 Quick Links

- **Full Documentation**: [README.md](README.md)
- **Developer Guide**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **Design System**: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- **API Reference**: [API.md](API.md)
- **Component Gallery**: [docs/COMPONENT_GALLERY.md](docs/COMPONENT_GALLERY.md)

## 💡 Pro Tips

1. **Keyboard Shortcuts**
   - Assets Panel: `Alt/Option + 2`
   - Run Plugin: `Cmd/Ctrl + /` then type plugin name

2. **Organize Variants**
   - Plugin creates variant sets automatically
   - Switch variants in right panel

3. **Export Settings**
   - All logos have SVG + PDF exports configured
   - Right-click → Export to use

4. **Color Variables**
   - Variables work with modes (light/dark)
   - Find in right panel → Local variables

5. **Quick Iteration**
   - Keep `npm run dev` running
   - Changes apply on next plugin run

## 📞 Support

- **Issues**: GitHub Issues
- **Email**: design-system@candlefish.ai
- **Docs**: `/docs` folder

---

**Ready to design! 🎨** Run the plugin and start creating with the Candlefish Design System.
