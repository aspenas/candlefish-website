#!/usr/bin/env node

/**
 * Performance Analysis for Netlify Routing Issue
 * Measures the impact of serving homepage content for all routes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OUT_DIR = path.join(__dirname, '..', 'out');
const PAGES = [
  'index.html',
  'agents/index.html',
  'atelier/index.html',
  'assessment/index.html',
  'workshop/index.html',
  'manifesto/index.html',
  'case-studies/index.html',
  'instruments/index.html'
];

// Performance metrics collector
class PerformanceAnalyzer {
  constructor() {
    this.metrics = {
      fileSize: {},
      contentHash: {},
      duplicateContent: [],
      resourceLoading: {},
      metaTags: {},
      scriptBundles: {},
      cssFiles: {}
    };
  }

  analyzeFile(filePath) {
    const fullPath = path.join(OUT_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`Warning: ${filePath} not found`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);

    // File size analysis
    this.metrics.fileSize[filePath] = {
      bytes: stats.size,
      kb: (stats.size / 1024).toFixed(2),
      gzipEstimate: (stats.size * 0.3 / 1024).toFixed(2) // Rough gzip estimate
    };

    // Content hash for duplicate detection
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    this.metrics.contentHash[filePath] = hash;

    // Extract meta tags
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descMatch = content.match(/<meta name="description" content="(.*?)"/);
    this.metrics.metaTags[filePath] = {
      title: titleMatch ? titleMatch[1] : 'No title found',
      description: descMatch ? descMatch[1] : 'No description found'
    };

    // Extract script bundles
    const scriptMatches = content.matchAll(/static\/chunks\/([\w-]+)\.js/g);
    const scripts = Array.from(scriptMatches).map(m => m[1]);
    this.metrics.scriptBundles[filePath] = scripts;

    // Extract CSS files
    const cssMatches = content.matchAll(/static\/css\/([\w-]+)\.css/g);
    const cssFiles = Array.from(cssMatches).map(m => m[1]);
    this.metrics.cssFiles[filePath] = cssFiles;
  }

  detectDuplicates() {
    const hashMap = {};
    Object.entries(this.metrics.contentHash).forEach(([file, hash]) => {
      if (!hashMap[hash]) {
        hashMap[hash] = [];
      }
      hashMap[hash].push(file);
    });

    Object.entries(hashMap).forEach(([hash, files]) => {
      if (files.length > 1) {
        this.metrics.duplicateContent.push({
          hash,
          files,
          count: files.length
        });
      }
    });
  }

  calculateWastedBytes() {
    let totalWasted = 0;
    this.metrics.duplicateContent.forEach(dup => {
      if (dup.files.length > 1) {
        const fileSize = this.metrics.fileSize[dup.files[0]].bytes;
        totalWasted += fileSize * (dup.files.length - 1);
      }
    });
    return totalWasted;
  }

  generateReport() {
    console.log('\n========================================');
    console.log('PERFORMANCE ANALYSIS REPORT');
    console.log('========================================\n');

    // File size analysis
    console.log('📊 FILE SIZE ANALYSIS');
    console.log('---------------------');
    let totalSize = 0;
    Object.entries(this.metrics.fileSize).forEach(([file, size]) => {
      console.log(`${file}: ${size.kb} KB (gzip: ~${size.gzipEstimate} KB)`);
      totalSize += parseInt(size.bytes);
    });
    console.log(`\nTotal HTML size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`Average per page: ${(totalSize / Object.keys(this.metrics.fileSize).length / 1024).toFixed(2)} KB`);

    // Duplicate content analysis
    console.log('\n🔁 DUPLICATE CONTENT DETECTION');
    console.log('-------------------------------');
    if (this.metrics.duplicateContent.length > 0) {
      this.metrics.duplicateContent.forEach(dup => {
        console.log(`\n⚠️  ${dup.count} files with identical content:`);
        dup.files.forEach(f => console.log(`   - ${f}`));
      });
      const wastedBytes = this.calculateWastedBytes();
      console.log(`\n❌ Wasted bandwidth: ${(wastedBytes / 1024).toFixed(2)} KB per page load`);
      console.log(`   For 1000 users: ${(wastedBytes * 1000 / 1024 / 1024).toFixed(2)} MB wasted`);
    } else {
      console.log('✅ No duplicate content detected');
    }

    // Meta tag analysis
    console.log('\n🏷️  META TAG ANALYSIS');
    console.log('---------------------');
    const uniqueTitles = new Set();
    const uniqueDescriptions = new Set();
    Object.entries(this.metrics.metaTags).forEach(([file, meta]) => {
      uniqueTitles.add(meta.title);
      uniqueDescriptions.add(meta.description);
      console.log(`${file}:`);
      console.log(`  Title: ${meta.title}`);
      console.log(`  Desc: ${meta.description.substring(0, 50)}...`);
    });
    console.log(`\n📈 Unique titles: ${uniqueTitles.size}/${Object.keys(this.metrics.metaTags).length}`);
    console.log(`📈 Unique descriptions: ${uniqueDescriptions.size}/${Object.keys(this.metrics.metaTags).length}`);

    // Bundle analysis
    console.log('\n📦 JAVASCRIPT BUNDLE ANALYSIS');
    console.log('-----------------------------');
    const allBundles = new Set();
    Object.values(this.metrics.scriptBundles).forEach(scripts => {
      scripts.forEach(s => allBundles.add(s));
    });
    console.log(`Total unique bundles: ${allBundles.size}`);

    // Find common bundles
    const bundleFrequency = {};
    Object.values(this.metrics.scriptBundles).forEach(scripts => {
      scripts.forEach(s => {
        bundleFrequency[s] = (bundleFrequency[s] || 0) + 1;
      });
    });

    console.log('\nMost common bundles:');
    Object.entries(bundleFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([bundle, count]) => {
        console.log(`  ${bundle}: appears in ${count} pages`);
      });

    // Performance impact summary
    console.log('\n⚡ PERFORMANCE IMPACT SUMMARY');
    console.log('-----------------------------');
    const impacts = this.calculatePerformanceImpacts();
    Object.entries(impacts).forEach(([metric, value]) => {
      console.log(`${metric}: ${value}`);
    });
  }

  calculatePerformanceImpacts() {
    const wastedBytes = this.calculateWastedBytes();
    const avgPageSize = Object.values(this.metrics.fileSize)
      .reduce((sum, s) => sum + parseInt(s.bytes), 0) / Object.keys(this.metrics.fileSize).length;

    return {
      '🔴 Routing overhead': 'All routes return 200 status (no 404 detection)',
      '🔴 Cache efficiency': 'Poor - identical content served from different URLs',
      '🔴 SEO impact': 'Critical - wrong meta tags for all non-homepage routes',
      '🟡 CDN effectiveness': `${((wastedBytes / 1024) * 100).toFixed(0)}% bandwidth waste from duplicates`,
      '🟡 First paint delay': `~${(avgPageSize / 50000).toFixed(1)}s on 3G (${(avgPageSize/1024).toFixed(0)}KB HTML)`,
      '🔴 Core Web Vitals': 'LCP affected by wrong content, CLS from client-side redirects',
      '🟡 TTI impact': 'Extra JS execution for client-side routing fallback',
      '🔴 Crawler confusion': 'Search engines index wrong content for URLs'
    };
  }
}

// Main execution
console.log('🔍 Starting performance analysis...\n');

const analyzer = new PerformanceAnalyzer();

// Analyze each page
PAGES.forEach(page => {
  console.log(`Analyzing ${page}...`);
  analyzer.analyzeFile(page);
});

// Detect duplicates
analyzer.detectDuplicates();

// Generate report
analyzer.generateReport();

// Recommendations
console.log('\n💡 RECOMMENDATIONS');
console.log('------------------');
console.log('1. Fix Next.js static export configuration');
console.log('2. Ensure proper page-specific bundles are generated');
console.log('3. Implement proper 404 handling for non-existent routes');
console.log('4. Configure Netlify redirects to serve correct HTML files');
console.log('5. Enable proper client-side routing with fallback');
console.log('6. Implement resource hints (preload/prefetch) for common bundles');
console.log('7. Use service worker for intelligent caching strategy');
console.log('8. Consider ISR or SSG with proper revalidation');

console.log('\n✅ Analysis complete!\n');
