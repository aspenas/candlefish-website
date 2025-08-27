export const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://inventory.highline.work/api/v1';

// Log API URL for debugging (will be removed in production)
console.log('API URL configured as:', API_URL);
console.log('Environment:', import.meta.env.MODE);
console.log('All env vars:', import.meta.env);
