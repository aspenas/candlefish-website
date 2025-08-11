# Candlefish AI Brand Guidelines 2025

### Illuminating Intelligence Through Design

---

## Executive Summary

Candlefish AI embodies the intersection of natural wisdom and artificial intelligence. Our brand represents clarity in complexity, using the metaphor of bioluminescence—the candlefish's natural ability to illuminate ocean depths—to communicate how we bring light to the vast, often opaque world of AI transformation.

This comprehensive guide ensures consistent brand application across all touchpoints, from digital interfaces to physical materials, maintaining our position as the premium choice for enterprise AI solutions.

---

## Table of Contents

1. [Brand Foundation](#brand-foundation)
2. [Visual Identity](#visual-identity)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Logo System](#logo-system)
6. [Photography & Imagery](#photography--imagery)
7. [Motion & Animation](#motion--animation)
8. [Digital Guidelines](#digital-guidelines)
9. [Print Guidelines](#print-guidelines)
10. [Voice & Tone](#voice--tone)
11. [Accessibility](#accessibility)
12. [Implementation](#implementation)

---

## Brand Foundation

### Mission

To illuminate the path to AI transformation by turning organizations' slowest business processes into their fastest competitive advantages through discrete, composable AI modules.

### Vision

A world where artificial intelligence enhances rather than replaces human intelligence, creating symbiotic relationships between natural wisdom and technological capability.

### Core Values

#### 1. **Illumination**

We bring clarity to complexity, making the incomprehensible accessible.

#### 2. **Depth**

Like the ocean, AI has unexplored depths. We navigate these waters with expertise and precision.

#### 3. **Natural Intelligence**

We believe the best AI solutions mirror natural systems—adaptive, efficient, and harmonious.

#### 4. **Modularity**

Our approach is discrete and composable, allowing for flexible, scalable solutions.

### Brand Personality (Locked)

- **Trustworthy**: Reliable partner for critical transformations
- **Precise**: Technical rigor, clear information hierarchy, measured motion
- **Innovative**: Forward-looking, leveraging modern standards (OKLCH, container queries)
- **Creative**: Bioluminescent inspiration and abstract tech motifs
- **Sophisticated**: Premium, minimal, confident restraint

---

## Visual Identity

### Design Principles

#### 1. **Minimalism with Purpose**

Every element serves a function. No decoration without intention.

#### 2. **High Contrast**

Clear differentiation between elements ensures accessibility and impact.

#### 3. **Bioluminescent Inspiration**

Subtle glows and light effects reference our candlefish namesake.

#### 4. **Technical Precision**

Grid-based layouts and mathematical proportions convey engineering excellence.

### Visual Language

Our visual language draws from:

- **Ocean depths**: Dark backgrounds with points of light
- **Neural networks**: Interconnected patterns and grids
- **Bioluminescence**: Organic light effects and glows
- **Technical diagrams**: Clean lines and precise geometry

---

## Color System

### Philosophy

Our color palette is intentionally minimal, focusing on the interplay between darkness and light—mirroring how the candlefish illuminates the ocean depths.

### Primary Palette

#### Candlefish Black

- **Hex**: #000000
- **RGB**: 0, 0, 0
- **OKLCH**: oklch(0% 0 0)
- **Usage**: Primary backgrounds, text on light surfaces

#### Candlefish Teal

- **Hex**: #00CED1
- **RGB**: 0, 206, 209
- **OKLCH**: oklch(50% 0.20 180)
- **Usage**: Primary accent, CTAs, highlights

#### Pure White

- **Hex**: #FFFFFF
- **RGB**: 255, 255, 255
- **OKLCH**: oklch(95% 0 0)
- **Usage**: Primary text on dark, light mode backgrounds

### Extended Teal Spectrum

For subtle variations and depth:

```scss
$teal-50:  oklch(95% 0.05 180);  // Nearly white with teal tint
$teal-100: oklch(90% 0.08 180);
$teal-200: oklch(80% 0.12 180);
$teal-300: oklch(70% 0.15 180);
$teal-400: oklch(60% 0.18 180);
$teal-500: oklch(50% 0.20 180);  // Primary
$teal-600: oklch(40% 0.18 180);
$teal-700: oklch(30% 0.15 180);
$teal-800: oklch(20% 0.12 180);
$teal-900: oklch(10% 0.08 180);
$teal-950: oklch(5% 0.05 180);   // Nearly black with teal tint
```

### Neutral Grays

For UI elements and text hierarchy:

```scss
$gray-50:  #fafafa;
$gray-100: #f4f4f5;
$gray-200: #e4e4e7;
$gray-300: #d4d4d8;
$gray-400: #a1a1aa;
$gray-500: #71717a;
$gray-600: #52525b;
$gray-700: #3f3f46;
$gray-800: #27272a;
$gray-900: #18181b;
$gray-950: #09090b;
```

### Semantic Colors

```scss
$success:     oklch(60% 0.20 142);  // Green
$warning:     oklch(70% 0.20 60);   // Amber
$error:       oklch(60% 0.25 25);   // Red
$information: oklch(60% 0.15 220);  // Blue
```

### Color Usage Guidelines

1. **70-20-10 Rule**
   - 70% Black/Dark backgrounds
   - 20% White/Light text
   - 10% Teal accents

2. **Contrast Requirements**
   - Text on background: minimum 7:1 ratio
   - Interactive elements: minimum 3:1 ratio

3. **Light Mode Adaptation**
   - Invert black/white while maintaining teal
   - Adjust opacity values for appropriate contrast

---

## Typography

### Type Philosophy

Clean, modern, and highly legible. Our typography choices reflect technical precision while maintaining approachability.

### Font Stack

#### Web (Sans + Mono)

```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI',
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

```css
font-family: 'Space Mono', 'SF Mono', 'Monaco', 'Consolas',
             'Courier New', monospace;
```

#### Corporate Docs (Email/Letters/Contracts)

```css
/* Installed fonts (US Graphics Berkeley family) */
font-family: 'USGraphics Berkeley', 'Times New Roman', serif;
```

```css
font-family: 'USGraphics Berkeley Mono', 'Courier New', monospace;
```

Licensing: Active Developer Font License (Desktop/Print + Website). Assets located at `/Users/patricksmith/candlefish-ai/Branding/cf-fonts`.

### Type Scale

Using a modular scale (1.250 ratio):

```scss
$text-xs:   0.75rem;   // 12px - Captions, labels
$text-sm:   0.875rem;  // 14px - Secondary text
$text-base: 1rem;      // 16px - Body text
$text-lg:   1.125rem;  // 18px - Large body
$text-xl:   1.25rem;   // 20px - Small headings
$text-2xl:  1.5rem;    // 24px - H4
$text-3xl:  1.875rem;  // 30px - H3
$text-4xl:  2.25rem;   // 36px - H2
$text-5xl:  3rem;      // 48px - H1
$text-6xl:  3.75rem;   // 60px - Display
$text-7xl:  4.5rem;    // 72px - Hero
```

### Font Weights

```scss
$font-light:     300;  // Display text, hero headings
$font-normal:    400;  // Body text
$font-medium:    500;  // Emphasis, buttons
$font-semibold:  600;  // Subheadings
$font-bold:      700;  // Special emphasis only
```

### Typography Guidelines

1. **Headlines**: Light weight (300) for elegance
2. **Body Text**: Normal weight (400) for readability
3. **Line Height**: 1.5-1.8 for optimal reading
4. **Letter Spacing**:
   - Headlines: -0.02em to -0.03em
   - Body: 0
   - Uppercase labels: 0.1em

### Special Typography

#### Validation Badge

```css
.badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 400;
}
```

---

## Logo System

### Logo Architecture

Our logo combines symbolic and typographic elements:

1. **Icon**: Abstract "C" mark representing a compass/navigation device
2. **Wordmark**: "CANDLEFISH" in clean, spaced capitals
3. **Tagline**: "Illuminating Intelligence" (when space permits)

### Logo Variations

#### Primary Horizontal

```
[C] CANDLEFISH
```

- Use when width > 200px
- Primary application for most contexts

#### Stacked

```
  [C]
CANDLEFISH
```

- Use when width < 200px or height > width
- Mobile applications, social media

#### Icon Only

```
[C]
```

- Use when width < 80px
- App icons, favicons, small spaces

### Logo Specifications

- **Minimum Size**:
  - Horizontal: 120px wide
  - Stacked: 80px wide
  - Icon: 32px

- **Clear Space**: Equal to the height of the "C" on all sides

- **Color Applications**:
  - Black on light backgrounds
  - White on dark backgrounds
  - Teal on black for special applications

### Deliverables

- SVG master icon + wordmark, mono, inverted, single-color, and clear-space diagram
- PNG exports @1x/@2x, and vector PDF for print
- Location: `public/logo/svg/`

### Logo Don'ts

- ❌ Don't stretch or distort
- ❌ Don't change colors outside approved palette
- ❌ Don't add effects (shadows, gradients)
- ❌ Don't place on busy backgrounds
- ❌ Don't recreate or modify

---

## Photography & Imagery

### Photography Style

Our photography emphasizes:

1. **Abstract Technology**: Circuit boards, fiber optics, server rooms
2. **Ocean/Water**: Deep sea imagery, bioluminescence, water surfaces
3. **Light Patterns**: Bokeh, light trails, laser grids
4. **Minimal Compositions**: Single subjects, negative space

### Image Treatment

- **Color Grading**: Cool tones, high contrast
- **Overlays**: Subtle teal color wash (10-20% opacity)
- **Crops**: Dramatic, focusing on details
- **Effects**: Slight blur on edges for depth

### Iconography

We use custom line icons with:

- 1.5px stroke weight
- 24x24px base grid
- Rounded corners (2px radius)
- Consistent visual weight

Common icons include:

- Neural networks
- Data flows
- Security shields
- Ocean/wave motifs
- Light/illumination symbols

---

## Motion & Animation

### Motion Principles

1. **Purposeful**: Every animation has a reason
2. **Smooth**: Ease-in-out for natural movement
3. **Subtle**: Enhance, don't distract
4. **Consistent**: Unified timing across experiences

### Animation Timing

```scss
$duration-instant: 50ms;
$duration-fast:    150ms;
$duration-normal:  300ms;
$duration-slow:    500ms;
$duration-slower:  700ms;
```

### Easing Functions

```scss
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
$ease-out:    cubic-bezier(0, 0, 0.2, 1);
$ease-in:     cubic-bezier(0.4, 0, 1, 1);
$ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Signature Animations

#### Bioluminescence Pulse

Subtle glow effect for interactive elements

```css
@keyframes bioluminescence {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 10px var(--teal)); }
  50% { filter: brightness(1.2) drop-shadow(0 0 20px var(--teal)); }
}
```

#### Neural Network Flow

Particle movement suggesting data/intelligence flow

```css
@keyframes neural-flow {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
```

---

## Digital Guidelines

### Web Implementation

#### Grid System

- 12-column grid
- 24px gutters
- Max width: 1400px
- Container padding: 24px mobile, 48px desktop

#### Breakpoints

```scss
$mobile:  640px;
$tablet:  768px;
$laptop:  1024px;
$desktop: 1280px;
$wide:    1536px;
```

#### Component Architecture

- Atomic design methodology
- Component-first approach
- Consistent spacing scale
- Accessibility-first development

### UI Components

#### Buttons

- **Primary**: Teal background, black text
- **Secondary**: Transparent, teal border
- **Ghost**: Transparent, white/black text
- **Hover**: Subtle lift + glow effect
- **Active**: Pressed appearance

#### Form Elements

- Minimal borders
- Focus states with teal glow
- Clear error/success states
- Adequate touch targets (44px minimum)

#### Cards

- Subtle glass morphism effect
- 1px border with low opacity
- Hover state with slight elevation
- Content padding: 24-32px

### Dark/Light Mode

Both modes maintain brand integrity:

#### Dark Mode (Default)

- Background: Pure black
- Surface: 5% white
- Text: White/gray hierarchy
- Accents: Teal remains constant

#### Light Mode

- Background: White
- Surface: 5% black
- Text: Black/gray hierarchy
- Accents: Teal remains constant

---

## Print Guidelines

### Color Specifications

#### CMYK Values

- Black: C0 M0 Y0 K100
- Teal: C100 M0 Y10 K20
- White: C0 M0 Y0 K0

#### Pantone

- Black: Black C
- Teal: Pantone 3125 C

### Paper Specifications

- Weight: 16pt minimum for business cards
- Finish: Matte or soft-touch
- Color: Bright white or deep black

### Special Finishes

- Spot UV on logo for subtle dimension
- Metallic teal foil for premium applications
- Embossing/debossing for tactile interest

---

## Voice & Tone

### Brand Voice Attributes

1. **Knowledgeable** without being condescending
2. **Innovative** without being inaccessible
3. **Professional** without being cold
4. **Confident** without being arrogant

### Tone Variations

#### For Executives

- Strategic focus
- ROI and business impact
- Transformation narratives

#### For Technical Audiences

- Precise specifications
- Implementation details
- Performance metrics

#### For General Business

- Clear benefits
- Relatable analogies
- Success stories

### Messaging Framework

#### Primary Message

"Illuminating the path to AI transformation"

#### Supporting Messages

- "Turn your slowest processes into your fastest advantages"
- "Discrete, composable AI modules for enterprise scale"
- "Where natural wisdom meets artificial intelligence"

### Writing Guidelines

1. **Active voice** over passive
2. **Concrete examples** over abstractions
3. **Benefits** before features
4. **Human** before technical
5. **Clear** over clever

---

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast

- Normal text: 7:1 minimum
- Large text: 4.5:1 minimum
- UI components: 3:1 minimum

#### Motion

- Respect `prefers-reduced-motion`
- Provide pause controls
- Avoid flashing (3Hz limit)

#### Navigation

- Keyboard accessible
- Clear focus indicators
- Skip links
- Logical tab order

#### Content

- Alt text for images
- Descriptive links
- Proper heading hierarchy
- Language declaration

### Testing Requirements

- Screen reader testing
- Keyboard navigation testing
- Color contrast validation
- Motion sensitivity testing

---

## Implementation

### Design Tokens

Our design system uses tokens for consistency:

```json
{
  "color": {
    "brand": {
      "black": { "value": "#000000" },
      "teal": {
        "value": "#00CED1",
        "oklch": "oklch(50% 0.20 180)"
      },
      "white": { "value": "#FFFFFF" }
    }
  },
  "spacing": {
    "xs": { "value": "0.5rem" },
    "sm": { "value": "0.75rem" },
    "md": { "value": "1rem" },
    "lg": { "value": "1.5rem" },
    "xl": { "value": "2rem" },
    "2xl": { "value": "3rem" },
    "3xl": { "value": "4rem" }
  },
  "motion": {
    "duration": {
      "fast": { "value": "150ms" },
      "normal": { "value": "300ms" },
      "slow": { "value": "500ms" }
    }
  }
}
```

### File Formats

#### Logo Files

- SVG (preferred for web)
- PNG (2x, 3x for retina)
- PDF (vector for print)

#### Color Formats

- HEX for web
- RGB for screen
- CMYK for print
- OKLCH for modern browsers

### Version Control

- Semantic versioning for updates
- Changelog maintenance
- Deprecation notices
- Migration guides

---

## Brand Evolution

Our brand is designed to evolve while maintaining core identity:

1. **Annual Review**: Assess market position and needs
2. **Iterative Updates**: Small refinements as needed
3. **Major Updates**: Only when strategically necessary
4. **Documentation**: All changes tracked and communicated

---

## Contact

For brand questions or asset requests:

**Brand Team**

- Email: <brand@candlefish.ai>
- Slack: #brand-guidelines
- Portal: brand.candlefish.ai

---

## Appendix

### Quick Reference

#### Primary Colors

- Black: #000000
- Teal: #00CED1
- White: #FFFFFF

#### Fonts

- Sans: System stack with Inter fallback
- Mono: Space Mono

#### Key Measurements

- Border radius: 8px (0.5rem)
- Base spacing: 16px (1rem)
- Max width: 1400px

#### Animation Timing

- Fast: 150ms
- Normal: 300ms
- Slow: 500ms

---

*Last Updated: August 2025*
*Version: 2.0.0*
