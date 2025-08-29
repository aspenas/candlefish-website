// Production-first configuration with proper fallback
const productionApiUrl = 'https://5470-inventory.fly.dev/api/v1';
const developmentApiUrl = 'http://localhost:4050/api/v1';

export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'development' ? developmentApiUrl : productionApiUrl);

// Environment-specific configuration
export const isDevelopment = import.meta.env.MODE === 'development';
export const isProduction = import.meta.env.MODE === 'production';

// Always log API configuration for debugging
console.log('Environment Mode:', import.meta.env.MODE);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Final API URL:', API_URL);
