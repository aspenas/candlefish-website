const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Checking for console errors...\n');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  const logs = [];
  
  // Listen to console events
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
      console.log('❌ ERROR:', text);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log('⚠️  WARNING:', text);
    } else if (type === 'log') {
      logs.push(text);
      console.log('📝 LOG:', text);
    }
  });
  
  // Listen to page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('💥 PAGE ERROR:', error.message);
  });
  
  try {
    console.log('Loading http://localhost:3050...\n');
    await page.goto('http://localhost:3050', { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Check if root element has children
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'No root element found';
      return {
        hasChildren: root.children.length > 0,
        childCount: root.children.length,
        innerHTML: root.innerHTML.substring(0, 200)
      };
    });
    
    console.log('\n📊 Analysis Results:');
    console.log('-------------------');
    console.log(`Errors found: ${errors.length}`);
    console.log(`Warnings found: ${warnings.length}`);
    console.log(`Logs found: ${logs.length}`);
    console.log('\nRoot element status:', rootContent);
    
    if (errors.length === 0 && rootContent.hasChildren) {
      console.log('\n✅ App appears to be loading correctly!');
    } else if (errors.length > 0) {
      console.log('\n❌ There are errors preventing the app from loading.');
    } else if (!rootContent.hasChildren) {
      console.log('\n⚠️  React app is not rendering content in the root element.');
    }
    
  } catch (error) {
    console.error('Failed to load page:', error.message);
  }
  
  await browser.close();
})();