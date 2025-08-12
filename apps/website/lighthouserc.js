// Lighthouse CI configuration for Candlefish AI website
// Provides automated performance, accessibility, and SEO auditing

module.exports = {
  ci: {
    collect: {
      // URLs to audit
      url: [
        'http://localhost:3000',
        'http://localhost:3000/v2'
      ],
      // Number of runs per URL for more reliable results
      numberOfRuns: 3,
      // Chrome flags for consistent environment
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu --disable-dev-shm-usage'
      }
    },
    
    assert: {
      // Performance budgets
      assertions: {
        // Core Web Vitals
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Specific performance metrics
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'first-meaningful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Resource loading
        'unused-css-rules': ['warn', { maxLength: 2 }],
        'unused-javascript': ['warn', { maxLength: 2 }],
        'render-blocking-resources': ['warn', { maxLength: 1 }],
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'meta-viewport': 'error',
        
        // SEO
        'meta-description': 'error',
        'document-title': 'error',
        'hreflang': 'off', // We don't use hreflang currently
        
        // Best practices
        'uses-https': 'error',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn'
      }
    },
    
    upload: {
      // Upload to temporary public storage for CI
      target: 'temporary-public-storage',
      // Optionally upload to LHCI server if available
      // serverBaseUrl: 'http://localhost:9001',
      // token: process.env.LHCI_TOKEN
    },
    
    server: {
      // Configuration for LHCI server (if running locally)
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './lighthouse-ci.db'
      }
    },
    
    wizard: {
      // Disable wizard for CI environments
      wizard: false
    }
  }
};