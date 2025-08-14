#!/usr/bin/env node

/**
 * Candlefish.ai Homepage Performance Analysis
 * Comprehensive performance testing and metrics collection
 */

import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs/promises';
import path from 'path';

const SITE_URL = 'http://localhost:3000';
const ITERATIONS = 3;

// Performance thresholds
const THRESHOLDS = {
  lcp: 2500,      // Largest Contentful Paint (ms)
  fid: 100,       // First Input Delay (ms)
  cls: 0.1,       // Cumulative Layout Shift
  fcp: 1800,      // First Contentful Paint (ms)
  ttfb: 600,      // Time to First Byte (ms)
  tti: 3800,      // Time to Interactive (ms)
  speed: 0.9,     // Speed Index
  bundle: {
    main: 200,    // KB
    vendor: 150,  // KB
    total: 500    // KB
  },
  memory: {
    heap: 50,     // MB
    dom: 1000     // nodes
  }
};

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      lighthouse: [],
      runtime: [],
      memory: [],
      animations: [],
      bundle: null,
      recommendations: []
    };
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle sizes...');
    const distPath = path.join(process.cwd(), 'dist', 'assets');

    try {
      const files = await fs.readdir(distPath);
      const bundles = {};
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.js') && !file.endsWith('.map')) {
          const stats = await fs.stat(path.join(distPath, file));
          const sizeKB = stats.size / 1024;

          if (file.includes('vendor')) bundles.vendor = sizeKB;
          else if (file.includes('HomePage')) bundles.main = sizeKB;
          else if (file.includes('animations')) bundles.animations = sizeKB;
          else if (file.includes('three')) bundles.three = sizeKB;
          else if (file.includes('router')) bundles.router = sizeKB;

          totalSize += sizeKB;
        }
      }

      bundles.total = totalSize;
      this.results.bundle = bundles;

      // Check thresholds
      if (bundles.total > THRESHOLDS.bundle.total) {
        this.results.recommendations.push({
          type: 'bundle_size',
          severity: 'high',
          message: `Total bundle size (${bundles.total.toFixed(2)}KB) exceeds threshold (${THRESHOLDS.bundle.total}KB)`,
          suggestions: [
            'Enable tree shaking for unused exports',
            'Lazy load heavy components',
            'Consider dynamic imports for route-based code splitting',
            'Minimize and compress assets'
          ]
        });
      }

      return bundles;
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      return null;
    }
  }

  async runLighthouse() {
    console.log('🔦 Running Lighthouse audit...');

    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu']
    });

    const options = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port
    };

    const runnerResult = await lighthouse(SITE_URL, options);
    const report = JSON.parse(runnerResult.report);

    await chrome.kill();

    const metrics = {
      score: report.categories.performance.score * 100,
      lcp: report.audits['largest-contentful-paint'].numericValue,
      fcp: report.audits['first-contentful-paint'].numericValue,
      cls: report.audits['cumulative-layout-shift'].numericValue,
      tti: report.audits['interactive'].numericValue,
      tbt: report.audits['total-blocking-time'].numericValue,
      speedIndex: report.audits['speed-index'].numericValue
    };

    // Check thresholds
    if (metrics.lcp > THRESHOLDS.lcp) {
      this.results.recommendations.push({
        type: 'lcp',
        severity: 'high',
        message: `LCP (${metrics.lcp}ms) exceeds threshold (${THRESHOLDS.lcp}ms)`,
        suggestions: [
          'Optimize hero image loading with priority hints',
          'Reduce render-blocking resources',
          'Implement resource hints (preconnect, prefetch)',
          'Consider static generation for above-the-fold content'
        ]
      });
    }

    return metrics;
  }

  async analyzeRuntimePerformance() {
    console.log('⚡ Analyzing runtime performance...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable performance monitoring
    await context.addInitScript(() => {
      window.__performanceMetrics = {
        renders: 0,
        animations: [],
        memory: [],
        interactions: []
      };

      // Monitor React renders
      const originalCreateElement = window.React?.createElement;
      if (originalCreateElement) {
        window.React.createElement = function(...args) {
          window.__performanceMetrics.renders++;
          return originalCreateElement.apply(this, args);
        };
      }

      // Monitor animations
      const originalRAF = window.requestAnimationFrame;
      let frameCount = 0;
      let lastTime = performance.now();

      window.requestAnimationFrame = function(callback) {
        frameCount++;
        const now = performance.now();
        const fps = 1000 / (now - lastTime);
        lastTime = now;

        if (frameCount % 60 === 0) {
          window.__performanceMetrics.animations.push({
            time: now,
            fps: fps,
            frame: frameCount
          });
        }

        return originalRAF.call(window, callback);
      };

      // Monitor memory
      setInterval(() => {
        if (performance.memory) {
          window.__performanceMetrics.memory.push({
            time: performance.now(),
            heap: performance.memory.usedJSHeapSize / 1048576,
            limit: performance.memory.jsHeapSizeLimit / 1048576
          });
        }
      }, 1000);
    });

    await page.goto(SITE_URL, { waitUntil: 'networkidle' });

    // Simulate user interactions
    await page.evaluate(() => {
      // Scroll to trigger animations
      window.scrollTo(0, document.body.scrollHeight / 2);
      window.scrollTo(0, 0);

      // Trigger theme toggle if exists
      const themeToggle = document.querySelector('[data-testid="theme-toggle"]');
      if (themeToggle) {
        themeToggle.click();
        setTimeout(() => themeToggle.click(), 100);
      }

      // Mouse movements for particle interactions
      const event = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(event);
    });

    // Wait for animations
    await page.waitForTimeout(5000);

    // Collect metrics
    const metrics = await page.evaluate(() => window.__performanceMetrics);

    // Check for memory leaks
    const memoryData = metrics.memory;
    if (memoryData.length > 2) {
      const initialHeap = memoryData[0].heap;
      const finalHeap = memoryData[memoryData.length - 1].heap;
      const heapGrowth = finalHeap - initialHeap;

      if (heapGrowth > 10) { // 10MB growth
        this.results.recommendations.push({
          type: 'memory_leak',
          severity: 'medium',
          message: `Potential memory leak detected: ${heapGrowth.toFixed(2)}MB heap growth`,
          suggestions: [
            'Check event listener cleanup in useEffect hooks',
            'Verify canvas animation cleanup',
            'Review particle system memory management',
            'Ensure proper component unmounting'
          ]
        });
      }
    }

    // Check animation performance
    const avgFPS = metrics.animations.reduce((sum, a) => sum + a.fps, 0) / metrics.animations.length;
    if (avgFPS < 50) {
      this.results.recommendations.push({
        type: 'animation_performance',
        severity: 'medium',
        message: `Low animation FPS detected: ${avgFPS.toFixed(2)} FPS`,
        suggestions: [
          'Reduce particle count in canvas animations',
          'Use CSS transforms instead of position changes',
          'Implement requestAnimationFrame throttling',
          'Consider using web workers for calculations'
        ]
      });
    }

    await browser.close();
    return metrics;
  }

  async analyzeSpecificIssues() {
    console.log('🔍 Checking specific performance issues...');

    const issues = [];

    // Check for render-blocking resources
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });

    const performanceMetrics = await client.send('Performance.getMetrics');
    const metrics = performanceMetrics.metrics.reduce((acc, m) => {
      acc[m.name] = m.value;
      return acc;
    }, {});

    // Check DOM complexity
    const domMetrics = await page.evaluate(() => ({
      nodeCount: document.querySelectorAll('*').length,
      detachedNodes: performance.memory?.usedJSHeapSize || 0,
      listeners: Array.from(document.querySelectorAll('*')).reduce((count, el) => {
        return count + (getEventListeners ? Object.keys(getEventListeners(el)).length : 0);
      }, 0)
    }));

    if (domMetrics.nodeCount > THRESHOLDS.memory.dom) {
      issues.push({
        type: 'dom_complexity',
        severity: 'medium',
        message: `High DOM node count: ${domMetrics.nodeCount} nodes`,
        suggestions: [
          'Implement virtual scrolling for long lists',
          'Remove unnecessary wrapper elements',
          'Use React.Fragment to avoid extra DOM nodes',
          'Lazy load below-the-fold content'
        ]
      });
    }

    // Check for inefficient selectors
    const cssPerformance = await page.evaluate(() => {
      const start = performance.now();
      document.querySelectorAll('*').forEach(el => {
        getComputedStyle(el);
      });
      return performance.now() - start;
    });

    if (cssPerformance > 100) {
      issues.push({
        type: 'css_performance',
        severity: 'low',
        message: `Slow CSS computation: ${cssPerformance.toFixed(2)}ms`,
        suggestions: [
          'Avoid complex CSS selectors',
          'Reduce CSS specificity',
          'Use CSS containment for complex components',
          'Consider CSS-in-JS optimizations'
        ]
      });
    }

    await browser.close();
    return issues;
  }

  generateReport() {
    console.log('\n📊 Performance Analysis Report\n');
    console.log('═══════════════════════════════════════════\n');

    // Bundle Analysis
    if (this.results.bundle) {
      console.log('📦 Bundle Sizes:');
      console.log(`  • Total: ${this.results.bundle.total.toFixed(2)}KB`);
      console.log(`  • Vendor: ${this.results.bundle.vendor?.toFixed(2)}KB`);
      console.log(`  • Main: ${this.results.bundle.main?.toFixed(2)}KB`);
      console.log(`  • Animations: ${this.results.bundle.animations?.toFixed(2)}KB`);
      console.log(`  • Three.js: ${this.results.bundle.three?.toFixed(2)}KB\n`);
    }

    // Lighthouse Metrics
    if (this.results.lighthouse.length > 0) {
      const avgMetrics = this.results.lighthouse[0];
      console.log('🔦 Core Web Vitals:');
      console.log(`  • Performance Score: ${avgMetrics.score.toFixed(1)}/100`);
      console.log(`  • LCP: ${avgMetrics.lcp.toFixed(0)}ms (threshold: ${THRESHOLDS.lcp}ms)`);
      console.log(`  • FCP: ${avgMetrics.fcp.toFixed(0)}ms (threshold: ${THRESHOLDS.fcp}ms)`);
      console.log(`  • CLS: ${avgMetrics.cls.toFixed(3)} (threshold: ${THRESHOLDS.cls})`);
      console.log(`  • TTI: ${avgMetrics.tti.toFixed(0)}ms (threshold: ${THRESHOLDS.tti}ms)`);
      console.log(`  • TBT: ${avgMetrics.tbt.toFixed(0)}ms\n`);
    }

    // Runtime Performance
    if (this.results.runtime.length > 0) {
      const runtime = this.results.runtime[0];
      console.log('⚡ Runtime Performance:');
      console.log(`  • React Renders: ${runtime.renders}`);
      console.log(`  • Avg FPS: ${(runtime.animations.reduce((s, a) => s + a.fps, 0) / runtime.animations.length).toFixed(1)}`);
      console.log(`  • Memory Usage: ${runtime.memory[runtime.memory.length - 1]?.heap.toFixed(2)}MB\n`);
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('🎯 Critical Issues & Recommendations:\n');

      const grouped = this.results.recommendations.reduce((acc, rec) => {
        if (!acc[rec.severity]) acc[rec.severity] = [];
        acc[rec.severity].push(rec);
        return acc;
      }, {});

      ['high', 'medium', 'low'].forEach(severity => {
        if (grouped[severity]) {
          console.log(`${severity.toUpperCase()} Priority:\n`);
          grouped[severity].forEach(rec => {
            console.log(`  ⚠️  ${rec.message}`);
            rec.suggestions.forEach(s => console.log(`     → ${s}`));
            console.log();
          });
        }
      });
    }

    // Summary
    console.log('═══════════════════════════════════════════\n');
    console.log('📋 Summary:');
    const issueCount = this.results.recommendations.length;
    const highPriority = this.results.recommendations.filter(r => r.severity === 'high').length;

    if (issueCount === 0) {
      console.log('  ✅ No critical performance issues detected');
    } else {
      console.log(`  • Total Issues: ${issueCount}`);
      console.log(`  • High Priority: ${highPriority}`);
      console.log(`  • Action Required: ${highPriority > 0 ? 'Yes' : 'Monitor'}`);
    }
  }

  async run() {
    try {
      // Run all analyses
      await this.analyzeBundleSize();

      for (let i = 0; i < ITERATIONS; i++) {
        console.log(`\n🔄 Iteration ${i + 1}/${ITERATIONS}`);

        const lighthouse = await this.runLighthouse();
        this.results.lighthouse.push(lighthouse);

        const runtime = await this.analyzeRuntimePerformance();
        this.results.runtime.push(runtime);
      }

      const issues = await this.analyzeSpecificIssues();
      this.results.recommendations.push(...issues);

      // Generate report
      this.generateReport();

      // Save detailed results
      await fs.writeFile(
        'performance-report.json',
        JSON.stringify(this.results, null, 2)
      );

      console.log('\n💾 Detailed report saved to performance-report.json');

    } catch (error) {
      console.error('❌ Performance analysis failed:', error);
      process.exit(1);
    }
  }
}

// Run the analysis
const analyzer = new PerformanceAnalyzer();
analyzer.run();
