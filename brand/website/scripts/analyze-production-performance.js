#!/usr/bin/env node

/**
 * Production Performance Analysis Script
 * Analyzes https://candlefish.ai performance metrics
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Performance thresholds (based on Web Vitals standards)
const thresholds = {
  ttfb: { good: 800, poor: 1800 },           // Time to First Byte
  fcp: { good: 1800, poor: 3000 },           // First Contentful Paint
  lcp: { good: 2500, poor: 4000 },           // Largest Contentful Paint
  totalLoad: { good: 3000, poor: 5000 },     // Total page load time
  bundleSize: { good: 200000, poor: 500000 }, // Bundle size in bytes
  cssSize: { good: 50000, poor: 150000 },    // CSS size in bytes
  htmlSize: { good: 25000, poor: 50000 }     // HTML size in bytes
};

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      routes: [],
      resources: [],
      metrics: {},
      recommendations: []
    };
  }

  async analyze() {
    console.log(`${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║          Candlefish AI Production Performance Analysis      ║
║                    https://candlefish.ai                    ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

    // Test main routes
    await this.testRoutes();
    
    // Test resource loading
    await this.testResources();
    
    // Generate comprehensive report
    this.generateReport();
  }

  async testRoutes() {
    const routes = [
      { path: '/', name: 'Homepage' },
      { path: '/atelier/', name: 'Atelier' },
      { path: '/projects/', name: 'Projects' },
      { path: '/documentation/', name: 'Documentation' },
      { path: '/queue/', name: 'Queue' }
    ];

    console.log(`\n${colors.bright}📍 Testing Routes Performance:${colors.reset}`);
    console.log('─'.repeat(60));

    for (const route of routes) {
      const result = await this.measureRoute(route);
      this.results.routes.push(result);
      this.printRouteResult(result);
    }
  }

  async measureRoute(route) {
    const startTime = performance.now();
    let ttfb = 0;
    let statusCode = 0;
    let contentLength = 0;
    let headers = {};

    return new Promise((resolve) => {
      https.get(`https://candlefish.ai${route.path}`, (res) => {
        ttfb = performance.now() - startTime;
        statusCode = res.statusCode;
        headers = res.headers;
        contentLength = parseInt(res.headers['content-length'] || '0');

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const totalTime = performance.now() - startTime;
          
          resolve({
            ...route,
            statusCode,
            ttfb: Math.round(ttfb),
            totalTime: Math.round(totalTime),
            contentLength,
            contentType: headers['content-type'],
            cacheControl: headers['cache-control'],
            server: headers['server'],
            rating: this.getRating('ttfb', ttfb)
          });
        });
      }).on('error', (err) => {
        resolve({
          ...route,
          error: err.message,
          statusCode: 0,
          rating: 'error'
        });
      });
    });
  }

  async testResources() {
    console.log(`\n${colors.bright}📦 Testing Resource Loading:${colors.reset}`);
    console.log('─'.repeat(60));

    const resources = [
      { 
        path: '/_next/static/chunks/bd904a5c-3de427fdbf86efae.js', 
        name: 'Main JS Bundle',
        type: 'js'
      },
      { 
        path: '/_next/static/css/456d0bde86de7e94.css', 
        name: 'Main CSS Bundle',
        type: 'css'
      },
      { 
        path: '/hero-fish.css', 
        name: 'Hero Animation CSS',
        type: 'css'
      }
    ];

    for (const resource of resources) {
      const result = await this.measureResource(resource);
      this.results.resources.push(result);
      this.printResourceResult(result);
    }
  }

  async measureResource(resource) {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      https.get(`https://candlefish.ai${resource.path}`, (res) => {
        const ttfb = performance.now() - startTime;
        let size = 0;
        
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          const totalTime = performance.now() - startTime;
          const transferSpeed = (size / totalTime) * 1000; // bytes per second
          
          let rating;
          if (resource.type === 'js') {
            rating = this.getRating('bundleSize', size);
          } else if (resource.type === 'css') {
            rating = this.getRating('cssSize', size);
          } else {
            rating = 'good';
          }
          
          resolve({
            ...resource,
            size,
            sizeKB: Math.round(size / 1024),
            ttfb: Math.round(ttfb),
            totalTime: Math.round(totalTime),
            transferSpeed: Math.round(transferSpeed / 1024), // KB/s
            compression: res.headers['content-encoding'],
            cacheStatus: res.headers['cache-status'],
            rating
          });
        });
      }).on('error', (err) => {
        resolve({
          ...resource,
          error: err.message,
          rating: 'error'
        });
      });
    });
  }

  getRating(metric, value) {
    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  getStatusIcon(rating) {
    switch (rating) {
      case 'good': return `${colors.green}✅${colors.reset}`;
      case 'needs-improvement': return `${colors.yellow}⚠️${colors.reset}`;
      case 'poor': return `${colors.red}❌${colors.reset}`;
      case 'error': return `${colors.red}💔${colors.reset}`;
      default: return '❓';
    }
  }

  printRouteResult(result) {
    const icon = this.getStatusIcon(result.rating);
    const statusColor = result.statusCode === 200 ? colors.green : 
                       result.statusCode >= 300 && result.statusCode < 400 ? colors.yellow : 
                       colors.red;
    
    console.log(`
${icon} ${colors.bright}${result.name}${colors.reset} (${result.path})
   Status: ${statusColor}${result.statusCode}${colors.reset}
   TTFB: ${this.formatTime(result.ttfb)}
   Total Time: ${this.formatTime(result.totalTime)}
   Size: ${this.formatSize(result.contentLength)}
   Cache: ${result.cacheControl || 'not set'}
    `.trim());
  }

  printResourceResult(result) {
    const icon = this.getStatusIcon(result.rating);
    
    console.log(`
${icon} ${colors.bright}${result.name}${colors.reset}
   Size: ${this.formatSize(result.size)} ${result.compression ? `(${result.compression})` : '(uncompressed)'}
   TTFB: ${this.formatTime(result.ttfb)}
   Load Time: ${this.formatTime(result.totalTime)}
   Speed: ${result.transferSpeed} KB/s
    `.trim());
  }

  formatTime(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  calculateOverallScore() {
    let totalScore = 0;
    let count = 0;

    // Route scores
    this.results.routes.forEach(route => {
      if (route.rating && route.rating !== 'error') {
        if (route.rating === 'good') totalScore += 100;
        else if (route.rating === 'needs-improvement') totalScore += 50;
        else totalScore += 0;
        count++;
      }
    });

    // Resource scores
    this.results.resources.forEach(resource => {
      if (resource.rating && resource.rating !== 'error') {
        if (resource.rating === 'good') totalScore += 100;
        else if (resource.rating === 'needs-improvement') totalScore += 50;
        else totalScore += 0;
        count++;
      }
    });

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check JavaScript bundle sizes
    const jsBundle = this.results.resources.find(r => r.type === 'js');
    if (jsBundle && jsBundle.size > thresholds.bundleSize.good) {
      recommendations.push({
        priority: jsBundle.size > thresholds.bundleSize.poor ? 'HIGH' : 'MEDIUM',
        category: 'Bundle Size',
        issue: `Main JavaScript bundle is ${this.formatSize(jsBundle.size)}`,
        solution: 'Implement code splitting, tree shaking, and lazy loading for non-critical components'
      });
    }

    // Check CSS bundle sizes
    const cssBundle = this.results.resources.find(r => r.name.includes('Main CSS'));
    if (cssBundle && cssBundle.size > thresholds.cssSize.good) {
      recommendations.push({
        priority: cssBundle.size > thresholds.cssSize.poor ? 'HIGH' : 'MEDIUM',
        category: 'CSS Size',
        issue: `Main CSS bundle is ${this.formatSize(cssBundle.size)}`,
        solution: 'Remove unused CSS, implement CSS-in-JS for component-specific styles, use PurgeCSS'
      });
    }

    // Check TTFB for routes
    const slowRoutes = this.results.routes.filter(r => r.ttfb > thresholds.ttfb.good);
    if (slowRoutes.length > 0) {
      recommendations.push({
        priority: slowRoutes.some(r => r.ttfb > thresholds.ttfb.poor) ? 'HIGH' : 'MEDIUM',
        category: 'Server Response',
        issue: `${slowRoutes.length} routes have slow TTFB (>800ms)`,
        solution: 'Implement server-side caching, optimize database queries, use CDN edge locations'
      });
    }

    // Check compression
    const uncompressedResources = this.results.resources.filter(r => !r.compression);
    if (uncompressedResources.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Compression',
        issue: `${uncompressedResources.length} resources are not compressed`,
        solution: 'Enable gzip or Brotli compression on the server/CDN'
      });
    }

    // Check cache headers
    const uncachedRoutes = this.results.routes.filter(r => !r.cacheControl || r.cacheControl.includes('no-cache'));
    if (uncachedRoutes.length > 2) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Caching',
        issue: `Limited caching on ${uncachedRoutes.length} routes`,
        solution: 'Implement appropriate cache headers for static content and API responses'
      });
    }

    return recommendations;
  }

  generateReport() {
    const overallScore = this.calculateOverallScore();
    const recommendations = this.generateRecommendations();

    console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                    PERFORMANCE REPORT                       ║
╚════════════════════════════════════════════════════════════╝${colors.reset}`);

    // Overall Score
    const scoreColor = overallScore >= 90 ? colors.green : 
                      overallScore >= 50 ? colors.yellow : 
                      colors.red;
    
    console.log(`\n${colors.bright}Overall Performance Score: ${scoreColor}${overallScore}/100${colors.reset}`);

    // Summary Statistics
    console.log(`\n${colors.bright}📊 Summary Statistics:${colors.reset}`);
    console.log('─'.repeat(60));

    const avgTTFB = this.results.routes.reduce((sum, r) => sum + (r.ttfb || 0), 0) / this.results.routes.length;
    const totalResourceSize = this.results.resources.reduce((sum, r) => sum + (r.size || 0), 0);
    const avgLoadTime = this.results.routes.reduce((sum, r) => sum + (r.totalTime || 0), 0) / this.results.routes.length;

    console.log(`Average TTFB: ${this.formatTime(avgTTFB)}`);
    console.log(`Average Load Time: ${this.formatTime(avgLoadTime)}`);
    console.log(`Total Resource Size: ${this.formatSize(totalResourceSize)}`);

    // Core Web Vitals Estimates
    console.log(`\n${colors.bright}🎯 Core Web Vitals (Estimated):${colors.reset}`);
    console.log('─'.repeat(60));
    
    const fcpEstimate = avgTTFB + 500; // Rough estimate
    const lcpEstimate = avgTTFB + 1500; // Rough estimate
    
    console.log(`FCP (First Contentful Paint): ~${this.formatTime(fcpEstimate)} ${this.getRatingText('fcp', fcpEstimate)}`);
    console.log(`LCP (Largest Contentful Paint): ~${this.formatTime(lcpEstimate)} ${this.getRatingText('lcp', lcpEstimate)}`);
    console.log(`Note: These are estimates. Use real user monitoring for accurate metrics.`);

    // Recommendations
    if (recommendations.length > 0) {
      console.log(`\n${colors.bright}💡 Optimization Recommendations:${colors.reset}`);
      console.log('─'.repeat(60));
      
      recommendations.sort((a, b) => {
        const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      recommendations.forEach((rec, index) => {
        const priorityColor = rec.priority === 'HIGH' ? colors.red : 
                            rec.priority === 'MEDIUM' ? colors.yellow : 
                            colors.green;
        
        console.log(`
${index + 1}. [${priorityColor}${rec.priority}${colors.reset}] ${colors.bright}${rec.category}${colors.reset}
   Issue: ${rec.issue}
   Solution: ${rec.solution}
        `.trim());
      });
    }

    // Mobile vs Desktop Note
    console.log(`\n${colors.bright}📱 Mobile Performance:${colors.reset}`);
    console.log('─'.repeat(60));
    console.log(`Note: This analysis was performed from a desktop connection.
Mobile users may experience:
- 2-3x slower load times on 3G/4G connections
- Higher impact from large JavaScript bundles
- Increased importance of code splitting and lazy loading
Consider using Lighthouse CI for mobile-specific testing.`);

    // Final Summary
    console.log(`\n${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                        SUMMARY                              ║
╚════════════════════════════════════════════════════════════╝${colors.reset}`);

    if (overallScore >= 90) {
      console.log(`${colors.green}✨ Excellent performance! The site is well-optimized.${colors.reset}`);
    } else if (overallScore >= 70) {
      console.log(`${colors.green}👍 Good performance with room for improvement.${colors.reset}`);
    } else if (overallScore >= 50) {
      console.log(`${colors.yellow}⚠️ Performance needs attention. Follow the recommendations above.${colors.reset}`);
    } else {
      console.log(`${colors.red}🚨 Critical performance issues detected. Immediate optimization needed.${colors.reset}`);
    }

    console.log(`\nFor detailed performance analysis, use:
- Lighthouse: ${colors.cyan}npx lighthouse https://candlefish.ai${colors.reset}
- WebPageTest: ${colors.cyan}https://webpagetest.org${colors.reset}
- Chrome DevTools Performance tab
`);
  }

  getRatingText(metric, value) {
    const rating = this.getRating(metric, value);
    const icon = this.getStatusIcon(rating);
    return `${icon} ${rating.replace('-', ' ')}`;
  }
}

// Run the analysis
const analyzer = new PerformanceAnalyzer();
analyzer.analyze().catch(console.error);