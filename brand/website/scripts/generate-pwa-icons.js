// Generate PWA icons from SVG
const fs = require('fs');
const path = require('path');

// SVG template for the Candlefish icon
const createSvgIcon = (size) => {
  const padding = size * 0.1;
  const fishSize = size - (padding * 2);
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fishGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bgGradient)"/>
  
  <!-- Candlefish shape -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Body -->
    <ellipse cx="0" cy="0" rx="${fishSize * 0.35}" ry="${fishSize * 0.2}" 
             fill="url(#fishGradient)" filter="url(#glow)"
             transform="rotate(-15)" />
    
    <!-- Tail -->
    <path d="M ${fishSize * 0.25} ${fishSize * 0.05} 
             Q ${fishSize * 0.4} ${-fishSize * 0.1} ${fishSize * 0.45} ${-fishSize * 0.05}
             L ${fishSize * 0.45} ${fishSize * 0.05}
             Q ${fishSize * 0.4} ${fishSize * 0.1} ${fishSize * 0.25} ${fishSize * 0.05}"
          fill="url(#fishGradient)" filter="url(#glow)" />
    
    <!-- Dorsal fin -->
    <path d="M ${-fishSize * 0.1} ${-fishSize * 0.15}
             Q ${0} ${-fishSize * 0.25} ${fishSize * 0.1} ${-fishSize * 0.15}
             L ${fishSize * 0.05} ${-fishSize * 0.1}
             Q ${0} ${-fishSize * 0.15} ${-fishSize * 0.05} ${-fishSize * 0.1}"
          fill="url(#fishGradient)" filter="url(#glow)" opacity="0.8" />
    
    <!-- Eye -->
    <circle cx="${-fishSize * 0.15}" cy="${-fishSize * 0.02}" r="${fishSize * 0.03}" 
            fill="#111827" />
    <circle cx="${-fishSize * 0.15}" cy="${-fishSize * 0.02}" r="${fishSize * 0.015}" 
            fill="#06b6d4" opacity="0.9" />
    
    <!-- Bioluminescent spots -->
    <circle cx="${-fishSize * 0.05}" cy="${fishSize * 0.05}" r="${fishSize * 0.015}" 
            fill="#06b6d4" opacity="0.6" filter="url(#glow)" />
    <circle cx="${fishSize * 0.05}" cy="${fishSize * 0.03}" r="${fishSize * 0.01}" 
            fill="#06b6d4" opacity="0.5" filter="url(#glow)" />
    <circle cx="${fishSize * 0.15}" cy="${0}" r="${fishSize * 0.012}" 
            fill="#06b6d4" opacity="0.7" filter="url(#glow)" />
  </g>
</svg>`;
};

// Icon sizes for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icons
iconSizes.forEach(size => {
  const svg = createSvgIcon(size);
  const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`);
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Generated icon: ${outputPath}`);
});

// Also create a simplified version for favicon
const faviconSvg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4" />
      <stop offset="100%" style="stop-color:#0891b2" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#111827"/>
  <ellipse cx="16" cy="16" rx="10" ry="6" fill="url(#grad)" transform="rotate(-15 16 16)" />
  <path d="M 22 16 Q 26 14 28 15 L 28 17 Q 26 18 22 16" fill="url(#grad)" />
  <circle cx="12" cy="15" r="2" fill="#111827" />
  <circle cx="12" cy="15" r="1" fill="#06b6d4" />
</svg>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), faviconSvg);
console.log('Generated favicon.svg');

// Create placeholder PNGs (in production, use a proper image conversion tool)
// For now, we'll create simple colored squares as placeholders
iconSizes.forEach(size => {
  const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.png`);
  // In a real scenario, you'd use sharp or canvas to convert SVG to PNG
  // For now, we'll note that these need to be generated
  console.log(`TODO: Convert SVG to PNG for ${outputPath}`);
});

console.log('\n✅ SVG icons generated successfully!');
console.log('Note: PNG versions need to be generated using a tool like:');
console.log('  - npx svgexport or');
console.log('  - npm install sharp && node convert-to-png.js');