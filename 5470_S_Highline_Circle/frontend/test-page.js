// Simple test to check if React app is loading
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3050,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    // Check if HTML contains expected elements
    const hasRoot = body.includes('id="root"');
    const hasMainScript = body.includes('src="/src/main.tsx"');
    const hasVite = body.includes('@vite');
    
    console.log('\n✓ Checks:');
    console.log('  Root div present:', hasRoot);
    console.log('  Main script present:', hasMainScript);
    console.log('  Vite client present:', hasVite);
    
    if (!hasRoot || !hasMainScript) {
      console.log('\n⚠️  Missing critical elements!');
    } else {
      console.log('\n✅ HTML structure looks correct');
    }
    
    // Show first 500 chars of body
    console.log('\n📄 Body preview:');
    console.log(body.substring(0, 500) + '...');
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();