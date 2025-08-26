import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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

// Performance monitoring
if (import.meta.env.PROD) {
  // Monitor Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Declare global types
declare global {
  interface Window {
    announceToScreenReader: (message: string) => void;
  }
}
