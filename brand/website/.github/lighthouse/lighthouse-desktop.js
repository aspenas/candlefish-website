module.exports = {
  ci: {
    collect: {
      // Desktop configuration for Lighthouse CI
      numberOfRuns: 3,
      settings: {
        // Desktop emulation settings
        emulatedFormFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Desktop viewport
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
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
      // Performance thresholds for desktop
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.90 }],
        'categories:pwa': ['warn', { minScore: 0.70 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        
        // Additional performance metrics
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        'max-potential-fid': ['warn', { maxNumericValue: 130 }],
        
        // Resource optimization
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }],
        'unused-javascript': ['warn', { maxNumericValue: 20000 }],
        'modern-image-formats': ['warn', {}],
        'uses-optimized-images': ['warn', {}],
        'uses-webp-images': ['warn', {}],
        'efficient-animated-content': ['warn', {}],
        
        // Network efficiency
        'uses-rel-preconnect': ['warn', {}],
        'uses-rel-preload': ['warn', {}],
        'preload-lcp-image': ['warn', {}],
        'uses-text-compression': ['error', {}],
        'uses-responsive-images': ['warn', {}],
        
        // JavaScript optimization
        'unminified-css': ['error', {}],
        'unminified-javascript': ['error', {}],
        'remove-duplicates': ['warn', {}],
        'legacy-javascript': ['warn', {}],
        
        // Accessibility checks
        'color-contrast': ['error', {}],
        'image-alt': ['error', {}],
        'label': ['error', {}],
        'link-name': ['error', {}],
        'list': ['error', {}],
        'meta-description': ['error', {}],
        
        // SEO checks
        'document-title': ['error', {}],
        'html-has-lang': ['error', {}],
        'meta-description': ['error', {}],
        'link-text': ['error', {}],
        'is-crawlable': ['error', {}],
        'robots-txt': ['warn', {}],
        
        // Best practices
        'is-on-https': ['error', {}],
        'uses-http2': ['warn', {}],
        'no-vulnerable-libraries': ['error', {}],
        'external-anchors-use-rel-noopener': ['error', {}],
        'geolocation-on-start': ['error', {}],
        'notification-on-start': ['error', {}]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};