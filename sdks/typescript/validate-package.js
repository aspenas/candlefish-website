#!/usr/bin/env node

/**
 * Package validation script for @candlefish/claude-config
 * 
 * This script validates that the package is correctly built and ready for publishing
 */

const fs = require('fs');
const path = require('path');

function validatePackage() {
  console.log('🧪 Validating @candlefish/claude-config package...\n');

  const errors = [];
  const warnings = [];

  // Check required files exist
  const requiredFiles = [
    'dist/index.js',
    'dist/index.esm.js',
    'dist/index.d.ts',
    'dist/hooks/index.js',
    'dist/hooks/index.esm.js',
    'dist/hooks/index.d.ts',
    'dist/utils/index.js',
    'dist/utils/index.esm.js',
    'dist/utils/index.d.ts',
    'package.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md'
  ];

  console.log('📁 Checking required files...');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      errors.push(`Missing required file: ${file}`);
      console.log(`  ❌ ${file}`);
    }
  });

  // Check package.json structure
  console.log('\n📦 Validating package.json...');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredFields = ['name', 'version', 'description', 'main', 'module', 'types', 'author', 'license', 'homepage', 'repository'];
  requiredFields.forEach(field => {
    if (pkg[field]) {
      console.log(`  ✅ ${field}: ${typeof pkg[field] === 'object' ? JSON.stringify(pkg[field]) : pkg[field]}`);
    } else {
      errors.push(`Missing package.json field: ${field}`);
      console.log(`  ❌ ${field}`);
    }
  });

  // Validate package name
  if (pkg.name !== '@candlefish/claude-config') {
    errors.push(`Incorrect package name: ${pkg.name} (expected: @candlefish/claude-config)`);
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+/.test(pkg.version)) {
    errors.push(`Invalid version format: ${pkg.version}`);
  }

  // Check SEO backlinks
  console.log('\n🔗 Validating SEO backlinks...');
  const expectedLinks = {
    homepage: 'https://candlefish.ai',
    'repository.url': 'https://github.com/candlefish-ai/claude-config.git',
    'author.url': 'https://candlefish.ai'
  };

  Object.entries(expectedLinks).forEach(([field, expected]) => {
    const actual = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], pkg)
      : pkg[field];
    
    if (actual === expected) {
      console.log(`  ✅ ${field}: ${actual}`);
    } else {
      warnings.push(`SEO backlink mismatch for ${field}: ${actual} (expected: ${expected})`);
      console.log(`  ⚠️  ${field}: ${actual} (expected: ${expected})`);
    }
  });

  // Check exports structure
  console.log('\n📤 Validating exports...');
  if (pkg.exports) {
    const expectedExports = ['.', './hooks', './utils'];
    expectedExports.forEach(exp => {
      if (pkg.exports[exp]) {
        console.log(`  ✅ export "${exp}"`);
        const exportData = pkg.exports[exp];
        if (exportData.import && exportData.require && exportData.types) {
          console.log(`    ✅ has import, require, and types`);
        } else {
          warnings.push(`Export "${exp}" missing some module formats`);
          console.log(`    ⚠️  missing some module formats`);
        }
      } else {
        errors.push(`Missing export: ${exp}`);
        console.log(`  ❌ export "${exp}"`);
      }
    });
  } else {
    errors.push('Missing exports field in package.json');
  }

  // Check file sizes (reasonable limits)
  console.log('\n📏 Checking bundle sizes...');
  const sizeChecks = [
    { file: 'dist/index.js', maxSize: 100 * 1024 }, // 100KB
    { file: 'dist/index.esm.js', maxSize: 100 * 1024 },
    { file: 'dist/hooks/index.js', maxSize: 50 * 1024 }, // 50KB
    { file: 'dist/utils/index.js', maxSize: 30 * 1024 }, // 30KB
  ];

  sizeChecks.forEach(({ file, maxSize }) => {
    if (fs.existsSync(file)) {
      const size = fs.statSync(file).size;
      const sizeKB = Math.round(size / 1024);
      const maxSizeKB = Math.round(maxSize / 1024);
      
      if (size <= maxSize) {
        console.log(`  ✅ ${file}: ${sizeKB}KB (limit: ${maxSizeKB}KB)`);
      } else {
        warnings.push(`Bundle size too large: ${file} is ${sizeKB}KB (limit: ${maxSizeKB}KB)`);
        console.log(`  ⚠️  ${file}: ${sizeKB}KB (limit: ${maxSizeKB}KB)`);
      }
    }
  });

  // Try to require the built package
  console.log('\n🔍 Testing package imports...');
  try {
    const mainModule = require('./dist/index.js');
    if (mainModule.CandlefishConfigClient) {
      console.log('  ✅ Main client class exports correctly');
    } else {
      errors.push('Main client class not exported correctly');
    }

    if (mainModule.createClientWithApiKey) {
      console.log('  ✅ Factory functions export correctly');
    } else {
      errors.push('Factory functions not exported correctly');
    }

    // Test hooks (if React is available)
    try {
      const hooksModule = require('./dist/hooks/index.js');
      if (hooksModule.useConfigProfile) {
        console.log('  ✅ React hooks export correctly');
      }
    } catch (e) {
      console.log('  ⚠️  React hooks not testable (React not installed)');
    }

    // Test utils
    const utilsModule = require('./dist/utils/index.js');
    if (utilsModule.validateProfile) {
      console.log('  ✅ Utility functions export correctly');
    } else {
      errors.push('Utility functions not exported correctly');
    }

  } catch (e) {
    errors.push(`Failed to import built package: ${e.message}`);
    console.log(`  ❌ Import test failed: ${e.message}`);
  }

  // Check TypeScript declarations
  console.log('\n🔷 Validating TypeScript declarations...');
  try {
    const indexDts = fs.readFileSync('dist/index.d.ts', 'utf8');
    if (indexDts.includes('CandlefishConfigClient') && 
        indexDts.includes('ConfigProfile') &&
        indexDts.includes('createClientWithApiKey')) {
      console.log('  ✅ Main type declarations present');
    } else {
      errors.push('Main type declarations incomplete');
    }
  } catch (e) {
    errors.push(`Failed to read type declarations: ${e.message}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 Package validation passed! Ready for publishing.');
    console.log('\n🚀 To publish this package:');
    console.log('   npm publish --access public');
    console.log('\n🔗 Package will be available at:');
    console.log('   https://www.npmjs.com/package/@candlefish/claude-config');
    return true;
  } else {
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} ERRORS found:`);
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} WARNINGS found:`);
      warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ Package validation FAILED. Fix errors before publishing.');
      return false;
    } else {
      console.log('\n✅ Package validation PASSED with warnings.');
      console.log('   Consider addressing warnings before publishing.');
      return true;
    }
  }
}

// Export for programmatic use
module.exports = { validatePackage };

// Run if called directly
if (require.main === module) {
  const success = validatePackage();
  process.exit(success ? 0 : 1);
}