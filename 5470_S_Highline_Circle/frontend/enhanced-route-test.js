const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://inventory.candlefish.ai';
const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';

// Create screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Routes to test with enhanced validation
const ROUTES = [
  { 
    name: 'Dashboard', 
    path: '/', 
    expectedSelectors: ['[data-testid="dashboard"]', 'h1', '.dashboard', '[data-testid="stats"]'],
    expectedContent: ['dashboard', 'inventory', 'total', 'items'],
    requiredElements: ['canvas', 'svg', '.stat-card, .metric-card, [data-testid="metric"]']
  },
  { 
    name: 'Inventory', 
    path: '/inventory', 
    expectedSelectors: ['[data-testid="inventory-page"]', 'h1', '.inventory', 'table'],
    expectedContent: ['inventory', 'management', 'items', 'search'],
    requiredElements: ['input[type="search"], input[placeholder*="search"]', 'table, [role="table"]']
  },
  { 
    name: 'Photos', 
    path: '/photos', 
    expectedSelectors: ['[data-testid="photo-capture-page"]', 'h1', '.photo-capture'],
    expectedContent: ['photo', 'capture', 'upload', 'camera'],
    requiredElements: ['.upload-zone, [data-testid="upload-zone"]', 'video, [data-testid="camera"]']
  },
  { 
    name: 'Analytics', 
    path: '/analytics', 
    expectedSelectors: ['[data-testid="analytics-page"]', 'h1', '.analytics'],
    expectedContent: ['analytics', 'dashboard', 'charts', 'reports'],
    requiredElements: ['canvas, svg', '.chart, [data-testid="chart"]']
  },
  { 
    name: 'Insights', 
    path: '/insights', 
    expectedSelectors: ['[data-testid="insights-page"]', 'h1', '.insights'],
    expectedContent: ['insights', 'ai', 'recommendations', 'analysis'],
    requiredElements: ['.insight, [data-testid="insight"]', 'canvas, svg']
  }
];

// Password to try (you may need to update this)
const PASSWORD = 'inventory2024'; // Update this if needed

async function testRoutesWithAuth() {
  console.log('🚀 Enhanced Route Testing for https://inventory.candlefish.ai');
  console.log('🔒 Including password authentication handling');
  console.log('📸 Screenshots will be saved to ./test-screenshots/');
  console.log('='.repeat(80));

  const results = {
    timestamp: new Date().toISOString(),
    site: { accessible: false, authenticated: false, hasAuth: false },
    api: {},
    routes: {},
    errors: [],
    warnings: [],
    screenshots: [],
    overallHealth: 'unknown'
  };

  // Step 1: Test API health first
  console.log('\n📡 Step 1: Testing API Health...');
  await testAPIHealth(results);

  // Step 2: Browser testing with authentication
  console.log('\n🌐 Step 2: Testing Routes with Browser Authentication...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to false for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ],
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    // Set up monitoring
    const consoleMessages = [];
    const networkErrors = [];
    const jsErrors = [];

    page.on('console', message => {
      const type = message.type();
      const text = message.text();
      consoleMessages.push({ type, text, timestamp: Date.now() });
      
      if (type === 'error') {
        jsErrors.push({ message: text, timestamp: Date.now() });
        console.log(`  🚨 Console Error: ${text.substring(0, 100)}`);
      } else if (type === 'warn') {
        console.log(`  ⚠️  Console Warning: ${text.substring(0, 100)}`);
      }
    });

    page.on('pageerror', error => {
      jsErrors.push({ message: error.message, stack: error.stack, timestamp: Date.now() });
      console.log(`  💥 Page Error: ${error.message}`);
    });

    page.on('requestfailed', request => {
      const failure = {
        url: request.url(),
        failure: request.failure()?.errorText,
        timestamp: Date.now()
      };
      networkErrors.push(failure);
      console.log(`  🌐 Network Error: ${request.url()} - ${failure.failure}`);
    });

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Test authentication
    console.log('\n🔐 Testing Authentication...');
    const authResult = await testAuthentication(page, results);
    
    if (authResult.authenticated) {
      console.log('✅ Successfully authenticated');
      
      // Test each route
      for (const route of ROUTES) {
        console.log(`\n📄 Testing ${route.name} (${route.path})...`);
        const routeResult = await testRoute(page, route, SCREENSHOTS_DIR);
        results.routes[route.name] = routeResult;
        
        // Add route-specific errors to overall tracking
        results.errors.push(...routeResult.errors);
        results.warnings.push(...routeResult.warnings);
      }
      
      // Add overall console/network errors
      results.errors.push(...jsErrors.map(e => `JS Error: ${e.message}`));
      results.errors.push(...networkErrors.map(e => `Network Error: ${e.url} - ${e.failure}`));
      
    } else {
      console.log('❌ Authentication failed - cannot test routes');
      results.errors.push('Authentication failed - cannot access protected routes');
    }

  } finally {
    await browser.close();
  }

  // Step 3: Generate comprehensive report
  console.log('\n📊 Step 3: Generating Comprehensive Report...');
  generateEnhancedReport(results);
  
  // Save results to JSON for further analysis
  fs.writeFileSync(
    path.join(__dirname, 'test-results.json'), 
    JSON.stringify(results, null, 2)
  );

  return results;
}

async function testAPIHealth(results) {
  const endpoints = [
    { name: 'summary', url: `${API_BASE_URL}/analytics/summary` },
    { name: 'items', url: `${API_BASE_URL}/items?limit=10` },
    { name: 'analytics', url: `${API_BASE_URL}/analytics/by-room` },
    { name: 'insights', url: `${API_BASE_URL}/ai/insights` }
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios.get(endpoint.url, { timeout: 15000 });
      const responseTime = Date.now() - startTime;
      
      results.api[endpoint.name] = {
        status: 'success',
        responseTime,
        dataSize: JSON.stringify(response.data).length,
        statusCode: response.status
      };
      
      console.log(`  ✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
      
      // Log data specifics
      if (response.data) {
        if (response.data.length) {
          console.log(`     └── ${response.data.length} items`);
        } else if (response.data.items?.length) {
          console.log(`     └── ${response.data.items.length} items`);
        } else if (response.data.insights?.length) {
          console.log(`     └── ${response.data.insights.length} insights`);
        }
      }
      
    } catch (error) {
      results.api[endpoint.name] = {
        status: 'error',
        error: error.message,
        statusCode: error.response?.status || 'timeout'
      };
      console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      results.errors.push(`API ${endpoint.name} failed: ${error.message}`);
    }
  }
}

async function testAuthentication(page, results) {
  try {
    // Go to the main page
    const response = await page.goto(SITE_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    console.log(`  📡 Initial response: ${response.status()}`);
    
    // Check if we got a 401 or need auth
    if (response.status() === 401) {
      console.log('  🔒 Basic authentication required');
      results.site.hasAuth = true;
      
      // Handle basic auth popup
      try {
        await page.authenticate({ username: '', password: PASSWORD });
        
        // Try to navigate again
        const authResponse = await page.goto(SITE_URL, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
        if (authResponse.status() === 200) {
          results.site.authenticated = true;
          results.site.accessible = true;
          console.log('  ✅ Basic authentication successful');
          return { authenticated: true };
        } else {
          console.log(`  ❌ Authentication failed: ${authResponse.status()}`);
          return { authenticated: false };
        }
        
      } catch (authError) {
        console.log(`  ❌ Authentication error: ${authError.message}`);
        return { authenticated: false };
      }
      
    } else if (response.status() === 200) {
      results.site.accessible = true;
      results.site.authenticated = true;
      console.log('  ✅ Site accessible without authentication');
      return { authenticated: true };
      
    } else {
      console.log(`  ❌ Unexpected status: ${response.status()}`);
      return { authenticated: false };
    }
    
  } catch (error) {
    console.log(`  ❌ Authentication test failed: ${error.message}`);
    results.errors.push(`Authentication failed: ${error.message}`);
    return { authenticated: false };
  }
}

async function testRoute(page, route, screenshotsDir) {
  const result = {
    accessible: false,
    loadTime: 0,
    hasExpectedContent: false,
    elementsFound: [],
    requiredElementsFound: [],
    errors: [],
    warnings: [],
    screenshot: null,
    consoleErrors: [],
    networkFailures: [],
    specificChecks: {}
  };

  try {
    const startTime = Date.now();
    
    // Navigate to route
    const response = await page.goto(`${SITE_URL}${route.path}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    result.loadTime = Date.now() - startTime;
    result.accessible = response.status() === 200;
    
    if (!result.accessible) {
      result.errors.push(`Route returned ${response.status()}`);
      return result;
    }

    console.log(`  ✅ Route accessible (${result.loadTime}ms)`);

    // Wait for React to render
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshotPath = path.join(screenshotsDir, `${route.name.toLowerCase()}-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      type: 'png'
    });
    result.screenshot = screenshotPath;
    console.log(`  📸 Screenshot saved: ${path.basename(screenshotPath)}`);

    // Check for React app loading
    const reactRootExists = await page.$('#root, [data-reactroot]');
    if (!reactRootExists) {
      result.warnings.push('React root element not found');
    }

    // Check for error boundaries
    const errorBoundaries = await page.$$('[data-testid="error-boundary"], .error-boundary');
    if (errorBoundaries.length > 0) {
      result.warnings.push('Error boundary detected');
      console.log(`  ⚠️  Error boundary active`);
      
      // Get error boundary text
      for (const boundary of errorBoundaries) {
        const errorText = await boundary.evaluate(el => el.textContent);
        result.errors.push(`Error boundary: ${errorText?.substring(0, 100)}`);
      }
    }

    // Check for expected selectors and content
    let contentScore = 0;
    for (const selector of route.expectedSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.evaluate(el => el.textContent || '');
          result.elementsFound.push({ selector, text: text.substring(0, 200) });
          console.log(`  ✅ Found: ${selector}`);
          
          // Check if content contains expected text
          for (const expectedText of route.expectedContent) {
            if (text.toLowerCase().includes(expectedText.toLowerCase())) {
              contentScore++;
              break;
            }
          }
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    // Check required elements
    for (const requiredSelector of route.requiredElements) {
      try {
        const elements = await page.$$(requiredSelector);
        if (elements.length > 0) {
          result.requiredElementsFound.push({ 
            selector: requiredSelector, 
            count: elements.length 
          });
          console.log(`  ✅ Required element: ${requiredSelector} (${elements.length})`);
        } else {
          result.warnings.push(`Missing required element: ${requiredSelector}`);
          console.log(`  ⚠️  Missing: ${requiredSelector}`);
        }
      } catch (e) {
        result.errors.push(`Error checking ${requiredSelector}: ${e.message}`);
      }
    }

    result.hasExpectedContent = contentScore > 0;

    // Route-specific checks
    result.specificChecks = await performRouteSpecificChecks(page, route.name);

  } catch (error) {
    result.errors.push(`Route test failed: ${error.message}`);
    console.log(`  ❌ Route test error: ${error.message}`);
  }

  return result;
}

async function performRouteSpecificChecks(page, routeName) {
  const checks = {};
  
  try {
    switch (routeName) {
      case 'Dashboard':
        // Check for dashboard-specific elements
        checks.hasStatCards = await page.$$('.stat-card, .metric-card, [data-testid="metric"]').then(els => els.length > 0);
        checks.hasCharts = await page.$$('canvas, svg').then(els => els.length > 0);
        checks.hasRecentActivity = await page.$('.recent-activity, [data-testid="recent-activity"]').then(el => !!el);
        console.log(`    • Stat Cards: ${checks.hasStatCards ? '✅' : '❌'}`);
        console.log(`    • Charts: ${checks.hasCharts ? '✅' : '❌'}`);
        break;

      case 'Inventory':
        checks.hasTable = await page.$('table, [role="table"]').then(el => !!el);
        checks.hasSearch = await page.$('input[type="search"], input[placeholder*="search"]').then(el => !!el);
        checks.hasFilters = await page.$('.filter, [data-testid="filter"]').then(el => !!el);
        checks.hasBulkActions = await page.$('[data-testid="bulk-actions"], .bulk-actions').then(el => !!el);
        checks.itemCount = await page.$$('tbody tr, .item-row').then(els => els.length);
        console.log(`    • Table: ${checks.hasTable ? '✅' : '❌'}`);
        console.log(`    • Search: ${checks.hasSearch ? '✅' : '❌'}`);
        console.log(`    • Items: ${checks.itemCount || 0}`);
        break;

      case 'Photos':
        checks.hasCameraInterface = await page.$('video, [data-testid="camera"]').then(el => !!el);
        checks.hasUploadZone = await page.$('.upload-zone, [data-testid="upload-zone"]').then(el => !!el);
        checks.hasTabs = await page.$$('.tab, [role="tab"]').then(els => els.length > 0);
        checks.hasFileInput = await page.$('input[type="file"]').then(el => !!el);
        console.log(`    • Camera Interface: ${checks.hasCameraInterface ? '✅' : '❌'}`);
        console.log(`    • Upload Zone: ${checks.hasUploadZone ? '✅' : '❌'}`);
        break;

      case 'Analytics':
        checks.hasCharts = await page.$$('canvas, svg').then(els => els.length);
        checks.hasMetrics = await page.$$('.metric, .stat-card, [data-testid="metric"]').then(els => els.length);
        checks.hasDatePicker = await page.$('input[type="date"], .date-picker').then(el => !!el);
        console.log(`    • Charts: ${checks.hasCharts || 0}`);
        console.log(`    • Metrics: ${checks.hasMetrics || 0}`);
        break;

      case 'Insights':
        checks.hasInsightCards = await page.$$('.insight, [data-testid="insight"]').then(els => els.length);
        checks.hasRecommendations = await page.$$('.recommendation, [data-testid="recommendation"]').then(els => els.length);
        checks.hasVisualizations = await page.$$('canvas, svg').then(els => els.length);
        checks.hasAIIndicators = await page.$$('.ai-powered, [data-testid="ai"]').then(els => els.length);
        console.log(`    • Insights: ${checks.hasInsightCards || 0}`);
        console.log(`    • Visualizations: ${checks.hasVisualizations || 0}`);
        break;
    }
  } catch (error) {
    checks.error = error.message;
  }

  return checks;
}

function generateEnhancedReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ENHANCED ROUTE TEST REPORT');
  console.log('='.repeat(80));
  
  const timestamp = new Date().toLocaleString();
  console.log(`🕐 Test completed: ${timestamp}`);
  console.log(`🔗 Site: ${SITE_URL}`);

  // Authentication Status
  console.log('\n🔐 AUTHENTICATION STATUS:');
  console.log(`Site Accessible: ${results.site.accessible ? '✅' : '❌'}`);
  console.log(`Has Auth Protection: ${results.site.hasAuth ? '🔒 YES' : '🔓 NO'}`);
  console.log(`Authentication Success: ${results.site.authenticated ? '✅' : '❌'}`);

  // API Health
  console.log('\n📡 API HEALTH STATUS:');
  const apiEndpoints = Object.keys(results.api).length;
  const workingEndpoints = Object.values(results.api).filter(api => api.status === 'success').length;
  console.log(`Working Endpoints: ${workingEndpoints}/${apiEndpoints}`);
  
  Object.entries(results.api).forEach(([name, result]) => {
    const status = result.status === 'success' ? '✅' : '❌';
    const time = result.responseTime ? `${result.responseTime}ms` : 'failed';
    console.log(`  ${status} ${name}: ${time}`);
  });

  // Route Status Summary
  console.log('\n📄 ROUTE STATUS SUMMARY:');
  const totalRoutes = Object.keys(results.routes).length;
  const workingRoutes = Object.values(results.routes).filter(r => r.accessible && r.hasExpectedContent).length;
  const accessibleRoutes = Object.values(results.routes).filter(r => r.accessible).length;
  
  console.log(`Fully Functional Routes: ${workingRoutes}/${totalRoutes} (${Math.round(workingRoutes/totalRoutes*100)}%)`);
  console.log(`Accessible Routes: ${accessibleRoutes}/${totalRoutes} (${Math.round(accessibleRoutes/totalRoutes*100)}%)`);

  // Detailed Route Analysis
  console.log('\n📊 DETAILED ROUTE ANALYSIS:');
  Object.entries(results.routes).forEach(([name, result]) => {
    const status = result.accessible && result.hasExpectedContent ? '✅ WORKING' :
                   result.accessible ? '⚠️ ACCESSIBLE' : '❌ FAILED';
    
    console.log(`\n${status} ${name}:`);
    console.log(`  Load Time: ${result.loadTime}ms`);
    console.log(`  Elements Found: ${result.elementsFound.length}`);
    console.log(`  Required Elements: ${result.requiredElementsFound.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);
    
    if (result.screenshot) {
      console.log(`  Screenshot: ${path.basename(result.screenshot)}`);
    }
    
    // Show specific checks
    if (result.specificChecks && Object.keys(result.specificChecks).length > 0) {
      console.log('  Feature Analysis:');
      Object.entries(result.specificChecks).forEach(([feature, value]) => {
        if (typeof value === 'boolean') {
          console.log(`    ${feature}: ${value ? '✅' : '❌'}`);
        } else if (typeof value === 'number') {
          console.log(`    ${feature}: ${value}`);
        }
      });
    }
    
    // Show first few errors
    if (result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.slice(0, 3).forEach(error => {
        console.log(`    • ${error.substring(0, 80)}`);
      });
    }
  });

  // Overall Issues
  console.log('\n🚨 ISSUES SUMMARY:');
  console.log(`Total Errors: ${results.errors.length}`);
  console.log(`Total Warnings: ${results.warnings.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nCritical Issues:');
    results.errors.slice(0, 10).forEach((error, i) => {
      console.log(`  ${i + 1}. ${error.substring(0, 100)}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  const recommendations = [];
  
  if (!results.site.accessible) {
    recommendations.push('🔧 Critical: Fix site accessibility - site is not reachable');
  }
  
  if (workingEndpoints < apiEndpoints) {
    recommendations.push('🔧 Fix API endpoints - some backend services are failing');
  }
  
  if (workingRoutes < totalRoutes) {
    recommendations.push('🔧 Fix route-specific issues - some pages have component errors');
  }
  
  Object.entries(results.routes).forEach(([name, result]) => {
    if (result.errors.length > 0) {
      recommendations.push(`🔧 Fix ${name} route errors - ${result.errors.length} issues found`);
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All routes are working perfectly!');
  }
  
  recommendations.forEach(rec => console.log(rec));

  // Final Assessment
  console.log('\n🎯 FINAL ASSESSMENT:');
  const overallScore = Math.round(((workingRoutes / totalRoutes) * 0.6 + (workingEndpoints / apiEndpoints) * 0.4) * 100);
  console.log(`Overall Health Score: ${overallScore}%`);
  
  let healthStatus = 'CRITICAL';
  if (overallScore >= 90) healthStatus = 'EXCELLENT';
  else if (overallScore >= 75) healthStatus = 'GOOD';
  else if (overallScore >= 50) healthStatus = 'FAIR';
  
  console.log(`System Status: ${healthStatus}`);
  results.overallHealth = healthStatus;

  console.log('\n' + '='.repeat(80));
}

// Run the enhanced test
if (require.main === module) {
  testRoutesWithAuth()
    .then((results) => {
      console.log(`\n✅ Enhanced testing complete! Overall status: ${results.overallHealth}`);
      console.log(`📁 Results saved to: test-results.json`);
      console.log(`📸 Screenshots saved to: ./test-screenshots/`);
      
      // Exit with appropriate code
      const success = results.overallHealth === 'EXCELLENT' || results.overallHealth === 'GOOD';
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Enhanced testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testRoutesWithAuth };