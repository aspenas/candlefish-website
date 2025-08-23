import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Register service worker for PWA functionality (only if sw.js exists)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Check if service worker file exists before registering
    fetch('/sw.js', { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          return navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
        } else {
          console.log('Service worker file not found, skipping registration');
          return null;
        }
      })
      .then((registration) => {
        if (registration) {
          console.log('SW registered: ', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, show update notification
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
