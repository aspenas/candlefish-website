export const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://5470-inventory.fly.dev/api/v1';

// Log API URL for debugging (will be removed in production)
if (import.meta.env.DEV) {
  console.log('API URL configured as:', API_URL);
}
