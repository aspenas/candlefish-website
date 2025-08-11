#!/usr/bin/env node
/**
 * Generate CSS variables from Branding/tokens/*.json
 * Output: Branding/dist/brand.css
 */
const fs = require('fs');
const path = require('path');

const BRAND_DIR = __dirname;
const TOKENS_DIR = path.join(BRAND_DIR, 'tokens');
const DIST_DIR = path.join(BRAND_DIR, 'dist');
const OUT_FILE = path.join(DIST_DIR, 'brand.css');

function loadTokens(file) {
  const p = path.join(TOKENS_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toKebabCase(key) {
  return key.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
}

function emitVarsFromObject(prefix, obj, lines) {
  for (const [k, v] of Object.entries(obj)) {
    const name = `--${prefix}-${toKebabCase(k)}`;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      emitVarsFromObject(`${prefix}-${toKebabCase(k)}`, v, lines);
    } else {
      lines.push(`  ${name}: ${v};`);
    }
  }
}

function main() {
  const colors = loadTokens('colors.json') || {};
  const typography = loadTokens('typography.json') || {};
  const components = loadTokens('components.json') || {};

  const lines = [];
  lines.push(':root {');
  if (colors.palette) emitVarsFromObject('brand-color', colors.palette, lines);
  if (typography.fontFamilies) emitVarsFromObject('brand-font-family', typography.fontFamilies, lines);
  if (typography.fontSizes) emitVarsFromObject('brand-font-size', typography.fontSizes, lines);
  if (typography.lineHeights) emitVarsFromObject('brand-line-height', typography.lineHeights, lines);
  if (components.logo) emitVarsFromObject('brand-logo', components.logo, lines);
  lines.push('}');

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n');
  // eslint-disable-next-line no-console
  console.log('Wrote', OUT_FILE);
}

main();
