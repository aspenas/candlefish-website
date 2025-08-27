import React from 'react';
import ReactDOM from 'react-dom/client';
import AppMinimal from './AppMinimal';
import './styles/globals.css';

// Accessibility announcer for dynamic updates
window.announceToScreenReader = (message: string) => {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = message;
    // Clear the message after a delay to avoid repetitive announcements
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Performance monitoring - disabled for now
// TODO: Add web-vitals when ready for production

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppMinimal />
  </React.StrictMode>
);

// Remove loading screen after React renders
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => loadingScreen.remove(), 300);
  }
}, 100);

// Declare global types
declare global {
  interface Window {
    announceToScreenReader: (message: string) => void;
  }
}
