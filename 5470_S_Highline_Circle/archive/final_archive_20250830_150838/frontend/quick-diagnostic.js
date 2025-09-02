const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const LOCAL_PORT = 3011;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

async function quickDiagnostic() {
  console.log('🔍 Quick Route Diagnostic');
  console.log('='.repeat(50));

  // Start server
  console.log('🌐 Starting server...');
  const server = spawn('npx', ['serve', '-s', 'dist', '-p', LOCAL_PORT.toString()], { stdio: 'pipe' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Enhanced logging
    const allIssues = {};

    page.on('console', message => {
      if (message.type() === 'error') {
        const url = page.url();
        const route = url.replace(LOCAL_URL, '') || '/';
        if (!allIssues[route]) allIssues[route] = { errors: [], warnings: [], network: [] };
        allIssues[route].errors.push({
          text: message.text(),
          location: message.location()
        });
      }
    });

    page.on('pageerror', error => {
      const url = page.url();
      const route = url.replace(LOCAL_URL, '') || '/';
      if (!allIssues[route]) allIssues[route] = { errors: [], warnings: [], network: [] };
      allIssues[route].errors.push({
        text: error.message,
        stack: error.stack
      });
    });

    const routes = [
      { name: 'Dashboard', path: '/' },
      { name: 'Inventory', path: '/inventory' },
      { name: 'Photos', path: '/photos' },
      { name: 'Analytics', path: '/analytics' },
      { name: 'Insights', path: '/insights' }
    ];

    for (const route of routes) {
      console.log(`\n📄 ${route.name} (${route.path}):`);

      try {
        const response = await page.goto(`${LOCAL_URL}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 15000
        });

        // Wait for React
        await page.waitForSelector('#root', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get detailed page state
        const pageState = await page.evaluate(() => {
          const root = document.getElementById('root');
          const rootChild = root?.firstElementChild;

          // Check for common React error boundaries
          const hasErrorBoundary = !!document.querySelector('[data-reactroot] .error-boundary, .react-error, .error-fallback');

          // Check for loading states
          const loadingElements = document.querySelectorAll('.loading, .spinner, [aria-label*="loading" i]');
          const isLoading = loadingElements.length > 0;

          // Check for empty states
          const emptyStateElements = document.querySelectorAll('.empty-state, [data-testid="empty-state"]');
          const hasEmptyState = emptyStateElements.length > 0 ||
                                 document.body.textContent.includes('No items found') ||
                                 document.body.textContent.includes('No data available');

          // Get all heading text
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
                                .map(h => h.textContent.trim())
                                .filter(text => text);

          // Count interactive elements
          const interactiveElements = {
            buttons: document.querySelectorAll('button').length,
            inputs: document.querySelectorAll('input').length,
            links: document.querySelectorAll('a').length,
            forms: document.querySelectorAll('form').length
          };

          // Check for data visualization elements
          const dataVizElements = {
            canvas: document.querySelectorAll('canvas').length,
            svg: document.querySelectorAll('svg').length,
            charts: document.querySelectorAll('.chart, [data-testid*="chart"]').length,
            tables: document.querySelectorAll('table').length
          };

          return {
            hasRoot: !!root,
            hasRootChild: !!rootChild,
            hasErrorBoundary,
            isLoading,
            hasEmptyState,
            headings,
            interactiveElements,
            dataVizElements,
            totalElements: document.querySelectorAll('*').length,
            textLength: document.body.textContent.length,
            title: document.title,
            bodyClasses: document.body.className,
            rootInnerHTML: root ? root.innerHTML.substring(0, 200) + '...' : 'NO ROOT'
          };
        });

        console.log(`  ✅ Loaded (${response.status()})`);
        console.log(`  📊 Elements: ${pageState.totalElements} total`);
        console.log(`  📝 Text: ${pageState.textLength} characters`);
        console.log(`  🏷️  Headings: ${pageState.headings.join(', ') || 'None'}`);
        console.log(`  🎯 Interactive: ${pageState.interactiveElements.buttons} buttons, ${pageState.interactiveElements.inputs} inputs`);

        if (pageState.dataVizElements.canvas + pageState.dataVizElements.svg > 0) {
          console.log(`  📈 Charts: ${pageState.dataVizElements.canvas} canvas, ${pageState.dataVizElements.svg} SVG`);
        }

        if (pageState.isLoading) {
          console.log(`  ⏳ Still loading`);
        }

        if (pageState.hasEmptyState) {
          console.log(`  📭 Empty state detected`);
        }

        if (pageState.hasErrorBoundary) {
          console.log(`  🚨 Error boundary active`);
        }

        // Route-specific checks
        if (route.name === 'Inventory' && pageState.dataVizElements.tables === 0 && !pageState.hasEmptyState) {
          console.log(`  ⚠️  No table found - data may not be loading`);
        }

        if (route.name === 'Analytics' && pageState.dataVizElements.canvas + pageState.dataVizElements.svg === 0) {
          console.log(`  ⚠️  No charts found - visualization may not be working`);
        }

      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }

    // Report all issues
    console.log('\n' + '='.repeat(50));
    console.log('🚨 ISSUES SUMMARY');
    console.log('='.repeat(50));

    let hasIssues = false;
    Object.entries(allIssues).forEach(([route, issues]) => {
      if (issues.errors.length > 0) {
        hasIssues = true;
        console.log(`\n❌ ${route} Route Issues:`);
        issues.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error.text}`);
          if (error.location && error.location.url) {
            console.log(`     at ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
          }
        });
      }
    });

    if (!hasIssues) {
      console.log('\n✅ No JavaScript errors detected!');
    }

  } finally {
    await browser.close();
    server.kill();
  }
}

if (require.main === module) {
  quickDiagnostic();
}
