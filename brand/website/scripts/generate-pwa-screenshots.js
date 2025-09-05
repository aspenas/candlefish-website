// Generate PWA screenshots using Puppeteer
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateScreenshots() {
  console.log('🚀 Generating PWA screenshots...\n');
  
  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Desktop screenshot
    console.log('📸 Capturing desktop screenshot...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    await desktopPage.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for animations to complete
    await desktopPage.waitForTimeout(2000);
    
    await desktopPage.screenshot({
      path: path.join(screenshotsDir, 'desktop-home.png'),
      fullPage: false
    });
    console.log('✅ Desktop screenshot saved');

    // Mobile screenshot
    console.log('📱 Capturing mobile screenshot...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ 
      width: 390, 
      height: 844,
      isMobile: true,
      hasTouch: true
    });
    await mobilePage.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await mobilePage.waitForTimeout(2000);
    
    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'mobile-home.png'),
      fullPage: false
    });
    console.log('✅ Mobile screenshot saved');

    // Tablet screenshot (optional but good for PWA)
    console.log('📱 Capturing tablet screenshot...');
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ 
      width: 820, 
      height: 1180,
      isMobile: true,
      hasTouch: true
    });
    await tabletPage.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await tabletPage.waitForTimeout(2000);
    
    await tabletPage.screenshot({
      path: path.join(screenshotsDir, 'tablet-home.png'),
      fullPage: false
    });
    console.log('✅ Tablet screenshot saved');

    await browser.close();
    
    console.log('\n🎉 All screenshots generated successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error generating screenshots:', error.message);
    console.log('\n💡 Tip: Make sure the dev server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
    
    // Generate placeholder screenshots as fallback
    console.log('\n📝 Creating placeholder screenshots...');
    await createPlaceholderScreenshots(screenshotsDir);
  }
}

async function createPlaceholderScreenshots(screenshotsDir) {
  const sharp = require('sharp');
  
  // Desktop placeholder
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 }
    }
  })
  .composite([{
    input: Buffer.from(`
      <svg width="1920" height="1080">
        <rect width="1920" height="1080" fill="#111827"/>
        <text x="960" y="500" font-family="Arial" font-size="48" fill="#06b6d4" text-anchor="middle">
          Candlefish.ai
        </text>
        <text x="960" y="580" font-family="Arial" font-size="24" fill="#9ca3af" text-anchor="middle">
          Operational Design Atelier
        </text>
      </svg>
    `),
    top: 0,
    left: 0
  }])
  .png()
  .toFile(path.join(screenshotsDir, 'desktop-home.png'));
  
  console.log('✅ Desktop placeholder created');
  
  // Mobile placeholder
  await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 }
    }
  })
  .composite([{
    input: Buffer.from(`
      <svg width="390" height="844">
        <rect width="390" height="844" fill="#111827"/>
        <text x="195" y="400" font-family="Arial" font-size="32" fill="#06b6d4" text-anchor="middle">
          Candlefish
        </text>
        <text x="195" y="450" font-family="Arial" font-size="16" fill="#9ca3af" text-anchor="middle">
          Mobile View
        </text>
      </svg>
    `),
    top: 0,
    left: 0
  }])
  .png()
  .toFile(path.join(screenshotsDir, 'mobile-home.png'));
  
  console.log('✅ Mobile placeholder created');
  
  // Tablet placeholder
  await sharp({
    create: {
      width: 820,
      height: 1180,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 }
    }
  })
  .composite([{
    input: Buffer.from(`
      <svg width="820" height="1180">
        <rect width="820" height="1180" fill="#111827"/>
        <text x="410" y="550" font-family="Arial" font-size="40" fill="#06b6d4" text-anchor="middle">
          Candlefish
        </text>
        <text x="410" y="610" font-family="Arial" font-size="20" fill="#9ca3af" text-anchor="middle">
          Tablet View
        </text>
      </svg>
    `),
    top: 0,
    left: 0
  }])
  .png()
  .toFile(path.join(screenshotsDir, 'tablet-home.png'));
  
  console.log('✅ Tablet placeholder created');
}

// Check if running directly
if (require.main === module) {
  generateScreenshots();
}

module.exports = { generateScreenshots };