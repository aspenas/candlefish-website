#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting bundle analysis...\n');

// Build with analysis
console.log('📦 Building with bundle analyzer...');
exec('ANALYZE=true npm run build:analyze', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Build failed: ${error}`);
    return;
  }

  console.log('✅ Build completed successfully\n');

  // Read Next.js build output
  const buildManifest = path.join(__dirname, '../.next/build-manifest.json');
  const appBuildManifest = path.join(__dirname, '../.next/app-build-manifest.json');
  
  if (fs.existsSync(buildManifest)) {
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    analyzeBuildManifest(manifest);
  }

  // Analyze chunk sizes
  const chunksPath = path.join(__dirname, '../.next/static/chunks');
  if (fs.existsSync(chunksPath)) {
    analyzeChunkSizes(chunksPath);
  }

  // Check for bundle analysis report
  const analysisReport = path.join(__dirname, '../bundle-analysis.html');
  if (fs.existsSync(analysisReport)) {
    console.log(`\n📊 Bundle analysis report generated: ${analysisReport}`);
    console.log('   Open this file in a browser to view the interactive bundle visualization\n');
  }

  // Performance recommendations
  generateRecommendations();
});

function analyzeBuildManifest(manifest) {
  console.log('📋 Build Manifest Analysis:');
  console.log('─'.repeat(50));
  
  const pages = Object.keys(manifest.pages || {});
  console.log(`Total pages: ${pages.length}`);
  
  // Analyze page bundles
  pages.forEach(page => {
    const bundles = manifest.pages[page];
    const totalSize = bundles.reduce((sum, bundle) => {
      const filePath = path.join(__dirname, '../.next', bundle);
      if (fs.existsSync(filePath)) {
        return sum + fs.statSync(filePath).size;
      }
      return sum;
    }, 0);
    
    if (totalSize > 200000) { // Flag pages over 200KB
      console.log(`⚠️  ${page}: ${(totalSize / 1024).toFixed(2)}KB`);
    }
  });
}

function analyzeChunkSizes(chunksPath) {
  console.log('\n📦 Chunk Size Analysis:');
  console.log('─'.repeat(50));
  
  const files = fs.readdirSync(chunksPath);
  const chunks = files
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const stats = fs.statSync(path.join(chunksPath, file));
      return {
        name: file,
        size: stats.size,
      };
    })
    .sort((a, b) => b.size - a.size);

  let totalSize = 0;
  const largeChunks = [];
  
  chunks.forEach((chunk, index) => {
    totalSize += chunk.size;
    const sizeKB = (chunk.size / 1024).toFixed(2);
    
    if (chunk.size > 150000) { // Flag chunks over 150KB
      largeChunks.push(chunk);
      console.log(`❗ ${chunk.name}: ${sizeKB}KB`);
    } else if (index < 10) { // Show top 10 chunks
      console.log(`   ${chunk.name}: ${sizeKB}KB`);
    }
  });

  console.log(`\nTotal chunks: ${chunks.length}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Average chunk size: ${(totalSize / chunks.length / 1024).toFixed(2)}KB`);
  console.log(`Large chunks (>150KB): ${largeChunks.length}`);
  
  // Calculate metrics
  const metrics = {
    totalBundleSize: totalSize,
    largestChunk: chunks[0] ? chunks[0].size : 0,
    chunkCount: chunks.length,
    largeChunkCount: largeChunks.length,
  };
  
  // Save metrics
  fs.writeFileSync(
    path.join(__dirname, '../bundle-metrics.json'),
    JSON.stringify(metrics, null, 2)
  );
}

function generateRecommendations() {
  console.log('\n💡 Performance Recommendations:');
  console.log('─'.repeat(50));
  
  const recommendations = [
    {
      issue: 'Large bundle size',
      solution: 'Use dynamic imports for heavy components',
      impact: 'High',
    },
    {
      issue: 'Duplicate dependencies',
      solution: 'Check for multiple versions of the same package',
      impact: 'Medium',
    },
    {
      issue: 'Unoptimized images',
      solution: 'Use Next.js Image component with optimization',
      impact: 'High',
    },
    {
      issue: 'Large third-party libraries',
      solution: 'Consider lighter alternatives or tree-shaking',
      impact: 'High',
    },
    {
      issue: 'Unused code',
      solution: 'Remove dead code and unused exports',
      impact: 'Medium',
    },
  ];
  
  recommendations.forEach(rec => {
    console.log(`\n${rec.impact === 'High' ? '🔴' : '🟡'} ${rec.issue}`);
    console.log(`   Solution: ${rec.solution}`);
    console.log(`   Impact: ${rec.impact}`);
  });
  
  console.log('\n✨ Run "npm run build:analyze" to generate a detailed bundle report');
}

// Package size analysis
function analyzePackageSizes() {
  console.log('\n📚 Package Size Analysis:');
  console.log('─'.repeat(50));
  
  const packageJson = require('../package.json');
  const dependencies = Object.keys(packageJson.dependencies || {});
  
  const heavyPackages = [
    '@apollo/client',
    '@sentry/nextjs',
    'chart.js',
    'exceljs',
    'mathjs',
    '@react-pdf/renderer',
    'framer-motion',
    'jsforce',
  ];
  
  console.log('Heavy packages detected:');
  heavyPackages.forEach(pkg => {
    if (dependencies.includes(pkg)) {
      console.log(`   ⚠️  ${pkg}`);
    }
  });
  
  console.log('\nConsider lazy loading these packages or finding lighter alternatives.');
}

analyzePackageSizes();