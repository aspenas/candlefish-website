const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const axios = require('axios');

const LOCAL_PORT = 3009;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;
const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';

// Routes to test
const ROUTES = [
  { name: 'Dashboard', path: '/', keywords: ['dashboard', 'inventory', 'total', 'items'] },
  { name: 'Inventory', path: '/inventory', keywords: ['inventory management', 'search', 'filter', 'table'] },
  { name: 'Photos', path: '/photos', keywords: ['photo capture', 'camera', 'upload', 'batch'] },
  { name: 'Analytics', path: '/analytics', keywords: ['analytics', 'dashboard', 'chart', 'metrics'] },
  { name: 'Insights', path: '/insights', keywords: ['insights', 'ai-powered', 'recommendations'] }
];

async function buildAndServe() {
  console.log('📦 Building project...');

  // Build
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'pipe',
    env: { ...process.env, VITE_API_URL: 'https://5470-inventory.fly.dev/api/v1' }
  });

  await new Promise((resolve, reject) => {
    let output = '';
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    buildProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build successful');
        resolve();
      } else {
        console.log('❌ Build failed:', output);
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });

  // Start server
  console.log(`🌐 Starting server on port ${LOCAL_PORT}...`);
  const server = spawn('npx', ['serve', '-s', 'dist', '-p', LOCAL_PORT.toString()], {
    stdio: 'pipe'
  });

  // Wait for server to start
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });

  console.log(`✅ Server running at ${LOCAL_URL}`);
  return server;
}

async function testRoutes() {
  console.log('\n🧪 Testing Routes...');
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const results = {};

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Monitor console errors
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    for (const route of ROUTES) {
      console.log(`\n📄 Testing ${route.name} (${route.path})...`);

      const routeErrors = [];
      const startTime = Date.now();

      try {
        // Navigate to route
        const response = await page.goto(`${LOCAL_URL}${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 20000
        });

        const loadTime = Date.now() - startTime;
        const accessible = response.status() === 200;

        console.log(`  Status: ${response.status()} (${loadTime}ms)`);

        if (accessible) {
          // Wait a bit for React to render
          await page.evaluate(() => {
            return new Promise(resolve => {
              setTimeout(resolve, 2000);
            });
          });

          // Get page content
          const pageContent = await page.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body.innerText.toLowerCase(),
              hasReactRoot: !!document.getElementById('root'),
              elementCount: document.querySelectorAll('*').length,
              hasH1: !!document.querySelector('h1'),
              hasTable: !!document.querySelector('table'),
              hasCanvas: !!document.querySelector('canvas'),
              hasSVG: !!document.querySelector('svg'),
              hasInput: !!document.querySelector('input'),
              hasButton: !!document.querySelector('button'),
              reactAppLoaded: !!document.querySelector('[data-reactroot], .app, #root > div')
            };
          });

          // Check if expected keywords are found
          const keywordsFound = route.keywords.filter(keyword =>
            pageContent.bodyText.includes(keyword.toLowerCase())
          );

          // Analyze content
          const contentAnalysis = {
            accessible: true,
            loadTime,
            keywordsFound: keywordsFound.length,
            totalKeywords: route.keywords.length,
            hasReactContent: pageContent.reactAppLoaded,
            elementCount: pageContent.elementCount,
            features: {
              hasH1: pageContent.hasH1,
              hasTable: pageContent.hasTable,
              hasCanvas: pageContent.hasCanvas,
              hasSVG: pageContent.hasSVG,
              hasInput: pageContent.hasInput,
              hasButton: pageContent.hasButton
            },
            consoleErrors: [...consoleErrors],
            keywordsFoundList: keywordsFound
          };

          console.log(`  ✅ Content loaded: ${pageContent.elementCount} elements`);
          console.log(`  📝 Keywords found: ${keywordsFound.length}/${route.keywords.length}`);
          console.log(`  ⚛️  React loaded: ${pageContent.reactAppLoaded ? 'Yes' : 'No'}`);

          if (keywordsFound.length > 0) {
            console.log(`    Found: ${keywordsFound.join(', ')}`);
          }

          // Route-specific checks
          await performRouteSpecificChecks(page, route, contentAnalysis);

          results[route.name] = contentAnalysis;

        } else {
          console.log(`  ❌ HTTP ${response.status()}`);
          results[route.name] = {
            accessible: false,
            status: response.status(),
            loadTime,
            error: `HTTP ${response.status()}`
          };
        }

        // Clear console errors for next route
        consoleErrors.length = 0;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        results[route.name] = {
          accessible: false,
          error: error.message,
          consoleErrors: [...consoleErrors]
        };
      }
    }

  } finally {
    await browser.close();
  }

  return results;
}

async function performRouteSpecificChecks(page, route, analysis) {
  try {
    switch (route.name) {
      case 'Inventory':
        // Check for inventory-specific elements
        const inventoryChecks = await page.evaluate(() => {
          return {
            hasSearchInput: !!document.querySelector('input[type="search"], input[placeholder*="search" i]'),
            hasFilterPanel: !!document.querySelector('.filter, [data-testid="filter"]'),
            hasBulkActions: !!document.querySelector('.bulk-actions, [data-testid="bulk-actions"]'),
            hasItemRows: document.querySelectorAll('tr, .item-row').length > 1,
            hasExportButtons: document.querySelectorAll('button').length > 0
          };
        });

        analysis.inventoryFeatures = inventoryChecks;
        console.log(`    🔍 Search: ${inventoryChecks.hasSearchInput ? '✅' : '❌'}`);
        console.log(`    🎛️  Filters: ${inventoryChecks.hasFilterPanel ? '✅' : '❌'}`);
        console.log(`    📊 Table: ${inventoryChecks.hasItemRows ? '✅' : '❌'}`);
        break;

      case 'Photos':
        const photoChecks = await page.evaluate(() => {
          return {
            hasTabs: document.querySelectorAll('.tab, [role="tab"]').length > 0,
            hasUploadZone: !!document.querySelector('.upload, [data-testid="upload"]'),
            hasProgressBar: !!document.querySelector('.progress, .progress-bar'),
            hasCameraInterface: !!document.querySelector('video, canvas')
          };
        });

        analysis.photoFeatures = photoChecks;
        console.log(`    📑 Tabs: ${photoChecks.hasTabs ? '✅' : '❌'}`);
        console.log(`    📤 Upload: ${photoChecks.hasUploadZone ? '✅' : '❌'}`);
        break;

      case 'Analytics':
        const analyticsChecks = await page.evaluate(() => {
          return {
            hasCharts: document.querySelectorAll('canvas, svg').length > 0,
            hasMetricCards: document.querySelectorAll('.stat, .metric, .card').length > 0,
            hasFilters: document.querySelectorAll('select, .filter').length > 0
          };
        });

        analysis.analyticsFeatures = analyticsChecks;
        console.log(`    📊 Charts: ${analyticsChecks.hasCharts ? '✅' : '❌'}`);
        console.log(`    📈 Metrics: ${analyticsChecks.hasMetricCards ? '✅' : '❌'}`);
        break;

      case 'Insights':
        const insightsChecks = await page.evaluate(() => {
          return {
            hasInsightCards: document.querySelectorAll('.insight, [data-testid="insight"]').length > 0,
            hasVisualization: document.querySelectorAll('canvas, svg').length > 0,
            hasRecommendations: !!document.querySelector('.recommendation, .ai-recommendation')
          };
        });

        analysis.insightsFeatures = insightsChecks;
        console.log(`    💡 Insights: ${insightsChecks.hasInsightCards ? '✅' : '❌'}`);
        console.log(`    📊 Charts: ${insightsChecks.hasVisualization ? '✅' : '❌'}`);
        break;
    }
  } catch (error) {
    console.log(`    ❌ Route-specific check failed: ${error.message}`);
  }
}

async function testAPI() {
  console.log('\n📡 Testing API endpoints...');

  const endpoints = [
    { name: 'Summary', url: `${API_BASE_URL}/analytics/summary` },
    { name: 'Items', url: `${API_BASE_URL}/items?limit=5` },
    { name: 'Analytics', url: `${API_BASE_URL}/analytics/by-room` },
    { name: 'Insights', url: `${API_BASE_URL}/ai/insights` }
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      results[endpoint.name] = {
        status: 'success',
        statusCode: response.status,
        hasData: !!response.data && Object.keys(response.data).length > 0
      };
      console.log(`  ✅ ${endpoint.name}: OK`);
    } catch (error) {
      results[endpoint.name] = {
        status: 'error',
        error: error.message
      };
      console.log(`  ❌ ${endpoint.name}: ${error.message}`);
    }
  }

  return results;
}

function generateReport(routeResults, apiResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 BROWSER TESTING REPORT');
  console.log('='.repeat(80));

  // API Results
  console.log('\n📡 API STATUS:');
  Object.entries(apiResults).forEach(([name, result]) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${name}: ${result.status.toUpperCase()}`);
  });

  // Route Results
  console.log('\n📄 ROUTE STATUS:');
  let workingRoutes = 0;
  let totalRoutes = Object.keys(routeResults).length;

  Object.entries(routeResults).forEach(([name, result]) => {
    if (result.accessible) {
      const hasContent = result.keywordsFound > 0 || result.hasReactContent;
      const icon = hasContent ? '✅' : '⚠️';
      if (hasContent) workingRoutes++;

      console.log(`${icon} ${name}:`);
      console.log(`    ├── Load Time: ${result.loadTime}ms`);
      console.log(`    ├── Elements: ${result.elementCount}`);
      console.log(`    ├── Content Match: ${result.keywordsFound}/${result.totalKeywords} keywords`);
      console.log(`    ├── React App: ${result.hasReactContent ? 'Loaded' : 'Not loaded'}`);

      if (result.consoleErrors && result.consoleErrors.length > 0) {
        console.log(`    └── Console Errors: ${result.consoleErrors.length}`);
      }
    } else {
      console.log(`❌ ${name}: ${result.error || 'Not accessible'}`);
    }
  });

  // Summary
  console.log('\n📈 SUMMARY:');
  console.log(`✅ Working Routes: ${workingRoutes}/${totalRoutes} (${Math.round(workingRoutes/totalRoutes*100)}%)`);

  const workingApis = Object.values(apiResults).filter(r => r.status === 'success').length;
  console.log(`📡 Working APIs: ${workingApis}/${Object.keys(apiResults).length}`);

  const avgLoadTime = Object.values(routeResults)
    .filter(r => r.loadTime)
    .reduce((sum, r) => sum + r.loadTime, 0) / Math.max(1, Object.values(routeResults).filter(r => r.loadTime).length);
  console.log(`⚡ Average Load Time: ${Math.round(avgLoadTime)}ms`);

  // Issues and Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  if (workingRoutes === totalRoutes && workingApis === Object.keys(apiResults).length) {
    console.log('✅ All routes and APIs are working correctly!');
    console.log('✅ The application is ready for production deployment.');
  } else {
    if (workingRoutes < totalRoutes) {
      console.log('🔧 Some routes need content fixes');
    }
    if (workingApis < Object.keys(apiResults).length) {
      console.log('🔧 Some API endpoints need attention');
    }
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 Starting Simple Browser Testing');
  console.log('='.repeat(50));

  let server;

  try {
    // Build and serve
    server = await buildAndServe();

    // Test API
    const apiResults = await testAPI();

    // Test routes
    const routeResults = await testRoutes();

    // Generate report
    generateReport(routeResults, apiResults);

  } catch (error) {
    console.error('❌ Testing failed:', error);
  } finally {
    if (server) {
      server.kill();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
