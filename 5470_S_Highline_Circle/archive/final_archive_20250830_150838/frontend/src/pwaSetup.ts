// PWA Setup and Registration
import { Workbox } from 'workbox-window';

interface PWAUpdateData {
  type: 'SKIP_WAITING' | 'CACHE_UPDATED' | 'UPDATE_AVAILABLE';
  payload?: any;
}

class PWAManager {
  private wb: Workbox | null = null;
  private updateAvailable = false;
  private refreshing = false;

  constructor() {
    this.initializeServiceWorker();
    this.setupEventListeners();
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');
      
      // Service worker events
      this.wb.addEventListener('installed', (event) => {
        console.log('PWA: Service worker installed', event);
        if (!event.isUpdate) {
          this.showMessage('App installed and ready for offline use!', 'success');
        }
      });

      this.wb.addEventListener('waiting', () => {
        console.log('PWA: New service worker waiting');
        this.updateAvailable = true;
        this.showUpdatePrompt();
      });

      this.wb.addEventListener('controlling', () => {
        console.log('PWA: New service worker controlling');
        if (this.refreshing) return;
        this.refreshing = true;
        window.location.reload();
      });

      this.wb.addEventListener('activated', (event) => {
        console.log('PWA: Service worker activated', event);
        if (!event.isUpdate) {
          this.showMessage('App updated successfully!', 'success');
        }
      });

      // Register the service worker
      try {
        await this.wb.register();
        console.log('PWA: Service worker registered');
      } catch (error) {
        console.error('PWA: Service worker registration failed:', error);
      }

      // Check for updates periodically
      setInterval(() => {
        this.wb?.update();
      }, 60000); // Check every minute
    }
  }

  private setupEventListeners() {
    // Listen for app updates
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      this.storeInstallPrompt(e);
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App was installed');
      this.showMessage('App installed! Find it on your home screen.', 'success');
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('PWA: Back online');
      this.showMessage('Connection restored - syncing data...', 'info');
      this.triggerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      console.log('PWA: Gone offline');
      this.showMessage('You\'re offline - changes will sync when connected', 'warning');
    });

    // Handle visibility changes (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.triggerBackgroundSync();
      }
    });
  }

  private showUpdatePrompt() {
    // Create update notification
    const updateBanner = document.createElement('div');
    updateBanner.className = `
      fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-4 
      transform -translate-y-full transition-transform duration-300
    `;
    updateBanner.innerHTML = `
      <div class="flex items-center justify-between max-w-md mx-auto">
        <div class="flex items-center space-x-3">
          <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            ↻
          </div>
          <span class="font-medium">App update available</span>
        </div>
        <button 
          id="pwa-update-btn" 
          class="px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30 transition-colors"
        >
          Update
        </button>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // Animate in
    setTimeout(() => {
      updateBanner.style.transform = 'translateY(0)';
    }, 100);

    // Handle update button click
    const updateBtn = document.getElementById('pwa-update-btn');
    updateBtn?.addEventListener('click', () => {
      this.applyUpdate();
      updateBanner.remove();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (updateBanner.parentNode) {
        updateBanner.style.transform = 'translateY(-100%)';
        setTimeout(() => updateBanner.remove(), 300);
      }
    }, 10000);
  }

  private async applyUpdate() {
    if (!this.wb || !this.updateAvailable) return;

    // Show loading state
    this.showMessage('Updating app...', 'info');

    try {
      // Tell the waiting service worker to activate
      this.wb.messageSkipWaiting();
      this.updateAvailable = false;
    } catch (error) {
      console.error('PWA: Failed to apply update:', error);
      this.showMessage('Update failed. Please refresh manually.', 'error');
    }
  }

  private storeInstallPrompt(event: Event) {
    // Store the install prompt for later use
    (window as any).deferredPrompt = event;
  }

  private async triggerBackgroundSync() {
    if (!this.wb) return;

    try {
      // Trigger background sync via message to service worker
      await this.wb.messageSW({ type: 'TRIGGER_SYNC' });
      console.log('PWA: Background sync triggered');
    } catch (error) {
      console.error('PWA: Failed to trigger background sync:', error);
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600', 
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    toast.className = `
      fixed bottom-20 left-4 right-4 z-50 ${colors[type]} text-white p-4 rounded-lg
      transform translate-y-full transition-transform duration-300
      max-w-md mx-auto shadow-lg
    `;
    toast.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">
          ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
        </div>
        <span class="flex-1">${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
    }, 100);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  // Public methods
  async checkForUpdates() {
    if (this.wb) {
      await this.wb.update();
    }
  }

  async installApp() {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA: Install prompt result:', outcome);
      (window as any).deferredPrompt = null;
      return outcome === 'accepted';
    }
    return false;
  }

  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  isOnline() {
    return navigator.onLine;
  }

  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const granted = await navigator.storage.persist();
      console.log('PWA: Persistent storage granted:', granted);
      return granted;
    }
    return false;
  }

  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log('PWA: Storage estimate:', estimate);
      return estimate;
    }
    return null;
  }

  // Share API
  async share(data: { title: string; text?: string; url?: string; files?: File[] }) {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('PWA: Share failed:', error);
        return false;
      }
    }
    return false;
  }

  // Wake Lock API (keep screen on)
  private wakeLock: any = null;

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('PWA: Wake lock acquired');
        return true;
      } catch (error) {
        console.error('PWA: Wake lock failed:', error);
        return false;
      }
    }
    return false;
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('PWA: Wake lock released');
    }
  }

  // Battery Status API
  async getBatteryInfo() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (error) {
        console.error('PWA: Battery API failed:', error);
        return null;
      }
    }
    return null;
  }

  // Network Information API
  getNetworkInfo() {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Device Memory API
  getDeviceMemory() {
    return (navigator as any).deviceMemory || null;
  }

  // Hardware Concurrency
  getHardwareConcurrency() {
    return navigator.hardwareConcurrency || null;
  }
}

// Initialize PWA manager
const pwaManager = new PWAManager();

// Export for use in components
export default pwaManager;

// React hooks for PWA features
export const usePWAFeatures = () => {
  const [isInstalled, setIsInstalled] = React.useState(pwaManager.isInstalled());
  const [isOnline, setIsOnline] = React.useState(pwaManager.isOnline());
  const [batteryInfo, setBatteryInfo] = React.useState<any>(null);
  const [networkInfo, setNetworkInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateInstallStatus = () => setIsInstalled(pwaManager.isInstalled());

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('appinstalled', updateInstallStatus);

    // Get device info
    pwaManager.getBatteryInfo().then(setBatteryInfo);
    setNetworkInfo(pwaManager.getNetworkInfo());

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('appinstalled', updateInstallStatus);
    };
  }, []);

  return {
    isInstalled,
    isOnline,
    batteryInfo,
    networkInfo,
    installApp: pwaManager.installApp.bind(pwaManager),
    checkForUpdates: pwaManager.checkForUpdates.bind(pwaManager),
    share: pwaManager.share.bind(pwaManager),
    requestWakeLock: pwaManager.requestWakeLock.bind(pwaManager),
    releaseWakeLock: pwaManager.releaseWakeLock.bind(pwaManager),
    requestPersistentStorage: pwaManager.requestPersistentStorage.bind(pwaManager),
    getStorageEstimate: pwaManager.getStorageEstimate.bind(pwaManager)
  };
};