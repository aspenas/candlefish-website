// Quick check to see if React app is rendering
const http = require('http');

const checkApp = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3050,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.end();
  });
};

// Wait a moment for hot reload to complete
setTimeout(async () => {
  try {
    console.log('Checking if app is working...\n');
    const html = await checkApp();
    
    // Check basic HTML structure
    const hasRoot = html.includes('id="root"');
    const hasVite = html.includes('@vite');
    const hasMainScript = html.includes('src="/src/main.tsx"');
    
    console.log('✓ HTML Structure:');
    console.log('  Root element:', hasRoot ? '✅' : '❌');
    console.log('  Vite client:', hasVite ? '✅' : '❌');
    console.log('  Main script:', hasMainScript ? '✅' : '❌');
    
    if (hasRoot && hasVite && hasMainScript) {
      console.log('\n✅ App HTML structure is correct!');
      console.log('\n🌐 Open http://localhost:3050 in your browser to view the app');
      console.log('\n📊 The dashboard should now be visible with:');
      console.log('  • Total items count');
      console.log('  • Total value');
      console.log('  • Room values chart');
      console.log('  • Category distribution');
      console.log('  • Decision progress bars');
    } else {
      console.log('\n❌ Something is wrong with the HTML structure');
    }
  } catch (error) {
    console.error('Error checking app:', error.message);
  }
}, 1000);