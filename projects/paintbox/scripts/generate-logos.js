#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const inputLogo = path.join(__dirname, '../components/logo/paintbox-logo.PNG');
const publicDir = path.join(__dirname, '../public');

async function generateLogos() {
  try {
    // Ensure public directory exists
    await fs.mkdir(publicDir, { recursive: true });

    console.log('Generating optimized logo formats...');

    // Read the original PNG
    const originalBuffer = await fs.readFile(inputLogo);

    // Generate different sizes and formats
    const logoSizes = [
      // Favicons
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
      { size: 192, name: 'android-chrome-192x192.png' },
      { size: 512, name: 'android-chrome-512x512.png' },

      // App usage
      { size: 40, name: 'logo-desktop.png' },
      { size: 32, name: 'logo-mobile.png' },
      { size: 64, name: 'logo-desktop@2x.png' },
      { size: 80, name: 'logo-desktop@3x.png' },

      // PWA and splash screens
      { size: 256, name: 'logo-256.png' },
      { size: 512, name: 'logo-512.png' },

      // High resolution
      { size: 1024, name: 'logo-1024.png' }
    ];

    // Generate PNG files in different sizes
    for (const { size, name } of logoSizes) {
      await sharp(originalBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 95, compressionLevel: 9 })
        .toFile(path.join(publicDir, name));

      console.log(`Generated: ${name}`);
    }

    // Generate WebP formats for modern browsers
    const webpSizes = [32, 40, 64, 80, 192, 256, 512];
    for (const size of webpSizes) {
      const fileName = `logo-${size}.webp`;
      await sharp(originalBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toFile(path.join(publicDir, fileName));

      console.log(`Generated: ${fileName}`);
    }

    // Generate AVIF formats for cutting-edge browsers
    const avifSizes = [32, 40, 64, 80];
    for (const size of avifSizes) {
      const fileName = `logo-${size}.avif`;
      try {
        await sharp(originalBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .avif({ quality: 80 })
          .toFile(path.join(publicDir, fileName));

        console.log(`Generated: ${fileName}`);
      } catch (error) {
        console.log(`AVIF not supported, skipping ${fileName}`);
      }
    }

    // Generate SVG version for scalability (this is a placeholder - would need actual SVG)
    // For now, we'll create a high-quality PNG that can scale well
    await sharp(originalBuffer)
      .resize(500, 500, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(publicDir, 'logo.png'));

    // Generate favicon.ico (requires the ico format - we'll use PNG for now)
    await sharp(originalBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    console.log('All logo formats generated successfully!');
    console.log('Files created in /public directory');

  } catch (error) {
    console.error('Error generating logos:', error);
    process.exit(1);
  }
}

// Run the script
generateLogos();
