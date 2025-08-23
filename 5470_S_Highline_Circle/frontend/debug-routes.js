const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function debugRoutes() {
  console.log('🔍 Debug Route Issues');
  console.log('='.repeat(30));

  // Start server
  const server = spawn('npx', ['serve', '-s', 'dist', '-p', '3012'], { stdio: 'pipe' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    slowMo: 100
  });

  try {
    const page = await browser.newPage();

    // Enhanced error capturing
    const allErrors = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        allErrors.push({
          type: 'console_error',
          text: message.text(),
          location: message.location(),
          args: message.args()
        });
      }
    });

    page.on('pageerror', error => {
      allErrors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        allErrors.push({
          type: 'http_error',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Test problematic routes
    const problemRoutes = ['/inventory', '/photos'];

    for (const route of problemRoutes) {
      console.log(`\n🔍 Debugging ${route}...`);
      allErrors.length = 0; // Clear previous errors

      try {
        await page.goto(`http://localhost:3012${route}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });

        // Wait for any potential errors to surface
        await page.waitForTimeout(3000);

        // Check page state
        const pageState = await page.evaluate(() => {
          const root = document.getElementById('root');
          const errorElements = document.querySelectorAll('.error, [data-testid="error"]');
          const loadingElements = document.querySelectorAll('.loading, .spinner');

          return {
            hasRoot: !!root,
            hasError: errorElements.length > 0,
            isLoading: loadingElements.length > 0,
            bodyText: document.body.textContent.substring(0, 200),
            title: document.title,
            rootHTML: root ? root.innerHTML.substring(0, 300) + '...' : 'NO ROOT'
          };
        });

        console.log(`  State: ${JSON.stringify(pageState, null, 2)}`);

        if (allErrors.length > 0) {
          console.log(`  Errors found: ${allErrors.length}`);
          allErrors.forEach((error, i) => {
            console.log(`    ${i + 1}. [${error.type}] ${error.message || error.text}`);
            if (error.stack) {
              console.log(`       Stack: ${error.stack.split('\n')[0]}`);
            }
            if (error.location) {
              console.log(`       Location: ${error.location.url}:${error.location.lineNumber}`);
            }
          });
        } else {
          console.log(`  ✅ No errors found`);
        }

        // Take screenshot
        await page.screenshot({
          path: `debug-${route.replace('/', '')}.png`,
          fullPage: true
        });

      } catch (error) {
        console.log(`  ❌ Failed to load: ${error.message}`);
      }
    }

  } finally {
    await browser.close();
    server.kill();
  }
}

if (require.main === module) {
  debugRoutes();
}
