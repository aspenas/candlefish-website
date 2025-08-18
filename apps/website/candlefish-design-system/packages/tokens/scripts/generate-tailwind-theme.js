#!/usr/bin/env node

/**
 * Generates Tailwind theme configuration from Style Dictionary tokens
 * This bridges the design tokens to Tailwind's theme structure
 */

const fs = require('fs');
const path = require('path');

// Load the generated tokens from Style Dictionary
const tokensPath = path.join(__dirname, '..', 'build', 'web', 'json', 'tokens.json');

// Check if tokens exist
if (!fs.existsSync(tokensPath)) {
  console.error('❌ Tokens not found. Run "npm run build:sd" first.');
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// Transform tokens into Tailwind theme structure
const theme = {
  colors: {
    // Brand colors
    charcoal: tokens['color-charcoal'] || '#1A1A1A',
    'warm-white': tokens['color-warm-white'] || '#FAFAF8',
    amber: {
      flame: tokens['color-amber-flame'] || '#FFB347'
    },
    indigo: {
      deep: tokens['color-deep-indigo'] || '#3A3A60'
    },
    slate: {
      DEFAULT: tokens['color-slate-gray'] || '#6B6B6B'
    },
    sand: {
      muted: tokens['color-muted-sand'] || '#D8D3C4'
    }
  },

  fontFamily: {
    display: tokens['typography-font-family-display']?.split(',').map(f => f.trim()) || ['Tiempos', 'Georgia', 'serif'],
    sans: tokens['typography-font-family-sans']?.split(',').map(f => f.trim()) || ['Inter', 'system-ui', 'sans-serif'],
    mono: tokens['typography-font-family-mono']?.split(',').map(f => f.trim()) || ['SF Mono', 'Monaco', 'monospace']
  },

  fontSize: {
    xs: tokens['typography-font-size-xs'] || '12px',
    sm: tokens['typography-font-size-sm'] || '14px',
    base: tokens['typography-font-size-base'] || '16px',
    lg: tokens['typography-font-size-lg'] || '18px',
    xl: tokens['typography-font-size-xl'] || '20px',
    '2xl': tokens['typography-font-size-2xl'] || '24px',
    '3xl': tokens['typography-font-size-3xl'] || '28px',
    '4xl': tokens['typography-font-size-4xl'] || '32px',
    '5xl': tokens['typography-font-size-5xl'] || '36px',
    '6xl': tokens['typography-font-size-6xl'] || '48px',
    '7xl': tokens['typography-font-size-7xl'] || '60px',
    '8xl': tokens['typography-font-size-8xl'] || '72px',

    // Semantic sizes with line heights
    display: [tokens['typography-font-size-8xl'] || '72px', {
      lineHeight: '1.1',
      letterSpacing: tokens['typography-letter-spacing-tighter'] || '-0.02em',
      fontWeight: '700'
    }],
    heading: [tokens['typography-font-size-3xl'] || '28px', {
      lineHeight: '1.3',
      letterSpacing: tokens['typography-letter-spacing-tight'] || '-0.01em',
      fontWeight: '600'
    }],
    body: [tokens['typography-font-size-base'] || '16px', {
      lineHeight: '1.5',
      letterSpacing: tokens['typography-letter-spacing-normal'] || '0'
    }],
    caption: [tokens['typography-font-size-xs'] || '12px', {
      lineHeight: '1.4',
      fontWeight: '500'
    }]
  },

  fontWeight: {
    regular: tokens['typography-font-weight-regular'] || '400',
    medium: tokens['typography-font-weight-medium'] || '500',
    semibold: tokens['typography-font-weight-semibold'] || '600',
    bold: tokens['typography-font-weight-bold'] || '700'
  },

  lineHeight: {
    tight: tokens['typography-line-height-tight'] || '1.2',
    normal: tokens['typography-line-height-normal'] || '1.5',
    relaxed: tokens['typography-line-height-relaxed'] || '1.75',
    loose: tokens['typography-line-height-loose'] || '2'
  },

  letterSpacing: {
    tighter: tokens['typography-letter-spacing-tighter'] || '-0.02em',
    tight: tokens['typography-letter-spacing-tight'] || '-0.01em',
    normal: tokens['typography-letter-spacing-normal'] || '0',
    wide: tokens['typography-letter-spacing-wide'] || '0.01em'
  },

  spacing: {
    0: tokens['spacing-0'] || '0px',
    1: tokens['spacing-1'] || '4px',
    2: tokens['spacing-2'] || '8px',
    3: tokens['spacing-3'] || '12px',
    4: tokens['spacing-4'] || '16px',
    5: tokens['spacing-5'] || '20px',
    6: tokens['spacing-6'] || '24px',
    8: tokens['spacing-8'] || '32px',
    10: tokens['spacing-10'] || '40px',
    12: tokens['spacing-12'] || '48px',
    14: tokens['spacing-14'] || '56px',
    16: tokens['spacing-16'] || '64px',
    20: tokens['spacing-20'] || '80px',
    24: tokens['spacing-24'] || '96px',
    30: tokens['spacing-30'] || '120px',
    40: tokens['spacing-40'] || '160px'
  },

  borderRadius: {
    none: tokens['border-radius-none'] || '0px',
    sm: tokens['border-radius-sm'] || '4px',
    DEFAULT: tokens['border-radius-base'] || '8px',
    md: tokens['border-radius-md'] || '12px',
    lg: tokens['border-radius-lg'] || '16px',
    xl: tokens['border-radius-xl'] || '24px',
    '2xl': tokens['border-radius-2xl'] || '32px',
    full: tokens['border-radius-full'] || '999px'
  },

  boxShadow: {
    xs: tokens['box-shadow-xs'] || '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: tokens['box-shadow-sm'] || '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
    DEFAULT: tokens['box-shadow-base'] || '0 4px 8px 0 rgba(0, 0, 0, 0.10)',
    md: tokens['box-shadow-md'] || '0 8px 16px 0 rgba(0, 0, 0, 0.12)',
    lg: tokens['box-shadow-lg'] || '0 16px 32px 0 rgba(0, 0, 0, 0.15)',
    xl: tokens['box-shadow-xl'] || '0 24px 48px 0 rgba(0, 0, 0, 0.18)',
    none: 'none'
  },

  screens: {
    sm: tokens['breakpoint-sm'] || '640px',
    md: tokens['breakpoint-md'] || '768px',
    lg: tokens['breakpoint-lg'] || '1024px',
    xl: tokens['breakpoint-xl'] || '1280px',
    '2xl': tokens['breakpoint-2xl'] || '1536px'
  }
};

// Write the theme to a file
const outDir = path.join(__dirname, '..', 'build', 'tailwind');
fs.mkdirSync(outDir, { recursive: true });

const output = `/**
 * Candlefish Tailwind Theme
 * Auto-generated from design tokens
 * Generated: ${new Date().toISOString()}
 */

module.exports = ${JSON.stringify(theme, null, 2)};
`;

fs.writeFileSync(
  path.join(outDir, 'theme.js'),
  output,
  'utf8'
);

console.log('✅ Tailwind theme generated at build/tailwind/theme.js');

// Also generate a components file with semantic classes
const componentsOutput = `/**
 * Candlefish Tailwind Components
 * Semantic component classes using design tokens
 */

const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addComponents, theme }) {
  addComponents({
    '.btn-primary': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme('colors.amber.flame'),
      color: theme('colors.charcoal'),
      borderRadius: theme('borderRadius.DEFAULT'),
      paddingLeft: theme('spacing.6'),
      paddingRight: theme('spacing.6'),
      paddingTop: theme('spacing.3'),
      paddingBottom: theme('spacing.3'),
      fontSize: theme('fontSize.sm'),
      fontWeight: theme('fontWeight.medium'),
      transition: 'all 0.2s',
      '&:hover': {
        opacity: '0.9',
        transform: 'translateY(-1px)'
      },
      '&:disabled': {
        opacity: '0.5',
        cursor: 'not-allowed'
      }
    },

    '.btn-secondary': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme('colors.charcoal'),
      color: theme('colors.warm-white'),
      borderRadius: theme('borderRadius.DEFAULT'),
      paddingLeft: theme('spacing.6'),
      paddingRight: theme('spacing.6'),
      paddingTop: theme('spacing.3'),
      paddingBottom: theme('spacing.3'),
      fontSize: theme('fontSize.sm'),
      fontWeight: theme('fontWeight.medium'),
      transition: 'all 0.2s',
      '&:hover': {
        opacity: '0.9',
        transform: 'translateY(-1px)'
      },
      '&:disabled': {
        opacity: '0.5',
        cursor: 'not-allowed'
      }
    },

    '.card-case': {
      backgroundColor: theme('colors.warm-white'),
      border: \`1px solid \${theme('colors.slate.DEFAULT')}\`,
      borderRadius: theme('borderRadius.md'),
      boxShadow: theme('boxShadow.DEFAULT'),
      padding: theme('spacing.6'),
      transition: 'all 0.2s',
      '&:hover': {
        boxShadow: theme('boxShadow.md'),
        transform: 'translateY(-2px)'
      }
    },

    '.text-display': {
      fontFamily: theme('fontFamily.display').join(', '),
      fontSize: theme('fontSize.display[0]'),
      lineHeight: theme('fontSize.display[1].lineHeight'),
      letterSpacing: theme('fontSize.display[1].letterSpacing'),
      fontWeight: theme('fontSize.display[1].fontWeight')
    },

    '.text-heading': {
      fontFamily: theme('fontFamily.sans').join(', '),
      fontSize: theme('fontSize.heading[0]'),
      lineHeight: theme('fontSize.heading[1].lineHeight'),
      letterSpacing: theme('fontSize.heading[1].letterSpacing'),
      fontWeight: theme('fontSize.heading[1].fontWeight')
    },

    '.text-body': {
      fontFamily: theme('fontFamily.sans').join(', '),
      fontSize: theme('fontSize.body[0]'),
      lineHeight: theme('fontSize.body[1].lineHeight'),
      letterSpacing: theme('fontSize.body[1].letterSpacing')
    },

    '.text-caption': {
      fontFamily: theme('fontFamily.sans').join(', '),
      fontSize: theme('fontSize.caption[0]'),
      lineHeight: theme('fontSize.caption[1].lineHeight'),
      fontWeight: theme('fontSize.caption[1].fontWeight')
    }
  });
});
`;

fs.writeFileSync(
  path.join(outDir, 'components.js'),
  componentsOutput,
  'utf8'
);

console.log('✅ Tailwind components generated at build/tailwind/components.js');
