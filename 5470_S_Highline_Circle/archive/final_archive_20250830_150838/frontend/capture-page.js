const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Capturing page state...\n');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push({ type, text });
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log('💥 Page Error:', error.message);
  });
  
  // Capture response errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`⚠️  HTTP ${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    console.log('Loading http://localhost:3050...\n');
    await page.goto('http://localhost:3050', { 
      waitUntil: 'networkidle2', 
      timeout: 10000 
    });
    
    // Wait for potential React rendering
    await page.waitForSelector('#root', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 2000)); // Additional wait
    
    // Check page content
    const pageContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      const title = document.title;
      const bodyClasses = document.body.className;
      
      // Check for specific React elements
      const hasNavigation = !!document.querySelector('nav');
      const hasMain = !!document.querySelector('main');
      const hasDashboard = !!document.querySelector('[class*="Dashboard"]');
      
      // Get text content (first 200 chars)
      const textContent = document.body.innerText?.substring(0, 200);
      
      return {
        title,
        bodyClasses,
        rootHTML: root ? root.innerHTML.substring(0, 500) : 'No root element',
        rootChildren: root ? root.children.length : 0,
        hasNavigation,
        hasMain,
        hasDashboard,
        textContent,
        // Check for loading indicators
        hasSpinner: !!document.querySelector('[class*="spinner"], [class*="loading"], [class*="animate-pulse"]'),
        // Check for error messages
        hasError: !!document.querySelector('[class*="error"], [class*="Error"]')
      };
    });
    
    console.log('📊 Page Analysis:\n');
    console.log('Title:', pageContent.title);
    console.log('Body Classes:', pageContent.bodyClasses || 'none');
    console.log('Root Children:', pageContent.rootChildren);
    console.log('Has Navigation:', pageContent.hasNavigation ? '✅' : '❌');
    console.log('Has Main Content:', pageContent.hasMain ? '✅' : '❌');
    console.log('Has Dashboard:', pageContent.hasDashboard ? '✅' : '❌');
    console.log('Has Loading Spinner:', pageContent.hasSpinner ? '⏳' : '❌');
    console.log('Has Error:', pageContent.hasError ? '❌' : '✅ No errors');
    
    if (pageContent.textContent) {
      console.log('\n📄 Page Text Preview:');
      console.log(pageContent.textContent);
    }
    
    if (pageContent.rootChildren > 0) {
      console.log('\n✅ SUCCESS! React app is rendering!');
      console.log('The page should now be visible at http://localhost:3050');
    } else {
      console.log('\n❌ React app is not rendering content');
      console.log('\n🔍 Console logs captured:');
      consoleLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'page-state.png' });
    console.log('\n📸 Screenshot saved as page-state.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();