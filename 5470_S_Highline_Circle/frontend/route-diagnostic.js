const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const LOCAL_PORT = 3010;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

async function startServer() {
  console.log('🌐 Starting server...');
  const server = spawn('npx', ['serve', '-s', 'dist', '-p', LOCAL_PORT.toString()], {
    stdio: 'pipe'
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`✅ Server running at ${LOCAL_URL}`);
  return server;
}

async function diagnoseRoutes() {
  console.log('🔍 Route Diagnostics');
  console.log('='.repeat(50));

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Enhanced error monitoring
    const allLogs = [];

    page.on('console', message => {
      allLogs.push({
        type: 'console',
        level: message.type(),
        text: message.text(),
        location: message.location()
      });
    });

    page.on('pageerror', error => {
      allLogs.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack
      });
    });

    page.on('requestfailed', request => {
      allLogs.push({
        type: 'networkfail',
        url: request.url(),
        failure: request.failure()
      });
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        allLogs.push({
          type: 'http_error',
          url: response.url(),
          status: response.status()
        });
      }
    });

    const routes = [
      { name: 'Dashboard', path: '/' },
      { name: 'Inventory', path: '/inventory' },
      { name: 'Photos', path: '/photos' },
      { name: 'Analytics', path: '/analytics' },
      { name: 'Insights', path: '/insights' }
    ];

    for (const route of routes) {
      console.log(`\n🔍 Diagnosing ${route.name} (${route.path})...`);

      try {
        allLogs.length = 0; // Clear logs

        const response = await page.goto(`${LOCAL_URL}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        console.log(`  Status: ${response.status()}`);

        // Wait for React to load
        await page.waitForSelector('#root', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Detailed page analysis
        const pageInfo = await page.evaluate(() => {
          const root = document.getElementById('root');

          return {
            title: document.title,
            url: window.location.pathname,
            rootContent: root ? root.innerHTML.substring(0, 500) : 'NO ROOT',
            hasReactError: !!document.querySelector('.react-error-overlay'),
            reactComponents: document.querySelectorAll('[data-reactroot], .app, #root > div').length,
            totalElements: document.querySelectorAll('*').length,
            textContent: document.body.textContent.substring(0, 1000),
            loadingElements: document.querySelectorAll('.loading, .spinner, [data-testid="loading"]').length,
            errorElements: document.querySelectorAll('.error, .error-message, [data-testid="error"]').length,
            visibleText: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
            reactErrors: window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__?.onBuildError || null
          };
        });

        console.log(`  React Elements: ${pageInfo.reactComponents}`);
        console.log(`  Total Elements: ${pageInfo.totalElements}`);
        console.log(`  Loading States: ${pageInfo.loadingElements}`);
        console.log(`  Error States: ${pageInfo.errorElements}`);
        console.log(`  Headings: ${pageInfo.visibleText.join(', ')}`);

        if (pageInfo.hasReactError) {
          console.log(`  🚨 React Error Overlay Detected`);
        }

        // Check for specific route issues
        await checkRouteSpecifics(page, route.name);

        // Log all errors for this route
        const errors = allLogs.filter(log => log.type === 'pageerror' || log.level === 'error');
        const warnings = allLogs.filter(log => log.level === 'warning');
        const networkFails = allLogs.filter(log => log.type === 'networkfail');

        if (errors.length > 0) {
          console.log(`  🚨 JavaScript Errors (${errors.length}):`);
          errors.forEach((error, i) => {
            console.log(`    ${i + 1}. ${error.message || error.text}`);
            if (error.location) {
              console.log(`       at ${error.location.url}:${error.location.lineNumber}`);
            }
          });
        }

        if (warnings.length > 0) {
          console.log(`  ⚠️  Warnings (${warnings.length}):`);
          warnings.slice(0, 3).forEach((warning, i) => {
            console.log(`    ${i + 1}. ${warning.text}`);
          });
        }

        if (networkFails.length > 0) {
          console.log(`  🌐 Network Failures (${networkFails.length}):`);
          networkFails.forEach((fail, i) => {
            console.log(`    ${i + 1}. ${fail.url} - ${fail.failure.errorText}`);
          });
        }

        // Take a screenshot for visual verification
        await page.screenshot({
          path: `screenshot-${route.name.toLowerCase()}.png`,
          fullPage: true
        });
        console.log(`  📷 Screenshot saved: screenshot-${route.name.toLowerCase()}.png`);

      } catch (error) {
        console.log(`  ❌ Route failed: ${error.message}`);
      }
    }

  } finally {
    await browser.close();
  }
}

async function checkRouteSpecifics(page, routeName) {
  const checks = {};

  try {
    switch (routeName) {
      case 'Inventory':
        checks.hasInventoryTitle = await page.$('h1') !== null;
        checks.hasTable = await page.$('table, [role="table"]') !== null;
        checks.hasSearchInput = await page.$('input[type="search"], input[placeholder*="search" i]') !== null;
        checks.hasFilterPanel = await page.$('.filter-panel, .filter') !== null;
        checks.hasItems = await page.$$('tr, .item-row').then(els => els.length > 1);

        // Check if data is loading
        const loadingState = await page.evaluate(() => {
          return {
            hasSpinner: !!document.querySelector('.loading, .spinner'),
            bodyText: document.body.textContent.toLowerCase(),
            hasEmptyState: document.body.textContent.includes('No items found') || document.body.textContent.includes('empty')
          };
        });

        checks.isLoading = loadingState.hasSpinner;
        checks.isEmpty = loadingState.hasEmptyState;
        checks.hasInventoryText = loadingState.bodyText.includes('inventory');
        break;

      case 'Photos':
        checks.hasPhotoTitle = await page.$('h1') !== null;
        checks.hasTabs = await page.$$('.tab, [role="tab"]').then(els => els.length > 0);
        checks.hasUploadArea = await page.$('.upload, [data-testid="upload"]') !== null;
        checks.hasProgressBar = await page.$('.progress') !== null;
        break;

      case 'Analytics':
        checks.hasAnalyticsTitle = await page.$('h1') !== null;
        checks.hasCharts = await page.$$('canvas, svg').then(els => els.length > 0);
        checks.hasMetrics = await page.$$('.metric, .stat-card, .card').then(els => els.length > 0);
        checks.hasData = await page.evaluate(() => {
          return !document.body.textContent.includes('No data') &&
                 !document.body.textContent.includes('Unable to load');
        });
        break;

      case 'Insights':
        checks.hasInsightsTitle = await page.$('h1') !== null;
        checks.hasInsightCards = await page.$$('.insight').then(els => els.length > 0);
        checks.hasVisualizations = await page.$$('canvas, svg').then(els => els.length > 0);
        checks.hasAIContent = await page.evaluate(() => {
          return document.body.textContent.toLowerCase().includes('ai') ||
                 document.body.textContent.toLowerCase().includes('insight');
        });
        break;
    }

    console.log(`  Feature Analysis:`);
    Object.entries(checks).forEach(([feature, hasFeature]) => {
      console.log(`    ${hasFeature ? '✅' : '❌'} ${feature}`);
    });

  } catch (error) {
    console.log(`  ❌ Feature check failed: ${error.message}`);
  }
}

async function main() {
  let server;

  try {
    server = await startServer();
    await diagnoseRoutes();
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    if (server) {
      server.kill();
    }
  }
}

if (require.main === module) {
  main();
}
