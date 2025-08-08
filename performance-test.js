#!/usr/bin/env node

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const { URL } = require('url');

async function runPerformanceTest() {
  console.log('🚀 Candlefish.ai Performance Testing\n');
  console.log('=' .repeat(80));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test URLs
    const urls = [
      { name: 'Static Homepage', url: 'http://localhost:3000/index.html' },
      { name: 'React Dashboard', url: 'http://localhost:3000/dashboard' }
    ];

    for (const { name, url } of urls) {
      console.log(`\n📊 Testing: ${name}`);
      console.log('-'.repeat(80));

      // Run Lighthouse audit
      const { lhr } = await lighthouse(url, {
        port: (new URL(browser.wsEndpoint())).port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance'],
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        }
      });

      // Extract key metrics
      const metrics = {
        performance: Math.round(lhr.categories.performance.score * 100),
        fcp: lhr.audits['first-contentful-paint'].numericValue,
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        tti: lhr.audits['interactive'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
        si: lhr.audits['speed-index'].numericValue
      };

      console.log('\n🎯 Performance Score:', metrics.performance);
      console.log('\n📈 Core Web Vitals:');
      console.log(`  - First Contentful Paint: ${(metrics.fcp / 1000).toFixed(2)}s`);
      console.log(`  - Largest Contentful Paint: ${(metrics.lcp / 1000).toFixed(2)}s`);
      console.log(`  - Time to Interactive: ${(metrics.tti / 1000).toFixed(2)}s`);
      console.log(`  - Total Blocking Time: ${metrics.tbt.toFixed(0)}ms`);
      console.log(`  - Cumulative Layout Shift: ${metrics.cls.toFixed(3)}`);
      console.log(`  - Speed Index: ${(metrics.si / 1000).toFixed(2)}s`);

      // Animation performance test
      const page = await browser.newPage();
      await page.goto(url);

      console.log('\n🎬 Animation Performance:');

      // Measure FPS during animations
      await page.evaluateOnNewDocument(() => {
        window.fpsData = [];
        let lastTime = performance.now();
        let frames = 0;

        function measureFPS() {
          frames++;
          const currentTime = performance.now();

          if (currentTime >= lastTime + 1000) {
            window.fpsData.push(Math.round(frames * 1000 / (currentTime - lastTime)));
            frames = 0;
            lastTime = currentTime;
          }

          requestAnimationFrame(measureFPS);
        }

        requestAnimationFrame(measureFPS);
      });

      // Wait for animations to run
      await page.waitForTimeout(5000);

      const fpsData = await page.evaluate(() => window.fpsData);
      const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;

      console.log(`  - Average FPS: ${avgFPS.toFixed(1)}`);
      console.log(`  - Min FPS: ${Math.min(...fpsData)}`);
      console.log(`  - Max FPS: ${Math.max(...fpsData)}`);

      // Memory usage
      const metrics2 = await page.metrics();
      console.log('\n💾 Memory Usage:');
      console.log(`  - JS Heap: ${(metrics2.JSHeapUsedSize / 1048576).toFixed(2)}MB`);
      console.log(`  - Documents: ${metrics2.Documents}`);
      console.log(`  - Nodes: ${metrics2.Nodes}`);

      await page.close();
    }

    // Bundle size analysis
    console.log('\n\n📦 Bundle Size Analysis');
    console.log('-'.repeat(80));

    const page = await browser.newPage();
    const resourceSizes = {};

    page.on('response', response => {
      const url = response.url();
      const size = response.headers()['content-length'];
      if (size) {
        const type =
          url.endsWith('.js') ? 'JavaScript' :
          url.endsWith('.css') ? 'CSS' :
          url.match(/\.(png|jpg|webp|svg)/) ? 'Images' :
          'Other';

        resourceSizes[type] = (resourceSizes[type] || 0) + parseInt(size);
      }
    });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(3000);

    console.log('\nResource Breakdown:');
    Object.entries(resourceSizes).forEach(([type, size]) => {
      console.log(`  - ${type}: ${(size / 1024).toFixed(2)}KB`);
    });

    const totalSize = Object.values(resourceSizes).reduce((a, b) => a + b, 0);
    console.log(`\nTotal Size: ${(totalSize / 1024).toFixed(2)}KB`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n\n✅ Performance Testing Complete!');
  console.log('=' .repeat(80));
}

// Check if required packages are installed
try {
  require.resolve('puppeteer');
  require.resolve('lighthouse');
} catch (e) {
  console.log('Installing required packages...');
  require('child_process').execSync('npm install puppeteer lighthouse', { stdio: 'inherit' });
}

runPerformanceTest().catch(console.error);
