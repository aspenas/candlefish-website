// Candlefish Starter Kit – Production-Ready Design System Generator
// Creates comprehensive brand system with variables, styles, components, and layouts
// Supports font fallbacks, error recovery, and design token export

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function loadFontSafe(family, style) {
  const fallbacks = {
    'Tiempos': ['Georgia', 'Times New Roman', 'serif'],
    'Inter': ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    'SF Mono': ['Monaco', 'Consolas', 'Courier New', 'monospace']
  };

  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (e) {
    console.log(`Font ${family} ${style} not available, trying fallbacks...`);
    const fallbackList = fallbacks[family] || ['Inter'];

    for (const fallbackFamily of fallbackList) {
      try {
        await figma.loadFontAsync({ family: fallbackFamily, style });
        console.log(`Using fallback font: ${fallbackFamily}`);
        return { family: fallbackFamily, style };
      } catch (err) {
        continue;
      }
    }

    // Last resort: Inter Regular (always available in Figma)
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    return { family: 'Inter', style: 'Regular' };
  }
}

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Generate color variations for semantic palettes
function generateColorScale(baseHex, name) {
  const base = hexToRGB(baseHex);
  const scales = {
    50: { l: 0.95, s: 0.3 },
    100: { l: 0.9, s: 0.5 },
    200: { l: 0.8, s: 0.6 },
    300: { l: 0.7, s: 0.7 },
    400: { l: 0.6, s: 0.8 },
    500: { l: 0.5, s: 1 }, // base
    600: { l: 0.4, s: 1 },
    700: { l: 0.3, s: 0.9 },
    800: { l: 0.2, s: 0.8 },
    900: { l: 0.1, s: 0.7 },
    950: { l: 0.05, s: 0.6 }
  };

  const colors = {};
  Object.entries(scales).forEach(([key, { l, s }]) => {
    const adjusted = {
      r: base.r * s + (1 - s) * l,
      g: base.g * s + (1 - s) * l,
      b: base.b * s + (1 - s) * l
    };
    colors[`${name}-${key}`] = rgbToHex(adjusted.r, adjusted.g, adjusted.b);
  });

  return colors;
}

// ============================================================================
// STYLE CREATORS
// ============================================================================

function addPaintStyle(name, hex) {
  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = [{ type: 'SOLID', color: hexToRGB(hex) }];
  return style;
}

async function addTextStyle(name, font, size, lineHeight, weight = 'Regular', letterSpacing = 0) {
  const style = figma.createTextStyle();
  style.name = name;
  const loaded = await loadFontSafe(font, weight);
  style.fontName = loaded;
  style.fontSize = size;
  style.lineHeight = { unit: 'PIXELS', value: lineHeight };
  style.letterSpacing = { unit: 'PERCENT', value: letterSpacing };
  style.textDecoration = 'NONE';
  return style;
}

function addEffectStyle(name, effects) {
  const style = figma.createEffectStyle();
  style.name = name;
  style.effects = effects;
  return style;
}

// ============================================================================
// COMPONENT BUILDERS
// ============================================================================

function setFill(node, hex) {
  node.fills = [{ type: 'SOLID', color: hexToRGB(hex) }];
}

function setStroke(node, hex, weight = 1) {
  node.strokes = [{ type: 'SOLID', color: hexToRGB(hex) }];
  node.strokeWeight = weight;
}

async function makeButton(name, bgHex, textHex, fontFamily = 'Inter', variant = 'primary', size = 'medium') {
  const sizes = {
    small: { width: 120, height: 32, fontSize: 12, padding: 16 },
    medium: { width: 160, height: 40, fontSize: 14, padding: 20 },
    large: { width: 200, height: 48, fontSize: 16, padding: 24 }
  };

  const config = sizes[size];
  const frame = figma.createFrame();
  frame.name = `Button/${variant}/${size}`;
  frame.resize(config.width, config.height);
  frame.cornerRadius = 8;
  frame.layoutMode = 'HORIZONTAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisAlignItems = 'CENTER';
  frame.primaryAxisAlignItems = 'CENTER';
  frame.paddingLeft = frame.paddingRight = config.padding;
  frame.paddingTop = frame.paddingBottom = config.padding / 2;

  setFill(frame, bgHex);

  const text = figma.createText();
  const loaded = await loadFontSafe(fontFamily, 'Medium');
  text.fontName = loaded;
  text.characters = variant === 'primary' ? 'Get Started →' : 'Learn More';
  text.fontSize = config.fontSize;
  text.textAlignHorizontal = 'CENTER';
  text.textAlignVertical = 'CENTER';
  setFill(text, textHex);

  frame.appendChild(text);

  // Add hover state variant
  const hoverFrame = frame.clone();
  hoverFrame.name = `Button/${variant}/${size}/hover`;
  hoverFrame.opacity = 0.9;

  // Add disabled state variant
  const disabledFrame = frame.clone();
  disabledFrame.name = `Button/${variant}/${size}/disabled`;
  disabledFrame.opacity = 0.5;

  return { default: frame, hover: hoverFrame, disabled: disabledFrame };
}

async function makeCaseCard(bgHex, borderHex, contentHex) {
  const card = figma.createFrame();
  card.name = 'Case Study Card';
  card.resize(380, 320);
  card.cornerRadius = 16;
  card.layoutMode = 'VERTICAL';
  card.itemSpacing = 16;
  card.paddingLeft = card.paddingRight = 32;
  card.paddingTop = card.paddingBottom = 32;

  setFill(card, bgHex);
  setStroke(card, borderHex);

  // Add shadow effect
  card.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 16,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];

  // Image placeholder
  const imageFrame = figma.createFrame();
  imageFrame.name = 'Image';
  imageFrame.resize(316, 180);
  imageFrame.cornerRadius = 8;
  setFill(imageFrame, '#E5E5E5');

  // Title
  const title = figma.createText();
  title.fontName = await loadFontSafe('Inter', 'Semibold');
  title.fontSize = 20;
  title.characters = 'Project Title';
  title.lineHeight = { unit: 'PIXELS', value: 28 };
  setFill(title, contentHex);

  // Description
  const desc = figma.createText();
  desc.fontName = await loadFontSafe('Inter', 'Regular');
  desc.fontSize = 14;
  desc.characters = 'A brief description of the project outcomes and the modular system implemented.';
  desc.lineHeight = { unit: 'PIXELS', value: 20 };
  desc.opacity = 0.8;
  setFill(desc, contentHex);

  // Tags
  const tagFrame = figma.createFrame();
  tagFrame.name = 'Tags';
  tagFrame.layoutMode = 'HORIZONTAL';
  tagFrame.itemSpacing = 8;
  tagFrame.counterAxisSizingMode = 'AUTO';

  const tags = ['AI Integration', 'Workflow', 'Automation'];
  for (const tagText of tags) {
    const tag = figma.createFrame();
    tag.layoutMode = 'HORIZONTAL';
    tag.paddingLeft = tag.paddingRight = 12;
    tag.paddingTop = tag.paddingBottom = 4;
    tag.cornerRadius = 12;
    tag.primaryAxisSizingMode = 'AUTO';
    tag.counterAxisSizingMode = 'AUTO';
    setFill(tag, '#F0F0F0');

    const tagLabel = figma.createText();
    tagLabel.fontName = await loadFontSafe('Inter', 'Medium');
    tagLabel.fontSize = 11;
    tagLabel.characters = tagText;
    setFill(tagLabel, '#666666');

    tag.appendChild(tagLabel);
    tagFrame.appendChild(tag);
  }

  card.appendChild(imageFrame);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(tagFrame);

  return card;
}

function addGrid(node, cols = 12, gutter = 24, margin = 120) {
  node.layoutGrids = [{
    pattern: 'COLUMNS',
    alignment: 'STRETCH',
    gutterSize: gutter,
    count: cols,
    sectionSize: 100,
    offset: margin
  }];
}

function createFrame(name, width = 1440, height = 900, x = 0, y = 0) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.x = x;
  frame.y = y;
  frame.clipsContent = false;
  addGrid(frame);
  return frame;
}

// ============================================================================
// PAGE BUILDERS
// ============================================================================

function ensurePage(name) {
  const existing = figma.root.children.find(p => p.name === name);
  if (existing && existing.type === 'PAGE') return existing;
  const page = figma.createPage();
  page.name = name;
  return page;
}

async function buildBrandSystem(colors) {
  const brandPage = ensurePage('🎨 Brand System');
  figma.currentPage = brandPage;

  // Color Palette Section
  const colorFrame = createFrame('Color Palette', 1440, 800, 0, 0);
  colorFrame.layoutMode = 'VERTICAL';
  colorFrame.itemSpacing = 48;
  colorFrame.paddingTop = 80;
  colorFrame.paddingLeft = colorFrame.paddingRight = 120;

  // Primary Colors
  const primaryRow = figma.createFrame();
  primaryRow.name = 'Primary Colors';
  primaryRow.layoutMode = 'HORIZONTAL';
  primaryRow.itemSpacing = 24;
  primaryRow.counterAxisSizingMode = 'AUTO';

  const primaryColors = [
    { name: 'Charcoal', hex: colors.charcoal, desc: 'Primary text & UI' },
    { name: 'Warm White', hex: colors.warmWhite, desc: 'Background' },
    { name: 'Amber Flame', hex: colors.amberFlame, desc: 'Primary accent' },
    { name: 'Deep Indigo', hex: colors.deepIndigo, desc: 'Secondary' },
    { name: 'Slate Gray', hex: colors.slateGray, desc: 'Borders & subtle' },
    { name: 'Muted Sand', hex: colors.mutedSand, desc: 'Tertiary' }
  ];

  for (const color of primaryColors) {
    const colorCard = figma.createFrame();
    colorCard.name = color.name;
    colorCard.resize(200, 240);
    colorCard.layoutMode = 'VERTICAL';
    colorCard.cornerRadius = 12;

    const swatch = figma.createFrame();
    swatch.resize(200, 160);
    swatch.cornerRadius = 8;
    setFill(swatch, color.hex);

    const label = figma.createText();
    label.fontName = await loadFontSafe('Inter', 'Medium');
    label.fontSize = 14;
    label.characters = color.name;
    label.y = 170;

    const hex = figma.createText();
    hex.fontName = await loadFontSafe('SF Mono', 'Regular');
    hex.fontSize = 12;
    hex.characters = color.hex.toUpperCase();
    hex.opacity = 0.6;
    hex.y = 190;

    const desc = figma.createText();
    desc.fontName = await loadFontSafe('Inter', 'Regular');
    desc.fontSize = 11;
    desc.characters = color.desc;
    desc.opacity = 0.5;
    desc.y = 210;

    colorCard.appendChild(swatch);
    colorCard.appendChild(label);
    colorCard.appendChild(hex);
    colorCard.appendChild(desc);
    primaryRow.appendChild(colorCard);
  }

  colorFrame.appendChild(primaryRow);

  // Typography Section
  const typeFrame = createFrame('Typography', 1440, 600, 0, 850);
  typeFrame.layoutMode = 'VERTICAL';
  typeFrame.itemSpacing = 32;
  typeFrame.paddingTop = 80;
  typeFrame.paddingLeft = typeFrame.paddingRight = 120;

  const typeStyles = [
    { name: 'Display', font: 'Tiempos', size: 72, weight: 'Bold', sample: 'Refinement over disruption' },
    { name: 'Heading 1', font: 'Tiempos', size: 48, weight: 'Bold', sample: 'AI that illuminates' },
    { name: 'Heading 2', font: 'Inter', size: 32, weight: 'Semibold', sample: 'Modular solutions' },
    { name: 'Heading 3', font: 'Inter', size: 24, weight: 'Medium', sample: 'Built to last' },
    { name: 'Body', font: 'Inter', size: 16, weight: 'Regular', sample: 'We build sharp, focused tools that reveal hidden efficiencies.' },
    { name: 'Caption', font: 'Inter', size: 12, weight: 'Regular', sample: 'Small text for annotations and metadata' }
  ];

  for (const style of typeStyles) {
    const sample = figma.createText();
    sample.fontName = await loadFontSafe(style.font, style.weight);
    sample.fontSize = style.size;
    sample.characters = style.sample;
    sample.lineHeight = { unit: 'PIXELS', value: style.size * 1.4 };
    typeFrame.appendChild(sample);
  }

  return brandPage;
}

async function buildComponents(colors) {
  const compPage = ensurePage('🧩 Components');
  figma.currentPage = compPage;

  // Buttons Section
  const buttonFrame = createFrame('Buttons', 1440, 400, 0, 0);
  buttonFrame.layoutMode = 'VERTICAL';
  buttonFrame.itemSpacing = 32;
  buttonFrame.paddingTop = 60;
  buttonFrame.paddingLeft = 120;

  const buttonRow = figma.createFrame();
  buttonRow.layoutMode = 'HORIZONTAL';
  buttonRow.itemSpacing = 24;
  buttonRow.counterAxisSizingMode = 'AUTO';

  // Create button variants
  const primaryBtns = await makeButton('Primary', colors.amberFlame, colors.charcoal, 'Inter', 'primary', 'medium');
  const secondaryBtns = await makeButton('Secondary', colors.charcoal, colors.warmWhite, 'Inter', 'secondary', 'medium');
  const ghostBtns = await makeButton('Ghost', 'transparent', colors.charcoal, 'Inter', 'ghost', 'medium');

  buttonRow.appendChild(primaryBtns.default);
  buttonRow.appendChild(secondaryBtns.default);
  buttonRow.appendChild(ghostBtns.default);
  buttonFrame.appendChild(buttonRow);

  // Cards Section
  const cardFrame = createFrame('Cards', 1440, 500, 0, 450);
  cardFrame.layoutMode = 'HORIZONTAL';
  cardFrame.itemSpacing = 32;
  cardFrame.paddingTop = 60;
  cardFrame.paddingLeft = 120;

  const card1 = await makeCaseCard(colors.warmWhite, colors.slateGray, colors.charcoal);
  const card2 = await makeCaseCard('#FFFFFF', colors.amberFlame, colors.charcoal);
  const card3 = await makeCaseCard(colors.mutedSand, 'transparent', colors.charcoal);

  cardFrame.appendChild(card1);
  cardFrame.appendChild(card2);
  cardFrame.appendChild(card3);

  // Form Elements
  const formFrame = createFrame('Form Elements', 1440, 400, 0, 1000);
  formFrame.layoutMode = 'VERTICAL';
  formFrame.itemSpacing = 24;
  formFrame.paddingTop = 60;
  formFrame.paddingLeft = 120;

  // Input field
  const input = figma.createFrame();
  input.name = 'Input';
  input.resize(320, 48);
  input.cornerRadius = 8;
  input.layoutMode = 'HORIZONTAL';
  input.paddingLeft = 16;
  input.counterAxisAlignItems = 'CENTER';
  setFill(input, '#FFFFFF');
  setStroke(input, colors.slateGray);

  const placeholder = figma.createText();
  placeholder.fontName = await loadFontSafe('Inter', 'Regular');
  placeholder.fontSize = 14;
  placeholder.characters = 'Enter your email';
  placeholder.opacity = 0.5;
  input.appendChild(placeholder);

  formFrame.appendChild(input);

  return compPage;
}

async function buildHomepage(colors) {
  const homePage = ensurePage('🖥 Homepage Layout');
  figma.currentPage = homePage;

  // Hero Section
  const hero = createFrame('Hero Section', 1440, 720, 0, 0);
  hero.layoutMode = 'VERTICAL';
  hero.itemSpacing = 32;
  hero.paddingTop = 160;
  hero.paddingLeft = hero.paddingRight = 120;
  hero.counterAxisAlignItems = 'CENTER';
  setFill(hero, colors.warmWhite);

  const heroTitle = figma.createText();
  heroTitle.fontName = await loadFontSafe('Tiempos', 'Bold');
  heroTitle.fontSize = 72;
  heroTitle.characters = 'AI that refines,\nnot disrupts.';
  heroTitle.textAlignHorizontal = 'CENTER';
  heroTitle.lineHeight = { unit: 'PIXELS', value: 80 };
  setFill(heroTitle, colors.charcoal);

  const heroSub = figma.createText();
  heroSub.fontName = await loadFontSafe('Inter', 'Regular');
  heroSub.fontSize = 20;
  heroSub.characters = 'We build modular tools that illuminate hidden efficiencies—\nsimple, durable, and yours to keep.';
  heroSub.textAlignHorizontal = 'CENTER';
  heroSub.lineHeight = { unit: 'PIXELS', value: 32 };
  heroSub.opacity = 0.8;
  setFill(heroSub, colors.charcoal);

  const heroCTA = await makeButton('Hero CTA', colors.amberFlame, colors.charcoal, 'Inter', 'primary', 'large');

  hero.appendChild(heroTitle);
  hero.appendChild(heroSub);
  hero.appendChild(heroCTA.default);

  // Features Section
  const features = createFrame('Features', 1440, 600, 0, 750);
  features.layoutMode = 'HORIZONTAL';
  features.itemSpacing = 48;
  features.paddingTop = 100;
  features.paddingLeft = features.paddingRight = 120;
  features.counterAxisAlignItems = 'START';

  const featureData = [
    { title: 'Craft over Consulting', desc: 'We are builders, not talkers. Our solutions outlive contracts.' },
    { title: 'Modular, Not Monolithic', desc: 'Sharp, focused interventions that adapt to your business rhythms.' },
    { title: 'Illumination, Not Hype', desc: 'Real outcomes grounded in your actual operations, not AI theater.' }
  ];

  for (const feature of featureData) {
    const col = figma.createFrame();
    col.layoutMode = 'VERTICAL';
    col.itemSpacing = 16;
    col.layoutGrow = 1;

    const icon = figma.createFrame();
    icon.resize(48, 48);
    icon.cornerRadius = 12;
    setFill(icon, colors.amberFlame);

    const title = figma.createText();
    title.fontName = await loadFontSafe('Inter', 'Semibold');
    title.fontSize = 20;
    title.characters = feature.title;
    setFill(title, colors.charcoal);

    const desc = figma.createText();
    desc.fontName = await loadFontSafe('Inter', 'Regular');
    desc.fontSize = 14;
    desc.characters = feature.desc;
    desc.lineHeight = { unit: 'PIXELS', value: 22 };
    desc.opacity = 0.7;
    setFill(desc, colors.charcoal);

    col.appendChild(icon);
    col.appendChild(title);
    col.appendChild(desc);
    features.appendChild(col);
  }

  // Case Studies Section
  const cases = createFrame('Case Studies', 1440, 500, 0, 1400);
  cases.layoutMode = 'HORIZONTAL';
  cases.itemSpacing = 32;
  cases.paddingTop = 80;
  cases.paddingLeft = cases.paddingRight = 120;

  for (let i = 0; i < 3; i++) {
    const card = await makeCaseCard(colors.warmWhite, colors.slateGray, colors.charcoal);
    cases.appendChild(card);
  }

  // CTA Section
  const cta = createFrame('CTA Section', 1440, 320, 0, 1950);
  cta.layoutMode = 'VERTICAL';
  cta.itemSpacing = 24;
  cta.paddingTop = cta.paddingBottom = 80;
  cta.counterAxisAlignItems = 'CENTER';
  setFill(cta, colors.charcoal);

  const ctaTitle = figma.createText();
  ctaTitle.fontName = await loadFontSafe('Tiempos', 'Bold');
  ctaTitle.fontSize = 48;
  ctaTitle.characters = 'Refinement over disruption.';
  ctaTitle.textAlignHorizontal = 'CENTER';
  setFill(ctaTitle, colors.warmWhite);

  const ctaSub = figma.createText();
  ctaSub.fontName = await loadFontSafe('Inter', 'Regular');
  ctaSub.fontSize = 18;
  ctaSub.characters = 'Signal over noise. Candlefish over consultancy.';
  ctaSub.textAlignHorizontal = 'CENTER';
  ctaSub.opacity = 0.9;
  setFill(ctaSub, colors.warmWhite);

  const ctaBtn = await makeButton('CTA Button', colors.amberFlame, colors.charcoal, 'Inter', 'primary', 'large');

  cta.appendChild(ctaTitle);
  cta.appendChild(ctaSub);
  cta.appendChild(ctaBtn.default);

  return homePage;
}

async function buildMobileFrames(colors) {
  const mobilePage = ensurePage('📱 Mobile Frames');
  figma.currentPage = mobilePage;

  // Mobile Hero
  const mobileHero = createFrame('Mobile Hero', 375, 812, 0, 0);
  mobileHero.layoutMode = 'VERTICAL';
  mobileHero.itemSpacing = 24;
  mobileHero.paddingTop = 80;
  mobileHero.paddingLeft = mobileHero.paddingRight = 24;
  setFill(mobileHero, colors.warmWhite);

  const mTitle = figma.createText();
  mTitle.fontName = await loadFontSafe('Tiempos', 'Bold');
  mTitle.fontSize = 36;
  mTitle.characters = 'AI that refines,\nnot disrupts.';
  mTitle.lineHeight = { unit: 'PIXELS', value: 44 };
  setFill(mTitle, colors.charcoal);

  const mSub = figma.createText();
  mSub.fontName = await loadFontSafe('Inter', 'Regular');
  mSub.fontSize = 16;
  mSub.characters = 'Modular tools. Simple, durable, and yours to keep.';
  mSub.lineHeight = { unit: 'PIXELS', value: 24 };
  mSub.opacity = 0.8;
  setFill(mSub, colors.charcoal);

  const mBtn = await makeButton('Mobile CTA', colors.amberFlame, colors.charcoal, 'Inter', 'primary', 'medium');
  mBtn.default.resize(327, 48);

  mobileHero.appendChild(mTitle);
  mobileHero.appendChild(mSub);
  mobileHero.appendChild(mBtn.default);

  // Mobile Features
  const mobileFeatures = createFrame('Mobile Features', 375, 600, 400, 0);
  mobileFeatures.layoutMode = 'VERTICAL';
  mobileFeatures.itemSpacing = 32;
  mobileFeatures.paddingTop = 48;
  mobileFeatures.paddingLeft = mobileFeatures.paddingRight = 24;
  setFill(mobileFeatures, '#FFFFFF');

  const features = [
    'Craft over Consulting',
    'Modular, Not Monolithic',
    'Illumination, Not Hype'
  ];

  for (const feature of features) {
    const item = figma.createFrame();
    item.layoutMode = 'HORIZONTAL';
    item.itemSpacing = 16;
    item.counterAxisSizingMode = 'AUTO';

    const icon = figma.createFrame();
    icon.resize(32, 32);
    icon.cornerRadius = 8;
    setFill(icon, colors.amberFlame);

    const text = figma.createText();
    text.fontName = await loadFontSafe('Inter', 'Medium');
    text.fontSize = 16;
    text.characters = feature;
    text.layoutGrow = 1;
    setFill(text, colors.charcoal);

    item.appendChild(icon);
    item.appendChild(text);
    mobileFeatures.appendChild(item);
  }

  return mobilePage;
}

// ============================================================================
// DESIGN TOKEN EXPORT
// ============================================================================

function exportDesignTokens(colors, collection) {
  const tokens = {
    version: '1.0.0',
    name: 'Candlefish Design System',
    generated: new Date().toISOString(),
    colors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
    grid: {}
  };

  // Export colors
  Object.entries(colors).forEach(([key, value]) => {
    tokens.colors[key] = {
      value: value,
      type: 'color'
    };
  });

  // Export typography
  tokens.typography = {
    fontFamilies: {
      serif: { value: 'Tiempos, Georgia, serif' },
      sans: { value: 'Inter, -apple-system, sans-serif' },
      mono: { value: 'SF Mono, Monaco, monospace' }
    },
    fontSizes: {
      xs: { value: '12px' },
      sm: { value: '14px' },
      base: { value: '16px' },
      lg: { value: '18px' },
      xl: { value: '20px' },
      '2xl': { value: '24px' },
      '3xl': { value: '32px' },
      '4xl': { value: '48px' },
      '5xl': { value: '72px' }
    },
    lineHeights: {
      tight: { value: '1.2' },
      normal: { value: '1.5' },
      relaxed: { value: '1.75' },
      loose: { value: '2' }
    }
  };

  // Export spacing
  const spacingScale = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120, 160];
  spacingScale.forEach((value, index) => {
    tokens.spacing[index] = { value: `${value}px` };
  });

  // Export border radius
  tokens.borderRadius = {
    none: { value: '0' },
    sm: { value: '4px' },
    base: { value: '8px' },
    md: { value: '12px' },
    lg: { value: '16px' },
    xl: { value: '24px' },
    full: { value: '999px' }
  };

  // Export shadows
  tokens.shadows = {
    sm: { value: '0 1px 2px rgba(0, 0, 0, 0.05)' },
    base: { value: '0 2px 4px rgba(0, 0, 0, 0.1)' },
    md: { value: '0 4px 8px rgba(0, 0, 0, 0.12)' },
    lg: { value: '0 8px 16px rgba(0, 0, 0, 0.15)' },
    xl: { value: '0 16px 32px rgba(0, 0, 0, 0.18)' }
  };

  // Export grid
  tokens.grid = {
    columns: { value: 12 },
    gutter: { value: '24px' },
    margin: { value: '120px' },
    mobileMargin: { value: '24px' }
  };

  return tokens;
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

async function build() {
  try {
    figma.notify('🚀 Building Candlefish Design System...');

    // Define brand colors
    const colors = {
      charcoal: '#1A1A1A',
      warmWhite: '#FAFAF8',
      amberFlame: '#FFB347',
      deepIndigo: '#3A3A60',
      slateGray: '#6B6B6B',
      mutedSand: '#D8D3C4'
    };

    // Create variable collection
    const collection = figma.variables.createVariableCollection('Candlefish Colors');
    const modeId = collection.defaultModeId;
    const variables = {};

    for (const [name, hex] of Object.entries(colors)) {
      const variable = figma.variables.createVariable(name, collection, 'COLOR');
      const rgb = hexToRGB(hex);
      variable.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 });
      variables[name] = variable;
    }

    // Generate semantic color scales
    const semanticColors = {
      ...generateColorScale(colors.amberFlame, 'primary'),
      ...generateColorScale('#10B981', 'success'),
      ...generateColorScale('#F59E0B', 'warning'),
      ...generateColorScale('#EF4444', 'error'),
      ...generateColorScale(colors.slateGray, 'neutral')
    };

    // Create paint styles
    Object.entries({ ...colors, ...semanticColors }).forEach(([name, hex]) => {
      addPaintStyle(`Candlefish/${name}`, hex);
    });

    // Create text styles
    const textStyles = [
      { name: 'Display/Large', font: 'Tiempos', size: 72, height: 80, weight: 'Bold' },
      { name: 'Display/Medium', font: 'Tiempos', size: 60, height: 68, weight: 'Bold' },
      { name: 'Display/Small', font: 'Tiempos', size: 48, height: 56, weight: 'Bold' },
      { name: 'Heading/1', font: 'Inter', size: 36, height: 44, weight: 'Semibold' },
      { name: 'Heading/2', font: 'Inter', size: 28, height: 36, weight: 'Semibold' },
      { name: 'Heading/3', font: 'Inter', size: 24, height: 32, weight: 'Medium' },
      { name: 'Body/Large', font: 'Inter', size: 18, height: 28, weight: 'Regular' },
      { name: 'Body/Base', font: 'Inter', size: 16, height: 24, weight: 'Regular' },
      { name: 'Body/Small', font: 'Inter', size: 14, height: 20, weight: 'Regular' },
      { name: 'Caption', font: 'Inter', size: 12, height: 16, weight: 'Regular' },
      { name: 'Code', font: 'SF Mono', size: 14, height: 20, weight: 'Regular' }
    ];

    for (const style of textStyles) {
      await addTextStyle(`Candlefish/${style.name}`, style.font, style.size, style.height, style.weight);
    }

    // Create effect styles
    const effects = [
      {
        name: 'Shadow/Small',
        effects: [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.05 },
          offset: { x: 0, y: 1 },
          radius: 2,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        }]
      },
      {
        name: 'Shadow/Medium',
        effects: [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: -2,
          visible: true,
          blendMode: 'NORMAL'
        }]
      },
      {
        name: 'Shadow/Large',
        effects: [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.15 },
          offset: { x: 0, y: 8 },
          radius: 16,
          spread: -4,
          visible: true,
          blendMode: 'NORMAL'
        }]
      }
    ];

    effects.forEach(effect => {
      addEffectStyle(`Candlefish/${effect.name}`, effect.effects);
    });

    // Build pages
    figma.notify('📄 Creating pages...');
    await buildBrandSystem(colors);

    figma.notify('🧩 Building components...');
    await buildComponents(colors);

    figma.notify('🖥 Creating layouts...');
    await buildHomepage(colors);

    figma.notify('📱 Building mobile frames...');
    await buildMobileFrames(colors);

    // Export tokens
    const tokens = exportDesignTokens({ ...colors, ...semanticColors }, collection);

    // Send tokens to UI for download
    figma.ui.postMessage({
      type: 'tokens-ready',
      tokens: JSON.stringify(tokens, null, 2)
    });

    figma.notify('✅ Candlefish Design System built successfully!');

  } catch (error) {
    console.error('Build error:', error);
    figma.notify(`❌ Error: ${error.message}`, { error: true });
  }
}

// ============================================================================
// PLUGIN INITIALIZATION
// ============================================================================

// Handle different commands
if (figma.command === 'export') {
  // Export tokens only
  figma.showUI(__html__, { width: 400, height: 300 });
  figma.ui.postMessage({ type: 'export-mode' });
} else if (figma.command === 'docs') {
  // Show documentation
  figma.showUI(__html__, { width: 600, height: 500 });
  figma.ui.postMessage({ type: 'docs-mode' });
} else {
  // Default: build the system
  build();
}

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'build') {
    await build();
  } else if (msg.type === 'export') {
    const colors = {
      charcoal: '#1A1A1A',
      warmWhite: '#FAFAF8',
      amberFlame: '#FFB347',
      deepIndigo: '#3A3A60',
      slateGray: '#6B6B6B',
      mutedSand: '#D8D3C4'
    };
    const tokens = exportDesignTokens(colors, null);
    figma.ui.postMessage({
      type: 'tokens-ready',
      tokens: JSON.stringify(tokens, null, 2)
    });
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};
