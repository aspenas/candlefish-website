#!/usr/bin/env node
/**
 * Generate MANIFEST.json for the latest branding archive.
 * Usage: node Branding/generate-archive-manifest.js
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(REPO_ROOT, 'ARCHIVE');

function getLatestBrandingArchive() {
  if (!fs.existsSync(ARCHIVE_DIR)) return null;
  const entries = fs
    .readdirSync(ARCHIVE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('branding-'))
    .map((e) => e.name)
    .sort()
    .reverse();
  return entries[0] ? path.join(ARCHIVE_DIR, entries[0]) : null;
}

function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(current, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function main() {
  const latest = getLatestBrandingArchive();
  if (!latest) {
    console.error('No branding archive found');
    process.exit(1);
  }
  const files = walkFiles(latest).map((p) => p.replace(REPO_ROOT + path.sep, ''));
  const manifest = {
    archive: path.basename(latest),
    createdAt: new Date().toISOString(),
    count: files.length,
    paths: files,
  };
  const manifestPath = path.join(latest, 'MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest to', manifestPath);
}

main();
