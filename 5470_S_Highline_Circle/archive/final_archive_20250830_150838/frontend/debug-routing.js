const puppeteer = require('puppeteer');

async function debugRouting() {
  console.log('🔍 Debugging React Router configuration for inventory.candlefish.ai...\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set up console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Set up error logging
  page.on('error', err => {
    console.error('❌ Page Error:', err.message);
  });

  page.on('pageerror', err => {
    console.error('❌ JavaScript Error:', err.message);
  });

  try {
    console.log('📍 Testing root path (/)...');
    await page.goto('https://inventory.candlefish.ai/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check if React app loaded
    const reactRoot = await page.$('#root');
    if (reactRoot) {
      console.log('✅ React app root element found');

      // Check what's actually rendered
      const rootContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.slice(0, 500) : 'No root content';
      });
      console.log('📄 Root content preview:', rootContent);
    } else {
      console.log('❌ React app root element NOT found');
    }

    console.log('\n📍 Testing /inventory route...');
    await page.goto('https://inventory.candlefish.ai/inventory', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check if inventory page loaded
    const inventoryTitle = await page.evaluate(() => {
      const title = document.querySelector('h1');
      return title ? title.textContent : 'No h1 found';
    });
    console.log('📄 Page title:', inventoryTitle);

    console.log('\n📍 Testing /photos route...');
    await page.goto('https://inventory.candlefish.ai/photos', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Check if photos page loaded
    const photosTitle = await page.evaluate(() => {
      const title = document.querySelector('h1');
      return title ? title.textContent : 'No h1 found';
    });
    console.log('📄 Page title:', photosTitle);

    // Check React Router state
    console.log('\n🔍 Checking React Router state...');
    const routerInfo = await page.evaluate(() => {
      // Check if React Router is working
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      return {
        pathname,
        hash,
        search,
        userAgent: navigator.userAgent,
        reactVersion: window.React?.version || 'React not found',
      };
    });

    console.log('🌐 Router state:', JSON.stringify(routerInfo, null, 2));

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }

  // Keep browser open for manual inspection
  console.log('\n✋ Browser will stay open for manual inspection...');
  console.log('Press Ctrl+C to close when done.');

  // Don't close browser automatically
  // await browser.close();
}

debugRouting().catch(console.error);
