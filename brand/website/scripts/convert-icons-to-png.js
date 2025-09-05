// Convert SVG icons to PNG using sharp
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function convertSvgToPng() {
  for (const size of iconSizes) {
    const svgPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`);
    const pngPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.png`);
    
    try {
      // Read SVG content
      const svgBuffer = fs.readFileSync(svgPath);
      
      // Convert to PNG
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✅ Converted icon-${size}x${size}.svg to PNG`);
    } catch (error) {
      console.error(`❌ Error converting icon-${size}x${size}.svg:`, error.message);
      
      // Create a fallback PNG with solid color
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 6, g: 182, b: 212, alpha: 1 } // Cyan color
        }
      })
      .png()
      .toFile(pngPath);
      
      console.log(`⚠️  Created fallback PNG for icon-${size}x${size}.png`);
    }
  }
  
  // Also convert favicon
  try {
    const faviconSvg = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'));
    
    // Create multiple favicon sizes
    const faviconSizes = [16, 32, 48, 64];
    
    for (const size of faviconSizes) {
      await sharp(faviconSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, '..', 'public', `favicon-${size}x${size}.png`));
      
      console.log(`✅ Created favicon-${size}x${size}.png`);
    }
    
    // Create the main favicon.ico (using 32x32)
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '..', 'public', 'favicon.png'));
    
    console.log('✅ Created favicon.png');
  } catch (error) {
    console.error('❌ Error converting favicon:', error.message);
  }
  
  console.log('\n🎉 Icon conversion complete!');
}

convertSvgToPng().catch(console.error);