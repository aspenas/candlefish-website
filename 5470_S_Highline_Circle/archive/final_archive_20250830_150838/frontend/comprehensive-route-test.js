const puppeteer = require('puppeteer');
const axios = require('axios');

const SITE_URL = 'https://inventory.candlefish.ai';
const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';

// Routes to test
const ROUTES = [
  { name: 'Dashboard', path: '/', expectedElement: 'h1', expectedText: ['Dashboard', 'Inventory'] },
  { name: 'Inventory', path: '/inventory', expectedElement: '[data-testid="inventory-page"], h1', expectedText: ['Inventory Management', 'Total Items'] },
  { name: 'Photos', path: '/photos', expectedElement: '[data-testid="photo-capture-page"], h1', expectedText: ['Photo Capture', 'Batch Photography'] },
  { name: 'Analytics', path: '/analytics', expectedElement: '[data-testid="analytics-page"], h1', expectedText: ['Analytics', 'Dashboard'] },
  { name: 'Insights', path: '/insights', expectedElement: '[data-testid="insights-page"], h1', expectedText: ['AI-Powered Insights', 'Insights'] }
];

async function testRouteComprehensively() {
  console.log('🚀 Starting Comprehensive Route Testing for https://inventory.candlefish.ai');
  console.log('='.repeat(80));

  const results = {
    site: { accessible: false, hasAuth: false },
    api: {},
    routes: {},
    errors: [],
    recommendations: []
  };

  // Test 1: Check if site is accessible
  console.log('\n📡 Step 1: Testing Site Accessibility...');
  try {
    const response = await axios.get(SITE_URL, { timeout: 10000 });
    results.site.accessible = true;
    console.log('✅ Site is accessible (HTTP 200)');

    if (response.data.includes('password') || response.data.includes('auth') || response.data.includes('login')) {
      results.site.hasAuth = true;
      console.log('🔒 Site appears to have password protection');
    }
  } catch (error) {
    results.site.accessible = false;
    results.errors.push(`Site accessibility failed: ${error.message}`);
    console.log('❌ Site is not accessible:', error.message);
  }

  // Test 2: API Health Check
  console.log('\n📡 Step 2: Testing API Health...');
  try {
    // Test summary endpoint
    const summaryResponse = await axios.get(`${API_BASE_URL}/analytics/summary`, { timeout: 10000 });
    results.api.summary = {
      status: 'success',
      responseTime: Date.now(),
      data: summaryResponse.data
    };
    console.log('✅ API Summary endpoint working');

    // Test items endpoint
    const itemsResponse = await axios.get(`${API_BASE_URL}/items?limit=5`, { timeout: 10000 });
    results.api.items = {
      status: 'success',
      count: itemsResponse.data.length || itemsResponse.data.items?.length || 0
    };
    console.log(`✅ API Items endpoint working (${results.api.items.count} items)`);

    // Test analytics endpoints
    const analyticsResponse = await axios.get(`${API_BASE_URL}/analytics/by-room`, { timeout: 10000 });
    results.api.analytics = {
      status: 'success',
      rooms: analyticsResponse.data.rooms?.length || analyticsResponse.data.length || 0
    };
    console.log(`✅ API Analytics endpoint working (${results.api.analytics.rooms} rooms)`);

    // Test AI insights
    try {
      const insightsResponse = await axios.get(`${API_BASE_URL}/ai/insights`, { timeout: 10000 });
      results.api.insights = {
        status: 'success',
        insights: insightsResponse.data.insights?.length || 0
      };
      console.log(`✅ API AI Insights endpoint working (${results.api.insights.insights} insights)`);
    } catch (error) {
      results.api.insights = { status: 'error', error: error.message };
      console.log('⚠️  AI Insights endpoint failed:', error.message);
    }

  } catch (error) {
    results.api.summary = { status: 'error', error: error.message };
    results.errors.push(`API health check failed: ${error.message}`);
    console.log('❌ API is not accessible:', error.message);
  }

  // Test 3: Browser-based Route Testing
  if (results.site.accessible) {
    console.log('\n🌐 Step 3: Testing Routes in Browser...');

    const browser = await puppeteer.launch({
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

    try {
      const page = await browser.newPage();

      // Set viewport and basic headers
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Enable console monitoring
      const consoleMessages = [];
      const networkErrors = [];
      const jsErrors = [];

      page.on('console', message => {
        const type = message.type();
        const text = message.text();
        consoleMessages.push({ type, text });
        if (type === 'error') {
          jsErrors.push(text);
        }
      });

      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });

      page.on('requestfailed', request => {
        networkErrors.push({
          url: request.url(),
          failure: request.failure().errorText
        });
      });

      // Test each route
      for (const route of ROUTES) {
        console.log(`\n📄 Testing ${route.name} (${route.path})...`);
        const routeResult = {
          accessible: false,
          loadTime: 0,
          hasExpectedContent: false,
          jsErrors: [],
          networkErrors: [],
          screenshot: null,
          elements: []
        };

        try {
          const startTime = Date.now();

          const response = await page.goto(`${SITE_URL}${route.path}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });

          routeResult.loadTime = Date.now() - startTime;
          routeResult.accessible = response.status() === 200;

          if (routeResult.accessible) {
            console.log(`  ✅ Route accessible (${routeResult.loadTime}ms)`);

            // Wait for React to render
            await page.waitForTimeout(3000);

            // Check for expected elements and content
            let foundContent = false;

            // Try multiple selectors for the expected element
            const selectors = route.expectedElement.split(', ');
            for (const selector of selectors) {
              try {
                const element = await page.$(selector);
                if (element) {
                  const text = await element.evaluate(el => el.textContent);
                  routeResult.elements.push({ selector, text: text?.substring(0, 100) });

                  // Check if any expected text is found
                  for (const expectedText of route.expectedText) {
                    if (text && text.toLowerCase().includes(expectedText.toLowerCase())) {
                      foundContent = true;
                      break;
                    }
                  }
                  break;
                }
              } catch (e) {
                // Continue to next selector
              }
            }

            routeResult.hasExpectedContent = foundContent;

            if (foundContent) {
              console.log(`  ✅ Expected content found`);
            } else {
              console.log(`  ⚠️  Expected content not found`);
            }

            // Check for loading states
            const loadingElements = await page.$$('.loading, .spinner, [data-testid="loading"]');
            if (loadingElements.length > 0) {
              console.log(`  ⚠️  Page still showing loading indicators`);
            }

            // Check for error states
            const errorElements = await page.$$('.error, .error-message, [data-testid="error"]');
            if (errorElements.length > 0) {
              console.log(`  ❌ Page showing error states`);
              for (const errorEl of errorElements) {
                const errorText = await errorEl.evaluate(el => el.textContent);
                routeResult.jsErrors.push(errorText?.substring(0, 200));
              }
            }

            // Check for specific route content
            await checkRouteSpecificContent(page, route.name, routeResult);

            // Capture any JavaScript errors
            routeResult.jsErrors = [...routeResult.jsErrors, ...jsErrors];
            routeResult.networkErrors = [...networkErrors];

            // Clear error arrays for next route
            jsErrors.length = 0;
            networkErrors.length = 0;

          } else {
            console.log(`  ❌ Route returned HTTP ${response.status()}`);
          }

        } catch (error) {
          console.log(`  ❌ Route test failed: ${error.message}`);
          routeResult.jsErrors.push(error.message);
        }

        results.routes[route.name] = routeResult;
      }

    } finally {
      await browser.close();
    }
  }

  // Step 4: Analyze Results and Generate Report
  console.log('\n📊 Step 4: Analyzing Results...');
  generateFinalReport(results);

  return results;
}

async function checkRouteSpecificContent(page, routeName, routeResult) {
  try {
    switch (routeName) {
      case 'Inventory':
        // Check for inventory table, search bar, filters
        const inventoryElements = await Promise.all([
          page.$('table, [role="table"]').then(el => !!el),
          page.$('input[type="search"], input[placeholder*="search" i]').then(el => !!el),
          page.$('.filter, [data-testid="filter"]').then(el => !!el),
          page.$('[data-testid="bulk-actions"], .bulk-actions').then(el => !!el)
        ]);

        routeResult.specificChecks = {
          hasTable: inventoryElements[0],
          hasSearch: inventoryElements[1],
          hasFilters: inventoryElements[2],
          hasBulkActions: inventoryElements[3]
        };

        console.log(`    • Table: ${inventoryElements[0] ? '✅' : '❌'}`);
        console.log(`    • Search: ${inventoryElements[1] ? '✅' : '❌'}`);
        console.log(`    • Filters: ${inventoryElements[2] ? '✅' : '❌'}`);
        break;

      case 'Photos':
        // Check for camera interface, upload zones
        const photoElements = await Promise.all([
          page.$('video, [data-testid="camera"]').then(el => !!el),
          page.$('.upload-zone, [data-testid="upload-zone"]').then(el => !!el),
          page.$('.tab, [role="tab"]').then(el => !!el)
        ]);

        routeResult.specificChecks = {
          hasCameraInterface: photoElements[0],
          hasUploadZone: photoElements[1],
          hasTabs: photoElements[2]
        };

        console.log(`    • Camera Interface: ${photoElements[0] ? '✅' : '❌'}`);
        console.log(`    • Upload Zone: ${photoElements[1] ? '✅' : '❌'}`);
        console.log(`    • Tabs: ${photoElements[2] ? '✅' : '❌'}`);
        break;

      case 'Analytics':
        // Check for charts, metrics cards
        const analyticsElements = await Promise.all([
          page.$('canvas, svg').then(el => !!el),
          page.$('.metric, .stat-card, [data-testid="metric"]').then(el => !!el),
          page.$('.chart, [data-testid="chart"]').then(el => !!el)
        ]);

        routeResult.specificChecks = {
          hasCharts: analyticsElements[0],
          hasMetrics: analyticsElements[1],
          hasChartContainer: analyticsElements[2]
        };

        console.log(`    • Charts: ${analyticsElements[0] ? '✅' : '❌'}`);
        console.log(`    • Metrics: ${analyticsElements[1] ? '✅' : '❌'}`);
        break;

      case 'Insights':
        // Check for AI insight cards, visualizations
        const insightElements = await Promise.all([
          page.$('.insight, [data-testid="insight"]').then(el => !!el),
          page.$('canvas, svg').then(el => !!el),
          page.$('.ai-recommendation, [data-testid="ai-recommendation"]').then(el => !!el)
        ]);

        routeResult.specificChecks = {
          hasInsightCards: insightElements[0],
          hasVisualizations: insightElements[1],
          hasRecommendations: insightElements[2]
        };

        console.log(`    • Insight Cards: ${insightElements[0] ? '✅' : '❌'}`);
        console.log(`    • Visualizations: ${insightElements[1] ? '✅' : '❌'}`);
        break;
    }
  } catch (error) {
    routeResult.specificChecks = { error: error.message };
  }
}

function generateFinalReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(80));

  // Site Status
  console.log('\n🌐 SITE STATUS:');
  console.log(`Frontend: ${results.site.accessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
  console.log(`Authentication: ${results.site.hasAuth ? '🔒 PASSWORD PROTECTED' : '🔓 OPEN ACCESS'}`);

  // API Status
  console.log('\n📡 API STATUS:');
  Object.entries(results.api).forEach(([endpoint, result]) => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${endpoint}: ${result.status.toUpperCase()}`);
    if (result.count !== undefined) console.log(`    └── Data: ${result.count} items`);
    if (result.rooms !== undefined) console.log(`    └── Rooms: ${result.rooms}`);
    if (result.insights !== undefined) console.log(`    └── Insights: ${result.insights}`);
  });

  // Route Status
  console.log('\n📄 ROUTE STATUS:');
  Object.entries(results.routes).forEach(([routeName, result]) => {
    const status = result.accessible && result.hasExpectedContent ? '✅' :
                   result.accessible ? '⚠️' : '❌';
    console.log(`${status} ${routeName}:`);
    console.log(`    └── Accessible: ${result.accessible ? 'YES' : 'NO'}`);
    console.log(`    └── Content: ${result.hasExpectedContent ? 'YES' : 'NO'}`);
    console.log(`    └── Load Time: ${result.loadTime}ms`);

    if (result.jsErrors.length > 0) {
      console.log(`    └── JS Errors: ${result.jsErrors.length}`);
      result.jsErrors.slice(0, 2).forEach(error => {
        console.log(`        • ${error.substring(0, 100)}`);
      });
    }

    if (result.specificChecks) {
      console.log(`    └── Features:`);
      Object.entries(result.specificChecks).forEach(([feature, hasFeature]) => {
        if (typeof hasFeature === 'boolean') {
          console.log(`        • ${feature}: ${hasFeature ? '✅' : '❌'}`);
        }
      });
    }
  });

  // Issues Found
  console.log('\n🚨 ISSUES IDENTIFIED:');
  if (results.errors.length === 0) {
    console.log('No critical issues found! 🎉');
  } else {
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  const recommendations = [];

  if (!results.site.accessible) {
    recommendations.push('🔧 Fix frontend deployment - site is not accessible');
  }

  if (results.api.summary?.status === 'error') {
    recommendations.push('🔧 Fix API connectivity - backend is not responding');
  }

  Object.entries(results.routes).forEach(([routeName, result]) => {
    if (result.accessible && !result.hasExpectedContent) {
      recommendations.push(`🔧 Fix ${routeName} route - page loads but content is missing`);
    }

    if (result.jsErrors.length > 0) {
      recommendations.push(`🔧 Fix JavaScript errors on ${routeName} page`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('✅ All routes are working correctly!');
  }

  recommendations.forEach(rec => console.log(rec));

  console.log('\n📈 PERFORMANCE SUMMARY:');
  const routeCount = Object.keys(results.routes).length;
  const workingRoutes = Object.values(results.routes).filter(r => r.accessible && r.hasExpectedContent).length;
  const avgLoadTime = Object.values(results.routes)
    .filter(r => r.loadTime > 0)
    .reduce((sum, r) => sum + r.loadTime, 0) / Math.max(1, Object.values(results.routes).filter(r => r.loadTime > 0).length);

  console.log(`✅ Working Routes: ${workingRoutes}/${routeCount} (${Math.round(workingRoutes/routeCount*100)}%)`);
  console.log(`⚡ Average Load Time: ${Math.round(avgLoadTime)}ms`);
  console.log(`🔧 API Health: ${Object.values(results.api).filter(a => a.status === 'success').length}/${Object.keys(results.api).length} endpoints working`);

  console.log('\n' + '='.repeat(80));
}

// Run the test
if (require.main === module) {
  testRouteComprehensively()
    .then(() => {
      console.log('\n✅ Comprehensive testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testRouteComprehensively };
