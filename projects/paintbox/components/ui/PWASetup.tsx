'use client';

import { useEffect } from 'react';

interface PWASetupProps {
  nonce?: string;
}

export function PWASetup({ nonce }: PWASetupProps) {
  useEffect(() => {
    // Only register service worker in browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported in this environment');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        console.log('Attempting to register service worker...');

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker installed, refresh recommended');
                // Optionally notify user about update
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    };

    // Register with error handling
    registerServiceWorker().catch(error => {
      console.error('Failed to register service worker:', error);
    });

  }, []);

  return null; // This is a utility component with no UI
}

// Simple function-based version for inline use
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject('Service Worker not supported');
  }

  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      console.log('Service Worker registered:', registration);
      return registration;
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
      throw error;
    });
}
