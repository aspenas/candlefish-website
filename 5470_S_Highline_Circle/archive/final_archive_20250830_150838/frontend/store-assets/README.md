# App Store Assets for Highline Inventory PWA

This directory contains assets optimized for app store listings and PWA installation.

## Asset Requirements

### Icons (Required)
- **icon-72x72.png** - iOS notification badge
- **icon-96x96.png** - Standard app icon 
- **icon-128x128.png** - Windows tile
- **icon-144x144.png** - iOS home screen
- **icon-152x152.png** - iOS retina home screen
- **icon-192x192.png** - Android home screen
- **icon-384x384.png** - Android splash screen
- **icon-512x512.png** - PWA install prompt

### Screenshots (Required for Store Listings)
- **screenshot-mobile-1.png** (390x844) - Mobile interface
- **screenshot-mobile-2.png** (390x844) - Camera capture
- **screenshot-mobile-3.png** (390x844) - Barcode scanner
- **screenshot-desktop-1.png** (1920x1080) - Desktop dashboard
- **screenshot-desktop-2.png** (1920x1080) - Inventory table

### Marketing Assets
- **feature-graphic.png** (1024x500) - Play Store feature graphic
- **promo-graphic.png** (180x120) - Promotional banner
- **app-preview.gif** (360x640) - Animated preview

### Apple Touch Icons
- **apple-touch-icon.png** (180x180) - iOS home screen
- **apple-touch-icon-precomposed.png** (180x180) - iOS fallback

### Splash Screens
- **splash-640x1136.png** - iPhone 5/SE
- **splash-750x1334.png** - iPhone 6/7/8
- **splash-828x1792.png** - iPhone XR
- **splash-1125x2436.png** - iPhone X/XS
- **splash-1242x2688.png** - iPhone XS Max
- **splash-1536x2048.png** - iPad
- **splash-1668x2224.png** - iPad Pro 10.5"
- **splash-2048x2732.png** - iPad Pro 12.9"

## Asset Guidelines

### Icon Design
- Use the inventory/camera theme with modern flat design
- Primary colors: Indigo (#4f46e5), White, Gray
- Ensure visibility at small sizes
- No text in icons (text can become unreadable)

### Screenshots
- Show key features: photo capture, inventory management, barcode scanning
- Use realistic demo data
- Include UI elements like navigation bars
- High quality (at least 2x resolution)

### Description Copy
- Highlight offline functionality
- Emphasize professional use case
- Include key features list
- SEO-optimized keywords: inventory, photos, barcode, offline, PWA

## Store Listing Information

### App Name
**Primary**: Highline Inventory  
**Full**: 5470 S Highline Circle Inventory

### Description
**Short**: Professional inventory management with photo capture and offline support.

**Full**:
Transform your inventory management with this powerful PWA that works offline. Perfect for real estate, moving, insurance documentation, and asset tracking.

**Key Features:**
✅ Offline-first design - works without internet
✅ Professional photo capture with multiple angles  
✅ Barcode and QR code scanning
✅ Touch-friendly mobile interface
✅ Real-time sync when online
✅ Comprehensive analytics and reporting
✅ Valuation tracking and estimates
✅ Team collaboration features

**Perfect for:**
• Real estate inventory and staging
• Moving and relocation services  
• Insurance claim documentation
• Asset management and tracking
• Estate planning and organization

**Why Choose This App:**
- Works completely offline - no internet required
- Professional photo workflows with compression
- Native mobile gestures and touch controls
- Installable as native app on any device
- Secure local storage with cloud sync
- Fast, responsive, and reliable

**Technical Highlights:**
- Progressive Web App (PWA) technology
- Advanced caching for offline use
- Push notifications for updates
- Background sync when connection returns
- Modern web technologies for native-like experience

Install now and start managing your inventory like a professional!

### Keywords
inventory, photos, barcode, scanner, offline, PWA, real estate, moving, insurance, documentation, tracking, professional, mobile, camera

### Category
- **Primary**: Business / Productivity
- **Secondary**: Photo & Video / Utilities

### Age Rating
- **Rating**: 4+ (No objectionable content)

### Privacy Policy
See privacy-policy.md

### Support Information
- **Website**: https://inventory.highline.work
- **Support Email**: support@highline.work
- **Privacy Policy**: https://inventory.highline.work/privacy

## File Checklist

Before submission, ensure all required files are present:

- [ ] All icon sizes (72px to 512px)
- [ ] Mobile screenshots (at least 3)
- [ ] Desktop screenshots (at least 2) 
- [ ] Apple touch icons
- [ ] Splash screens for major devices
- [ ] Feature graphics for stores
- [ ] App description and keywords
- [ ] Privacy policy
- [ ] Support contact information

## Generation Commands

To generate assets from source files:

```bash
# Install dependencies
npm install -g pwa-asset-generator

# Generate icons and splash screens
pwa-asset-generator source-logo.svg public --index public/index.html --manifest public/manifest.json

# Optimize images
npx imagemin store-assets/*.png --out-dir=public --plugin=imagemin-pngcrush
```

## Testing

Before store submission:

1. **Lighthouse PWA Audit** - Score 90+ required
2. **Mobile Responsiveness** - Test on various devices
3. **Offline Functionality** - Verify core features work offline
4. **Install Flow** - Test PWA installation on mobile/desktop
5. **Performance** - Fast loading and smooth interactions
6. **Accessibility** - Screen reader and keyboard navigation
7. **Cross-browser** - Chrome, Safari, Firefox, Edge

## Store-Specific Requirements

### Google Play Store (via TWA)
- Privacy policy required
- Target API level 31+
- App signing by Google Play
- Content rating questionnaire

### Microsoft Store
- Windows 10/11 compatible
- Store listing requirements
- Age ratings and content descriptors

### Apple App Store (via PWA)
- Not directly supported, but installable via Safari
- Meets Apple's PWA guidelines
- Works with iOS shortcuts app