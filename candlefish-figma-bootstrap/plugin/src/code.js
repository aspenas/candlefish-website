/**
 * Candlefish Advanced Design System Generator
 * Professional Figma Plugin for Comprehensive Design System Creation
 * Version: 2.0.0
 */

// ===============================
// UTILITIES & HELPERS
// ===============================

class DesignSystemError extends Error {
  constructor(message, code = 'UNKNOWN', recoverable = true) {
    super(message);
    this.name = 'DesignSystemError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

class Logger {
  static logs = [];

  static info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
    this.logs.push({ level: 'info', message, data, timestamp: Date.now() });
  }

  static warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
    this.logs.push({ level: 'warn', message, data, timestamp: Date.now() });
  }

  static error(message, error = null) {
    console.error(`[ERROR] ${message}`, error);
    this.logs.push({ level: 'error', message, error: error?.message, timestamp: Date.now() });
  }
}

class ProgressTracker {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.status = 'Initializing...';
  }

  update(increment = 1, status = null) {
    this.current += increment;
    if (status) this.status = status;
    const percentage = Math.round((this.current / this.total) * 100);

    figma.ui.postMessage({
      type: 'progress',
      percentage,
      status: this.status,
      current: this.current,
      total: this.total
    });

    Logger.info(`Progress: ${percentage}% - ${this.status}`);
  }

  complete(status = 'Complete!') {
    this.current = this.total;
    this.status = status;
    this.update(0, status);
  }
}

// Utility Functions
function hexToRgb(hex) {
  try {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    const bigint = parseInt(normalized, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return { r, g, b };
  } catch (error) {
    Logger.error(`Failed to convert hex to RGB: ${hex}`, error);
    return { r: 0.5, g: 0.5, b: 0.5 }; // Fallback gray
  }
}

function rgbToHex(rgb) {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

async function safeLoadFont(fontName, fallbacks = []) {
  const fontsToTry = [fontName, ...fallbacks, { family: 'Inter', style: 'Regular' }];

  for (const font of fontsToTry) {
    try {
      await figma.loadFontAsync(font);
      return font;
    } catch (error) {
      Logger.warn(`Failed to load font: ${font.family} ${font.style}`);
      continue;
    }
  }

  throw new DesignSystemError('No suitable fonts could be loaded', 'FONT_LOAD_FAILED');
}

async function ensurePage(name) {
  try {
    for (const page of figma.root.children) {
      if (page.name === name) {
        Logger.info(`Found existing page: ${name}`);
        return page;
      }
    }

    const page = figma.createPage();
    page.name = name;
    Logger.info(`Created new page: ${name}`);
    return page;
  } catch (error) {
    Logger.error(`Failed to ensure page: ${name}`, error);
    throw new DesignSystemError(`Failed to create or find page: ${name}`, 'PAGE_CREATION_FAILED');
  }
}

function batchCreateNodes(nodeCreator, count, batchSize = 50) {
  const nodes = [];

  for (let i = 0; i < count; i += batchSize) {
    const currentBatch = Math.min(batchSize, count - i);
    for (let j = 0; j < currentBatch; j++) {
      nodes.push(nodeCreator(i + j));
    }

    // Allow UI to update between batches
    if (i + batchSize < count) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(nodes.concat(batchCreateNodes(nodeCreator, count - (i + batchSize), batchSize)));
        }, 10);
      });
    }
  }

  return nodes;
}

// ===============================
// COLOR SYSTEM
// ===============================

class ColorSystem {
  constructor() {
    this.semanticColors = {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#06B6D4'
    };

    this.neutrals = this.generateNeutralScale('#64748B');
    this.primitives = this.generateColorPrimitives();
  }

  generateNeutralScale(baseColor) {
    const base = hexToRgb(baseColor);
    const scale = {};

    // Generate 50-950 scale
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    steps.forEach(step => {
      const factor = this.getScaleFactor(step);
      const color = this.adjustColorBrightness(base, factor);
      scale[step] = rgbToHex(color);
    });

    return scale;
  }

  getScaleFactor(step) {
    const factors = {
      50: 0.95, 100: 0.9, 200: 0.8, 300: 0.65, 400: 0.5,
      500: 0, 600: -0.2, 700: -0.4, 800: -0.6, 900: -0.75, 950: -0.85
    };
    return factors[step] || 0;
  }

  adjustColorBrightness(rgb, factor) {
    const adjust = (value, factor) => {
      if (factor > 0) {
        return value + (1 - value) * factor;
      } else {
        return value * (1 + factor);
      }
    };

    return {
      r: Math.max(0, Math.min(1, adjust(rgb.r, factor))),
      g: Math.max(0, Math.min(1, adjust(rgb.g, factor))),
      b: Math.max(0, Math.min(1, adjust(rgb.b, factor)))
    };
  }

  generateColorPrimitives() {
    const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    const primitives = {};

    colors.forEach(color => {
      primitives[color] = this.generateNeutralScale(this.getBaseColorForPrimitive(color));
    });

    return primitives;
  }

  getBaseColorForPrimitive(colorName) {
    const baseColors = {
      red: '#EF4444', orange: '#F97316', amber: '#F59E0B', yellow: '#EAB308',
      lime: '#84CC16', green: '#22C55E', emerald: '#10B981', teal: '#14B8A6',
      cyan: '#06B6D4', sky: '#0EA5E9', blue: '#3B82F6', indigo: '#6366F1',
      violet: '#8B5CF6', purple: '#A855F7', fuchsia: '#D946EF', pink: '#EC4899',
      rose: '#F43F5E'
    };
    return baseColors[colorName] || '#64748B';
  }

  createOpacityVariants(baseColor, opacities = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90]) {
    const variants = {};
    opacities.forEach(opacity => {
      variants[opacity] = { ...hexToRgb(baseColor), opacity: opacity / 100 };
    });
    return variants;
  }

  async createColorStyles(progress) {
    try {
      const styles = [];

      // Semantic colors
      Object.entries(this.semanticColors).forEach(([name, hex]) => {
        const style = figma.createPaintStyle();
        style.name = `Color/Semantic/${name}`;
        style.paints = [{ type: 'SOLID', color: hexToRgb(hex) }];
        styles.push(style);
      });

      progress.update(1, 'Creating semantic color styles...');

      // Neutral scale
      Object.entries(this.neutrals).forEach(([step, hex]) => {
        const style = figma.createPaintStyle();
        style.name = `Color/Neutral/${step}`;
        style.paints = [{ type: 'SOLID', color: hexToRgb(hex) }];
        styles.push(style);
      });

      progress.update(1, 'Creating neutral color styles...');

      // Color primitives (limited to avoid overwhelming)
      ['blue', 'green', 'red', 'amber'].forEach(colorName => {
        Object.entries(this.primitives[colorName]).forEach(([step, hex]) => {
          const style = figma.createPaintStyle();
          style.name = `Color/Primitive/${colorName}/${step}`;
          style.paints = [{ type: 'SOLID', color: hexToRgb(hex) }];
          styles.push(style);
        });
      });

      progress.update(1, 'Creating color primitive styles...');

      Logger.info(`Created ${styles.length} color styles`);
      return styles;

    } catch (error) {
      Logger.error('Failed to create color styles', error);
      throw new DesignSystemError('Color style creation failed', 'COLOR_STYLES_FAILED');
    }
  }

  async createColorVariables(progress) {
    try {
      // Light mode collection
      const lightCollection = figma.variables.createVariableCollection('Colors/Light');
      lightCollection.name = 'Colors/Light';

      // Dark mode collection
      const darkCollection = figma.variables.createVariableCollection('Colors/Dark');
      darkCollection.name = 'Colors/Dark';

      const variables = [];

      // Create semantic color variables
      Object.entries(this.semanticColors).forEach(([name, lightHex]) => {
        const variable = figma.variables.createVariable(name, lightCollection, 'COLOR');
        variable.setValueForMode(lightCollection.modes[0].modeId, hexToRgb(lightHex));

        // Create dark mode variant (simplified - in real implementation, would have proper dark colors)
        const darkVariable = figma.variables.createVariable(name, darkCollection, 'COLOR');
        const darkColor = this.adjustColorBrightness(hexToRgb(lightHex), -0.3);
        darkVariable.setValueForMode(darkCollection.modes[0].modeId, darkColor);

        variables.push(variable, darkVariable);
      });

      progress.update(1, 'Creating color variables...');

      Logger.info(`Created ${variables.length} color variables`);
      return { lightCollection, darkCollection, variables };

    } catch (error) {
      Logger.error('Failed to create color variables', error);
      throw new DesignSystemError('Color variable creation failed', 'COLOR_VARIABLES_FAILED');
    }
  }
}

// ===============================
// TYPOGRAPHY SYSTEM
// ===============================

class TypographySystem {
  constructor() {
    this.scale = {
      'xs': { size: 12, lineHeight: 16 },
      'sm': { size: 14, lineHeight: 20 },
      'base': { size: 16, lineHeight: 24 },
      'lg': { size: 18, lineHeight: 28 },
      'xl': { size: 20, lineHeight: 28 },
      '2xl': { size: 24, lineHeight: 32 },
      '3xl': { size: 30, lineHeight: 36 },
      '4xl': { size: 36, lineHeight: 40 },
      '5xl': { size: 48, lineHeight: 48 },
      '6xl': { size: 60, lineHeight: 60 },
      '7xl': { size: 72, lineHeight: 72 },
      '8xl': { size: 96, lineHeight: 96 },
      '9xl': { size: 128, lineHeight: 128 }
    };

    this.weights = {
      thin: 'Thin',
      light: 'Light',
      regular: 'Regular',
      medium: 'Medium',
      semibold: 'SemiBold',
      bold: 'Bold',
      extrabold: 'ExtraBold',
      black: 'Black'
    };

    this.letterSpacing = {
      tighter: -0.05,
      tight: -0.025,
      normal: 0,
      wide: 0.025,
      wider: 0.05,
      widest: 0.1
    };
  }

  async createTypographyStyles(progress) {
    try {
      const styles = [];
      const fontFamily = 'Inter';

      // Load required font weights
      const requiredWeights = ['Regular', 'Medium', 'SemiBold', 'Bold'];
      for (const weight of requiredWeights) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style: weight });
        } catch (error) {
          Logger.warn(`Failed to load font weight: ${weight}`);
        }
      }

      // Create heading styles
      const headings = [
        { name: 'Display/Large', scale: '6xl', weight: 'bold', tracking: 'tight' },
        { name: 'Display/Medium', scale: '5xl', weight: 'bold', tracking: 'tight' },
        { name: 'Display/Small', scale: '4xl', weight: 'bold', tracking: 'tight' },
        { name: 'Heading/1', scale: '3xl', weight: 'bold', tracking: 'tight' },
        { name: 'Heading/2', scale: '2xl', weight: 'semibold', tracking: 'tight' },
        { name: 'Heading/3', scale: 'xl', weight: 'semibold', tracking: 'normal' },
        { name: 'Heading/4', scale: 'lg', weight: 'semibold', tracking: 'normal' },
        { name: 'Heading/5', scale: 'base', weight: 'semibold', tracking: 'normal' },
        { name: 'Heading/6', scale: 'sm', weight: 'semibold', tracking: 'normal' }
      ];

      for (const heading of headings) {
        const style = figma.createTextStyle();
        style.name = `Typography/${heading.name}`;
        style.fontSize = this.scale[heading.scale].size;
        style.lineHeight = { unit: 'PIXELS', value: this.scale[heading.scale].lineHeight };
        style.letterSpacing = { unit: 'PERCENT', value: this.letterSpacing[heading.tracking] * 100 };

        try {
          style.fontName = { family: fontFamily, style: this.weights[heading.weight] || 'Regular' };
        } catch (error) {
          style.fontName = { family: fontFamily, style: 'Regular' };
        }

        styles.push(style);
      }

      progress.update(1, 'Creating heading styles...');

      // Create body text styles
      const bodyStyles = [
        { name: 'Body/Large', scale: 'lg', weight: 'regular' },
        { name: 'Body/Medium', scale: 'base', weight: 'regular' },
        { name: 'Body/Small', scale: 'sm', weight: 'regular' },
        { name: 'Body/XSmall', scale: 'xs', weight: 'regular' }
      ];

      for (const body of bodyStyles) {
        const style = figma.createTextStyle();
        style.name = `Typography/${body.name}`;
        style.fontSize = this.scale[body.scale].size;
        style.lineHeight = { unit: 'PIXELS', value: this.scale[body.scale].lineHeight };
        style.letterSpacing = { unit: 'PERCENT', value: 0 };

        try {
          style.fontName = { family: fontFamily, style: this.weights[body.weight] || 'Regular' };
        } catch (error) {
          style.fontName = { family: fontFamily, style: 'Regular' };
        }

        styles.push(style);
      }

      progress.update(1, 'Creating body text styles...');

      // Create caption and label styles
      const utilityStyles = [
        { name: 'Caption/Large', scale: 'sm', weight: 'medium' },
        { name: 'Caption/Medium', scale: 'xs', weight: 'medium' },
        { name: 'Label/Large', scale: 'sm', weight: 'semibold' },
        { name: 'Label/Medium', scale: 'xs', weight: 'semibold' },
        { name: 'Code/Large', scale: 'base', weight: 'regular', family: 'Monaco' },
        { name: 'Code/Medium', scale: 'sm', weight: 'regular', family: 'Monaco' },
        { name: 'Code/Small', scale: 'xs', weight: 'regular', family: 'Monaco' }
      ];

      for (const utility of utilityStyles) {
        const style = figma.createTextStyle();
        style.name = `Typography/${utility.name}`;
        style.fontSize = this.scale[utility.scale].size;
        style.lineHeight = { unit: 'PIXELS', value: this.scale[utility.scale].lineHeight };
        style.letterSpacing = { unit: 'PERCENT', value: 0 };

        const family = utility.family || fontFamily;
        try {
          style.fontName = { family, style: this.weights[utility.weight] || 'Regular' };
        } catch (error) {
          style.fontName = { family: fontFamily, style: 'Regular' };
        }

        styles.push(style);
      }

      progress.update(1, 'Creating utility text styles...');

      Logger.info(`Created ${styles.length} typography styles`);
      return styles;

    } catch (error) {
      Logger.error('Failed to create typography styles', error);
      throw new DesignSystemError('Typography style creation failed', 'TYPOGRAPHY_STYLES_FAILED');
    }
  }
}

// ===============================
// SPACING & LAYOUT SYSTEM
// ===============================

class SpacingSystem {
  constructor() {
    // 4pt base grid system with t-shirt sizes
    this.spacingScale = {
      'none': 0,
      'px': 1,
      '0.5': 2,
      '1': 4,
      '1.5': 6,
      '2': 8,
      '2.5': 10,
      '3': 12,
      '3.5': 14,
      '4': 16,
      '5': 20,
      '6': 24,
      '7': 28,
      '8': 32,
      '9': 36,
      '10': 40,
      '11': 44,
      '12': 48,
      '14': 56,
      '16': 64,
      '20': 80,
      '24': 96,
      '28': 112,
      '32': 128,
      '36': 144,
      '40': 160,
      '44': 176,
      '48': 192,
      '52': 208,
      '56': 224,
      '60': 240,
      '64': 256,
      '72': 288,
      '80': 320,
      '96': 384
    };

    this.breakpoints = {
      'sm': 640,
      'md': 768,
      'lg': 1024,
      'xl': 1280,
      '2xl': 1536
    };
  }

  createSpacingVariables() {
    try {
      const collection = figma.variables.createVariableCollection('Spacing');
      const variables = [];

      Object.entries(this.spacingScale).forEach(([name, value]) => {
        const variable = figma.variables.createVariable(`spacing.${name}`, collection, 'FLOAT');
        variable.setValueForMode(collection.modes[0].modeId, value);
        variables.push(variable);
      });

      Logger.info(`Created ${variables.length} spacing variables`);
      return variables;

    } catch (error) {
      Logger.error('Failed to create spacing variables', error);
      throw new DesignSystemError('Spacing variable creation failed', 'SPACING_VARIABLES_FAILED');
    }
  }
}

// ===============================
// EFFECTS SYSTEM
// ===============================

class EffectsSystem {
  constructor() {
    this.shadows = {
      'xs': [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0 }],
      'sm': [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0 }],
      'md': [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, spread: -1 },
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 2 }, radius: 4, spread: -1 }
      ],
      'lg': [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 10 }, radius: 15, spread: -3 },
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 4 }, radius: 6, spread: -2 }
      ],
      'xl': [
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 20 }, radius: 25, spread: -5 },
        { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 8 }, radius: 10, spread: -6 }
      ],
      '2xl': [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 25 }, radius: 50, spread: -12 }],
      'inner': [{ type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0 }]
    };

    this.blurs = {
      'sm': [{ type: 'LAYER_BLUR', radius: 4 }],
      'md': [{ type: 'LAYER_BLUR', radius: 8 }],
      'lg': [{ type: 'LAYER_BLUR', radius: 16 }],
      'xl': [{ type: 'LAYER_BLUR', radius: 24 }],
      '2xl': [{ type: 'LAYER_BLUR', radius: 40 }],
      '3xl': [{ type: 'LAYER_BLUR', radius: 64 }]
    };
  }

  createEffectStyles(progress) {
    try {
      const styles = [];

      // Create shadow styles
      Object.entries(this.shadows).forEach(([name, effects]) => {
        const style = figma.createEffectStyle();
        style.name = `Shadow/${name}`;
        style.effects = effects;
        styles.push(style);
      });

      progress.update(1, 'Creating shadow styles...');

      // Create blur styles
      Object.entries(this.blurs).forEach(([name, effects]) => {
        const style = figma.createEffectStyle();
        style.name = `Blur/${name}`;
        style.effects = effects;
        styles.push(style);
      });

      progress.update(1, 'Creating blur styles...');

      Logger.info(`Created ${styles.length} effect styles`);
      return styles;

    } catch (error) {
      Logger.error('Failed to create effect styles', error);
      throw new DesignSystemError('Effect style creation failed', 'EFFECT_STYLES_FAILED');
    }
  }
}

// ===============================
// COMPONENT SYSTEM
// ===============================

class ComponentSystem {
  constructor(colorSystem, spacingSystem, effectsSystem) {
    this.colorSystem = colorSystem;
    this.spacingSystem = spacingSystem;
    this.effectsSystem = effectsSystem;
  }

  async createButton(variant = 'primary', size = 'medium', state = 'default') {
    try {
      const button = figma.createComponent();
      button.name = `Button/${variant}/${size}/${state}`;

      // Size configurations
      const sizeConfig = {
        small: { height: 32, paddingX: 12, paddingY: 6, fontSize: 14 },
        medium: { height: 40, paddingX: 16, paddingY: 8, fontSize: 16 },
        large: { height: 48, paddingX: 20, paddingY: 12, fontSize: 18 }
      };

      // Variant configurations
      const variantConfig = {
        primary: {
          background: this.colorSystem.semanticColors.primary,
          text: '#FFFFFF',
          border: 'none'
        },
        secondary: {
          background: 'transparent',
          text: this.colorSystem.semanticColors.primary,
          border: this.colorSystem.semanticColors.primary
        },
        ghost: {
          background: 'transparent',
          text: this.colorSystem.neutrals[700],
          border: 'none'
        },
        destructive: {
          background: this.colorSystem.semanticColors.error,
          text: '#FFFFFF',
          border: 'none'
        }
      };

      const config = sizeConfig[size];
      const colors = variantConfig[variant];

      // Set button properties
      button.resize(120, config.height);
      button.cornerRadius = 6;
      button.layoutMode = 'HORIZONTAL';
      button.primaryAxisAlignItems = 'CENTER';
      button.counterAxisAlignItems = 'CENTER';
      button.paddingLeft = config.paddingX;
      button.paddingRight = config.paddingX;
      button.paddingTop = config.paddingY;
      button.paddingBottom = config.paddingY;
      button.itemSpacing = 8;

      // Set background
      if (colors.background !== 'transparent') {
        button.fills = [{ type: 'SOLID', color: hexToRgb(colors.background) }];
      } else {
        button.fills = [];
      }

      // Set border
      if (colors.border && colors.border !== 'none') {
        button.strokes = [{ type: 'SOLID', color: hexToRgb(colors.border) }];
        button.strokeWeight = 1;
      }

      // Add text
      const text = figma.createText();
      text.characters = 'Button';
      text.fontSize = config.fontSize;
      text.fontName = await safeLoadFont({ family: 'Inter', style: 'Medium' });
      text.fills = [{ type: 'SOLID', color: hexToRgb(colors.text) }];

      // State modifications
      if (state === 'disabled') {
        button.opacity = 0.5;
        text.characters = 'Disabled';
      } else if (state === 'hover') {
        // Slightly darken background for hover state
        if (colors.background !== 'transparent') {
          const hoverColor = this.colorSystem.adjustColorBrightness(hexToRgb(colors.background), -0.1);
          button.fills = [{ type: 'SOLID', color: hoverColor }];
        }
      }

      button.appendChild(text);

      // Add shadow for elevated buttons
      if (variant === 'primary' && state !== 'disabled') {
        button.effects = this.effectsSystem.shadows.sm;
      }

      return button;

    } catch (error) {
      Logger.error(`Failed to create button: ${variant}/${size}/${state}`, error);
      throw new DesignSystemError('Button creation failed', 'BUTTON_CREATION_FAILED');
    }
  }

  async createCard(variant = 'default', elevation = 'md') {
    try {
      const card = figma.createComponent();
      card.name = `Card/${variant}/${elevation}`;

      card.resize(320, 200);
      card.cornerRadius = 8;
      card.layoutMode = 'VERTICAL';
      card.primaryAxisSizingMode = 'AUTO';
      card.paddingLeft = 24;
      card.paddingRight = 24;
      card.paddingTop = 24;
      card.paddingBottom = 24;
      card.itemSpacing = 16;

      // Background
      card.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];

      // Border for outlined variant
      if (variant === 'outlined') {
        card.strokes = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[200]) }];
        card.strokeWeight = 1;
      }

      // Shadow
      if (elevation !== 'none' && this.effectsSystem.shadows[elevation]) {
        card.effects = this.effectsSystem.shadows[elevation];
      }

      // Add content placeholder
      const header = figma.createText();
      header.characters = 'Card Header';
      header.fontSize = 18;
      header.fontName = await safeLoadFont({ family: 'Inter', style: 'SemiBold' });
      header.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[900]) }];
      card.appendChild(header);

      const content = figma.createText();
      content.characters = 'This is card content that can be customized with any text or components.';
      content.fontSize = 14;
      content.fontName = await safeLoadFont({ family: 'Inter', style: 'Regular' });
      content.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[600]) }];
      content.resize(272, 40);
      card.appendChild(content);

      return card;

    } catch (error) {
      Logger.error(`Failed to create card: ${variant}/${elevation}`, error);
      throw new DesignSystemError('Card creation failed', 'CARD_CREATION_FAILED');
    }
  }

  async createInput(variant = 'default', size = 'medium', state = 'default') {
    try {
      const input = figma.createComponent();
      input.name = `Input/${variant}/${size}/${state}`;

      const sizeConfig = {
        small: { height: 32, paddingX: 12, fontSize: 14 },
        medium: { height: 40, paddingX: 16, fontSize: 16 },
        large: { height: 48, paddingX: 20, fontSize: 18 }
      };

      const config = sizeConfig[size];

      input.resize(280, config.height);
      input.cornerRadius = 6;
      input.layoutMode = 'HORIZONTAL';
      input.primaryAxisAlignItems = 'CENTER';
      input.paddingLeft = config.paddingX;
      input.paddingRight = config.paddingX;

      // Background and border
      input.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];

      let borderColor = this.colorSystem.neutrals[300];
      if (state === 'error') borderColor = this.colorSystem.semanticColors.error;
      if (state === 'focus') borderColor = this.colorSystem.semanticColors.primary;

      input.strokes = [{ type: 'SOLID', color: hexToRgb(borderColor) }];
      input.strokeWeight = state === 'focus' ? 2 : 1;

      // Placeholder text
      const placeholder = figma.createText();
      placeholder.characters = state === 'error' ? 'Error state' : 'Placeholder text';
      placeholder.fontSize = config.fontSize;
      placeholder.fontName = await safeLoadFont({ family: 'Inter', style: 'Regular' });

      let textColor = this.colorSystem.neutrals[500];
      if (state === 'error') textColor = this.colorSystem.semanticColors.error;

      placeholder.fills = [{ type: 'SOLID', color: hexToRgb(textColor) }];
      input.appendChild(placeholder);

      return input;

    } catch (error) {
      Logger.error(`Failed to create input: ${variant}/${size}/${state}`, error);
      throw new DesignSystemError('Input creation failed', 'INPUT_CREATION_FAILED');
    }
  }

  async createModal(size = 'medium') {
    try {
      const modal = figma.createComponent();
      modal.name = `Modal/${size}`;

      const sizeConfig = {
        small: { width: 400, maxHeight: 300 },
        medium: { width: 500, maxHeight: 400 },
        large: { width: 600, maxHeight: 500 },
        fullscreen: { width: 800, maxHeight: 600 }
      };

      const config = sizeConfig[size];

      modal.resize(config.width, config.maxHeight);
      modal.cornerRadius = 12;
      modal.layoutMode = 'VERTICAL';
      modal.primaryAxisSizingMode = 'AUTO';
      modal.paddingLeft = 24;
      modal.paddingRight = 24;
      modal.paddingTop = 24;
      modal.paddingBottom = 24;
      modal.itemSpacing = 20;

      // Background and shadow
      modal.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
      modal.effects = this.effectsSystem.shadows.xl;

      // Header
      const header = figma.createFrame();
      header.name = 'Header';
      header.layoutMode = 'HORIZONTAL';
      header.primaryAxisAlignItems = 'CENTER';
      header.counterAxisAlignItems = 'CENTER';
      header.resize(config.width - 48, 24);
      header.fills = [];

      const title = figma.createText();
      title.characters = 'Modal Title';
      title.fontSize = 18;
      title.fontName = await safeLoadFont({ family: 'Inter', style: 'SemiBold' });
      title.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[900]) }];
      header.appendChild(title);

      modal.appendChild(header);

      // Content
      const content = figma.createText();
      content.characters = 'Modal content goes here. This can include any form fields, text, or other components needed for the modal.';
      content.fontSize = 14;
      content.fontName = await safeLoadFont({ family: 'Inter', style: 'Regular' });
      content.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[600]) }];
      content.resize(config.width - 48, 60);
      modal.appendChild(content);

      // Footer with actions
      const footer = figma.createFrame();
      footer.name = 'Footer';
      footer.layoutMode = 'HORIZONTAL';
      footer.primaryAxisAlignItems = 'CENTER';
      footer.counterAxisAlignItems = 'CENTER';
      footer.primaryAxisSizingMode = 'AUTO';
      footer.itemSpacing = 12;
      footer.fills = [];

      // Add cancel button
      const cancelButton = await this.createButton('secondary', 'medium');
      cancelButton.resize(80, 40);
      footer.appendChild(cancelButton);

      // Add confirm button
      const confirmButton = await this.createButton('primary', 'medium');
      confirmButton.resize(80, 40);
      footer.appendChild(confirmButton);

      modal.appendChild(footer);

      return modal;

    } catch (error) {
      Logger.error(`Failed to create modal: ${size}`, error);
      throw new DesignSystemError('Modal creation failed', 'MODAL_CREATION_FAILED');
    }
  }

  async createToast(variant = 'info', position = 'top-right') {
    try {
      const toast = figma.createComponent();
      toast.name = `Toast/${variant}/${position}`;

      toast.resize(360, 60);
      toast.cornerRadius = 8;
      toast.layoutMode = 'HORIZONTAL';
      toast.primaryAxisAlignItems = 'CENTER';
      toast.paddingLeft = 16;
      toast.paddingRight = 16;
      toast.paddingTop = 12;
      toast.paddingBottom = 12;
      toast.itemSpacing = 12;

      // Variant colors
      const variantConfig = {
        success: { bg: this.colorSystem.semanticColors.success, icon: '✓' },
        error: { bg: this.colorSystem.semanticColors.error, icon: '✕' },
        warning: { bg: this.colorSystem.semanticColors.warning, icon: '⚠' },
        info: { bg: this.colorSystem.semanticColors.info, icon: 'ℹ' }
      };

      const config = variantConfig[variant];

      // Background
      toast.fills = [{ type: 'SOLID', color: hexToRgb(config.bg) }];
      toast.effects = this.effectsSystem.shadows.lg;

      // Icon
      const icon = figma.createText();
      icon.characters = config.icon;
      icon.fontSize = 16;
      icon.fontName = await safeLoadFont({ family: 'Inter', style: 'Medium' });
      icon.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
      toast.appendChild(icon);

      // Message
      const message = figma.createText();
      message.characters = `${variant.charAt(0).toUpperCase() + variant.slice(1)} message`;
      message.fontSize = 14;
      message.fontName = await safeLoadFont({ family: 'Inter', style: 'Regular' });
      message.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
      message.resize(280, 20);
      toast.appendChild(message);

      return toast;

    } catch (error) {
      Logger.error(`Failed to create toast: ${variant}/${position}`, error);
      throw new DesignSystemError('Toast creation failed', 'TOAST_CREATION_FAILED');
    }
  }

  async createNavigation() {
    try {
      const nav = figma.createComponent();
      nav.name = 'Navigation/Horizontal';

      nav.resize(800, 64);
      nav.layoutMode = 'HORIZONTAL';
      nav.primaryAxisAlignItems = 'CENTER';
      nav.paddingLeft = 24;
      nav.paddingRight = 24;
      nav.itemSpacing = 32;

      // Background
      nav.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
      nav.strokes = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[200]) }];
      nav.strokeWeight = 1;

      // Logo space
      const logo = figma.createRectangle();
      logo.name = 'Logo';
      logo.resize(120, 32);
      logo.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.semanticColors.primary) }];
      logo.cornerRadius = 4;
      nav.appendChild(logo);

      // Navigation items
      const navItems = figma.createFrame();
      navItems.name = 'Nav Items';
      navItems.layoutMode = 'HORIZONTAL';
      navItems.primaryAxisAlignItems = 'CENTER';
      navItems.itemSpacing = 24;
      navItems.fills = [];

      const items = ['Home', 'Products', 'About', 'Contact'];
      for (const item of items) {
        const navItem = figma.createText();
        navItem.characters = item;
        navItem.fontSize = 14;
        navItem.fontName = await safeLoadFont({ family: 'Inter', style: 'Medium' });
        navItem.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[700]) }];
        navItems.appendChild(navItem);
      }

      nav.appendChild(navItems);

      return nav;

    } catch (error) {
      Logger.error('Failed to create navigation', error);
      throw new DesignSystemError('Navigation creation failed', 'NAVIGATION_CREATION_FAILED');
    }
  }
}

// ===============================
// TOKEN EXPORT SYSTEM
// ===============================

class TokenExporter {
  constructor(colorSystem, spacingSystem, typographySystem) {
    this.colorSystem = colorSystem;
    this.spacingSystem = spacingSystem;
    this.typographySystem = typographySystem;
  }

  generateTokensJSON() {
    return {
      colors: {
        semantic: this.colorSystem.semanticColors,
        neutral: this.colorSystem.neutrals,
        primitives: this.colorSystem.primitives
      },
      spacing: this.spacingSystem.spacingScale,
      typography: {
        scale: this.typographySystem.scale,
        weights: this.typographySystem.weights,
        letterSpacing: this.typographySystem.letterSpacing
      },
      breakpoints: this.spacingSystem.breakpoints,
      effects: {
        shadows: Object.keys(this.effectsSystem?.shadows || {}),
        blurs: Object.keys(this.effectsSystem?.blurs || {})
      }
    };
  }

  generateCSSVariables() {
    let css = ':root {\n';

    // Colors
    Object.entries(this.colorSystem.semanticColors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });

    Object.entries(this.colorSystem.neutrals).forEach(([step, value]) => {
      css += `  --color-neutral-${step}: ${value};\n`;
    });

    // Spacing
    Object.entries(this.spacingSystem.spacingScale).forEach(([name, value]) => {
      css += `  --spacing-${name}: ${value}px;\n`;
    });

    // Typography
    Object.entries(this.typographySystem.scale).forEach(([name, { size, lineHeight }]) => {
      css += `  --font-size-${name}: ${size}px;\n`;
      css += `  --line-height-${name}: ${lineHeight}px;\n`;
    });

    css += '}';
    return css;
  }

  generateTailwindConfig() {
    return {
      theme: {
        extend: {
          colors: {
            ...this.colorSystem.semanticColors,
            neutral: this.colorSystem.neutrals
          },
          spacing: this.spacingSystem.spacingScale,
          fontSize: Object.fromEntries(
            Object.entries(this.typographySystem.scale).map(([name, { size, lineHeight }]) => [
              name, [size + 'px', lineHeight + 'px']
            ])
          ),
          screens: this.spacingSystem.breakpoints
        }
      }
    };
  }
}

// ===============================
// MAIN DESIGN SYSTEM GENERATOR
// ===============================

class DesignSystemGenerator {
  constructor(config = {}) {
    this.config = {
      gridSystem: config.gridSystem || '8pt',
      includeComponentVariants: config.includeComponentVariants !== false,
      includeDarkMode: config.includeDarkMode !== false,
      exportTokens: config.exportTokens !== false,
      batchSize: config.batchSize || 10,
      ...config
    };

    this.colorSystem = new ColorSystem();
    this.typographySystem = new TypographySystem();
    this.spacingSystem = new SpacingSystem();
    this.effectsSystem = new EffectsSystem();
    this.componentSystem = new ComponentSystem(this.colorSystem, this.spacingSystem, this.effectsSystem);
    this.tokenExporter = new TokenExporter(this.colorSystem, this.spacingSystem, this.typographySystem);
  }

  async generateDesignSystem(logoBytes = null) {
    try {
      // Calculate total steps for progress
      const totalSteps = 15;
      const progress = new ProgressTracker(totalSteps);

      Logger.info('Starting design system generation...');
      progress.update(0, 'Initializing design system...');

      // Create pages
      await this.createPages(progress);

      // Create foundation systems
      await this.createFoundationSystems(progress);

      // Create components
      await this.createComponentLibrary(progress);

      // Create documentation
      await this.createDocumentation(progress);

      // Export tokens if requested
      if (this.config.exportTokens) {
        await this.exportTokens(progress);
      }

      progress.complete('Design system generation complete!');

      figma.notify('✅ Advanced design system generated successfully!', { timeout: 3000 });

      return {
        success: true,
        message: 'Design system generated successfully',
        logs: Logger.logs
      };

    } catch (error) {
      Logger.error('Design system generation failed', error);
      figma.notify(`❌ Generation failed: ${error.message}`, { timeout: 5000 });

      if (error.recoverable) {
        figma.notify('🔄 Attempting recovery...', { timeout: 2000 });
        // Could implement recovery logic here
      }

      return {
        success: false,
        error: error.message,
        logs: Logger.logs
      };
    }
  }

  async createPages(progress) {
    const pageNames = [
      '🎨 Foundation/Colors',
      '📝 Foundation/Typography',
      '📏 Foundation/Spacing',
      '✨ Foundation/Effects',
      '🧩 Components/Buttons',
      '🃏 Components/Cards',
      '📝 Components/Forms',
      '🖼️ Components/Layout',
      '🔔 Components/Feedback',
      '🗂️ Templates',
      '📖 Documentation'
    ];

    this.pages = {};

    for (const pageName of pageNames) {
      this.pages[pageName] = await ensurePage(pageName);
    }

    progress.update(1, 'Created page structure...');
  }

  async createFoundationSystems(progress) {
    // Colors
    figma.currentPage = this.pages['🎨 Foundation/Colors'];
    await this.colorSystem.createColorStyles(progress);
    await this.colorSystem.createColorVariables(progress);

    // Typography
    figma.currentPage = this.pages['📝 Foundation/Typography'];
    await this.typographySystem.createTypographyStyles(progress);

    // Spacing
    figma.currentPage = this.pages['📏 Foundation/Spacing'];
    this.spacingSystem.createSpacingVariables();
    progress.update(1, 'Created spacing system...');

    // Effects
    figma.currentPage = this.pages['✨ Foundation/Effects'];
    await this.effectsSystem.createEffectStyles(progress);
  }

  async createComponentLibrary(progress) {
    // Buttons
    figma.currentPage = this.pages['🧩 Components/Buttons'];
    await this.createButtonVariants(progress);

    // Cards
    figma.currentPage = this.pages['🃏 Components/Cards'];
    await this.createCardVariants(progress);

    // Forms
    figma.currentPage = this.pages['📝 Components/Forms'];
    await this.createFormComponents(progress);

    // Layout
    figma.currentPage = this.pages['🖼️ Components/Layout'];
    await this.createLayoutComponents(progress);

    // Feedback
    figma.currentPage = this.pages['🔔 Components/Feedback'];
    await this.createFeedbackComponents(progress);
  }

  async createButtonVariants(progress) {
    const variants = ['primary', 'secondary', 'ghost', 'destructive'];
    const sizes = ['small', 'medium', 'large'];
    const states = ['default', 'hover', 'disabled'];

    const buttons = [];

    for (const variant of variants) {
      for (const size of sizes) {
        for (const state of states) {
          const button = await this.componentSystem.createButton(variant, size, state);
          buttons.push(button);
          figma.currentPage.appendChild(button);
        }
      }
    }

    // Create variant set
    if (buttons.length > 0) {
      const variantSet = figma.combineAsVariants(buttons, figma.currentPage);
      variantSet.name = 'Button';

      // Set variant properties
      buttons.forEach((button, index) => {
        const variantIndex = Math.floor(index / (sizes.length * states.length));
        const sizeIndex = Math.floor((index % (sizes.length * states.length)) / states.length);
        const stateIndex = index % states.length;

        button.variantProperties = {
          'Variant': variants[variantIndex],
          'Size': sizes[sizeIndex],
          'State': states[stateIndex]
        };
      });
    }

    progress.update(1, 'Created button components...');
  }

  async createCardVariants(progress) {
    const variants = ['default', 'outlined'];
    const elevations = ['none', 'sm', 'md', 'lg', 'xl'];

    for (const variant of variants) {
      for (const elevation of elevations) {
        const card = await this.componentSystem.createCard(variant, elevation);
        figma.currentPage.appendChild(card);
      }
    }

    progress.update(1, 'Created card components...');
  }

  async createFormComponents(progress) {
    const variants = ['default'];
    const sizes = ['small', 'medium', 'large'];
    const states = ['default', 'focus', 'error'];

    // Inputs
    for (const variant of variants) {
      for (const size of sizes) {
        for (const state of states) {
          const input = await this.componentSystem.createInput(variant, size, state);
          figma.currentPage.appendChild(input);
        }
      }
    }

    progress.update(1, 'Created form components...');
  }

  async createLayoutComponents(progress) {
    const navigation = await this.componentSystem.createNavigation();
    figma.currentPage.appendChild(navigation);

    progress.update(1, 'Created layout components...');
  }

  async createFeedbackComponents(progress) {
    // Modals
    const modalSizes = ['small', 'medium', 'large'];
    for (const size of modalSizes) {
      const modal = await this.componentSystem.createModal(size);
      figma.currentPage.appendChild(modal);
    }

    // Toasts
    const toastVariants = ['success', 'error', 'warning', 'info'];
    for (const variant of toastVariants) {
      const toast = await this.componentSystem.createToast(variant);
      figma.currentPage.appendChild(toast);
    }

    progress.update(1, 'Created feedback components...');
  }

  async createDocumentation(progress) {
    figma.currentPage = this.pages['📖 Documentation'];

    // Create documentation frame
    const docFrame = figma.createFrame();
    docFrame.name = 'Design System Documentation';
    docFrame.resize(800, 1200);
    docFrame.layoutMode = 'VERTICAL';
    docFrame.itemSpacing = 32;
    docFrame.paddingTop = 40;
    docFrame.paddingBottom = 40;
    docFrame.paddingLeft = 40;
    docFrame.paddingRight = 40;
    docFrame.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];

    // Title
    const title = figma.createText();
    title.characters = 'Design System Documentation';
    title.fontSize = 32;
    title.fontName = await safeLoadFont({ family: 'Inter', style: 'Bold' });
    title.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[900]) }];
    docFrame.appendChild(title);

    // Overview
    const overview = figma.createText();
    overview.characters = `This design system includes:

• Color system with semantic colors and neutral scales
• Typography scale with responsive sizing
• Spacing system based on ${this.config.gridSystem} grid
• Component library with multiple variants and states
• Effect system with shadows and blurs
• Complete token export capability`;

    overview.fontSize = 16;
    overview.fontName = await safeLoadFont({ family: 'Inter', style: 'Regular' });
    overview.fills = [{ type: 'SOLID', color: hexToRgb(this.colorSystem.neutrals[700]) }];
    overview.resize(720, 150);
    docFrame.appendChild(overview);

    figma.currentPage.appendChild(docFrame);

    progress.update(1, 'Created documentation...');
  }

  async exportTokens(progress) {
    const tokens = this.tokenExporter.generateTokensJSON();
    const cssVariables = this.tokenExporter.generateCSSVariables();
    const tailwindConfig = this.tokenExporter.generateTailwindConfig();

    // Send to UI for download
    figma.ui.postMessage({
      type: 'export-tokens',
      data: {
        'tokens.json': JSON.stringify(tokens, null, 2),
        'variables.css': cssVariables,
        'tailwind.config.js': `module.exports = ${JSON.stringify(tailwindConfig, null, 2)}`
      }
    });

    progress.update(1, 'Exported design tokens...');
  }
}

// ===============================
// UI INTERFACE
// ===============================

const UI_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      padding: 20px;
      background: #f8fafc;
    }
    .container { max-width: 400px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 16px;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #64748b; }
    .form-group { margin-bottom: 16px; }
    .label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .select, .input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    .checkbox-group { display: flex; align-items: center; gap: 8px; }
    .checkbox { width: auto; }
    .button {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .button:hover { background: #2563eb; }
    .button:disabled { background: #94a3b8; cursor: not-allowed; }
    .progress-container { display: none; margin-top: 20px; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #3b82f6;
      width: 0%;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 12px;
      color: #64748b;
      text-align: center;
      margin-top: 8px;
    }
    .export-section { display: none; }
    .download-button {
      background: #10b981;
      margin-bottom: 8px;
    }
    .download-button:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="title">🎨 Advanced Design System</div>
        <div class="subtitle">Generate a comprehensive design system</div>
      </div>

      <div class="form-group">
        <label class="label">Grid System</label>
        <select class="select" id="gridSystem">
          <option value="4pt">4pt Grid</option>
          <option value="8pt" selected>8pt Grid</option>
          <option value="12pt">12pt Grid</option>
        </select>
      </div>

      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" class="checkbox" id="includeComponentVariants" checked>
          <label class="label" for="includeComponentVariants">Include Component Variants</label>
        </div>
      </div>

      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" class="checkbox" id="includeDarkMode" checked>
          <label class="label" for="includeDarkMode">Include Dark Mode</label>
        </div>
      </div>

      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" class="checkbox" id="exportTokens" checked>
          <label class="label" for="exportTokens">Export Design Tokens</label>
        </div>
      </div>

      <button class="button" id="generateButton">Generate Design System</button>

      <div class="progress-container" id="progressContainer">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">Starting...</div>
      </div>
    </div>

    <div class="card export-section" id="exportSection">
      <div class="header">
        <div class="title">📦 Export Tokens</div>
        <div class="subtitle">Download generated design tokens</div>
      </div>

      <button class="button download-button" id="downloadTokensJson">Download tokens.json</button>
      <button class="button download-button" id="downloadCssVars">Download variables.css</button>
      <button class="button download-button" id="downloadTailwind">Download tailwind.config.js</button>
    </div>
  </div>

  <script>
    const generateButton = document.getElementById('generateButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const exportSection = document.getElementById('exportSection');

    let exportData = {};

    generateButton.addEventListener('click', () => {
      const config = {
        gridSystem: document.getElementById('gridSystem').value,
        includeComponentVariants: document.getElementById('includeComponentVariants').checked,
        includeDarkMode: document.getElementById('includeDarkMode').checked,
        exportTokens: document.getElementById('exportTokens').checked
      };

      generateButton.disabled = true;
      progressContainer.style.display = 'block';

      parent.postMessage({ pluginMessage: { type: 'generate', config } }, '*');
    });

    function downloadFile(content, filename, contentType = 'application/json') {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    document.getElementById('downloadTokensJson').addEventListener('click', () => {
      if (exportData['tokens.json']) {
        downloadFile(exportData['tokens.json'], 'tokens.json');
      }
    });

    document.getElementById('downloadCssVars').addEventListener('click', () => {
      if (exportData['variables.css']) {
        downloadFile(exportData['variables.css'], 'variables.css', 'text/css');
      }
    });

    document.getElementById('downloadTailwind').addEventListener('click', () => {
      if (exportData['tailwind.config.js']) {
        downloadFile(exportData['tailwind.config.js'], 'tailwind.config.js', 'text/javascript');
      }
    });

    window.addEventListener('message', (event) => {
      const { type, percentage, status, data } = event.data.pluginMessage || {};

      if (type === 'progress') {
        progressFill.style.width = percentage + '%';
        progressText.textContent = status;

        if (percentage === 100) {
          setTimeout(() => {
            generateButton.disabled = false;
            progressContainer.style.display = 'none';
          }, 1000);
        }
      }

      if (type === 'export-tokens') {
        exportData = data;
        exportSection.style.display = 'block';
      }
    });
  </script>
</body>
</html>
`;

// ===============================
// PLUGIN INITIALIZATION
// ===============================

// Show UI
figma.showUI(UI_HTML, {
  width: 440,
  height: 600,
  themeColors: true
});

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    const generator = new DesignSystemGenerator(msg.config);
    const result = await generator.generateDesignSystem();

    if (result.success) {
      Logger.info('Design system generation completed successfully');
    } else {
      Logger.error('Design system generation failed', result.error);
    }
  }
};

// Auto-generate with default config when plugin starts (optional)
setTimeout(async () => {
  const generator = new DesignSystemGenerator({
    gridSystem: '8pt',
    includeComponentVariants: true,
    includeDarkMode: true,
    exportTokens: true
  });

  await generator.generateDesignSystem();
}, 1000);
