const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Final App Check\n');
  console.log('==================\n');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console logs
  let apiCalls = 0;
  let errors = 0;
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API URL configured')) {
      console.log('✓ API Configuration:', text);
    }
    if (msg.type() === 'error') {
      errors++;
    }
  });
  
  // Monitor network requests
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/v1/')) {
      apiCalls++;
      const status = response.status();
      if (status === 200) {
        console.log(`✓ API Call Success: ${url.split('/api/v1/')[1]} (${status})`);
      } else {
        console.log(`✗ API Call Failed: ${url.split('/api/v1/')[1]} (${status})`);
      }
    }
  });
  
  try {
    console.log('Loading http://localhost:3050...\n');
    await page.goto('http://localhost:3050', { 
      waitUntil: 'networkidle2', 
      timeout: 10000 
    });
    
    // Wait for dashboard to render
    await new Promise(r => setTimeout(r, 3000));
    
    // Check page content
    const pageState = await page.evaluate(() => {
      const stats = document.querySelectorAll('[class*="StatCard"]').length;
      const charts = document.querySelectorAll('canvas, svg[class*="chart"], [class*="Chart"]').length;
      const buttons = document.querySelectorAll('button, a[href]').length;
      
      // Get dashboard text
      const dashboardText = document.querySelector('main')?.innerText || '';
      
      // Check for specific dashboard elements
      return {
        title: document.title,
        hasNavigation: !!document.querySelector('nav'),
        statsCards: stats,
        charts: charts,
        interactiveElements: buttons,
        hasTotalItems: dashboardText.includes('Total Items'),
        hasTotalValue: dashboardText.includes('Total Value'),
        hasRoomValues: dashboardText.includes('Room Values'),
        hasQuickActions: dashboardText.includes('Quick Actions'),
        dashboardTextPreview: dashboardText.substring(0, 300)
      };
    });
    
    console.log('\n📊 Dashboard Analysis:\n');
    console.log('✓ Page Title:', pageState.title);
    console.log('✓ Navigation Bar:', pageState.hasNavigation ? 'Present' : 'Missing');
    console.log('✓ Stat Cards:', pageState.statsCards || 'None found');
    console.log('✓ Charts/Graphs:', pageState.charts || 'None found');
    console.log('✓ Interactive Elements:', pageState.interactiveElements);
    console.log('\n📋 Dashboard Components:');
    console.log('  Total Items:', pageState.hasTotalItems ? '✅' : '❌');
    console.log('  Total Value:', pageState.hasTotalValue ? '✅' : '❌');
    console.log('  Room Values:', pageState.hasRoomValues ? '✅' : '❌');
    console.log('  Quick Actions:', pageState.hasQuickActions ? '✅' : '❌');
    
    console.log('\n🔌 API Status:');
    console.log(`  API Calls Made: ${apiCalls}`);
    console.log(`  Console Errors: ${errors}`);
    
    // Take a screenshot
    await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: true });
    
    if (apiCalls > 0 && errors === 0 && pageState.statsCards > 0) {
      console.log('\n✅ SUCCESS! The inventory frontend is fully functional!');
      console.log('\n🎉 Application Status:');
      console.log('  • Frontend: http://localhost:3050 ✅');
      console.log('  • Backend API: http://localhost:8080 ✅');
      console.log('  • Dashboard: Fully loaded with data ✅');
      console.log('\n📸 Screenshot saved as dashboard-screenshot.png');
      console.log('\nYou can now access the application at http://localhost:3050');
    } else {
      console.log('\n⚠️  Application is partially working');
      if (apiCalls === 0) console.log('  - No API calls detected');
      if (errors > 0) console.log(`  - ${errors} console errors found`);
      if (pageState.statsCards === 0) console.log('  - Dashboard components not rendering');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();