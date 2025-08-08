#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Copy protected family documents to the build output
 * This ensures they are included in the Netlify deployment
 */

const SOURCE_DIR = path.resolve(__dirname, '../../../public/docs/privileged/family');
const TARGET_DIR = path.resolve(__dirname, '../dist/docs/privileged/family');

console.log('📁 Copying protected family documents...');
console.log(`   Source: ${SOURCE_DIR}`);
console.log(`   Target: ${TARGET_DIR}`);

// Ensure target directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ Created directory: ${dir}`);
  }
}

// Copy file with error handling
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    const stats = fs.statSync(dest);
    console.log(`   ✅ Copied: ${path.basename(src)} (${(stats.size / 1024).toFixed(1)}KB)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to copy ${path.basename(src)}: ${error.message}`);
    return false;
  }
}

// Copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`   ⚠️  Source directory not found: ${src}`);
    return false;
  }

  ensureDir(dest);

  const items = fs.readdirSync(src);
  let successCount = 0;
  let totalCount = 0;

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (item === '__tests__' || item === 'node_modules' || item.startsWith('.')) {
        console.log(`   ⏭️  Skipping directory: ${item}`);
        continue;
      }

      console.log(`   📁 Processing directory: ${item}`);
      copyDirectory(srcPath, destPath);
    } else {
      // Skip certain file types
      if (item.endsWith('.md') || item.endsWith('.log') || item.startsWith('.')) {
        console.log(`   ⏭️  Skipping file: ${item}`);
        continue;
      }

      totalCount++;
      if (copyFile(srcPath, destPath)) {
        successCount++;
      }
    }
  }

  return { successCount, totalCount };
}

// Main execution
try {
  console.log('\n🚀 Starting protected documents copy process...\n');

  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    console.error('   Make sure the family documents are in the correct location.');
    process.exit(1);
  }

  // Create base target directory
  ensureDir(path.dirname(TARGET_DIR));

  // Copy all files and directories
  const result = copyDirectory(SOURCE_DIR, TARGET_DIR);

  if (result) {
    console.log(`\n✅ Copy completed successfully!`);
    console.log(`   Files copied: ${result.successCount}/${result.totalCount}`);

    // Verify critical files exist
    const criticalFiles = [
      'index.html',
      'secure-login.html',
      'secure-document-viewer.html',
      'candlefish_update_08032025_family.html'
    ];

    console.log('\n🔍 Verifying critical files...');
    let missingFiles = [];

    for (const file of criticalFiles) {
      const filePath = path.join(TARGET_DIR, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
      } else {
        console.log(`   ❌ ${file} - MISSING`);
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.error(`\n❌ Critical files missing: ${missingFiles.join(', ')}`);
      console.error('   Family portal may not function correctly.');
      process.exit(1);
    }

    // Create deployment manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      sourceDir: SOURCE_DIR,
      targetDir: TARGET_DIR,
      filesCount: result.totalCount,
      filesCopied: result.successCount,
      criticalFiles: criticalFiles.filter(file =>
        fs.existsSync(path.join(TARGET_DIR, file))
      ),
      buildHash: require('crypto')
        .createHash('md5')
        .update(JSON.stringify({ timestamp: Date.now(), files: criticalFiles }))
        .digest('hex')
        .substring(0, 8)
    };

    fs.writeFileSync(
      path.join(TARGET_DIR, 'deployment-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    console.log(`\n📋 Deployment manifest created:`);
    console.log(`   Build hash: ${manifest.buildHash}`);
    console.log(`   Files: ${manifest.filesCopied}/${manifest.filesCount}`);
    console.log(`   Target: ${TARGET_DIR}/deployment-manifest.json`);

  } else {
    console.error('\n❌ Copy process failed');
    process.exit(1);
  }

} catch (error) {
  console.error('\n💥 Copy script failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('\n🎉 Protected documents copy completed successfully!\n');
