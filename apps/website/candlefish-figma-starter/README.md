# Candlefish Starter Kit (Figma Plugin)

A production-ready Figma plugin that generates a complete design system with the Candlefish brand identity. One click creates everything: color variables, typography styles, components, and responsive layouts.

## 🚀 What It Creates

### Complete Design System
- **6 Brand Pages**: Cover, Brand System, Components, Homepage, Mobile, Documentation
- **Color Variables**: Full semantic color system with 50+ color tokens
- **Typography Styles**: 11 text styles from Display to Caption
- **Components Library**: Buttons, Cards, Forms, Navigation with all states
- **Layout Templates**: Desktop (1440px) and Mobile (375px) responsive layouts
- **Effect Styles**: Professional shadow and blur systems

### Design Tokens Export
- JSON format for design tools integration
- CSS custom properties for web development
- Tailwind configuration for utility-first CSS
- Full documentation of the design system

## 📦 Installation

### Method 1: Import Plugin (Recommended)
1. Download this folder to your computer
2. In Figma Desktop: **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file from this folder
4. The plugin is now installed and ready to use

### Method 2: Development Mode
1. Open Figma Desktop app
2. Go to **Plugins** → **Development** → **New Plugin...**
3. Choose "Figma design" and click **Next**
4. Choose "Empty" and give it a name
5. Replace the generated files with the files from this folder
6. Save and run the plugin

## 🎨 Usage

### Quick Start
1. Open a **new blank Figma file** (important: don't run in existing files)
2. Go to **Plugins** → **Candlefish Starter Kit**
3. Click **Build Candlefish Kit** or press the play button
4. Wait ~30 seconds for the complete system to generate
5. Your design system is ready!

### What Gets Generated

#### 🎨 Brand System Page
- **Color Palette**: 6 primary brand colors with documentation
- **Typography Scale**: Complete type system with samples
- **Spacing System**: 8pt grid with 16 spacing tokens
- **Effect Styles**: Shadows and blurs for depth

#### 🧩 Components Page
- **Buttons**: Primary, Secondary, Ghost variants in 3 sizes
- **Cards**: Case study cards with 3 style variants
- **Form Elements**: Inputs, selects, textareas with states
- **Navigation**: Header and footer components
- **Feedback**: Toasts and modals

#### 🖥 Homepage Layout
- **Hero Section**: Full-width hero with CTA
- **Features Grid**: 3-column feature layout
- **Case Studies**: Card-based project showcase
- **CTA Section**: Conversion-focused closing section

#### 📱 Mobile Frames
- **Mobile Hero**: Responsive hero for 375px screens
- **Mobile Features**: Stacked feature list
- **Mobile Navigation**: Hamburger menu system

### Export Design Tokens
1. Run the plugin with **Export Tokens** command
2. Choose export format:
   - `tokens.json` - Design tokens for tools
   - `variables.css` - CSS custom properties
   - `tailwind.config.js` - Tailwind theme
3. Click download to save the file

## 🛠 Features

### Smart Font Handling
The plugin intelligently handles font availability:
- **Primary**: Tiempos (serif) → Falls back to Georgia
- **Secondary**: Inter (sans) → Falls back to system fonts
- **Monospace**: SF Mono → Falls back to Monaco/Consolas

### Component States
All interactive components include:
- **Default** state
- **Hover** state (opacity: 0.9)
- **Disabled** state (opacity: 0.5)
- **Focus** state for inputs

### Responsive Design
- **Desktop**: 1440px width with 12-column grid
- **Tablet**: 768px width with 8-column grid
- **Mobile**: 375px width with 4-column grid
- **Spacing**: Consistent 8pt grid system

### Color System
```javascript
{
  charcoal: '#1A1A1A',    // Primary text & UI
  warmWhite: '#FAFAF8',   // Backgrounds
  amberFlame: '#FFB347',  // Primary accent
  deepIndigo: '#3A3A60',  // Secondary
  slateGray: '#6B6B6B',   // Borders & subtle
  mutedSand: '#D8D3C4'    // Tertiary
}
```

### Typography Scale
```javascript
Display: 72px / Bold
Heading 1: 48px / Bold
Heading 2: 32px / Semibold
Heading 3: 24px / Medium
Body: 16px / Regular
Caption: 12px / Regular
```

## 🔧 Customization

### Modify Colors
Edit the `colors` object in `code.js`:
```javascript
const colors = {
  charcoal: '#1A1A1A',
  warmWhite: '#FAFAF8',
  // Add or modify colors here
};
```

### Adjust Typography
Modify the `textStyles` array:
```javascript
const textStyles = [
  { name: 'Display', font: 'YourFont', size: 72, weight: 'Bold' },
  // Add or modify styles
];
```

### Change Grid System
Update the `addGrid` function:
```javascript
function addGrid(node, cols = 12, gutter = 24, margin = 120) {
  // Modify grid parameters
}
```

## 📝 Commands

The plugin supports multiple commands through the menu:

- **Build Complete System** - Generates everything
- **Export Tokens** - Export design tokens only
- **Documentation** - View usage guide

## 🐛 Troubleshooting

### "Font not found" warnings
This is normal - the plugin automatically uses fallback fonts. The design system will still generate correctly.

### Plugin doesn't appear in menu
1. Make sure you're using Figma Desktop (not browser)
2. Check **Plugins** → **Development** → **"Use Developer Mode"** is checked
3. Try restarting Figma

### Generation seems stuck
1. Check the Figma console for errors (**Plugins** → **Development** → **Open Console**)
2. Try with a smaller configuration first
3. Make sure you're in a new file, not an existing design file

### Styles already exist error
Run the plugin in a new, empty Figma file. The plugin creates many styles and variables that may conflict with existing ones.

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Complete Candlefish brand system
- 6 pages, 50+ components
- Design token export
- Font fallback system

### Roadmap
- v1.1.0: Dark mode support
- v1.2.0: Animation presets
- v1.3.0: Icon library integration
- v2.0.0: Multi-brand support

## 📄 License

Copyright (c) 2025 Candlefish AI. All rights reserved.

This plugin is proprietary software. Unauthorized copying, modification, or distribution is strictly prohibited.

## 🤝 Support

For issues, questions, or feature requests:
- Email: patrick@candlefish.ai
- Documentation: [candlefish.ai/figma-plugin](https://candlefish.ai/figma-plugin)

---

Built with refinement by Candlefish AI 🕯️
