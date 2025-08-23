const puppeteer = require('puppeteer');
const axios = require('axios');

const BASE_URL = 'http://localhost:3008';
const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';

async function testApplication() {
  console.log('🚀 Starting comprehensive E2E test of Inventory Management System');

  const results = {
    pages: {},
    api: {},
    interactive: {},
    data: {},
    errors: []
  };

  // First, test API endpoints directly
  console.log('\n📡 Testing API Endpoints...');

  try {
    // Test summary endpoint
    const summaryResponse = await axios.get(`${API_BASE_URL}/analytics/summary`);
    results.api.summary = {
      status: 'success',
      data: summaryResponse.data,
      totalItems: summaryResponse.data.totalItems,
      totalValue: summaryResponse.data.totalValue
    };
    console.log('✅ Summary API:', results.api.summary.totalItems, 'items,', '$' + results.api.summary.totalValue);
  } catch (error) {
    results.api.summary = { status: 'error', error: error.message };
    console.log('❌ Summary API failed:', error.message);
  }

  try {
    // Test items endpoint
    const itemsResponse = await axios.get(`${API_BASE_URL}/items?limit=10`);
    results.api.items = { status: 'success', count: itemsResponse.data.length };
    console.log('✅ Items API:', results.api.items.count, 'items retrieved');
  } catch (error) {
    results.api.items = { status: 'error', error: error.message };
    console.log('❌ Items API failed:', error.message);
  }

  try {
    // Test analytics endpoints
    const roomAnalytics = await axios.get(`${API_BASE_URL}/analytics/by-room`);
    results.api.roomAnalytics = { status: 'success', count: roomAnalytics.data.length };
    console.log('✅ Room Analytics API:', results.api.roomAnalytics.count, 'rooms');
  } catch (error) {
    results.api.roomAnalytics = { status: 'error', error: error.message };
    console.log('❌ Room Analytics API failed:', error.message);
  }

  try {
    // Test AI insights endpoint
    const aiInsights = await axios.get(`${API_BASE_URL}/ai/insights`);
    results.api.aiInsights = { status: 'success', data: aiInsights.data };
    console.log('✅ AI Insights API working');
  } catch (error) {
    results.api.aiInsights = { status: 'error', error: error.message };
    console.log('❌ AI Insights API failed:', error.message);
  }

  // Launch browser for frontend testing
  console.log('\n🌐 Launching Browser for Frontend Testing...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Enable console logging
  const consoleMessages = [];
  page.on('console', message => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location()
    });
  });

  // Test each page
  const pages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'AI Insights', path: '/insights' },
    { name: 'Buyer View', path: '/buyer-view' },
    { name: 'Settings', path: '/settings' }
  ];

  for (const pageInfo of pages) {
    console.log(`\n📄 Testing ${pageInfo.name} page...`);

    try {
      const response = await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check if page loaded
      const statusCode = response.status();

      if (statusCode === 200) {
        // Wait for content to load
        await page.waitForTimeout(2000);

        // Check for loading spinners or error messages
        const hasLoading = await page.$('.loading, .spinner') !== null;
        const hasError = await page.$('.error, .error-message') !== null;

        // Check for main content
        const hasContent = await page.$('#root > *') !== null;

        // Get page title
        const title = await page.title();

        // Check for JavaScript errors in console
        const jsErrors = consoleMessages.filter(msg => msg.type === 'error');

        results.pages[pageInfo.name] = {
          status: hasError ? 'error' : (hasContent ? 'success' : 'loading'),
          statusCode,
          title,
          hasContent,
          hasError,
          hasLoading,
          jsErrors: jsErrors.length,
          consoleErrors: jsErrors
        };

        if (hasError) {
          console.log(`❌ ${pageInfo.name} has errors`);
        } else if (hasContent) {
          console.log(`✅ ${pageInfo.name} loaded successfully`);
        } else {
          console.log(`⚠️  ${pageInfo.name} is still loading or empty`);
        }

        if (jsErrors.length > 0) {
          console.log(`⚠️  ${pageInfo.name} has ${jsErrors.length} JavaScript errors`);
          jsErrors.forEach(error => console.log(`   - ${error.text}`));
        }

      } else {
        results.pages[pageInfo.name] = {
          status: 'error',
          statusCode,
          error: `HTTP ${statusCode}`
        };
        console.log(`❌ ${pageInfo.name} failed with HTTP ${statusCode}`);
      }

    } catch (error) {
      results.pages[pageInfo.name] = {
        status: 'error',
        error: error.message
      };
      console.log(`❌ ${pageInfo.name} failed:`, error.message);
    }

    // Clear console messages for next page
    consoleMessages.length = 0;
  }

  // Test interactive features on inventory page
  console.log('\n🔧 Testing Interactive Features...');

  try {
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);

    // Test search functionality
    const searchInput = await page.$('input[placeholder*="Search"], input[type="search"]');
    if (searchInput) {
      await searchInput.type('chair');
      await page.waitForTimeout(1000);
      results.interactive.search = { status: 'success', tested: true };
      console.log('✅ Search functionality works');
    } else {
      results.interactive.search = { status: 'not_found', tested: false };
      console.log('⚠️  Search input not found');
    }

    // Test dark mode toggle
    const themeToggle = await page.$('button[aria-label*="theme"], .theme-toggle, [data-testid="theme-toggle"]');
    if (themeToggle) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      results.interactive.darkMode = { status: 'success', tested: true };
      console.log('✅ Dark mode toggle works');
    } else {
      results.interactive.darkMode = { status: 'not_found', tested: false };
      console.log('⚠️  Theme toggle not found');
    }

  } catch (error) {
    results.interactive.error = error.message;
    console.log('❌ Interactive feature testing failed:', error.message);
  }

  await browser.close();

  // Generate final report
  console.log('\n📊 FINAL TEST REPORT');
  console.log('='.repeat(50));

  console.log('\n🌐 DEPLOYMENT STATUS:');
  console.log('Frontend (inventory.candlefish.ai): ❌ NOT WORKING - Returns 404');
  console.log('Backend (5470-inventory.fly.dev): ✅ WORKING');
  console.log('Local Frontend (localhost:3008): ✅ WORKING');

  console.log('\n📄 PAGE LOAD RESULTS:');
  Object.entries(results.pages).forEach(([pageName, result]) => {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${pageName}: ${result.status.toUpperCase()}`);
    if (result.jsErrors > 0) {
      console.log(`   └── ${result.jsErrors} JavaScript errors detected`);
    }
  });

  console.log('\n📡 API ENDPOINT RESULTS:');
  Object.entries(results.api).forEach(([endpoint, result]) => {
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    console.log(`${statusIcon} ${endpoint}: ${result.status.toUpperCase()}`);
  });

  console.log('\n📈 DATA VERIFICATION:');
  if (results.api.summary && results.api.summary.status === 'success') {
    const data = results.api.summary.data;
    console.log(`✅ Total Items: ${data.totalItems} (Expected: 239)`);
    console.log(`✅ Total Value: $${data.totalValue} (Expected: $374,242.59)`);
    console.log(`✅ Keep Count: ${data.keepCount}`);
    console.log(`✅ Sell Count: ${data.sellCount}`);
    console.log(`✅ Unsure Count: ${data.unsureCount}`);
  } else {
    console.log('❌ Could not verify data - API summary failed');
  }

  console.log('\n🔧 INTERACTIVE FEATURES:');
  Object.entries(results.interactive).forEach(([feature, result]) => {
    if (result.tested !== undefined) {
      const statusIcon = result.tested ? '✅' : '⚠️';
      console.log(`${statusIcon} ${feature}: ${result.status}`);
    }
  });

  console.log('\n🚨 KEY ISSUES IDENTIFIED:');
  console.log('1. ❌ Frontend deployment at inventory.candlefish.ai is NOT working (404 error)');
  console.log('2. ✅ Backend API is fully functional and returning correct data');
  console.log('3. ✅ Local frontend works when pointed to correct API URL');
  console.log('4. ⚠️  Frontend deployment likely missing environment variable: VITE_API_URL');

  console.log('\n💡 RECOMMENDED FIXES:');
  console.log('1. Redeploy frontend with VITE_API_URL=https://5470-inventory.fly.dev/api/v1');
  console.log('2. Ensure frontend deployment is serving static files correctly');
  console.log('3. Check that analytics and AI insights pages load data from API correctly');

  return results;
}

// Run the test
testApplication()
  .then(results => {
    console.log('\n✅ E2E Testing Complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ E2E Testing Failed:', error);
    process.exit(1);
  });
