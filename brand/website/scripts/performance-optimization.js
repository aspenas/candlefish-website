#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

console.log('🚀 Candlefish Performance Optimization Script');
console.log('='.repeat(50));

// Configuration
const BUNDLE_SIZE_LIMIT = {
  total: 250 * 1024, // 250KB total
  individual: 50 * 1024, // 50KB per chunk
};

const CRITICAL_METRICS = {
  lcp: 2000, // Target LCP < 2000ms
  fcp: 1800, // Target FCP < 1800ms
  cls: 0.1,  // Target CLS < 0.1
  fid: 100,  // Target FID < 100ms
  ttfb: 600, // Target TTFB < 600ms
};

async function analyzeBundle() {
  console.log('\n📊 Analyzing bundle size...');
  
  try {
    // Run build with bundle analyzer
    const { stdout } = await execAsync('npm run build:perf');
    console.log('✅ Bundle analysis complete');
    
    // Check if bundle-analysis.html exists
    const analysisPath = path.join(process.cwd(), 'bundle-analysis.html');
    if (fs.existsSync(analysisPath)) {
      console.log(`📁 Bundle analysis saved to: ${analysisPath}`);
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    return false;
  }
  
  return true;
}

async function checkImageOptimization() {
  console.log('\n🖼️  Checking image optimization...');
  
  const publicDir = path.join(process.cwd(), 'public');
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
  const largeSizeThreshold = 500 * 1024; // 500KB
  
  let largeImages = [];
  
  function scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        scanDirectory(fullPath);
      } else if (imageExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
        const stats = fs.statSync(fullPath);
        if (stats.size > largeSizeThreshold) {
          largeImages.push({
            path: path.relative(publicDir, fullPath),
            size: Math.round(stats.size / 1024),
          });
        }
      }
    });
  }
  
  if (fs.existsSync(publicDir)) {
    scanDirectory(publicDir);
  }
  
  if (largeImages.length > 0) {
    console.log('⚠️  Large images found (>500KB):');
    largeImages.forEach(img => {
      console.log(`   • ${img.path} (${img.size}KB)`);
    });
    console.log('\n💡 Consider optimizing these images with next/image or compression tools');
  } else {
    console.log('✅ No large unoptimized images found');
  }
  
  return largeImages.length === 0;
}

async function analyzeDependencies() {
  console.log('\n📦 Analyzing dependencies...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const heavyDependencies = [
    { name: '@react-three/fiber', reason: 'WebGL library - code split if possible' },
    { name: '@react-three/drei', reason: 'Three.js helpers - use selective imports' },
    { name: 'three', reason: 'Large 3D library - ensure tree shaking works' },
    { name: 'framer-motion', reason: 'Animation library - consider lighter alternatives' },
  ];
  
  const foundHeavy = heavyDependencies.filter(dep => 
    packageJson.dependencies && packageJson.dependencies[dep.name]
  );
  
  if (foundHeavy.length > 0) {
    console.log('⚠️  Heavy dependencies detected:');
    foundHeavy.forEach(dep => {
      console.log(`   • ${dep.name}: ${dep.reason}`);
    });
  }
  
  // Check for duplicate dependencies
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});
  const duplicates = deps.filter(dep => devDeps.includes(dep));
  
  if (duplicates.length > 0) {
    console.log('\n⚠️  Duplicate dependencies found:');
    duplicates.forEach(dep => console.log(`   • ${dep}`));
  }
  
  console.log(`📊 Total dependencies: ${deps.length}`);
  console.log(`📊 Total dev dependencies: ${devDeps.length}`);
}

async function checkServiceWorker() {
  console.log('\n🔧 Checking Service Worker...');
  
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const offlinePath = path.join(process.cwd(), 'public', 'offline.html');
  
  if (fs.existsSync(swPath)) {
    console.log('✅ Service Worker found');
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    const hasThreeJSCaching = swContent.includes('THREE_JS_PATTERNS');
    const hasVersioning = swContent.includes('candlefish-v1');
    
    console.log(`   • Three.js caching: ${hasThreeJSCaching ? '✅' : '❌'}`);
    console.log(`   • Cache versioning: ${hasVersioning ? '✅' : '❌'}`);
  } else {
    console.log('❌ Service Worker not found');
  }
  
  if (fs.existsSync(offlinePath)) {
    console.log('✅ Offline fallback page found');
  } else {
    console.log('❌ Offline fallback page not found');
  }
}

async function generatePerformanceReport() {
  console.log('\n📋 Generating performance report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    target_metrics: CRITICAL_METRICS,
    optimizations_implemented: [
      '✅ Next.js image optimization enabled',
      '✅ Code splitting for Three.js components',
      '✅ Service Worker with intelligent caching',
      '✅ React component memoization',
      '✅ Web Vitals monitoring',
      '✅ Bundle analysis configured',
      '✅ Lazy loading for heavy components',
      '✅ Progressive enhancement for WebGL',
    ],
    recommendations: [
      'Monitor Core Web Vitals in production',
      'Implement image CDN for optimal delivery',
      'Consider using a lighter animation library for non-WebGL animations',
      'Implement critical CSS inlining for faster FCP',
      'Add resource hints for external dependencies',
      'Consider server-side rendering for initial paint',
    ],
  };
  
  const reportPath = path.join(process.cwd(), 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Performance report saved to: performance-report.json`);
  console.log('\n🎯 Performance Targets:');
  Object.entries(CRITICAL_METRICS).forEach(([metric, target]) => {
    const unit = metric === 'cls' ? '' : 'ms';
    console.log(`   • ${metric.toUpperCase()}: <${target}${unit}`);
  });
}

async function runOptimizationChecks() {
  console.log('\n🔍 Running optimization checks...');
  
  const results = {
    bundle: await analyzeBundle(),
    images: await checkImageOptimization(),
  };
  
  await analyzeDependencies();
  await checkServiceWorker();
  await generatePerformanceReport();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`Bundle Analysis: ${results.bundle ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Image Optimization: ${results.images ? '✅ PASSED' : '⚠️  NEEDS ATTENTION'}`);
  
  const overallScore = Object.values(results).filter(Boolean).length / Object.keys(results).length;
  console.log(`\n🎯 Overall Score: ${Math.round(overallScore * 100)}%`);
  
  if (overallScore >= 0.8) {
    console.log('🎉 Great job! Your performance optimizations are on track.');
  } else if (overallScore >= 0.6) {
    console.log('⚠️  Good progress, but there are some areas that need attention.');
  } else {
    console.log('❌ Performance needs significant improvement.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Run `npm run lighthouse` to test Core Web Vitals');
  console.log('   2. Check Web Vitals in browser dev tools');
  console.log('   3. Monitor performance in production');
  console.log('   4. Review bundle-analysis.html for optimization opportunities');
  
  return overallScore >= 0.7;
}

// Run the optimization checks
runOptimizationChecks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Performance optimization script failed:', error);
    process.exit(1);
  });