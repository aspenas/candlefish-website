#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../package.json');

let packageJson;
try {
  const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split('.');
const major = parseInt(semver[0]);

if (major < 18) {
  console.error('You are running Node ' + currentNodeVersion + '.');
  console.error('Create Candlefish Dashboard requires Node 18 or higher.');
  console.error('Please update your version of Node.');
  process.exit(1);
}

// Dynamic import to support ES modules
import('../dist/index.js')
  .then(({ main }) => main())
  .catch((error) => {
    console.error('Error launching create-dashboard:', error.message);
    process.exit(1);
  });
