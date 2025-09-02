import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loading with retry logic for better resilience
 * Automatically retries failed component loads once after a delay
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Failed to load component:', error);
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        return await componentImport();
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        throw retryError;
      }
    }
  });
}