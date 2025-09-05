/**
 * PWA Offline Support for Bioluminescent Fish Animation
 * 
 * Provides Progressive Web App features:
 * - Service Worker for offline caching
 * - IndexedDB for animation state persistence
 * - Network-aware loading strategies
 * - Offline fallback animations
 * - Background sync for analytics
 */

'use strict';

import type { Vec2, FishConfig } from './types';

/**
 * PWA Installation state
 */
export interface PWAInstallState {
  readonly isInstallable: boolean;
  readonly isInstalled: boolean;
  readonly canPromptInstall: boolean;
  readonly platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

/**
 * Cache strategies for different resource types
 */
export type CacheStrategy = 
  | 'cache-first'     // For static assets (images, sounds)
  | 'network-first'   // For dynamic content 
  | 'stale-while-revalidate' // For API calls
  | 'cache-only'      // For offline-only content
  | 'network-only';   // For real-time data

/**
 * Offline animation configuration
 */
export interface OfflineConfig {
  readonly enableOfflineMode: boolean;
  readonly cacheAnimationFrames: boolean;
  readonly persistFishState: boolean;
  readonly offlineQualityTier: 'T2' | 'T3' | 'T4';
  readonly maxCacheSize: number; // bytes
  readonly syncInterval: number; // ms
}

/**
 * Cached animation data
 */
interface CachedAnimationData {
  readonly timestamp: number;
  readonly fishState: any; // Fish internal state
  readonly configuration: Partial<FishConfig>;
  readonly version: string;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  readonly online: boolean;
  readonly connectionType: string;
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

/**
 * PWA Manager for fish animation
 */
export class PWAManager {
  private readonly config: OfflineConfig;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private installPromptEvent: Event | null = null;
  private networkStatus: NetworkStatus;
  
  // Callbacks
  private onInstallPrompt?: (canInstall: boolean) => void;
  private onNetworkChange?: (status: NetworkStatus) => void;
  private onOfflineReady?: () => void;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      enableOfflineMode: true,
      cacheAnimationFrames: true,
      persistFishState: true,
      offlineQualityTier: 'T3',
      maxCacheSize: 5 * 1024 * 1024, // 5MB
      syncInterval: 30000, // 30 seconds
      ...config
    };

    // Initialize network status
    this.networkStatus = this.getNetworkStatus();
    
    this.initializePWA();
  }

  /**
   * Initialize PWA features
   */
  private async initializePWA(): Promise<void> {
    try {
      // Initialize service worker
      await this.initializeServiceWorker();
      
      // Initialize offline storage
      if (this.config.enableOfflineMode) {
        await this.initializeOfflineStorage();
      }
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Setup installation prompts
      this.setupInstallPrompt();
      
      // Setup background sync
      this.setupBackgroundSync();
      
      console.log('PWA initialized successfully');
    } catch (error) {
      console.warn('PWA initialization failed:', error);
    }
  }

  /**
   * Initialize service worker
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw-fish.js', {
        scope: '/',
        updateViaCache: 'imports'
      });

      console.log('Service Worker registered:', this.swRegistration);

      // Handle service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.handleServiceWorkerUpdate();
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Initialize offline storage with IndexedDB
   */
  private async initializeOfflineStorage(): Promise<void> {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('CandlefishAnimationDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Animation state store
        if (!db.objectStoreNames.contains('animationStates')) {
          const stateStore = db.createObjectStore('animationStates', { keyPath: 'id' });
          stateStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Configuration store  
        if (!db.objectStoreNames.contains('configurations')) {
          db.createObjectStore('configurations', { keyPath: 'id' });
        }
        
        // Analytics store for background sync
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
          analyticsStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring(): void {
    const updateNetworkStatus = () => {
      this.networkStatus = this.getNetworkStatus();
      if (this.onNetworkChange) {
        this.onNetworkChange(this.networkStatus);
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    // Monitor connection changes
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }
  }

  /**
   * Get current network status
   */
  private getNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection;
    
    return {
      online: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100,
      saveData: connection?.saveData || false
    };
  }

  /**
   * Setup PWA installation prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPromptEvent = event;
      
      if (this.onInstallPrompt) {
        this.onInstallPrompt(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.installPromptEvent = null;
      console.log('PWA installed successfully');
    });
  }

  /**
   * Setup background sync for analytics
   */
  private setupBackgroundSync(): void {
    if (!this.swRegistration || !('sync' in this.swRegistration)) {
      console.warn('Background Sync not supported');
      return;
    }

    // Register background sync
    this.swRegistration.sync.register('fish-analytics-sync').catch((error) => {
      console.warn('Background sync registration failed:', error);
    });
  }

  /**
   * Handle service worker update
   */
  private handleServiceWorkerUpdate(): void {
    // Could show user notification about update
    console.log('New version available. Restart app to update.');
  }

  /**
   * Save fish animation state to offline storage
   */
  public async saveFishState(fishState: any, config: Partial<FishConfig>): Promise<void> {
    if (!this.config.persistFishState || !this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['animationStates'], 'readwrite');
      const store = transaction.objectStore('animationStates');
      
      const data: CachedAnimationData = {
        timestamp: Date.now(),
        fishState,
        configuration: config,
        version: '1.0.0'
      };
      
      await store.put({ id: 'current', ...data });
      
      // Clean up old states
      await this.cleanupOldStates();
    } catch (error) {
      console.warn('Failed to save fish state:', error);
    }
  }

  /**
   * Load fish animation state from offline storage
   */
  public async loadFishState(): Promise<CachedAnimationData | null> {
    if (!this.config.persistFishState || !this.dbPromise) return null;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['animationStates'], 'readonly');
      const store = transaction.objectStore('animationStates');
      
      const result = await store.get('current');
      return result || null;
    } catch (error) {
      console.warn('Failed to load fish state:', error);
      return null;
    }
  }

  /**
   * Save configuration
   */
  public async saveConfiguration(id: string, config: any): Promise<void> {
    if (!this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['configurations'], 'readwrite');
      const store = transaction.objectStore('configurations');
      
      await store.put({ id, ...config, timestamp: Date.now() });
    } catch (error) {
      console.warn('Failed to save configuration:', error);
    }
  }

  /**
   * Load configuration
   */
  public async loadConfiguration(id: string): Promise<any | null> {
    if (!this.dbPromise) return null;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['configurations'], 'readonly');
      const store = transaction.objectStore('configurations');
      
      const result = await store.get(id);
      return result || null;
    } catch (error) {
      console.warn('Failed to load configuration:', error);
      return null;
    }
  }

  /**
   * Record analytics event for background sync
   */
  public async recordAnalytics(event: string, data: any): Promise<void> {
    if (!this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');
      
      await store.add({
        event,
        data,
        timestamp: Date.now(),
        synced: false
      });
    } catch (error) {
      console.warn('Failed to record analytics:', error);
    }
  }

  /**
   * Clean up old cached states
   */
  private async cleanupOldStates(): Promise<void> {
    if (!this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['animationStates'], 'readwrite');
      const store = transaction.objectStore('animationStates');
      const index = store.index('timestamp');
      
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const range = IDBKeyRange.upperBound(oneWeekAgo);
      
      index.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && cursor.primaryKey !== 'current') {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to cleanup old states:', error);
    }
  }

  /**
   * Get PWA installation state
   */
  public getInstallState(): PWAInstallState {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isDesktop = !isIOS && !isAndroid;
    
    let platform: PWAInstallState['platform'] = 'unknown';
    if (isIOS) platform = 'ios';
    else if (isAndroid) platform = 'android';
    else if (isDesktop) platform = 'desktop';

    // Check if already installed (in standalone mode)
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true ||
                       document.referrer.includes('android-app://');

    return {
      isInstallable: !!this.installPromptEvent,
      isInstalled,
      canPromptInstall: !!this.installPromptEvent && !isInstalled,
      platform
    };
  }

  /**
   * Trigger PWA installation prompt
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.installPromptEvent) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      const promptEvent = this.installPromptEvent as any;
      promptEvent.prompt();
      
      const result = await promptEvent.userChoice;
      const accepted = result.outcome === 'accepted';
      
      if (accepted) {
        this.installPromptEvent = null;
      }
      
      return accepted;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Check if running in offline mode
   */
  public isOffline(): boolean {
    return !this.networkStatus.online;
  }

  /**
   * Check if network is slow
   */
  public isSlowNetwork(): boolean {
    return this.networkStatus.effectiveType === 'slow-2g' || 
           this.networkStatus.effectiveType === '2g' ||
           this.networkStatus.saveData;
  }

  /**
   * Get recommended cache strategy based on network conditions
   */
  public getRecommendedCacheStrategy(): CacheStrategy {
    if (this.isOffline()) return 'cache-only';
    if (this.isSlowNetwork()) return 'cache-first';
    if (this.networkStatus.saveData) return 'stale-while-revalidate';
    return 'network-first';
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Force service worker update
   */
  public async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      await this.swRegistration.update();
      console.log('Service worker update check completed');
    } catch (error) {
      console.error('Service worker update failed:', error);
    }
  }

  /**
   * Clear offline cache
   */
  public async clearCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      if (this.dbPromise) {
        const db = await this.dbPromise;
        const stores = ['animationStates', 'configurations', 'analytics'];
        
        for (const storeName of stores) {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          await store.clear();
        }
      }
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Set event callbacks
   */
  public onInstallable(callback: (canInstall: boolean) => void): void {
    this.onInstallPrompt = callback;
  }

  public onNetworkStatusChange(callback: (status: NetworkStatus) => void): void {
    this.onNetworkChange = callback;
  }

  public onOfflineReady(callback: () => void): void {
    this.onOfflineReady = callback;
  }

  /**
   * Dispose of PWA manager
   */
  public async dispose(): Promise<void> {
    // Remove event listeners
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    
    // Close database
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        db.close();
      } catch (error) {
        console.warn('Failed to close database:', error);
      }
    }
    
    // Clear callbacks
    this.onInstallPrompt = undefined;
    this.onNetworkChange = undefined;
    this.onOfflineReady = undefined;
    
    this.installPromptEvent = null;
  }
}

/**
 * Service Worker template generation
 */
export function generateServiceWorkerCode(): string {
  return `
// Candlefish Fish Animation Service Worker
const CACHE_NAME = 'candlefish-fish-v1';
const OFFLINE_URL = '/offline-fish.html';

// Files to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/offline-fish.html',
  '/hero-fish.css',
  '/img/cf-fish-fallback.svg',
  // Add other essential files
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('candlefish-fish-') && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // If both cache and network fail, serve offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Background sync for analytics
self.addEventListener('sync', (event) => {
  if (event.tag === 'fish-analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  try {
    // Open IndexedDB and sync pending analytics
    const db = await openDB();
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    const unsyncedData = await store.index('synced').getAll(false);
    
    for (const item of unsyncedData) {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        // Mark as synced
        await store.put({ ...item, synced: true });
      } catch (error) {
        console.warn('Failed to sync analytics item:', error);
      }
    }
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CandlefishAnimationDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
`;
}

/**
 * Utility functions for PWA integration
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
}

export function supportsServiceWorkers(): boolean {
  return 'serviceWorker' in navigator;
}

export function supportsIndexedDB(): boolean {
  return 'indexedDB' in window;
}

export function supportsPushNotifications(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}