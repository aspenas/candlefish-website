/**
 * PWA Performance Optimizer
 * Optimizes Progressive Web App performance, service workers, and offline capabilities
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

class PWAOptimizer {
  constructor(appUrl) {
    this.appUrl = appUrl;
    this.targetScores = {
      performance: 95,
      accessibility: 95,
      'best-practices': 95,
      seo: 95,
      pwa: 95
    };
  }

  async runLighthouseAudit() {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      port: chrome.port
    };

    try {
      const runnerResult = await lighthouse(this.appUrl, options);
      await chrome.kill();

      return this.analyzeLighthouseResults(runnerResult.lhr);
    } catch (error) {
      await chrome.kill();
      throw error;
    }
  }

  analyzeLighthouseResults(lhr) {
    const scores = {};
    const improvements = [];

    // Extract scores
    Object.keys(this.targetScores).forEach(category => {
      const score = lhr.categories[category]?.score * 100 || 0;
      scores[category] = score;

      if (score < this.targetScores[category]) {
        improvements.push({
          category,
          currentScore: score,
          targetScore: this.targetScores[category],
          gap: this.targetScores[category] - score
        });
      }
    });

    // Extract specific metrics
    const metrics = {
      FCP: lhr.audits['first-contentful-paint']?.numericValue,
      LCP: lhr.audits['largest-contentful-paint']?.numericValue,
      TBT: lhr.audits['total-blocking-time']?.numericValue,
      CLS: lhr.audits['cumulative-layout-shift']?.numericValue,
      TTI: lhr.audits['interactive']?.numericValue,
      SI: lhr.audits['speed-index']?.numericValue
    };

    // Extract opportunities
    const opportunities = [];
    Object.values(lhr.audits).forEach(audit => {
      if (audit.score !== null && audit.score < 0.9 && audit.details?.type === 'opportunity') {
        opportunities.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          savings: audit.details.overallSavingsMs,
          score: audit.score
        });
      }
    });

    return {
      scores,
      metrics,
      improvements,
      opportunities: opportunities.sort((a, b) => b.savings - a.savings).slice(0, 10),
      recommendations: this.generateRecommendations(scores, metrics, opportunities)
    };
  }

  generateRecommendations(scores, metrics, opportunities) {
    const recommendations = [];

    // Performance recommendations
    if (scores.performance < this.targetScores.performance) {
      if (metrics.FCP > 1800) {
        recommendations.push({
          type: 'CRITICAL',
          area: 'First Contentful Paint',
          issue: `FCP is ${(metrics.FCP / 1000).toFixed(2)}s (target: <1.8s)`,
          solution: this.generateFCPOptimization()
        });
      }

      if (metrics.LCP > 2500) {
        recommendations.push({
          type: 'CRITICAL',
          area: 'Largest Contentful Paint',
          issue: `LCP is ${(metrics.LCP / 1000).toFixed(2)}s (target: <2.5s)`,
          solution: this.generateLCPOptimization()
        });
      }

      if (metrics.TBT > 200) {
        recommendations.push({
          type: 'HIGH',
          area: 'Total Blocking Time',
          issue: `TBT is ${metrics.TBT}ms (target: <200ms)`,
          solution: this.generateTBTOptimization()
        });
      }

      if (metrics.CLS > 0.1) {
        recommendations.push({
          type: 'MEDIUM',
          area: 'Cumulative Layout Shift',
          issue: `CLS is ${metrics.CLS.toFixed(3)} (target: <0.1)`,
          solution: this.generateCLSOptimization()
        });
      }
    }

    // PWA recommendations
    if (scores.pwa < this.targetScores.pwa) {
      recommendations.push({
        type: 'HIGH',
        area: 'Progressive Web App',
        issue: `PWA score is ${scores.pwa} (target: ${this.targetScores.pwa})`,
        solution: this.generatePWAEnhancements()
      });
    }

    return recommendations;
  }

  generateFCPOptimization() {
    return {
      description: 'Optimize First Contentful Paint',
      implementation: `
// 1. Preload critical resources
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">

// 2. Inline critical CSS
<style>
  /* Critical CSS here */
  ${this.getCriticalCSS()}
</style>

// 3. Optimize server response time
// Next.js API route with caching
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  // ... handle request
}

// 4. Use next/font for font optimization
import { Inter } from 'next/font/google';
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true
});`
    };
  }

  generateLCPOptimization() {
    return {
      description: 'Optimize Largest Contentful Paint',
      implementation: `
// 1. Optimize images with Next.js Image component
import Image from 'next/image';

<Image
  src="/hero-image.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority // Preload LCP image
  placeholder="blur"
  blurDataURL={blurDataURL}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// 2. Preconnect to required origins
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://cdn.candlefish.ai">

// 3. Use static generation for faster initial load
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 3600 // ISR: revalidate every hour
  };
}

// 4. Implement resource hints
<link rel="prefetch" href="/api/data" as="fetch" crossorigin="anonymous">`
    };
  }

  generateTBTOptimization() {
    return {
      description: 'Reduce Total Blocking Time',
      implementation: `
// 1. Code split with dynamic imports
const HeavyComponent = dynamic(
  () => import('../components/HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);

// 2. Defer non-critical JavaScript
<script defer src="/js/analytics.js"></script>

// 3. Use Web Workers for heavy computations
// worker.js
self.addEventListener('message', (e) => {
  const result = performHeavyCalculation(e.data);
  self.postMessage(result);
});

// main.js
const worker = new Worker('/worker.js');
worker.postMessage(data);
worker.addEventListener('message', (e) => {
  console.log('Result:', e.data);
});

// 4. Implement request idle callback
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Non-critical work
    loadAnalytics();
    preloadNextPage();
  });
}`
    };
  }

  generateCLSOptimization() {
    return {
      description: 'Minimize Cumulative Layout Shift',
      implementation: `
// 1. Set explicit dimensions for images and videos
<img
  src="/image.jpg"
  width="800"
  height="600"
  style="aspect-ratio: 4/3"
  alt="Description"
/>

// 2. Reserve space for dynamic content
.ad-container {
  min-height: 250px; /* Reserve space for ads */
}

.skeleton {
  height: 200px; /* Match expected content height */
}

// 3. Avoid inserting content above existing content
// BAD
element.insertBefore(newElement, element.firstChild);

// GOOD
element.appendChild(newElement);

// 4. Use CSS transform instead of position changes
/* BAD */
.animate {
  position: relative;
  top: 0;
  transition: top 0.3s;
}
.animate:hover {
  top: -10px;
}

/* GOOD */
.animate {
  transition: transform 0.3s;
}
.animate:hover {
  transform: translateY(-10px);
}`
    };
  }

  getCriticalCSS() {
    return `
/* Critical CSS for above-the-fold content */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header {
  background: #fff;
  border-bottom: 1px solid #eee;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 1000;
}

.hero {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Critical layout styles */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}`;
  }

  generatePWAEnhancements() {
    return {
      description: 'Enhance Progressive Web App capabilities',
      manifest: `{
  "name": "Candlefish AI Documentation",
  "short_name": "Candlefish",
  "description": "Illuminating the path to AI transformation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Desktop view"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile view"
    }
  ],
  "categories": ["business", "developer", "productivity"],
  "prefer_related_applications": false
}`,
      serviceWorker: await this.generateOptimizedServiceWorker()
    };
  }

  async generateOptimizedServiceWorker() {
    return `// Optimized Service Worker with intelligent caching
const CACHE_NAME = 'candlefish-v1';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache size
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Assets to cache on install
const STATIC_CACHE = [
  '/',
  '/offline.html',
  '/css/critical.css',
  '/js/app.js',
  '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
  networkFirst: ['/api/', '/auth/'],
  cacheFirst: ['/static/', '/images/', '/fonts/'],
  staleWhileRevalidate: ['/', '/docs/']
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - intelligent caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Determine strategy
  const strategy = getStrategy(url.pathname);

  event.respondWith(
    executeStrategy(strategy, request)
      .catch(() => caches.match('/offline.html'))
  );
});

function getStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pathname.includes(pattern))) {
      return strategy;
    }
  }
  return 'networkFirst';
}

async function executeStrategy(strategy, request) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Check cache age
    const cacheAge = Date.now() - new Date(cached.headers.get('date')).getTime();
    if (cacheAge < MAX_CACHE_AGE) {
      return cached;
    }
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    await trimCache();
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      await trimCache();
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => {
        c.put(request, response.clone());
        trimCache();
      });
    }
    return response;
  });

  return cached || fetchPromise;
}

async function trimCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const cacheSize = await estimateCacheSize();

  if (cacheSize > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const toDelete = Math.floor(keys.length * 0.2); // Remove 20% of entries
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

async function estimateCacheSize() {
  if ('estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Implement offline data sync
  const db = await openDB();
  const pendingRequests = await db.getAll('pending');

  for (const request of pendingRequests) {
    try {
      await fetch(request.url, request.options);
      await db.delete('pending', request.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}`;
  }
}

module.exports = PWAOptimizer;
