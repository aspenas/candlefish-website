// Service Worker Registration for Candlefish.ai
(function() {
  'use strict';

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    // Wait for the window to load
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }

  async function registerServiceWorker() {
    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);

      // Check for updates immediately
      registration.update();

      // Check for updates periodically (every hour)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            showUpdateNotification();
          }
        });
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker updated, reload the page
        window.location.reload();
      });

      // Request persistent storage
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      }

      // Check for background sync support
      if ('sync' in registration) {
        // Register for background sync
        registration.sync.register('sync-metrics').catch(err => {
          console.log('Background sync registration failed:', err);
        });
      }

      // Check for periodic background sync support
      if ('periodicSync' in registration) {
        // Request permission for periodic sync
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync',
        });
        
        if (status.state === 'granted') {
          // Register for periodic sync (every 12 hours)
          await registration.periodicSync.register('update-metrics', {
            minInterval: 12 * 60 * 60 * 1000
          });
        }
      }

      // Check for push notification support
      if ('PushManager' in window) {
        setupPushNotifications(registration);
      }

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  function showUpdateNotification() {
    // Check if we can show notifications
    if (!document.hidden) {
      const updateBanner = document.createElement('div');
      updateBanner.id = 'sw-update-banner';
      updateBanner.innerHTML = `
        <style>
          #sw-update-banner {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
          }
          
          @keyframes slideUp {
            from {
              transform: translateX(-50%) translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          #sw-update-banner button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          
          #sw-update-banner button:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          #sw-update-banner .close {
            background: transparent;
            border: none;
            padding: 4px;
            margin-left: 8px;
            opacity: 0.8;
          }
          
          #sw-update-banner .close:hover {
            opacity: 1;
          }
        </style>
        <span>New version available!</span>
        <button onclick="updateServiceWorker()">Update Now</button>
        <button class="close" onclick="dismissUpdateBanner()">✕</button>
      `;
      
      document.body.appendChild(updateBanner);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        dismissUpdateBanner();
      }, 30000);
    }
  }

  async function setupPushNotifications(registration) {
    try {
      // Check notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Get public key from server (in production, this would come from your API)
        const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
        
        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        
        console.log('Push notification subscription:', subscription);
        
        // Send subscription to server
        // await sendSubscriptionToServer(subscription);
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Global functions for update handling
  window.updateServiceWorker = function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      });
    }
  };

  window.dismissUpdateBanner = function() {
    const banner = document.getElementById('sw-update-banner');
    if (banner) {
      banner.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => {
        banner.remove();
      }, 300);
    }
  };

  window.clearServiceWorkerCache = function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active.postMessage({ type: 'CLEAR_CACHE' });
        console.log('Cache clear requested');
      });
    }
  };

  // Listen for messages from service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'METRICS_UPDATE') {
        // Handle metrics update
        const customEvent = new CustomEvent('metricsUpdate', {
          detail: event.data.data
        });
        window.dispatchEvent(customEvent);
      }
    });
  }

  // Add offline/online detection
  window.addEventListener('online', () => {
    console.log('Connection restored');
    document.body.classList.remove('offline');
  });

  window.addEventListener('offline', () => {
    console.log('Connection lost');
    document.body.classList.add('offline');
  });

})();