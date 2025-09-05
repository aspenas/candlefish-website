'use client';

import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  installing: boolean;
}

export function ServiceWorkerRegister() {
  const [swState, setSWState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    updateAvailable: false,
    installing: false,
  });

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    setSWState(prev => ({ ...prev, isSupported: true, isOnline: navigator.onLine }));

    // Register service worker
    const registerSW = async () => {
      try {
        setSWState(prev => ({ ...prev, installing: true }));
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Always check for updates
        });

        console.log('[SW] Registration successful:', registration);
        setSWState(prev => ({ 
          ...prev, 
          isRegistered: true, 
          installing: false 
        }));

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            console.log('[SW] New service worker installing...');
            setSWState(prev => ({ ...prev, installing: true }));
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] Update available');
                setSWState(prev => ({ 
                  ...prev, 
                  updateAvailable: true,
                  installing: false 
                }));
              }
              
              if (newWorker.state === 'activated') {
                console.log('[SW] Service worker activated');
                setSWState(prev => ({ ...prev, installing: false }));
              }
            });
          }
        });

        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CACHE_UPDATED') {
            console.log('[SW] Cache updated for:', event.data.url);
          }
        });

      } catch (error) {
        console.error('[SW] Registration failed:', error);
        setSWState(prev => ({ ...prev, installing: false }));
      }
    };

    // Online/offline event listeners
    const handleOnline = () => {
      console.log('[SW] Back online');
      setSWState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      console.log('[SW] Gone offline');
      setSWState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    registerSW();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Tell the service worker to skip waiting
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to activate the new service worker
      window.location.reload();
    }
  };

  const handleClearCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_CLEAR' });
      console.log('[SW] Cache clear requested');
    }
  };

  // Don't render anything in production unless there's an update
  if (process.env.NODE_ENV === 'production' && !swState.updateAvailable) {
    return null;
  }

  // Development info panel
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white text-xs font-mono p-3 rounded border border-[#3FD3C6]/30 max-w-sm">
        <div className="text-[#3FD3C6] font-bold mb-2">SERVICE WORKER</div>
        
        <div className="space-y-1">
          <div>Support: {swState.isSupported ? '✓' : '✗'}</div>
          <div>Status: {swState.isRegistered ? 'Active' : swState.installing ? 'Installing...' : 'Inactive'}</div>
          <div>Network: {swState.isOnline ? 'Online' : 'Offline'}</div>
        </div>

        {swState.updateAvailable && (
          <div className="mt-3 pt-2 border-t border-[#3FD3C6]/20">
            <div className="text-[#3FD3C6] mb-1">Update Available</div>
            <button
              onClick={handleUpdate}
              className="text-xs bg-[#3FD3C6] text-black px-2 py-1 rounded mr-2"
            >
              Update
            </button>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-[#3FD3C6]/20">
          <button
            onClick={handleClearCache}
            className="text-xs bg-red-500 text-white px-2 py-1 rounded"
          >
            Clear Cache
          </button>
        </div>
      </div>
    );
  }

  // Production update notification
  if (swState.updateAvailable) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-[#3FD3C6] text-[#0D1B2A] p-4 rounded shadow-lg max-w-sm">
        <div className="font-semibold text-sm mb-2">Workshop Update Available</div>
        <p className="text-xs mb-3">
          New optimizations and features are ready to deploy.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="bg-[#0D1B2A] text-[#3FD3C6] px-3 py-1 text-xs rounded hover:bg-[#1B263B] transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={() => setSWState(prev => ({ ...prev, updateAvailable: false }))}
            className="text-[#0D1B2A] px-3 py-1 text-xs underline hover:no-underline"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Hook for using service worker state in other components
export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSWRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSWRegistration(registration);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOfflineCapable: !!swRegistration,
    registration: swRegistration,
  };
}