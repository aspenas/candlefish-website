'use client'

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1B263B',
          color: '#F8F8F2',
          border: '1px solid #415A77',
          borderRadius: '0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
        },
        success: {
          iconTheme: {
            primary: '#3FD3C6',
            secondary: '#1B263B',
          },
        },
        error: {
          iconTheme: {
            primary: '#FF6B6B',
            secondary: '#1B263B',
          },
        },
      }}
    />
  );
}
