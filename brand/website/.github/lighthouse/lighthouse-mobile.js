module.exports = {
  ci: {
    collect: {
      // Mobile configuration for Lighthouse CI
      numberOfRuns: 3,
      settings: {
        // Mobile emulation settings
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Mobile viewport (Moto G4)
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false
        },
        // Chrome flags for consistent testing
        chromeFlags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      }
    },
    assert: {
      // Performance thresholds for mobile (more lenient than desktop)
      assertions: {
        'categories:performance': ['error', { minScore: 0.75 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.90 }],
        'categories:pwa': ['warn', { minScore: 0.70 }],
        
        // Core Web Vitals (mobile)
        'first-contentful-paint': ['error', { maxNumericValue: 2200 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 600 }],
        
        // Additional performance metrics (mobile-adjusted)
        'speed-index': ['warn', { maxNumericValue: 4500 }],
        'interactive': ['warn', { maxNumericValue: 6000 }],
        'max-potential-fid': ['warn', { maxNumericValue: 200 }],
        
        // Mobile-specific optimizations
        'uses-responsive-images': ['error', {}],
        'modern-image-formats': ['warn', {}],
        'uses-webp-images': ['warn', {}],
        'efficient-animated-content': ['warn', {}],
        'uses-optimized-images': ['warn', {}],
        
        // Resource optimization
        'unused-css-rules': ['warn', { maxNumericValue: 30000 }],
        'unused-javascript': ['warn', { maxNumericValue: 30000 }],
        'remove-duplicates': ['warn', {}],
        
        // Network efficiency (critical on mobile)
        'uses-text-compression': ['error', {}],
        'uses-rel-preconnect': ['warn', {}],
        'uses-rel-preload': ['warn', {}],
        'preload-lcp-image': ['warn', {}],
        'render-blocking-resources': ['warn', {}],
        
        // JavaScript optimization
        'unminified-css': ['error', {}],
        'unminified-javascript': ['error', {}],
        'legacy-javascript': ['warn', {}],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        
        // Mobile UX
        'tap-targets': ['error', {}],
        'content-width': ['error', {}],
        'viewport': ['error', {}],
        'font-size': ['error', {}],
        
        // Accessibility (same standards)
        'color-contrast': ['error', {}],
        'image-alt': ['error', {}],
        'label': ['error', {}],
        'link-name': ['error', {}],
        'list': ['error', {}],
        'button-name': ['error', {}],
        'input-image-alt': ['error', {}],
        
        // SEO (same standards)
        'document-title': ['error', {}],
        'html-has-lang': ['error', {}],
        'meta-description': ['error', {}],
        'link-text': ['error', {}],
        'is-crawlable': ['error', {}],
        'robots-txt': ['warn', {}],
        'hreflang': ['warn', {}],
        'canonical': ['warn', {}],
        
        // Best practices
        'is-on-https': ['error', {}],
        'uses-http2': ['warn', {}],
        'no-vulnerable-libraries': ['error', {}],
        'external-anchors-use-rel-noopener': ['error', {}],
        'geolocation-on-start': ['error', {}],
        'notification-on-start': ['error', {}],
        'uses-passive-event-listeners': ['warn', {}],
        'no-document-write': ['warn', {}],
        
        // PWA capabilities
        'service-worker': ['warn', {}],
        'offline-start-url': ['warn', {}],
        'apple-touch-icon': ['warn', {}],
        'themed-omnibox': ['warn', {}],
        'manifest-short-name-length': ['warn', {}],
        'maskable-icon': ['warn', {}],
        
        // Performance budget (mobile-specific)
        'resource-summary': ['warn', {
          'script': { maxNumericValue: 250000 },
          'image': { maxNumericValue: 500000 },
          'stylesheet': { maxNumericValue: 50000 },
          'font': { maxNumericValue: 100000 },
          'total': { maxNumericValue: 1000000 }
        }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};