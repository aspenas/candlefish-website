# @candlefish/tailwind-preset

Tailwind CSS preset that extends your configuration with the Candlefish design system.

## Installation

```bash
npm install -D tailwindcss @candlefish/tokens @candlefish/tailwind-preset
```

## Usage

Add the preset to your `tailwind.config.js`:

```javascript
module.exports = {
  presets: [require('@candlefish/tailwind-preset')],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}"
  ]
};
```

## What's Included

### Colors
- `charcoal` - Primary text (#1A1A1A)
- `warm-white` - Backgrounds (#FAFAF8) 
- `amber-flame` - Primary accent (#FFB347)
- `indigo-deep` - Secondary (#3A3A60)
- `slate` - Borders (#6B6B6B)
- `sand-muted` - Tertiary (#D8D3C4)

### Typography
- Font families: `font-display`, `font-sans`, `font-mono`
- Font sizes: `text-xs` through `text-8xl`
- Semantic sizes: `text-display`, `text-heading`, `text-body`, `text-caption`

### Spacing
Comprehensive spacing scale from `0` to `40` (0px to 160px)

### Components
Pre-built component classes:
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.card-case` - Case study card
- `.text-display` - Display text style
- `.text-heading` - Heading text style
- `.text-body` - Body text style
- `.text-caption` - Caption text style

## Examples

### Button
```jsx
<button className="btn-primary">
  Get Started →
</button>
```

### Hero Section
```jsx
<section className="px-30 py-24 bg-warm-white">
  <h1 className="text-display text-charcoal">
    AI that refines, not disrupts.
  </h1>
  <p className="text-body text-charcoal opacity-90 mt-4">
    We build modular tools that illuminate hidden efficiencies.
  </p>
  <button className="btn-primary mt-6">
    See how refinement works →
  </button>
</section>
```

### Card
```jsx
<div className="card-case">
  <h3 className="text-heading">Project Title</h3>
  <p className="text-body opacity-80">
    Description of the project and outcomes.
  </p>
</div>
```

## License

MIT © Candlefish AI
