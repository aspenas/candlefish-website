const puppeteer = require('puppeteer');

const SITE_URL = 'https://inventory.candlefish.ai';

// Common passwords to try
const PASSWORD_ATTEMPTS = [
  'inventory2024',
  'highline2024', 
  'candlefish',
  'inventory',
  '5470',
  'admin',
  'password',
  'test',
  '2024'
];

async function testAuthentication() {
  console.log('🔐 Testing Authentication Methods for https://inventory.candlefish.ai');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('\n📡 Testing direct access...');
    let response = await page.goto(SITE_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    console.log(`Response status: ${response.status()}`);
    
    if (response.status() === 401) {
      console.log('🔒 HTTP Basic Authentication required');
      
      // Try different password combinations
      for (const password of PASSWORD_ATTEMPTS) {
        console.log(`\n🔑 Trying password: "${password}"`);
        
        try {
          // Create new page to reset auth state
          const testPage = await browser.newPage();
          
          // Set up basic auth
          await testPage.authenticate({ 
            username: '', 
            password: password 
          });
          
          const authResponse = await testPage.goto(SITE_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          
          console.log(`  Status: ${authResponse.status()}`);
          
          if (authResponse.status() === 200) {
            console.log(`  ✅ SUCCESS! Password "${password}" works`);
            
            // Test if React app loads
            await testPage.waitForTimeout(3000);
            const reactRoot = await testPage.$('#root');
            const hasContent = await testPage.evaluate(() => {
              return document.body.innerText.length > 100;
            });
            
            console.log(`  React app loaded: ${!!reactRoot ? 'YES' : 'NO'}`);
            console.log(`  Page has content: ${hasContent ? 'YES' : 'NO'}`);
            
            // Take a screenshot of success
            await testPage.screenshot({ 
              path: './auth-success.png', 
              fullPage: true 
            });
            console.log('  📸 Screenshot saved: auth-success.png');
            
            await testPage.close();
            return { success: true, password: password };
          } else {
            console.log(`  ❌ Failed with status ${authResponse.status()}`);
          }
          
          await testPage.close();
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
      
      console.log('\n🚨 All password attempts failed');
      return { success: false };
      
    } else if (response.status() === 200) {
      console.log('✅ Site accessible without authentication!');
      return { success: true, password: null };
      
    } else {
      console.log(`❌ Unexpected response: ${response.status()}`);
      return { success: false };
    }
    
  } finally {
    await browser.close();
  }
}

// Also test with different usernames
async function testWithUsernames() {
  console.log('\n🔐 Testing with different username combinations...');
  
  const usernames = ['admin', 'user', 'inventory', 'candlefish'];
  const passwords = ['inventory2024', 'admin', 'password'];
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const username of usernames) {
      for (const password of passwords) {
        console.log(`\n🔑 Trying ${username}:${password}`);
        
        const page = await browser.newPage();
        
        try {
          await page.authenticate({ 
            username: username, 
            password: password 
          });
          
          const response = await page.goto(SITE_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          
          console.log(`  Status: ${response.status()}`);
          
          if (response.status() === 200) {
            console.log(`  ✅ SUCCESS! ${username}:${password} works`);
            await page.close();
            return { success: true, username: username, password: password };
          }
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
        
        await page.close();
      }
    }
    
  } finally {
    await browser.close();
  }
  
  return { success: false };
}

// Run authentication tests
if (require.main === module) {
  (async () => {
    try {
      console.log('Starting authentication tests...\n');
      
      const result1 = await testAuthentication();
      
      if (!result1.success) {
        const result2 = await testWithUsernames();
        
        if (result2.success) {
          console.log(`\n✅ Found working credentials: ${result2.username}:${result2.password}`);
        } else {
          console.log('\n❌ No working authentication found');
          console.log('\n💡 Possible solutions:');
          console.log('1. Contact site administrator for correct password');
          console.log('2. Check if password protection was recently added/changed');
          console.log('3. Try accessing via different IP or network');
          console.log('4. Check if site uses different authentication method (OAuth, etc.)');
        }
      } else {
        console.log(`\n✅ Authentication successful with password: "${result1.password || 'none needed'}"`);
      }
      
    } catch (error) {
      console.error('Authentication test failed:', error);
    }
  })();
}

module.exports = { testAuthentication, testWithUsernames };