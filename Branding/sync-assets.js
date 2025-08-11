#!/usr/bin/env node
/**
 * Branding asset sync script
 * - Reads Branding/brand.config.json
 * - Copies assets from Branding/assets to distribution targets
 * - Skips destructive actions when sources are empty (keeps placeholders)
 *
 * Usage:
 *   node Branding/sync-assets.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BRAND_DIR = path.resolve(__dirname);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');

function log(step, message) {
  const tag = step.padEnd(10);
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${message}`);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function ensureDir(dirPath) {
  if (DRY_RUN) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function listDirEntries(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_) {
    return [];
  }
}

function hasRealContent(dirPath) {
  const entries = listDirEntries(dirPath);
  return entries.some((e) => !e.name.startsWith('.') && e.name !== '.gitkeep');
}

function copyFile(srcFile, destFile) {
  if (DRY_RUN) {
    log('COPY', `${srcFile} -> ${destFile}`);
    return;
  }
  ensureDir(path.dirname(destFile));
  fs.copyFileSync(srcFile, destFile);
}

function copyDir(srcDir, destDir) {
  const entries = listDirEntries(srcDir);
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath);
    }
  }
}

function main() {
  const configPath = path.join(BRAND_DIR, 'brand.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }
  const config = readJson(configPath);

  const assetsRoot = path.join(BRAND_DIR, 'assets');
  const distDir = path.join(BRAND_DIR, 'dist');
  const distBrandCss = path.join(distDir, 'brand.css');
  const logoSvgDir = path.join(assetsRoot, 'logo', 'svg');
  const logoRasterDir = path.join(assetsRoot, 'logo', 'raster');
  const fontsDir = path.join(assetsRoot, 'fonts');

  const hasSvg = hasRealContent(logoSvgDir);
  const hasRaster = hasRealContent(logoRasterDir);
  const hasFonts = hasRealContent(fontsDir);

  log('CONFIG', `brand=${config.activeBrand}`);
  log('CONFIG', `targets=${(config.distributionTargets || []).length}`);
  log('ASSETS', `svg=${hasSvg} raster=${hasRaster} fonts=${hasFonts}`);

  if (!hasSvg && !hasRaster && !hasFonts) {
    log('SKIP', 'No source assets found. Keeping existing placeholders.');
    return;
  }

  for (const relTarget of config.distributionTargets || []) {
    const absTarget = path.join(REPO_ROOT, relTarget);
    const targetLogoRoot = absTarget; // relTarget should point to .../public/logo
    const targetSvgDir = path.join(targetLogoRoot, 'svg');
    const targetRasterDir = targetLogoRoot; // raster files go directly under logo/
    const targetPublicDir = path.dirname(targetLogoRoot);
    const targetFontsDir = path.join(targetPublicDir, 'fonts');
    const targetBrandCss = path.join(targetPublicDir, 'brand.css');

    log('TARGET', absTarget);
    ensureDir(absTarget);

    if (hasSvg) {
      log('COPY', `SVG -> ${targetSvgDir}`);
      copyDir(logoSvgDir, targetSvgDir);
    }

    if (hasRaster) {
      log('COPY', `Raster -> ${targetRasterDir}`);
      copyDir(logoRasterDir, targetRasterDir);
    }

    if (hasFonts) {
      log('COPY', `Fonts -> ${targetFontsDir}`);
      copyDir(fontsDir, targetFontsDir);
    }

    if (fs.existsSync(distBrandCss)) {
      log('COPY', `brand.css -> ${targetBrandCss}`);
      copyFile(distBrandCss, targetBrandCss);
    }
  }

  log('DONE', DRY_RUN ? 'Dry-run complete' : 'Assets synced');
}

try {
  main();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
}
