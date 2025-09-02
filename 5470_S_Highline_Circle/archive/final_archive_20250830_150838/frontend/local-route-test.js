const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LOCAL_PORT = 3008;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;
const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';

// Routes to test with detailed validation
const ROUTES = [
  {
    name: 'Dashboard',
    path: '/',
    expectedElements: [
      'h1',
      '[data-testid="dashboard"]',
      '.dashboard'
    ],
    expectedTexts: ['dashboard', 'inventory', 'overview', 'welcome'],
    criticalFeatures: ['navigation', 'summary_cards']
  },
  {
    name: 'Inventory',
    path: '/inventory',
    expectedElements: [
      'h1',
      'table',
      '[role="table"]',
      '.inventory-table',
      'input[type="search"]'
    ],
    expectedTexts: ['inventory management', 'total items', 'search'],
    criticalFeatures: ['item_table', 'search_functionality', 'filters', 'pagination']
  },
  {
    name: 'Photos',
    path: '/photos',
    expectedElements: [
      'h1',
      '.photo-capture',
      '[data-testid="photo-capture"]',
      'button',
      '.tab'
    ],
    expectedTexts: ['photo capture', 'camera', 'upload', 'batch'],
    criticalFeatures: ['tab_navigation', 'upload_interface', 'camera_access']
  },
  {
    name: 'Analytics',
    path: '/analytics',
    expectedElements: [
      'h1',
      'canvas',
      'svg',
      '.chart',
      '.analytics'
    ],
    expectedTexts: ['analytics', 'dashboard', 'chart', 'metrics'],
    criticalFeatures: ['charts_rendering', 'data_visualization', 'metrics_cards']
  },
  {
    name: 'Insights',
    path: '/insights',
    expectedElements: [
      'h1',
      '.insight',
      'canvas',
      'svg',
      '.ai-powered'
    ],
    expectedTexts: ['ai-powered insights', 'insights', 'recommendations'],
    criticalFeatures: ['ai_insights', 'recommendations', 'visualizations']
  }
];

class LocalRouteTester {
  constructor() {
    this.server = null;
    this.browser = null;
    this.results = {
      setup: { buildSuccessful: false, serverStarted: false },
      api: {},
      routes: {},
      performance: {},
      errors: []
    };
  }

  async setup() {
    console.log('🚀 Starting Local Route Testing Setup...');
    console.log('='.repeat(60));

    // Step 1: Build the project
    console.log('\n📦 Step 1: Building project...');
    try {
      await this.buildProject();
      this.results.setup.buildSuccessful = true;
      console.log('✅ Build completed successfully');
    } catch (error) {
      this.results.setup.buildSuccessful = false;
      this.results.errors.push(`Build failed: ${error.message}`);
      console.log('❌ Build failed:', error.message);
      return false;
    }

    // Step 2: Start local server
    console.log('\n🌐 Step 2: Starting local server...');
    try {
      await this.startServer();
      this.results.setup.serverStarted = true;
      console.log(`✅ Server started at ${LOCAL_URL}`);
    } catch (error) {
      this.results.setup.serverStarted = false;
      this.results.errors.push(`Server start failed: ${error.message}`);
      console.log('❌ Server failed to start:', error.message);
      return false;
    }

    return true;
  }

  async buildProject() {
    return new Promise((resolve, reject) => {
      console.log('  Building with npm run build...');
      const build = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          VITE_API_URL: 'https://5470-inventory.fly.dev/api/v1'
        }
      });

      let output = '';
      let errorOutput = '';

      build.stdout.on('data', (data) => {
        output += data.toString();
      });

      build.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      build.on('close', (code) => {
        if (code === 0) {
          console.log('  ✅ Build output generated');
          resolve();
        } else {
          console.log('  Build stdout:', output);
          console.log('  Build stderr:', errorOutput);
          reject(new Error(`Build process exited with code ${code}`));
        }
      });

      build.on('error', (error) => {
        reject(new Error(`Build process failed to start: ${error.message}`));
      });
    });
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log(`  Starting server on port ${LOCAL_PORT}...`);

      // Use npx serve for a reliable static server
      this.server = spawn('npx', ['serve', '-s', 'dist', '-p', LOCAL_PORT.toString()], {
        stdio: 'pipe'
      });

      let output = '';
      let started = false;

      this.server.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Accepting connections') || output.includes(`localhost:${LOCAL_PORT}`)) {
          if (!started) {
            started = true;
            // Give server a moment to fully start
            setTimeout(() => resolve(), 2000);
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        console.log('  Server stderr:', data.toString());
      });

      this.server.on('close', (code) => {
        if (!started) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      this.server.on('error', (error) => {
        reject(new Error(`Server failed to start: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!started) {
          reject(new Error('Server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async testAPI() {
    console.log('\n📡 Step 3: Testing API connectivity...');

    const endpoints = [
      { name: 'summary', url: `${API_BASE_URL}/analytics/summary` },
      { name: 'items', url: `${API_BASE_URL}/items?limit=5` },
      { name: 'rooms', url: `${API_BASE_URL}/rooms` },
      { name: 'analytics', url: `${API_BASE_URL}/analytics/by-room` },
      { name: 'insights', url: `${API_BASE_URL}/ai/insights` }
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(endpoint.url, { timeout: 10000 });
        const responseTime = Date.now() - startTime;

        this.results.api[endpoint.name] = {
          status: 'success',
          responseTime,
          dataSize: JSON.stringify(response.data).length,
          statusCode: response.status
        };

        console.log(`  ✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
      } catch (error) {
        this.results.api[endpoint.name] = {
          status: 'error',
          error: error.message,
          statusCode: error.response?.status || 'TIMEOUT'
        };
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  async testRoutes() {
    console.log('\n🌐 Step 4: Testing routes in browser...');

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await this.browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36');

    // Monitor console errors and network failures
    const consoleErrors = [];
    const networkFailures = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push({
          text: message.text(),
          location: message.location()
        });
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push({
        text: error.message,
        stack: error.stack
      });
    });

    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });

    // Test each route
    for (const route of ROUTES) {
      console.log(`\n📄 Testing ${route.name} (${route.path})...`);

      const routeResult = {
        accessible: false,
        loadTime: 0,
        contentFound: false,
        elementsFound: [],
        criticalFeatures: {},
        consoleErrors: [],
        networkErrors: [],
        performance: {},
        screenshots: []
      };

      try {
        // Navigate to route
        const startTime = Date.now();
        const response = await page.goto(`${LOCAL_URL}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        routeResult.loadTime = Date.now() - startTime;
        routeResult.accessible = response.status() === 200;

        if (!routeResult.accessible) {
          console.log(`  ❌ HTTP ${response.status()}`);
          this.results.routes[route.name] = routeResult;
          continue;
        }

        console.log(`  ✅ Loaded (${routeResult.loadTime}ms)`);

        // Wait for React to hydrate and content to render
        await page.waitForTimeout(3000);

        // Check for expected elements
        let elementsFound = 0;
        for (const selector of route.expectedElements) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await element.evaluate(el => el.textContent?.substring(0, 100));
              routeResult.elementsFound.push({ selector, text });
              elementsFound++;
            }
          } catch (e) {
            // Element not found or error accessing it
          }
        }

        // Check for expected text content
        const pageText = await page.evaluate(() => document.body.textContent?.toLowerCase() || '');
        const textsFound = route.expectedTexts.filter(text =>
          pageText.includes(text.toLowerCase())
        );

        routeResult.contentFound = elementsFound > 0 && textsFound.length > 0;

        console.log(`  📝 Elements found: ${elementsFound}/${route.expectedElements.length}`);
        console.log(`  📄 Expected text found: ${textsFound.length}/${route.expectedTexts.length}`);

        // Test critical features for each route
        await this.testCriticalFeatures(page, route, routeResult);

        // Capture performance metrics
        const performanceMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          return {
            domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
            loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
          };
        });

        routeResult.performance = performanceMetrics;

        // Capture console errors for this route
        routeResult.consoleErrors = [...consoleErrors];
        routeResult.networkErrors = [...networkFailures];

        // Clear for next route
        consoleErrors.length = 0;
        networkFailures.length = 0;

        console.log(`  ${routeResult.contentFound ? '✅' : '❌'} Content validation: ${routeResult.contentFound ? 'PASS' : 'FAIL'}`);

      } catch (error) {
        console.log(`  ❌ Route test failed: ${error.message}`);
        routeResult.consoleErrors.push({ text: error.message, stack: error.stack });
      }

      this.results.routes[route.name] = routeResult;
    }

    await this.browser.close();
  }

  async testCriticalFeatures(page, route, routeResult) {
    const features = {};

    switch (route.name) {
      case 'Inventory':
        // Test table functionality
        features.hasTable = await page.$('table, [role="table"]') !== null;

        // Test search functionality
        const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
        features.hasSearch = searchInput !== null;

        if (features.hasSearch) {
          try {
            await searchInput.type('test');
            await page.waitForTimeout(1000);
            features.searchWorks = true;
          } catch (e) {
            features.searchWorks = false;
          }
        }

        // Test filters
        features.hasFilters = await page.$('.filter, [data-testid="filter"], .filter-panel') !== null;

        // Test bulk actions
        features.hasBulkActions = await page.$('[data-testid="bulk-actions"], .bulk-actions') !== null;
        break;

      case 'Photos':
        // Test tab navigation
        const tabs = await page.$$('.tab, [role="tab"]');
        features.hasTabs = tabs.length > 0;

        if (features.hasTabs) {
          try {
            await tabs[0].click();
            await page.waitForTimeout(500);
            features.tabsWork = true;
          } catch (e) {
            features.tabsWork = false;
          }
        }

        // Test upload interface
        features.hasUploadZone = await page.$('.upload-zone, [data-testid="upload-zone"]') !== null;
        break;

      case 'Analytics':
        // Test for charts
        const charts = await page.$$('canvas, svg');
        features.hasCharts = charts.length > 0;

        // Test for metrics cards
        features.hasMetrics = await page.$('.metric, .stat-card, [data-testid="metric"]') !== null;

        // Test for interactive elements
        features.hasInteractivity = await page.$('button, select, input') !== null;
        break;

      case 'Insights':
        // Test for insight cards
        const insightCards = await page.$$('.insight, [data-testid="insight"]');
        features.hasInsightCards = insightCards.length > 0;

        // Test for visualizations
        features.hasVisualizations = await page.$$('canvas, svg').then(els => els.length > 0);

        // Test interactivity
        if (features.hasInsightCards) {
          try {
            await insightCards[0].click();
            await page.waitForTimeout(500);
            features.cardsInteractive = true;
          } catch (e) {
            features.cardsInteractive = false;
          }
        }
        break;
    }

    routeResult.criticalFeatures = features;

    // Log feature test results
    Object.entries(features).forEach(([feature, works]) => {
      const icon = works ? '✅' : '❌';
      console.log(`    ${icon} ${feature}`);
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 LOCAL ROUTE TESTING REPORT');
    console.log('='.repeat(80));

    // Setup Status
    console.log('\n🛠️  SETUP STATUS:');
    console.log(`Build: ${this.results.setup.buildSuccessful ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Server: ${this.results.setup.serverStarted ? '✅ STARTED' : '❌ FAILED'}`);

    // API Status
    console.log('\n📡 API STATUS:');
    Object.entries(this.results.api).forEach(([endpoint, result]) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${endpoint}: ${result.status} (${result.responseTime || 0}ms)`);
      if (result.error) {
        console.log(`    └── Error: ${result.error}`);
      }
    });

    // Route Status
    console.log('\n📄 ROUTE STATUS:');
    Object.entries(this.results.routes).forEach(([routeName, result]) => {
      const status = result.accessible && result.contentFound ? '✅' :
                     result.accessible ? '⚠️' : '❌';
      console.log(`${status} ${routeName}:`);
      console.log(`    ├── Accessible: ${result.accessible ? 'YES' : 'NO'}`);
      console.log(`    ├── Content Found: ${result.contentFound ? 'YES' : 'NO'}`);
      console.log(`    ├── Load Time: ${result.loadTime}ms`);

      if (result.performance.firstContentfulPaint) {
        console.log(`    ├── First Paint: ${Math.round(result.performance.firstContentfulPaint)}ms`);
      }

      if (result.criticalFeatures && Object.keys(result.criticalFeatures).length > 0) {
        console.log(`    ├── Features:`);
        Object.entries(result.criticalFeatures).forEach(([feature, works]) => {
          console.log(`    │   ${works ? '✅' : '❌'} ${feature}`);
        });
      }

      if (result.consoleErrors.length > 0) {
        console.log(`    └── JS Errors: ${result.consoleErrors.length}`);
        result.consoleErrors.slice(0, 2).forEach(error => {
          console.log(`        • ${error.text.substring(0, 100)}`);
        });
      }
    });

    // Performance Summary
    console.log('\n📈 PERFORMANCE SUMMARY:');
    const routeCount = Object.keys(this.results.routes).length;
    const workingRoutes = Object.values(this.results.routes)
      .filter(r => r.accessible && r.contentFound).length;
    const avgLoadTime = Object.values(this.results.routes)
      .reduce((sum, r) => sum + r.loadTime, 0) / Math.max(1, routeCount);

    console.log(`✅ Working Routes: ${workingRoutes}/${routeCount} (${Math.round(workingRoutes/routeCount*100)}%)`);
    console.log(`⚡ Average Load Time: ${Math.round(avgLoadTime)}ms`);

    const workingApis = Object.values(this.results.api).filter(a => a.status === 'success').length;
    console.log(`🔗 API Health: ${workingApis}/${Object.keys(this.results.api).length} endpoints working`);

    // Issues and Recommendations
    console.log('\n🚨 ISSUES FOUND:');
    if (this.results.errors.length === 0) {
      console.log('No critical issues found! 🎉');
    } else {
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const recommendations = [];

    Object.entries(this.results.routes).forEach(([routeName, result]) => {
      if (!result.accessible) {
        recommendations.push(`🔧 Fix ${routeName} route - not accessible`);
      } else if (!result.contentFound) {
        recommendations.push(`🔧 Fix ${routeName} route - content not loading properly`);
      }

      if (result.consoleErrors.length > 0) {
        recommendations.push(`🔧 Fix JavaScript errors on ${routeName} page`);
      }

      if (result.loadTime > 3000) {
        recommendations.push(`⚡ Optimize ${routeName} page load time (${result.loadTime}ms)`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ All routes are working correctly!');
    }

    recommendations.forEach(rec => console.log(rec));
    console.log('\n' + '='.repeat(80));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.kill();
    }
  }

  async run() {
    try {
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        console.log('❌ Setup failed, cannot continue with testing');
        return this.results;
      }

      await this.testAPI();
      await this.testRoutes();
      this.generateReport();

      return this.results;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new LocalRouteTester();
  tester.run()
    .then(() => {
      console.log('\n✅ Local route testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { LocalRouteTester };
